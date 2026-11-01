import React from 'react';
import { ExternalLink, GitPullRequest, MessageSquare } from 'lucide-react';
import { CandidatePatch, IncidentStatus, Scenario } from '../types';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, stageIndex } from '../components/ui';
import { CodeBlock, DiffView } from '../components/DiffView';
import { GITHUB_OWNER, PR_NUMBER, SLACK_CHANNEL } from '../data/delivery';

interface FixViewProps {
  scenario: Scenario;
  status: IncidentStatus;
  activePatchId: string;
  onSelectPatch: (id: string) => void;
  onStart: () => void;
}

const letter = (p: CandidatePatch) => p.id.replace('patch-', '').toUpperCase();

const testsPass = (s: string) => {
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? m[1] === m[2] : false;
};

export const FixView: React.FC<FixViewProps> = ({ scenario, status, activePatchId, onSelectPatch, onStart }) => {
  const stage = stageIndex(status);
  const resolved = status === 'RESOLVED';

  if (stage < 3) {
    return (
      <div className="space-y-6">
        <PageTitle title="Fix" subtitle="Five candidate fixes are written and tested. The safest one becomes a pull request." />
        <EmptyState
          title={status === 'STANDBY' ? 'No fixes yet' : 'Fixes are on the way'}
          body={
            status === 'STANDBY'
              ? 'Start the demo and the candidate fixes will appear here.'
              : 'The investigation is still running. Candidate fixes start as soon as it finishes.'
          }
          action={status === 'STANDBY' ? <button className="btn btn-primary" onClick={onStart}>Start demo</button> : undefined}
        />
      </div>
    );
  }

  const selected = scenario.patches.find((p) => p.id === activePatchId) ?? scenario.patches[0];
  const prUrl = `https://github.com/${GITHUB_OWNER}/${scenario.service}/pull/${PR_NUMBER}`;
  const checkState = (ok: boolean) => (resolved ? (ok ? 'pass' : 'fail') : 'running') as 'pass' | 'fail' | 'running';

  const checks = [
    { label: 'Changes the right file', detail: scenario.file, state: checkState(selected.validation.targetFileMatch) },
    { label: 'Code is valid', detail: 'It parses without errors', state: checkState(selected.validation.astSyntaxValid) },
    { label: 'Tests pass', detail: selected.validation.unitTestsPassed, state: checkState(testsPass(selected.validation.unitTestsPassed)) },
    { label: 'Change is small', detail: selected.validation.diffLineChange, state: checkState(true) },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Fix"
        subtitle="Five candidate fixes are written and tested. The safest one becomes a pull request."
        right={<Badge tone={resolved ? 'ok' : 'accent'}>{resolved ? 'Testing complete' : 'Testing in progress'}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Candidate list */}
        <section className="card self-start">
          <CardHeader title="Candidates" hint="Ranked by safety score once testing ends." />
          <ul className="p-2" role="listbox" aria-label="Candidate fixes">
            {scenario.patches.map((p) => {
              const active = p.id === selected.id;
              return (
                <li key={p.id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelectPatch(p.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-accent-soft' : 'hover:bg-sunken'
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${active ? 'bg-accent text-white dark:text-bg' : 'bg-sunken text-muted'}`}>
                      {letter(p)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.strategy}</span>
                      {resolved && p.isWinner && <span className="text-xs font-medium text-ok">Best fix</span>}
                    </span>
                    <span className="tabular text-sm text-muted">{resolved ? p.validation.score : '…'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Selected candidate */}
        <div className="min-w-0 space-y-6">
          <section className="card">
            <CardHeader
              title={`Candidate ${letter(selected)}: ${selected.strategy}`}
              hint={selected.explanation}
              right={resolved && selected.isWinner ? <Badge tone="ok">Best fix</Badge> : undefined}
            />
            <div className="space-y-5 p-5">
              <CodeBlock code={selected.code} />
              <div>
                <h3 className="text-sm font-semibold">Checks</h3>
                <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <CheckIcon state={c.state} />
                      <span className="flex-1 text-sm">{c.label}</span>
                      <span className="truncate font-mono text-xs text-muted">{c.detail}</span>
                    </li>
                  ))}
                </ul>
                {resolved && (
                  <p className="mt-3 text-sm text-muted">
                    Safety score <span className="font-semibold text-ink">{selected.validation.score}</span> out of 100, confidence{' '}
                    <span className="font-semibold text-ink">{Math.round(selected.confidence * 100)}%</span>.
                  </p>
                )}
              </div>
            </div>
          </section>

          {resolved && (
            <section className="card">
              <CardHeader title="What changes in the file" hint={scenario.file} />
              <div className="p-5">
                <DiffView before={scenario.originalCode} after={scenario.fixedCode} />
              </div>
            </section>
          )}

          {resolved && (
            <section className="card">
              <CardHeader title="Sent to your team" hint="A person reviews and merges. Nothing is deployed automatically." />
              <div className="divide-y divide-line">
                <div className="flex items-start gap-3 px-5 py-4">
                  <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Draft pull request #{PR_NUMBER}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">Fix {scenario.errorName} in {scenario.file}</p>
                    <p className="mt-1 truncate font-mono text-xs text-faint">{prUrl}</p>
                  </div>
                  <a href={prUrl} onClick={(e) => e.preventDefault()} className="btn shrink-0">
                    Open <ExternalLink size={14} />
                  </a>
                </div>
                <div className="flex items-start gap-3 px-5 py-4">
                  <MessageSquare size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Message posted to {SLACK_CHANNEL}</p>
                    <p className="mt-1 text-sm text-muted">
                      {scenario.errorName} in {scenario.service}. Introduced by PR #{scenario.culpritCommit.prNumber} from{' '}
                      {scenario.culpritCommit.author}. A tested fix is ready for review.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
