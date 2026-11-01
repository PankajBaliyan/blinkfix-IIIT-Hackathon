import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  GitBranch,
  MessageSquare,
  Volume2,
  ShieldCheck,
  Save,
  Check,
  Zap,
  Radio,
  Sliders,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { Scenario } from '../types';
import { ThemeMode } from '../hooks/useTheme';

interface SettingsViewProps {
  scenario: Scenario;
  muted: boolean;
  onToggleMute: () => void;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  scenario,
  muted,
  onToggleMute,
  theme,
  onSetTheme,
}) => {
  const [model, setModel] = useState('llama3.3-70b');
  const [owner, setOwner] = useState('swarm-zero-demo');
  const [repo, setRepo] = useState(scenario.service);
  const [slackChannel, setSlackChannel] = useState('#alerts-prod-sre');
  const [demoMode, setDemoMode] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-terminal-cyan" />
            <h2 className="font-mono text-base sm:text-lg font-bold text-white">
              Blinkfix // Swarm Zero Configuration
            </h2>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Engine inference parameters, API tokens, GitHub repository webhooks, and alert routing.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-terminal-blue hover:bg-sky-400 text-obsidian-950 font-mono text-xs font-bold transition shadow"
        >
          {isSaved ? <Check className="w-4 h-4 text-obsidian-950" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Settings Saved' : 'Save Config'}</span>
        </button>
      </div>

      {/* Theme Converter & Display Preferences */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-obsidian-800 pb-3">
          <Palette className="w-4 h-4 text-terminal-purple" />
          <h3 className="font-mono text-sm font-bold text-white">
            Interface Theme & Appearance Converter
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <button
            onClick={() => onSetTheme('dark')}
            className={`p-4 rounded-xl border text-left transition flex items-start gap-3 relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-obsidian-850 border-terminal-cyan ring-1 ring-terminal-cyan/40 shadow-lg'
                : 'bg-obsidian-950/60 border-obsidian-800 hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-terminal-cyan shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Dark Theme (Obsidian)</span>
                {theme === 'dark' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Cyberpunk command center aesthetic with ultra-dark obsidian cards, glow status orbs, and neon meters.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSetTheme('light')}
            className={`p-4 rounded-xl border text-left transition flex items-start gap-3 relative overflow-hidden ${
              theme === 'light'
                ? 'bg-obsidian-850 border-terminal-amber ring-1 ring-terminal-amber/40 shadow-lg'
                : 'bg-obsidian-950/60 border-obsidian-800 hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-terminal-amber shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Light Theme (Daylight)</span>
                {theme === 'light' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/40 font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Crisp enterprise daylight palette with high-contrast slate surfaces, clear typography, and bright telemetry.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Cerebras Engine Configuration */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-obsidian-800 pb-3">
          <Cpu className="w-4 h-4 text-terminal-cyan" />
          <h3 className="font-mono text-sm font-bold text-white">
            AI Inference Subsystem (Cerebras Cloud)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Target Coding Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-terminal-blue"
            >
              <option value="llama3.3-70b">Llama 3.3 70B (Recommended - 1,000+ tok/s)</option>
              <option value="llama3.1-8b">Llama 3.1 8B (Sub-200ms Ultra-Fast)</option>
              <option value="qwen-2.5-coder-32b">Qwen 2.5 Coder 32B</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Swarm Parallel Concurrency</label>
            <input
              type="text"
              disabled
              value="5 Concurrent Prompt Workers"
              className="w-full bg-obsidian-950/60 border border-obsidian-800 text-slate-400 text-xs rounded-lg px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Inference API Base</label>
            <input
              type="text"
              disabled
              value="https://api.cerebras.ai/v1"
              className="w-full bg-obsidian-950/60 border border-obsidian-800 text-slate-400 text-xs rounded-lg px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Operating Mode</label>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`px-3 py-1.5 rounded-lg border font-bold transition ${
                  demoMode
                    ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/40'
                    : 'bg-obsidian-800 text-slate-400 border-obsidian-700'
                }`}
              >
                {demoMode ? '✓ Demo Mode (Zero Key Dependency)' : 'Live API Key Mode'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-obsidian-800 pb-3">
          <GitBranch className="w-4 h-4 text-terminal-purple" />
          <h3 className="font-mono text-sm font-bold text-white">
            GitHub Octokit Repository Integration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Repository Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-terminal-blue"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Target Repository</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-terminal-blue"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">PR Branch Prefix</label>
            <input
              type="text"
              disabled
              value="swarm-zero/fix/"
              className="w-full bg-obsidian-950/60 border border-obsidian-800 text-slate-400 text-xs rounded-lg px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Pull Request Type</label>
            <input
              type="text"
              disabled
              value="Draft Pull Request (Requires SRE Review)"
              className="w-full bg-obsidian-950/60 border border-obsidian-800 text-slate-400 text-xs rounded-lg px-3 py-2 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Slack & Audio Preferences */}
      <div className="p-5 rounded-xl border border-obsidian-750 bg-obsidian-900/90 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-obsidian-800 pb-3">
          <MessageSquare className="w-4 h-4 text-terminal-green" />
          <h3 className="font-mono text-sm font-bold text-white">
            Notifications & Sound Effects
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Slack Channel Broadcast</label>
            <input
              type="text"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-terminal-blue"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Synthesized Web Audio Soundscape</label>
            <button
              onClick={onToggleMute}
              className={`w-full py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition ${
                !muted
                  ? 'bg-terminal-blue/20 text-terminal-blue border-terminal-blue/40'
                  : 'bg-obsidian-800 text-slate-400 border-obsidian-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{muted ? 'Audio Muted' : 'Audio FX Enabled'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
