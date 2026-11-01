import React, { useState } from 'react';
import { ExternalLink, GitPullRequest, MessageSquare } from 'lucide-react';
import { CandidatePatch, GithubStatus, IncidentDetail } from '../types';
import { openPullRequest } from '../services/incident.api';
import { Badge, CardHeader, CheckIcon, EmptyState, PageTitle, stageIndex } from '../components/ui';
import { CodeBlock, DiffView } from '../components/DiffView';
import { commitLabel } from '../lib/format';

const letter = (p: CandidatePatch) => p.id.replace('patch-', '').toUpperCase();

const testsRun = (s: string) => /\d+\s*\/\s*\d+/.test(s);

const testsPass = (s: string) => {
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? m[1] === m[2] : false;
};

const SUBTITLE = 'Several candidate fixes are written and checked. The best one becomes a pull request.';

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

  const resolved = detail.status === 'RESOLVED';
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
                  <Badge tone={selected.source === 'demo' ? 'neutral' : 'accent'}>{writtenBy(selected)}</Badge>
                  {resolved && selected.isWinner && <Badge tone="ok">Best fix</Badge>}
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
                      <span className="flex-1 text-sm">{c.label}</span>
                      <span className="truncate font-mono text-xs text-muted">{c.detail}</span>
                    </li>
                  ))}
                </ul>
                {resolved && (
                  <p className="mt-3 text-sm text-muted">
                    Score <span className="font-semibold text-ink">{selected.validation.score}</span> out of 100.{' '}
                    {selected.source === 'demo'
                      ? 'This fix comes from the built-in demo library, not a model. Tests have not been run.'
                      : <>The model rated its own confidence at <span className="font-semibold text-ink">{Math.round(selected.confidence * 100)}%</span>. Tests have not been run, so check the fix before merging.</>}
                  </p>
                )}
              </div>
            </div>
          </section>

          {resolved && (
            <section className="card">
              <CardHeader
                title="Pull request"
                hint="Opens a draft pull request on GitHub. Nothing is merged or deployed automatically."
              />
              <div className="divide-y divide-line">
                <div className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <GitPullRequest size={18} className="mt-0.5 shrink-0 text-accent" />
                  {detail.pr ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Draft pull request{detail.pr.number ? ` #${detail.pr.number}` : ''} opened</p>
                        <p className="mt-0.5 truncate text-sm text-muted">Fix {detail.error.type} in {detail.error.file}</p>
                        {detail.pr.branch && <p className="mt-1 truncate font-mono text-xs text-faint">{detail.pr.branch}</p>}
                      </div>
                      <a href={detail.pr.url} target="_blank" rel="noreferrer" className="btn shrink-0">
                        Open on GitHub <ExternalLink size={14} />
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Open a pull request with candidate {letter(selected)}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {prBlocker ?? 'Creates a branch, commits this one change, and opens a draft pull request on GitHub.'}
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
