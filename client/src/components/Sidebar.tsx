import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Menu, Moon, Search, Settings, Sun, Wrench, X, Zap } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { IncidentStatus } from '../types';
import { Badge, statusInfo } from './ui';

export type Page = 'incident' | 'investigation' | 'fix' | 'history' | 'settings';

const PAGES: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'incident', label: 'Incident', icon: AlertTriangle },
  { id: 'investigation', label: 'Investigation', icon: Search },
  { id: 'fix', label: 'Fix', icon: Wrench },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  status: IncidentStatus;
  formattedTime: string;
}

const Brand: React.FC = () => (
  <div className="flex items-center gap-2.5">
    <span className="logo-mark">
      <Zap size={19} strokeWidth={2.5} fill="currentColor" />
    </span>
    <span className="text-lg font-semibold tracking-tight">Blinkfix</span>
  </div>
);

const Panel: React.FC<SidebarProps & { onPick: () => void }> = ({
  page,
  onNavigate,
  theme,
  onSetTheme,
  status,
  formattedTime,
  onPick,
}) => {
  const info = statusInfo(status);
  const idle = status === 'STANDBY';

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-5">
        <Brand />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {PAGES.map(({ id, label, icon: Icon }) => {
          const active = id === page;
          return (
            <button
              key={id}
              onClick={() => {
                onNavigate(id);
                onPick();
              }}
              aria-current={active ? 'page' : undefined}
              className="nav-item"
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        <div className="rounded-md bg-sunken px-3.5 py-3" aria-live="polite">
          <Badge tone={info.tone}>{info.label}</Badge>
          {!idle && <p className="tabular mt-2 font-mono text-lg">{formattedTime}</p>}
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5" role="radiogroup" aria-label="Theme">
          {(['light', 'dark'] as ThemeMode[]).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={theme === t}
              onClick={() => onSetTheme(t)}
              className={`inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                theme === t ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Desktop: fixed column on the left */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-surface lg:block">
        <Panel {...props} onPick={() => {}} />
      </aside>

      {/* Mobile: slim bar with a menu button that opens the same panel */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Brand />
        <button className="btn h-9 w-9 !p-0" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-64 max-w-[85%] border-r border-line bg-surface shadow-xl">
            <button
              className="btn absolute right-3 top-4 h-8 w-8 !p-0"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
            <Panel {...props} onPick={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
};
