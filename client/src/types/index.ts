/** UI-only value used when there are no incidents yet. */
export type IncidentStatus =
  | 'STANDBY'
  | 'TRIGGERED'
  | 'AGENTS_ACTIVE'
  | 'MITIGATION_READY'
  | 'SPECULATIVE_REPAIR'
  | 'VALIDATING'
  | 'RESOLVED'
  | 'FAILED';

export interface IncidentSummary {
  id: string;
  service: string;
  status: IncidentStatus;
  errorType: string;
  errorMessage: string;
  file: string;
  line: number;
  route: string | null;
  method: string | null;
  createdAt: string | null;
  durationMs: number;
  rollbackApproved: boolean;
  prUrl: string | null;
}

export interface AgentRun {
  name: string;
  status: string;
  durationMs: number;
  summary: string;
  logs: string[];
  findings: Record<string, any>;
}

export interface PatchValidation {
  targetFileMatch: boolean;
  astSyntaxValid: boolean;
  unitTestsPassed: string;
  diffLineChange: string;
  score: number;
}

export interface CandidatePatch {
  id: string;
  title: string;
  strategy: string;
  explanation: string;
  confidence: number;
  isWinner: boolean;
  validation: PatchValidation;
  code: string;
}

export interface LogLine {
  ts: number;
  level: string;
  requestId: string | null;
  message: string;
}

export interface SourceSnippet {
  file: string;
  startLine: number;
  failingLine: number;
  lines: string[];
}

export interface OutsideService {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
}

export interface IncidentDetail extends IncidentSummary {
  environment: string | null;
  demoMode: boolean;
  culpritCommit: string | null;
  winningPatchId: string | null;
  error: {
    type: string;
    message: string;
    file: string;
    line: number;
    function: string | null;
    route: string | null;
    method: string | null;
    requestId: string | null;
    stackTrace: string | null;
  };
  logs: LogLine[];
  source: SourceSnippet | null;
  agents: AgentRun[];
  culprit: {
    commit_hash: string;
    author: string;
    pr_number: number;
    message: string | null;
    committed_at: string | null;
  } | null;
  impact: {
    scope: string;
    impact_percentage: string;
    severity: string;
    affected_routes: string[];
  } | null;
  infra: {
    diagnosis: string;
    is_external: boolean;
    services: OutsideService[];
  } | null;
  mitigation: {
    action: string;
    description: string;
    target_pr: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  } | null;
  patches: CandidatePatch[];
}

export interface Health {
  status: string;
  version: string;
  demo_mode: boolean;
  cerebras: { configured: boolean; model: string };
  github: { configured: boolean; repo: string };
}
