import React, { useState } from 'react';
import { GitPullRequest, MessageSquare } from 'lucide-react';
import { CandidatePatch, IncidentDetail } from '../types';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, stageIndex } from '../components/ui';
import { CodeBlock, DiffView } from '../components/DiffView';

const letter = (p: CandidatePatch) => p.id.replace('patch-', '').toUpperCase();

const testsRun = (s: string) => /\d+\s*\/\s*\d+/.test(s);

const testsPass = (s: string) => {
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? m[1] === m[2] : false;
};

const SUBTITLE = 'Several candidate fixes are written and checked. The best one becomes a pull request.';

export const FixView: React.FC<{ detail: IncidentDetail | null }> = ({ detail }) => {
  // Reset by the parent via `key={incident id}`, so a pick never leaks between incidents.
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (!detail || (detail.patches.length === 0 && stageIndex(detail.status) < 3)) {
    return (
      <div className="space-y-6">
        <PageTitle title="Fix" subtitle={SUBTITLE} />
        <EmptyState
          title={detail ? 'Fixes are on the way' : 'No fixes yet'}
          body={
            detail
              ? 'The investigation is still running. Candidate fixes start as soon as it finishes.'
              : 'When the service crashes, the candidate fixes appear here.'
          }
        />
      </div>
    );
  }

  if (detail.patches.length === 0) {
    return (
      <div className="space-y-6">
        <PageTitle title="Fix" subtitle={SUBTITLE} />
        <EmptyState
          title="No fix was produced"
          body="Blinkfix has no candidate fix for this kind of error yet. The crash details and logs are saved on the Incident page for an engineer."
        />
      </div>
    );
  }

  const resolved = detail.status === 'RESOLVED';
  const selected =
    detail.patches.find((p) => p.id === pickedId) ??
    detail.patches.find((p) => p.isWinner && resolved) ??
    detail.patches[0];

  const failingLine = detail.source ? detail.source.lines[detail.source.failingLine - detail.source.startLine] : null;
  const prNumber = detail.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  const checkState = (ok: boolean) => (resolved ? (ok ? 'pass' : 'fail') : 'running') as 'pass' | 'fail' | 'running';
  const testsState = testsRun(selected.validation.unitTestsPassed)
    ? checkState(testsPass(selected.validation.unitTestsPassed))
    : (resolved ? 'skipped' : 'running') as 'skipped' | 'running';

  const checks = [
    { label: 'Changes the right file', detail: detail.error.file.split('/').pop() ?? '', state: checkState(selected.validation.targetFileMatch) },
    { label: 'File still parses with the fix', detail: 'Checked on the real file', state: checkState(selected.validation.astSyntaxValid) },
    { label: 'Tests pass', detail: testsRun(selected.validation.unitTestsPassed) ? selected.validation.unitTestsPassed : 'Not run yet', state: testsState },
    { label: 'Change is small', detail: selected.validation.diffLineChange, state: checkState(true) },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Fix"
        subtitle={SUBTITLE}
        right={<Badge tone={resolved ? 'ok' : 'accent'}>{resolved ? 'Checks complete' : 'Checking'}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Candidate list */}
        <section className="card self-start">
          <CardHeader title="Candidates" hint="Ranked by safety score once testing ends." />
          <ul className="p-2" role="listbox" aria-label="Candidate fixes">
            {[...detail.patches]
              .sort((a, b) => (resolved ? b.validation.score - a.validation.score : 0))
              .map((p) => {
                const active = p.id === selected.id;
                return (
                  <li key={p.id}>
                    <button
                      role="option"
                      aria-selected={active}
                      onClick={() => setPickedId(p.id)}
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
              right={
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge tone={selected.source === 'cerebras' ? 'accent' : 'neutral'}>
                    {selected.source === 'cerebras' ? `Written by ${selected.model}` : 'Demo library'}
                  </Badge>
                  {resolved && selected.isWinner && <Badge tone="ok">Best fix</Badge>}
                </div>
              }
            />
            <div className="space-y-5 p-5">
              {failingLine !== null && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">What changes</h3>
                  <p className="mb-2 text-xs text-muted">
                    Replaces line {detail.error.line} of <span className="font-mono">{detail.error.file}</span>.
                  </p>
                  <DiffView before={failingLine} after={selected.code} />
                </div>
              )}
              {failingLine === null && <CodeBlock code={selected.code} />}
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
                    Score <span className="font-semibold text-ink">{selected.validation.score}</span> out of 100.{' '}
                    {selected.source === 'cerebras'
                      ? <>The model rated its own confidence at <span className="font-semibold text-ink">{Math.round(selected.confidence * 100)}%</span>. Tests have not been run, so check the fix before merging.</>
                      : 'These fixes and their test results come from the built-in demo library.'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {resolved && (
            <section className="card">
              <CardHeader
                title="Sent to your team"
                hint={detail.demoMode ? 'Demo mode: these are simulated, nothing was created on GitHub or Slack.' : 'A person reviews and merges. Nothing is deployed automatically.'}
              />
              <div className="divide-y divide-line">
                <div className="flex items-start gap-3 px-5 py-4">
                  <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Draft pull request{prNumber ? ` #${prNumber}` : ''}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">Fix {detail.error.type} in {detail.error.file}</p>
                    {detail.prUrl && <p className="mt-1 truncate font-mono text-xs text-faint">{detail.prUrl}</p>}
                  </div>
                  {detail.demoMode ? (
                    <Badge tone="neutral">Simulated</Badge>
                  ) : (
                    detail.prUrl && <a href={detail.prUrl} target="_blank" rel="noreferrer" className="btn shrink-0">Open</a>
                  )}
                </div>
                <div className="flex items-start gap-3 px-5 py-4">
                  <MessageSquare size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Slack message</p>
                    <p className="mt-1 text-sm text-muted">
                      {detail.error.type} in {detail.service}
                      {detail.culprit ? `. Introduced by PR #${detail.culprit.pr_number} from ${detail.culprit.author}` : ''}. A proposed fix is ready for review.
                    </p>
                  </div>
                  {detail.demoMode && <Badge tone="neutral">Simulated</Badge>}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
