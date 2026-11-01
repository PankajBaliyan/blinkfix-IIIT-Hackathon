import { useState, useCallback, useRef } from 'react';
import { SCENARIOS } from '../data/mockScenarios';
import { Scenario, IncidentStatus, AgentInfo, CandidatePatch } from '../types';
import { useStopwatch } from './useStopwatch';
import { useAudioFX } from './useAudioFX';

export function useSimulation() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);
  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const [status, setStatus] = useState<IncidentStatus>('STANDBY');
  const [isRollbackApproved, setIsRollbackApproved] = useState(false);
  const [activePatchId, setActivePatchId] = useState<string>('patch-a');
  const [validationProgress, setValidationProgress] = useState<number>(0);

  const stopwatch = useStopwatch();
  const audio = useAudioFX();
  const timerTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Default agent configs
  const getInitialAgents = (scenario: Scenario): AgentInfo[] => [
    {
      id: 'trace-analyst',
      name: 'Trace Analyst',
      role: 'Stack Frames & Broken Line Localization',
      icon: 'Bug',
      latencyMs: 380,
      status: 'IDLE',
      summary: 'Awaiting crash payload...',
      logs: ['[00:00.000] Standby. Trace listener active.'],
    },
    {
      id: 'git-detective',
      name: 'Git Detective',
      role: 'Deployment Delta & Git Blame Attribution',
      icon: 'GitCommit',
      latencyMs: 410,
      status: 'IDLE',
      summary: 'Awaiting deployment context...',
      logs: ['[00:00.000] Standby. Repo git commit index pre-loaded.'],
    },
    {
      id: 'infra-checker',
      name: 'Infra Checker',
      role: 'Upstream API Status & Dependency Integrity',
      icon: 'Server',
      latencyMs: 290,
      status: 'IDLE',
      summary: 'Awaiting infrastructure telemetry...',
      logs: ['[00:00.000] Standby. Health probe listener armed.'],
    },
    {
      id: 'impact-analyst',
      name: 'Impact Analyst',
      role: 'Blast Radius & Regression Risk Scoring',
      icon: 'Activity',
      latencyMs: 450,
      status: 'IDLE',
      summary: 'Awaiting route metrics...',
      logs: ['[00:00.000] Standby. Topology graph mapped.'],
    },
    {
      id: 'mitigation-planner',
      name: 'Mitigation Planner',
      role: 'Immediate Rollback & Containment Strategy',
      icon: 'ShieldAlert',
      latencyMs: 320,
      status: 'IDLE',
      summary: 'Awaiting triage aggregation...',
      logs: ['[00:00.000] Standby. Safe-revert policies loaded.'],
    },
  ];

  const [agents, setAgents] = useState<AgentInfo[]>(getInitialAgents(activeScenario));

  const clearAllTimeouts = () => {
    timerTimeoutRef.current.forEach(clearTimeout);
    timerTimeoutRef.current = [];
  };

  const handleSelectScenario = (id: string) => {
    clearAllTimeouts();
    stopwatch.reset();
    setSelectedScenarioId(id);
    setStatus('STANDBY');
    setIsRollbackApproved(false);
    setActivePatchId('patch-a');
    setValidationProgress(0);
    const newScenario = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    setAgents(getInitialAgents(newScenario));
  };

  const resetSimulation = () => {
    clearAllTimeouts();
    stopwatch.reset();
    setStatus('STANDBY');
    setIsRollbackApproved(false);
    setActivePatchId('patch-a');
    setValidationProgress(0);
    setAgents(getInitialAgents(activeScenario));
  };

  const triggerOutage = useCallback(() => {
    clearAllTimeouts();
    stopwatch.reset();
    setIsRollbackApproved(false);
    setValidationProgress(0);
    setActivePatchId(activeScenario.patches.find((p) => p.isWinner)?.id || 'patch-a');

    // 1. Start stopwatch & trigger sound
    stopwatch.start();
    audio.playAlarm();
    setStatus('TRIGGERED');

    // Reset agents to in-flight
    setAgents((prev) =>
      prev.map((agent) => ({
        ...agent,
        status: 'THINKING',
        summary: 'Bursting Cerebras inference query...',
        logs: [`[00:00.012] Ingested crash payload for ${activeScenario.service}.`],
      }))
    );

    // Schedule: Agents burst active
    const t1 = setTimeout(() => {
      setStatus('AGENTS_ACTIVE');
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          status: 'ANALYZING',
          logs: [
            ...a.logs,
            `[00:00.120] Dispatched prompt to Cerebras API (Llama 3.3 70B parallel worker).`,
          ],
        }))
      );
    }, 150);

    // Agent 3: Infra Checker finishes early (~290ms)
    const t2 = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'infra-checker'
            ? {
                ...a,
                status: 'COMPLETED',
                summary:
                  activeScenario.id === 'stripe-timeout'
                    ? 'Stripe API Gateway timed out after 5000ms. External outage detected.'
                    : 'All upstream APIs healthy (Stripe, Redis, DB). Confirmed local code bug.',
                logs: [
                  ...a.logs,
                  `[00:00.290] Health probes: ${activeScenario.infraStatus.map((s) => `${s.service} (${s.status})`).join(', ')}.`,
                  `[00:00.290] Diagnosis: ${activeScenario.id === 'stripe-timeout' ? 'EXTERNAL_OUTAGE' : 'LOCAL_CODE_BUG'}.`,
                ],
              }
            : a
        )
      );
    }, 290);

    // Agent 5: Mitigation Planner prepares recommendation (~320ms)
    const t3 = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'mitigation-planner'
            ? {
                ...a,
                status: 'COMPLETED',
                summary: `Rollback recommendation: Revert PR #${activeScenario.culpritCommit.prNumber} (${activeScenario.mitigation.riskLevel} Risk).`,
                logs: [
                  ...a.logs,
                  `[00:00.320] Formulated immediate mitigation plan.`,
                  `[00:00.320] Action: ${activeScenario.mitigation.action}.`,
                ],
              }
            : a
        )
      );
    }, 320);

    // Agent 1: Trace Analyst finishes (~380ms)
    const t4 = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'trace-analyst'
            ? {
                ...a,
                status: 'COMPLETED',
                summary: `Isolated ${activeScenario.file}:${activeScenario.line} in ${activeScenario.functionName}().`,
                logs: [
                  ...a.logs,
                  `[00:00.380] Stack frame parsed. Suspect: ${activeScenario.file}:${activeScenario.line}.`,
                  `[00:00.380] Cause: ${activeScenario.errorMessage}.`,
                ],
              }
            : a
        )
      );
    }, 380);

    // Agent 2: Git Detective finishes (~410ms)
    const t5 = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'git-detective'
            ? {
                ...a,
                status: 'COMPLETED',
                summary: `Culprit commit ${activeScenario.culpritCommit.hash} by ${activeScenario.culpritCommit.author} (PR #${activeScenario.culpritCommit.prNumber}).`,
                logs: [
                  ...a.logs,
                  `[00:00.410] Cross-referenced git log delta against error timestamp.`,
                  `[00:00.410] Blamed commit: ${activeScenario.culpritCommit.hash} ("${activeScenario.culpritCommit.message}").`,
                ],
              }
            : a
        )
      );
    }, 410);

    // Agent 4: Impact Analyst finishes (~450ms)
    const t6 = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'impact-analyst'
            ? {
                ...a,
                status: 'COMPLETED',
                summary: `Blast radius: ${activeScenario.blastRadius.scope} (${activeScenario.blastRadius.impactPercentage}).`,
                logs: [
                  ...a.logs,
                  `[00:00.450] Evaluated service graph routes: ${activeScenario.blastRadius.affectedRoutes.join(', ')}.`,
                  `[00:00.450] Severity assigned: ${activeScenario.blastRadius.severity}.`,
                ],
              }
            : a
        )
      );
      setStatus('MITIGATION_READY');
    }, 450);

    // Speculative Repair Begins (~800ms)
    const t7 = setTimeout(() => {
      setStatus('SPECULATIVE_REPAIR');
      setValidationProgress(25);
    }, 800);

    // Patch Validation in progress (~1200ms)
    const t8 = setTimeout(() => {
      setStatus('VALIDATING');
      setValidationProgress(75);
    }, 1200);

    // All validation passed & PR created (~1842ms)
    const finalResolutionMs = 1842;
    const t9 = setTimeout(() => {
      setValidationProgress(100);
      setStatus('RESOLVED');
      stopwatch.stop(finalResolutionMs);
      audio.playSuccessChime();
    }, finalResolutionMs);

    timerTimeoutRef.current = [t1, t2, t3, t4, t5, t6, t7, t8, t9];
  }, [activeScenario, stopwatch, audio]);

  const approveRollback = () => {
    setIsRollbackApproved(true);
    audio.playClick();
  };

  const selectedPatch: CandidatePatch | undefined =
    activeScenario.patches.find((p) => p.id === activePatchId) || activeScenario.patches[0];

  return {
    scenarios: SCENARIOS,
    selectedScenarioId,
    activeScenario,
    status,
    agents,
    isRollbackApproved,
    activePatchId,
    selectedPatch,
    validationProgress,
    stopwatch,
    audio,
    handleSelectScenario,
    triggerOutage,
    resetSimulation,
    approveRollback,
    setActivePatchId,
  };
}
