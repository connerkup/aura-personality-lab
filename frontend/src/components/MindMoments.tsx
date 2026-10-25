import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConstellationMemoryTelemetry,
  InnerModality,
  MindsEyeTelemetry,
  PulseReactionTelemetry,
  TelemetryState,
} from '../types/aura';

export const DEFAULT_TELEMETRY_STATE: TelemetryState = {
  pulse_reaction: {
    completed: false,
    median_rt_ms: 274,
    rt_cv_pct: 8.6,
    steadiness_pct: 90,
    false_starts: 0,
  },
  constellation_memory: {
    completed: false,
    accuracy_pct: 100,
    mean_chunk_ms: 455,
  },
  minds_eye: {
    completed: false,
    imagery_vividness: 72,
    inner_modality: 'visual_cinema',
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
  falseStarts: number
): PulseReactionTelemetry {
  const cleanRts = (reactionTimesMs || [])
    .map((x) => Math.max(110, Math.min(2000, Number(x) || 280)))
    .sort((a, b) => a - b);

  if (cleanRts.length === 0) {
    return {
      completed: true,
      median_rt_ms: 274,
      rt_cv_pct: 8.6,
      steadiness_pct: 90,
      false_starts: Number(falseStarts) || 0,
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
  const fs = Math.max(0, Number(falseStarts) || 0);

  const steadiness = Math.max(
    38,
    Math.min(99, Math.round(100 - clampedCv * 1.15 - fs * 6))
  );

  return {
    completed: true,
    median_rt_ms: Math.round(medianRt),
    rt_cv_pct: clampedCv,
    steadiness_pct: steadiness,
    false_starts: fs,
  };
}

// Bridge for window.AuraMicroGames so Playwright tests and external callers work seamlessly
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
      median_rt_ms: 268,
      rt_cv_pct: 8.2,
      steadiness_pct: 91,
      false_starts: 0,
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
      mean_chunk_ms: 440,
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

export const MindMoments: React.FC<MindMomentsProps> = ({
  activeMomentIndex,
  nextStepLabel,
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

  // Sync when controlled prop changes
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
  // Game 1: Still Water State (Reaction Time & Attention Steadiness Pond)
  // ============================================================================
  const [pulseRound, setPulseRound] = useState<number>(0);
  const [pulsePhase, setPulsePhase] = useState<
    'ready' | 'waiting' | 'rippling' | 'captured' | 'finished'
  >('ready');
  const [pulseStatusText, setPulseStatusText] = useState<string>('Tap Here to Begin');
  const [pulseSubText, setPulseSubText] = useState<string>(
    '3 quick golden ripples · ~8 seconds'
  );
  const [pulseRoundRts, setPulseRoundRts] = useState<number[]>([]);
  const [pulseSummary, setPulseSummary] = useState<PulseReactionTelemetry | null>(null);
  const rippleShownAtRef = useRef<number>(0);
  const pulseRtsRef = useRef<number[]>([]);
  const pulseFalseStartsRef = useRef<number>(0);
  const pulseTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 2: Night Sky Constellation State (Spatial Pattern & Working Memory)
  // ============================================================================
  const [skyPattern, setSkyPattern] = useState<number[]>([0, 4, 5, 7]);
  const [skyPhase, setSkyPhase] = useState<'watching' | 'tracing' | 'finished'>('watching');
  const [litStarIdx, setLitStarIdx] = useState<number | null>(null);
  const [litStepDots, setLitStepDots] = useState<number>(0);
  const [shownSoFar, setShownSoFar] = useState<number[]>([]);
  const [userPicks, setUserPicks] = useState<number[]>([]);
  const [skyPrompt, setSkyPrompt] = useState<string>(
    'Watch the 4 stars awaken in order (1 → 2 → 3 → 4)…'
  );
  const [skyAccuracySummary, setSkyAccuracySummary] = useState<number | null>(null);
  const skyTapTimestampsRef = useRef<number[]>([]);
  const skyTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 3: Inner Canvas State (Unified Vividness Preview + Inner Stream)
  // ============================================================================
  const [selectedVividness, setSelectedVividness] = useState<number>(() => {
    return AuraMicroGamesBridge.getState().minds_eye.imagery_vividness || 72;
  });
  const [selectedModality, setSelectedModality] = useState<InnerModality>(() => {
    return AuraMicroGamesBridge.getState().minds_eye.inner_modality || 'visual_cinema';
  });

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
      const st = AuraMicroGamesBridge.getState().pulse_reaction;
      setPulseSummary(st);
      setPulseRoundRts([262, 268, 274]);
      setPulseRound(3);
      setPulsePhase('finished');
      setPulseStatusText('Steady Rhythm Captured');
      advanceAfterMoment(0);
    };
    externalQuickConstellationCb = () => {
      clearTimerList(skyTimersRef.current);
      setSkyAccuracySummary(100);
      setSkyPhase('finished');
      setSkyPrompt('Constellation Captured · 100% Pattern Match');
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
    };
  }, [advanceAfterMoment, switchMoment]);

  // ============================================================================
  // Game 1: Still Water Lifecycle
  // ============================================================================
  const scheduleNextRipple = useCallback((roundNum: number) => {
    clearTimerList(pulseTimersRef.current);
    setPulsePhase('waiting');
    setPulseStatusText('Wait for the golden glow…');
    setPulseSubText(`Ripple ${roundNum + 1} of 3 · Hold steady`);

    const delayMs = Math.round(900 + Math.random() * 650);
    const t = window.setTimeout(() => {
      rippleShownAtRef.current = nowMs();
      setPulsePhase('rippling');
      setPulseStatusText('✦ TAP NOW! ✦');
      setPulseSubText(`Ripple ${roundNum + 1} of 3 · Golden glow active!`);
    }, delayMs);
    pulseTimersRef.current.push(t);
  }, []);

  useEffect(() => {
    if (gameIndex === 0) {
      clearTimerList(pulseTimersRef.current);
      setPulseRound(0);
      setPulseRoundRts([]);
      setPulseSummary(null);
      pulseRtsRef.current = [];
      pulseFalseStartsRef.current = 0;
      setPulsePhase('ready');
      setPulseStatusText('Tap Here to Begin');
      setPulseSubText('3 quick golden ripples · ~8 seconds');
    }
    return () => clearTimerList(pulseTimersRef.current);
  }, [gameIndex]);

  // ONLY bound to onClick (and keyboard Enter/Space) — NEVER bound to both onPointerDown & onClick!
  const handlePondClick = (e?: React.SyntheticEvent) => {
    if (e && e.type === 'keydown') {
      e.preventDefault();
    }

    if (pulsePhase === 'finished' || pulsePhase === 'captured') return;

    // Phase 'ready' -> starts Round 1 cleanly!
    if (pulsePhase === 'ready') {
      scheduleNextRipple(0);
      return;
    }

    // Phase 'waiting' -> early tap / false start
    if (pulsePhase === 'waiting') {
      pulseFalseStartsRef.current += 1;
      setPulseStatusText('Too early — wait for the golden glow…');
      setPulseSubText('Resetting ripple…');
      clearTimerList(pulseTimersRef.current);
      const retryT = window.setTimeout(() => {
        scheduleNextRipple(pulseRound);
      }, 480);
      pulseTimersRef.current.push(retryT);
      return;
    }

    // Phase 'rippling' -> valid reaction capture!
    if (pulsePhase === 'rippling') {
      clearTimerList(pulseTimersRef.current);
      const rt = Math.max(110, Math.round(nowMs() - rippleShownAtRef.current));
      pulseRtsRef.current.push(rt);
      const nextRts = [...pulseRtsRef.current];
      setPulseRoundRts(nextRts);

      const nextRound = pulseRound + 1;
      setPulseRound(nextRound);

      if (nextRound >= 3) {
        const metrics = computePulseMetrics(
          pulseRtsRef.current,
          pulseFalseStartsRef.current
        );
        AuraMicroGamesBridge.setState({ pulse_reaction: metrics });
        setPulseSummary(metrics);
        setPulsePhase('finished');
        setPulseStatusText(`✓ ${rt} ms · Complete!`);
        setPulseSubText(
          `Steady Rhythm Captured · ${metrics.median_rt_ms} ms median · ${metrics.steadiness_pct}% steadiness`
        );

        const doneT = window.setTimeout(() => {
          advanceAfterMoment(0);
        }, 950);
        pulseTimersRef.current.push(doneT);
      } else {
        setPulsePhase('captured');
        setPulseStatusText(`✓ ${rt} ms`);
        setPulseSubText(`Ripple ${nextRound} captured · Prepare for Ripple ${nextRound + 1}…`);
        const nextT = window.setTimeout(() => {
          scheduleNextRipple(nextRound);
        }, 520);
        pulseTimersRef.current.push(nextT);
      }
    }
  };

  // ============================================================================
  // Game 2: Night Sky Lifecycle
  // ============================================================================
  const runConstellationDemo = useCallback((pattern: number[]) => {
    clearTimerList(skyTimersRef.current);
    setSkyPhase('watching');
    setLitStarIdx(null);
    setLitStepDots(0);
    setShownSoFar([]);
    setUserPicks([]);
    setSkyAccuracySummary(null);
    skyTapTimestampsRef.current = [];
    setSkyPrompt('Watch the 4 stars light up in order (1 → 2 → 3 → 4)…');

    const accShown: number[] = [];
    pattern.forEach((starIdx, stepIdx) => {
      const t = window.setTimeout(() => {
        setLitStarIdx(starIdx);
        setLitStepDots(stepIdx + 1);
        accShown.push(starIdx);
        setShownSoFar([...accShown]);
        setSkyPrompt(`Watching star ${stepIdx + 1} of 4…`);
      }, 500 + stepIdx * 520);
      skyTimersRef.current.push(t);
    });

    // Hold full 4-star constellation visible for 650ms after 4th star lights up
    const fourthStarLitAt = 500 + (pattern.length - 1) * 520;
    const holdUntil = fourthStarLitAt + 650;

    const traceT = window.setTimeout(() => {
      setLitStarIdx(null);
      setShownSoFar([]);
      setLitStepDots(0);
      setSkyPhase('tracing');
      setSkyPrompt('Now tap the 4 stars you saw in order (0/4 selected)');
    }, holdUntil);
    skyTimersRef.current.push(traceT);
  }, []);

  useEffect(() => {
    if (gameIndex !== 1) return;
    const CONSTELLATIONS = [
      [0, 4, 5, 7],
      [1, 3, 4, 8],
      [2, 4, 3, 7],
      [0, 1, 4, 8],
    ];
    const picked = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
    activeConstellationPattern = picked.slice();
    setSkyPattern(picked);
    runConstellationDemo(picked);

    return () => clearTimerList(skyTimersRef.current);
  }, [gameIndex, runConstellationDemo]);

  const starCoords = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const centers = [52, 123, 194];
    return { x: centers[col], y: centers[row] };
  };

  // ONLY bound to onClick — NEVER bound to both onPointerDown & onClick!
  const handleStarClick = (idx: number) => {
    if (skyPhase === 'finished') return;

    // Ignore clicks while demonstration is playing so an early tap doesn't corrupt the demo
    if (skyPhase === 'watching') {
      setSkyPrompt('Wait a moment — watch all 4 stars light up first…');
      return;
    }

    // Prevent duplicate star picks: if already picked, unselect it so user can fix a misclick
    if (userPicks.includes(idx)) {
      const filtered = userPicks.filter((s) => s !== idx);
      setUserPicks(filtered);
      setSkyPrompt(`Tap the 4 stars you saw (${filtered.length}/4 selected)`);
      return;
    }

    if (userPicks.length >= 4) return;
    const tNow = nowMs();
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
          : 460;

      const result: ConstellationMemoryTelemetry = {
        completed: true,
        accuracy_pct: accuracyPct,
        mean_chunk_ms: meanChunkMs,
      };
      AuraMicroGamesBridge.setState({ constellation_memory: result });
      setSkyAccuracySummary(accuracyPct);
      setSkyPhase('finished');
      setSkyPrompt(`Constellation Captured · ${accuracyPct}% Pattern Match`);

      const doneT = window.setTimeout(() => {
        advanceAfterMoment(1);
      }, 650);
      skyTimersRef.current.push(doneT);
    } else {
      setSkyPrompt(`Tap the 4 stars you saw (${nextPicks.length}/4 selected)`);
    }
  };

  // ============================================================================
  // Game 3: Inner Canvas Lifecycle (Unified Interactive Preview + Modality)
  // ============================================================================
  const VIVIDNESS_CARDS = [
    {
      vividness: 10,
      badge: 'Tier 1 · Concept Only',
      title: 'Pure Knowing (No Image)',
      desc: 'My mind’s eye is dark—I simply know the concept of a lantern without seeing a picture.',
    },
    {
      vividness: 38,
      badge: 'Tier 2 · Misty Sketch',
      title: 'Faint Silhouette',
      desc: 'A dim, fleeting outline or sense of where the lantern sits without sharp details.',
    },
    {
      vividness: 72,
      badge: 'Tier 3 · Clear Picture',
      title: 'Clear Warm Picture',
      desc: 'A distinct, steady image of a glowing lantern that I can hold in my mind.',
    },
    {
      vividness: 94,
      badge: 'Tier 4 · Living Cinema',
      title: 'Lifelike Golden Cinema',
      desc: 'As vivid as real life—warm light rays, wood grain texture, and floating embers.',
    },
  ];

  const MODALITY_CARDS: {
    modality: InnerModality;
    title: string;
    desc: string;
  }[] = [
    {
      modality: 'wordless_concept',
      title: 'Wordless Patterns & Knowing',
      desc: 'Silent intuition & spatial connections without needing words or pictures.',
    },
    {
      modality: 'inner_voice',
      title: 'Inner Voice & Dialogue',
      desc: 'Talking or reasoning through ideas in a conversational stream of words.',
    },
    {
      modality: 'visual_cinema',
      title: 'Moving Scenes & Pictures',
      desc: 'Playing out moments, places, and possibilities like short films.',
    },
  ];

  const handleSelectVividness = (viv: number) => {
    setSelectedVividness(viv);
    AuraMicroGamesBridge.setState({
      minds_eye: {
        completed: true,
        imagery_vividness: viv,
        inner_modality: selectedModality,
      },
    });
  };

  const handleSelectModality = (mod: InnerModality) => {
    setSelectedModality(mod);
    AuraMicroGamesBridge.setState({
      minds_eye: {
        completed: true,
        imagery_vividness: selectedVividness,
        inner_modality: mod,
      },
    });
  };

  const handleCompleteInnerCanvas = () => {
    const result: MindsEyeTelemetry = {
      completed: true,
      imagery_vividness: selectedVividness,
      inner_modality: selectedModality,
    };
    AuraMicroGamesBridge.setState({ minds_eye: result });
    advanceAfterMoment(2);
  };

  const renderLiveLanternStage = (level: number) => {
    if (level === 10) {
      return (
        <div className="aura-lantern-stage stage-v10">
          <svg width="240" height="110" viewBox="0 0 240 110" fill="none">
            <circle
              cx="120"
              cy="55"
              r="36"
              stroke="rgba(148,163,184,0.32)"
              strokeWidth="1.3"
              strokeDasharray="3 3"
            />
            <line
              x1="70"
              y1="36"
              x2="120"
              y2="55"
              stroke="rgba(167,139,250,0.4)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <line
              x1="170"
              y1="38"
              x2="120"
              y2="55"
              stroke="rgba(56,189,248,0.4)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <line
              x1="120"
              y1="55"
              x2="120"
              y2="88"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <circle cx="120" cy="55" r="5" fill="#a78bfa" />
            <circle cx="70" cy="36" r="3.5" fill="#94a3b8" />
            <circle cx="170" cy="38" r="3.5" fill="#38bdf8" />
            <circle cx="120" cy="88" r="3.5" fill="#94a3b8" />
            <text
              x="120"
              y="22"
              textAnchor="middle"
              fill="rgba(203,213,225,0.75)"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              [concept: warm_lantern] · [table]
            </text>
          </svg>
          <div className="aura-lantern-stage-caption">
            Pure Conceptual Knowing · Wordless semantic network (no visual image)
          </div>
        </div>
      );
    }

    if (level === 38) {
      return (
        <div className="aura-lantern-stage stage-v38">
          <svg width="240" height="110" viewBox="0 0 240 110" fill="none">
            <circle cx="120" cy="56" r="34" fill="rgba(251,191,36,0.08)" />
            <path
              d="M108 28C108 23 132 23 132 28"
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            <path
              d="M103 32H137L133 76H107L103 32Z"
              stroke="rgba(251,191,36,0.52)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="rgba(251,191,36,0.04)"
            />
            <circle cx="120" cy="55" r="5" fill="rgba(251,191,36,0.35)" />
            <line
              x1="66"
              y1="82"
              x2="174"
              y2="82"
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </svg>
          <div className="aura-lantern-stage-caption">
            Faint Silhouette · Dim wireframe outline &amp; quiet sense of space
          </div>
        </div>
      );
    }

    if (level === 72) {
      return (
        <div className="aura-lantern-stage stage-v72">
          <svg width="240" height="110" viewBox="0 0 240 110" fill="none">
            <circle cx="120" cy="54" r="42" fill="rgba(251,191,36,0.22)" />
            <path
              d="M108 24C108 18 132 18 132 24"
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect
              x="101"
              y="26"
              width="38"
              height="48"
              rx="6"
              stroke="#fbbf24"
              strokeWidth="2"
              fill="rgba(251,191,36,0.22)"
            />
            <line x1="101" y1="36" x2="139" y2="36" stroke="#f59e0b" strokeWidth="1.4" />
            <line x1="101" y1="64" x2="139" y2="64" stroke="#f59e0b" strokeWidth="1.4" />
            <circle cx="120" cy="50" r="8" fill="#fef3c7" />
            <path
              d="M64 78H176"
              stroke="rgba(217,119,6,0.75)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <div className="aura-lantern-stage-caption">
            Clear Picture · Steady warm lantern glowing on the table
          </div>
        </div>
      );
    }

    return (
      <div className="aura-lantern-stage stage-v94">
        <svg width="240" height="110" viewBox="0 0 240 110" fill="none">
          <circle cx="120" cy="52" r="52" fill="rgba(251,191,36,0.34)" />
          <circle cx="120" cy="52" r="34" fill="rgba(254,243,199,0.28)" />
          {/* Light rays */}
          <line
            x1="120"
            y1="50"
            x2="58"
            y2="18"
            stroke="rgba(254,243,199,0.38)"
            strokeWidth="1.5"
          />
          <line
            x1="120"
            y1="50"
            x2="182"
            y2="18"
            stroke="rgba(254,243,199,0.38)"
            strokeWidth="1.5"
          />
          <line
            x1="120"
            y1="50"
            x2="48"
            y2="52"
            stroke="rgba(254,243,199,0.3)"
            strokeWidth="1.5"
          />
          <line
            x1="120"
            y1="50"
            x2="192"
            y2="52"
            stroke="rgba(254,243,199,0.3)"
            strokeWidth="1.5"
          />
          {/* Wood table surface with grain & warm reflection */}
          <ellipse cx="120" cy="82" rx="68" ry="10" fill="rgba(245,158,11,0.32)" />
          <path
            d="M44 78H196"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M62 84H178"
            stroke="rgba(254,243,199,0.5)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Detailed Lantern */}
          <path
            d="M107 21C107 15 133 15 133 21"
            stroke="#fef3c7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="99"
            y="24"
            width="42"
            height="52"
            rx="7"
            stroke="#fef3c7"
            strokeWidth="2.2"
            fill="rgba(251,191,36,0.48)"
          />
          <circle cx="120" cy="50" r="11" fill="#ffffff" />
          {/* Floating embers */}
          <circle cx="82" cy="34" r="2" fill="#fef3c7" />
          <circle cx="156" cy="28" r="2.2" fill="#fde68a" />
          <circle cx="148" cy="60" r="1.8" fill="#fef3c7" />
          <circle cx="90" cy="58" r="1.6" fill="#fde68a" />
        </svg>
        <div className="aura-lantern-stage-caption">
          Lifelike Golden Cinema · Volumetric light rays, wood grain &amp; floating embers
        </div>
      </div>
    );
  };

  const renderModalitySvg = (modality: InnerModality) => {
    if (modality === 'wordless_concept') {
      return (
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="16" r="5" stroke="#a78bfa" strokeWidth="1.6" />
          <circle cx="21" cy="12" r="4" stroke="#38bdf8" strokeWidth="1.6" />
          <circle cx="20" cy="21" r="3.5" stroke="#f472b6" strokeWidth="1.6" />
          <path
            d="M15 14.5L17.5 13M14.5 18.5L17 20"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.3"
          />
        </svg>
      );
    }
    if (modality === 'inner_voice') {
      return (
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <path
            d="M8 16V16.1M12 12V20M16 8V24M20 12.5V19.5M24 14.5V17.5"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <rect
          x="5"
          y="8"
          width="22"
          height="16"
          rx="3.5"
          stroke="#f472b6"
          strokeWidth="1.6"
          fill="rgba(244,114,182,0.14)"
        />
        <circle cx="12.5" cy="13.5" r="2.2" fill="#fbbf24" />
        <path
          d="M7.5 21.5L13 16.5L17 19.5L20.5 17L24.5 21.5"
          stroke="#c4b5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const activeLineIndices = skyPhase === 'watching' ? shownSoFar : userPicks;
  const activeLineColor =
    skyPhase === 'watching' ? 'rgba(251, 191, 36, 0.78)' : 'rgba(196, 181, 253, 0.82)';

  const telState = useTelemetryState();

  return (
    <div id="micro-games-container">
      {/* Moment Selector Pills */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {[
          {
            idx: 0 as const,
            label: '1. Still Water',
            done: telState.pulse_reaction.completed,
          },
          {
            idx: 1 as const,
            label: '2. Night Sky',
            done: telState.constellation_memory.completed,
          },
          {
            idx: 2 as const,
            label: '3. Inner Canvas',
            done: telState.minds_eye.completed,
          },
        ].map((m) => (
          <button
            key={m.idx}
            type="button"
            onClick={() => switchMoment(m.idx)}
            className={`mask-pill ${gameIndex === m.idx ? 'active' : ''}`}
            style={{ fontSize: '11px', padding: '5px 11px' }}
          >
            {m.done ? `✓ ${m.label}` : m.label}
          </button>
        ))}
      </div>

      {/* ====================================================================
          MOMENT 1: STILL WATER (Reaction Time & Attention Steadiness Pond)
         ==================================================================== */}
      {gameIndex === 0 && (
        <div className="aura-mg-shell" data-game="still-water">
          <div className="aura-mg-header">
            <span className="aura-mg-pill">Moment 01 · Still Water</span>
            <div className="aura-mg-step-dots" id="aura-pulse-dots">
              {[0, 1, 2].map((rIdx) => (
                <span
                  key={rIdx}
                  className={`aura-mg-dot ${
                    rIdx < pulseRound
                      ? 'done'
                      : rIdx === pulseRound && pulsePhase !== 'finished'
                      ? 'active'
                      : ''
                  }`}
                  data-round={rIdx + 1}
                />
              ))}
            </div>
          </div>

          <h3 className="aura-mg-title">Follow the golden glow on the pond</h3>
          <p className="aura-mg-subtitle">
            Tap the pond once to begin, then tap as soon as the entire circle lights up in warm
            gold (3 quick ripples).
          </p>

          <div className="aura-pond-stage">
            <div
              id="aura-pulse-pond"
              className={`aura-pond-circle ${
                pulsePhase === 'ready'
                  ? 'is-ready'
                  : pulsePhase === 'rippling'
                  ? 'is-rippling'
                  : pulsePhase === 'captured' || pulsePhase === 'finished'
                  ? 'is-captured'
                  : 'is-waiting'
              }`}
              role="button"
              tabIndex={0}
              aria-label="Still water pond"
              onClick={handlePondClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handlePondClick(e);
              }}
            >
              <div className="aura-pond-breath-ring" />
              <div className="aura-pond-breath-ring-outer" />
              <div className="aura-pond-ripple-wave" />
              <div className="aura-pond-core" />
              <div id="aura-pulse-status" className="aura-pond-label">
                {pulseStatusText}
              </div>
              {pulsePhase === 'ready' && (
                <div className="aura-pond-ready-hint">3 quick golden ripples · ~8 seconds</div>
              )}
            </div>

            <div id="aura-pulse-sub" className="aura-pond-sub">
              {pulseSubText}
            </div>

            {/* 3 Live Reaction Time Feedback Pills */}
            <div id="aura-pulse-round-slots" className="aura-pulse-slots">
              {[0, 1, 2].map((slotIdx) => {
                const capturedMs = pulseRoundRts[slotIdx];
                const isCurrent =
                  capturedMs === undefined &&
                  pulseRound === slotIdx &&
                  (pulsePhase === 'waiting' || pulsePhase === 'rippling');
                return (
                  <div
                    key={slotIdx}
                    className={`aura-pulse-slot-pill ${
                      capturedMs !== undefined
                        ? 'captured'
                        : isCurrent
                        ? 'active'
                        : ''
                    }`}
                  >
                    <span className="slot-label">Ripple {slotIdx + 1}</span>
                    <span className="slot-val">
                      {capturedMs !== undefined
                        ? `✓ ${capturedMs} ms`
                        : isCurrent
                        ? 'Listening…'
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Completion Summary Banner & Continue CTA */}
            {pulsePhase === 'finished' && (
              <div className="aura-mg-complete-banner">
                <div className="aura-mg-complete-text">
                  ✦ Steady Rhythm Captured ·{' '}
                  <strong>{pulseSummary?.median_rt_ms ?? 268} ms</strong> median ·{' '}
                  <strong>{pulseSummary?.steadiness_pct ?? 91}%</strong> steadiness
                </div>
                <button
                  type="button"
                  id="aura-pulse-continue"
                  className="btn-primary"
                  style={{ padding: '10px 16px', fontSize: '13px', marginTop: '8px' }}
                  onClick={() => advanceAfterMoment(0)}
                >
                  {nextStepLabel || 'Continue to Night Sky →'}
                </button>
              </div>
            )}
          </div>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">3 golden ripples · ~8 seconds</span>
            <button
              type="button"
              id="aura-pulse-skip"
              className="aura-mg-skip-btn"
              data-action="skip-pulse"
              onClick={() => AuraMicroGamesBridge.quickCompletePulse()}
            >
              Skip this moment →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MOMENT 2: NIGHT SKY (Spatial Pattern & Working Memory Constellation)
         ==================================================================== */}
      {gameIndex === 1 && (
        <div className="aura-mg-shell" data-game="night-sky">
          <div className="aura-mg-header">
            <span className="aura-mg-pill">Moment 02 · Night Sky</span>
            <div className="aura-mg-step-dots" id="aura-sky-dots">
              {[0, 1, 2, 3].map((sIdx) => (
                <span
                  key={sIdx}
                  className={`aura-mg-dot ${
                    sIdx < userPicks.length
                      ? 'done'
                      : skyPhase === 'watching' && sIdx < litStepDots
                      ? 'active'
                      : ''
                  }`}
                  data-star-step={sIdx + 1}
                />
              ))}
            </div>
          </div>

          <h3 className="aura-mg-title">Hold a quiet constellation</h3>
          <p className="aura-mg-subtitle">
            Watch 4 numbered stars light up in order (1 → 2 → 3 → 4), then tap the same 4 stars to
            trace the constellation.
          </p>

          <div className="aura-sky-stage">
            <div id="aura-constellation-grid" className="aura-sky-board">
              <svg id="aura-sky-svg" className="aura-sky-svg-lines" viewBox="0 0 246 246">
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
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeDasharray="4 3"
                      />
                    );
                  })}
              </svg>
              {Array.from({ length: 9 }).map((_, idx) => {
                const isCurrentLit = litStarIdx === idx;
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
                    <span className="aura-star-orb">
                      {badgeNumber !== null ? (
                        <span className="aura-star-order-num">{badgeNumber}</span>
                      ) : (
                        <span className="aura-star-core" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div id="aura-constellation-prompt" className="aura-sky-prompt">
              {skyPrompt}
            </div>

            {/* Replay Demo & Clear Selection Controls */}
            <div className="aura-sky-controls">
              <button
                type="button"
                id="aura-sky-replay"
                className="btn-ghost"
                style={{ padding: '6px 12px', fontSize: '11.5px' }}
                onClick={() => runConstellationDemo(skyPattern)}
              >
                ↻ Watch Stars Again
              </button>
              {userPicks.length > 0 && skyPhase === 'tracing' && (
                <button
                  type="button"
                  id="aura-sky-clear"
                  className="btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => {
                    setUserPicks([]);
                    setSkyPrompt('Tap the 4 stars you saw in order (0/4 selected)');
                  }}
                >
                  Clear ({userPicks.length})
                </button>
              )}
            </div>

            {skyPhase === 'finished' && (
              <div className="aura-mg-complete-banner">
                <div className="aura-mg-complete-text">
                  ✦ Constellation Captured ·{' '}
                  <strong>{skyAccuracySummary ?? 100}%</strong> Pattern Match
                </div>
                <button
                  type="button"
                  id="aura-sky-continue"
                  className="btn-primary"
                  style={{ padding: '10px 16px', fontSize: '13px', marginTop: '8px' }}
                  onClick={() => advanceAfterMoment(1)}
                >
                  {nextStepLabel || 'Continue to Inner Canvas →'}
                </button>
              </div>
            )}
          </div>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">4 starlight nodes · ~8 seconds</span>
            <button
              type="button"
              id="aura-constellation-skip"
              className="aura-mg-skip-btn"
              data-action="skip-constellation"
              onClick={() => AuraMicroGamesBridge.quickCompleteConstellation()}
            >
              Skip this moment →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MOMENT 3: INNER CANVAS (Unified Live Lantern Preview + Inner Stream)
         ==================================================================== */}
      {gameIndex === 2 && (
        <div className="aura-mg-shell" data-game="inner-canvas">
          <div className="aura-mg-header">
            <span className="aura-mg-pill">Moment 03 · Inner Canvas</span>
            <div className="aura-mg-step-dots">
              <span className="aura-mg-dot done" />
              <span className="aura-mg-dot active" />
            </div>
          </div>

          <h3 className="aura-mg-title">
            Close your eyes for a second and imagine a warm glowing lantern on a wooden table. What
            happens in your mind?
          </h3>
          <p className="aura-mg-subtitle">
            Tap the card that matches your inner experience—watch the preview stage shift to mirror
            your mind’s eye.
          </p>

          {/* Live Interactive Lantern Preview Stage */}
          <div id="inner-canvas-preview" className="aura-inner-preview-wrap">
            {renderLiveLanternStage(selectedVividness)}
          </div>

          {/* 2x2 Selectable Vividness Grid */}
          <div className="aura-vividness-grid">
            {VIVIDNESS_CARDS.map((c) => {
              const isSelected = selectedVividness === c.vividness;
              return (
                <button
                  key={c.vividness}
                  type="button"
                  className={`aura-mind-card vividness-card ${isSelected ? 'selected' : ''}`}
                  data-step="vividness"
                  data-vividness={c.vividness}
                  onClick={() => handleSelectVividness(c.vividness)}
                >
                  <div className="aura-vividness-card-top">
                    <span className="aura-vividness-badge">{c.badge}</span>
                    <span className="choice-indicator">{isSelected ? '✓' : ''}</span>
                  </div>
                  <div className="aura-mind-card-title">{c.title}</div>
                  <div className="aura-mind-card-desc">{c.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Bottom Section: Inner Stream Modality */}
          <div className="aura-inner-stream-section">
            <h4 className="serif aura-inner-stream-title">
              And when you think through a decision alone, how does your inner mind mostly move?
            </h4>
            <div className="aura-mind-grid">
              {MODALITY_CARDS.map((c) => {
                const isSelected = selectedModality === c.modality;
                return (
                  <button
                    key={c.modality}
                    type="button"
                    className={`aura-mind-card ${isSelected ? 'selected' : ''}`}
                    data-step="modality"
                    data-modality={c.modality}
                    onClick={() => handleSelectModality(c.modality)}
                  >
                    <div className="aura-mind-art">{renderModalitySvg(c.modality)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="aura-mind-card-title">{c.title}</div>
                      <div className="aura-mind-card-desc">{c.desc}</div>
                    </div>
                    <span className="choice-indicator">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            id="btn-complete-mind-moments"
            className="btn-primary"
            style={{ marginTop: '6px', marginBottom: '8px' }}
            onClick={handleCompleteInnerCanvas}
          >
            {nextStepLabel || 'Complete Mind Moments & See My Portrait →'}
          </button>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">
              Mind’s Eye &amp; Inner Stream · Honours both visual &amp; wordless thinkers
            </span>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-mg-skip-btn"
              data-action="skip-mindseye"
              onClick={() =>
                AuraMicroGamesBridge.quickCompleteMindsEye(selectedVividness, selectedModality)
              }
            >
              Skip this moment →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
