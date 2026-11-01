import React from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Gauge,
  Flame,
  Radio,
} from 'lucide-react';
import { Scenario, IncidentStatus } from '../types';

interface IncidentCockpitProps {
  scenario: Scenario;
  status: IncidentStatus;
  formattedTime: string;
  elapsedMs: number;
}

export const IncidentCockpit: React.FC<IncidentCockpitProps> = ({
  scenario,
  status,
  formattedTime,
  elapsedMs,
}) => {
  const isStandby = status === 'STANDBY';
  const isResolved = status === 'RESOLVED';
  const isRunning = !isStandby && !isResolved;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Active Incident Card (7 cols) */}
      <div className={`lg:col-span-7 rounded-xl border p-4 sm:p-5 transition-all duration-300 relative overflow-hidden ${
        isStandby
          ? 'bg-obsidian-900/60 border-obsidian-700/60'
          : isResolved
          ? 'bg-gradient-to-br from-obsidian-900 to-terminal-green/10 border-terminal-green/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          : 'bg-gradient-to-br from-obsidian-900 to-red-950/20 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
      }`}>
        {/* Glow accent bar at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isStandby ? 'bg-slate-700' : isResolved ? 'bg-terminal-green' : 'bg-red-500 animate-pulse'
        }`} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-bold uppercase tracking-wider ${
              isStandby
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : isResolved
                ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/40'
                : 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse-fast'
            }`}>
              {isStandby ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  SYSTEM NOMINAL
                </>
              ) : isResolved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-terminal-green" />
                  INCIDENT MITIGATED & PATCHED
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  {scenario.blastRadius.severity}
                </>
              )}
            </span>

            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              ID: <span className="text-slate-300 font-semibold">{scenario.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Radio className={`w-3 h-3 ${isStandby ? 'text-slate-500' : isResolved ? 'text-terminal-green' : 'text-red-400 animate-ping'}`} />
            <span>{isStandby ? 'Webhook Listener Armed' : 'Sentry Crash Ingested in 12ms'}</span>
          </div>
        </div>

        {/* Error Details */}
        <div className="space-y-2">
          <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
            <span className="text-red-400">{scenario.errorName}:</span>
            <span className="text-slate-200 text-sm sm:text-base font-normal truncate">
              {scenario.errorMessage}
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-terminal-blue" />
              <span>{scenario.file}</span>
              <span className="text-terminal-blue font-bold">:{scenario.line}</span>
            </div>

            <span className="text-slate-500">•</span>

            <span className="text-slate-400">
              Function: <code className="text-slate-200">{scenario.functionName}()</code>
            </span>

            <span className="text-slate-500">•</span>

            <span className="text-slate-400">
              Scope: <span className="text-terminal-amber">{scenario.blastRadius.scope}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: The T-Zero Millisecond Stopwatch (5 cols) */}
      <div className={`lg:col-span-5 rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
        isStandby
          ? 'bg-obsidian-900/60 border-obsidian-700/60'
          : isResolved
          ? 'bg-gradient-to-br from-obsidian-900 to-terminal-green/10 border-terminal-green/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          : 'bg-gradient-to-br from-obsidian-900 to-terminal-amber/15 border-terminal-amber/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Clock className={`w-3.5 h-3.5 ${isStandby ? 'text-slate-500' : isResolved ? 'text-terminal-green' : 'text-terminal-amber animate-spin'}`} />
            <span>T-Zero Millisecond Stopwatch</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Gauge className="w-3 h-3 text-terminal-cyan" />
            <span className="text-terminal-cyan">CEREBRAS 1,000+ TOK/S</span>
          </div>
        </div>

        {/* Digital Counter Display */}
        <div className="my-2 py-1 text-center">
          <div className={`font-mono text-4xl sm:text-5xl font-black tracking-widest tabular-nums drop-shadow-md ${
            isStandby
              ? 'text-slate-500'
              : isResolved
              ? 'text-terminal-green'
              : 'text-terminal-amber animate-pulse'
          }`}>
            {formattedTime}
          </div>
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-1">
            Mean Time To Remediation (MTTR)
          </p>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center justify-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs font-semibold ${
            isStandby
              ? 'bg-obsidian-800 text-slate-400 border border-slate-700'
              : isResolved
              ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/40 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isStandby ? 'bg-slate-500' : isResolved ? 'bg-terminal-green' : 'bg-terminal-amber animate-ping'
            }`} />
            <span>
              {isStandby
                ? 'STANDBY // READY FOR TRIGGER'
                : isResolved
                ? `MTTR ACHIEVED: ${(elapsedMs / 1000).toFixed(2)}s (SUB-2S RESOLUTION)`
                : 'AUTONOMOUS PARALLEL SWARM IN FLIGHT...'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

