import React from 'react';
import { Badge, CardHeader, PageTitle, Tone } from '../components/ui';

interface PastIncident {
  id: string;
  title: string;
  service: string;
  when: string;
  seconds: number;
  outcome: 'Fixed automatically' | 'Rolled back' | 'Handed to engineer';
}

// Mock history until the backend serves real records.
const PAST: PastIncident[] = [
  { id: 'INC-0142', title: 'TypeError reading exchangeRate', service: 'checkout-service', when: 'Today, 09:14', seconds: 1.84, outcome: 'Fixed automatically' },
  { id: 'INC-0141', title: 'Stripe gateway timeout', service: 'checkout-service', when: 'Yesterday, 17:52', seconds: 2.31, outcome: 'Rolled back' },
  { id: 'INC-0140', title: 'Null roles on expired guest token', service: 'identity-service', when: 'Yesterday, 11:03', seconds: 1.97, outcome: 'Fixed automatically' },
  { id: 'INC-0139', title: 'Cart total NaN on empty basket', service: 'cart-service', when: '2 days ago', seconds: 2.12, outcome: 'Fixed automatically' },
  { id: 'INC-0138', title: 'Redis connection pool exhausted', service: 'session-service', when: '4 days ago', seconds: 3.4, outcome: 'Handed to engineer' },
  { id: 'INC-0137', title: 'Undefined address on guest checkout', service: 'checkout-service', when: '6 days ago', seconds: 1.76, outcome: 'Fixed automatically' },
];

const outcomeTone: Record<PastIncident['outcome'], Tone> = {
  'Fixed automatically': 'ok',
  'Rolled back': 'accent',
  'Handed to engineer': 'warn',
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="card px-5 py-4">
    <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
);

export const HistoryView: React.FC = () => {
  const avg = PAST.reduce((sum, p) => sum + p.seconds, 0) / PAST.length;
  const fixed = PAST.filter((p) => p.outcome === 'Fixed automatically').length;

  return (
    <div className="space-y-6">
      <PageTitle title="History" subtitle="Past incidents and how quickly each one was handled." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat value={`${avg.toFixed(1)} s`} label="Average time to a tested fix" />
        <Stat value={`${fixed} of ${PAST.length}`} label="Fixed without an engineer writing code" />
        <Stat value={String(PAST.length)} label="Incidents handled this week" />
      </div>

      <section className="card overflow-hidden">
        <CardHeader title="Recent incidents" />
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Incident</th>
                <th className="px-3 py-2.5 font-medium">Service</th>
                <th className="px-3 py-2.5 font-medium">When</th>
                <th className="px-3 py-2.5 text-right font-medium">Time to fix</th>
                <th className="px-5 py-2.5 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PAST.map((p) => (
                <tr key={p.id} className="hover:bg-sunken/60">
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.title}</p>
                    <p className="font-mono text-xs text-faint">{p.id}</p>
                  </td>
                  <td className="px-3 py-3 text-muted">{p.service}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">{p.when}</td>
                  <td className="tabular px-3 py-3 text-right">{p.seconds.toFixed(2)} s</td>
                  <td className="px-5 py-3"><Badge tone={outcomeTone[p.outcome]}>{p.outcome}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
