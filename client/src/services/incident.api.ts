import type { ConnectionStatus, FixtureResponse, IncidentState, RehearsalReport, RunRequest, SetupStatus, SimulateResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
export const terminal = new Set<IncidentState['status']>(['RESOLVED', 'FAILED', 'MITIGATED', 'VALIDATED', 'PUBLISH_FAILED']);

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export const fetchFixture = () => requestJson<FixtureResponse>('/api/fixture');
export const fetchSetupStatus = () => requestJson<SetupStatus>('/api/health');
export const simulateOutage = (request: RunRequest) => requestJson<SimulateResponse>('/api/incidents/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
export const fetchIncident = (id: string) => requestJson<IncidentState>(`/api/incidents/${encodeURIComponent(id)}`);
export const fetchRehearsals = () => requestJson<RehearsalReport>('/api/incidents/reports/rehearsals/live?limit=5');

export function subscribeToIncidentStream(id: string, onState: (state: IncidentState) => void, onError: (message: string) => void, onConnection: (status: ConnectionStatus) => void) {
  onConnection('connecting');
  const stream = new EventSource(`${API_BASE}/api/incidents/${encodeURIComponent(id)}/stream`);
  const types = ['incident_started', 'baseline_completed', 'agent_started', 'agent_progress', 'agent_completed', 'repair_started', 'validation_started', 'patch_verified', 'mitigation_ready', 'incident_completed', 'incident_failed', 'publishing_failed'];
  let lastSequence = 0;
  stream.onopen = () => onConnection('connected');
  for (const type of types) stream.addEventListener(type, (event) => {
    const message = event as MessageEvent<string>;
    const sequence = Number(message.lastEventId);
    if (sequence <= lastSequence) return;
    lastSequence = sequence;
    try {
      const state = JSON.parse(message.data) as IncidentState;
      onState(state);
      if (terminal.has(state.status)) { stream.close(); onConnection('closed'); }
    } catch { onError('The backend sent a malformed event. Recovering from the saved snapshot.'); }
  });
  stream.onerror = async () => {
    onConnection('disconnected');
    try {
      const state = await fetchIncident(id); onState(state);
      if (terminal.has(state.status)) { stream.close(); onConnection('closed'); }
      else onError('Event stream interrupted. Reconnecting from durable backend state.');
    } catch { onError('Backend disconnected. This run will recover from durable state after the service returns.'); }
  };
  return () => { stream.close(); onConnection('closed'); };
}
