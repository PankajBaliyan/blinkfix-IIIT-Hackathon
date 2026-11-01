import React from 'react';
import { useSimulation } from './hooks/useSimulation';
import { Header } from './components/Header';
import { IncidentCockpit } from './components/IncidentCockpit';
import { AgentSwarmGrid } from './components/AgentSwarmGrid';
import { MitigationBanner } from './components/MitigationBanner';
import { PatchComparison } from './components/PatchComparison';
import { CodeDiffViewer } from './components/CodeDiffViewer';
import { ResolutionHub } from './components/ResolutionHub';
import { Confetti } from './components/Confetti';
import { ShieldCheck, Cpu, GitPullRequest, Activity } from 'lucide-react';

export default function App() {
  const {
    scenarios,
    selectedScenarioId,
    activeScenario,
    status,
    agents,
    isRollbackApproved,
    activePatchId,
    validationProgress,
    stopwatch,
    audio,
    handleSelectScenario,
    triggerOutage,
    resetSimulation,
    approveRollback,
    setActivePatchId,
  } = useSimulation();

  const isResolved = status === 'RESOLVED';
  const showMitigation = status === 'MITIGATION_READY' || status === 'SPECULATIVE_REPAIR' || status === 'VALIDATING' || isResolved;
  const showRepair = status === 'SPECULATIVE_REPAIR' || status === 'VALIDATING' || isResolved;

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col font-sans selection:bg-terminal-blue/30 selection:text-white">
      {/* Confetti Celebration on Recovery */}
      {isResolved && <Confetti />}

      {/* Top Navbar */}
      <Header
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        status={status}
        activeScenario={activeScenario}
        onTrigger={triggerOutage}
        onReset={resetSimulation}
        muted={audio.muted}
        onToggleMute={audio.toggleMute}
      />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-6">
        {/* Incident Alert & T-Zero Stopwatch */}
        <IncidentCockpit
          scenario={activeScenario}
          status={status}
          formattedTime={stopwatch.formattedTime}
          elapsedMs={stopwatch.elapsedMs}
        />

        {/* 5-Agent Swarm Terminal Grid */}
        <AgentSwarmGrid agents={agents} />

        {/* Mitigation & Human Rollback Approval Banner */}
        {showMitigation && (
          <MitigationBanner
            scenario={activeScenario}
            isApproved={isRollbackApproved}
            onApprove={approveRollback}
          />
        )}

        {/* Speculative Multi-Patching & Candidate Validation */}
        {showRepair && (
          <PatchComparison
            patches={activeScenario.patches}
            activePatchId={activePatchId}
            onSelectPatch={setActivePatchId}
            isResolved={isResolved}
            validationProgress={validationProgress}
          />
        )}

        {/* Unified Code Diff Viewer & Resolution Output Hub */}
        {isResolved && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            {/* Code Diff (6 cols) */}
            <div className="lg:col-span-6">
              <CodeDiffViewer scenario={activeScenario} />
            </div>

            {/* GitHub PR & Slack Notification (6 cols) */}
            <div className="lg:col-span-6">
              <ResolutionHub
                scenario={activeScenario}
                elapsedMs={stopwatch.elapsedMs}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-obsidian-800 bg-obsidian-900/80 px-4 sm:px-6 py-3 mt-auto">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-terminal-green inline-block"></span>
              <span>All Systems Operational</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>Cluster: <code className="text-slate-300">us-east-1-k8s-prod</code></span>
            <span className="text-slate-600">|</span>
            <span>Inference: <code className="text-terminal-cyan">Cerebras CS-3 (Sub-second LLM)</code></span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-500">Blinkfix // Swarm Zero</span>
            <span className="px-1.5 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-[10px] text-slate-300">
              v1.0.4-prod
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

