import React from 'react';
import { SourceSnippet } from '../types';

/** The lines around the failing line, read from the service's real source file. */
export const SourceView: React.FC<{ source: SourceSnippet }> = ({ source }) => (
  <pre className="scroll-slim overflow-x-auto rounded-md border border-line bg-sunken py-2 font-mono text-[13px] leading-6">
    {source.lines.map((text, i) => {
      const number = source.startLine + i;
      const failing = number === source.failingLine;
      return (
        <div
          key={number}
          className={`flex px-3 ${failing ? 'bg-bad-soft text-ink' : 'text-muted'}`}
          aria-label={failing ? `Failing line ${number}` : undefined}
        >
          <span aria-hidden className={`w-9 shrink-0 select-none text-right ${failing ? 'text-bad' : 'text-faint'}`}>{number}</span>
          <span aria-hidden className={`w-5 shrink-0 select-none text-center ${failing ? 'text-bad' : ''}`}>{failing ? '>' : ''}</span>
          <span className="whitespace-pre">{text || ' '}</span>
        </div>
      );
    })}
  </pre>
);
