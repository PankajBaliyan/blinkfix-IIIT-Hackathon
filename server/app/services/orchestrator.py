import ast
import asyncio
import time
import logging
from typing import Any, Dict, List, Optional
from ..models.schemas import CandidatePatch, CrashPayload
from ..agents.trace_analyst import TraceAnalyst
from ..agents.git_detective import GitDetective
from ..agents.infra_checker import InfraChecker
from ..agents.impact_analyst import ImpactAnalyst
from ..agents.mitigation_planner import MitigationPlanner
from ..services.context_service import load_deployment_context
from ..config import settings
from ..services.cerebras_service import cerebras_client
from ..services.evidence import Evidence
from ..services.triage import run_shared_triage
from ..services.patch_generator import build_candidate_patches
from ..services.source_reader import apply_patch, read_import_lines, read_source_snippet
from ..services.patch_validator import rank_and_select_winner
from ..services.github_service import create_draft_pull_request
from ..services.slack_service import send_slack_incident_alert
from ..streaming.event_bus import event_bus
from ..services.incident_events import publish_incident_update
from ..database import save_incident, update_incident, save_agent_run, save_patches

logger = logging.getLogger("blinkfix.orchestrator")


def _file_parses_with(payload: CrashPayload, patch: CandidatePatch) -> bool:
    """True if the real source file still parses after the failing line is replaced by the patch."""
    patched = apply_patch(payload.file, payload.line, patch.code)
    if patched is None:
        return False
    try:
        ast.parse(patched)
        return True
    except SyntaxError:
        return False


async def run_incident_orchestration(
    incident_id: str,
    payload: CrashPayload,
    logs: Optional[List[Dict[str, Any]]] = None,
):
    """Runs an incident end to end. Any failure marks the incident FAILED instead of leaving it stuck."""
    try:
        await _orchestrate(incident_id, payload, logs or [])
    except Exception as e:
        logger.exception("Incident %s failed", incident_id)
        update_incident(incident_id, {"status": "FAILED"})
        await event_bus.broadcast(incident_id, "incident_failed", {"incident_id": incident_id, "error": str(e)})
        await publish_incident_update(incident_id)


async def _orchestrate(incident_id: str, payload: CrashPayload, logs: List[Dict[str, Any]]):
    """Executes the closed-loop autonomous incident investigation & speculative healing."""
    start_time = time.perf_counter()
    context = load_deployment_context()

    # 1. Store the incident with everything we know about the crash, then announce it
    save_incident({
        "id": incident_id,
        "service": payload.service,
        "error_name": payload.exceptionType,
        "error_message": payload.message,
        "file": payload.file,
        "line": payload.line,
        "status": "AGENTS_ACTIVE",
        "context_snapshot": context,
        "payload_json": payload.model_dump_json(),
        "logs": logs,
    })
    await publish_incident_update(incident_id)

    await event_bus.broadcast(incident_id, "incident_started", {
        "incident_id": incident_id,
        "service": payload.service,
        "error": payload.message,
        "timestamp": time.time(),
    })

    # 2. Parallel burst of 5 specialist agents, all reading the same evidence
    evidence = Evidence(
        payload=payload,
        context=context,
        logs=logs,
        source=read_source_snippet(payload.file, payload.line, context=15),
        imports=read_import_lines(payload.file),
    )
    agents = [
        TraceAnalyst(),
        GitDetective(),
        InfraChecker(),
        ImpactAnalyst(),
        MitigationPlanner(),
    ]

    for agent in agents:
        await event_bus.broadcast(incident_id, "agent_started", {"agent": agent.name})

    if settings.CEREBRAS_AGENT_MODE == "batched" and cerebras_client.enabled:
        evidence.shared = await run_shared_triage(agents, evidence)

    agent_results = await asyncio.gather(*(agent.execute(payload, context, evidence) for agent in agents), return_exceptions=True)

    culprit_commit = "unknown"
    mitigation: Dict[str, Any] = {}
    for res in agent_results:
        if isinstance(res, Exception):
            logger.error(f"Agent failed: {res}")
            continue
        save_agent_run(incident_id, res.model_dump())
        await event_bus.broadcast(incident_id, "agent_completed", res.model_dump())
        if res.agent_name == "Git Detective":
            culprit_commit = res.findings.get("commit_hash", culprit_commit)
        if res.agent_name == "Mitigation Planner":
            mitigation = res.findings

    update_incident(incident_id, {"status": "MITIGATION_READY", "culprit_commit": culprit_commit})
    await publish_incident_update(incident_id)
    await event_bus.broadcast(incident_id, "mitigation_ready", {
        "action": mitigation.get("action"),
        "target_commit": culprit_commit,
        "risk_level": mitigation.get("risk_level"),
    })

    # 3. Speculative multi-patching: several candidate fixes at once
    candidates = await build_candidate_patches(payload, evidence)
    update_incident(incident_id, {"status": "SPECULATIVE_REPAIR"})
    save_patches(incident_id, [p.model_dump() for p in candidates])
    await publish_incident_update(incident_id)
    await event_bus.broadcast(incident_id, "repair_started", {
        "candidate_count": len(candidates),
        "target_file": payload.file,
    })

    if not candidates:
        logger.warning("No candidate fix available for incident %s (%s)", incident_id, payload.exceptionType)
        update_incident(incident_id, {"status": "FAILED"})
        await event_bus.broadcast(incident_id, "incident_failed", {"incident_id": incident_id, "error": "No candidate fix"})
        await publish_incident_update(incident_id)
        return

    # 4. Validation gates and ranking
    update_incident(incident_id, {"status": "VALIDATING"})
    await publish_incident_update(incident_id)
    language = "python" if payload.file.endswith(".py") else "javascript"
    validated_patches = rank_and_select_winner(
        candidates,
        language=language,
        syntax_check=(lambda patch: _file_parses_with(payload, patch)) if language == "python" else None,
    )
    winning_patch = next((p for p in validated_patches if p.isWinner), validated_patches[0])
    save_patches(incident_id, [p.model_dump() for p in validated_patches])
    await publish_incident_update(incident_id)

    if not winning_patch.validation.astSyntaxValid:
        # Never open a pull request for code that does not even parse.
        logger.warning("No candidate fix for %s produced valid code", incident_id)
        update_incident(incident_id, {"status": "FAILED"})
        await event_bus.broadcast(incident_id, "incident_failed", {"incident_id": incident_id, "error": "No valid fix"})
        await publish_incident_update(incident_id)
        return

    await event_bus.broadcast(incident_id, "patch_verified", {
        "winning_patch_id": winning_patch.id,
        "strategy": winning_patch.strategy,
        "score": winning_patch.validation.score,
        "code": winning_patch.code,
    })

    # 5. Create Draft Pull Request on GitHub
    pr_result = await create_draft_pull_request(
        incident_id=incident_id,
        target_file=payload.file,
        patch_code=winning_patch.code,
        summary=f"Automated patch fix by Blinkfix for {payload.message}",
        culprit_commit=culprit_commit,
        error_name=payload.exceptionType,
    )

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)

    # 6. Dispatch Slack notification
    await send_slack_incident_alert(
        incident_id=incident_id,
        service=payload.service,
        error_name=payload.exceptionType,
        error_message=payload.message,
        pr_url=pr_result["pr_url"],
        duration_ms=elapsed_ms,
        culprit_commit=culprit_commit,
    )

    # 7. Mark resolved
    update_incident(incident_id, {
        "status": "RESOLVED",
        "duration_ms": elapsed_ms,
        "culprit_commit": culprit_commit,
        "winning_patch_id": winning_patch.id,
        "pr_url": pr_result["pr_url"],
    })
    await publish_incident_update(incident_id)

    await event_bus.broadcast(incident_id, "pr_created", pr_result)
    await event_bus.broadcast(incident_id, "incident_completed", {
        "incident_id": incident_id,
        "duration_ms": elapsed_ms,
        "status": "RESOLVED",
        "pr_url": pr_result["pr_url"],
    })

    logger.info(f"Incident {incident_id} successfully resolved in {elapsed_ms}ms! PR: {pr_result['pr_url']}")
