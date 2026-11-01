import React from 'react';
import {
  IncidentCockpit,
} from '../components/IncidentCockpit';
import { AgentSwarmGrid } from '../components/AgentSwarmGrid';
import { MitigationBanner } from '../components/MitigationBanner';
import {
  Scenario,
  IncidentStatus,
  AgentInfo,
} from '../types';
import { NavPage } from '../components/Sidebar';
import {
  ArrowRight,
  GitPullRequest,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface CockpitViewProps {
  scenario: Scenario;
  status: IncidentStatus;
  agents: AgentInfo[];
  formattedTime: string;
  elapsedMs: number;
  isRollbackApproved: boolean;
  onApproveRollback: () => void;
  onNavigate: (page: NavPage) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  scenario,
  status,
  agents,
  formattedTime,
  elapsedMs,
  isRollbackApproved,
  onApproveRollback,
  onNavigate,
}) => {
  const isStandby = status === 'STANDBY';
  const isResolved = status === 'RESOLVED';
  const showMitigation =
    status === 'MITIGATION_READY' ||
    status === 'SPECULATIVE_REPAIR' ||
    status === 'VALIDATING' ||
    isResolved;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Incident Alert & T-Zero Stopwatch */}
      <IncidentCockpit
        scenario={scenario}
        status={status}
        formattedTime={formattedTime}
        elapsedMs={elapsedMs}
      />

      {/* Immediate Rollback & Containment Banner */}
      {showMitigation && (
        <MitigationBanner
          scenario={scenario}
          isApproved={isRollbackApproved}
          onApprove={onApproveRollback}
        />
      )}

      {/* Quick Recovery Callout when Resolved */}
      {isResolved && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-terminal-green/15 via-obsidian-900 to-terminal-cyan/15 border border-terminal-green/50 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-terminal-green/20 text-terminal-green border border-terminal-green/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/40">
                  INCIDENT REMEDIATED IN {(elapsedMs / 1000).toFixed(2)}s
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Sub-2s closed-loop target achieved
                </span>
              </div>
              <h3 className="font-mono text-sm sm:text-base font-bold text-white mt-1">
                Verified patch generated and Draft PR #105 ready for merge
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onNavigate('patches')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-750 border border-terminal-cyan/40 text-terminal-cyan font-mono text-xs font-semibold transition"
            >
              <FileCode className="w-4 h-4" />
              <span>Inspect Patch Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('resolution')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-terminal-green hover:bg-emerald-400 text-obsidian-950 font-mono text-xs font-bold transition shadow-lg shadow-terminal-green/20"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Review Draft PR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5-Agent Swarm Terminal Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-terminal-blue inline-block animate-pulse" />
            <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Parallel Specialist Swarm (Cerebras Inference)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('agents')}
            className="flex items-center gap-1 font-mono text-xs text-terminal-blue hover:underline"
          >
            <span>Agent Deep-Dive & Logs</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <AgentSwarmGrid agents={agents} />
      </section>

      {/* Mission Control Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-obsidian-900/60 border border-obsidian-800 flex items-center justify-between">
          <span className="text-slate-400">Inference Engine:</span>
          <span className="text-slate-200 font-bold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-terminal-cyan" />
            Cerebras CS-3
          </span>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900/60 border border-obsidian-800 flex items-center justify-between">
          <span className="text-slate-400">Target Model:</span>
          <span className="text-terminal-blue font-bold">Llama 3.3 70B</span>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900/60 border border-obsidian-800 flex items-center justify-between">
          <span className="text-slate-400">Triage Concurrency:</span>
          <span className="text-terminal-green font-bold">5 Parallel Prompts</span>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900/60 border border-obsidian-800 flex items-center justify-between">
          <span className="text-slate-400">Audit Storage:</span>
          <span className="text-slate-200 font-bold">SQLite WAL</span>
        </div>
      </div>
    </div>
  );
};

