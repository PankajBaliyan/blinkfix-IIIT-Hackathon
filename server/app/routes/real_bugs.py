import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.repository_workflow import load_manifest, prepare_repository, validate_repository_candidate
from ..services.real_bug_orchestrator import repair_real_bug

router = APIRouter(prefix='/api/real-bugs', tags=['real-bugs'])


class CandidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=100000)


class RepairRequest(BaseModel):
    strategy: str = 'parallel'


@router.get('/{bug_id}')
async def get_real_bug(bug_id: str):
    try:
        manifest = load_manifest(bug_id)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(404, str(exc)) from exc
    return {
        'id': manifest.id, 'repository': manifest.repository,
        'broken_revision': manifest.broken_revision, 'report_url': manifest.report_url,
        'target_file': manifest.target_file, 'report': manifest.report,
        'upstream_fix_reserved_for_evaluation': True,
    }


@router.post('/{bug_id}/reproduce')
async def reproduce_real_bug(bug_id: str):
    try:
        return await asyncio.to_thread(prepare_repository, bug_id)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        return {'status': 'ABSTAINED', 'bug_id': bug_id, 'reason': str(exc), 'pr_url': None}


@router.post('/{bug_id}/validate')
async def validate_candidate(bug_id: str, request: CandidateRequest):
    try:
        return await asyncio.to_thread(validate_repository_candidate, bug_id, request.code)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        return {'status': 'ABSTAINED', 'bug_id': bug_id, 'reason': str(exc), 'pr_url': None}


@router.post('/{bug_id}/repair')
async def repair_bug(bug_id: str, request: RepairRequest):
    return await repair_real_bug(bug_id, request.strategy)
