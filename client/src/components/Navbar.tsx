import React from 'react';
import {
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Server,
  Menu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { Scenario, IncidentStatus } from '../types';
import { NavPage } from './Sidebar';
import { ThemeMode } from '../hooks/useTheme';

interface NavbarProps {
  currentPage: NavPage;
  scenarios: Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  status: IncidentStatus;
  activeScenario: Scenario;
  elapsedMs: number;
  formattedTime: string;
  onTrigger: () => void;
  onReset: () => void;
  muted: boolean;
  onToggleMute: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  status,
  activeScenario,
  elapsedMs,
  formattedTime,
  onTrigger,
  onReset,
  muted,
  onToggleMute,
  theme,
  onToggleTheme,
  onOpenMobileSidebar,
}) => {
  const isStandby = status === 'STANDBY';
  const isResolved = status === 'RESOLVED';
  const isRunning = !isStandby && !isResolved;

  const getPageTitle = (page: NavPage) => {
    switch (page) {
      case 'cockpit':
        return 'Live Incident Cockpit';
      case 'agents':
        return 'Autonomous Agent Swarm';
      case 'patches':
        return 'Speculative Patch Lab';
      case 'resolution':
        return 'PR & Slack Deployment Hub';
      case 'topology':
        return 'Microservices & Infra Topology';
      case 'history':
        return 'Incident History & MTTR Analytics';
      case 'settings':
        return 'Engine & Integration Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-obsidian-750/80 bg-obsidian-900/90 backdrop-blur-md px-3 sm:px-5 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg border border-obsidian-700 bg-obsidian-850 text-slate-300 hover:text-white"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="hidden sm:inline">Platform</span>
              <span className="hidden sm:inline text-slate-600">/</span>
              <span className="text-white font-semibold flex items-center gap-1.5">
                {getPageTitle(currentPage)}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
              <span>Service: <code className="text-terminal-blue font-semibold">{activeScenario.service}</code></span>
              <span className="text-slate-600">•</span>
              <span>Commit: <code className="text-slate-300">{activeScenario.commitHead}</code></span>
            </div>
          </div>
        </div>

        {/* Center: Global Floating Mini-Stopwatch */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-obsidian-950/80 border border-obsidian-700/80 font-mono text-xs shadow-inner">
          <Clock className={`w-3.5 h-3.5 ${
            isStandby ? 'text-slate-500' : isResolved ? 'text-terminal-green' : 'text-terminal-amber animate-spin'
          }`} />
          <span className="text-slate-400 text-[11px] uppercase">MTTR:</span>
          <span className={`font-bold tabular-nums tracking-wider ${
            isStandby ? 'text-slate-400' : isResolved ? 'text-terminal-green' : 'text-terminal-amber'
          }`}>
            {formattedTime}
          </span>
          <span className={`w-2 h-2 rounded-full ${
            isStandby ? 'bg-slate-600' : isResolved ? 'bg-terminal-green' : 'bg-terminal-amber animate-ping'
          }`} />
        </div>

        {/* Right: Controls, Theme Converter & Outage CTA */}
        <div className="flex items-center gap-2">
          {/* Scenario Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={isRunning}
              className="bg-obsidian-850 border border-obsidian-700 text-xs font-mono text-slate-200 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:border-terminal-blue/60 transition disabled:opacity-50 cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id} className="bg-obsidian-900 text-slate-200">
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Dark / Light Mode Converter Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Convert to Light Mode' : 'Convert to Dark Mode'}
            className="p-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-850 text-slate-400 hover:text-white hover:border-slate-600 transition"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-terminal-amber hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-terminal-blue hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute Audio FX' : 'Mute Audio FX'}
            className="p-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-850 text-slate-400 hover:text-white hover:border-slate-600 transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-terminal-blue" />}
          </button>

          {/* Reset Simulation Button */}
          <button
            onClick={onReset}
            disabled={status === 'STANDBY'}
            title="Reset Simulation"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-850 text-slate-300 hover:text-white text-xs font-mono hover:border-slate-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Simulate Outage CTA Button */}
          <button
            onClick={onTrigger}
            disabled={isRunning}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wide transition shadow-md shrink-0 ${
              isRunning
                ? 'bg-terminal-amber/20 border border-terminal-amber/40 text-terminal-amber cursor-wait animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/50 shadow-red-950/40 hover:shadow-red-900/60 active:scale-95'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
            <span className="hidden sm:inline">
              {isRunning ? 'TRIAGE ACTIVE...' : '⚡ SIMULATE OUTAGE'}
            </span>
            <span className="sm:hidden">
              {isRunning ? 'TRIAGING' : '⚡ OUTAGE'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
