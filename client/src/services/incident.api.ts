const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

export async function simulateOutage(scenarioId: string, customCrash?: any) {
  const resp = await fetch(`${API_BASE}/api/incidents/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, customCrash }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to simulate outage: ${resp.statusText}`);
  }
  return await resp.json();
}

export async function fetchIncident(incidentId: string) {
  const resp = await fetch(`${API_BASE}/api/incidents/${incidentId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch incident: ${resp.statusText}`);
  }
  return await resp.json();
}

export async function approveRollback(incidentId: string, approvedBy = 'sre-engineer') {
  const resp = await fetch(`${API_BASE}/api/incidents/${incidentId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to approve rollback: ${resp.statusText}`);
  }
  return await resp.json();
}

export function subscribeToIncidentStream(incidentId: string, onEvent: (eventType: string, data: any) => void) {
  const es = new EventSource(`${API_BASE}/api/incidents/${incidentId}/stream`);

  es.addEventListener('incident_started', (e: MessageEvent) => onEvent('incident_started', JSON.parse(e.data)));
  es.addEventListener('agent_started', (e: MessageEvent) => onEvent('agent_started', JSON.parse(e.data)));
  es.addEventListener('agent_completed', (e: MessageEvent) => onEvent('agent_completed', JSON.parse(e.data)));
  es.addEventListener('mitigation_ready', (e: MessageEvent) => onEvent('mitigation_ready', JSON.parse(e.data)));
  es.addEventListener('repair_started', (e: MessageEvent) => onEvent('repair_started', JSON.parse(e.data)));
  es.addEventListener('patch_verified', (e: MessageEvent) => onEvent('patch_verified', JSON.parse(e.data)));
  es.addEventListener('pr_created', (e: MessageEvent) => onEvent('pr_created', JSON.parse(e.data)));
  es.addEventListener('incident_completed', (e: MessageEvent) => onEvent('incident_completed', JSON.parse(e.data)));

  es.onerror = () => {
    es.close();
  };

  return () => es.close();
}
