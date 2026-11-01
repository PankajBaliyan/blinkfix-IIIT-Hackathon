import { useCallback, useEffect, useState } from 'react';
import { GithubStatus } from '../types';
import { disconnectGithub, getGithubStatus } from '../services/incident.api';

export interface GithubReturn {
  result: 'connected' | 'error';
  reason: string | null;
}

/** Reads the result GitHub left in the address bar after the login, then cleans the address. */
function readLoginResult(): GithubReturn | null {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('github');
  if (result !== 'connected' && result !== 'error') return null;
  const reason = params.get('reason');
  window.history.replaceState({}, '', window.location.pathname);
  return { result, reason };
}

export function useGithub() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loginResult] = useState<GithubReturn | null>(readLoginResult);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getGithubStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const disconnect = useCallback(async () => {
    await disconnectGithub();
    await refresh();
  }, [refresh]);

  return { status, loginResult, refresh, disconnect };
}
