import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConstellationMemoryTelemetry,
  InnerModality,
  MindsEyeTelemetry,
  PerceptualFocus,
  PlanningStyle,
  PrimarySense,
  PulseReactionTelemetry,
  TelemetryState,
} from '../types/aura';

export const DEFAULT_TELEMETRY_STATE: TelemetryState = {
  pulse_reaction: {
    completed: false,
    median_rt_ms: 268,
    rt_cv_pct: 8.4,
    steadiness_pct: 91,
    false_starts: 0,
    lure_trials: 1,
    lure_false_alarms: 0,
    inhibition_score_pct: 100,
    post_lure_rt_ms: 264,
  },
  constellation_memory: {
    completed: false,
    accuracy_pct: 100,
    mean_chunk_ms: 420,
    planning_latency_ms: 640,
    distractors_ignored: 2,
    distractor_resistance_pct: 100,
    planning_style: 'holistic_planner',
  },
  minds_eye: {
    completed: false,
    imagery_vividness: 72,
    inner_modality: 'visual_cinema',
    perceptual_focus: 'global_gestalt',
    perceptual_rt_ms: 820,
    primary_sense: 'visual_light',
  },
};

function cloneState<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let globalTelemetryState: TelemetryState = cloneState(DEFAULT_TELEMETRY_STATE);
let activeConstellationPattern: number[] = [0, 4, 5, 7];
const subscribers = new Set<(state: TelemetryState) => void>();

function notifyTelemetrySubscribers() {
  const snapshot = cloneState(globalTelemetryState);
  subscribers.forEach((fn) => fn(snapshot));
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function computePulseMetrics(
  reactionTimesMs: number[],
  falseStarts: number,
  lureFalseAlarms = 0,
  postLureRtMs?: number
): PulseReactionTelemetry {
  const cleanRts = (reactionTimesMs || [])
    .map((x) => Math.max(110, Math.min(2000, Number(x) || 272)))
    .sort((a, b) => a - b);

  const fs = Math.max(0, Number(falseStarts) || 0);
  const lfa = Math.max(0, Number(lureFalseAlarms) || 0);
  const inhibitionScore = Math.max(25, Math.min(100, 100 - lfa * 35 - fs * 12));

  if (cleanRts.length === 0) {
    return {
      completed: true,
      median_rt_ms: 268,
      rt_cv_pct: 8.4,
      steadiness_pct: 91,
      false_starts: fs,
      lure_trials: 1,
      lure_false_alarms: lfa,
      inhibition_score_pct: inhibitionScore,
      post_lure_rt_ms: postLureRtMs || 264,
    };
  }

  const mid = Math.floor(cleanRts.length / 2);
  const medianRt =
    cleanRts.length % 2 === 1
      ? cleanRts[mid]
      : (cleanRts[mid - 1] + cleanRts[mid]) * 0.5;

  const mean = cleanRts.reduce((acc, v) => acc + v, 0) / cleanRts.length;
  const variance =
    cleanRts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / cleanRts.length;
  const stdDev = Math.sqrt(variance);
  const cvPct = mean > 0 ? (stdDev / mean) * 100 : 8.0;
  const clampedCv = Math.max(1.5, Math.min(45.0, Math.round(cvPct * 10) / 10));

  const steadiness = Math.max(
    38,
    Math.min(99, Math.round(100 - clampedCv * 1.15 - fs * 5 - lfa * 8))
  );

  return {
    completed: true,
    median_rt_ms: Math.round(medianRt),
    rt_cv_pct: clampedCv,
    steadiness_pct: steadiness,
    false_starts: fs,
    lure_trials: 1,
    lure_false_alarms: lfa,
    inhibition_score_pct: inhibitionScore,
    post_lure_rt_ms: Math.round(postLureRtMs || medianRt),
  };
}

let externalStageOverride: ((gameIdx: 0 | 1 | 2) => void) | null = null;
let externalQuickPulseCb: (() => void) | null = null;
let externalQuickConstellationCb: (() => void) | null = null;
let externalQuickMindsEyeCb: ((vividness?: number, modality?: InnerModality) => void) | null =
  null;

export const AuraMicroGamesBridge = {
  getState(): TelemetryState {
    return cloneState(globalTelemetryState);
  },

  setState(partial: Partial<TelemetryState>): TelemetryState {
    if (!partial || typeof partial !== 'object') return this.getState();
    if (partial.pulse_reaction) {
      globalTelemetryState.pulse_reaction = {
        ...globalTelemetryState.pulse_reaction,
        ...partial.pulse_reaction,
      };
    }
    if (partial.constellation_memory) {
      globalTelemetryState.constellation_memory = {
        ...globalTelemetryState.constellation_memory,
        ...partial.constellation_memory,
      };
    }
    if (partial.minds_eye) {
      globalTelemetryState.minds_eye = {
        ...globalTelemetryState.minds_eye,
        ...partial.minds_eye,
      };
    }
    notifyTelemetrySubscribers();
    return this.getState();
  },

  resetState(): TelemetryState {
    globalTelemetryState = cloneState(DEFAULT_TELEMETRY_STATE);
    notifyTelemetrySubscribers();
    if (externalStageOverride) externalStageOverride(0);
    return this.getState();
  },

  quickCompletePulse(customCallback?: (res: PulseReactionTelemetry) => void): PulseReactionTelemetry {
    const result: PulseReactionTelemetry = {
      completed: true,
      median_rt_ms: 264,
      rt_cv_pct: 7.8,
      steadiness_pct: 92,
      false_starts: 0,
      lure_trials: 1,
      lure_false_alarms: 0,
      inhibition_score_pct: 100,
      post_lure_rt_ms: 258,
    };
    globalTelemetryState.pulse_reaction = cloneState(result);
    notifyTelemetrySubscribers();
    if (externalQuickPulseCb) externalQuickPulseCb();
    if (typeof customCallback === 'function') customCallback(cloneState(result));
    return cloneState(result);
  },

  quickCompleteConstellation(
    customCallback?: (res: ConstellationMemoryTelemetry) => void
  ): ConstellationMemoryTelemetry {
    const result: ConstellationMemoryTelemetry = {
      completed: true,
      accuracy_pct: 100,
      mean_chunk_ms: 415,
      planning_latency_ms: 660,
      distractors_ignored: 2,
      distractor_resistance_pct: 100,
      planning_style: 'holistic_planner',
    };
    globalTelemetryState.constellation_memory = cloneState(result);
    notifyTelemetrySubscribers();
    if (externalQuickConstellationCb) externalQuickConstellationCb();
    if (typeof customCallback === 'function') customCallback(cloneState(result));
    return cloneState(result);
  },

  quickCompleteMindsEye(
    customVividness?: number | ((res: MindsEyeTelemetry) => void),
    customModality?: InnerModality,
    customCallback?: (res: MindsEyeTelemetry) => void
  ): MindsEyeTelemetry {
    let vividness = 72;
    let modality: InnerModality = 'visual_cinema';
    let cb = customCallback;

    if (typeof customVividness === 'function') {
      cb = customVividness;
    } else {
      if (typeof customVividness === 'number') vividness = customVividness;
      if (typeof customModality === 'string') modality = customModality;
    }

    const result: MindsEyeTelemetry = {
      completed: true,
      imagery_vividness: vividness,
      inner_modality: modality,
      perceptual_focus: globalTelemetryState.minds_eye.perceptual_focus || 'global_gestalt',
      perceptual_rt_ms: globalTelemetryState.minds_eye.perceptual_rt_ms || 790,
      primary_sense: globalTelemetryState.minds_eye.primary_sense || 'visual_light',
    };
    globalTelemetryState.minds_eye = cloneState(result);
    notifyTelemetrySubscribers();
    if (externalQuickMindsEyeCb) externalQuickMindsEyeCb(vividness, modality);
    if (typeof cb === 'function') cb(cloneState(result));
    return cloneState(result);
  },

  getActiveConstellationPattern(): number[] {
    return activeConstellationPattern.slice();
  },

  renderPulseGame(_containerEl?: HTMLElement, _onComplete?: () => void) {
    if (externalStageOverride) externalStageOverride(0);
  },
  renderConstellationGame(_containerEl?: HTMLElement, _onComplete?: () => void) {
    if (externalStageOverride) externalStageOverride(1);
  },
  renderMindsEyeGame(_containerEl?: HTMLElement, _onComplete?: () => void) {
    if (externalStageOverride) externalStageOverride(2);
  },
  renderMicroGamesFlow(_containerEl?: HTMLElement, _onAllComplete?: () => void) {
    if (externalStageOverride) externalStageOverride(0);
  },
};

declare global {
  interface Window {
    AuraMicroGames: typeof AuraMicroGamesBridge;
  }
}

if (typeof window !== 'undefined') {
  window.AuraMicroGames = AuraMicroGamesBridge;
}

export function useTelemetryState(): TelemetryState {
  const [state, setState] = useState<TelemetryState>(() => AuraMicroGamesBridge.getState());
  useEffect(() => {
    const handler = (next: TelemetryState) => setState(next);
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);
  return state;
}

export const MIND_MOMENT_SLUGS: Record<0 | 1 | 2, string> = {
  0: 'moment-still-water',
  1: 'moment-night-sky',
  2: 'moment-inner-canvas',
};

interface MindMomentsProps {
  activeMomentIndex?: 0 | 1 | 2;
  nextStepLabel?: string;
  onSelectMomentIndex?: (idx: 0 | 1 | 2) => void;
  onCompleteSingleMoment?: (momentIdx: 0 | 1 | 2, telemetry: TelemetryState) => void;
  onAllComplete: (telemetry: TelemetryState) => void;
}

// 4-Trial Go / No-Go Protocol for Still Water:
// Trial 0: GO (Warm Gold) -> Trial 1: LURE (Violet No-Go) -> Trial 2: GO (Post-Inhibition) -> Trial 3: GO (Final Cadence)
type PulseTrialKind = 'go' | 'lure';
const PULSE_TRIAL_PLAN: PulseTrialKind[] = ['go', 'lure', 'go', 'go'];

export const MindMoments: React.FC<MindMomentsProps> = ({
  activeMomentIndex,
  onSelectMomentIndex,
  onCompleteSingleMoment,
  onAllComplete,
}) => {
  const [gameIndex, setGameIndex] = useState<0 | 1 | 2>(activeMomentIndex ?? 0);

  const callbacksRef = useRef({
    onSelectMomentIndex,
    onCompleteSingleMoment,
    onAllComplete,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelectMomentIndex,
      onCompleteSingleMoment,
      onAllComplete,
    };
  }, [onSelectMomentIndex, onCompleteSingleMoment, onAllComplete]);

  useEffect(() => {
    if (activeMomentIndex !== undefined && activeMomentIndex !== gameIndex) {
      setGameIndex(activeMomentIndex);
    }
  }, [activeMomentIndex, gameIndex]);

  const switchMoment = useCallback((idx: 0 | 1 | 2) => {
    setGameIndex(idx);
    if (callbacksRef.current.onSelectMomentIndex) {
      callbacksRef.current.onSelectMomentIndex(idx);
    }
  }, []);

  // ============================================================================
  // Game 1: Still Water — Go / No-Go Attentional Vigilance & Inhibitory Control
  // ============================================================================
  const [pulseTrialIdx, setPulseTrialIdx] = useState<number>(0);
  const [pulsePhase, setPulsePhase] = useState<
    'ready' | 'waiting' | 'rippling' | 'lure' | 'captured' | 'finished'
  >('ready');
  const [pulseStatusText, setPulseStatusText] = useState<string>('Tap to Begin');
  const [pulseSubText, setPulseSubText] = useState<string>(
    '3 Gold Ripples + 1 Violet Impulse Lure'
  );
  const [trialBadges, setTrialBadges] = useState<(string | null)[]>([null, null, null, null]);
  const rippleShownAtRef = useRef<number>(0);
  const pulseRtsRef = useRef<number[]>([]);
  const pulseFalseStartsRef = useRef<number>(0);
  const pulseLureAlarmsRef = useRef<number>(0);
  const postLureRtRef = useRef<number | undefined>(undefined);
  const pulseTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 2: Night Sky — Visuospatial Working Memory + Distractor Filtering
  // ============================================================================
  const [skyPattern, setSkyPattern] = useState<number[]>([0, 4, 5, 7]);
  const [skyDecoys, setSkyDecoys] = useState<number[]>([2, 6]);
  const [skyPhase, setSkyPhase] = useState<'watching' | 'washout' | 'tracing' | 'finished'>(
    'watching'
  );
  const [litStarIdx, setLitStarIdx] = useState<number | null>(null);
  const [litDecoyIdx, setLitDecoyIdx] = useState<number | null>(null);
  const [shownSoFar, setShownSoFar] = useState<number[]>([]);
  const [userPicks, setUserPicks] = useState<number[]>([]);
  const [decoyErrors, setDecoyErrors] = useState<number>(0);
  const [planningMs, setPlanningMs] = useState<number | null>(null);
  const [skyPrompt, setSkyPrompt] = useState<string>(
    'Watch 4 Gold stars · Ignore Violet decoys…'
  );
  const tracingStartAtRef = useRef<number>(0);
  const skyTapTimestampsRef = useRef<number[]>([]);
  const skyTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 3: Inner Canvas — Perceptual Gestalt, Sensory Lens & Thought Modality
  // ============================================================================
  const [mindsEyeStep, setMindsEyeStep] = useState<'A' | 'B'>('A');
  const [selectedVividness, setSelectedVividness] = useState<number>(72);
  const [selectedPrimarySense, setSelectedPrimarySense] =
    useState<PrimarySense>('visual_light');
  const [selectedPerceptualFocus, setSelectedPerceptualFocus] =
    useState<PerceptualFocus>('global_gestalt');
  const [perceptualRtMs, setPerceptualRtMs] = useState<number>(780);
  const [selectedModality, setSelectedModality] = useState<InnerModality | null>(null);
  const stepBEnteredAtRef = useRef<number>(0);
  const mindsEyeTimerRef = useRef<number | null>(null);

  const clearTimerList = (list: number[]) => {
    while (list.length > 0) {
      const t = list.pop();
      if (t !== undefined) window.clearTimeout(t);
    }
  };

  const advanceAfterMoment = useCallback(
    (completedIdx: 0 | 1 | 2) => {
      const latest = AuraMicroGamesBridge.getState();
      if (callbacksRef.current.onCompleteSingleMoment) {
        callbacksRef.current.onCompleteSingleMoment(completedIdx, latest);
        return;
      }
      if (completedIdx === 0) {
        switchMoment(1);
      } else if (completedIdx === 1) {
        switchMoment(2);
      } else {
        callbacksRef.current.onAllComplete(latest);
      }
    },
    [switchMoment]
  );

  useEffect(() => {
    externalStageOverride = (idx) => {
      switchMoment(idx);
    };
    externalQuickPulseCb = () => {
      clearTimerList(pulseTimersRef.current);
      setTrialBadges(['258ms', 'HOLD ✓', '264ms', '262ms']);
      setPulseTrialIdx(4);
      setPulsePhase('finished');
      setPulseStatusText('262ms · 100% Hold');
      advanceAfterMoment(0);
    };
    externalQuickConstellationCb = () => {
      clearTimerList(skyTimersRef.current);
      setSkyPhase('finished');
      setSkyPrompt('Constellation Captured · 100% Filter');
      advanceAfterMoment(1);
    };
    externalQuickMindsEyeCb = (viv, mod) => {
      if (typeof viv === 'number') setSelectedVividness(viv);
      if (mod) setSelectedModality(mod);
      if (callbacksRef.current.onCompleteSingleMoment) {
        callbacksRef.current.onCompleteSingleMoment(2, AuraMicroGamesBridge.getState());
      } else {
        callbacksRef.current.onAllComplete(AuraMicroGamesBridge.getState());
      }
    };
    return () => {
      externalStageOverride = null;
      externalQuickPulseCb = null;
      externalQuickConstellationCb = null;
      externalQuickMindsEyeCb = null;
      clearTimerList(pulseTimersRef.current);
      clearTimerList(skyTimersRef.current);
      if (mindsEyeTimerRef.current !== null) {
        window.clearTimeout(mindsEyeTimerRef.current);
      }
    };
  }, [advanceAfterMoment, switchMoment]);

  // ============================================================================
  // Game 1: Still Water Go / No-Go Lifecycle
  // ============================================================================
  const finishPulseGame = useCallback(() => {
    const metrics = computePulseMetrics(
      pulseRtsRef.current,
      pulseFalseStartsRef.current,
      pulseLureAlarmsRef.current,
      postLureRtRef.current
    );
    AuraMicroGamesBridge.setState({ pulse_reaction: metrics });
    setPulsePhase('finished');
    setPulseStatusText(`${metrics.median_rt_ms} ms`);
    setPulseSubText(
      `Steadiness ${metrics.steadiness_pct}% · Impulse Hold ${metrics.inhibition_score_pct}%`
    );

    const doneT = window.setTimeout(() => {
      advanceAfterMoment(0);
    }, 620);
    pulseTimersRef.current.push(doneT);
  }, [advanceAfterMoment]);

  const scheduleNextTrial = useCallback(
    (trialIdx: number) => {
      clearTimerList(pulseTimersRef.current);
      if (trialIdx >= PULSE_TRIAL_PLAN.length) {
        finishPulseGame();
        return;
      }

      const kind = PULSE_TRIAL_PLAN[trialIdx];
      setPulsePhase('waiting');
      setPulseStatusText('Hold steady…');
      setPulseSubText(
        kind === 'lure'
          ? 'Watch closely: tap Gold, hold still on Violet'
          : `Trial ${trialIdx + 1} of 4 · Wait for the signal`
      );

      const delayMs = Math.round(720 + Math.random() * 480);
      const t = window.setTimeout(() => {
        rippleShownAtRef.current = nowMs();
        if (kind === 'lure') {
          setPulsePhase('lure');
          setPulseStatusText('VIOLET LURE · HOLD');
          setPulseSubText('Do NOT tap — testing impulse inhibition');
          // Auto-succeed after 780ms if user holds still!
          const holdT = window.setTimeout(() => {
            setTrialBadges((prev) => {
              const next = [...prev];
              next[trialIdx] = 'HOLD ✓';
              return next;
            });
            setPulsePhase('captured');
            setPulseStatusText('Impulse Held ✓');
            setPulseSubText('Prefrontal inhibition locked');
            setPulseTrialIdx(trialIdx + 1);
            const nextT = window.setTimeout(() => {
              scheduleNextTrial(trialIdx + 1);
            }, 420);
            pulseTimersRef.current.push(nextT);
          }, 780);
          pulseTimersRef.current.push(holdT);
        } else {
          setPulsePhase('rippling');
          setPulseStatusText('TAP GOLD NOW');
          setPulseSubText('Warm gold sun-ripple active');
        }
      }, delayMs);
      pulseTimersRef.current.push(t);
    },
    [finishPulseGame]
  );

  useEffect(() => {
    if (gameIndex === 0) {
      clearTimerList(pulseTimersRef.current);
      setPulseTrialIdx(0);
      setTrialBadges([null, null, null, null]);
      pulseRtsRef.current = [];
      pulseFalseStartsRef.current = 0;
      pulseLureAlarmsRef.current = 0;
      postLureRtRef.current = undefined;
      setPulsePhase('ready');
      setPulseStatusText('Tap to Begin');
      setPulseSubText('3 Gold Ripples (Tap) + 1 Violet Lure (Hold)');
    }
    return () => clearTimerList(pulseTimersRef.current);
  }, [gameIndex]);

  const handlePondClick = (e?: React.SyntheticEvent) => {
    if (e && e.type === 'keydown') {
      e.preventDefault();
    }
    if (pulsePhase === 'finished' || pulsePhase === 'captured') return;

    if (pulsePhase === 'ready') {
      scheduleNextTrial(0);
      return;
    }

    if (pulsePhase === 'waiting') {
      pulseFalseStartsRef.current += 1;
      setPulseStatusText('Early tap · Resetting…');
      setPulseSubText('Wait for the Gold ripple before tapping');
      clearTimerList(pulseTimersRef.current);
      const retryT = window.setTimeout(() => {
        scheduleNextTrial(pulseTrialIdx);
      }, 420);
      pulseTimersRef.current.push(retryT);
      return;
    }

    if (pulsePhase === 'lure') {
      // User tapped during the Violet No-Go Lure! Record commission error & advance to next trial
      clearTimerList(pulseTimersRef.current);
      pulseLureAlarmsRef.current += 1;
      setTrialBadges((prev) => {
        const next = [...prev];
        next[pulseTrialIdx] = 'LURE ✗';
        return next;
      });
      setPulsePhase('captured');
      setPulseStatusText('Violet Lure Tapped');
      setPulseSubText('Impulse commission logged — moving to next ripple');
      const nextIdx = pulseTrialIdx + 1;
      setPulseTrialIdx(nextIdx);
      const nextT = window.setTimeout(() => {
        scheduleNextTrial(nextIdx);
      }, 460);
      pulseTimersRef.current.push(nextT);
      return;
    }

    if (pulsePhase === 'rippling') {
      clearTimerList(pulseTimersRef.current);
      const rt = Math.max(110, Math.round(nowMs() - rippleShownAtRef.current));
      pulseRtsRef.current.push(rt);
      if (pulseTrialIdx === 2) {
        postLureRtRef.current = rt;
      }
      setTrialBadges((prev) => {
        const next = [...prev];
        next[pulseTrialIdx] = `${rt}ms`;
        return next;
      });

      const nextIdx = pulseTrialIdx + 1;
      setPulseTrialIdx(nextIdx);

      if (nextIdx >= PULSE_TRIAL_PLAN.length) {
        finishPulseGame();
      } else {
        setPulsePhase('captured');
        setPulseStatusText(`${rt} ms`);
        setPulseSubText(
          pulseTrialIdx === 2
            ? `Post-inhibition recovery: ${rt}ms`
            : 'Clean motor lock'
        );
        const nextT = window.setTimeout(() => {
          scheduleNextTrial(nextIdx);
        }, 440);
        pulseTimersRef.current.push(nextT);
      }
    }
  };

  // ============================================================================
  // Game 2: Night Sky — Visuospatial Working Memory + Distractor Filtering
  // ============================================================================
  const runConstellationDemo = useCallback((pattern: number[], decoys: number[]) => {
    clearTimerList(skyTimersRef.current);
    setSkyPhase('watching');
    setLitStarIdx(null);
    setLitDecoyIdx(null);
    setShownSoFar([]);
    setUserPicks([]);
    setDecoyErrors(0);
    setPlanningMs(null);
    skyTapTimestampsRef.current = [];
    setSkyPrompt('Watch 4 Gold targets · Ignore Violet decoys…');

    const accShown: number[] = [];
    pattern.forEach((starIdx, stepIdx) => {
      const t = window.setTimeout(() => {
        setLitStarIdx(starIdx);
        accShown.push(starIdx);
        setShownSoFar([...accShown]);
        // Flash a Violet Nebula Decoy alongside step 1 and step 3 to test prefrontal distractor gating!
        if (stepIdx === 1 && decoys[0] !== undefined) {
          setLitDecoyIdx(decoys[0]);
        } else if (stepIdx === 2 && decoys[1] !== undefined) {
          setLitDecoyIdx(decoys[1]);
        } else {
          setLitDecoyIdx(null);
        }
      }, 380 + stepIdx * 450);
      skyTimersRef.current.push(t);
    });

    const washoutAt = 380 + (pattern.length - 1) * 450 + 480;
    const washT = window.setTimeout(() => {
      setLitStarIdx(null);
      setLitDecoyIdx(null);
      setShownSoFar([]);
      setSkyPhase('washout');
      setSkyPrompt('Clearing iconic buffer…');
    }, washoutAt);
    skyTimersRef.current.push(washT);

    const traceT = window.setTimeout(() => {
      setSkyPhase('tracing');
      tracingStartAtRef.current = nowMs();
      setSkyPrompt('Your turn: trace the 4 Gold stars in order (0/4)');
    }, washoutAt + 240);
    skyTimersRef.current.push(traceT);
  }, []);

  useEffect(() => {
    if (gameIndex !== 1) return;
    const TRIAL_CONFIGS: { pattern: number[]; decoys: number[] }[] = [
      { pattern: [0, 4, 5, 7], decoys: [2, 6] },
      { pattern: [1, 3, 4, 8], decoys: [0, 6] },
      { pattern: [2, 4, 3, 7], decoys: [0, 8] },
      { pattern: [0, 1, 4, 8], decoys: [2, 6] },
    ];
    const picked = TRIAL_CONFIGS[Math.floor(Math.random() * TRIAL_CONFIGS.length)];
    activeConstellationPattern = picked.pattern.slice();
    setSkyPattern(picked.pattern);
    setSkyDecoys(picked.decoys);
    runConstellationDemo(picked.pattern, picked.decoys);

    return () => clearTimerList(skyTimersRef.current);
  }, [gameIndex, runConstellationDemo]);

  const starCoords = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const centers = [44, 110, 176];
    return { x: centers[col], y: centers[row] };
  };

  const handleStarClick = (idx: number) => {
    if (skyPhase !== 'tracing') return;

    if (userPicks.includes(idx)) {
      const filtered = userPicks.filter((s) => s !== idx);
      setUserPicks(filtered);
      setSkyPrompt(`Trace the 4 Gold stars in order (${filtered.length}/4)`);
      return;
    }

    if (userPicks.length >= 4) return;
    const tNow = nowMs();

    // Measure Pre-Action Planning Latency on 1st star tap
    let firstTapPlanMs = planningMs;
    if (userPicks.length === 0) {
      firstTapPlanMs = Math.max(
        140,
        Math.min(3500, Math.round(tNow - (tracingStartAtRef.current || tNow - 580)))
      );
      setPlanningMs(firstTapPlanMs);
    }

    // Check if tapped star was one of the Violet Nebula Decoys
    let nextDecoyErrs = decoyErrors;
    if (skyDecoys.includes(idx) && !skyPattern.includes(idx)) {
      nextDecoyErrs += 1;
      setDecoyErrors(nextDecoyErrs);
    }

    const nextPicks = [...userPicks, idx];
    skyTapTimestampsRef.current.push(tNow);
    setUserPicks(nextPicks);

    if (nextPicks.length === 4) {
      let matches = 0;
      const targetSet = new Set(skyPattern);
      for (let i = 0; i < 4; i++) {
        if (nextPicks[i] === skyPattern[i]) {
          matches += 1;
        } else if (targetSet.has(nextPicks[i])) {
          matches += 0.75;
        }
      }
      const rawPct = Math.round((matches / 4) * 100);
      const accuracyPct = Math.max(25, Math.min(100, rawPct));

      const intervals: number[] = [];
      const ts = skyTapTimestampsRef.current;
      for (let i = 1; i < ts.length; i++) {
        intervals.push(Math.max(90, Math.min(2500, ts[i] - ts[i - 1])));
      }
      const meanChunkMs =
        intervals.length > 0
          ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
          : 420;

      const finalPlanMs = firstTapPlanMs || 580;
      const distractorsIgnored = Math.max(0, 2 - nextDecoyErrs);
      const distractorResistancePct = Math.round((distractorsIgnored / 2) * 100);
      const planningStyle: PlanningStyle =
        finalPlanMs >= 620 && accuracyPct >= 75
          ? 'holistic_planner'
          : finalPlanMs < 380
          ? 'rapid_forager'
          : 'balanced_chunker';

      const result: ConstellationMemoryTelemetry = {
        completed: true,
        accuracy_pct: accuracyPct,
        mean_chunk_ms: meanChunkMs,
        planning_latency_ms: finalPlanMs,
        distractors_ignored: distractorsIgnored,
        distractor_resistance_pct: distractorResistancePct,
        planning_style: planningStyle,
      };
      AuraMicroGamesBridge.setState({ constellation_memory: result });
      setSkyPhase('finished');
      setSkyPrompt(
        `Captured · ${accuracyPct}% Span · ${distractorsIgnored}/2 Decoys Filtered`
      );

      const doneT = window.setTimeout(() => {
        advanceAfterMoment(1);
      }, 480);
      skyTimersRef.current.push(doneT);
    } else {
      setSkyPrompt(`Trace the 4 Gold stars in order (${nextPicks.length}/4)`);
    }
  };

  // ============================================================================
  // Game 3: Inner Canvas Lifecycle (Step A -> Step B, Zero Scroll)
  // ============================================================================
  useEffect(() => {
    if (gameIndex === 2) {
      setMindsEyeStep('A');
      setSelectedModality(null);
    }
  }, [gameIndex]);

  const VIVIDNESS_CARDS = [
    {
      vividness: 10,
      title: 'Semantic Concept Graph',
      desc: 'Wordless structural knowing — zero visual picture',
    },
    {
      vividness: 38,
      title: 'Wireframe Silhouette',
      desc: 'Faint spatial contour & dim edge geometry',
    },
    {
      vividness: 72,
      title: 'Warm Studio Picture',
      desc: 'Steady amber light, glass form & surface shading',
    },
    {
      vividness: 94,
      title: 'Ray-Traced Cinema',
      desc: 'Lifelike flame motion, brass grain & felt warmth',
    },
  ];

  const PRIMARY_SENSE_PILLS: { id: PrimarySense; label: string }[] = [
    { id: 'visual_light', label: '✦ Visual Glow' },
    { id: 'tactile_warmth', label: '✦ Felt Warmth' },
    { id: 'auditory_hum', label: '✦ Sound / Hum' },
    { id: 'abstract_knowing', label: '✦ Pure Concept' },
  ];

  const PERCEPTUAL_FOCUS_PILLS: {
    id: PerceptualFocus;
    title: string;
    sub: string;
  }[] = [
    { id: 'global_gestalt', title: '◐ Macro-Arch', sub: 'Global Gestalt' },
    { id: 'local_detail', title: '△ Micro-Lattice', sub: 'Analytic Detail' },
    { id: 'divergent_space', title: '◇ Center Portal', sub: 'Negative Space' },
  ];

  const MODALITY_CARDS: {
    modality: InnerModality;
    title: string;
    desc: string;
  }[] = [
    {
      modality: 'wordless_concept',
      title: 'Wordless Pattern Graph',
      desc: 'Silent structural intuition & parallel nodes',
    },
    {
      modality: 'inner_voice',
      title: 'Inner Voice & Dialogue',
      desc: 'Verbal cadence, point-counterpoint narration',
    },
    {
      modality: 'visual_cinema',
      title: 'Simulated Visual Scenes',
      desc: 'Playing out spatial models & visual outcomes',
    },
  ];

  const handleSelectVividness = (viv: number) => {
    setSelectedVividness(viv);
    AuraMicroGamesBridge.setState({
      minds_eye: {
        completed: false,
        imagery_vividness: viv,
        inner_modality: selectedModality || 'visual_cinema',
        perceptual_focus: selectedPerceptualFocus,
        perceptual_rt_ms: perceptualRtMs,
        primary_sense: selectedPrimarySense,
      },
    });
    if (mindsEyeTimerRef.current !== null) {
      window.clearTimeout(mindsEyeTimerRef.current);
    }
    mindsEyeTimerRef.current = window.setTimeout(() => {
      stepBEnteredAtRef.current = nowMs();
      setMindsEyeStep('B');
    }, 220);
  };

  const handleSelectPerceptualFocus = (focus: PerceptualFocus) => {
    const rt = Math.max(
      180,
      Math.min(4500, Math.round(nowMs() - (stepBEnteredAtRef.current || nowMs() - 680)))
    );
    setSelectedPerceptualFocus(focus);
    setPerceptualRtMs(rt);
    AuraMicroGamesBridge.setState({
      minds_eye: {
        ...AuraMicroGamesBridge.getState().minds_eye,
        perceptual_focus: focus,
        perceptual_rt_ms: rt,
      },
    });
  };

  const handleSelectModality = (mod: InnerModality) => {
    setSelectedModality(mod);
    const result: MindsEyeTelemetry = {
      completed: true,
      imagery_vividness: selectedVividness,
      inner_modality: mod,
      perceptual_focus: selectedPerceptualFocus,
      perceptual_rt_ms: perceptualRtMs,
      primary_sense: selectedPrimarySense,
    };
    AuraMicroGamesBridge.setState({ minds_eye: result });
    if (mindsEyeTimerRef.current !== null) {
      window.clearTimeout(mindsEyeTimerRef.current);
    }
    mindsEyeTimerRef.current = window.setTimeout(() => {
      advanceAfterMoment(2);
    }, 210);
  };

  const renderCompactLanternPreview = (level: number) => {
    if (level === 10) {
      return (
        <svg width="180" height="72" viewBox="0 0 180 72" fill="none">
          <circle
            cx="90"
            cy="36"
            r="24"
            stroke="rgba(148,163,184,0.38)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <line
            x1="50"
            y1="22"
            x2="90"
            y2="36"
            stroke="rgba(167,139,250,0.5)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <line
            x1="130"
            y1="22"
            x2="90"
            y2="36"
            stroke="rgba(56,189,248,0.5)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <line
            x1="90"
            y1="36"
            x2="90"
            y2="62"
            stroke="rgba(52,211,153,0.45)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <circle cx="90" cy="36" r="4.5" fill="#a78bfa" />
          <circle cx="50" cy="22" r="3.5" fill="#94a3b8" />
          <circle cx="130" cy="22" r="3.5" fill="#38bdf8" />
          <circle cx="90" cy="62" r="3" fill="#34d399" />
          <text x="12" y="66" fill="rgba(148,163,184,0.75)" fontSize="8.5" fontFamily="monospace">
            V1: 0% · Semantic Graph
          </text>
        </svg>
      );
    }
    if (level === 38) {
      return (
        <svg width="180" height="72" viewBox="0 0 180 72" fill="none">
          <circle cx="90" cy="36" r="24" fill="rgba(251,191,36,0.08)" />
          <path
            d="M78 16H102L99 54H81L78 16Z"
            stroke="rgba(251,191,36,0.52)"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
          <circle cx="90" cy="35" r="4" fill="rgba(251,191,36,0.38)" />
          <text x="12" y="66" fill="rgba(251,191,36,0.75)" fontSize="8.5" fontFamily="monospace">
            V1: 38% · Dorsal Contour
          </text>
        </svg>
      );
    }
    if (level === 72) {
      return (
        <svg width="180" height="72" viewBox="0 0 180 72" fill="none">
          <circle cx="90" cy="35" r="29" fill="rgba(251,191,36,0.22)" />
          <rect
            x="76"
            y="16"
            width="28"
            height="38"
            rx="5"
            stroke="#fbbf24"
            strokeWidth="1.8"
            fill="rgba(251,191,36,0.24)"
          />
          <circle cx="90" cy="35" r="6" fill="#fef3c7" />
          <path d="M52 58H128" stroke="rgba(217,119,6,0.7)" strokeWidth="1.8" strokeLinecap="round" />
          <text x="12" y="68" fill="rgba(251,191,36,0.85)" fontSize="8.5" fontFamily="monospace">
            V1: 72% · Ventral Form
          </text>
        </svg>
      );
    }
    return (
      <svg width="180" height="72" viewBox="0 0 180 72" fill="none">
        <circle cx="90" cy="34" r="34" fill="rgba(251,191,36,0.36)" />
        <line x1="90" y1="34" x2="44" y2="12" stroke="rgba(254,243,199,0.45)" strokeWidth="1.4" />
        <line x1="90" y1="34" x2="136" y2="12" stroke="rgba(254,243,199,0.45)" strokeWidth="1.4" />
        <rect
          x="75"
          y="14"
          width="30"
          height="40"
          rx="5.5"
          stroke="#fef3c7"
          strokeWidth="2"
          fill="rgba(251,191,36,0.5)"
        />
        <circle cx="90" cy="34" r="8.5" fill="#ffffff" />
        <path d="M44 58H136" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="60" cy="22" r="1.8" fill="#fef3c7" />
        <circle cx="120" cy="20" r="2" fill="#fde68a" />
        <text x="12" y="68" fill="#fef3c7" fontSize="8.5" fontFamily="monospace">
          V1: 94% · Full Sensory Gain
        </text>
      </svg>
    );
  };

  // Render Navon / Figure-Ground Bistable Gestalt SVG for Step B
  const renderBistableGestaltSvg = (focus: PerceptualFocus) => {
    const isGlobal = focus === 'global_gestalt';
    const isLocal = focus === 'local_detail';
    const isSpace = focus === 'divergent_space';
    return (
      <svg width="116" height="58" viewBox="0 0 116 58" fill="none" style={{ flexShrink: 0 }}>
        {/* Negative-Space Central Diamond Portal */}
        <polygon
          points="58,10 78,29 58,48 38,29"
          fill={isSpace ? 'rgba(167,139,250,0.32)' : 'rgba(167,139,250,0.08)'}
          stroke={isSpace ? '#c4b5fd' : 'rgba(167,139,250,0.35)'}
          strokeWidth={isSpace ? '1.8' : '1'}
        />
        {/* Sweeping Global Macro-Arch */}
        <path
          d="M12 46 Q58 2 104 46"
          stroke={isGlobal ? '#fbbf24' : 'rgba(251,191,36,0.38)'}
          strokeWidth={isGlobal ? '3' : '1.5'}
          strokeDasharray={isLocal ? '2 3' : undefined}
          fill="none"
        />
        {/* Local Micro-Triangles forming the arch */}
        {[
          [18, 42],
          [31, 28],
          [44, 19],
          [58, 15],
          [72, 19],
          [85, 28],
          [98, 42],
        ].map(([cx, cy], idx) => (
          <polygon
            key={idx}
            points={`${cx},${cy - 5} ${cx - 4.5},${cy + 4} ${cx + 4.5},${cy + 4}`}
            fill={isLocal ? '#38bdf8' : 'rgba(56,189,248,0.45)'}
            stroke={isLocal ? '#e0f2fe' : 'none'}
            strokeWidth="0.9"
          />
        ))}
      </svg>
    );
  };

  const activeLineIndices = skyPhase === 'watching' ? shownSoFar : userPicks;
  const activeLineColor =
    skyPhase === 'watching' ? 'rgba(251, 191, 36, 0.78)' : 'rgba(196, 181, 253, 0.82)';

  const liveTel = AuraMicroGamesBridge.getState();

  return (
    <div id="micro-games-container">
      {/* ====================================================================
          MOMENT 1: STILL WATER — GO / NO-GO ATTENTIONAL TEMPO & INHIBITION
         ==================================================================== */}
      {gameIndex === 0 && (
        <div className="aura-mg-shell" data-game="still-water">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Neurological Baseline 1 of 3 · Go / No-Go Tempo
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '6px' }}>
            Tap Gold Sun-Ripples · Hold Still on Violet Lures
          </h3>

          {/* Dual-Signal Cognitive Rule Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(251, 191, 36, 0.14)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#fbbf24',
                fontWeight: 600,
              }}
            >
              ● Gold Ripple = TAP FAST
            </span>
            <span
              className="mono"
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(167, 139, 250, 0.14)',
                border: '1px solid rgba(167, 139, 250, 0.4)',
                color: '#c4b5fd',
                fontWeight: 600,
              }}
            >
              ◆ Violet Lure = DO NOT TAP
            </span>
          </div>

          <div className="aura-pond-stage">
            <div
              id="aura-pulse-pond"
              className={`aura-pond-circle ${
                pulsePhase === 'ready' || pulsePhase === 'rippling' ? 'is-ready' : ''
              } ${
                pulsePhase === 'rippling'
                  ? 'is-rippling'
                  : pulsePhase === 'lure'
                  ? 'is-lure'
                  : pulsePhase === 'captured' || pulsePhase === 'finished'
                  ? 'is-captured'
                  : 'is-waiting'
              }`}
              style={
                pulsePhase === 'lure'
                  ? {
                      background:
                        'radial-gradient(circle, rgba(139, 92, 246, 0.92) 0%, rgba(76, 29, 149, 0.68) 62%, rgba(30, 27, 75, 0.4) 100%)',
                      borderColor: '#c4b5fd',
                      boxShadow: '0 0 42px rgba(167, 139, 250, 0.75)',
                    }
                  : undefined
              }
              role="button"
              tabIndex={0}
              aria-label="Still water pond"
              onClick={handlePondClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handlePondClick(e);
              }}
            >
              <div className="aura-pond-breath-ring" />
              <div className="aura-pond-ripple-wave" />
              <div
                className="aura-pond-core"
                style={
                  pulsePhase === 'lure'
                    ? {
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        transform: 'rotate(45deg)',
                        background: '#ede9fe',
                        boxShadow: '0 0 20px #c4b5fd',
                      }
                    : undefined
                }
              />
              <div id="aura-pulse-status" className="aura-pond-label">
                {pulseStatusText}
              </div>
              <div
                style={{
                  position: 'relative',
                  zIndex: 3,
                  fontSize: '10px',
                  color: 'rgba(241,245,249,0.76)',
                  marginTop: '3px',
                  padding: '0 12px',
                  textAlign: 'center',
                }}
              >
                {pulseSubText}
              </div>
            </div>

            {/* 4-Channel Live Neuro-Telemetry Waveform Bar */}
            <div
              className="aura-inline-meta-row"
              style={{ gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}
            >
              {PULSE_TRIAL_PLAN.map((kind, slotIdx) => {
                const badge = trialBadges[slotIdx];
                const isLureSlot = kind === 'lure';
                return (
                  <span
                    key={slotIdx}
                    className={`aura-inline-slot ${badge ? 'done' : ''}`}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '6px',
                      background: 'var(--pill-bg)',
                      border: '1px solid var(--glass-border)',
                      color: badge
                        ? badge.includes('✗')
                          ? 'var(--rose)'
                          : 'var(--emerald)'
                        : undefined,
                    }}
                  >
                    {isLureSlot ? 'LURE' : `GO ${slotIdx === 0 ? 1 : slotIdx}`}:{' '}
                    {badge || '—'}
                  </span>
                );
              })}
              <button
                type="button"
                id="aura-pulse-skip"
                className="aura-inline-text-btn"
                data-action="skip-pulse"
                onClick={() => AuraMicroGamesBridge.quickCompletePulse()}
              >
                Skip →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MOMENT 2: NIGHT SKY — WORKING MEMORY & DISTRACTOR FILTERING
         ==================================================================== */}
      {gameIndex === 1 && (
        <div className="aura-mg-shell" data-game="night-sky">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Neurological Baseline 2 of 3 · Spatial Working Memory
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '6px' }}>
            Trace the 4 Gold Stars in Order · Ignore Violet Decoys
          </h3>

          {/* Live Spatial Memory & Distractor Gating Telemetry Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '6px',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '999px',
                background: 'rgba(251, 191, 36, 0.14)',
                border: '1px solid rgba(251, 191, 36, 0.38)',
                color: '#fbbf24',
              }}
            >
              ★ 4 Gold Targets = REMEMBER
            </span>
            <span
              className="mono"
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '999px',
                background: 'rgba(167, 139, 250, 0.14)',
                border: '1px solid rgba(167, 139, 250, 0.38)',
                color: '#c4b5fd',
              }}
            >
              ✦ 2 Violet Decoys = FILTER OUT
            </span>
            {planningMs !== null && (
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: 'rgba(52, 211, 153, 0.14)',
                  border: '1px solid rgba(52, 211, 153, 0.38)',
                  color: 'var(--emerald)',
                }}
              >
                Plan: {planningMs}ms
              </span>
            )}
          </div>

          <div className="aura-sky-stage">
            <div id="aura-constellation-grid" className="aura-sky-board">
              <svg id="aura-sky-svg" className="aura-sky-svg-lines" viewBox="0 0 220 220">
                {activeLineIndices.length >= 2 &&
                  activeLineIndices.slice(1).map((currIdx, i) => {
                    const a = starCoords(activeLineIndices[i]);
                    const b = starCoords(currIdx);
                    return (
                      <line
                        key={`${activeLineIndices[i]}-${currIdx}-${i}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={activeLineColor}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeDasharray="4 3"
                      />
                    );
                  })}
              </svg>
              {Array.from({ length: 9 }).map((_, idx) => {
                const isCurrentLit = litStarIdx === idx;
                const isDecoyLit = litDecoyIdx === idx;
                const demoOrderIdx = shownSoFar.indexOf(idx);
                const isDemoShown = skyPhase === 'watching' && demoOrderIdx >= 0;
                const userPickOrderIdx = userPicks.indexOf(idx);
                const isTraced = userPickOrderIdx >= 0;
                const patternPos = skyPattern.indexOf(idx);

                const badgeNumber =
                  skyPhase === 'watching' && demoOrderIdx >= 0
                    ? demoOrderIdx + 1
                    : isTraced
                    ? userPickOrderIdx + 1
                    : null;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`aura-star-node ${isCurrentLit ? 'is-lit' : ''} ${
                      isDemoShown ? 'is-demo-shown' : ''
                    } ${isTraced ? 'is-traced' : ''}`}
                    data-star-index={idx}
                    data-pattern-order={patternPos >= 0 ? String(patternPos + 1) : undefined}
                    aria-label={`Star ${idx + 1}`}
                    onClick={() => handleStarClick(idx)}
                  >
                    <span
                      className="aura-star-orb"
                      style={
                        isDecoyLit
                          ? {
                              background: 'rgba(139, 92, 246, 0.48)',
                              borderColor: '#c4b5fd',
                              transform: 'scale(1.18) rotate(45deg)',
                              boxShadow: '0 0 18px rgba(167, 139, 250, 0.85)',
                            }
                          : skyPhase === 'washout'
                          ? {
                              background: 'rgba(148, 163, 184, 0.24)',
                              borderColor: 'rgba(226, 232, 240, 0.45)',
                            }
                          : undefined
                      }
                    >
                      {isDecoyLit ? (
                        <span
                          className="mono"
                          style={{ fontSize: '10px', color: '#ede9fe', fontWeight: 700 }}
                        >
                          ✦
                        </span>
                      ) : badgeNumber !== null ? (
                        <span className="aura-star-order-num">{badgeNumber}</span>
                      ) : (
                        <span className="aura-star-core" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="aura-inline-meta-row" style={{ marginTop: '10px' }}>
              <span id="aura-constellation-prompt" className="aura-sky-inline-status">
                {skyPrompt}
              </span>
              <button
                type="button"
                id="aura-sky-replay"
                className="aura-inline-text-btn"
                onClick={() => runConstellationDemo(skyPattern, skyDecoys)}
              >
                ↻ Replay
              </button>
              <button
                type="button"
                id="aura-constellation-skip"
                className="aura-inline-text-btn"
                data-action="skip-constellation"
                onClick={() => AuraMicroGamesBridge.quickCompleteConstellation()}
              >
                Skip →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MOMENT 3: INNER CANVAS — SENSORY RECONSTRUCTION, BISTABLE GESTALT & MODALITY
         ==================================================================== */}
      {gameIndex === 2 && mindsEyeStep === 'A' && (
        <div className="aura-mg-shell" data-game="inner-canvas" data-step="A">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Neurological Baseline 3 of 3 · V1 Sensory Simulation
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '6px' }}>
            Imagine a warm brass lantern on a dark table. How does your mind construct it?
          </h3>

          <div
            id="inner-canvas-preview"
            className="aura-compact-lantern-preview"
            style={{ height: '74px', marginBottom: '8px' }}
          >
            {renderCompactLanternPreview(selectedVividness)}
          </div>

          {/* Primary Sensory Channel Selector Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '5px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            {PRIMARY_SENSE_PILLS.map((s) => {
              const active = selectedPrimarySense === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedPrimarySense(s.id)}
                  style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    background: active ? 'var(--accent-soft)' : 'var(--pill-bg)',
                    border: `1px solid ${active ? 'var(--border-active)' : 'var(--glass-border)'}`,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="choice-stack">
            {VIVIDNESS_CARDS.map((c, i) => {
              const isSelected = selectedVividness === c.vividness;
              return (
                <button
                  key={c.vividness}
                  type="button"
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  data-step="vividness"
                  data-vividness={c.vividness}
                  onClick={() => handleSelectVividness(c.vividness)}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{c.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {c.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-inline-text-btn"
              data-action="skip-mindseye"
              onClick={() => AuraMicroGamesBridge.quickCompleteMindsEye()}
            >
              Skip →
            </button>
          </div>
        </div>
      )}

      {gameIndex === 2 && mindsEyeStep === 'B' && (
        <div className="aura-mg-shell" data-game="inner-canvas" data-step="B">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Neurological Baseline 3 of 3 · Perceptual Gestalt &amp; Stream
          </div>

          {/* Live Synthesized Phase 1 Neurological Baseline Readout Strip */}
          <div
            id="phase1-neuro-readout-strip"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              marginBottom: '8px',
              borderRadius: '10px',
              background: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              fontSize: '10px',
            }}
          >
            <span className="mono" style={{ color: 'var(--emerald)', fontWeight: 600 }}>
              ● Tempo: {liveTel.pulse_reaction.median_rt_ms}ms (Hold{' '}
              {liveTel.pulse_reaction.inhibition_score_pct ?? 100}%)
            </span>
            <span className="mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>
              ★ Span: {liveTel.constellation_memory.accuracy_pct}% (Filter{' '}
              {liveTel.constellation_memory.distractors_ignored ?? 2}/2)
            </span>
            <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              ◉ V1: {selectedVividness}%
            </span>
          </div>

          {/* Interactive Navon / Figure-Ground Bistable Gestalt Mini-Experiment */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '7px 10px',
              marginBottom: '10px',
              borderRadius: '12px',
              background: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {renderBistableGestaltSvg(selectedPerceptualFocus)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '5px',
                }}
              >
                First-glance perceptual lock (tap what stood out first):
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {PERCEPTUAL_FOCUS_PILLS.map((p) => {
                  const active = selectedPerceptualFocus === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-perceptual-focus={p.id}
                      onClick={() => handleSelectPerceptualFocus(p.id)}
                      style={{
                        fontSize: '9.5px',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: active ? 'var(--accent-soft)' : 'transparent',
                        border: `1px solid ${
                          active ? 'var(--border-active)' : 'var(--glass-border)'
                        }`,
                        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {p.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <h3 className="aura-mg-title" style={{ marginBottom: '10px', fontSize: '19px' }}>
            When you work through a complex decision alone, how does your mind move?
          </h3>

          <div className="choice-stack">
            {MODALITY_CARDS.map((c, i) => {
              const isSelected = selectedModality === c.modality;
              return (
                <button
                  key={c.modality}
                  type="button"
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  data-step="modality"
                  data-modality={c.modality}
                  onClick={() => handleSelectModality(c.modality)}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{c.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {c.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div
            className="aura-inline-meta-row"
            style={{ justifyContent: 'space-between', marginTop: '8px' }}
          >
            <button
              type="button"
              className="aura-inline-text-btn"
              onClick={() => setMindsEyeStep('A')}
            >
              ← Back to imagery
            </button>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-inline-text-btn"
              data-action="skip-mindseye"
              onClick={() => AuraMicroGamesBridge.quickCompleteMindsEye()}
            >
              Skip →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
