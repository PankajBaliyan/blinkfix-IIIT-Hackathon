import { useEffect, useRef, useState } from 'react';
import { fetchFixture, fetchIncident, fetchRehearsals, fetchSetupStatus, simulateOutage, subscribeToIncidentStream, terminal } from '../services/incident.api';

export function useSimulation() {
  const [scenario, setScenario] = useState('payments-typeerror');
  const [mode, setMode] = useState('live');
  const [publish, setPublish] = useState(false);
  const [source, setSource] = useState('');
  const [contract, setContract] = useState('');
  const [run, setRun] = useState<any>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [rehearsals, setRehearsals] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const close = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const busy = pending || !!(run && !terminal.has(run.status));

  function applyState(state: any) {
    setRun((previous: any) => previous?.id === state.id && previous.revision > state.revision ? previous : state);
    if (terminal.has(state.status)) {
      setPublish(false);
      fetchRehearsals().then(setRehearsals).catch(() => {});
    }
  }

  function attach(id: string, token: number) {
    close.current?.();
    close.current = subscribeToIncidentStream(id, state => {
      if (generation.current !== token) return;
      applyState(state); setError('');
    }, message => { if (generation.current === token) setError(message); });
  }

  useEffect(() => {
    const token = ++generation.current;
    fetchFixture().then(f => {
      if (token !== generation.current) return;
      setSource(previous => previous || f.source); setContract(f.contract);
    }).catch(e => { if (token === generation.current) setError(String(e)); });
    fetchRehearsals().then(setRehearsals).catch(() => {});
    fetchSetupStatus().then(setSetup).catch(e => {
      if (token === generation.current) setError(`Setup status unavailable: ${String(e)}`);
    });
    const id = localStorage.getItem('blinkfix-incident');
    if (id) fetchIncident(id).then(state => {
      if (token !== generation.current) return;
      applyState(state); setScenario(state.scenario_id); setMode(state.mode);
      setSource(state.source); setPublish(false);
      if (!terminal.has(state.status)) attach(id, token);
    }).catch(e => { if (token === generation.current) setError(String(e)); });
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
    close.current?.(); setError(''); setRun(null); setPending(true);
    try {
      const result = await simulateOutage({ scenarioId: scenario, mode, publish, source });
      localStorage.setItem('blinkfix-incident', result.incident_id);
      const state = await fetchIncident(result.incident_id);
      if (token !== generation.current) return;
      applyState(state);
      if (!terminal.has(state.status)) attach(result.incident_id, token);
    } catch (e) { if (token === generation.current) setError(String(e)); }
    finally { if (token === generation.current) setPending(false); }
  }
  function resetSimulation() {
    generation.current++; close.current?.(); setRun(null); setError(''); setPublish(false);
    localStorage.removeItem('blinkfix-incident');
  }
  const elapsed = run ? (terminal.has(run.status) ? run.duration_ms : Math.max(0, now - Date.parse(run.started_at))) : 0;
  return { scenario, setScenario, mode, setMode, publish, setPublish, source, setSource,
    contract, run, error, busy, elapsed, rehearsals, setup, triggerOutage, resetSimulation };
}
