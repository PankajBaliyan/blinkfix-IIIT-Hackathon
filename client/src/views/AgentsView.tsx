import React, { useState } from 'react';
import {
  AgentInfo,
  Scenario,
  IncidentStatus,
} from '../types';
import {
  Terminal,
  Bug,
  GitCommit,
  Server,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Cpu,
  Clock,
  Code,
  Copy,
  Check,
  FileText,
  Search,
} from 'lucide-react';
import { AgentTerminal } from '../components/AgentTerminal';

interface AgentsViewProps {
  agents: AgentInfo[];
  scenario: Scenario;
  status: IncidentStatus;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  agents,
  scenario,
  status,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || 'trace-analyst');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'inspector' | 'grid'>('inspector');

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'trace-analyst':
        return <Bug className="w-5 h-5 text-terminal-cyan" />;
      case 'git-detective':
        return <GitCommit className="w-5 h-5 text-terminal-purple" />;
      case 'infra-checker':
        return <Server className="w-5 h-5 text-terminal-blue" />;
      case 'impact-analyst':
        return <Activity className="w-5 h-5 text-terminal-amber" />;
      case 'mitigation-planner':
        return <ShieldAlert className="w-5 h-5 text-terminal-red" />;
      default:
        return <Terminal className="w-5 h-5 text-slate-300" />;
    }
  };

  const getFindings = (agent: AgentInfo) => {
    switch (agent.id) {
      case 'trace-analyst':
        return {
          culpritFile: scenario.file,
          culpritLine: scenario.line,
          function: `${scenario.functionName}()`,
          exception: scenario.errorName,
          errorSignature: scenario.errorMessage,
          astContext: 'Unchecked property access on undefined/null member',
        };
      case 'git-detective':
        return {
          blamedCommit: scenario.culpritCommit.hash,
          author: scenario.culpritCommit.author,
          message: scenario.culpritCommit.message,
          relatedPR: `#${scenario.culpritCommit.prNumber}`,
          committed: scenario.culpritCommit.timeAgo,
          confidence: '98% Correlation match',
        };
      case 'infra-checker':
        return {
          dependencyHealth: scenario.infraStatus,
          diagnosis: scenario.id === 'stripe-timeout' ? 'UPSTREAM_API_DEGRADATION' : 'LOCAL_CODE_BUG',
          upstreamOutage: scenario.id === 'stripe-timeout',
          latencyVariance: 'Normal across internal cluster',
        };
      case 'impact-analyst':
        return {
          blastRadius: scenario.blastRadius.scope,
          trafficImpact: scenario.blastRadius.impactPercentage,
          affectedEndpoints: scenario.blastRadius.affectedRoutes,
          assignedSeverity: scenario.blastRadius.severity,
          slaBreachRisk: 'Critical',
        };
      case 'mitigation-planner':
        return {
          action: scenario.mitigation.action,
          strategy: scenario.mitigation.description,
          targetPR: `#${scenario.mitigation.targetPr}`,
          riskLevel: scenario.mitigation.riskLevel,
          requiresHumanApproval: true,
          status: 'Awaiting Operator Approval',
        };
      default:
        return {};
    }
  };

  const findings = getFindings(selectedAgent);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(selectedAgent.logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-obsidian-800 pb-4">
        <div>
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-terminal-blue" />
            <span>Autonomous Parallel Agent Swarm</span>
            <span className="px-2 py-0.5 rounded text-xs bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30 font-semibold">
              5 Specialist Workers
            </span>
          </h2>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Concurrent agent dispatch powered by Cerebras ultra-fast Llama 3.3 70B inference engine (sub-500ms).
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-obsidian-850 border border-obsidian-750 font-mono text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode('inspector')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'inspector'
                ? 'bg-terminal-blue text-obsidian-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Agent Inspector
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'grid'
                ? 'bg-terminal-blue text-obsidian-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All 5 Terminals
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Grid of all 5 Agent Terminals */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentTerminal key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        /* Deep Inspector Split View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agent Selection List (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="px-1 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Specialist Agents
            </div>

            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              const isCompleted = agent.status === 'COMPLETED';
              const isWorking = agent.status === 'THINKING' || agent.status === 'ANALYZING';

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full p-3.5 rounded-xl border text-left font-mono transition-all duration-200 flex items-start gap-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-obsidian-850 border-terminal-blue/70 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-terminal-blue/40'
                      : 'bg-obsidian-900/70 border-obsidian-800 hover:bg-obsidian-850/60 hover:border-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-obsidian-950 border border-obsidian-800 shrink-0 mt-0.5">
                    {getAgentIcon(agent.id)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {agent.name}
                      </span>

                      {isCompleted ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-terminal-green/20 text-terminal-green border border-terminal-green/40 font-bold shrink-0">
                          {agent.latencyMs}ms
                        </span>
                      ) : isWorking ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/40 font-bold animate-pulse shrink-0">
                          RUNNING
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-obsidian-800 text-slate-500 border border-obsidian-700 shrink-0">
                          IDLE
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mb-1">
                      {agent.role}
                    </p>

                    <div className="text-[10px] text-slate-400 truncate bg-obsidian-950/60 px-2 py-1 rounded border border-obsidian-800">
                      {agent.summary}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Agent Detailed Telemetry (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Agent Header Card */}
            <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-obsidian-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-750">
                    {getAgentIcon(selectedAgent.id)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-base font-bold text-white">
                        {selectedAgent.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-terminal-purple/20 text-terminal-purple border border-terminal-purple/40 font-semibold">
                        Cerebras Parallel Worker
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">
                      {selectedAgent.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-obsidian-950 border border-obsidian-750 font-mono text-xs flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-terminal-cyan" />
                    <span className="text-slate-400">Latency:</span>
                    <span className="text-terminal-green font-bold">{selectedAgent.latencyMs}ms</span>
                  </div>
                </div>
              </div>

              {/* Structured Findings Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="uppercase tracking-wider font-semibold">Structured Findings</span>
                  <span className="text-[10px] text-terminal-cyan">Validated JSON Output</span>
                </div>

                <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 font-mono text-xs overflow-x-auto">
                  <pre className="text-terminal-cyan/90 leading-relaxed">
                    {JSON.stringify(findings, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="uppercase tracking-wider font-semibold">Execution Logs & Trace</span>
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 text-[11px] transition border border-obsidian-700"
                  >
                    {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Logs'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-850 font-mono text-xs h-60 overflow-y-auto scrollbar-thin space-y-1.5">
                  {selectedAgent.logs.map((log, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-2">
                      <span className="text-slate-600 select-none">{idx + 1}</span>
                      <span className="leading-relaxed">{log}</span>
                    </div>
                  ))}
                  <div className="text-terminal-green flex items-center gap-1.5 pt-1">
                    <span className="inline-block w-2 h-3.5 bg-terminal-green animate-pulse" />
                    <span className="text-slate-500 text-[11px]">Worker standby</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

