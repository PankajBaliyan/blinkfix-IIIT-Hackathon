export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function clockTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
}

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}

export function logTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** "PR #12" when the change came from a pull request, otherwise "commit abc1234". */
export function commitLabel(commit: { pr_number: number | null; commit_hash: string }): string {
  return commit.pr_number ? `PR #${commit.pr_number}` : `commit ${commit.commit_hash}`;
}
