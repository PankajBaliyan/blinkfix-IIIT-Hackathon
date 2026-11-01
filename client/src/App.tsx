import { useSimulation } from './hooks/useSimulation';

function Evidence({ candidate }: { candidate: any }) {
  const validation = candidate.validation;
  const label = candidate.id === 'original' ? 'ORIGINAL FAILURE' :
    candidate.isWinner ? 'PASSING WINNER' : validation.passed ? 'PASSING CANDIDATE' : 'REJECTED CANDIDATE';
  const labelTone = validation.passed ? 'bg-green-950 text-green-300 border-green-700' : 'bg-red-950 text-red-300 border-red-700';
  const testSummary = validation.tests.stdout.match(/# tests \d+[\s\S]*?# pass \d+[\s\S]*?# fail \d+/)?.[0]
    ?.replaceAll('# ', '').replaceAll('\n', ' / ') || 'See execution output';
  return <article className={`rounded-lg border bg-slate-900 p-4 space-y-3 ${candidate.isWinner ? 'border-green-600 ring-1 ring-green-900' : 'border-slate-700'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">{candidate.id}</h3>
      <span className={`text-xs font-mono border rounded px-2 py-1 ${labelTone}`}>{label}</span>
    </div>
    <p className={validation.passed ? 'text-green-400' : 'text-red-400'}>
      Syntax exit {validation.syntax.exit_code} · Regression exit {validation.tests.exit_code} · {validation.passed ? 'PASS' : 'FAIL'}
    </p>
    <p className="text-xs font-mono text-slate-400">{testSummary}</p>
    <details><summary className="cursor-pointer">Source and diff</summary>
      <pre className="overflow-auto text-xs whitespace-pre-wrap">{candidate.code}</pre>
      <pre className="overflow-auto text-xs whitespace-pre-wrap">{candidate.diff}</pre>
    </details>
    <details><summary className="cursor-pointer">Actual execution output</summary>
      {[validation.syntax, validation.tests].map((step: any, i: number) => <pre key={i} className="overflow-auto text-xs whitespace-pre-wrap mt-2">
        {step.command.join(' ')}{'\n'}Exit: {step.exit_code}{'\n'}{step.stdout}{step.stderr}
      </pre>)}
    </details>
  </article>;
}

function SetupStatus({ setup }: { setup: any }) {
  if (!setup) return <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">Loading integration status...</section>;
  const items = [
    ['Offline fixture', setup.readiness.offline_fixture, 'SQLite + local Node execution'],
    ['Cerebras', setup.cerebras.configured, setup.cerebras.model],
    ['OpenAI Codex', setup.codex.configured, setup.codex.model],
    ['GitHub publishing', setup.readiness.github_publishing, `${setup.github.repo} / ${setup.github.target_file}`],
  ];
  return <section aria-label="Integration setup status" className="rounded-lg border border-slate-700 bg-slate-900 p-5 space-y-3">
    <div className="flex flex-wrap justify-between gap-2">
      <div><h2 className="text-xl font-semibold">Integration setup</h2><p className="text-sm text-slate-400">Boolean readiness only. Credentials are never returned to the browser.</p></div>
      <span className="text-xs font-mono rounded border border-amber-700 bg-amber-950 text-amber-200 px-2 py-1 h-fit">PUBLISHING DEFAULT: OFF</span>
    </div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{items.map(([name, ready, detail]: any) =>
      <article key={name} className={`rounded border p-3 ${ready ? 'border-green-800 bg-green-950/30' : 'border-slate-700 bg-slate-950'}`}>
        <div className="flex justify-between gap-2"><h3 className="font-medium">{name}</h3><span className={ready ? 'text-green-400' : 'text-amber-300'}>{ready ? 'READY' : 'NOT CONFIGURED'}</span></div>
        <p className="text-xs text-slate-400 mt-2 break-all">{detail}</p>
      </article>)}</div>
    <p className="text-sm">Live repair: <strong className={setup.readiness.live_analysis ? 'text-green-400' : 'text-amber-300'}>{setup.readiness.live_analysis ? 'READY' : 'WAITING FOR CEREBRAS + OPENAI'}</strong></p>
  </section>;
}

function PrEvidence({ run }: { run: any }) {
  if (!run.pr_url) return null;
  return <section className="rounded-lg border border-green-700 bg-green-950/20 p-5 space-y-3">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-mono text-green-300">REAL GITHUB RESPONSE</p><h2 className="text-xl font-semibold">Verified draft pull request</h2></div>
      <a className="rounded bg-green-700 px-4 py-2 font-medium" href={run.pr_url} target="_blank" rel="noreferrer">Open draft PR</a></div>
    <dl className="grid sm:grid-cols-2 gap-2 text-sm">
      <div><dt className="text-slate-400">URL</dt><dd className="break-all">{run.pr_url}</dd></div>
      <div><dt className="text-slate-400">Commit</dt><dd className="font-mono break-all">{run.commit_sha}</dd></div>
      <div><dt className="text-slate-400">Branch</dt><dd className="font-mono">{run.branch}</dd></div>
      <div><dt className="text-slate-400">Target</dt><dd className="font-mono">{run.target_file}</dd></div>
      <div><dt className="text-slate-400">Committed evidence</dt><dd className="font-mono">{run.evidence_path}</dd></div>
      <div><dt className="text-slate-400">Execution</dt><dd>Syntax {run.syntax_exit_code}; regression {run.regression_exit_code}</dd></div>
    </dl>
  </section>;
}

function AgentPanel({ agent }: { agent: any }) {
  const tone = agent.status === 'COMPLETED' ? 'border-green-700' :
    agent.status === 'FAILED' ? 'border-red-700' :
    agent.status === 'SKIPPED' ? 'border-slate-700' : 'border-cyan-700 animate-pulse';
  return <article className={`bg-slate-900 p-4 rounded border ${tone}`}>
    <h3 className="font-semibold">{agent.agent_name}</h3>
    <p className="text-xs text-slate-400 font-mono">{agent.status} · {agent.duration_ms} ms</p>
    <p className="mt-2 text-sm">{agent.summary}</p>
  </article>;
}

function RehearsalReport({ report }: { report: any }) {
  if (!report) return null;
  return <section className="rounded-lg bg-slate-900 p-5 border border-slate-700 space-y-3">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Last five live rehearsals</h2>
        <p className="text-sm text-slate-400">Durable measurements from live checkout runs only.</p></div>
      <p className="font-mono text-sm">{report.recorded_runs}/5 recorded · {report.successful_runs} successful · {report.total_duration_ms} ms total · {report.model_failures} model failures · {report.publication_failures} publication failures</p>
    </div>
    {report.runs.length === 0 ? <p className="text-amber-200">Waiting for credentials and the first live rehearsal.</p> :
      <div className="overflow-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400"><th className="p-2">Run</th><th>Status</th><th>Duration</th><th>Model</th><th>Publishing</th></tr></thead>
        <tbody>{report.runs.map((item: any) => <tr key={item.id} className="border-t border-slate-800">
          <td className="p-2 font-mono">{item.id}</td><td>{item.status}</td><td>{item.duration_ms} ms</td>
          <td>{item.model_failure ? 'FAILED' : 'OK'}</td><td>{item.publication_failure ? 'FAILED' : item.published ? 'PUBLISHED' : 'DISABLED'}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}

export default function App() {
  const s = useSimulation();
  const run = s.run;
  return <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header><p className="text-cyan-400 font-mono">BLINKFIX // SWARM ZERO</p>
        <h1 className="text-3xl font-bold mt-2">Checkout incident repair</h1>
        <p className="text-slate-400 mt-2">Reproduce → analyze → generate → execute → publish a verified draft PR</p>
      </header>
      <SetupStatus setup={s.setup} />
      <section className="rounded-lg bg-slate-900 p-5 space-y-4 border border-slate-700">
        <div className="flex flex-wrap gap-4">
          <label>Scenario<select aria-label="Scenario" className="block bg-slate-800 p-2 rounded" value={s.scenario} disabled={s.busy} onChange={e => { s.setScenario(e.target.value); s.setPublish(false); }}>
            <option value="payments-typeerror">Checkout currency metadata bug</option>
            <option value="stripe-timeout">Payment gateway outage (503 fixture)</option>
          </select></label>
          <label>Execution<select aria-label="Execution mode" className="block bg-slate-800 p-2 rounded" value={s.mode} disabled={s.busy} onChange={e => { s.setMode(e.target.value); s.setPublish(false); }}>
            <option value="live">Live Cerebras analysis + Codex generation</option>
            <option value="fixture">Offline fixture candidates · real tests · no publishing</option>
          </select></label>
        </div>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={s.publish} disabled={s.busy || s.mode === 'fixture' || s.scenario === 'stripe-timeout' || !s.setup?.readiness.live_analysis || !s.setup?.readiness.github_publishing} onChange={e => s.setPublish(e.target.checked)} />
          Publish verified winner as a draft PR in the configured GitHub repository</label>
        <p className="text-sm text-slate-400">Live failures stop the run. Offline mode uses named fixture files and never claims model inference or GitHub publication.</p>
        <details><summary className="cursor-pointer">Currency contract</summary><pre className="whitespace-pre-wrap text-sm mt-3">{s.contract}</pre></details>
        <details><summary className="cursor-pointer">Supplied checkout source</summary>
          <textarea aria-label="Checkout source" className="w-full h-64 bg-slate-950 p-3 font-mono text-sm mt-3" value={s.source} disabled={s.busy} onChange={e => s.setSource(e.target.value)} />
        </details>
        <div className="flex gap-3">
          <button className="bg-cyan-700 rounded px-4 py-2 disabled:opacity-40" disabled={s.busy || !s.source} onClick={s.triggerOutage}>{s.busy ? 'Running…' : 'Run incident'}</button>
          <button className="bg-slate-700 rounded px-4 py-2 disabled:opacity-40" disabled={s.busy} onClick={s.resetSimulation}>Clear result</button>
        </div>
      </section>
      {s.error && <p role="alert" className="text-red-300 border border-red-800 p-4">{s.error}</p>}
      {run && <section className="space-y-4">
        <div className={`rounded border px-4 py-3 text-sm ${run.mode === 'fixture' || run.scenario_id === 'stripe-timeout' ? 'border-amber-700 bg-amber-950/30 text-amber-100' : 'border-cyan-700 bg-cyan-950/30 text-cyan-100'}`}>
          {run.scenario_id === 'stripe-timeout' ? 'SIMULATED INFRASTRUCTURE TELEMETRY: deterministic 503 fixture; no live provider probe.' :
            run.mode === 'fixture' ? 'OFFLINE FIXTURE MODE: deterministic candidate files; real syntax and regression execution; no model calls or publishing.' :
            'LIVE MODE: results shown below come from configured model APIs and real local candidate execution.'}
        </div>
        <div className="flex flex-wrap justify-between gap-4 bg-slate-900 p-4 rounded">
          <div><h2 className="text-xl font-semibold">{run.status}</h2><p className="text-slate-400 font-mono text-sm">{run.id} · {run.mode}</p></div>
          <p className="font-mono text-xl" aria-label="Elapsed time">{Math.floor(s.elapsed)} ms elapsed</p>
        </div>
        {run.error && <p role="alert" className="text-red-300 border border-red-800 p-4">{run.error}</p>}
        {run.mitigation && <p className="text-amber-200 border border-amber-700 p-4">{run.mitigation}</p>}
        {run.status === 'VALIDATED' && <p className="text-green-300">Winner passed execution. Publishing was not requested; no PR created.</p>}
        <PrEvidence run={run} />
        {run.baseline && <div><h2 className="text-xl mb-2">Original reproduction</h2><Evidence candidate={run.baseline} /></div>}
        {run.agents?.length > 0 && <div><h2 className="text-xl mb-2">Five analysis roles</h2><div className="grid md:grid-cols-3 xl:grid-cols-5 gap-3">{run.agents.map((agent: any) => <AgentPanel key={agent.agent_name} agent={agent} />)}</div></div>}
        {run.patches?.length > 0 && <div><h2 className="text-xl mb-2">Executed candidates · {run.generator}</h2><div className="grid md:grid-cols-2 gap-4">{run.patches.map((patch: any) => <Evidence key={patch.id} candidate={patch} />)}</div></div>}
      </section>}
      <RehearsalReport report={s.rehearsals} />
      <footer className="text-sm text-slate-500">Scope: one currency bug and one infrastructure fixture. Slack deferred. Execution is local development only.</footer>
    </main>
  </div>;
}
