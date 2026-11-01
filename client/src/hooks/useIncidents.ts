import { useCallback, useEffect, useState } from 'react';
import { IncidentDetail, IncidentStatus, IncidentSummary } from '../types';
import { approveRollback, getIncident, listIncidents } from '../services/incident.api';

const LIST_POLL_MS = 1500;
const DETAIL_POLL_MS = 700;

export const isActive = (status: IncidentStatus) => status !== 'RESOLVED' && status !== 'FAILED';

/**
 * Live view of incidents stored by the backend.
 * The list is polled to catch new crashes. The open incident is polled quickly while it is
 * still being worked on, then left alone once it is resolved.
 */
export function useIncidents() {
  const [list, setList] = useState<IncidentSummary[]>([]);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  // null means "follow the newest incident"
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const currentId = pinnedId ?? list[0]?.id ?? null;

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const rows = await listIncidents();
        if (stopped) return;
        setList(rows);
        setOnline(true);
      } catch {
        if (!stopped) setOnline(false);
      } finally {
        if (!stopped) setLoaded(true);
      }
    };
    load();
    const timer = setInterval(load, LIST_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  const detailActive = !detail || detail.id !== currentId || isActive(detail.status);

  useEffect(() => {
    if (!currentId) {
      setDetail(null);
      return;
    }
    let stopped = false;
    const load = async () => {
      try {
        const next = await getIncident(currentId);
        if (!stopped) setDetail(next);
      } catch {
        // The list poll reports connectivity; keep showing the last good detail.
      }
    };
    load();
    if (!detailActive) return () => { stopped = true; };
    const timer = setInterval(load, DETAIL_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [currentId, detailActive]);

  const approve = useCallback(async () => {
    if (!currentId) return;
    await approveRollback(currentId);
    setDetail(await getIncident(currentId));
  }, [currentId]);

  // Only expose a detail that belongs to the incident being shown.
  const shown = detail && detail.id === currentId ? detail : null;

  return {
    list,
    detail: shown,
    currentId,
    pinnedId,
    pinIncident: setPinnedId,
    online,
    loaded,
    approve,
  };
}
