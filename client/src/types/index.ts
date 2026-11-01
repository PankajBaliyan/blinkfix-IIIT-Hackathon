export type ScenarioId = 'payments-typeerror' | 'stripe-timeout';
export type ExecutionMode = 'live' | 'fixture';
export type IncidentStatus = 'TRIGGERED' | 'AGENTS_ACTIVE' | 'SPECULATIVE_REPAIR' | 'VALIDATING' | 'VALIDATED' | 'RESOLVED' | 'MITIGATED' | 'FAILED' | 'PUBLISH_FAILED';
export type AgentStatus = 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'closed';

export interface CommandResult { command: string[]; exit_code: number; stdout: string; stderr: string; timed_out?: boolean }
export interface CandidateValidation { passed: boolean; syntax: CommandResult; tests: CommandResult }
export interface CandidateResult { id: string; code: string; diff: string; isWinner: boolean; validation: CandidateValidation }
export interface AgentResult { agent_name: string; status: AgentStatus; summary: string; duration_ms: number; findings: Record<string, unknown> }

export interface IncidentState {
  id: string; revision: number; status: IncidentStatus; scenario_id: ScenarioId; mode: ExecutionMode;
  publish: boolean; source: string; started_at: string; duration_ms: number;
  agents: AgentResult[]; patches: CandidateResult[]; baseline?: CandidateResult; generator?: string;
  error?: string | null; mitigation?: string | null; pr_url?: string | null; commit_sha?: string;
  branch?: string; target_file?: string; evidence_path?: string; syntax_exit_code?: number; regression_exit_code?: number;
}

export interface SetupStatus {
  status: string; cerebras: { configured: boolean; model: string }; codex: { configured: boolean; model: string };
  github: { configured: boolean; repo: string; target_file: string };
  readiness: { offline_fixture: boolean; live_analysis: boolean; github_publishing: boolean; publishing_default: false };
}

export interface RehearsalRun { id: string; status: IncidentStatus; duration_ms: number; model_failure: boolean; publication_failure: boolean; published: boolean; pr_url?: string | null; error?: string | null }
export interface RehearsalReport { requested_runs: number; recorded_runs: number; successful_runs: number; total_duration_ms: number; model_failures: number; publication_failures: number; runs: RehearsalRun[] }
export interface FixtureResponse { source: string; contract: string }
export interface SimulateResponse { status: 'initiated' | 'existing'; incident_id: string }
export interface RunRequest { requestId: string; scenarioId: ScenarioId; mode: ExecutionMode; publish: boolean; source: string }
