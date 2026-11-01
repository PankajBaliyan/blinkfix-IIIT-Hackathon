import React, { useEffect, useState } from 'react';
import { useIncidents } from './hooks/useIncidents';
import { useTheme } from './hooks/useTheme';
import { useGithub } from './hooks/useGithub';
import { Sidebar, Page } from './components/Sidebar';
import { IncidentView } from './views/IncidentView';
import { InvestigationView } from './views/InvestigationView';
import { FixView } from './views/FixView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  const incidents = useIncidents();
  const { theme, setTheme } = useTheme();
  const github = useGithub();
  // Coming back from GitHub's login, land on Settings so the result is visible.
  const [page, setPage] = useState<Page>(github.loginResult ? 'settings' : 'incident');

  // Keeps "2 min ago" labels fresh. Local clock only, no network.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { list, detail, pinnedId, pinIncident, online, loaded, approve } = incidents;
  const status = detail?.status ?? list[0]?.status ?? 'STANDBY';

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        page={page}
        onNavigate={setPage}
        theme={theme}
        onSetTheme={setTheme}
        status={status}
        incidentId={detail?.id ?? null}
        incidentCount={list.length}
      />

      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:py-10">
        {page === 'incident' && (
          <IncidentView
            list={list}
            detail={detail}
            pinnedId={pinnedId}
            onPick={pinIncident}
            online={online}
            loaded={loaded}
            onApprove={approve}
            onNavigate={setPage}
          />
        )}
        {page === 'investigation' && <InvestigationView detail={detail} />}
        {page === 'fix' && <FixView key={detail?.id ?? 'none'} detail={detail} github={github.status} onOpenSettings={() => setPage('settings')} />}
        {page === 'history' && (
          <HistoryView
            list={list}
            loaded={loaded}
            onOpen={(id) => {
              pinIncident(id);
              setPage('incident');
            }}
          />
        )}
        {page === 'settings' && (
          <SettingsView
            theme={theme}
            onSetTheme={setTheme}
            online={online}
            github={github.status}
            githubResult={github.loginResult}
            onDisconnectGithub={github.disconnect}
          />
        )}
      </main>
    </div>
  );
}
