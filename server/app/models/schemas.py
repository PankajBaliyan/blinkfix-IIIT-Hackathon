from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class CrashPayload(BaseModel):
    eventId: Optional[str] = None
    level: str = "error"
    service: str = "unknown-service"
    environment: str = "unknown"
    message: str = "Unknown error"
    exceptionType: str = "Error"
    file: str = "unknown"
    line: int = 0
    functionName: Optional[str] = None
    timestamp: Optional[str] = None
    stackTrace: Optional[str] = None
    requestId: Optional[str] = None
    route: Optional[str] = None
    method: Optional[str] = None
    # What the failing request sent, so it can be replayed against a fix. Secrets are masked.
    requestBody: Optional[str] = None
    queryString: Optional[str] = None

class AgentResult(BaseModel):
    agent_name: str
    status: str = "COMPLETED"
    duration_ms: int = 0
    summary: str = ""
    logs: List[str] = Field(default_factory=list)
    findings: Dict[str, Any] = Field(default_factory=dict)

class PatchValidation(BaseModel):
    targetFileMatch: bool = True
    astSyntaxValid: bool = True
    unitTestsPassed: str = "not run"
    diffLineChange: str = "+3 / -2 lines"
    score: int = 0
    # Results of running the fix in a sandbox copy of the service
    importOk: bool = True
    replay: str = "not_run"        # fixed | still_fails | not_reproduced | blocked | not_run
    replayDetail: str = ""
    testsRun: int = 0
    testsFailed: int = 0
    testsDetail: str = ""
    verified: bool = False

class CandidatePatch(BaseModel):
    id: str
    title: str
    strategy: str
    explanation: str
    confidence: float = 0.95
    isWinner: bool = False
    validation: PatchValidation = Field(default_factory=PatchValidation)
    code: str
    source: str = "demo"  # "cerebras", "codex" or "demo"
    model: Optional[str] = None
    # The lines this patch replaces, in the failing file.
    original: str = ""
    file: Optional[str] = None
    startLine: Optional[int] = None
    endLine: Optional[int] = None

class RollbackApprovalRequest(BaseModel):
    approvedBy: str = "sre-engineer"
    reason: Optional[str] = "Approved safe revert based on Blinkfix diagnosis"

class IncidentResponse(BaseModel):
    incidentId: str
    status: str
    service: str
    errorName: str
    errorMessage: str
    file: str
    line: int
    durationMs: int = 0
    culpritCommit: Optional[str] = None
    winningPatchId: Optional[str] = None
    prUrl: Optional[str] = None
    rollbackApproved: bool = False
    agents: List[AgentResult] = Field(default_factory=list)
    patches: List[CandidatePatch] = Field(default_factory=list)

