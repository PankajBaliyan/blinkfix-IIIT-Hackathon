import { Health, IncidentDetail, IncidentSummary } from '../types';

export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, init);
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as T;
}

export async function listIncidents(): Promise<IncidentSummary[]> {
  const data = await request<{ incidents: IncidentSummary[] }>('/api/incidents/');
  return data.incidents;
}

export function getIncident(id: string): Promise<IncidentDetail> {
  return request<IncidentDetail>(`/api/incidents/${id}`);
}

export function approveRollback(id: string, approvedBy = 'sre-engineer') {
  return request(`/api/incidents/${id}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });
}

export function getHealth(): Promise<Health> {
  return request<Health>('/api/health');
}
