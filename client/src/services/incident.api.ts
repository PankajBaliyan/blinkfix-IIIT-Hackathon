import { GithubStatus, Health, IncidentDetail, IncidentSummary } from '../types';

export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, init);
  if (!resp.ok) {
    // The API explains what went wrong in `detail`. Show that instead of a bare status code.
    let message = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {
      // Not JSON; keep the status text.
    }
    throw new Error(message);
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

export function getGithubStatus(): Promise<GithubStatus> {
  return request<GithubStatus>('/api/github/status');
}

export function disconnectGithub() {
  return request<{ connected: boolean }>('/api/github/disconnect', { method: 'POST' });
}

/** Where the browser goes to connect GitHub. GitHub sends it back to the app afterwards. */
export const GITHUB_LOGIN_URL = `${API_BASE}/api/github/login`;

export function openPullRequest(incidentId: string, patchId?: string) {
  return request<{ number: number; url: string; branch: string }>(`/api/incidents/${incidentId}/pull-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patchId: patchId ?? null }),
  });
}
