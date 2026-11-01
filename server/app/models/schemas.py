from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class CrashPayload(BaseModel):
    eventId: Optional[str] = None
    level: str = "error"
    service: str = "checkout-service"
    environment: str = "prod-us-east-1"
    message: str = "TypeError: Cannot read properties of undefined (reading 'exchangeRate')"
    exceptionType: str = "TypeError"
    file: str = "src/payments.js"
    line: int = 5
    functionName: Optional[str] = "processPayment"
    timestamp: Optional[str] = None
    stackTrace: Optional[str] = None

class SimulateRequest(BaseModel):
    scenarioId: str = "payments-typeerror"
    customCrash: Optional[CrashPayload] = None

class AgentResult(BaseModel):
    agent_name: str
    status: str = "COMPLETED"
    duration_ms: int = 0
    summary: str = ""
    logs: List[str] = Field(default_factory=list)
    findings: Dict[str, Any] = Field(default_factory=dict)

class PatchValidation(BaseModel):
    targetFileMatch: bool = False
    astSyntaxValid: bool = False
    unitTestsPassed: str = "not run"
    diffLineChange: str = ""
    score: int = 0

class CandidatePatch(BaseModel):
    id: str
    title: str
    strategy: str
    explanation: str
    confidence: float = 0.95
    isWinner: bool = False
    validation: PatchValidation = Field(default_factory=PatchValidation)
    code: str

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

