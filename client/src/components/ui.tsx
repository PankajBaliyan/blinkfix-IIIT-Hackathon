import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { IncidentStatus } from '../types';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({
  tone = 'neutral',
  children,
}) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
  >
    {children}
  </span>
);

export const PageTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({
  title,
  subtitle,
  right,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 max-w-prose text-sm text-muted">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const CardHeader: React.FC<{ title: string; hint?: string; right?: React.ReactNode }> = ({
  title,
  hint,
  right,
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
    <div className="min-w-0">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
    {right}
  </div>
);

/** Label above a value. Used for small facts like "Service" or "Environment". */
export const Fact: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className={`mt-0.5 truncate text-sm ${mono ? 'font-mono' : 'font-medium'}`}>{children}</dd>
  </div>
);

/** A pass / fail / running glyph for checks. */
export const CheckIcon: React.FC<{ state: 'pass' | 'fail' | 'running' }> = ({ state }) => {
  if (state === 'running') {
    return <Loader2 size={16} className="animate-spin text-accent motion-reduce:animate-none" aria-label="Running" />;
  }
  return state === 'pass' ? (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok-soft text-ok" aria-label="Passed">
      <Check size={13} strokeWidth={3} />
    </span>
  ) : (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bad-soft text-bad" aria-label="Failed">
      <X size={13} strokeWidth={3} />
    </span>
  );
};

export const EmptyState: React.FC<{
  title: string;
  body: string;
  action?: React.ReactNode;
}> = ({ title, body, action }) => (
  <div className="card flex flex-col items-center px-6 py-14 text-center">
    <h2 className="text-base font-semibold">{title}</h2>
    <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Plain-language status used across the app. */
export function statusInfo(status: IncidentStatus): { label: string; tone: Tone; detail: string } {
  switch (status) {
    case 'STANDBY':
      return { label: 'No incidents yet', tone: 'neutral', detail: 'Blinkfix is watching the service. A crash will appear here as it happens.' };
    case 'TRIGGERED':
      return { label: 'Crash detected', tone: 'bad', detail: 'A crash report just arrived. Starting the investigation.' };
    case 'AGENTS_ACTIVE':
      return { label: 'Investigating', tone: 'warn', detail: 'Five agents are looking at the crash at the same time.' };
    case 'MITIGATION_READY':
      return { label: 'Rollback ready', tone: 'warn', detail: 'A safe rollback is ready for your approval.' };
    case 'SPECULATIVE_REPAIR':
      return { label: 'Building fixes', tone: 'accent', detail: 'Writing several different candidate fixes.' };
    case 'VALIDATING':
      return { label: 'Testing fixes', tone: 'accent', detail: 'Checking each fix and picking the safest one.' };
    case 'RESOLVED':
      return { label: 'Fix ready for review', tone: 'ok', detail: 'A tested fix is open as a draft pull request.' };
    case 'FAILED':
      return { label: 'Needs attention', tone: 'bad', detail: 'No automatic fix passed the checks. An engineer should take over.' };
  }
}

/** Position of the incident in the six-stage flow. -1 means not started; 6 means finished. */
export function stageIndex(status: IncidentStatus): number {
  switch (status) {
    case 'STANDBY': return -1;
    case 'TRIGGERED': return 0;
    case 'AGENTS_ACTIVE': return 1;
    case 'MITIGATION_READY': return 2;
    case 'SPECULATIVE_REPAIR': return 3;
    case 'VALIDATING': return 4;
    case 'RESOLVED': return 6;
    case 'FAILED': return 4;
  }
}
