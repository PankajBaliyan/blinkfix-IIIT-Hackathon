import ast
import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

from ..agents.git_detective import GitDetective
from ..agents.impact_analyst import ImpactAnalyst
from ..agents.infra_checker import InfraChecker
from ..agents.mitigation_planner import MitigationPlanner
from ..agents.trace_analyst import TraceAnalyst
from ..config import settings
from ..database import save_agent_run, save_incident, save_patches, update_incident
from ..models.schemas import CandidatePatch, CrashPayload
from ..streaming.event_bus import event_bus
from .cerebras_service import cerebras_client
from .code_source import SourceFile, load_source_file
from .codex_agent import run_codex_fix
from .context_service import build_deployment_context
from .evidence import Evidence
from .log_store import log_store
from .incident_events import publish_incident_update
from .patch_generator import build_candidate_patches
from .patch_validator import rank_and_select_winner, rank_validated
from .validation import validate_candidates
from .pull_request import PullRequestError, create_pull_request
from .github_client import get_token
from ..database import get_integration
from .source_reader import import_lines_from_text, replace_lines, snippet_from_text
from .triage import run_shared_triage

logger = logging.getLogger("blinkfix.orchestrator")

CODEX_TIMEOUT_S = 120


def _parses_with(source: SourceFile, patch: CandidatePatch) -> bool:
    """True if the file still parses after the patch replaces its lines."""
    start = patch.startLine or source.line
    end = patch.endLine or start
    try:
        ast.parse(replace_lines(source.text, start, end, patch.code))
        return True
    except SyntaxError:
        return False


def _auto_pr_skip_reason(winner: CandidatePatch, source: SourceFile) -> Optional[str]:
    """Why a pull request should not be opened automatically, or None if it can be."""
    if not winner.validation.verified:
        return (
            "No pull request was opened automatically because the best fix could not be fully verified. "
            "Review it, then open one from the Fix page."
        )
    if not get_token():
        return "Connect GitHub in Settings so pull requests can open automatically."
    if not source.pr_ready:
        return "The code was not read from GitHub, so a pull request cannot be built from it."
    return None


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


async def _fail(incident_id: str, reason: str) -> None:
    logger.warning("Incident %s failed: %s", incident_id, reason)
    update_incident(incident_id, {"status": "FAILED"})
    await event_bus.broadcast(incident_id, "incident_failed", {"incident_id": incident_id, "error": reason})
    await publish_incident_update(incident_id)


async def _orchestrate(incident_id: str, payload: CrashPayload, logs: List[Dict[str, Any]]):
    start_time = time.perf_counter()

    # 1. Store the incident straight away so the dashboard shows it, then announce it
    save_incident({
        "id": incident_id,
        "service": payload.service,
        "error_name": payload.exceptionType,
        "error_message": payload.message,
        "file": payload.file,
        "line": payload.line,
        "status": "AGENTS_ACTIVE",
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

    # 2. Gather what GitHub knows: commit history, git blame, dependencies and the failing file itself
    context, source = await asyncio.gather(build_deployment_context(payload), load_source_file(payload))
    if payload.route:
        context["traffic"] = log_store.request_stats(payload.service, payload.method or "GET", payload.route)
    snippet_wide = snippet_from_text(source.file, source.text, source.line, 15) if source else None
    snippet_ui = snippet_from_text(source.file, source.text, source.line, 4) if source else None
    if snippet_ui and source:
        snippet_ui.update({"origin": source.origin, "note": source.note, "repoPath": source.path})
    update_incident(incident_id, {
        "context_snapshot": json.dumps(context),
        "source_json": json.dumps(snippet_ui) if snippet_ui else None,
        "code_origin": source.origin if source else None,
    })
    await publish_incident_update(incident_id)

    evidence = Evidence(
        payload=payload,
        context=context,
        logs=logs,
        source=snippet_wide,
        imports=import_lines_from_text(source.text) if source else [],
        code_origin=source.origin if source else None,
    )

    # 3. Parallel burst of 5 specialist agents, all reading the same evidence
    agents = [TraceAnalyst(), GitDetective(), InfraChecker(), ImpactAnalyst(), MitigationPlanner()]
    for agent in agents:
        await event_bus.broadcast(incident_id, "agent_started", {"agent": agent.name})

    if settings.CEREBRAS_AGENT_MODE == "batched" and cerebras_client.enabled:
        evidence.shared = await run_shared_triage(agents, evidence)

    agent_results = await asyncio.gather(*(a.execute(payload, context, evidence) for a in agents), return_exceptions=True)

    culprit_commit = "unknown"
    mitigation: Dict[str, Any] = {}
    root_cause: Optional[str] = None
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
        if res.agent_name == "Trace Analyst":
            root_cause = res.findings.get("cause")

    update_incident(incident_id, {"status": "MITIGATION_READY", "culprit_commit": culprit_commit})
    await publish_incident_update(incident_id)
    await event_bus.broadcast(incident_id, "mitigation_ready", {
        "action": mitigation.get("action"),
        "target_commit": culprit_commit,
        "risk_level": mitigation.get("risk_level"),
    })

    if source is None:
        await _fail(incident_id, "The failing file could not be read from GitHub or from disk")
        return

    # 4. Candidate fixes: the model's quick candidates and the Codex agent's repo-aware fix, at the same time
    update_incident(incident_id, {"status": "SPECULATIVE_REPAIR"})
    await publish_incident_update(incident_id)

    async def codex_with_timeout():
        try:
            return await asyncio.wait_for(
                run_codex_fix(payload, evidence, source, patch_id="patch-z", hint=root_cause), CODEX_TIMEOUT_S
            )
        except asyncio.TimeoutError:
            logger.warning("Codex agent timed out after %ss", CODEX_TIMEOUT_S)
            return None

    candidate_result, codex_result = await asyncio.gather(
        build_candidate_patches(payload, evidence, source), codex_with_timeout(), return_exceptions=True
    )
    candidates: List[CandidatePatch] = candidate_result if isinstance(candidate_result, list) else []
    if isinstance(candidate_result, Exception):
        logger.error("Candidate patch generation failed: %s", candidate_result)

    if codex_result is not None and not isinstance(codex_result, Exception):
        save_agent_run(incident_id, codex_result.agent.model_dump())
        if codex_result.patch:
            patch = codex_result.patch
            patch.id = f"patch-{chr(ord('a') + len(candidates))}"
            patch.title = f"Patch {patch.id[-1].upper()}: {patch.strategy}"
            candidates.append(patch)
    elif isinstance(codex_result, Exception):
        logger.error("Codex agent crashed: %s", codex_result)

    save_patches(incident_id, [p.model_dump() for p in candidates])
    await publish_incident_update(incident_id)
    await event_bus.broadcast(incident_id, "repair_started", {"candidate_count": len(candidates), "target_file": payload.file})

    if not candidates:
        await _fail(incident_id, f"No candidate fix for {payload.exceptionType}")
        return

    # 5. Check every fix by running it, then rank by what happened
    update_incident(incident_id, {"status": "VALIDATING"})
    await publish_incident_update(incident_id)
    outcome = await validate_candidates(payload, source, candidates)
    if outcome is not None:
        validated = rank_validated(candidates, outcome.baseline_test_failures)
        update_incident(incident_id, {"validation_json": json.dumps(outcome.as_dict())})
    else:
        # The service cannot be run here, so only the syntax of each fix can be checked.
        language = "python" if payload.file.endswith(".py") else "javascript"
        validated = rank_and_select_winner(
            candidates,
            language=language,
            syntax_check=(lambda patch: _parses_with(source, patch)) if language == "python" else None,
        )
    winner = next((p for p in validated if p.isWinner), None)
    save_patches(incident_id, [p.model_dump() for p in validated])
    await publish_incident_update(incident_id)

    if winner is None or not winner.validation.astSyntaxValid:
        # Never offer a pull request for a fix that crashes, breaks a test, or does not parse.
        await _fail(incident_id, "No candidate fix passed validation")
        return

    await event_bus.broadcast(incident_id, "patch_verified", {
        "winning_patch_id": winner.id,
        "strategy": winner.strategy,
        "score": winner.validation.score,
        "code": winner.code,
    })

    # 6. Deliver: open a draft pull request by itself when that is on and the fix is verified
    skip_reason = _auto_pr_skip_reason(winner, source)
    note: Optional[str] = None
    delivered = False
    if settings.AUTO_OPEN_PR:
        if skip_reason:
            note = skip_reason
        else:
            update_incident(incident_id, {
                "status": "DELIVERING",
                "duration_ms": int((time.perf_counter() - start_time) * 1000),
                "culprit_commit": culprit_commit,
                "winning_patch_id": winner.id,
            })
            await publish_incident_update(incident_id)
            try:
                login = (get_integration("github") or {}).get("login")
                await create_pull_request(incident_id, winner.id, login)
                delivered = True
            except PullRequestError as e:
                note = f"A pull request could not be opened automatically: {e.message}"
            except Exception:
                logger.exception("Opening the pull request failed")
                note = "A pull request could not be opened automatically. Try the button on the Fix page."

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    resolved_fields = {
        "status": "RESOLVED",
        "duration_ms": elapsed_ms,
        "culprit_commit": culprit_commit,
        "winning_patch_id": winner.id,
    }
    if note is not None:  # do not erase a note the pull-request step already saved
        resolved_fields["pr_note"] = note
    update_incident(incident_id, resolved_fields)
    await publish_incident_update(incident_id)
    await event_bus.broadcast(incident_id, "incident_completed", {
        "incident_id": incident_id,
        "duration_ms": elapsed_ms,
        "status": "RESOLVED",
    })
    logger.info(
        f"Incident {incident_id}: fix ready in {elapsed_ms}ms ({winner.source}: {winner.strategy}, "
        f"verified={winner.validation.verified}, pull request {'opened' if delivered else 'not opened'})"
    )
