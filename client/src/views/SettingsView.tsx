import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { Badge, CardHeader, PageTitle } from '../components/ui';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  muted: boolean;
  onToggleMute: () => void;
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

const Switch: React.FC<{ on: boolean; onChange: () => void; label: string }> = ({ on, onChange, label }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onChange}
    className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onSetTheme, muted, onToggleMute }) => (
  <div className="space-y-6">
    <PageTitle title="Settings" subtitle="Appearance, sound and connected tools." />

    <section className="card">
      <CardHeader title="Appearance" />
      <div className="divide-y divide-line">
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
        <Row title="Sound effects" hint="Play a short tone when an incident starts and when it is fixed.">
          <Switch on={!muted} onChange={onToggleMute} label="Sound effects" />
        </Row>
      </div>
    </section>

    <section className="card">
      <CardHeader title="Connected tools" hint="These are simulated while the app runs in demo mode." />
      <div className="divide-y divide-line">
        <Row title="Crash reports" hint="Receives alerts from your monitoring tool.">
          <Badge tone="ok">Connected</Badge>
        </Row>
        <Row title="GitHub" hint="Opens draft pull requests with the proposed fix.">
          <Badge tone="ok">Connected</Badge>
        </Row>
        <Row title="Slack" hint="Posts a summary to your incidents channel.">
          <Badge tone="ok">Connected</Badge>
        </Row>
        <Row title="AI model" hint="Runs the five investigation agents and writes the candidate fixes.">
          <Badge tone="neutral">Llama 3.3 70B</Badge>
        </Row>
      </div>
    </section>

    <section className="card">
      <CardHeader title="Demo mode" />
      <div className="px-5 py-4 text-sm text-muted">
        All data on screen is sample data. Nothing is sent to GitHub or Slack, and no real model is called.
      </div>
    </section>
  </div>
);
