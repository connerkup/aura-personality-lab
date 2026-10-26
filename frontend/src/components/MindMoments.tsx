import React, { useEffect, useState } from 'react';
import {
  ATTENTION_ENGINE_OPTIONS,
  BANDWIDTH_OPTIONS,
  BASELINE_STEP_SLUGS,
  CHRONOTYPE_PILLS,
  CULTURAL_REGION_OPTIONS,
  FAITH_TRAJECTORY_OPTIONS,
  FAMILY_ROLE_PILLS,
  LIFE_TRANSITION_PILLS,
  SENSORY_THRESHOLD_PILLS,
  SOCIAL_BATTERY_OPTIONS,
  SOCIALIZED_EXPECTATION_PILLS,
  UPBRINGING_SCRIPT_OPTIONS,
  WORK_ROLE_BLEED_OPTIONS,
  compute14FactorDeconfounding,
} from '../data/deconfoundingEngine';
import {
  AGE_BAND_OPTIONS,
  DEFAULT_USER_CONTEXT,
  LANGUAGE_OPTIONS,
  LIFE_CONTEXT_OPTIONS,
} from '../data/adaptivePool120';
import {
  AgeBand,
  AttentionEngineType,
  BandwidthState,
  ChronotypePreference,
  ConstellationMemoryTelemetry,
  CulturalRegionId,
  FaithTrajectory,
  FamilyRoleNiche,
  HouseholdSpace,
  InnerModality,
  LifeContext,
  LifeTransitionState,
  MindsEyeTelemetry,
  PulseReactionTelemetry,
  ResourceCushionType,
  ScheduleAutonomy,
  SensoryThresholdType,
  SocialBatteryState,
  SocializedExpectation,
  SupportedLanguage,
  TelemetryState,
  UpbringingScript,
  UserContextProfile,
  WorkRoleBleedType,
} from '../types/aura';

export const DEFAULT_TELEMETRY_STATE: TelemetryState = {
  pulse_reaction: {
    completed: true,
    median_rt_ms: 264,
    rt_cv_pct: 8.2,
    steadiness_pct: 91,
    false_starts: 0,
    lure_trials: 1,
    lure_false_alarms: 0,
    inhibition_score_pct: 100,
    post_lure_rt_ms: 260,
  },
  constellation_memory: {
    completed: true,
    accuracy_pct: 100,
    mean_chunk_ms: 415,
    planning_latency_ms: 640,
    distractors_ignored: 2,
    distractor_resistance_pct: 100,
    planning_style: 'holistic_planner',
  },
  minds_eye: {
    completed: true,
    imagery_vividness: 72,
    inner_modality: 'visual_cinema',
    perceptual_focus: 'global_gestalt',
    perceptual_rt_ms: 780,
    primary_sense: 'visual_light',
  },
};

function cloneState<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let globalTelemetryState: TelemetryState = cloneState(DEFAULT_TELEMETRY_STATE);
const subscribers = new Set<(state: TelemetryState) => void>();

function notifyTelemetrySubscribers() {
  const snapshot = cloneState(globalTelemetryState);
  subscribers.forEach((fn) => fn(snapshot));
}

export function computePulseMetrics(
  reactionTimesMs: number[],
  falseStarts: number,
  lureFalseAlarms = 0,
  postLureRtMs?: number
): PulseReactionTelemetry {
  const cleanRts = (reactionTimesMs || [])
    .map((x) => Math.max(140, Math.min(860, Number(x) || 268)))
    .sort((a, b) => a - b);
  const fs = Math.max(0, Number(falseStarts) || 0);
  const lfa = Math.max(0, Number(lureFalseAlarms) || 0);
  const inhibitionScore = Math.max(25, Math.min(100, 100 - lfa * 35 - fs * 12));
  const mid = Math.floor(cleanRts.length / 2);
  const medianRt =
    cleanRts.length === 0
      ? 264
      : cleanRts.length % 2 === 1
      ? cleanRts[mid]
      : (cleanRts[mid - 1] + cleanRts[mid]) * 0.5;
  return {
    completed: true,
    median_rt_ms: Math.round(medianRt),
    rt_cv_pct: 8.2,
    steadiness_pct: 91,
    false_starts: fs,
    lure_trials: 1,
    lure_false_alarms: lfa,
    inhibition_score_pct: inhibitionScore,
    post_lure_rt_ms: Math.round(postLureRtMs || medianRt),
  };
}

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
    return this.getState();
  },
  quickCompletePulse(
    customCallback?: (res: PulseReactionTelemetry) => void
  ): PulseReactionTelemetry {
    const res = cloneState(globalTelemetryState.pulse_reaction);
    res.completed = true;
    globalTelemetryState.pulse_reaction = res;
    notifyTelemetrySubscribers();
    if (customCallback) customCallback(cloneState(res));
    return cloneState(res);
  },
  quickCompleteConstellation(
    customCallback?: (res: ConstellationMemoryTelemetry) => void
  ): ConstellationMemoryTelemetry {
    const res = cloneState(globalTelemetryState.constellation_memory);
    res.completed = true;
    globalTelemetryState.constellation_memory = res;
    notifyTelemetrySubscribers();
    if (customCallback) customCallback(cloneState(res));
    return cloneState(res);
  },
  quickCompleteMindsEye(
    customVividness?: number | ((res: MindsEyeTelemetry) => void),
    customModality?: InnerModality,
    customCallback?: (res: MindsEyeTelemetry) => void
  ): MindsEyeTelemetry {
    const res = cloneState(globalTelemetryState.minds_eye);
    res.completed = true;
    if (typeof customVividness === 'number') res.imagery_vividness = customVividness;
    if (typeof customModality === 'string') res.inner_modality = customModality;
    globalTelemetryState.minds_eye = res;
    notifyTelemetrySubscribers();
    const cb = typeof customVividness === 'function' ? customVividness : customCallback;
    if (cb) cb(cloneState(res));
    return cloneState(res);
  },
  getActiveConstellationPattern(): number[] {
    return [0, 4, 5, 7];
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

// Legacy slug map preserved + 8-step 14-Confound Baseline slugs
export const MIND_MOMENT_SLUGS: Record<number, string> = {
  0: BASELINE_STEP_SLUGS[0],
  1: BASELINE_STEP_SLUGS[1],
  2: BASELINE_STEP_SLUGS[2],
  3: BASELINE_STEP_SLUGS[3],
  4: BASELINE_STEP_SLUGS[4],
  5: BASELINE_STEP_SLUGS[5],
  6: BASELINE_STEP_SLUGS[6],
  7: BASELINE_STEP_SLUGS[7],
};

interface MindMomentsProps {
  activeMomentIndex?: number;
  userContext?: UserContextProfile;
  onChangeUserContext?: (nextCtx: UserContextProfile) => void;
  nextStepLabel?: string;
  onSelectMomentIndex?: (idx: number) => void;
  onCompleteSingleMoment?: (momentIdx: number, telemetry: TelemetryState, updatedCtx?: UserContextProfile) => void;
  onAllComplete: (telemetry: TelemetryState) => void;
}

export const MindMoments: React.FC<MindMomentsProps> = ({
  activeMomentIndex = 0,
  userContext = DEFAULT_USER_CONTEXT,
  onChangeUserContext,
  onCompleteSingleMoment,
  onAllComplete,
}) => {
  const stepIdx = Math.max(0, Math.min(7, Number(activeMomentIndex) || 0));

  const updateCtx = (patch: Partial<UserContextProfile>): UserContextProfile => {
    const merged: UserContextProfile = {
      ...DEFAULT_USER_CONTEXT,
      ...userContext,
      ...patch,
    };
    if (onChangeUserContext) {
      onChangeUserContext(merged);
    }
    // Keep telemetry state synchronized with Neurotype / Attention / Inner Modality selections
    if (patch.attentionEngine || patch.sensoryThreshold || patch.innerModality || patch.bandwidthState) {
      const isSpark =
        merged.attentionEngine === 'interest_hyperfocus' ||
        merged.attentionEngine === 'nonlinear_explorer';
      const isSystemizer = merged.attentionEngine === 'deep_systemizer';
      AuraMicroGamesBridge.setState({
        pulse_reaction: {
          completed: true,
          median_rt_ms: isSpark ? 248 : 268,
          rt_cv_pct: isSpark ? 21.4 : 8.2,
          steadiness_pct: isSpark ? 68 : 92,
          false_starts: isSpark ? 1 : 0,
          inhibition_score_pct: isSpark ? 82 : 100,
        },
        constellation_memory: {
          completed: true,
          accuracy_pct: isSystemizer ? 98 : 92,
          mean_chunk_ms: isSystemizer ? 375 : 420,
          planning_style: isSystemizer ? 'holistic_planner' : isSpark ? 'rapid_forager' : 'balanced_chunker',
        },
        minds_eye: {
          completed: true,
          imagery_vividness:
            merged.innerModality === 'wordless_concept'
              ? 18
              : merged.innerModality === 'inner_voice'
              ? 58
              : 86,
          inner_modality: merged.innerModality || 'visual_cinema',
        },
      });
    }
    return merged;
  };

  const advanceStep = (mergedCtx?: UserContextProfile) => {
    const tel = AuraMicroGamesBridge.getState();
    if (onCompleteSingleMoment) {
      onCompleteSingleMoment(stepIdx, tel, mergedCtx || userContext);
    } else {
      onAllComplete(tel);
    }
  };

  const liveDeconfound = compute14FactorDeconfounding(userContext);

  const pillBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '10px',
    padding: '3.5px 8px',
    borderRadius: '999px',
    cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'var(--pill-bg)',
    border: `1px solid ${active ? 'var(--border-active)' : 'var(--glass-border)'}`,
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: active ? 600 : 500,
    transition: 'all 0.14s ease',
  });

  const compactCardStyle: React.CSSProperties = {
    padding: '9px 12px',
    minHeight: '44px',
  };

  return (
    <div id="micro-games-container" data-baseline-step={stepIdx + 1}>
      {/* ====================================================================
          STEP 01 / 08: CURRENT BANDWIDTH & LIFE TRANSITION (Confounds #1 & #13)
         ==================================================================== */}
      {stepIdx === 0 && (
        <div className="aura-mg-shell" data-game="baseline-bandwidth">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 1 of 8 · Energy &amp; Life Season
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '8px', fontSize: '21px' }}>
            Before we look at your long-term patterns, how is your energy and bandwidth this week?
          </h3>

          {/* Confound #13: Major Life Transition Tag */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                textAlign: 'center',
              }}
            >
              Current life chapter (separates temporary upheaval from lifelong traits):
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '5px',
                flexWrap: 'wrap',
              }}
            >
              {LIFE_TRANSITION_PILLS.map((lt) => {
                const active = (userContext.lifeTransition || 'steady_chapter') === lt.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    data-transition={lt.id}
                    onClick={() => updateCtx({ lifeTransition: lt.id as LifeTransitionState })}
                    style={pillBtnStyle(active)}
                  >
                    {lt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {BANDWIDTH_OPTIONS.map((opt, i) => {
              const isSelected = userContext.bandwidthState === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-bandwidth={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ bandwidthState: opt.id as BandwidthState });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: Burnout vs. Conscientiousness (C)
            </span>
            <button
              type="button"
              id="aura-pulse-skip"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 02 / 08: SOCIAL BATTERY, MOOD HALO & CHRONOTYPE (Confounds #2 & #9)
         ==================================================================== */}
      {stepIdx === 1 && (
        <div className="aura-mg-shell" data-game="baseline-social-weather">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 2 of 8 · Social Battery &amp; Chronotype
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '8px', fontSize: '21px' }}>
            Where is your social battery today, and when does your focus naturally peak?
          </h3>

          {/* Confound #9: Biological Chronotype */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            {CHRONOTYPE_PILLS.map((ch) => {
              const active = (userContext.chronotype || 'midday_flexible') === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  data-chronotype={ch.id}
                  onClick={() => updateCtx({ chronotype: ch.id as ChronotypePreference })}
                  style={pillBtnStyle(active)}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {SOCIAL_BATTERY_OPTIONS.map((opt, i) => {
              const isSelected = userContext.socialBatteryState === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-social-battery={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ socialBatteryState: opt.id as SocialBatteryState });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: Peopled-Out vs. Introversion (E)
            </span>
            <button
              type="button"
              id="aura-constellation-skip"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 03 / 08: CULTURAL ROOTS, HOME & EXPECTATIONS (Confounds #3 & #11)
         ==================================================================== */}
      {stepIdx === 2 && (
        <div className="aura-mg-shell" data-game="baseline-cultural-roots">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 3 of 8 · Cultural &amp; Regional Lens
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '10px', fontSize: '21px' }}>
            Which cultural environment shaped you growing up, and where do you live now?
          </h3>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '10px',
            }}
          >
            <div>
              <label
                htmlFor="baseline-country-raised"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Country / Cultural Region Where You Were Raised
              </label>
              <select
                id="baseline-country-raised"
                value={userContext.countryRaised || 'us_canada'}
                onChange={(e) =>
                  updateCtx({ countryRaised: e.target.value as CulturalRegionId })
                }
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'inherit',
                }}
              >
                {CULTURAL_REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="baseline-country-current"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Country / Cultural Region Where You Live Now
              </label>
              <select
                id="baseline-country-current"
                value={userContext.countryCurrent || 'us_canada'}
                onChange={(e) =>
                  updateCtx({ countryCurrent: e.target.value as CulturalRegionId })
                }
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontFamily: 'inherit',
                }}
              >
                {CULTURAL_REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {liveDeconfound.bicultural_active && (
              <div
                className="mono"
                style={{
                  fontSize: '10.5px',
                  color: 'var(--emerald)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                }}
              >
                ✦ Bicultural / Cross-Cultural Code-Switching Lens Active
              </div>
            )}

            {/* Confound #11: Gender / Socialized Role Expectations */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '5px',
                }}
              >
                Socialized Role Expectations Growing Up (Gender / Social Norms):
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {SOCIALIZED_EXPECTATION_PILLS.map((se) => {
                  const active =
                    (userContext.socializedExpectation || 'egalitarian_balanced') === se.id;
                  return (
                    <button
                      key={se.id}
                      type="button"
                      data-socialized-exp={se.id}
                      onClick={() =>
                        updateCtx({ socializedExpectation: se.id as SocializedExpectation })
                      }
                      style={pillBtnStyle(active)}
                    >
                      {se.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Assessment Language:
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {LANGUAGE_OPTIONS.map((lang) => {
                  const active = userContext.language === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => updateCtx({ language: lang.id as SupportedLanguage })}
                      style={pillBtnStyle(active)}
                    >
                      {lang.flag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            id="btn-baseline-cultural-continue"
            type="button"
            onClick={() => advanceStep()}
            className="btn-primary"
            style={{ width: '100%', padding: '11px 16px' }}
          >
            Lock Cultural Lens &amp; Continue →
          </button>
        </div>
      )}

      {/* ====================================================================
          STEP 04 / 08: UPBRINGING SCRIPT & FAMILY ROLE (Confounds #4 & #12)
         ==================================================================== */}
      {stepIdx === 3 && (
        <div className="aura-mg-shell" data-game="baseline-upbringing-script">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 4 of 8 · Upbringing &amp; Family Role
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '8px', fontSize: '21px' }}>
            In the household that shaped you most, what was your role and the unspoken rule?
          </h3>

          {/* Confound #12: Childhood Family Role / Birth Order Niche */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                textAlign: 'center',
              }}
            >
              Your structural role in the family growing up (Birth Order / Family Systems):
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '5px',
                flexWrap: 'wrap',
              }}
            >
              {FAMILY_ROLE_PILLS.map((fr) => {
                const active = (userContext.familyRole || 'independent_middle') === fr.id;
                return (
                  <button
                    key={fr.id}
                    type="button"
                    data-family-role={fr.id}
                    onClick={() => updateCtx({ familyRole: fr.id as FamilyRoleNiche })}
                    style={pillBtnStyle(active)}
                  >
                    {fr.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {UPBRINGING_SCRIPT_OPTIONS.map((opt, i) => {
              const isSelected = userContext.upbringingScript === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-upbringing={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ upbringingScript: opt.id as UpbringingScript });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: Politeness / Face-Saving vs. Assertiveness
            </span>
            <button
              type="button"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 05 / 08: FAITH, SPIRITUALITY & WORLDVIEW (Confound #5)
         ==================================================================== */}
      {stepIdx === 4 && (
        <div className="aura-mg-shell" data-game="baseline-faith-worldview">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 5 of 8 · Faith &amp; Worldview Lens
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '10px', fontSize: '21px' }}>
            How have religion, faith, or spirituality shaped your worldview and daily habits?
          </h3>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {FAITH_TRAJECTORY_OPTIONS.map((opt, i) => {
              const isSelected = userContext.faithTrajectory === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-faith={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ faithTrajectory: opt.id as FaithTrajectory });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: Moral Conscience &amp; Tradition vs. Openness (O) &amp; Guilt (N)
            </span>
            <button
              type="button"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 06 / 08: NEUROTYPE, ATTENTION ENGINE & SENSORY GAIN (Confound #8)
         ==================================================================== */}
      {stepIdx === 5 && (
        <div className="aura-mg-shell" data-game="baseline-neurotype-sensory">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 6 of 8 · Focus &amp; Sensory Wiring
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '8px', fontSize: '21px' }}>
            How does your attention engine lock onto tasks, and how sensitive are you to sensory noise?
          </h3>

          {/* Sensory Threshold & Inner Stream Pills */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '5px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            {SENSORY_THRESHOLD_PILLS.map((st) => {
              const active =
                (userContext.sensoryThreshold || 'moderate_sensory') === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  data-sensory={st.id}
                  onClick={() =>
                    updateCtx({ sensoryThreshold: st.id as SensoryThresholdType })
                  }
                  style={pillBtnStyle(active)}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {ATTENTION_ENGINE_OPTIONS.map((opt, i) => {
              const isSelected = userContext.attentionEngine === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-attention={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ attentionEngine: opt.id as AttentionEngineType });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: ADHD Spark / Sensory Overload vs. Low C / Low E
            </span>
            <button
              type="button"
              id="aura-mindseye-skip"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 07 / 08: OCCUPATIONAL ROLE BLEED (Confound #10)
         ==================================================================== */}
      {stepIdx === 6 && (
        <div className="aura-mg-shell" data-game="baseline-work-role-bleed">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 7 of 8 · 9-to-5 Work Role Conditioning
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '10px', fontSize: '21px' }}>
            What does your daily work or primary role train you to do all day—even when off the clock you are different?
          </h3>

          <div className="choice-stack" style={{ gap: '6px' }}>
            {WORK_ROLE_BLEED_OPTIONS.map((opt, i) => {
              const isSelected = userContext.workRoleBleed === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-work-bleed={opt.id}
                  style={compactCardStyle}
                  className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    const next = updateCtx({ workRoleBleed: opt.id as WorkRoleBleedType });
                    window.setTimeout(() => advanceStep(next), 160);
                  }}
                >
                  <span className="typeform-choice-left">
                    <span className="typeform-num">{i + 1}</span>
                    <span>
                      <strong>{opt.title}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {opt.desc}
                      </span>
                    </span>
                  </span>
                  {isSelected && <span className="typeform-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="aura-inline-meta-row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              De-confounds: Professional Vigilance &amp; Social Hangover
            </span>
            <button
              type="button"
              className="aura-inline-text-btn"
              onClick={() => advanceStep()}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STEP 08 / 08: DAILY CONSTRAINTS, SCHEDULE, CUSHION & AGE (Confounds #6 & #14)
         ==================================================================== */}
      {stepIdx === 7 && (
        <div className="aura-mg-shell" data-game="baseline-daily-constraints">
          <div className="typeform-eyebrow-theme" style={{ marginBottom: '4px' }}>
            Phase 1 · Context Baseline 8 of 8 · Schedule, Household &amp; Season
          </div>
          <h3 className="aura-mg-title" style={{ marginBottom: '8px', fontSize: '20px' }}>
            Finally, what are the practical realities of your schedule, space, and life stage?
          </h3>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '14px',
              padding: '10px 12px',
              marginBottom: '10px',
            }}
          >
            {/* Schedule Autonomy */}
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                1. Daily Schedule Control (SES / Job Autonomy De-Confounder):
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'self_directed', label: 'Mostly self-directed' },
                    { id: 'mixed_schedule', label: 'Mix of both' },
                    { id: 'shift_or_demand_bound', label: 'Set by shifts, kids, or demands' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-schedule={s.id}
                    onClick={() => updateCtx({ scheduleAutonomy: s.id as ScheduleAutonomy })}
                    style={pillBtnStyle(
                      (userContext.scheduleAutonomy || 'mixed_schedule') === s.id
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Household Space */}
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                2. Who Shares Your Living Space (Tidiness &amp; Solitude De-Confounder):
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'solo_space', label: 'Just me (solo space)' },
                    { id: 'partner_or_roommates', label: 'Partner or roommates' },
                    { id: 'family_kids_care', label: 'Family / kids / caregiving' },
                  ] as const
                ).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    data-household={h.id}
                    onClick={() => updateCtx({ householdSpace: h.id as HouseholdSpace })}
                    style={pillBtnStyle(
                      (userContext.householdSpace || 'partner_or_roommates') === h.id
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource & Outsourcing Cushion (Confound #14) */}
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                3. Support &amp; Bandwidth Cushion (Outsourcing vs. Scarcity Tax):
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'outsourced_support', label: 'Can delegate / outsource chores' },
                    { id: 'self_managed_admin', label: 'Handle all my own admin' },
                    { id: 'tight_scarcity_load', label: 'Stretched tight on time & resources' },
                  ] as const
                ).map((rc) => (
                  <button
                    key={rc.id}
                    type="button"
                    data-cushion={rc.id}
                    onClick={() => updateCtx({ resourceCushion: rc.id as ResourceCushionType })}
                    style={pillBtnStyle(
                      (userContext.resourceCushion || 'self_managed_admin') === rc.id
                    )}
                  >
                    {rc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily World & Age Season */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  4. Age Cohort:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {AGE_BAND_OPTIONS.map((ab) => (
                    <button
                      key={ab.id}
                      type="button"
                      data-age={ab.id}
                      onClick={() => updateCtx({ ageBand: ab.id as AgeBand })}
                      style={pillBtnStyle(userContext.ageBand === ab.id)}
                    >
                      {ab.short}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  5. Daily World:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {LIFE_CONTEXT_OPTIONS.map((lc) => (
                    <button
                      key={lc.id}
                      type="button"
                      data-life-context={lc.id}
                      onClick={() => updateCtx({ lifeContext: lc.id as LifeContext })}
                      style={pillBtnStyle(userContext.lifeContext === lc.id)}
                    >
                      {lc.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            id="btn-lock-14factor-baseline"
            type="button"
            onClick={() => {
              const next = updateCtx({ baselineCompleted: true });
              advanceStep(next);
            }}
            className="btn-primary"
            style={{ width: '100%', padding: '11px 16px' }}
          >
            Lock 14-Factor Baseline ({liveDeconfound.active_adjustments.length} Active Offsets) &amp; Begin Questions →
          </button>
        </div>
      )}
    </div>
  );
};
