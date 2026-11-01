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
  const infraSummary = runs.get('Infra Checker')?.summary;
  const dependencies = Object.entries(detail.infra?.dependencies ?? {});
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
            title="Our code or an outside service?"
            hint="Decided from the error text, the stack trace and the source code."
            right={
              detail.infra ? (
                <Badge tone={detail.infra.is_external ? 'warn' : 'ok'}>
                  {detail.infra.is_external ? 'Outside service' : 'Our code'}
                </Badge>
              ) : undefined
            }
          />
          {!detail.infra ? (
            <p className="px-5 py-4 text-sm text-muted">Waiting for the Infra Checker.</p>
          ) : (
            <div className="space-y-4 p-5">
              <p className="text-sm">{infraSummary}</p>
              {detail.infra.suspect_dependency && (
                <p className="text-sm text-muted">
                  Suspected service: <span className="font-mono text-ink">{detail.infra.suspect_dependency}</span>
                </p>
              )}
              {dependencies.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs text-muted">Libraries this service depends on, from its requirements.txt</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dependencies.map(([name, version]) => (
                      <span key={name} className="rounded bg-sunken px-2 py-0.5 font-mono text-xs text-muted">
                        {name} {version}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <CardHeader title="Affected requests" hint={detail.impact?.recent_failures ?? 'Waiting for the Impact Analyst.'} />
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
