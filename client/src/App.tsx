import { useSimulation } from './hooks/useSimulation';
import type { AgentResult, CandidateResult, IncidentState, RehearsalReport, SetupStatus } from './types';

const roles = ['Trace Analyst', 'Git Detective', 'Infra Checker', 'Impact Analyst', 'Mitigation Planner'];
const terminalLabels: Partial<Record<IncidentState['status'], string>> = {
  VALIDATED: 'Fix validated', RESOLVED: 'Draft PR opened', MITIGATED: 'Infrastructure mitigation recommended',
  FAILED: 'Failed', PUBLISH_FAILED: 'Publishing failed',
};

function Evidence({ candidate }: { candidate: CandidateResult }) {
  const { validation } = candidate;
  const label = candidate.id === 'original' ? 'ORIGINAL FAILURE' : candidate.isWinner ? 'PASSING WINNER' : validation.passed ? 'PASSING CANDIDATE' : 'REJECTED CANDIDATE';
  const testSummary = validation.tests.stdout.match(/# tests \d+[\s\S]*?# pass \d+[\s\S]*?# fail \d+/)?.[0]?.replace(/# /g, '').replace(/\n/g, ' / ') || 'Open execution output for details';
  return <article className={`evidence-card ${candidate.isWinner ? 'winner' : ''}`}>
    <div className="row"><h3>{candidate.id}</h3><span className={`result-tag ${validation.passed ? 'pass' : 'fail'}`}>{label}</span></div>
    <p className={validation.passed ? 'pass-text' : 'fail-text'}>Syntax exit {validation.syntax.exit_code} · Regression exit {validation.tests.exit_code} · {validation.passed ? 'PASS' : 'FAIL'}</p>
    <p className="mono muted">{testSummary}</p>
    <details><summary>Source and diff</summary><pre>{candidate.code}</pre><pre>{candidate.diff}</pre></details>
    <details><summary>Actual execution output</summary>{[validation.syntax, validation.tests].map((step, index) =>
      <pre key={index}>{step.command.join(' ')}{`\nExit: ${step.exit_code}\n${step.stdout}${step.stderr}`}</pre>)}</details>
  </article>;
}

function SetupStatus({ setup }: { setup: SetupStatus | null }) {
  if (!setup) return <section className="panel" aria-busy="true">Loading integration status…</section>;
  const items: Array<[string, boolean, string]> = [
    ['Offline fixture', setup.readiness.offline_fixture, 'SQLite and local Node execution'],
    ['Cerebras', setup.cerebras.configured, setup.cerebras.model], ['OpenAI Codex', setup.codex.configured, setup.codex.model],
    ['GitHub publishing', setup.readiness.github_publishing, `${setup.github.repo} / ${setup.github.target_file}`],
  ];
  return <details className="panel setup"><summary>Integration setup · publishing defaults to off</summary>
    <p className="muted">Readiness flags and model names only. The API never returns credentials.</p>
    <div className="setup-grid">{items.map(([name, ready, detail]) => <div key={name} className="setup-item">
      <strong>{name}</strong><span className={ready ? 'pass-text' : 'warn-text'}>{ready ? 'READY' : 'NOT CONFIGURED'}</span><small>{detail}</small>
    </div>)}</div>
  </details>;
}

function AgentPanel({ agent }: { agent: AgentResult }) {
  return <article className={`agent-card status-${agent.status.toLowerCase()}`}>
    <div className="row"><h3>{agent.agent_name}</h3><strong>{agent.status}</strong></div>
    <p className="mono muted">{agent.duration_ms} ms</p><p>{agent.summary}</p>
    {Object.keys(agent.findings).length > 0 && <details><summary>Evidence</summary><pre>{JSON.stringify(agent.findings, null, 2)}</pre></details>}
  </article>;
}

function PrEvidence({ run }: { run: IncidentState }) {
  if (!run.pr_url) return null;
  return <section className="panel pr-evidence"><div className="row"><div><p className="eyebrow">REAL GITHUB RESPONSE</p><h2>Draft PR evidence</h2></div>
    <a className="button primary" href={run.pr_url} target="_blank" rel="noreferrer">Open draft PR</a></div>
    <dl><div><dt>URL</dt><dd>{run.pr_url}</dd></div><div><dt>Commit</dt><dd>{run.commit_sha}</dd></div><div><dt>Branch</dt><dd>{run.branch}</dd></div>
      <div><dt>Target</dt><dd>{run.target_file}</dd></div><div><dt>Committed evidence</dt><dd>{run.evidence_path}</dd></div>
      <div><dt>Execution</dt><dd>Syntax {run.syntax_exit_code}; regression {run.regression_exit_code}</dd></div></dl>
  </section>;
}

function RehearsalReport({ report }: { report: RehearsalReport | null }) {
  if (!report) return null;
  return <details className="panel"><summary>Live rehearsal measurements · {report.recorded_runs}/5 recorded</summary>
    <p className="muted">{report.successful_runs} successful · {report.total_duration_ms} ms total · {report.model_failures} model failures · {report.publication_failures} publication failures</p>
    {report.runs.length === 0 ? <p className="warn-text">Waiting for credentials and the first live rehearsal.</p> : <div className="table-wrap"><table><thead><tr><th>Run</th><th>Status</th><th>Duration</th><th>Model</th><th>Publishing</th></tr></thead>
      <tbody>{report.runs.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.status}</td><td>{item.duration_ms} ms</td><td>{item.model_failure ? 'FAILED' : 'OK'}</td><td>{item.publication_failure ? 'FAILED' : item.published ? 'PUBLISHED' : 'DISABLED'}</td></tr>)}</tbody></table></div>}
  </details>;
}

export default function App() {
  const s = useSimulation(); const run = s.run;
  const displayedAgents: AgentResult[] = roles.map(role => run?.agents.find(agent => agent.agent_name === role) || { agent_name: role, status: 'IDLE', summary: run?.scenario_id === 'stripe-timeout' ? 'Bypassed: infrastructure incidents do not enter code analysis.' : 'Waiting for incident evidence.', duration_ms: 0, findings: {} });
  const modeLabel = (run?.scenario_id || s.scenario) === 'stripe-timeout' ? 'Infrastructure fixture' : (run?.mode || s.mode) === 'fixture' ? 'Offline fixture' : 'Live';
  const outcome = run ? terminalLabels[run.status] || 'Run in progress' : 'Ready to run';
  const timerLabel = run?.status === 'RESOLVED' ? 'Time to draft PR' : run?.status === 'MITIGATED' ? 'Time to recommendation' : 'Time to validated fix';
  const publishReason = s.scenario === 'stripe-timeout' ? 'Infrastructure incidents never generate or publish patches.' : s.mode === 'fixture' ? 'Offline fixture runs cannot publish.' : !s.setup?.readiness.live_analysis ? 'Configure Cerebras and OpenAI before publishing.' : !s.setup?.readiness.github_publishing ? 'Configure the dedicated GitHub target and token.' : '';

  return <main>
    <header className="hero"><div><p className="eyebrow">BLINKFIX · SWARM ZERO</p><h1>Production error → tested fix PR.</h1><p>One checkout bug and one infrastructure scenario, with executable evidence.</p></div><div className="mode"><span>Execution mode</span><strong>{modeLabel}</strong></div></header>
    <SetupStatus setup={s.setup} />
    <section className="panel controls" aria-busy={s.busy}><div className="control-grid">
      <label>Incident<select value={s.scenario} disabled={s.busy || s.loading} onChange={event => { s.resetSimulation(); s.setScenario(event.target.value as typeof s.scenario); }}><option value="payments-typeerror">Checkout currency metadata bug</option><option value="stripe-timeout">Payment gateway outage (503 fixture)</option></select></label>
      <label>Execution<select value={s.mode} disabled={s.busy || s.loading} onChange={event => { s.resetSimulation(); s.setMode(event.target.value as typeof s.mode); }}><option value="fixture">Offline fixture · real local checks</option><option value="live">Live Cerebras + Codex</option></select></label>
    </div>
    <label className="check"><input type="checkbox" checked={s.publish} disabled={s.busy || Boolean(publishReason)} onChange={event => s.setPublish(event.target.checked)} />Publish one verified winner as a draft PR</label>
    {publishReason && <p className="disabled-reason">Publishing unavailable: {publishReason}</p>}
    <details><summary>Currency contract and supplied source</summary><pre>{s.contract}</pre><label>Supplied checkout source<textarea value={s.source} disabled={s.busy} onChange={event => s.setSource(event.target.value)} /></label></details>
    <div className="actions"><button className="button primary" disabled={s.busy || !s.source || s.loading} onClick={s.triggerOutage}>{s.busy ? 'Running…' : 'Run incident'}</button><button className="button" disabled={s.busy} onClick={s.resetSimulation}>Clear result</button></div></section>

    {s.loading && <section className="panel" aria-live="polite">Loading fixture and durable state…</section>}
    {s.connection === 'disconnected' && <p className="notice warning" role="status">Disconnected from backend. Saved run evidence will recover after reconnection.</p>}
    {s.error && <p className="notice error" role="alert">{s.error}</p>}

    <section className="flow" aria-label="Repair workflow">
      <article className="panel incident"><p className="step">1 · INCIDENT</p><h2>{run ? (run.scenario_id === 'stripe-timeout' ? 'Payment gateway returned 503' : 'Checkout regression reproduced') : 'No incident running'}</h2><p>{run?.baseline ? `Original syntax ${run.baseline.validation.syntax.exit_code}; regression ${run.baseline.validation.tests.exit_code}.` : run?.scenario_id === 'stripe-timeout' ? 'Supplied infrastructure telemetry; no live provider probe.' : 'Select a scenario and run it to capture executable evidence.'}</p>{run?.baseline && <details><summary>Original failure evidence</summary><Evidence candidate={run.baseline} /></details>}</article>
      <section className="agents-section"><p className="step">2 · FIVE PARALLEL AGENTS</p><div className="agent-grid">{displayedAgents.map(agent => <AgentPanel key={agent.agent_name} agent={agent} />)}</div></section>
      <section className="verification"><p className="step">3 · CANDIDATE VERIFICATION</p>{run?.patches.length ? <div className="candidate-grid">{run.patches.map(candidate => <Evidence key={candidate.id} candidate={candidate} />)}</div> : <div className="panel empty">{run?.scenario_id === 'stripe-timeout' ? 'Correctly stopped before patch generation.' : 'No candidates have been executed.'}</div>}</section>
      <section className={`outcome ${terminalLabels[run?.status || 'TRIGGERED'] ? 'terminal' : ''}`} aria-live="polite"><div><p className="step">4 · OUTCOME</p><h2>{outcome}</h2><p>{run?.error || run?.mitigation || (run?.status === 'VALIDATED' ? 'A winner passed syntax and regression execution. Publishing was disabled.' : 'Waiting for verified execution.')}</p></div><div className="timer"><span>{timerLabel}</span><strong>{Math.floor(s.elapsed)} ms</strong></div></section>
    </section>
    {run && <PrEvidence run={run} />}<RehearsalReport report={s.rehearsals} />
    <footer>Local execution uses temporary directories, a scrubbed environment, timeouts, and Node permission flags. These controls reduce risk but are not a complete security sandbox.</footer>
  </main>;
}
