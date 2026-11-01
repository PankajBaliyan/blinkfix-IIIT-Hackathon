import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  ExternalLink,
  GitPullRequest,
  Clock,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { Scenario } from '../types';

interface HistoryViewProps {
  scenario: Scenario;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ scenario }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const historyData = [
    {
      id: 'INC-2026-104',
      service: 'checkout-service',
      severity: 'P0',
      error: "TypeError: Cannot read properties of undefined (reading 'exchangeRate')",
      mttr: '1.84s',
      culprit: 'abc104 (alex@company.com)',
      patchStrategy: 'ES6 Optional Chaining & Nullish Coalesce',
      pr: '#105',
      status: 'RESOLVED',
      timestamp: 'Just now',
    },
    {
      id: 'INC-2026-102',
      service: 'checkout-service',
      severity: 'P0',
      error: 'StripeConnectionError: Connection to api.stripe.com timed out after 5000ms',
      mttr: '1.92s',
      culprit: 'abc102 (devops-bot)',
      patchStrategy: 'Dual-Rail Adyen Payment Failover',
      pr: '#103',
      status: 'RESOLVED',
      timestamp: '2 hours ago',
    },
    {
      id: 'INC-2026-098',
      service: 'identity-service',
      severity: 'P1',
      error: "TypeError: Cannot read properties of null (reading 'roles')",
      mttr: '1.78s',
      culprit: 'abc108 (jordan@company.com)',
      patchStrategy: 'Safe Claims Extraction & Empty Array Fallback',
      pr: '#109',
      status: 'RESOLVED',
      timestamp: 'Yesterday at 16:42',
    },
    {
      id: 'INC-2026-091',
      service: 'cart-service',
      severity: 'P1',
      error: 'RangeError: Invalid array length on deserialization',
      mttr: '2.14s',
      culprit: 'def882 (sam@company.com)',
      patchStrategy: 'Bounded Array Allocation Guard',
      pr: '#92',
      status: 'RESOLVED',
      timestamp: '3 days ago',
    },
    {
      id: 'INC-2026-085',
      service: 'notification-worker',
      severity: 'P2',
      error: 'ConnectionPoolTimeout: Redis client pool exhausted',
      mttr: '2.40s',
      culprit: 'ghi419 (pat@company.com)',
      patchStrategy: 'Auto-Release Connection Interceptor',
      pr: '#86',
      status: 'RESOLVED',
      timestamp: '5 days ago',
    },
  ];

  const filteredHistory = historyData.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.error.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.culprit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterSeverity === 'ALL' || item.severity === filterSeverity;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-terminal-purple" />
            <h2 className="font-mono text-base sm:text-lg font-bold text-white">
              Incident Remediation Audit Log & MTTR Analytics
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-purple/20 text-terminal-purple border border-terminal-purple/30">
              SRE COMPLIANCE
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Immutable audit trail of all closed-loop incidents handled by Blinkfix // Swarm Zero with benchmark comparisons.
          </p>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Incidents Remediated</span>
            <div className="text-xl font-bold text-white">148</div>
            <div className="text-terminal-green text-[10px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% Closed Loop</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Mean Time To Recovery</span>
            <div className="text-xl font-bold text-terminal-green">1.84s</div>
            <div className="text-terminal-cyan text-[10px] flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>99.9% vs manual SRE (42m)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">AST Patch Pass Rate</span>
            <div className="text-xl font-bold text-terminal-cyan">98.6%</div>
            <div className="text-slate-400 text-[10px]">Zero regressions opened</div>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Engine Throughput</span>
            <div className="text-xl font-bold text-terminal-purple">1,020 t/s</div>
            <div className="text-slate-400 text-[10px]">Cerebras Llama 3.3 70B</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search incident ID, service, error signature, culprit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-obsidian-900 border border-obsidian-750 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-terminal-blue/60 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-xs">Severity:</span>
          {['ALL', 'P0', 'P1', 'P2'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded text-xs transition ${
                filterSeverity === sev
                  ? 'bg-terminal-blue text-obsidian-950 font-bold'
                  : 'bg-obsidian-850 text-slate-400 hover:text-white border border-obsidian-750'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-obsidian-750 bg-obsidian-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-obsidian-950/80 border-b border-obsidian-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Target Service</th>
                <th className="py-3 px-4">Error Signature</th>
                <th className="py-3 px-4">MTTR</th>
                <th className="py-3 px-4">Culprit Commit</th>
                <th className="py-3 px-4">Verified PR</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800/60">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-obsidian-850/50 transition">
                  <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                    {item.id}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.severity === 'P0'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : item.severity === 'P1'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    }`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-semibold whitespace-nowrap">
                    {item.service}
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={item.error}>
                    {item.error}
                  </td>
                  <td className="py-3 px-4 text-terminal-green font-bold whitespace-nowrap">
                    {item.mttr}
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    <code className="text-terminal-purple">{item.culprit}</code>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-terminal-cyan hover:underline cursor-pointer">
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>PR {item.pr}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-right whitespace-nowrap">
                    {item.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

