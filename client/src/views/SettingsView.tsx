import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { Health } from '../types';
import { API_BASE, getHealth } from '../services/incident.api';
import { Badge, CardHeader, PageTitle } from '../components/ui';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  online: boolean;
}

const Row: React.FC<{ title: string; hint: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-muted">{hint}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onSetTheme, online }) => {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let stopped = false;
    getHealth()
      .then((h) => !stopped && setHealth(h))
      .catch(() => !stopped && setHealth(null));
    return () => {
      stopped = true;
    };
  }, [online]);

  return (
    <div className="space-y-6">
      <PageTitle title="Settings" subtitle="Appearance and the state of the connected services." />

      <section className="card">
        <CardHeader title="Appearance" />
        <Row title="Theme" hint="Light for bright rooms, dark for night shifts.">
          <div className="inline-flex rounded-md border border-line p-0.5" role="radiogroup" aria-label="Theme">
            {(['light', 'dark'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => onSetTheme(t)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  theme === t ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="card">
        <CardHeader title="Connections" hint="Read from the Blinkfix API." />
        <div className="divide-y divide-line">
          <Row title="Blinkfix API" hint={API_BASE}>
            <Badge tone={online ? 'ok' : 'bad'}>{online ? 'Connected' : 'Unreachable'}</Badge>
          </Row>
          {health && (
            <>
              <Row
                title="Mode"
                hint={health.demo_mode ? 'Pull requests and Slack messages are simulated.' : 'Pull requests and Slack messages are real.'}
              >
                <Badge tone={health.demo_mode ? 'warn' : 'ok'}>{health.demo_mode ? 'Demo mode' : 'Live'}</Badge>
              </Row>
              <Row
                title="AI model"
                hint={health.cerebras.configured ? 'Runs the investigation agents.' : 'No API key set, so the built-in demo agents are used.'}
              >
                <Badge tone={health.cerebras.configured ? 'ok' : 'neutral'}>{health.cerebras.model}</Badge>
              </Row>
              <Row
                title="GitHub"
                hint={health.github.configured ? 'Opens draft pull requests with the proposed fix.' : 'No token set, so pull requests are simulated.'}
              >
                <Badge tone={health.github.configured ? 'ok' : 'neutral'}>{health.github.repo}</Badge>
              </Row>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
