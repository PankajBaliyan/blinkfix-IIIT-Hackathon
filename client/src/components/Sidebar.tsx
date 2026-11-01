import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  FileCode,
  GitPullRequest,
  Network,
  History,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Cpu,
  X,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { IncidentStatus, Scenario } from '../types';
import { ThemeMode } from '../hooks/useTheme';

export type NavPage =
  | 'cockpit'
  | 'agents'
  | 'patches'
  | 'resolution'
  | 'topology'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  status: IncidentStatus;
  activeScenario: Scenario;
  elapsedMs: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  status,
  activeScenario,
  elapsedMs,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  theme,
  onToggleTheme,
}) => {
  const isStandby = status === 'STANDBY';
  const isResolved = status === 'RESOLVED';
  const isRunning = !isStandby && !isResolved;

  const navItems = [
    {
      id: 'cockpit' as NavPage,
      label: 'Live Cockpit',
      icon: LayoutDashboard,
      badge: isRunning ? 'LIVE' : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse',
    },
    {
      id: 'agents' as NavPage,
      label: 'Agent Swarm',
      icon: Terminal,
      badge: '5 Agents',
      badgeColor: isRunning ? 'bg-terminal-blue/20 text-terminal-blue border-terminal-blue/40 animate-pulse' : 'bg-obsidian-800 text-slate-400 border-obsidian-700',
    },
    {
      id: 'patches' as NavPage,
      label: 'Patch Lab',
      icon: FileCode,
      badge: status === 'SPECULATIVE_REPAIR' || status === 'VALIDATING' || isResolved ? '5 Patches' : undefined,
      badgeColor: 'bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/40',
    },
    {
      id: 'resolution' as NavPage,
      label: 'PR & Deployment',
      icon: GitPullRequest,
      badge: isResolved ? 'PR #105' : undefined,
      badgeColor: 'bg-terminal-green/20 text-terminal-green border-terminal-green/40',
    },
    {
      id: 'topology' as NavPage,
      label: 'Service Topology',
      icon: Network,
      badge: activeScenario.infraStatus.some(s => s.status !== 'HEALTHY') ? 'ALERT' : undefined,
      badgeColor: 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/40',
    },
    {
      id: 'history' as NavPage,
      label: 'Incident History',
      icon: History,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'settings' as NavPage,
      label: 'Engine Settings',
      icon: Settings,
      badge: 'Cerebras',
      badgeColor: 'bg-obsidian-800 text-slate-400 border-obsidian-700',
    },
  ];

  const handleSelectPage = (page: NavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-obsidian-900 border-r border-obsidian-750/80 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-obsidian-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-terminal-blue/20 to-terminal-purple/20 border border-terminal-blue/40 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
            <Zap className="w-5 h-5 text-terminal-blue" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStandby ? 'bg-terminal-green' : isResolved ? 'bg-terminal-green' : 'bg-red-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStandby ? 'bg-terminal-green' : isResolved ? 'bg-terminal-green' : 'bg-red-500'
              }`} />
            </span>
          </div>

          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold tracking-wider text-sm text-white">
                  BLINKFIX
                </span>
                <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30">
                  SWARM ZERO
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                Autonomous SRE Engine
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-obsidian-800 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Incident Status Widget */}
      {!isCollapsed && (
        <div className="p-3 mx-3 my-3 rounded-lg border text-xs font-mono transition-all duration-300 relative overflow-hidden bg-obsidian-950/70 border-obsidian-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase text-slate-400 tracking-wider">
              System State
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              isStandby
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : isResolved
                ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/40'
                : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            }`}>
              {isStandby ? 'NOMINAL' : isResolved ? 'RECOVERED' : 'P0 ACTIVE'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {isStandby ? (
              <ShieldCheck className="w-4 h-4 text-terminal-green shrink-0" />
            ) : isResolved ? (
              <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            ) : (
              <Flame className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
            )}
            <div className="truncate">
              <div className="text-[11px] font-medium text-slate-200 truncate">
                {activeScenario.service}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isStandby
                  ? 'All 5 agents armed'
                  : isResolved
                  ? `MTTR: ${(elapsedMs / 1000).toFixed(2)}s`
                  : 'Parallel triage in flight'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {!isCollapsed && (
          <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-xs transition-all group ${
                isActive
                  ? 'bg-terminal-blue/15 text-white border border-terminal-blue/40 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850/80 border border-transparent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-terminal-blue'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Engine Telemetry & Theme Converter Switch */}
      <div className="p-3 border-t border-obsidian-800 text-[11px] font-mono text-slate-400 space-y-2">
        {!isCollapsed ? (
          <>
            {/* Dark / Light Mode Converter Switch */}
            <div className="flex items-center justify-between p-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono">
              <span className="text-slate-400 pl-2">Theme Mode</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleTheme}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                    theme === 'dark'
                      ? 'bg-obsidian-800 text-terminal-cyan font-bold border border-terminal-cyan/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Dark</span>
                </button>
                <button
                  onClick={onToggleTheme}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                    theme === 'light'
                      ? 'bg-obsidian-800 text-terminal-amber font-bold border border-terminal-amber/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            <div className="p-2 rounded bg-obsidian-950/80 border border-obsidian-800 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-terminal-cyan" />
                  <span>Inference Engine</span>
                </span>
                <span className="flex items-center gap-1 text-terminal-green font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-terminal-green inline-block animate-ping" />
                  ONLINE
                </span>
              </div>
              <div className="text-slate-200 text-[10px] font-semibold truncate">
                Cerebras CS-3 // Llama 3.3 70B
              </div>
              <div className="text-slate-400 text-[9px]">
                Throughput: 1,000+ tok/s
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] px-1 text-slate-400">
              <span>{activeScenario.environment}</span>
              <span className="text-terminal-green">{activeScenario.version}</span>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-center">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg bg-obsidian-950 text-slate-400 hover:text-white mx-auto block"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-terminal-amber" /> : <Moon className="w-3.5 h-3.5 text-terminal-blue" />}
            </button>
            <div className="flex justify-center" title="Cerebras CS-3 Online">
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-green" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 overflow-hidden" style={{ width: isCollapsed ? '4rem' : '16rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full bg-obsidian-900 shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
