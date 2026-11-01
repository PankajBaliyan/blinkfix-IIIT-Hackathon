import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './hooks/useTheme';
import { Sidebar, NavPage } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { CockpitView } from './views/CockpitView';
import { AgentsView } from './views/AgentsView';
import { PatchesView } from './views/PatchesView';
import { ResolutionView } from './views/ResolutionView';
import { TopologyView } from './views/TopologyView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { Confetti } from './components/Confetti';

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

  const { theme, toggleTheme, setTheme } = useTheme();

  const [currentPage, setCurrentPage] = useState<NavPage>('cockpit');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isResolved = status === 'RESOLVED';

  const renderActiveView = () => {
    switch (currentPage) {
      case 'cockpit':
        return (
          <CockpitView
            scenario={activeScenario}
            status={status}
            agents={agents}
            formattedTime={stopwatch.formattedTime}
            elapsedMs={stopwatch.elapsedMs}
            isRollbackApproved={isRollbackApproved}
            onApproveRollback={approveRollback}
            onNavigate={setCurrentPage}
          />
        );

      case 'agents':
        return (
          <AgentsView
            agents={agents}
            scenario={activeScenario}
            status={status}
          />
        );

      case 'patches':
        return (
          <PatchesView
            scenario={activeScenario}
            activePatchId={activePatchId}
            onSelectPatch={setActivePatchId}
            isResolved={isResolved}
            validationProgress={validationProgress}
          />
        );

      case 'resolution':
        return (
          <ResolutionView
            scenario={activeScenario}
            status={status}
            elapsedMs={stopwatch.elapsedMs}
          />
        );

      case 'topology':
        return (
          <TopologyView
            scenario={activeScenario}
            status={status}
          />
        );

      case 'history':
        return (
          <HistoryView
            scenario={activeScenario}
          />
        );

      case 'settings':
        return (
          <SettingsView
            scenario={activeScenario}
            muted={audio.muted}
            onToggleMute={audio.toggleMute}
            theme={theme}
            onSetTheme={setTheme}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex font-sans selection:bg-terminal-blue/30 selection:text-white transition-colors duration-200">
      {/* Confetti celebration on recovery */}
      {isResolved && <Confetti />}

      {/* Modern Collapsible & Responsive Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        status={status}
        activeScenario={activeScenario}
        elapsedMs={stopwatch.elapsedMs}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar
          currentPage={currentPage}
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={handleSelectScenario}
          status={status}
          activeScenario={activeScenario}
          elapsedMs={stopwatch.elapsedMs}
          formattedTime={stopwatch.formattedTime}
          onTrigger={triggerOutage}
          onReset={resetSimulation}
          muted={audio.muted}
          onToggleMute={audio.toggleMute}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* View Content Space */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-[1720px] w-full mx-auto space-y-6">
          {renderActiveView()}
        </main>

        {/* Global Footer Status Bar */}
        <footer className="border-t border-obsidian-800/80 bg-obsidian-900/60 px-4 sm:px-6 py-2.5 mt-auto text-xs font-mono text-slate-400">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-terminal-green inline-block" />
                <span>Cluster Nominal: <code className="text-white">us-east-1-k8s-prod</code></span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="hidden md:inline">
                Inference: <code className="text-terminal-cyan font-bold">Cerebras CS-3 // Llama 3.3 70B</code>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">Blinkfix // Swarm Zero</span>
              <span className="px-1.5 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-[10px] text-slate-300">
                v1.0.4-prod
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
