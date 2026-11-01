import { useEffect, useRef, useState } from 'react';
import { fetchFixture, fetchIncident, fetchRehearsals, fetchSetupStatus, simulateOutage, subscribeToIncidentStream, terminal } from '../services/incident.api';
import type { ConnectionStatus, ExecutionMode, IncidentState, RehearsalReport, ScenarioId, SetupStatus } from '../types';

export function useSimulation() {
  const [scenario, setScenario] = useState<ScenarioId>('payments-typeerror');
  const [mode, setMode] = useState<ExecutionMode>('fixture');
  const [publish, setPublish] = useState(false);
  const [source, setSource] = useState('');
  const [contract, setContract] = useState('');
  const [run, setRun] = useState<IncidentState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus>('closed');
  const [rehearsals, setRehearsals] = useState<RehearsalReport | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [now, setNow] = useState(Date.now());
  const close = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const busy = pending || Boolean(run && !terminal.has(run.status));

  function applyState(state: IncidentState) {
    setRun(previous => previous?.id === state.id && previous.revision >= state.revision ? previous : state);
    if (terminal.has(state.status)) {
      setPublish(false);
      fetchRehearsals().then(setRehearsals).catch(() => undefined);
    }
  }

  function attach(id: string, token: number) {
    close.current?.();
    close.current = subscribeToIncidentStream(id, state => {
      if (generation.current !== token) return;
      applyState(state); setError('');
    }, message => { if (generation.current === token) setError(message); },
    status => { if (generation.current === token) setConnection(status); });
  }

  useEffect(() => {
    const token = ++generation.current;
    const id = localStorage.getItem('blinkfix-incident');
    Promise.allSettled([fetchFixture(), fetchRehearsals(), fetchSetupStatus(), id ? fetchIncident(id) : Promise.resolve(null)]).then(([fixture, report, health, restored]) => {
      if (token !== generation.current) return;
      if (fixture.status === 'fulfilled') { setSource(fixture.value.source); setContract(fixture.value.contract); }
      else setError(`Fixture unavailable: ${String(fixture.reason)}`);
      if (report.status === 'fulfilled') setRehearsals(report.value);
      if (health.status === 'fulfilled') setSetup(health.value);
      else setError(previous => previous || `Setup status unavailable: ${String(health.reason)}`);
      if (restored.status === 'fulfilled' && restored.value) {
        const state = restored.value;
        applyState(state); setScenario(state.scenario_id); setMode(state.mode); setSource(state.source); setPublish(false);
        if (!terminal.has(state.status)) attach(state.id, token);
      } else if (id) localStorage.removeItem('blinkfix-incident');
      setLoading(false);
    });
    return () => { generation.current++; close.current?.(); };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, [busy]);

  async function triggerOutage() {
    if (busy) return;
    const token = ++generation.current;
    close.current?.(); setError(''); setRun(null); setPending(true); setConnection('connecting');
    try {
      const result = await simulateOutage({ requestId: crypto.randomUUID(), scenarioId: scenario, mode, publish, source });
      localStorage.setItem('blinkfix-incident', result.incident_id);
      const state = await fetchIncident(result.incident_id);
      if (token !== generation.current) return;
      applyState(state);
      if (!terminal.has(state.status)) attach(result.incident_id, token);
    } catch (cause) {
      if (token === generation.current) { setError(String(cause)); setConnection('disconnected'); }
    } finally { if (token === generation.current) setPending(false); }
  }

  function resetSimulation() {
    generation.current++; close.current?.(); setRun(null); setError(''); setPublish(false); setConnection('closed');
    localStorage.removeItem('blinkfix-incident');
  }

  const elapsed = run ? (terminal.has(run.status) ? run.duration_ms : Math.max(0, now - Date.parse(run.started_at))) : 0;
  return { scenario, setScenario, mode, setMode, publish, setPublish, source, setSource, contract, run,
    error, loading, connection, busy, elapsed, rehearsals, setup, triggerOutage, resetSimulation };
}
