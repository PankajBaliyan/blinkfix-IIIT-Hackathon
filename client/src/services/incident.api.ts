const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8000';
export const terminal = new Set(['RESOLVED', 'FAILED', 'MITIGATED', 'VALIDATED', 'PUBLISH_FAILED']);

async function json(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json();
}
export const fetchFixture = () => json('/api/fixture');
export const fetchSetupStatus = () => json('/api/health');
export const simulateOutage = (request: any) => json('/api/incidents/simulate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
});
export const fetchIncident = (id: string) => json(`/api/incidents/${encodeURIComponent(id)}`);
export const fetchRehearsals = () => json('/api/incidents/reports/rehearsals/live?limit=5');

export function subscribeToIncidentStream(id: string, onState: (state: any) => void,
                                          onError: (message: string) => void) {
  const stream = new EventSource(`${API_BASE}/api/incidents/${encodeURIComponent(id)}/stream`);
  const types = ['incident_started', 'baseline_completed', 'agent_started', 'agent_progress', 'agent_completed',
    'repair_started', 'validation_started', 'patch_verified', 'mitigation_ready',
    'incident_completed', 'incident_failed', 'publishing_failed'];
  let lastSequence = 0;
  for (const type of types) stream.addEventListener(type, (event) => {
    const message = event as MessageEvent;
    const sequence = Number(message.lastEventId);
    if (sequence <= lastSequence) return;
    lastSequence = sequence;
    const state = JSON.parse(message.data);
    onState(state);
    if (terminal.has(state.status)) stream.close();
  });
  stream.onerror = async () => {
    // EventSource reconnects automatically with Last-Event-ID. Snapshot recovery
    // also handles a terminal event lost during disconnect.
    try {
      const state = await fetchIncident(id);
      onState(state);
      if (terminal.has(state.status)) stream.close();
      else onError('Event stream interrupted; reconnecting and recovering saved state.');
    } catch (error) { onError(String(error)); }
  };
  return () => stream.close();
}
