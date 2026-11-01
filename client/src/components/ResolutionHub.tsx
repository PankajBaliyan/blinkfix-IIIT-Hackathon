import React, { useState } from 'react';
import {
  GitPullRequest,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  CheckCircle2,
  Clock,
  Zap,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { Scenario } from '../types';

interface ResolutionHubProps {
  scenario: Scenario;
  elapsedMs: number;
}

export const ResolutionHub: React.FC<ResolutionHubProps> = ({
  scenario,
  elapsedMs,
}) => {
  const [prCopied, setPrCopied] = useState(false);
  const prNumber = 105;
  const prUrl = `https://github.com/swarm-zero-demo/${scenario.service}/pull/${prNumber}`;
  const branchName = `swarm-zero/fix/incident-001`;

  const handleCopyPr = () => {
    navigator.clipboard.writeText(prUrl);
    setPrCopied(true);
    setTimeout(() => setPrCopied(false), 2000);
  };

  const mttrSeconds = (elapsedMs / 1000).toFixed(2);

  return (
    <section className="space-y-4">
      {/* GitHub PR Card */}
      <div className="rounded-xl border border-terminal-green/50 bg-gradient-to-br from-obsidian-900 via-obsidian-900 to-terminal-green/10 p-5 shadow-[0_0_25px_rgba(16,185,129,0.15)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-obsidian-750 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-terminal-green/20 text-terminal-green border border-terminal-green/40 shadow-inner">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/40">
                  VERIFIED DRAFT PR #105 OPENED
                </span>
                <span className="text-xs font-mono text-slate-400">
                  MTTR: <span className="text-terminal-green font-bold">{mttrSeconds}s</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-mono font-bold text-white mt-1">
                [Swarm Zero] Automated fix for {scenario.errorName} in {scenario.file}
              </h3>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyPr}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 font-mono text-xs transition border border-obsidian-700"
            >
              {prCopied ? <Check className="w-3.5 h-3.5 text-terminal-green" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{prCopied ? 'URL Copied' : 'Copy PR URL'}</span>
            </button>

            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-green hover:bg-emerald-400 text-obsidian-950 font-mono text-xs font-bold transition shadow-lg shadow-terminal-green/20"
            >
              <span>View Draft PR on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* PR Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-obsidian-950/70 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Base & Branch</span>
            <div className="text-slate-200 flex items-center gap-1.5 truncate">
              <GitBranch className="w-3.5 h-3.5 text-terminal-cyan shrink-0" />
              <span className="truncate">{branchName}</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-obsidian-950/70 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Identified Root Cause</span>
            <div className="text-slate-200 truncate">
              Commit <code className="text-terminal-purple">{scenario.culpritCommit.hash}</code> (PR #{scenario.culpritCommit.prNumber})
            </div>
          </div>

          <div className="p-2.5 rounded bg-obsidian-950/70 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Verification Status</span>
            <div className="text-terminal-green flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AST Clean & Unit Tests Passing</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-obsidian-950/70 border border-obsidian-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Automated Pipeline Time</span>
            <div className="text-terminal-green font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{mttrSeconds}s Total Closed-Loop MTTR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slack Broadcast Notification Card */}
      <div className="rounded-xl border border-obsidian-750 bg-obsidian-900/80 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <MessageSquare className="w-4 h-4 text-terminal-purple" />
          <span className="text-slate-300 font-bold uppercase tracking-wide">
            Automated Slack Broadcast (#incident-war-room)
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-500">Block Kit Webhook Ingested in 18ms</span>
        </div>

        {/* Mini Slack Message Preview */}
        <div className="p-3.5 rounded-lg bg-obsidian-950 border border-obsidian-800 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-terminal-blue/30 text-terminal-blue flex items-center justify-center font-bold text-[10px]">
              BF
            </div>
            <span className="font-bold text-white">Blinkfix SRE Bot</span>
            <span className="text-[10px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">APP</span>
            <span className="text-[10px] text-slate-500">just now</span>
          </div>

          <p className="text-slate-200">
            🚨 <span className="font-bold text-red-400">{scenario.blastRadius.severity}</span> in <code className="text-terminal-cyan">{scenario.service}</code> auto-remediated in <span className="text-terminal-green font-bold">{mttrSeconds}s</span>.
          </p>

          <div className="border-l-2 border-terminal-green pl-3 space-y-1 text-slate-300 text-[11px]">
            <div>• <span className="text-slate-400">Error:</span> {scenario.errorMessage}</div>
            <div>• <span className="text-slate-400">File:</span> {scenario.file}:{scenario.line}</div>
            <div>• <span className="text-slate-400">Culprit Commit:</span> {scenario.culpritCommit.hash} by {scenario.culpritCommit.author}</div>
            <div>• <span className="text-slate-400">Remediation:</span> Draft PR #{prNumber} opened on GitHub.</div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-terminal-blue/20 hover:bg-terminal-blue/30 text-terminal-blue text-[11px] font-bold border border-terminal-blue/40 transition"
            >
              Review PR #{prNumber} ↗
            </a>
            <span className="px-2.5 py-1 rounded bg-obsidian-850 text-slate-400 text-[11px] border border-obsidian-750">
              Rollback Action Staged
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

