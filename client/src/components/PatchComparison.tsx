import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  FileCode,
  ShieldCheck,
  Award,
  Cpu,
  Layers,
} from 'lucide-react';
import { CandidatePatch } from '../types';

interface PatchComparisonProps {
  patches: CandidatePatch[];
  activePatchId: string;
  onSelectPatch: (id: string) => void;
  isResolved: boolean;
  validationProgress: number;
}

export const PatchComparison: React.FC<PatchComparisonProps> = ({
  patches,
  activePatchId,
  onSelectPatch,
  isResolved,
  validationProgress,
}) => {
  const activePatch = patches.find((p) => p.id === activePatchId) || patches[0];

  return (
    <section className="rounded-xl border border-obsidian-750 bg-obsidian-900/80 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-obsidian-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <span>Speculative Multi-Patching & Repair Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30">
                5 Concurrent Strategies
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Cerebras generates 5 distinct repair approaches concurrently; automated AST gates select the optimal fix.
            </p>
          </div>
        </div>

        {/* Validation Progress Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Validation Pipeline:</span>
          <div className="w-24 bg-obsidian-800 rounded-full h-2 overflow-hidden border border-obsidian-700">
            <div
              className="bg-terminal-green h-full transition-all duration-300"
              style={{ width: `${validationProgress}%` }}
            />
          </div>
          <span className="text-terminal-green font-semibold">{validationProgress}%</span>
        </div>
      </div>

      {/* Tabs for Candidate Patches */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {patches.map((patch) => {
          const isSelected = patch.id === activePatchId;
          return (
            <button
              key={patch.id}
              onClick={() => onSelectPatch(patch.id)}
              className={`p-2.5 rounded-lg border text-left font-mono text-xs transition relative overflow-hidden ${
                isSelected
                  ? 'bg-obsidian-800 border-terminal-blue/60 ring-1 ring-terminal-blue/30 shadow-md'
                  : 'bg-obsidian-850/60 border-obsidian-750 hover:bg-obsidian-800/60 hover:border-slate-700'
              }`}
            >
              {patch.isWinner && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-terminal-green to-terminal-cyan text-obsidian-950 font-black text-[9px] px-1.5 py-0.5 rounded-bl">
                  WINNER ⭐️
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1">
                <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {patch.title.split(':')[0]}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 truncate mb-1">
                {patch.strategy}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-obsidian-750">
                <span>Conf: {(patch.confidence * 100).toFixed(0)}%</span>
                <span className={patch.validation.score >= 90 ? 'text-terminal-green font-bold' : 'text-slate-400'}>
                  Score: {patch.validation.score}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Patch Inspection Detail */}
      {activePatch && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-obsidian-950/70 rounded-lg p-3.5 border border-obsidian-800">
          {/* Left: Code Snippet (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-terminal-cyan" />
                <span>Generated Fix ({activePatch.strategy}):</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Diff: {activePatch.validation.diffLineChange}
              </span>
            </div>

            <div className="p-3 bg-obsidian-950 rounded border border-obsidian-800 font-mono text-xs text-slate-200 overflow-x-auto">
              <pre className="text-terminal-green leading-relaxed">
                <code>{activePatch.code}</code>
              </pre>
            </div>

            <p className="text-xs font-mono text-slate-400">
              <span className="text-slate-500 font-semibold">Explanation: </span>
              {activePatch.explanation}
            </p>
          </div>

          {/* Right: Validation Gates Checklist (5 cols) */}
          <div className="lg:col-span-5 bg-obsidian-900/80 rounded border border-obsidian-750 p-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-terminal-green" />
                <span>Automated Validation Gates</span>
              </span>

              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-850/80 border border-obsidian-800">
                  <span className="text-slate-300">1. Target File Verified:</span>
                  <span className="text-terminal-green flex items-center gap-1 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> MATCH
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-850/80 border border-obsidian-800">
                  <span className="text-slate-300">2. AST Syntax Parse:</span>
                  <span className="text-terminal-green flex items-center gap-1 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> CLEAN AST
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-850/80 border border-obsidian-800">
                  <span className="text-slate-300">3. Regression Unit Tests:</span>
                  <span className={activePatch.validation.unitTestsPassed.includes('passing') ? 'text-terminal-green flex items-center gap-1 text-[11px] font-bold' : 'text-terminal-red flex items-center gap-1 text-[11px] font-bold'}>
                    {activePatch.validation.unitTestsPassed.includes('passing') ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {activePatch.validation.unitTestsPassed}
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-850/80 border border-obsidian-800">
                  <span className="text-slate-300">4. Minimality & Heuristic Score:</span>
                  <span className="text-terminal-cyan font-bold text-xs">
                    {activePatch.validation.score}/100
                  </span>
                </div>
              </div>
            </div>

            {activePatch.isWinner && (
              <div className="mt-2 p-2 rounded bg-terminal-green/10 border border-terminal-green/30 flex items-center gap-2">
                <Award className="w-4 h-4 text-terminal-green shrink-0" />
                <span className="text-[11px] font-mono text-terminal-green font-bold">
                  DESIGNATED WINNING PATCH — SUBMITTED TO GITHUB PR
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

