import React from 'react';
import { Check } from 'lucide-react';
import { stageIndex } from './ui';
import { IncidentStatus } from '../types';

const STAGES = ['Detect', 'Investigate', 'Mitigate', 'Repair', 'Validate', 'Deliver'];

/** The six-stage flow every incident moves through. */
export const Stepper: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const current = stageIndex(status);

  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Incident progress">
      {STAGES.map((label, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li key={label} className="min-w-0">
            <div className="flex items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  done
                    ? 'border-ok bg-ok text-white dark:text-bg'
                    : active
                      ? 'step-working border-accent bg-accent text-white dark:text-bg'
                      : 'border-line bg-surface text-faint'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`ml-1 h-0.5 flex-1 rounded-full ${i === STAGES.length - 1 ? 'opacity-0' : done ? 'bg-ok' : 'bg-line'}`} />
            </div>
            <p
              className={`mt-2 truncate text-xs ${
                active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-faint'
              }`}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
};
