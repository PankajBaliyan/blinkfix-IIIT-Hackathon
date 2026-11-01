import React from 'react';
import { IncidentStatus, IncidentSummary } from '../types';
import { Badge, CardHeader, EmptyState, PageTitle, Tone } from '../components/ui';
import { clockTime, seconds, timeAgo } from '../lib/format';

interface HistoryViewProps {
  list: IncidentSummary[];
  loaded: boolean;
  onOpen: (id: string) => void;
}

function outcome(i: IncidentSummary): { label: string; tone: Tone } {
  const status: IncidentStatus = i.status;
  if (status === 'RESOLVED') {
    return i.rollbackApproved
      ? { label: 'Fix ready, action approved', tone: 'ok' }
      : { label: 'Fix ready for review', tone: 'ok' };
  }
  if (status === 'FAILED') return { label: 'Needs an engineer', tone: 'bad' };
  return { label: 'In progress', tone: 'accent' };
}

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="card px-5 py-4">
    <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
);

export const HistoryView: React.FC<HistoryViewProps> = ({ list, loaded, onOpen }) => {
  const resolved = list.filter((i) => i.status === 'RESOLVED');
  const avgMs = resolved.length ? resolved.reduce((sum, i) => sum + i.durationMs, 0) / resolved.length : 0;

  return (
    <div className="space-y-6">
      <PageTitle title="History" subtitle="Every incident Blinkfix has handled, and how quickly each one was fixed." />

      {loaded && list.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          body="Incidents are saved here as soon as the service crashes. Trigger one from the Incident page."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat value={resolved.length ? seconds(avgMs) : 'None yet'} label="Average time to a proposed fix" />
            <Stat value={`${resolved.length} of ${list.length}`} label="Incidents with a fix ready" />
            <Stat value={String(list.length)} label="Incidents recorded" />
          </div>

          <section className="card overflow-hidden">
            <CardHeader title="Incidents" hint="Newest first. Select one to open it." />
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium">Incident</th>
                    <th className="px-3 py-2.5 font-medium">Request</th>
                    <th className="px-3 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 text-right font-medium">Time to fix</th>
                    <th className="px-5 py-2.5 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((i) => {
                    const o = outcome(i);
                    return (
                      <tr key={i.id} className="hover:bg-sunken/60">
                        <td className="px-5 py-3">
                          <button className="text-left" onClick={() => onOpen(i.id)}>
                            <span className="block font-medium text-accent hover:underline">{i.errorType} in {i.service}</span>
                            <span className="block font-mono text-xs text-faint">{i.id}</span>
                          </button>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted">{i.method ? `${i.method} ` : ''}{i.route ?? '-'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted">
                          {timeAgo(i.createdAt)}
                          <span className="block text-xs text-faint">{clockTime(i.createdAt)}</span>
                        </td>
                        <td className="tabular px-3 py-3 text-right">{i.status === 'RESOLVED' ? seconds(i.durationMs) : '-'}</td>
                        <td className="px-5 py-3"><Badge tone={o.tone}>{o.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
