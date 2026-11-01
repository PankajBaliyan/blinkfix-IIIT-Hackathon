"""Validated boundaries for untrusted provider responses."""
from pydantic import BaseModel, ConfigDict, Field


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra='ignore')
    summary: str = Field(min_length=1, max_length=4000)
    findings: dict[str, object] = Field(default_factory=dict)


class CandidateSource(BaseModel):
    model_config = ConfigDict(extra='ignore')
    code: str = Field(min_length=1, max_length=30000)


class CandidateResponse(BaseModel):
    model_config = ConfigDict(extra='ignore')
    candidates: list[CandidateSource] = Field(min_length=1, max_length=3)
