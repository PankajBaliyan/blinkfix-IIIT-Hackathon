import React, { useState } from 'react';
import { ExternalLink, GitPullRequest, MessageSquare } from 'lucide-react';
import { CandidatePatch, GithubStatus, IncidentDetail } from '../types';
import { openPullRequest } from '../services/incident.api';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, stageIndex } from '../components/ui';
import { CodeBlock, DiffView } from '../components/DiffView';
import { commitLabel } from '../lib/format';

const letter = (p: CandidatePatch) => p.id.replace('patch-', '').toUpperCase();

const SUBTITLE = 'Several candidate fixes are written, then each one is run to see whether it really works. The best one becomes a pull request.';

interface FixViewProps {
  detail: IncidentDetail | null;
  github: GithubStatus | null;
  onOpenSettings: () => void;
}

const writtenBy = (p: CandidatePatch) =>
  p.source === 'codex' ? `Written by ${p.model} (Code Agent)` : p.source === 'cerebras' ? `Written by ${p.model}` : 'Demo library';

export const FixView: React.FC<FixViewProps> = ({ detail, github, onOpenSettings }) => {
  // Reset by the parent via `key={incident id}`, so a pick never leaks between incidents.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);

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

  const delivering = detail.status === 'DELIVERING';
  // The fix is chosen once it is being delivered or has been resolved.
  const resolved = detail.status === 'RESOLVED' || delivering;
  // Checks are done once the incident is resolved, or failed because nothing passed them.
  const finished = resolved || detail.status === 'FAILED';
  const baselineFailures = detail.validation?.baseline_test_failures ?? 0;
  const selected =
    detail.patches.find((p) => p.id === pickedId) ??
    detail.patches.find((p) => p.isWinner && resolved) ??
    detail.patches[0];

  const before = selected.original || null;

  // Why a pull request cannot be opened right now, or null if it can.
  const prBlocker = !github?.connected
    ? 'Connect GitHub to open a pull request.'
    : github.canWrite === false
      ? 'The connected GitHub account cannot push to this repository.'
      : detail.codeOrigin !== 'github'
        ? 'This incident\'s code was not read from GitHub, so a pull request cannot be built from it.'
        : selected.validation.astSyntaxValid
          ? null
          : 'This fix does not produce valid code.';

  const openPr = async () => {
    setOpening(true);
    setPrError(null);
    try {
      await openPullRequest(detail.id, selected.id);
      // The API pushes the updated incident, which fills in the pull request below.
    } catch (e) {
      setPrError(e instanceof Error ? e.message : 'Could not open the pull request.');
    } finally {
      setOpening(false);
    }
  };
  const v = selected.validation;
  type CheckState = 'pass' | 'fail' | 'running' | 'skipped';
  const done = (state: CheckState): CheckState => (finished ? state : 'running');

  const checks: { label: string; detail: string; state: CheckState }[] = [
    { label: 'Changes the right file', detail: detail.error.file.split('/').pop() ?? '', state: done(v.targetFileMatch ? 'pass' : 'fail') },
    { label: 'File still parses with the fix', detail: 'Checked on the real file', state: done(v.astSyntaxValid ? 'pass' : 'fail') },
    {
      label: 'Service still starts',
      detail: !v.astSyntaxValid ? 'Not run' : v.importOk ? 'Loaded in a sandbox' : 'It no longer loads',
      state: done(!v.astSyntaxValid ? 'skipped' : v.importOk ? 'pass' : 'fail'),
    },
    {
      label: 'Original crash is gone',
      detail: v.replayDetail || 'Not run',
      state: done(v.replay === 'fixed' ? 'pass' : v.replay === 'still_fails' || v.replay === 'blocked' ? 'fail' : 'skipped'),
    },
    {
      label: 'Existing tests still pass',
      detail: v.testsRun ? `${v.testsRun - v.testsFailed} of ${v.testsRun} pass${v.testsDetail ? `, ${v.testsDetail}` : ''}` : 'Not run',
      state: done(v.testsRun === 0 ? 'skipped' : v.testsFailed > baselineFailures ? 'fail' : 'pass'),
    },
    { label: 'Change is small', detail: v.diffLineChange, state: done('pass') },
  ];

  // One sentence on what the checks add up to for the selected fix.
  const verdict = v.verified
    ? 'Verified: the original crash no longer happens and the existing tests still pass.'
    : v.replay === 'still_fails'
      ? 'This fix does not stop the crash, so it cannot be chosen.'
      : v.replay === 'blocked'
        ? 'This fix was not run because it uses code a fix should not need, so it cannot be chosen.'
        : v.testsFailed > baselineFailures
          ? 'This fix breaks an existing test, so it cannot be chosen.'
          : !v.astSyntaxValid || !v.importOk
            ? 'This fix does not produce working code, so it cannot be chosen.'
            : v.replay === 'not_reproduced'
              ? 'The crash could not be reproduced here, so this fix is unproven.'
              : 'This fix could not be fully checked.';

  return (
    <div className="space-y-6">
      <PageTitle
        title="Fix"
        subtitle={SUBTITLE}
        right={<Badge tone={finished ? 'ok' : 'accent'}>{finished ? 'Checks complete' : 'Checking'}</Badge>}
      />

      {detail.validation && (
        <p className="text-sm text-muted">
          {detail.validation.note}
          {detail.validation.baseline_tests_run > 0 && ` The service's ${detail.validation.baseline_tests_run} existing tests were run against every fix.`}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Candidate list */}
        <section className="card self-start">
          <CardHeader title="Candidates" hint="Ranked by what happened when each fix was run." />
          <ul className="p-2" role="listbox" aria-label="Candidate fixes">
            {[...detail.patches]
              .sort((a, b) => (finished ? b.validation.score - a.validation.score : 0))
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
                        {resolved && p.isWinner && (
                          <span className={`text-xs font-medium ${p.validation.verified ? 'text-ok' : 'text-warn'}`}>
                            {p.validation.verified ? 'Verified fix' : 'Best fix, unverified'}
                          </span>
                        )}
                        {finished && !p.isWinner && (p.validation.replay === 'still_fails' || p.validation.replay === 'blocked' || p.validation.testsFailed > baselineFailures || !p.validation.astSyntaxValid) && (
                          <span className="text-xs font-medium text-bad">Rejected</span>
                        )}
                      </span>
                      <span className="tabular text-sm text-muted">{finished ? p.validation.score : '…'}</span>
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
                  <Badge tone={selected.source === 'demo' ? 'neutral' : 'accent'}>{writtenBy(selected)}</Badge>
                  {resolved && selected.isWinner && (
                    <Badge tone={v.verified ? 'ok' : 'warn'}>{v.verified ? 'Verified fix' : 'Best fix, unverified'}</Badge>
                  )}
                </div>
              }
            />
            <div className="space-y-5 p-5">
              {before !== null ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">What changes</h3>
                  <p className="mb-2 text-xs text-muted">
                    Replaces {selected.startLine === selected.endLine ? `line ${selected.startLine}` : `lines ${selected.startLine} to ${selected.endLine}`} of{' '}
                    <span className="font-mono">{selected.file ?? detail.error.file}</span>.
                  </p>
                  <DiffView before={before} after={selected.code} />
                </div>
              ) : (
                <CodeBlock code={selected.code} />
              )}
              <div>
                <h3 className="text-sm font-semibold">Checks</h3>
                <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <CheckIcon state={c.state} />
                      <span className="shrink-0 text-sm">{c.label}</span>
                      <span className="ml-auto min-w-0 max-w-[60%] truncate text-right font-mono text-xs text-muted" title={c.detail}>{c.detail}</span>
                    </li>
                  ))}
                </ul>
                {finished && (
                  <p className="mt-3 text-sm text-muted">
                    Score <span className="font-semibold text-ink">{v.score}</span> out of 100. {verdict}
                    {selected.source !== 'demo' && (
                      <> The model's own confidence ({Math.round(selected.confidence * 100)}%) only breaks ties.</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>

          {detail.status === 'FAILED' && (
            <section className="card">
              <CardHeader title="No fix passed the checks" hint="Blinkfix will not offer a pull request for a fix it could not verify." />
              <p className="px-5 py-4 text-sm text-muted">
                Look at each candidate on the left to see why it was rejected. The crash details, logs and agent findings are saved on the Incident page for an engineer.
              </p>
            </section>
          )}

          {resolved && (
            <section className="card">
              <CardHeader
                title="Pull request"
                hint="A draft pull request on GitHub. Nothing is merged or deployed automatically."
              />
              <div className="divide-y divide-line">
                <div className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
                  {detail.pr ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Draft pull request{detail.pr.number ? ` #${detail.pr.number}` : ''} opened</p>
                        <p className="mt-0.5 truncate text-sm text-muted">Fix {detail.error.type} in {detail.error.file}</p>
                        {detail.prNote && <p className="mt-1 text-sm text-muted">{detail.prNote}</p>}
                        {detail.pr.branch && <p className="mt-1 truncate font-mono text-xs text-faint">{detail.pr.branch}</p>}
                      </div>
                      <a href={detail.pr.url} target="_blank" rel="noreferrer" className="btn shrink-0">
                        Open on GitHub <ExternalLink size={14} />
                      </a>
                    </>
                  ) : delivering ? (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Opening a draft pull request…</p>
                      <p className="mt-0.5 text-sm text-muted">The fix is verified. Blinkfix is creating the branch and the pull request on GitHub.</p>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Open a pull request with candidate {letter(selected)}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {detail.prNote ?? prBlocker ?? 'Creates a branch, commits this one change, and opens a draft pull request on GitHub.'}
                        </p>
                        {prError && <p role="alert" className="mt-2 text-sm text-bad">{prError}</p>}
                      </div>
                      {github?.connected ? (
                        <button className="btn btn-primary shrink-0" onClick={openPr} disabled={opening || prBlocker !== null}>
                          {opening ? 'Opening…' : 'Open pull request'}
                        </button>
                      ) : (
                        <button className="btn shrink-0" onClick={onOpenSettings}>Go to Settings</button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-start gap-3 px-5 py-4">
                  <MessageSquare size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Slack message</p>
                    <p className="mt-1 text-sm text-muted">
                      {detail.pr
                        ? `${detail.error.type} in ${detail.service}${detail.culprit ? `. Introduced by ${commitLabel(detail.culprit)} from ${detail.culprit.author}` : ''}. A proposed fix is ready for review.`
                        : 'Sent when a pull request is opened.'}
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
