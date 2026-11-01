import React, { useState } from 'react';
import { Check, GitPullRequest, Loader2, MessageSquare, Undo2 } from 'lucide-react';
import { IncidentDetail, IncidentSummary } from '../types';
import { Page } from '../components/Sidebar';
import { Stepper } from '../components/Stepper';
import { SourceView } from '../components/SourceView';
import { TriggerHelp } from '../components/TriggerHelp';
import { Badge, CardHeader, Fact, PageTitle, statusInfo } from '../components/ui';
import { isActive } from '../hooks/useIncidents';
import { API_BASE } from '../services/incident.api';
import { clockTime, logTime, seconds, timeAgo } from '../lib/format';

interface IncidentViewProps {
  list: IncidentSummary[];
  detail: IncidentDetail | null;
  pinnedId: string | null;
  onPick: (id: string | null) => void;
  online: boolean;
  loaded: boolean;
  onApprove: () => Promise<void>;
  onNavigate: (page: Page) => void;
}

const riskTone = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad' } as const;
const levelClass: Record<string, string> = {
  ERROR: 'text-bad',
  WARNING: 'text-warn',
  INFO: 'text-muted',
};

const incidentLabel = (i: IncidentSummary) =>
  `${i.errorType} on ${i.route ?? i.service}, ${timeAgo(i.createdAt)}`;

export const IncidentView: React.FC<IncidentViewProps> = ({
  list,
  detail,
  pinnedId,
  onPick,
  online,
  loaded,
  onApprove,
  onNavigate,
}) => {
  const [approving, setApproving] = useState(false);

  const picker = list.length > 0 && (
    <>
      <label className="sr-only" htmlFor="incident-picker">Incident</label>
      <select
        id="incident-picker"
        value={pinnedId ?? 'latest'}
        onChange={(e) => onPick(e.target.value === 'latest' ? null : e.target.value)}
        className="btn max-w-[300px] truncate pr-8"
      >
        <option value="latest">Newest incident</option>
        {list.map((i) => (
          <option key={i.id} value={i.id}>{incidentLabel(i)}</option>
        ))}
      </select>
    </>
  );

  const offline = loaded && !online && (
    <div role="alert" className="rounded-lg border border-line bg-bad-soft px-5 py-4 text-sm">
      <p className="font-semibold text-bad">Can't reach the Blinkfix API</p>
      <p className="mt-1 text-muted">
        Nothing is answering at <span className="font-mono">{API_BASE}</span>. Start the server with{' '}
        <span className="font-mono">python run.py</span> in the <span className="font-mono">server</span> folder.
      </p>
    </div>
  );

  // Nothing yet: either still loading, or no crash has happened.
  if (!detail) {
    return (
      <div className="space-y-6">
        <PageTitle title="Incident" subtitle="Live crashes from your service, from first alert to a proposed fix." right={picker || undefined} />
        {offline}
        {!loaded && <p className="text-sm text-muted">Loading incidents…</p>}
        {loaded && online && list.length === 0 && (
          <section className="card">
            <CardHeader
              title="No incidents yet"
              hint="Blinkfix is watching the demo service. Make it crash with any command below and the incident appears here within a second or two."
            />
            <TriggerHelp />
          </section>
        )}
        {loaded && online && list.length > 0 && <p className="text-sm text-muted">Loading incident…</p>}
      </div>
    );
  }

  const info = statusInfo(detail.status);
  const active = isActive(detail.status);
  const resolved = detail.status === 'RESOLVED';
  const failed = detail.status === 'FAILED';
  const showMitigation = detail.mitigation !== null;
  const prNumber = detail.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  const severity = detail.impact?.severity;

  const approve = async () => {
    setApproving(true);
    try {
      await onApprove();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Incident"
        subtitle="Live crashes from your service, from first alert to a proposed fix."
        right={picker || undefined}
      />
      {offline}

      {/* Progress: status, time and the six stages */}
      <section className="card p-5" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={info.tone}>{info.label}</Badge>
              <span className="font-mono text-xs text-muted">{detail.id}</span>
              <span className="text-xs text-muted">{timeAgo(detail.createdAt)}</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted">{info.detail}</p>
          </div>
          <div className="text-right">
            {active ? (
              <div className="flex h-12 items-center justify-end gap-2 text-muted">
                <Loader2 size={22} className="animate-spin motion-reduce:animate-none" />
                <span className="text-xl font-medium">Working</span>
              </div>
            ) : (
              <div className="tabular font-mono text-4xl font-medium tracking-tight sm:text-5xl">
                {failed ? 'No fix' : seconds(detail.durationMs)}
              </div>
            )}
            <p className="mt-1 text-xs text-muted">
              {active ? 'Investigation in progress' : failed ? 'Needs an engineer' : 'From crash to a proposed fix'}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Stepper status={detail.status} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* What happened */}
        <section className="card min-w-0">
          <CardHeader
            title="What happened"
            hint={`${detail.service}${detail.environment ? ` in ${detail.environment}` : ''}`}
            right={severity ? <Badge tone="bad">{severity.split(' - ').map((s, i) => (i === 1 ? s.toLowerCase() : s)).join(' ')}</Badge> : undefined}
          />
          <div className="space-y-5 p-5">
            <div>
              <p className="font-mono text-sm font-medium text-bad">{detail.error.type}</p>
              <p className="mt-1 break-words font-mono text-sm text-muted">{detail.error.message}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Failing code" mono>{detail.error.file.split('/').pop()}:{detail.error.line}</Fact>
              <Fact label="Function" mono>{detail.error.function ?? 'unknown'}()</Fact>
              <Fact label="Request" mono>{detail.error.method} {detail.error.route}</Fact>
              <Fact label="Request ID" mono>{detail.error.requestId ?? 'none'}</Fact>
              {detail.culprit && (
                <>
                  <Fact label="Introduced by">PR #{detail.culprit.pr_number}</Fact>
                  <Fact label="Author">{detail.culprit.author}</Fact>
                </>
              )}
              {detail.impact && (
                <>
                  <Fact label="Area affected">{detail.impact.scope}</Fact>
                  <Fact label="Users affected">{detail.impact.impact_percentage}</Fact>
                </>
              )}
            </dl>
            {detail.source && (
              <div>
                <p className="mb-2 text-xs text-muted">Failing code in <span className="font-mono">{detail.source.file}</span></p>
                <SourceView source={detail.source} />
              </div>
            )}
            <button className="text-sm font-medium text-accent hover:underline" onClick={() => onNavigate('investigation')}>
              See how each agent reached this
            </button>
          </div>
        </section>

        {/* Recommended action */}
        <section className="card min-w-0 self-start">
          <CardHeader
            title="Recommended action"
            hint="Stop the damage now while the permanent fix is built."
            right={detail.mitigation ? <Badge tone={riskTone[detail.mitigation.risk_level]}>{detail.mitigation.risk_level.toLowerCase()} risk</Badge> : undefined}
          />
          <div className="p-5">
            {!showMitigation ? (
              <p className="text-sm text-muted">
                {failed ? 'No recommendation was produced.' : 'The agents are still working. A recommendation will appear here in a moment.'}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <Undo2 size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{detail.mitigation!.action}</p>
                    <p className="mt-1 text-sm text-muted">{detail.mitigation!.description}</p>
                  </div>
                </div>
                {detail.rollbackApproved ? (
                  <div className="flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2.5 text-sm font-medium text-ok">
                    <Check size={16} strokeWidth={3} /> Approved and recorded.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn btn-primary" onClick={approve} disabled={approving}>
                      {approving ? 'Approving…' : 'Approve action'}
                    </button>
                    <span className="text-xs text-muted">Nothing changes in production until you approve.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Logs the webhook fetched from the service */}
      <section className="card">
        <CardHeader
          title="Service logs"
          hint={`Fetched from ${detail.service} when it crashed. Lines from the failing request are highlighted.`}
        />
        {detail.logs.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No logs were captured for this incident.</p>
        ) : (
          <div className="scroll-slim overflow-x-auto py-2 font-mono text-xs leading-6">
            {detail.logs.map((row, i) => {
              const mine = row.requestId !== null && row.requestId === detail.error.requestId;
              return (
                <div key={i} className={`flex min-w-max gap-3 px-5 ${mine ? 'bg-accent-soft' : ''}`}>
                  <span className="shrink-0 text-faint">{logTime(row.ts)}</span>
                  <span className={`w-14 shrink-0 font-medium ${levelClass[row.level] ?? 'text-muted'}`}>{row.level}</span>
                  <span className="w-20 shrink-0 text-faint">{row.requestId ?? '-'}</span>
                  <span className={mine ? 'text-ink' : 'text-muted'}>{row.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {resolved && (
        <section className="card">
          <CardHeader
            title="Result"
            hint={detail.demoMode ? 'Demo mode: the pull request and Slack message are simulated.' : 'A person still reviews and merges the fix.'}
          />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div className="flex gap-3">
              <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Draft pull request{prNumber ? ` #${prNumber}` : ''}</p>
                <p className="mt-0.5 text-sm text-muted">Opened with the best-scoring of {detail.patches.length} candidate fixes.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MessageSquare size={18} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Team notified in Slack</p>
                <p className="mt-0.5 text-sm text-muted">Includes the cause, the author and a link to the pull request.</p>
              </div>
            </div>
            <div>
              <p className="tabular text-sm font-semibold">{seconds(detail.durationMs)}</p>
              <p className="mt-0.5 text-sm text-muted">From crash to a proposed fix, finished at {clockTime(detail.createdAt)}.</p>
            </div>
          </div>
          <div className="border-t border-line px-5 py-3.5">
            <button className="btn btn-primary" onClick={() => onNavigate('fix')}>Review the fix</button>
          </div>
        </section>
      )}

      {failed && (
        <section className="card">
          <CardHeader title="Needs an engineer" hint="Blinkfix could not produce a fix that passed its checks." />
          <p className="px-5 py-4 text-sm text-muted">
            The crash details, logs and agent findings above are saved with this incident, so whoever picks it up can start from there.
          </p>
        </section>
      )}
    </div>
  );
};
