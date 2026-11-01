import { useCallback, useEffect, useState } from 'react';
import { IncidentDetail, IncidentStatus, IncidentSummary } from '../types';
import { API_BASE, approveRollback, getIncident, listIncidents } from '../services/incident.api';

export const isActive = (status: IncidentStatus) => status !== 'RESOLVED' && status !== 'FAILED';

/** Puts an incident at the front of the list if it is new, or updates it in place. */
function upsert(list: IncidentSummary[], incident: IncidentSummary): IncidentSummary[] {
  const index = list.findIndex((i) => i.id === incident.id);
  if (index === -1) return [incident, ...list];
  const next = list.slice();
  next[index] = incident;
  return next;
}

/**
 * Live view of incidents stored by the backend.
 *
 * The list is loaded once, then the backend pushes every change over one event stream
 * (/api/events), so the page never polls. If the connection drops, the browser reconnects
 * by itself and the list is loaded again to catch anything that was missed.
 */
export function useIncidents() {
  const [list, setList] = useState<IncidentSummary[]>([]);
  const [details, setDetails] = useState<Record<string, IncidentDetail>>({});
  // null means "follow the newest incident"
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const currentId = pinnedId ?? list[0]?.id ?? null;

  useEffect(() => {
    let closed = false;
    const events = new EventSource(`${API_BASE}/api/events`);

    events.onopen = async () => {
      if (closed) return;
      setOnline(true);
      try {
        const rows = await listIncidents();
        if (!closed) setList(rows);
      } catch {
        // The stream is open; the next pushed update will fill the list in.
      } finally {
        if (!closed) setLoaded(true);
      }
    };

    events.onerror = () => {
      if (closed) return;
      setOnline(false);
      setLoaded(true);
    };

    events.addEventListener('incident_updated', (e) => {
      const incident = JSON.parse((e as MessageEvent).data) as IncidentDetail;
      setDetails((prev) => ({ ...prev, [incident.id]: incident }));
      setList((prev) => upsert(prev, incident));
    });

    return () => {
      closed = true;
      events.close();
    };
  }, []);

  // An older incident that was never pushed in this session (for example one opened from
  // History) is fetched once.
  const hasDetail = currentId !== null && currentId in details;
  useEffect(() => {
    if (!currentId || hasDetail) return;
    let stopped = false;
    getIncident(currentId)
      .then((incident) => {
        if (!stopped) setDetails((prev) => ({ ...prev, [incident.id]: incident }));
      })
      .catch(() => {
        // Connectivity is reported by the stream.
      });
    return () => {
      stopped = true;
    };
  }, [currentId, hasDetail]);

  const approve = useCallback(async () => {
    if (!currentId) return;
    // The backend pushes the updated incident, which refreshes the page.
    await approveRollback(currentId);
  }, [currentId]);

  return {
    list,
    detail: currentId ? details[currentId] ?? null : null,
    currentId,
    pinnedId,
    pinIncident: setPinnedId,
    online,
    loaded,
    approve,
  };
}
