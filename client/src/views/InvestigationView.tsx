import React, { useState } from 'react';
import { Activity, Bug, ChevronDown, GitCommit, Server, ShieldAlert } from 'lucide-react';
import { AgentInfo, AgentRole, IncidentStatus, Scenario } from '../types';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, Tone } from '../components/ui';

const AGENT_META: Record<AgentRole, { icon: React.ElementType; question: string }> = {
  'trace-analyst': { icon: Bug, question: 'Where in the code did it fail?' },
  'git-detective': { icon: GitCommit, question: 'Which change caused it, and who made it?' },
  'infra-checker': { icon: Server, question: 'Is it our code, or an outside service?' },
  'impact-analyst': { icon: Activity, question: 'Who and what is affected?' },
  'mitigation-planner': { icon: ShieldAlert, question: 'What is the safest way to stop it now?' },
};

const statusTone: Record<AgentInfo['status'], { label: string; tone: Tone }> = {
  IDLE: { label: 'Waiting', tone: 'neutral' },
  THINKING: { label: 'Starting', tone: 'accent' },
  ANALYZING: { label: 'Working', tone: 'accent' },
  COMPLETED: { label: 'Done', tone: 'ok' },
  FAILED: { label: 'Failed', tone: 'bad' },
};

const depTone = { HEALTHY: 'ok', DEGRADED: 'warn', DOWN: 'bad' } as const;
const depLabel = { HEALTHY: 'Healthy', DEGRADED: 'Slow', DOWN: 'Down' } as const;

const AgentRow: React.FC<{ agent: AgentInfo }> = ({ agent }) => {
  const [open, setOpen] = useState(false);
  const meta = AGENT_META[agent.id];
  const Icon = meta.icon;
  const st = statusTone[agent.status];
  const working = agent.status === 'THINKING' || agent.status === 'ANALYZING';
  const done = agent.status === 'COMPLETED';

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold">{agent.name}</h3>
            <span className="text-xs text-muted">{meta.question}</span>
          </div>
          <p className={`mt-1.5 text-sm ${done ? 'text-ink' : 'text-muted'}`}>{agent.summary}</p>
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
              {agent.logs.join('\n')}
            </pre>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {working ? <CheckIcon state="running" /> : <Badge tone={st.tone}>{st.label}</Badge>}
          {done && <span className="tabular text-xs text-muted">{agent.latencyMs} ms</span>}
        </div>
      </div>
    </li>
  );
};

interface InvestigationViewProps {
  agents: AgentInfo[];
  scenario: Scenario;
  status: IncidentStatus;
  onStart: () => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({ agents, scenario, status, onStart }) => {
  if (status === 'STANDBY') {
    return (
      <div className="space-y-6">
        <PageTitle title="Investigation" subtitle="Five agents examine the crash at the same time, each from a different angle." />
        <EmptyState
          title="Nothing to investigate yet"
          body="Start the demo and the agents will report here as they finish."
          action={<button className="btn btn-primary" onClick={onStart}>Start demo</button>}
        />
      </div>
    );
  }

  const finished = agents.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Investigation"
        subtitle="Five agents examine the crash at the same time, each from a different angle."
        right={<Badge tone={finished === agents.length ? 'ok' : 'accent'}>{finished} of {agents.length} finished</Badge>}
      />

      <section className="card">
        <CardHeader title="Agents" hint="They run in parallel, so the investigation takes as long as the slowest one." />
        <ul className="divide-y divide-line">
          {agents.map((a) => <AgentRow key={a.id} agent={a} />)}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <CardHeader title="Outside services" hint="Checked to rule out a problem that is not in our code." />
          <ul className="divide-y divide-line">
            {scenario.infraStatus.map((s) => (
              <li key={s.service} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0 truncate text-sm">{s.service}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-xs text-muted">{s.latencyMs} ms</span>
                  <Badge tone={depTone[s.status]}>{depLabel[s.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <CardHeader title="Affected requests" hint={scenario.blastRadius.impactPercentage} />
          <ul className="divide-y divide-line">
            {scenario.blastRadius.affectedRoutes.map((r) => (
              <li key={r} className="px-5 py-3 font-mono text-sm">{r}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
