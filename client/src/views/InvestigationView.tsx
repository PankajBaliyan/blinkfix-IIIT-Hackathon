import React, { useState } from 'react';
import { Activity, Bug, ChevronDown, Code2, GitCommit, Server, ShieldAlert } from 'lucide-react';
import { AgentRun, IncidentDetail } from '../types';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, Tone } from '../components/ui';
import { isActive } from '../hooks/useIncidents';

const AGENTS: { name: string; icon: React.ElementType; question: string }[] = [
  { name: 'Trace Analyst', icon: Bug, question: 'Where in the code did it fail?' },
  { name: 'Git Detective', icon: GitCommit, question: 'Which change caused it, and who made it?' },
  { name: 'Infra Checker', icon: Server, question: 'Is it our code, or an outside service?' },
  { name: 'Impact Analyst', icon: Activity, question: 'Who and what is affected?' },
  { name: 'Mitigation Planner', icon: ShieldAlert, question: 'What is the safest way to stop it now?' },
];

const CODE_AGENT: (typeof AGENTS)[number] = { name: 'Code Agent', icon: Code2, question: 'What does the code in the repository say, and what is the fix?' };

const depTone = { HEALTHY: 'ok', DEGRADED: 'warn', DOWN: 'bad' } as const;
const depLabel = { HEALTHY: 'Healthy', DEGRADED: 'Slow', DOWN: 'Down' } as const;

const AgentRow: React.FC<{
  meta: (typeof AGENTS)[number];
  run: AgentRun | undefined;
  working: boolean;
}> = ({ meta, run, working }) => {
  const [open, setOpen] = useState(false);
  const Icon = meta.icon;
  const tone: Tone = run ? 'ok' : 'neutral';

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold">{meta.name}</h3>
            <span className="text-xs text-muted">{meta.question}</span>
          </div>
          <p className={`mt-1.5 text-sm ${run ? 'text-ink' : 'text-muted'}`}>
            {run ? run.summary : working ? 'Looking into the crash…' : 'No result was saved for this agent.'}
          </p>
          {run && (
            <>
              <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                {open ? 'Hide activity' : 'Show activity'}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <pre className="scroll-slim mt-2 overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-xs leading-5 text-muted">
                  {run.logs.join('\n')}
                </pre>
              )}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!run && working ? <CheckIcon state="running" /> : <Badge tone={tone}>{run ? 'Done' : 'Waiting'}</Badge>}
          {run && (
            <span className="tabular text-right text-xs text-muted" title={run.findings.source === 'cerebras' && run.findings.sharedCall ? 'The five agents share one model call' : undefined}>
              {run.findings.source === 'cerebras'
                ? `${run.findings.model}, ${run.findings.modelLatencyMs} ms${run.findings.sharedCall ? ' (shared call)' : ''}`
                : run.findings.source === 'codex'
                  ? `${run.findings.model}, ${run.findings.files_read?.length ?? 0} file(s) read, ${(run.durationMs / 1000).toFixed(1)} s`
                  : 'Demo analysis'}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

export const InvestigationView: React.FC<{ detail: IncidentDetail | null }> = ({ detail }) => {
  const subtitle = 'Five agents examine the crash at the same time, each from a different angle.';

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageTitle title="Investigation" subtitle={subtitle} />
        <EmptyState
          title="Nothing to investigate yet"
          body="When the service crashes, the agents report here as they finish."
        />
      </div>
    );
  }

  const working = isActive(detail.status);
  const runs = new Map(detail.agents.map((a) => [a.name, a]));
  const roster = runs.has(CODE_AGENT.name) ? [...AGENTS, CODE_AGENT] : AGENTS;
  const finished = roster.filter((a) => runs.has(a.name)).length;
  const services = detail.infra?.services ?? [];
  const routes = detail.impact?.affected_routes ?? [];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Investigation"
        subtitle={subtitle}
        right={<Badge tone={finished === roster.length ? 'ok' : 'accent'}>{finished} of {roster.length} finished</Badge>}
      />

      <section className="card">
        <CardHeader
          title="Agents"
          hint={`For ${detail.error.type} on ${detail.error.method} ${detail.error.route}. They run in parallel, so it takes as long as the slowest one.`}
        />
        <ul className="divide-y divide-line">
          {roster.map((meta) => (
            <AgentRow key={meta.name} meta={meta} run={runs.get(meta.name)} working={working} />
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <CardHeader
            title="Outside services"
            hint={
              detail.infra?.services_simulated
                ? 'Used to rule out a problem outside our code. The status values are placeholders until real health checks exist.'
                : 'Checked to rule out a problem that is not in our code.'
            }
            right={
              detail.infra ? (
                <Badge tone={detail.infra.is_external ? 'warn' : 'ok'}>
                  {detail.infra.is_external ? 'Outside problem' : 'Our code'}
                </Badge>
              ) : undefined
            }
          />
          {services.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Waiting for the Infra Checker.</p>
          ) : (
            <ul className="divide-y divide-line">
              {services.map((s) => (
                <li key={s.service} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0 truncate text-sm">{s.service}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-xs text-muted">{s.latencyMs} ms</span>
                    <Badge tone={depTone[s.status]}>{depLabel[s.status]}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <CardHeader title="Affected requests" hint={detail.impact?.impact_percentage ?? 'Waiting for the Impact Analyst.'} />
          {routes.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">No affected requests reported yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {routes.map((r) => (
                <li key={r} className="px-5 py-3 font-mono text-sm">{r}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
