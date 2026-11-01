import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './hooks/useTheme';
import { Sidebar, Page } from './components/Sidebar';
import { IncidentView } from './views/IncidentView';
import { InvestigationView } from './views/InvestigationView';
import { FixView } from './views/FixView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { Confetti } from './components/Confetti';

export default function App() {
  const sim = useSimulation();
  const { theme, setTheme } = useTheme();
  const [page, setPage] = useState<Page>('incident');

  const isResolved = sim.status === 'RESOLVED';

  return (
    <div className="min-h-screen lg:flex">
      {isResolved && <Confetti />}
      <Sidebar
        page={page}
        onNavigate={setPage}
        theme={theme}
        onSetTheme={setTheme}
        status={sim.status}
        formattedTime={sim.stopwatch.formattedTime}
      />

      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:py-10">
        {page === 'incident' && (
          <IncidentView
            scenarios={sim.scenarios}
            scenario={sim.activeScenario}
            selectedScenarioId={sim.selectedScenarioId}
            onSelectScenario={sim.handleSelectScenario}
            status={sim.status}
            formattedTime={sim.stopwatch.formattedTime}
            elapsedMs={sim.stopwatch.elapsedMs}
            isRollbackApproved={sim.isRollbackApproved}
            onApproveRollback={sim.approveRollback}
            onStart={sim.triggerOutage}
            onReset={sim.resetSimulation}
            onNavigate={setPage}
          />
        )}
        {page === 'investigation' && (
          <InvestigationView
            agents={sim.agents}
            scenario={sim.activeScenario}
            status={sim.status}
            onStart={sim.triggerOutage}
          />
        )}
        {page === 'fix' && (
          <FixView
            scenario={sim.activeScenario}
            status={sim.status}
            activePatchId={sim.activePatchId}
            onSelectPatch={sim.setActivePatchId}
            onStart={sim.triggerOutage}
          />
        )}
        {page === 'history' && <HistoryView />}
        {page === 'settings' && (
          <SettingsView
            theme={theme}
            onSetTheme={setTheme}
            muted={sim.audio.muted}
            onToggleMute={sim.audio.toggleMute}
          />
        )}
      </main>
    </div>
  );
}
