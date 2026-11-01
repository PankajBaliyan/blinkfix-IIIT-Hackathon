export type IncidentSeverity = 'P0 - CRITICAL' | 'P1 - HIGH' | 'P2 - MEDIUM';

export type IncidentStatus = 
  | 'STANDBY'
  | 'TRIGGERED'
  | 'AGENTS_ACTIVE'
  | 'MITIGATION_READY'
  | 'SPECULATIVE_REPAIR'
  | 'VALIDATING'
  | 'RESOLVED'
  | 'FAILED';

export interface Scenario {
  id: string;
  name: string;
  service: string;
  environment: string;
  version: string;
  commitHead: string;
  errorName: string;
  errorMessage: string;
  file: string;
  line: number;
  functionName: string;
  culpritCommit: {
    hash: string;
    author: string;
    message: string;
    timeAgo: string;
    prNumber: number;
  };
  infraStatus: {
    service: string;
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    latencyMs: number;
  }[];
  blastRadius: {
    scope: string;
    impactPercentage: string;
    affectedRoutes: string[];
    severity: IncidentSeverity;
  };
  mitigation: {
    action: string;
    description: string;
    targetPr: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  patches: CandidatePatch[];
  originalCode: string;
  fixedCode: string;
}

export interface CandidatePatch {
  id: string;
  title: string;
  strategy: string;
  explanation: string;
  confidence: number;
  isWinner: boolean;
  validation: {
    targetFileMatch: boolean;
    astSyntaxValid: boolean;
    unitTestsPassed: string;
    diffLineChange: string;
    score: number;
  };
  code: string;
}

export type AgentRole = 
  | 'trace-analyst'
  | 'git-detective'
  | 'infra-checker'
  | 'impact-analyst'
  | 'mitigation-planner';

export interface AgentInfo {
  id: AgentRole;
  name: string;
  role: string;
  icon: string;
  latencyMs: number;
  status: 'IDLE' | 'THINKING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  summary: string;
  logs: string[];
  findings?: Record<string, any>;
}

