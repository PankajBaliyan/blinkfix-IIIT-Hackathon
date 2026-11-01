import React from 'react';
import { GitPullRequest, MessageSquare, Play, RotateCcw, Undo2, Check } from 'lucide-react';
import { IncidentStatus, Scenario } from '../types';
import { Page } from '../components/Sidebar';
import { Stepper } from '../components/Stepper';
import { Badge, CardHeader, EmptyState, Fact, PageTitle, statusInfo, stageIndex } from '../components/ui';
import { PR_NUMBER } from '../data/delivery';

interface IncidentViewProps {
  scenarios: Scenario[];
  scenario: Scenario;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  status: IncidentStatus;
  formattedTime: string;
  elapsedMs: number;
  isRollbackApproved: boolean;
  onApproveRollback: () => void;
  onStart: () => void;
  onReset: () => void;
  onNavigate: (page: Page) => void;
}

const riskTone = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad' } as const;

export const IncidentView: React.FC<IncidentViewProps> = ({
  scenarios,
  scenario,
  selectedScenarioId,
  onSelectScenario,
  status,
  formattedTime,
  elapsedMs,
  isRollbackApproved,
  onApproveRollback,
  onStart,
  onReset,
  onNavigate,
}) => {
  const info = statusInfo(status);
  const idle = status === 'STANDBY';
  const resolved = status === 'RESOLVED';
  const running = !idle && !resolved;
  const stage = stageIndex(status);
  const showRollback = stage >= 2;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Incident"
        subtitle="Follow a production crash from first alert to a tested fix."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="scenario">Scenario</label>
            <select
              id="scenario"
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={running}
              className="btn max-w-[260px] truncate pr-8"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {idle ? (
              <button className="btn btn-primary" onClick={onStart}>
                <Play size={15} /> Start demo
              </button>
            ) : (
              <button className="btn" onClick={onReset}>
                <RotateCcw size={15} /> Reset
              </button>
            )}
          </div>
        }
      />

      {/* Progress: the timer and the six stages */}
      <section className="card p-5" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone={info.tone}>{info.label}</Badge>
            <p className="mt-2 max-w-md text-sm text-muted">{info.detail}</p>
          </div>
          <div className="text-right">
            <div className="tabular font-mono text-4xl font-medium tracking-tight sm:text-5xl">{formattedTime}</div>
            <p className="mt-1 text-xs text-muted">
              {resolved ? 'Time to a tested fix' : 'Time since the crash'}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Stepper status={status} />
        </div>
      </section>

      {idle && (
        <EmptyState
          title="No incident is running"
          body="Pick a scenario and start the demo. Blinkfix will investigate the crash, suggest a rollback, and prepare a tested fix."
          action={
            <button className="btn btn-primary" onClick={onStart}>
              <Play size={15} /> Start demo
            </button>
          }
        />
      )}

      {!idle && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* What happened */}
          <section className="card">
            <CardHeader
              title="What happened"
              hint={`${scenario.service} in ${scenario.environment}`}
              right={<Badge tone="bad">{scenario.blastRadius.severity.split(' - ')[0]} {scenario.blastRadius.severity.split(' - ')[1].toLowerCase()}</Badge>}
            />
            <div className="space-y-5 p-5">
              <div>
                <p className="font-mono text-sm font-medium text-bad">{scenario.errorName}</p>
                <p className="mt-1 break-words font-mono text-sm text-muted">{scenario.errorMessage}</p>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Failing code" mono>{scenario.file}:{scenario.line}</Fact>
                <Fact label="Function" mono>{scenario.functionName}()</Fact>
                <Fact label="Introduced by">PR #{scenario.culpritCommit.prNumber}, {scenario.culpritCommit.timeAgo}</Fact>
                <Fact label="Author">{scenario.culpritCommit.author}</Fact>
                <Fact label="Users affected">{scenario.blastRadius.impactPercentage}</Fact>
                <Fact label="Area affected">{scenario.blastRadius.scope}</Fact>
              </dl>
              <button className="text-sm font-medium text-accent hover:underline" onClick={() => onNavigate('investigation')}>
                See how each agent reached this
              </button>
            </div>
          </section>

          {/* Recommended action */}
          <section className="card">
            <CardHeader
              title="Recommended action"
              hint="Stop the damage now while the permanent fix is built."
              right={showRollback ? <Badge tone={riskTone[scenario.mitigation.riskLevel]}>{scenario.mitigation.riskLevel.toLowerCase()} risk</Badge> : undefined}
            />
            <div className="p-5">
              {!showRollback ? (
                <p className="text-sm text-muted">The agents are still working. A recommendation will appear here in a moment.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                      <Undo2 size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{scenario.mitigation.action}</p>
                      <p className="mt-1 text-sm text-muted">{scenario.mitigation.description}</p>
                    </div>
                  </div>
                  {isRollbackApproved ? (
                    <div className="flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2.5 text-sm font-medium text-ok">
                      <Check size={16} strokeWidth={3} /> Rollback approved. Traffic is moving back to the last good version.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn btn-primary" onClick={onApproveRollback}>Approve rollback</button>
                      <span className="text-xs text-muted">Nothing changes in production until you approve.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {resolved && (
        <section className="card">
          <CardHeader title="Result" hint="Everything below was done automatically. A person still reviews and merges." />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div className="flex gap-3">
              <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Draft pull request #{PR_NUMBER}</p>
                <p className="mt-0.5 text-sm text-muted">Opened with the best of five tested fixes.</p>
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
              <p className="tabular text-sm font-semibold">{(elapsedMs / 1000).toFixed(2)} seconds</p>
              <p className="mt-0.5 text-sm text-muted">From crash to a tested fix.</p>
            </div>
          </div>
          <div className="border-t border-line px-5 py-3.5">
            <button className="btn btn-primary" onClick={() => onNavigate('fix')}>Review the fix</button>
          </div>
        </section>
      )}
    </div>
  );
};
