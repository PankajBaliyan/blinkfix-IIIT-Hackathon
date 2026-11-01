import React, { useMemo } from 'react';

type Row = { kind: 'same' | 'add' | 'del'; text: string };

/** Line diff via longest common subsequence. Inputs are short files, so O(n*m) is fine. */
function diffLines(before: string, after: string): Row[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'same', text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: 'del', text: a[i++] });
    } else {
      rows.push({ kind: 'add', text: b[j++] });
    }
  }
  while (i < a.length) rows.push({ kind: 'del', text: a[i++] });
  while (j < b.length) rows.push({ kind: 'add', text: b[j++] });
  return rows;
}

const rowStyle = {
  same: 'text-muted',
  add: 'bg-ok-soft text-ink',
  del: 'bg-bad-soft text-ink',
};

const marker = { same: ' ', add: '+', del: '-' };

export const DiffView: React.FC<{ before: string; after: string }> = ({ before, after }) => {
  const rows = useMemo(() => diffLines(before, after), [before, after]);
  return (
    <pre className="scroll-slim overflow-x-auto rounded-md border border-line bg-sunken py-2 font-mono text-[13px] leading-6">
      {rows.map((r, i) => (
        <div key={i} className={`flex px-3 ${rowStyle[r.kind]}`}>
          <span aria-hidden className={`w-4 shrink-0 select-none ${r.kind === 'add' ? 'text-ok' : r.kind === 'del' ? 'text-bad' : 'text-faint'}`}>
            {marker[r.kind]}
          </span>
          <span className="whitespace-pre">{r.text || ' '}</span>
        </div>
      ))}
    </pre>
  );
};

export const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
  <pre className="scroll-slim overflow-x-auto rounded-md border border-line bg-sunken px-4 py-3 font-mono text-[13px] leading-6 text-ink">
    {code}
  </pre>
);
