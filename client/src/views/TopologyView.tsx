import React, { useState } from 'react';
import {
  Scenario,
  IncidentStatus,
} from '../types';
import {
  Network,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Flame,
  ArrowRight,
  Database,
  Cpu,
  Layers,
} from 'lucide-react';

interface TopologyViewProps {
  scenario: Scenario;
  status: IncidentStatus;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  scenario,
  status,
}) => {
  const [isProbing, setIsProbing] = useState(false);
  const [probeSuccess, setProbeSuccess] = useState(false);

  const handleRunProbe = () => {
    setIsProbing(true);
    setTimeout(() => {
      setIsProbing(false);
      setProbeSuccess(true);
      setTimeout(() => setProbeSuccess(false), 2500);
    }, 800);
  };

  const services = [
    {
      name: scenario.service,
      type: 'Core Microservice',
      environment: scenario.environment,
      status: status === 'STANDBY' || status === 'RESOLVED' ? 'HEALTHY' : 'CRASHED',
      latency: 42,
      errorRate: status === 'STANDBY' || status === 'RESOLVED' ? '0.01%' : '14.2%',
      version: scenario.version,
    },
    {
      name: 'identity-service',
      type: 'OAuth & Token Provider',
      environment: scenario.environment,
      status: scenario.id === 'auth-nullpointer' && status !== 'RESOLVED' && status !== 'STANDBY' ? 'DEGRADED' : 'HEALTHY',
      latency: 18,
      errorRate: scenario.id === 'auth-nullpointer' ? '9.4%' : '0.00%',
      version: 'v1.0.4',
    },
    {
      name: 'Stripe API Gateway',
      type: 'Primary Payment Rail',
      environment: 'External Cloud',
      status: scenario.id === 'stripe-timeout' ? 'DEGRADED' : 'HEALTHY',
      latency: scenario.id === 'stripe-timeout' ? 5120 : 38,
      errorRate: scenario.id === 'stripe-timeout' ? '68.5%' : '0.00%',
      version: 'v12.4.0',
    },
    {
      name: 'Adyen Payment Gateway',
      type: 'Failover Payment Rail',
      environment: 'External Cloud',
      status: 'HEALTHY',
      latency: 45,
      errorRate: '0.00%',
      version: 'v68.0',
    },
    {
      name: 'PostgreSQL Primary (Pool)',
      type: 'Relational Database',
      environment: 'us-east-1-rds',
      status: 'HEALTHY',
      latency: 12,
      errorRate: '0.00%',
      version: 'v16.1',
    },
    {
      name: 'Redis Session Cache',
      type: 'In-Memory Key/Value',
      environment: 'us-east-1-elasticache',
      status: 'HEALTHY',
      latency: 2,
      errorRate: '0.00%',
      version: 'v7.2',
    },
    {
      name: 'Cerebras Cloud CS-3',
      type: 'AI Inference Subsystem',
      environment: 'Cerebras Cloud',
      status: 'HEALTHY',
      latency: 380,
      errorRate: '0.00%',
      version: 'Llama 3.3 70B',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-terminal-cyan" />
            <h2 className="font-mono text-base sm:text-lg font-bold text-white">
              Service Topology & Dependency Health Map
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-cyan/15 text-terminal-cyan border border-terminal-cyan/30">
              LIVE TELEMETRY
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Real-time status probes tracking upstream payment gateways, internal databases, microservices, and blast radius.
          </p>
        </div>

        <button
          onClick={handleRunProbe}
          disabled={isProbing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-slate-200 font-mono text-xs font-semibold transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin text-terminal-blue' : ''}`} />
          <span>{isProbing ? 'Probing Nodes...' : probeSuccess ? 'Probes Refreshed!' : 'Run Health Check'}</span>
        </button>
      </div>

      {/* Blast Radius & Traffic Impact Panel */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-gradient-to-r from-obsidian-900 to-obsidian-850 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-obsidian-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-terminal-red" />
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              Blast Radius Analysis // {scenario.service}
            </h3>
          </div>
          <span className="font-mono text-xs text-terminal-amber font-semibold">
            Affected Traffic: {scenario.blastRadius.impactPercentage}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Impact Scope</span>
            <div className="text-white font-bold">{scenario.blastRadius.scope}</div>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Assigned Severity</span>
            <div className="text-terminal-red font-bold">{scenario.blastRadius.severity}</div>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Affected API Endpoints</span>
            <div className="text-slate-300 truncate">
              {scenario.blastRadius.affectedRoutes.join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((svc) => {
          const isHealthy = svc.status === 'HEALTHY';
          const isDegraded = svc.status === 'DEGRADED';

          return (
            <div
              key={svc.name}
              className={`p-4 rounded-xl border font-mono text-xs transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isHealthy
                  ? 'bg-obsidian-900/80 border-obsidian-800 hover:border-slate-700'
                  : isDegraded
                  ? 'bg-amber-950/20 border-terminal-amber/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-red-950/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{svc.type}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    isHealthy
                      ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'
                      : isDegraded
                      ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {svc.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-terminal-blue shrink-0" />
                  <span className="font-bold text-white truncate text-sm">{svc.name}</span>
                </div>

                <div className="text-[10px] text-slate-400 truncate mb-3">
                  {svc.environment} • {svc.version}
                </div>
              </div>

              <div className="pt-2 border-t border-obsidian-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Latency:</span>
                  <span className={svc.latency > 1000 ? 'text-terminal-amber font-bold' : 'text-slate-200'}>
                    {svc.latency}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Error Rate:</span>
                  <span className={svc.errorRate !== '0.00%' && svc.errorRate !== '0.01%' ? 'text-red-400 font-bold' : 'text-terminal-green'}>
                    {svc.errorRate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

