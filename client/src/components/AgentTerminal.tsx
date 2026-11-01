import React, { useState } from 'react';
import {
  Terminal,
  Bug,
  GitCommit,
  Server,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { AgentInfo } from '../types';

interface AgentTerminalProps {
  agent: AgentInfo;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ agent }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'trace-analyst':
        return <Bug className="w-4 h-4 text-terminal-cyan" />;
      case 'git-detective':
        return <GitCommit className="w-4 h-4 text-terminal-purple" />;
      case 'infra-checker':
        return <Server className="w-4 h-4 text-terminal-blue" />;
      case 'impact-analyst':
        return <Activity className="w-4 h-4 text-terminal-amber" />;
      case 'mitigation-planner':
        return <ShieldAlert className="w-4 h-4 text-terminal-red" />;
      default:
        return <Terminal className="w-4 h-4 text-slate-300" />;
    }
  };

  const isCompleted = agent.status === 'COMPLETED';
  const isWorking = agent.status === 'THINKING' || agent.status === 'ANALYZING';

  return (
    <div className={`rounded-xl border transition-all duration-300 flex flex-col overflow-hidden ${
      isCompleted
        ? 'bg-obsidian-900/90 border-obsidian-700/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
        : isWorking
        ? 'bg-obsidian-900 border-terminal-blue/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-terminal-blue/30'
        : 'bg-obsidian-900/60 border-obsidian-800/80'
    }`}>
      {/* Title Bar (macOS Terminal style) */}
      <div className="flex items-center justify-between px-3 py-2 bg-obsidian-850 border-b border-obsidian-750 select-none">
        <div className="flex items-center gap-2">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-1.5">
            {getAgentIcon(agent.id)}
            <span className="font-mono text-xs font-bold text-white tracking-wide">
              {agent.name}
            </span>
          </div>
        </div>

        {/* Status / Latency Badge */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-green/15 text-terminal-green border border-terminal-green/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>{agent.latencyMs}ms</span>
            </span>
          ) : isWorking ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/40 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{agent.status}</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-obsidian-800 border border-obsidian-700">
              IDLE
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-300 transition"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Role Sub-Header */}
      <div className="px-3 py-1 bg-obsidian-950/40 border-b border-obsidian-800 text-[10px] font-mono text-slate-400 truncate">
        {agent.role}
      </div>

      {/* Terminal Log Console */}
      {isExpanded && (
        <div className="p-3 bg-obsidian-950/80 font-mono text-xs text-slate-300 min-h-[110px] max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
          {agent.logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed flex items-start gap-1.5">
              <span className="text-slate-600 select-none">&gt;</span>
              <span className={log.includes('Cause:') || log.includes('Diagnosis:') ? 'text-terminal-amber font-semibold' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
          {isWorking && (
            <div className="flex items-center gap-1.5 text-terminal-blue text-[11px] animate-pulse">
              <span>&gt;</span>
              <span>Thinking on Cerebras CS-3...</span>
              <span className="w-1.5 h-3 bg-terminal-blue inline-block animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Findings Verdict Footer */}
      <div className="mt-auto px-3 py-2 border-t border-obsidian-800 bg-obsidian-900/90 text-[11px] font-mono">
        <div className="flex items-start gap-1.5">
          <Zap className="w-3 h-3 text-terminal-blue mt-0.5 shrink-0" />
          <p className="text-slate-200 line-clamp-2">
            <span className="text-slate-500 font-semibold">Verdict: </span>
            {agent.summary}
          </p>
        </div>
      </div>
    </div>
  );
};

