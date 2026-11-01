import React from 'react';
import {
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Server,
  Layers,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { Scenario, IncidentStatus } from '../types';

interface HeaderProps {
  scenarios: Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  status: IncidentStatus;
  activeScenario: Scenario;
  onTrigger: () => void;
  onReset: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  status,
  activeScenario,
  onTrigger,
  onReset,
  muted,
  onToggleMute,
}) => {
  const isRunning = status !== 'STANDBY' && status !== 'RESOLVED' && status !== 'FAILED';

  return (
    <header className="border-b border-obsidian-700/80 bg-obsidian-900/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-6 py-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-terminal-blue/20 to-terminal-purple/20 border border-terminal-blue/40 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <Zap className="w-5 h-5 text-terminal-blue" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-terminal-green"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-base text-white">
                BLINKFIX
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30">
                SWARM ZERO
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              AUTONOMOUS SRE INCIDENT RESPONSE // CEREBRAS INFERENCE ENGINE
            </p>
          </div>
        </div>

        {/* Center: Environment & Service Metadata */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-850/80 border border-obsidian-700/60 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Server className="w-3.5 h-3.5 text-terminal-blue" />
            <span className="text-white font-medium">{activeScenario.service}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{activeScenario.environment}</span>
          <span className="text-slate-600">|</span>
          <span className="text-terminal-green">{activeScenario.version}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">HEAD: {activeScenario.commitHead}</span>
        </div>

        {/* Right: Actions, Scenario Selector, and Trigger CTA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Scenario Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={isRunning}
              className="bg-obsidian-850 border border-obsidian-700/80 text-xs font-mono text-slate-200 rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:border-terminal-blue/60 transition disabled:opacity-50 cursor-pointer"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id} className="bg-obsidian-900 text-slate-200">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute Audio FX' : 'Mute Audio FX'}
            className="p-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-850 text-slate-400 hover:text-white hover:border-slate-600 transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-terminal-blue" />}
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={onReset}
            disabled={status === 'STANDBY'}
            title="Reset Simulation"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-obsidian-700/80 bg-obsidian-850 text-slate-300 hover:text-white text-xs font-mono hover:border-slate-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Hero Simulate Outage CTA Button */}
          <button
            onClick={onTrigger}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-xs font-semibold tracking-wide transition shadow-lg ${
              isRunning
                ? 'bg-terminal-amber/20 border border-terminal-amber/40 text-terminal-amber cursor-wait animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/50 shadow-red-950/40 hover:shadow-red-900/60 active:scale-95'
            }`}
          >
            <Zap className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
            <span>{isRunning ? 'AUTONOMOUS TRIAGE IN FLIGHT...' : '⚡ SIMULATE OUTAGE'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

