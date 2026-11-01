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
  prNumber: number | null;
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
  /** Who wrote it: a model (Cerebras or the Codex agent), or the built-in demo library. */
  source: 'cerebras' | 'codex' | 'demo';
  model: string | null;
  /** The lines this fix replaces, and where they are. */
  original: string;
  file: string | null;
  startLine: number | null;
  endLine: number | null;
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
  origin?: 'github' | 'local';
  repoPath?: string;
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
  /** Where the code was read from: GitHub, or the local copy when GitHub could not be used. */
  codeOrigin: 'github' | 'local' | null;
  codeNote: string | null;
  pr: { number: number | null; url: string; branch: string | null } | null;
  agents: AgentRun[];
  culprit: {
    commit_hash: string;
    author: string;
    pr_number: number | null;
    message: string | null;
    committed_at: string | null;
    url?: string | null;
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
    services_simulated?: boolean;
  } | null;
  mitigation: {
    action: string;
    description: string;
    target_pr: number | null;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  } | null;
  patches: CandidatePatch[];
}

export interface Health {
  status: string;
  version: string;
  demo_mode: boolean;
  cerebras: { configured: boolean; model: string };
  github: { configured: boolean; oauth_configured: boolean; repo: string };
  codex: { configured: boolean; model: string | null; key_set: boolean };
}

export interface GithubStatus {
  oauthConfigured: boolean;
  connected: boolean;
  via: 'login' | 'token' | null;
  login: string | null;
  repo: string;
  branch: string;
  pathPrefix: string;
  callbackUrl: string;
  canWrite: boolean | null;
  problem: string | null;
}
