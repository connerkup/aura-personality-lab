import React, { useEffect, useRef, useState } from 'react';
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

interface MindMomentsProps {
  onAllComplete: (telemetry: TelemetryState) => void;
}

export const MindMoments: React.FC<MindMomentsProps> = ({ onAllComplete }) => {
  const [gameIndex, setGameIndex] = useState<0 | 1 | 2>(0);

  // Game 1: Still Water State
  const [pulseRound, setPulseRound] = useState<number>(0);
  const [pulsePhase, setPulsePhase] = useState<
    'waiting' | 'rippling' | 'captured' | 'finished'
  >('waiting');
  const [pulseStatusText, setPulseStatusText] = useState<string>(
    'Rest softly… wait for the light'
  );
  const [pulseSubText, setPulseSubText] = useState<string>('Ripple 1 of 3');
  const rippleShownAtRef = useRef<number>(0);
  const pulseRtsRef = useRef<number[]>([]);
  const pulseFalseStartsRef = useRef<number>(0);
  const lastTapTsRef = useRef<number>(0);
  const pulseTimersRef = useRef<number[]>([]);

  // Game 2: Night Sky Constellation State
  const [skyPattern, setSkyPattern] = useState<number[]>([0, 4, 5, 7]);
  const [skyPhase, setSkyPhase] = useState<'watching' | 'tracing' | 'finished'>('watching');
  const [litStarIdx, setLitStarIdx] = useState<number | null>(null);
  const [litStepDots, setLitStepDots] = useState<number>(0);
  const [shownSoFar, setShownSoFar] = useState<number[]>([]);
  const [userPicks, setUserPicks] = useState<number[]>([]);
  const [skyPrompt, setSkyPrompt] = useState<string>('Watch the stars awaken…');
  const skyTapTimestampsRef = useRef<number[]>([]);
  const lastStarTapTsRef = useRef<number>(0);
  const skyTimersRef = useRef<number[]>([]);

  // Game 3: Inner Canvas State
  const [mindsEyeStep, setMindsEyeStep] = useState<'A' | 'B'>('A');
  const [selectedVividness, setSelectedVividness] = useState<number>(72);
  const [highlightedVividness, setHighlightedVividness] = useState<number | null>(null);
  const [highlightedModality, setHighlightedModality] = useState<InnerModality | null>(null);

  const clearTimerList = (list: number[]) => {
    while (list.length > 0) {
      const t = list.pop();
      if (t !== undefined) window.clearTimeout(t);
    }
  };

  useEffect(() => {
    externalStageOverride = (idx) => {
      setGameIndex(idx);
    };
    externalQuickPulseCb = () => {
      clearTimerList(pulseTimersRef.current);
      setPulsePhase('finished');
      setPulseStatusText('Stillness captured');
      setGameIndex(1);
    };
    externalQuickConstellationCb = () => {
      clearTimerList(skyTimersRef.current);
      setSkyPhase('finished');
      setSkyPrompt('Constellation held in mind');
      setGameIndex(2);
    };
    externalQuickMindsEyeCb = () => {
      onAllComplete(AuraMicroGamesBridge.getState());
    };
    return () => {
      externalStageOverride = null;
      externalQuickPulseCb = null;
      externalQuickConstellationCb = null;
      externalQuickMindsEyeCb = null;
      clearTimerList(pulseTimersRef.current);
      clearTimerList(skyTimersRef.current);
    };
  }, [onAllComplete]);

  // ============================================================================
  // Game 1: Still Water Lifecycle
  // ============================================================================
  const scheduleNextRipple = (roundNum: number) => {
    clearTimerList(pulseTimersRef.current);
    setPulsePhase('waiting');
    setPulseStatusText('Rest softly… wait for the light');
    setPulseSubText(`Ripple ${roundNum + 1} of 3`);

    const delayMs = Math.round(1100 + Math.random() * 1000);
    const t = window.setTimeout(() => {
      rippleShownAtRef.current = nowMs();
      setPulsePhase('rippling');
      setPulseStatusText('Tap gently now');
    }, delayMs);
    pulseTimersRef.current.push(t);
  };

  useEffect(() => {
    if (gameIndex === 0) {
      setPulseRound(0);
      pulseRtsRef.current = [];
      pulseFalseStartsRef.current = 0;
      scheduleNextRipple(0);
    }
    return () => clearTimerList(pulseTimersRef.current);
  }, [gameIndex]);

  const handlePondTap = (e?: React.SyntheticEvent) => {
    const tNow = nowMs();
    if (tNow - lastTapTsRef.current < 80) return;
    lastTapTsRef.current = tNow;

    if (e && e.type === 'keydown') {
      e.preventDefault();
    }

    if (pulsePhase === 'finished' || pulsePhase === 'captured') return;

    if (pulsePhase === 'waiting') {
      pulseFalseStartsRef.current += 1;
      setPulseStatusText('A little early — wait for the golden ripple');
      setPulseSubText('Resetting the still water…');
      clearTimerList(pulseTimersRef.current);
      const retryT = window.setTimeout(() => {
        scheduleNextRipple(pulseRound);
      }, 420);
      pulseTimersRef.current.push(retryT);
      return;
    }

    if (pulsePhase === 'rippling') {
      const rt = Math.max(110, Math.round(tNow - rippleShownAtRef.current));
      pulseRtsRef.current.push(rt);
      const nextRound = pulseRound + 1;
      setPulseRound(nextRound);
      setPulsePhase('captured');
      setPulseStatusText(nextRound < 3 ? 'Lovely — breathe…' : 'Beautiful rhythm');
      setPulseSubText(`${rt} ms · Calm reception`);

      if (nextRound >= 3) {
        const metrics = computePulseMetrics(
          pulseRtsRef.current,
          pulseFalseStartsRef.current
        );
        AuraMicroGamesBridge.setState({ pulse_reaction: metrics });
        const doneT = window.setTimeout(() => {
          setPulsePhase('finished');
          setPulseStatusText('Stillness captured');
          setPulseSubText('Moving gently to the night sky…');
          setGameIndex(1);
        }, 360);
        pulseTimersRef.current.push(doneT);
      } else {
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
  useEffect(() => {
    if (gameIndex !== 1) return;
    clearTimerList(skyTimersRef.current);

    const CONSTELLATIONS = [
      [0, 4, 5, 7],
      [1, 3, 4, 8],
      [2, 4, 3, 7],
      [0, 1, 4, 8],
    ];
    const picked = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
    activeConstellationPattern = picked.slice();
    setSkyPattern(picked);
    setSkyPhase('watching');
    setLitStarIdx(null);
    setLitStepDots(0);
    setShownSoFar([]);
    setUserPicks([]);
    skyTapTimestampsRef.current = [];
    setSkyPrompt('Watch the stars awaken…');

    const accShown: number[] = [];
    picked.forEach((starIdx, stepIdx) => {
      const t = window.setTimeout(() => {
        setLitStarIdx(starIdx);
        setLitStepDots(stepIdx + 1);
        accShown.push(starIdx);
        setShownSoFar([...accShown]);
      }, 300 + stepIdx * 450);
      skyTimersRef.current.push(t);
    });

    const endPlaybackTime = 300 + picked.length * 450;
    const pauseT = window.setTimeout(() => {
      setLitStarIdx(null);
      setShownSoFar([]);
      setLitStepDots(0);
    }, endPlaybackTime);
    skyTimersRef.current.push(pauseT);

    const inviteT = window.setTimeout(() => {
      setSkyPhase('tracing');
      setSkyPrompt('Trace the 4 stars you saw');
    }, endPlaybackTime + 700);
    skyTimersRef.current.push(inviteT);

    return () => clearTimerList(skyTimersRef.current);
  }, [gameIndex]);

  const starCoords = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const centers = [52, 123, 194];
    return { x: centers[col], y: centers[row] };
  };

  const handleStarTap = (idx: number) => {
    const tNow = nowMs();
    if (tNow - lastStarTapTsRef.current < 70) return;
    lastStarTapTsRef.current = tNow;

    if (skyPhase === 'finished') return;

    if (skyPhase === 'watching') {
      clearTimerList(skyTimersRef.current);
      setLitStarIdx(null);
      setShownSoFar([]);
      setLitStepDots(0);
      setSkyPhase('tracing');
    }

    if (userPicks.length >= 4) return;
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
      setSkyPrompt('Constellation held in mind');

      const doneT = window.setTimeout(() => {
        setMindsEyeStep('A');
        setGameIndex(2);
      }, 340);
      skyTimersRef.current.push(doneT);
    } else {
      setSkyPrompt(`Trace the 4 stars you saw (${nextPicks.length}/4)`);
    }
  };

  // ============================================================================
  // Game 3: Inner Canvas Lifecycle
  // ============================================================================
  const VIVIDNESS_CARDS = [
    {
      vividness: 10,
      title: 'Pure Knowing (No Image)',
      desc: "I know what a lantern is, but my mind's eye is completely dark / wordless.",
    },
    {
      vividness: 38,
      title: 'Faint Silhouette',
      desc: 'A dim, fleeting outline or sense of space without clear details.',
    },
    {
      vividness: 72,
      title: 'Clear Picture',
      desc: 'A clear image I can hold and look at in my mind.',
    },
    {
      vividness: 94,
      title: 'Lifelike Cinema',
      desc: 'As vivid and detailed as seeing a real lantern in front of me.',
    },
  ];

  const MODALITY_CARDS: {
    modality: InnerModality;
    title: string;
    desc: string;
  }[] = [
    {
      modality: 'wordless_concept',
      title: 'Wordless Patterns & Concepts',
      desc: 'Silent intuition, spatial connections, or knowing without needing words.',
    },
    {
      modality: 'inner_voice',
      title: 'An Inner Voice / Monologue',
      desc: 'A gentle conversational stream talking or reasoning through ideas.',
    },
    {
      modality: 'visual_cinema',
      title: 'Moving Scenes & Visuals',
      desc: 'Playing out moments, places, and possibilities like short films.',
    },
  ];

  const renderLanternSvg = (level: number) => {
    if (level === 10) {
      return (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle
            cx="16"
            cy="16"
            r="9"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1.4"
            strokeDasharray="2.5 2.5"
          />
          <circle cx="16" cy="16" r="2" fill="rgba(148,163,184,0.45)" />
        </svg>
      );
    }
    if (level === 38) {
      return (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="17" r="9" fill="rgba(251,191,36,0.10)" />
          <path
            d="M12 12H20L19 22H13L12 12Z"
            stroke="rgba(251,191,36,0.45)"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
        </svg>
      );
    }
    if (level === 72) {
      return (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="17" r="11" fill="rgba(251,191,36,0.22)" />
          <path
            d="M13 9.5C13 8.5 19 8.5 19 9.5"
            stroke="#fbbf24"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <rect
            x="11.5"
            y="11"
            width="9"
            height="11"
            rx="2"
            stroke="#fbbf24"
            strokeWidth="1.5"
            fill="rgba(251,191,36,0.18)"
          />
          <circle cx="16" cy="16.5" r="2.4" fill="#fef3c7" />
        </svg>
      );
    }
    return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="rgba(251,191,36,0.34)" />
        <path
          d="M12.5 9C12.5 7.5 19.5 7.5 19.5 9"
          stroke="#fef3c7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect
          x="11"
          y="10.5"
          width="10"
          height="12"
          rx="2.2"
          stroke="#fef3c7"
          strokeWidth="1.6"
          fill="rgba(251,191,36,0.42)"
        />
        <circle cx="16" cy="16.5" r="3.4" fill="#ffffff" />
        <path d="M7 24.5H25" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  };

  const renderModalitySvg = (modality: InnerModality) => {
    if (modality === 'wordless_concept') {
      return (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="16" r="5" stroke="#a78bfa" strokeWidth="1.5" />
          <circle cx="21" cy="13" r="4" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="19" cy="21" r="3.5" stroke="#f472b6" strokeWidth="1.5" />
          <path
            d="M15 14.5L17.5 13.5M14.5 18.5L16.5 19.8"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />
        </svg>
      );
    }
    if (modality === 'inner_voice') {
      return (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path
            d="M8 16V16.1M12 12V20M16 9V23M20 13V19M24 15V17"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect
          x="6"
          y="9"
          width="20"
          height="14"
          rx="3"
          stroke="#f472b6"
          strokeWidth="1.5"
          fill="rgba(244,114,182,0.12)"
        />
        <circle cx="13" cy="14" r="2" fill="#fbbf24" />
        <path
          d="M8 21L13.5 16.5L17.5 19.5L21 17L24 21"
          stroke="#c4b5fd"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const handleSelectVividness = (viv: number) => {
    setSelectedVividness(viv);
    setHighlightedVividness(viv);
    window.setTimeout(() => {
      setHighlightedVividness(null);
      setMindsEyeStep('B');
    }, 180);
  };

  const handleSelectModality = (mod: InnerModality) => {
    setHighlightedModality(mod);
    const result: MindsEyeTelemetry = {
      completed: true,
      imagery_vividness: selectedVividness,
      inner_modality: mod,
    };
    const nextState = AuraMicroGamesBridge.setState({ minds_eye: result });
    window.setTimeout(() => {
      setHighlightedModality(null);
      onAllComplete(nextState);
    }, 180);
  };

  const activeLineIndices =
    skyPhase === 'watching' ? shownSoFar : userPicks;
  const activeLineColor =
    skyPhase === 'watching' ? 'rgba(251, 191, 36, 0.52)' : 'rgba(196, 181, 253, 0.68)';

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
          { idx: 0 as const, label: '1. Still Water' },
          { idx: 1 as const, label: '2. Night Sky' },
          { idx: 2 as const, label: '3. Inner Canvas' },
        ].map((m) => (
          <button
            key={m.idx}
            type="button"
            onClick={() => setGameIndex(m.idx)}
            className={`mask-pill ${gameIndex === m.idx ? 'active' : ''}`}
            style={{ fontSize: '11px', padding: '5px 11px' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* GAME 1: STILL WATER */}
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

          <h3 className="aura-mg-title">Follow the ripple on the pond</h3>
          <p className="aura-mg-subtitle">
            Rest your gaze on the quiet water. Each time a warm golden ripple blooms outward, tap
            the pond gently.
          </p>

          <div className="aura-pond-stage">
            <div
              id="aura-pulse-pond"
              className={`aura-pond-circle ${
                pulsePhase === 'rippling'
                  ? 'is-rippling'
                  : pulsePhase === 'captured' || pulsePhase === 'finished'
                  ? 'is-captured'
                  : ''
              }`}
              role="button"
              tabIndex={0}
              aria-label="Still water pond"
              onPointerDown={handlePondTap}
              onClick={handlePondTap}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handlePondTap(e);
              }}
            >
              <div className="aura-pond-breath-ring" />
              <div className="aura-pond-breath-ring-outer" />
              <div className="aura-pond-ripple-wave" />
              <div className="aura-pond-core" />
              <div id="aura-pulse-status" className="aura-pond-label">
                {pulseStatusText}
              </div>
            </div>
            <div id="aura-pulse-sub" className="aura-pond-sub">
              {pulseSubText}
            </div>
          </div>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">3 gentle ripples · ~8 seconds</span>
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

      {/* GAME 2: NIGHT SKY */}
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
            Watch four stars awaken in the night sky, then gently trace the four stars you saw.
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
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="3 3"
                      />
                    );
                  })}
              </svg>
              {Array.from({ length: 9 }).map((_, idx) => {
                const isLit = litStarIdx === idx;
                const isTraced = userPicks.includes(idx);
                const patternPos = skyPattern.indexOf(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`aura-star-node ${isLit ? 'is-lit' : ''} ${
                      isTraced ? 'is-traced' : ''
                    }`}
                    data-star-index={idx}
                    data-pattern-order={patternPos >= 0 ? String(patternPos + 1) : undefined}
                    aria-label={`Star ${idx + 1}`}
                    onPointerDown={() => handleStarTap(idx)}
                    onClick={() => handleStarTap(idx)}
                  >
                    <span className="aura-star-orb">
                      <span className="aura-star-core" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div id="aura-constellation-prompt" className="aura-sky-prompt">
              {skyPrompt}
            </div>
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

      {/* GAME 3: INNER CANVAS */}
      {gameIndex === 2 && mindsEyeStep === 'A' && (
        <div className="aura-mg-shell" data-game="inner-canvas" data-step="A">
          <div className="aura-mg-header">
            <span className="aura-mg-pill">Moment 03 · Inner Canvas (1/2)</span>
            <div className="aura-mg-step-dots">
              <span className="aura-mg-dot active" />
              <span className="aura-mg-dot" />
            </div>
          </div>

          <h3 className="aura-mg-title">
            Picture a warm glowing lantern on a wooden table. When you close your eyes or look
            inward, what actually appears?
          </h3>
          <p className="aura-mg-subtitle">
            Every inner mind paints differently—there is no right or wrong way to experience a
            thought.
          </p>

          <div className="aura-mind-grid">
            {VIVIDNESS_CARDS.map((c) => (
              <button
                key={c.vividness}
                type="button"
                className={`aura-mind-card ${
                  highlightedVividness === c.vividness ? 'selected' : ''
                }`}
                data-step="vividness"
                data-vividness={c.vividness}
                onClick={() => handleSelectVividness(c.vividness)}
              >
                <div className="aura-mind-art">{renderLanternSvg(c.vividness)}</div>
                <div>
                  <div className="aura-mind-card-title">{c.title}</div>
                  <div className="aura-mind-card-desc">{c.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">Step 1 of 2 · Inner imagery</span>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-mg-skip-btn"
              data-action="skip-mindseye"
              onClick={() => AuraMicroGamesBridge.quickCompleteMindsEye()}
            >
              Skip this moment →
            </button>
          </div>
        </div>
      )}

      {gameIndex === 2 && mindsEyeStep === 'B' && (
        <div className="aura-mg-shell" data-game="inner-canvas" data-step="B">
          <div className="aura-mg-header">
            <span className="aura-mg-pill">Moment 03 · Inner Canvas (2/2)</span>
            <div className="aura-mg-step-dots">
              <span className="aura-mg-dot done" />
              <span className="aura-mg-dot active" />
            </div>
          </div>

          <h3 className="aura-mg-title">
            When you think through a decision alone, what is the main stream inside your head?
          </h3>
          <p className="aura-mg-subtitle">
            Choose the inner texture that feels closest to your natural resting mind.
          </p>

          <div className="aura-mind-grid">
            {MODALITY_CARDS.map((c) => (
              <button
                key={c.modality}
                type="button"
                className={`aura-mind-card ${
                  highlightedModality === c.modality ? 'selected' : ''
                }`}
                data-step="modality"
                data-modality={c.modality}
                onClick={() => handleSelectModality(c.modality)}
              >
                <div className="aura-mind-art">{renderModalitySvg(c.modality)}</div>
                <div>
                  <div className="aura-mind-card-title">{c.title}</div>
                  <div className="aura-mind-card-desc">{c.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="aura-mg-footer">
            <span className="aura-mg-reassurance">Step 2 of 2 · Inner stream</span>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-mg-skip-btn"
              data-action="skip-mindseye"
              onClick={() => AuraMicroGamesBridge.quickCompleteMindsEye()}
            >
              Skip this moment →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
