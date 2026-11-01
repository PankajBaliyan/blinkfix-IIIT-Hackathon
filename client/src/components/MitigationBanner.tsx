import React from 'react';
import {
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitPullRequest,
  Check,
} from 'lucide-react';
import { Scenario } from '../types';

interface MitigationBannerProps {
  scenario: Scenario;
  isApproved: boolean;
  onApprove: () => void;
}

export const MitigationBanner: React.FC<MitigationBannerProps> = ({
  scenario,
  isApproved,
  onApprove,
}) => {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${
      isApproved
        ? 'bg-gradient-to-r from-obsidian-900 via-terminal-green/10 to-obsidian-900 border-terminal-green/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
        : 'bg-gradient-to-r from-obsidian-900 via-amber-950/20 to-obsidian-900 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-fadeIn'
    }`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Mitigation info */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
            isApproved
              ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/40'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
          }`}>
            {isApproved ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                isApproved ? 'text-terminal-green' : 'text-amber-400'
              }`}>
                {isApproved ? 'ROLLBACK AUTHORIZED & EXECUTING' : 'IMMEDIATE MITIGATION RECOMMENDED'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">
                Human-in-the-Loop Gate
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-mono font-bold text-white flex items-center gap-2">
              <span>{scenario.mitigation.action}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {scenario.mitigation.riskLevel} RISK
              </span>
            </h4>

            <p className="text-xs font-mono text-slate-300 max-w-3xl">
              {isApproved
                ? 'Kubelet rolling deployment back to stable replica set. In-flight requests drained safely.'
                : scenario.mitigation.description}
            </p>
          </div>
        </div>

        {/* Right: Human approval button */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          {isApproved ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terminal-green/15 border border-terminal-green/40 text-terminal-green font-mono text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>ROLLBACK APPROVED</span>
            </div>
          ) : (
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-mono text-xs font-bold tracking-wide border border-amber-400/50 shadow-lg shadow-amber-950/40 active:scale-95 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>APPROVE IMMEDIATE ROLLBACK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

