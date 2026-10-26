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
  // Game 1: Still Water State
  // ============================================================================
  const [pulseRound, setPulseRound] = useState<number>(0);
  const [pulsePhase, setPulsePhase] = useState<
    'ready' | 'waiting' | 'rippling' | 'captured' | 'finished'
  >('ready');
  const [pulseStatusText, setPulseStatusText] = useState<string>('Tap to Begin');
  const [pulseRoundRts, setPulseRoundRts] = useState<number[]>([]);
  const rippleShownAtRef = useRef<number>(0);
  const pulseRtsRef = useRef<number[]>([]);
  const pulseFalseStartsRef = useRef<number>(0);
  const pulseTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 2: Night Sky State
  // ============================================================================
  const [skyPattern, setSkyPattern] = useState<number[]>([0, 4, 5, 7]);
  const [skyPhase, setSkyPhase] = useState<'watching' | 'tracing' | 'finished'>('watching');
  const [litStarIdx, setLitStarIdx] = useState<number | null>(null);
  const [shownSoFar, setShownSoFar] = useState<number[]>([]);
  const [userPicks, setUserPicks] = useState<number[]>([]);
  const [skyPrompt, setSkyPrompt] = useState<string>('Watch 1 → 2 → 3 → 4…');
  const skyTapTimestampsRef = useRef<number[]>([]);
  const skyTimersRef = useRef<number[]>([]);

  // ============================================================================
  // Game 3: Inner Canvas State (Compact 2-Step Zero-Scroll Flow)
  // ============================================================================
  const [mindsEyeStep, setMindsEyeStep] = useState<'A' | 'B'>('A');
  const [selectedVividness, setSelectedVividness] = useState<number>(72);
  const [selectedModality, setSelectedModality] = useState<InnerModality | null>(null);
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
      setPulseRoundRts([262, 268, 274]);
      setPulseRound(3);
      setPulsePhase('finished');
      setPulseStatusText('Steady Rhythm Captured');
      advanceAfterMoment(0);
    };
    externalQuickConstellationCb = () => {
      clearTimerList(skyTimersRef.current);
      setSkyPhase('finished');
      setSkyPrompt('Constellation Captured');
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
  // Game 1: Still Water Lifecycle
  // ============================================================================
  const scheduleNextRipple = useCallback((roundNum: number) => {
    clearTimerList(pulseTimersRef.current);
    setPulsePhase('waiting');
    setPulseStatusText('Wait for gold…');

    const delayMs = Math.round(900 + Math.random() * 600);
    const t = window.setTimeout(() => {
      rippleShownAtRef.current = nowMs();
      setPulsePhase('rippling');
      setPulseStatusText('TAP NOW');
    }, delayMs);
    pulseTimersRef.current.push(t);
  }, []);

  useEffect(() => {
    if (gameIndex === 0) {
      clearTimerList(pulseTimersRef.current);
      setPulseRound(0);
      setPulseRoundRts([]);
      pulseRtsRef.current = [];
      pulseFalseStartsRef.current = 0;
      setPulsePhase('ready');
      setPulseStatusText('Tap to Begin');
    }
    return () => clearTimerList(pulseTimersRef.current);
  }, [gameIndex]);

  const handlePondClick = (e?: React.SyntheticEvent) => {
    if (e && e.type === 'keydown') {
      e.preventDefault();
    }
    if (pulsePhase === 'finished' || pulsePhase === 'captured') return;

    if (pulsePhase === 'ready') {
      scheduleNextRipple(0);
      return;
    }

    if (pulsePhase === 'waiting') {
      pulseFalseStartsRef.current += 1;
      setPulseStatusText('Wait for gold…');
      clearTimerList(pulseTimersRef.current);
      const retryT = window.setTimeout(() => {
        scheduleNextRipple(pulseRound);
      }, 450);
      pulseTimersRef.current.push(retryT);
      return;
    }

    if (pulsePhase === 'rippling') {
      clearTimerList(pulseTimersRef.current);
      const rt = Math.max(110, Math.round(nowMs() - rippleShownAtRef.current));
      pulseRtsRef.current.push(rt);
      setPulseRoundRts([...pulseRtsRef.current]);

      const nextRound = pulseRound + 1;
      setPulseRound(nextRound);

      if (nextRound >= 3) {
        const metrics = computePulseMetrics(
          pulseRtsRef.current,
          pulseFalseStartsRef.current
        );
        AuraMicroGamesBridge.setState({ pulse_reaction: metrics });
        setPulsePhase('finished');
        setPulseStatusText(`${metrics.median_rt_ms} ms`);

        const doneT = window.setTimeout(() => {
          advanceAfterMoment(0);
        }, 650);
        pulseTimersRef.current.push(doneT);
      } else {
        setPulsePhase('captured');
        setPulseStatusText(`${rt} ms`);
        const nextT = window.setTimeout(() => {
          scheduleNextRipple(nextRound);
        }, 480);
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
    setShownSoFar([]);
    setUserPicks([]);
    skyTapTimestampsRef.current = [];
    setSkyPrompt('Watch 1 → 2 → 3 → 4…');

    const accShown: number[] = [];
    pattern.forEach((starIdx, stepIdx) => {
      const t = window.setTimeout(() => {
        setLitStarIdx(starIdx);
        accShown.push(starIdx);
        setShownSoFar([...accShown]);
      }, 450 + stepIdx * 480);
      skyTimersRef.current.push(t);
    });

    const holdUntil = 450 + (pattern.length - 1) * 480 + 600;
    const traceT = window.setTimeout(() => {
      setLitStarIdx(null);
      setShownSoFar([]);
      setSkyPhase('tracing');
      setSkyPrompt('Tap the 4 stars in order (0/4)');
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
    const centers = [44, 110, 176];
    return { x: centers[col], y: centers[row] };
  };

  const handleStarClick = (idx: number) => {
    if (skyPhase === 'finished') return;
    if (skyPhase === 'watching') return;

    if (userPicks.includes(idx)) {
      const filtered = userPicks.filter((s) => s !== idx);
      setUserPicks(filtered);
      setSkyPrompt(`Tap the 4 stars in order (${filtered.length}/4)`);
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
      setSkyPhase('finished');
      setSkyPrompt(`Captured · ${accuracyPct}% Match`);

      const doneT = window.setTimeout(() => {
        advanceAfterMoment(1);
      }, 500);
      skyTimersRef.current.push(doneT);
    } else {
      setSkyPrompt(`Tap the 4 stars in order (${nextPicks.length}/4)`);
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
      title: 'Pure Knowing',
      desc: 'No image, just the quiet concept',
    },
    {
      vividness: 38,
      title: 'Faint Silhouette',
      desc: 'A dim outline without detail',
    },
    {
      vividness: 72,
      title: 'Clear Picture',
      desc: 'A steady warm mental image',
    },
    {
      vividness: 94,
      title: 'Lifelike Cinema',
      desc: 'Vivid light, texture & motion',
    },
  ];

  const MODALITY_CARDS: {
    modality: InnerModality;
    title: string;
    desc: string;
  }[] = [
    {
      modality: 'wordless_concept',
      title: 'Wordless Patterns',
      desc: 'Silent intuition & connections',
    },
    {
      modality: 'inner_voice',
      title: 'Inner Voice',
      desc: 'Thinking in words & dialogue',
    },
    {
      modality: 'visual_cinema',
      title: 'Moving Scenes',
      desc: 'Playing out visual moments',
    },
  ];

  const handleSelectVividness = (viv: number) => {
    setSelectedVividness(viv);
    AuraMicroGamesBridge.setState({
      minds_eye: {
        completed: false,
        imagery_vividness: viv,
        inner_modality: selectedModality || 'visual_cinema',
      },
    });
    if (mindsEyeTimerRef.current !== null) {
      window.clearTimeout(mindsEyeTimerRef.current);
    }
    mindsEyeTimerRef.current = window.setTimeout(() => {
      setMindsEyeStep('B');
    }, 240);
  };

  const handleSelectModality = (mod: InnerModality) => {
    setSelectedModality(mod);
    const result: MindsEyeTelemetry = {
      completed: true,
      imagery_vividness: selectedVividness,
      inner_modality: mod,
    };
    AuraMicroGamesBridge.setState({ minds_eye: result });
    if (mindsEyeTimerRef.current !== null) {
      window.clearTimeout(mindsEyeTimerRef.current);
    }
    mindsEyeTimerRef.current = window.setTimeout(() => {
      advanceAfterMoment(2);
    }, 220);
  };

  const renderCompactLanternPreview = (level: number) => {
    if (level === 10) {
      return (
        <svg width="160" height="76" viewBox="0 0 160 76" fill="none">
          <circle
            cx="80"
            cy="38"
            r="24"
            stroke="rgba(148,163,184,0.32)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <line
            x1="46"
            y1="26"
            x2="80"
            y2="38"
            stroke="rgba(167,139,250,0.4)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <line
            x1="114"
            y1="26"
            x2="80"
            y2="38"
            stroke="rgba(56,189,248,0.4)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <circle cx="80" cy="38" r="4" fill="#a78bfa" />
          <circle cx="46" cy="26" r="3" fill="#94a3b8" />
          <circle cx="114" cy="26" r="3" fill="#38bdf8" />
        </svg>
      );
    }
    if (level === 38) {
      return (
        <svg width="160" height="76" viewBox="0 0 160 76" fill="none">
          <circle cx="80" cy="40" r="24" fill="rgba(251,191,36,0.08)" />
          <path
            d="M68 20H92L89 56H71L68 20Z"
            stroke="rgba(251,191,36,0.48)"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
          <circle cx="80" cy="38" r="4" fill="rgba(251,191,36,0.35)" />
        </svg>
      );
    }
    if (level === 72) {
      return (
        <svg width="160" height="76" viewBox="0 0 160 76" fill="none">
          <circle cx="80" cy="38" r="30" fill="rgba(251,191,36,0.2)" />
          <rect
            x="66"
            y="18"
            width="28"
            height="38"
            rx="5"
            stroke="#fbbf24"
            strokeWidth="1.8"
            fill="rgba(251,191,36,0.22)"
          />
          <circle cx="80" cy="37" r="6" fill="#fef3c7" />
          <path d="M44 60H116" stroke="rgba(217,119,6,0.7)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg width="160" height="76" viewBox="0 0 160 76" fill="none">
        <circle cx="80" cy="36" r="36" fill="rgba(251,191,36,0.34)" />
        <line x1="80" y1="36" x2="36" y2="14" stroke="rgba(254,243,199,0.4)" strokeWidth="1.4" />
        <line x1="80" y1="36" x2="124" y2="14" stroke="rgba(254,243,199,0.4)" strokeWidth="1.4" />
        <rect
          x="65"
          y="16"
          width="30"
          height="40"
          rx="5.5"
          stroke="#fef3c7"
          strokeWidth="2"
          fill="rgba(251,191,36,0.48)"
        />
        <circle cx="80" cy="36" r="8.5" fill="#ffffff" />
        <path d="M34 60H126" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="52" cy="24" r="1.8" fill="#fef3c7" />
        <circle cx="108" cy="22" r="2" fill="#fde68a" />
      </svg>
    );
  };

  const activeLineIndices = skyPhase === 'watching' ? shownSoFar : userPicks;
  const activeLineColor =
    skyPhase === 'watching' ? 'rgba(251, 191, 36, 0.78)' : 'rgba(196, 181, 253, 0.82)';

  return (
    <div id="micro-games-container">
      {/* ====================================================================
          MOMENT 1: STILL WATER (Weightless Single-Screen)
         ==================================================================== */}
      {gameIndex === 0 && (
        <div className="aura-mg-shell" data-game="still-water">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '6px' }}>
            Phase 1 · Neurological Baseline 1 of 3 · 8s
          </div>
          <h3 className="aura-mg-title">Tap when the circle turns warm gold</h3>

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
              <div className="aura-pond-ripple-wave" />
              <div className="aura-pond-core" />
              <div id="aura-pulse-status" className="aura-pond-label">
                {pulseStatusText}
              </div>
            </div>

            <div className="aura-inline-meta-row">
              {[0, 1, 2].map((slotIdx) => {
                const ms = pulseRoundRts[slotIdx];
                return (
                  <span
                    key={slotIdx}
                    className={`aura-inline-slot ${ms !== undefined ? 'done' : ''}`}
                  >
                    #{slotIdx + 1}: {ms !== undefined ? `${ms}ms` : '—'}
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
          MOMENT 2: NIGHT SKY (Weightless Single-Screen)
         ==================================================================== */}
      {gameIndex === 1 && (
        <div className="aura-mg-shell" data-game="night-sky">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '6px' }}>
            Phase 1 · Neurological Baseline 2 of 3 · 8s
          </div>
          <h3 className="aura-mg-title">Watch 4 stars light up, then trace them</h3>

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

            <div className="aura-inline-meta-row">
              <span id="aura-constellation-prompt" className="aura-sky-inline-status">
                {skyPrompt}
              </span>
              <button
                type="button"
                id="aura-sky-replay"
                className="aura-inline-text-btn"
                onClick={() => runConstellationDemo(skyPattern)}
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
          MOMENT 3: INNER CANVAS (Compact 2-Step Zero-Scroll Screen)
         ==================================================================== */}
      {gameIndex === 2 && mindsEyeStep === 'A' && (
        <div className="aura-mg-shell" data-game="inner-canvas" data-step="A">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '6px' }}>
            Phase 1 · Neurological Baseline 3 of 3 · Part 1
          </div>
          <h3 className="aura-mg-title">
            Imagine a warm lantern on a table. What appears in your mind?
          </h3>

          <div id="inner-canvas-preview" className="aura-compact-lantern-preview">
            {renderCompactLanternPreview(selectedVividness)}
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

          <div className="aura-inline-meta-row" style={{ justifyContent: 'flex-end' }}>
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
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '6px' }}>
            Phase 1 · Neurological Baseline 3 of 3 · Part 2
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '20px' }}>
            When you think through a decision alone, how does your mind move?
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

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between' }}>
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
