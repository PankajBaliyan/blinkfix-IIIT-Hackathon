import React, { useState } from 'react';
import { useIncidents } from './hooks/useIncidents';
import { useTheme } from './hooks/useTheme';
import { Sidebar, Page } from './components/Sidebar';
import { IncidentView } from './views/IncidentView';
import { InvestigationView } from './views/InvestigationView';
import { FixView } from './views/FixView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  const incidents = useIncidents();
  const { theme, setTheme } = useTheme();
  const [page, setPage] = useState<Page>('incident');

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
        {page === 'fix' && <FixView key={detail?.id ?? 'none'} detail={detail} />}
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
        {page === 'settings' && <SettingsView theme={theme} onSetTheme={setTheme} online={online} />}
      </main>
    </div>
  );
}
