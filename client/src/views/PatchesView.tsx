import React from 'react';
import {
  Scenario,
  CandidatePatch,
  IncidentStatus,
} from '../types';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  FileCode,
  ShieldCheck,
  Award,
  Cpu,
  Layers,
  GitCompare,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { CodeDiffViewer } from '../components/CodeDiffViewer';

interface PatchesViewProps {
  scenario: Scenario;
  activePatchId: string;
  onSelectPatch: (id: string) => void;
  isResolved: boolean;
  validationProgress: number;
}

export const PatchesView: React.FC<PatchesViewProps> = ({
  scenario,
  activePatchId,
  onSelectPatch,
  isResolved,
  validationProgress,
}) => {
  const patches = scenario.patches;
  const activePatch = patches.find((p) => p.id === activePatchId) || patches[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-obsidian-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/40 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                  Speculative Multi-Patching & AST Validation Lab
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30">
                  5 CONCURRENT CANDIDATES
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                Cerebras synthesizes 5 diverse architectural repair strategies in parallel; automated multi-gate AST test harness scores and isolates the winning fix.
              </p>
            </div>
          </div>

          {/* Validation Progress */}
          <div className="flex items-center gap-3 font-mono text-xs p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800">
            <span className="text-slate-400">AST Gates:</span>
            <div className="w-28 bg-obsidian-800 rounded-full h-2 overflow-hidden border border-obsidian-700">
              <div
                className="bg-terminal-green h-full transition-all duration-300"
                style={{ width: `${validationProgress}%` }}
              />
            </div>
            <span className="text-terminal-green font-bold">{validationProgress}%</span>
          </div>
        </div>

        {/* 4-Gate Validation Pipeline Visualizer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Gate 1: AST Parse</div>
              <div className="text-slate-500 text-[10px]">Valid JS/TS Syntax</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Gate 2: Target File</div>
              <div className="text-slate-500 text-[10px]">Scope match confirmed</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Gate 3: Unit Tests</div>
              <div className="text-slate-500 text-[10px]">3/3 Test cases pass</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Gate 4: Diff Ranking</div>
              <div className="text-slate-500 text-[10px]">Minimal character delta</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Candidate Patch Strategy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {patches.map((patch) => {
          const isSelected = patch.id === activePatchId;
          return (
            <button
              key={patch.id}
              onClick={() => onSelectPatch(patch.id)}
              className={`p-3.5 rounded-xl border text-left font-mono transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-obsidian-850 border-terminal-blue ring-1 ring-terminal-blue/40 shadow-lg'
                  : 'bg-obsidian-900/80 border-obsidian-750 hover:bg-obsidian-850/60 hover:border-slate-700'
              }`}
            >
              {patch.isWinner && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-terminal-green to-terminal-cyan text-obsidian-950 font-black text-[9px] px-2 py-0.5 rounded-bl shadow">
                  WINNER ⭐️
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-white mb-1">
                  {patch.title.split(':')[0]}
                </div>
                <div className="text-[11px] text-terminal-cyan font-semibold truncate mb-1">
                  {patch.strategy}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                  {patch.explanation}
                </p>
              </div>

              <div className="pt-2 border-t border-obsidian-750 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="text-slate-300 font-bold">{(patch.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Validation Score:</span>
                  <span className={patch.validation.score >= 90 ? 'text-terminal-green font-bold' : 'text-slate-400 font-bold'}>
                    {patch.validation.score} / 100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Unit Tests:</span>
                  <span className="text-slate-300">{patch.validation.unitTestsPassed}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Patch Inspection & Code Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Selected Patch Deep Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-obsidian-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500">Inspecting Candidate</span>
              <h3 className="font-mono text-sm font-bold text-white">
                {activePatch.title}
              </h3>
            </div>
            {activePatch.isWinner ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/40">
                PROMOTED FIX
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-obsidian-800 border border-obsidian-700">
                CANDIDATE
              </span>
            )}
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[11px]">Strategy Pattern:</span>
              <p className="text-slate-200 mt-0.5">{activePatch.strategy}</p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px]">Mechanism Explanation:</span>
              <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">{activePatch.explanation}</p>
            </div>

            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-2">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Gate Verification Matrix</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AST Syntax Check:</span>
                  <span className="text-terminal-green font-bold">PASSED (Valid JS AST)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target File Match:</span>
                  <span className="text-terminal-green font-bold">PASSED ({scenario.file})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Unit Test Suite:</span>
                  <span className="text-terminal-cyan font-bold">{activePatch.validation.unitTestsPassed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Diff Line Footprint:</span>
                  <span className="text-slate-300 font-bold">{activePatch.validation.diffLineChange}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-500 text-[11px]">Synthesized Code Block:</span>
              <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 font-mono text-xs text-terminal-green overflow-x-auto leading-relaxed">
                <pre>{activePatch.code}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Unified Code Diff Viewer (7 cols) */}
        <div className="lg:col-span-7">
          <CodeDiffViewer scenario={scenario} />
        </div>
      </div>
    </div>
  );
};

