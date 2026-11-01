import React from 'react';
import { Layers, Cpu, Sparkles } from 'lucide-react';
import { AgentInfo } from '../types';
import { AgentTerminal } from './AgentTerminal';

interface AgentSwarmGridProps {
  agents: AgentInfo[];
}

export const AgentSwarmGrid: React.FC<AgentSwarmGridProps> = ({ agents }) => {
  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-terminal-purple/20 text-terminal-purple border border-terminal-purple/30">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
            Autonomous Parallel Agent Swarm
          </h3>
          <span className="text-xs font-mono text-slate-400">
            (5 Concurrent Cerebras Agents)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-terminal-cyan">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Parallel Async Fan-out</span>
          </span>
        </div>
      </div>

      {/* Grid of 5 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5">
        {agents.map((agent) => (
          <AgentTerminal key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
};

