import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AURA_PALETTES,
  AuraWebGLCanvas,
  applyPaletteCssVariables,
} from './components/AuraWebGLCanvas';
import { MoreAndLabView } from './components/MoreAndLabView';
import {
  AuraMicroGamesBridge,
  MIND_MOMENT_SLUGS,
  useTelemetryState,
} from './components/MindMoments';
import { OrbitalSvg } from './components/OrbitalSvg';
import { PortraitView } from './components/PortraitView';
import {
  QUESTION_SLUG_MAP,
  QuietReflection,
  getQuestionSlug,
} from './components/QuietReflection';
import { TogetherView } from './components/TogetherView';
import {
  AGE_BAND_OPTIONS,
  DEFAULT_USER_CONTEXT,
  LANGUAGE_OPTIONS,
  LIFE_CONTEXT_OPTIONS,
  LOCALE_OPTIONS,
  findQuestionBySlugOrId,
} from './data/adaptivePool120';
import {
  BASELINE_STEP_SLUGS,
  compute14FactorDeconfounding,
} from './data/deconfoundingEngine';
import {
  AURA_SCIENCE_BUNDLE,
  INITIAL_STUDIO_FLOWS,
  PARTNER_PRESETS,
  SAMPLE_DEMO_RESPONSES,
} from './data/scienceBundle';
import { AuraAPI } from './services/apiClient';
import {
  AgeBand,
  ChemistryResult,
  DecompositionResult,
  DomainKey,
  ItemBankQuestion,
  LifeContext,
  LocaleSetting,
  StudioFlow,
  SupportedLanguage,
  TelemetryState,
  UserContextProfile,
} from './types/aura';

type MainTab = 'test' | 'blueprint' | 'chemistry' | 'pro';

const STORAGE_KEY = 'aura_consumer_progress_v1';

interface PersistedConsumerProgress {
  userName?: string;
  responses?: Record<number, number>;
  dynamicQuestionIds?: number[];
  userContext?: UserContextProfile;
  telemetry?: TelemetryState;
  currentStepSlug?: string;
  userMaskId?: string;
  paletteIndex?: number;
}

function loadSavedProgress(): PersistedConsumerProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as PersistedConsumerProgress;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function saveProgressToStorage(data: PersistedConsumerProgress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors
  }
}

function clearSavedProgress() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage clear errors
  }
}

function tabToViewParam(tab: MainTab): string {
  if (tab === 'blueprint') return 'portrait';
  if (tab === 'chemistry') return 'together';
  if (tab === 'pro') return 'guides';
  return 'reflect';
}

function viewParamToTab(viewParam: string | null): MainTab | null {
  if (!viewParam) return null;
  const v = viewParam.toLowerCase();
  if (v === 'reflect' || v === 'test') return 'test';
  if (v === 'portrait' || v === 'blueprint') return 'blueprint';
  if (v === 'together' || v === 'chemistry') return 'chemistry';
  if (v === 'guides' || v === 'pro' || v === 'more') return 'pro';
  return null;
}

export const App: React.FC = () => {
  const initialUrlState = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        hasExplicitRoute: false,
        initialTab: 'test' as MainTab,
        initialStepSlug: MIND_MOMENT_SLUGS[0],
        initialPart: 'moments' as 'questions' | 'moments',
      };
    }
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const stepParam = params.get('step');
    const tabFromView = viewParamToTab(viewParam);

    const isMomentSlug =
      !stepParam ||
      BASELINE_STEP_SLUGS.includes(stepParam) ||
      stepParam === 'moment-still-water' ||
      stepParam === 'moment-night-sky' ||
      stepParam === 'moment-inner-canvas';

    const hasExplicitRoute = Boolean(
      tabFromView || stepParam || params.get('u') || params.get('s')
    );

    return {
      hasExplicitRoute,
      initialTab: tabFromView || 'test',
      initialStepSlug: stepParam || MIND_MOMENT_SLUGS[0],
      initialPart: (isMomentSlug ? 'moments' : 'questions') as 'questions' | 'moments',
    };
  }, []);

  const savedProgress = useMemo(() => loadSavedProgress(), []);

  useEffect(() => {
    if (savedProgress?.telemetry) {
      AuraMicroGamesBridge.setState(savedProgress.telemetry);
    }
  }, [savedProgress]);

  const [activePaletteIndex, setActivePaletteIndex] = useState<number>(() => {
    if (
      typeof savedProgress?.paletteIndex === 'number' &&
      savedProgress.paletteIndex >= 0 &&
      savedProgress.paletteIndex < AURA_PALETTES.length
    ) {
      return savedProgress.paletteIndex;
    }
    return 0; // Start on Serene Dawn
  });
  const [breathingSpeed, setBreathingSpeed] = useState<number>(1.0);
  const [grainIntensity, setGrainIntensity] = useState<number>(0.35);
  const [warpComplexity, setWarpComplexity] = useState<number>(0.55);
  const [atmosphereOpen, setAtmosphereOpen] = useState<boolean>(false);
  const [pureCanvasMode, setPureCanvasMode] = useState<boolean>(false);

  useEffect(() => {
    applyPaletteCssVariables(
      AURA_PALETTES[activePaletteIndex] || AURA_PALETTES[0]
    );
  }, [activePaletteIndex]);

  const [welcomeVisible, setWelcomeVisible] = useState<boolean>(() => {
    if (
      initialUrlState.initialTab !== 'test' ||
      (initialUrlState.hasExplicitRoute &&
        initialUrlState.initialStepSlug !== MIND_MOMENT_SLUGS[0] &&
        initialUrlState.initialStepSlug !== QUESTION_SLUG_MAP[1])
    ) {
      return false;
    }
    return true;
  });
  const [welcomeInputName, setWelcomeInputName] = useState<string>('');
  const [welcomeTwText, setWelcomeTwText] = useState<string>('');
  const [loaderVisible, setLoaderVisible] = useState<boolean>(false);
  const [loaderMsg, setLoaderMsg] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<MainTab>(initialUrlState.initialTab);
  const [reflectPart, setReflectPart] = useState<'questions' | 'moments'>(
    initialUrlState.initialPart
  );
  const [currentStepSlug, setCurrentStepSlug] = useState<string>(() => {
    if (initialUrlState.hasExplicitRoute && initialUrlState.initialStepSlug) {
      return initialUrlState.initialStepSlug;
    }
    return savedProgress?.currentStepSlug || MIND_MOMENT_SLUGS[0];
  });

  const [userName, setUserName] = useState<string>(() => savedProgress?.userName || 'Alex');
  const [responses, setResponses] = useState<Record<number, number>>(() => {
    if (savedProgress?.responses && typeof savedProgress.responses === 'object') {
      return savedProgress.responses;
    }
    return {};
  });
  const [dynamicQuestionIds, setDynamicQuestionIds] = useState<number[]>(() => {
    const baseIds =
      Array.isArray(savedProgress?.dynamicQuestionIds) &&
      savedProgress.dynamicQuestionIds.length > 0
        ? [...savedProgress.dynamicQuestionIds]
        : [1];
    const slugToMatch =
      (initialUrlState.hasExplicitRoute && initialUrlState.initialStepSlug) ||
      savedProgress?.currentStepSlug ||
      QUESTION_SLUG_MAP[1];
    const matchedQ = findQuestionBySlugOrId(
      AURA_SCIENCE_BUNDLE.item_bank_schema.items,
      slugToMatch
    );
    if (matchedQ && !baseIds.includes(matchedQ.id)) {
      baseIds.push(matchedQ.id);
    }
    return baseIds;
  });
  const [userContext, setUserContext] = useState<UserContextProfile>(() => ({
    ...DEFAULT_USER_CONTEXT,
    ...(savedProgress?.userContext || {}),
  }));
  const [currentQIdx, setCurrentQIdx] = useState<number>(() => {
    const slugToMatch =
      (initialUrlState.hasExplicitRoute && initialUrlState.initialStepSlug) ||
      savedProgress?.currentStepSlug ||
      QUESTION_SLUG_MAP[1];
    const entry = Object.entries(QUESTION_SLUG_MAP).find(([, s]) => s === slugToMatch);
    if (entry) {
      return Math.max(0, Math.min(14, Number(entry[0]) - 1));
    }
    return 0;
  });
  const [userRawScores, setUserRawScores] = useState<Record<DomainKey, number>>({
    O: 84.0,
    C: 38.0,
    E: 44.0,
    A: 76.0,
    N: 62.0,
  });
  const [userMaskId, setUserMaskId] = useState<string>(() => savedProgress?.userMaskId || 'auto');
  const [proUnlocked, setProUnlocked] = useState<boolean>(false);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);

  const [chemMode, setChemMode] = useState<'partner' | 'cofounder' | 'friend'>('partner');
  const [partnerName, setPartnerName] = useState<string>('Jordan');
  const [partnerScores, setPartnerScores] = useState<Record<DomainKey, number>>({
    O: 82.0,
    C: 74.0,
    E: 62.0,
    A: 78.0,
    N: 36.0,
  });
  const [partnerMaskId, setPartnerMaskId] = useState<string>('canonical_allistic');
  const [activeSliderTarget, setActiveSliderTarget] = useState<'user' | 'partner'>('user');
  const [chemistry, setChemistry] = useState<ChemistryResult | null>(null);

  const [studioQuestions, setStudioQuestions] = useState<ItemBankQuestion[]>(
    () => AURA_SCIENCE_BUNDLE.item_bank_schema.items
  );
  const [studioFlows, setStudioFlows] = useState<StudioFlow[]>(() => INITIAL_STUDIO_FLOWS);
  const [activeFlowId, setActiveFlowId] = useState<string>('core_calm_12');

  const telemetry = useTelemetryState();
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  }, []);

  const syncUrlHistory = useCallback(
    (tab: MainTab, stepSlug: string, mode: 'push' | 'replace' = 'push') => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const viewVal = tabToViewParam(tab);
      url.searchParams.set('view', viewVal);
      if (tab === 'test') {
        url.searchParams.set('step', stepSlug || MIND_MOMENT_SLUGS[0]);
      } else {
        url.searchParams.delete('step');
      }
      const nextHref = `${url.pathname}${url.search}`;
      const currentHref = `${window.location.pathname}${window.location.search}`;
      if (nextHref === currentHref) return;

      const statePayload = { view: viewVal, tab, step: stepSlug };
      if (mode === 'replace') {
        window.history.replaceState(statePayload, '', nextHref);
      } else {
        window.history.pushState(statePayload, '', nextHref);
      }
    },
    []
  );

  useEffect(() => {
    syncUrlHistory(activeTab, currentStepSlug, 'replace');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = viewParamToTab(params.get('view')) || 'test';
      const nextStep = params.get('step') || MIND_MOMENT_SLUGS[0];
      setActiveTab(nextTab);
      if (nextTab === 'test') {
        setCurrentStepSlug(nextStep);
        const isMoment =
          BASELINE_STEP_SLUGS.includes(nextStep) ||
          nextStep === 'moment-still-water' ||
          nextStep === 'moment-night-sky' ||
          nextStep === 'moment-inner-canvas';
        setReflectPart(isMoment ? 'moments' : 'questions');
        if (!isMoment) {
          const foundQ = findQuestionBySlugOrId(studioQuestions, nextStep);
          if (foundQ) {
            setDynamicQuestionIds((prev) =>
              prev.includes(foundQ.id) ? prev : [...prev, foundQ.id]
            );
          }
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [studioQuestions]);

  useEffect(() => {
    const hasAnyAnswer = Object.keys(responses).length > 0;
    const hasAnyMoment =
      telemetry.pulse_reaction.completed ||
      telemetry.constellation_memory.completed ||
      telemetry.minds_eye.completed;

    if (
      hasAnyAnswer ||
      hasAnyMoment ||
      currentStepSlug !== QUESTION_SLUG_MAP[1] ||
      dynamicQuestionIds.length > 1 ||
      userContext.language !== 'en' ||
      userContext.lifeContext !== 'knowledge_remote'
    ) {
      saveProgressToStorage({
        userName,
        responses,
        dynamicQuestionIds,
        userContext,
        telemetry,
        currentStepSlug,
        userMaskId,
        paletteIndex: activePaletteIndex,
      });
    }
  }, [
    userName,
    responses,
    dynamicQuestionIds,
    userContext,
    telemetry,
    currentStepSlug,
    userMaskId,
    activePaletteIndex,
  ]);

  useEffect(() => {
    const fullText =
      'A gentle space to reflect on where your focus flows, what restores your energy, and what makes you uniquely you.';
    let idx = 0;
    const interval = window.setInterval(() => {
      idx += 1;
      setWelcomeTwText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        window.clearInterval(interval);
      }
    }, 12);
    return () => window.clearInterval(interval);
  }, []);

  const refreshStudioData = useCallback(async () => {
    const overview = await AuraAPI.getStudioOverview();
    setStudioQuestions(overview.questions);
    setStudioFlows(overview.flows);
    setActiveFlowId(overview.active_flow_id);
  }, []);

  const getEffectiveResponsesForScoring = useCallback(
    (respObj: Record<number, number>) => {
      return Object.keys(respObj).length > 0 ? respObj : SAMPLE_DEMO_RESPONSES;
    },
    []
  );

  const refreshPortrait = useCallback(
    async (
      customResponses?: Record<number, number>,
      customMaskId?: string,
      customTelemetry?: TelemetryState,
      customContext?: UserContextProfile
    ) => {
      const effResp = getEffectiveResponsesForScoring(customResponses ?? responses);
      const effMask = customMaskId ?? userMaskId;
      const effTel = customTelemetry ?? AuraMicroGamesBridge.getState();
      const effCtx = customContext ?? userContext;

      const res = await AuraAPI.scoreAssessment({
        responses: effResp,
        mask_id: effMask,
        telemetry: effTel,
      });

      // Apply the 14-Factor De-Confounding Calibration Engine to isolate True Trait Baseline
      const deconf = compute14FactorDeconfounding(effCtx, effResp);
      const nextDecomp: DecompositionResult = {
        ...res.decomposition,
        deconfounding_summary: deconf,
        signal_layers: {
          ...res.decomposition.signal_layers,
          debiased_scores: {
            O: Number(
              Math.max(
                4,
                Math.min(
                  98,
                  (res.decomposition.signal_layers.debiased_scores.O || 50) +
                    (deconf.domain_deltas.O || 0) * 0.45
                )
              ).toFixed(1)
            ),
            C: Number(
              Math.max(
                4,
                Math.min(
                  98,
                  (res.decomposition.signal_layers.debiased_scores.C || 50) +
                    (deconf.domain_deltas.C || 0) * 0.45
                )
              ).toFixed(1)
            ),
            E: Number(
              Math.max(
                4,
                Math.min(
                  98,
                  (res.decomposition.signal_layers.debiased_scores.E || 50) +
                    (deconf.domain_deltas.E || 0) * 0.45
                )
              ).toFixed(1)
            ),
            A: Number(
              Math.max(
                4,
                Math.min(
                  98,
                  (res.decomposition.signal_layers.debiased_scores.A || 50) +
                    (deconf.domain_deltas.A || 0) * 0.45
                )
              ).toFixed(1)
            ),
            N: Number(
              Math.max(
                4,
                Math.min(
                  98,
                  (res.decomposition.signal_layers.debiased_scores.N || 50) +
                    (deconf.domain_deltas.N || 0) * 0.45
                )
              ).toFixed(1)
            ),
          },
        },
      };

      setUserRawScores(res.irt_scoring.raw_scores);
      setDecomposition(nextDecomp);
      return res;
    },
    [responses, userMaskId, userContext, getEffectiveResponsesForScoring]
  );

  const refreshChemistry = useCallback(
    async (
      customUserScores?: Record<DomainKey, number>,
      customPartnerScores?: Record<DomainKey, number>,
      customPartnerName?: string,
      customPartnerMask?: string,
      customMode?: 'partner' | 'cofounder' | 'friend'
    ) => {
      const effResp = getEffectiveResponsesForScoring(responses);
      const effTel = AuraMicroGamesBridge.getState();
      const chem = await AuraAPI.analyzeChemistry({
        person_a: {
          name: userName,
          scores: customUserScores ?? userRawScores,
          mask_id: userMaskId,
          responses: effResp,
          telemetry: effTel,
        },
        person_b: {
          name: customPartnerName ?? partnerName,
          scores: customPartnerScores ?? partnerScores,
          mask_id: customPartnerMask ?? partnerMaskId,
          mood_energy: 0.0,
          self_criticism: 0.0,
        },
        context_mode: customMode ?? chemMode,
      });
      setChemistry(chem);
      return chem;
    },
    [
      responses,
      userName,
      userRawScores,
      userMaskId,
      partnerName,
      partnerScores,
      partnerMaskId,
      chemMode,
      getEffectiveResponsesForScoring,
    ]
  );

  useEffect(() => {
    (async () => {
      await AuraAPI.fetchScienceModels();
      await refreshStudioData();
      await refreshPortrait(responses, userMaskId);
      await refreshChemistry();
    })();
  }, []);

  useEffect(() => {
    refreshPortrait(responses, userMaskId, telemetry, userContext);
  }, [telemetry, userContext]);

  const handleNavigateStepSlug = useCallback(
    (slug: string, pushHistory = true) => {
      setCurrentStepSlug(slug);
      syncUrlHistory('test', slug, pushHistory ? 'push' : 'replace');
    },
    [syncUrlHistory]
  );

  const handleSwitchTab = useCallback(
    async (tab: MainTab) => {
      setActiveTab(tab);
      syncUrlHistory(tab, currentStepSlug, 'push');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (tab === 'blueprint') {
        await refreshPortrait();
      } else if (tab === 'chemistry') {
        await refreshChemistry();
      }
    },
    [currentStepSlug, refreshChemistry, refreshPortrait, syncUrlHistory]
  );

  const handleResetProgress = useCallback(() => {
    clearSavedProgress();
    setResponses({});
    setDynamicQuestionIds([1]);
    setCurrentQIdx(0);
    setReflectPart('moments');
    const firstSlug = MIND_MOMENT_SLUGS[0];
    setCurrentStepSlug(firstSlug);
    AuraMicroGamesBridge.resetState();
    syncUrlHistory('test', firstSlug, 'push');
    showToast('Started a fresh quiet reflection');
  }, [showToast, syncUrlHistory]);

  const handleDismissWelcome = useCallback(
    async (targetTab: MainTab = 'test') => {
      if (welcomeInputName.trim()) {
        setUserName(welcomeInputName.trim());
      }
      if (targetTab === 'test') {
        clearSavedProgress();
        setResponses({});
        setDynamicQuestionIds([1]);
        setCurrentQIdx(0);
        const firstSlug = MIND_MOMENT_SLUGS[0];
        setCurrentStepSlug(firstSlug);
        AuraMicroGamesBridge.resetState();
        setReflectPart('moments');
        setWelcomeVisible(false);
        setActiveTab('test');
        syncUrlHistory('test', firstSlug, 'push');
        return;
      }
      setWelcomeVisible(false);
      await handleSwitchTab(targetTab);
    },
    [welcomeInputName, handleSwitchTab, syncUrlHistory]
  );

  const triggerSynthesisLoader = useCallback(
    async (customTel?: TelemetryState) => {
      setLoaderVisible(true);
      setLoaderMsg(
        'Listening to your natural rhythm, your current season, and your three mind moments...'
      );
      await refreshPortrait(responses, userMaskId, customTel);
      window.setTimeout(async () => {
        setLoaderVisible(false);
        await handleSwitchTab('blueprint');
      }, 900);
    },
    [refreshPortrait, responses, userMaskId, handleSwitchTab]
  );

  const handleSelectAnswer = useCallback(
    (qId: number, val: number) => {
      setResponses((prev) => {
        const next = { ...prev, [qId]: val };
        refreshPortrait(next, userMaskId);
        return next;
      });
    },
    [refreshPortrait, userMaskId]
  );

  const handleSelectMask = useCallback(
    async (maskId: string) => {
      setUserMaskId(maskId);
      const effResp = getEffectiveResponsesForScoring(responses);
      const decomp = await AuraAPI.decomposeSignal({
        raw_scores: userRawScores,
        mask_id: maskId,
        responses: effResp,
        telemetry: AuraMicroGamesBridge.getState(),
      });
      setDecomposition(decomp);
    },
    [responses, userRawScores, getEffectiveResponsesForScoring]
  );

  const handleUnlockPro = useCallback(
    (msg?: string) => {
      setProUnlocked(true);
      showToast(msg || 'Opened Full 10-Nuance Portrait Guide');
    },
    [showToast]
  );

  const handleSharePortrait = useCallback(() => {
    const s = userRawScores;
    const vec = [s.O, s.C, s.E, s.A, s.N].map((v) => Math.round(v)).join(',');
    const maskId = decomposition?.mask_applied?.id || userMaskId;
    const url = `${window.location.origin}${window.location.pathname}?view=portrait&u=${encodeURIComponent(
      userName
    )}&m=${encodeURIComponent(maskId)}&s=${vec}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`Copied Quiet Portrait link for ${userName}!`);
  }, [userRawScores, decomposition, userMaskId, userName, showToast]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.switchTab = (tabName: MainTab) => handleSwitchTab(tabName);
    w.switchReflectPart = (part: 'questions' | 'moments') => {
      setReflectPart(part);
      if (part === 'moments') {
        handleNavigateStepSlug(MIND_MOMENT_SLUGS[0], true);
      } else {
        handleNavigateStepSlug(QUESTION_SLUG_MAP[currentQIdx + 1] || QUESTION_SLUG_MAP[1], true);
      }
    };
    w.dismissWelcome = (target: MainTab) => handleDismissWelcome(target);
    w.selectAnswer = (qId: number, val: number) => handleSelectAnswer(qId, val);
    w.selectNeuroMask = (maskId: string) => handleSelectMask(maskId);
    w.unlockProDemo = (msg?: string) => handleUnlockPro(msg);
    w.copyShareLink = () => handleSharePortrait();
    w.resetReflection = () => handleResetProgress();
    w.triggerPaletteTransition = (idx: number) => {
      if (idx >= 0 && idx < AURA_PALETTES.length) {
        setActivePaletteIndex(idx);
      }
    };
  }, [
    currentQIdx,
    handleDismissWelcome,
    handleNavigateStepSlug,
    handleResetProgress,
    handleSelectAnswer,
    handleSelectMask,
    handleSharePortrait,
    handleSwitchTab,
    handleUnlockPro,
  ]);

  const activeFlow = useMemo(() => {
    return (
      studioFlows.find((f) => f.id === activeFlowId) ||
      studioFlows.find((f) => f.is_active) ||
      INITIAL_STUDIO_FLOWS[0]
    );
  }, [studioFlows, activeFlowId]);

  const activePalette =
    AURA_PALETTES[activePaletteIndex] || AURA_PALETTES[0];

  return (
    <>
      <div
        id="toast-banner"
        className={`toast-banner ${toastMsg ? 'visible' : ''}`}
      >
        {toastMsg || 'Copied link to clipboard!'}
      </div>

      {/* Fullscreen WebGL Mesh Aurora & Analog Film Grain Canvas */}
      <AuraWebGLCanvas
        paletteIndex={activePaletteIndex}
        breathingSpeed={breathingSpeed}
        grainIntensity={grainIntensity}
        warpComplexity={warpComplexity}
      />

      {/* Restore UI Floating Pill when in Pure Canvas mode */}
      {pureCanvasMode && (
        <button
          id="restore-ui-btn"
          type="button"
          onClick={() => setPureCanvasMode(false)}
          className="pure-canvas-restore-pill"
        >
          Restore UI · {activePalette.name}
        </button>
      )}

      {/* Floating Atmosphere Controls Popover (Never causes page scrolling) */}
      {atmosphereOpen && !pureCanvasMode && (
        <div id="atmosphere-popover" className="atmosphere-popover-backdrop" onClick={() => setAtmosphereOpen(false)}>
          <div className="atmosphere-popover-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                Aura State Palettes
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAtmosphereOpen(false);
                    setPureCanvasMode(true);
                  }}
                  className="aura-inline-text-btn"
                  style={{ fontSize: '11px', fontWeight: 600 }}
                >
                  Pure Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setAtmosphereOpen(false)}
                  className="aura-inline-text-btn"
                  style={{ fontSize: '13px', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div id="palette-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {AURA_PALETTES.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  data-palette-idx={idx}
                  onClick={() => setActivePaletteIndex(idx)}
                  className={`palette-btn glass-option ${idx === activePaletteIndex ? 'active' : ''}`}
                  style={{
                    padding: '6px 11px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: idx === activePaletteIndex ? 700 : 500,
                    borderColor: idx === activePaletteIndex ? 'var(--text-primary)' : 'var(--glass-border)',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${p.colors[1]}, ${p.colors[2]})`,
                    }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                  <span>Speed</span>
                  <span className="mono">{breathingSpeed.toFixed(1)}x</span>
                </div>
                <input
                  id="speed-slider"
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={breathingSpeed}
                  onChange={(e) => setBreathingSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                  <span>Grain</span>
                  <span className="mono">{Math.round(grainIntensity * 100)}%</span>
                </div>
                <input
                  id="grain-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(grainIntensity * 100)}
                  onChange={(e) => setGrainIntensity(parseInt(e.target.value, 10) / 100)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                  <span>Flow</span>
                  <span className="mono">{Math.round(warpComplexity * 100)}%</span>
                </div>
                <input
                  id="warp-slider"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={Math.round(warpComplexity * 100)}
                  onChange={(e) => setWarpComplexity(parseInt(e.target.value, 10) / 100)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* LLM Contextual Morphing & DIF De-Biasing Lens */}
            <div
              id="context-lens-controls"
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--glass-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  🌍 Life Context &amp; Language Lens (DIF De-Biased)
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        setUserContext((prev) => ({
                          ...prev,
                          language: lang.id as SupportedLanguage,
                        }))
                      }
                      className={`glass-option ${
                        userContext.language === lang.id ? 'selected' : ''
                      }`}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: userContext.language === lang.id ? 700 : 500,
                      }}
                    >
                      {lang.flag}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-dim)',
                      marginBottom: '2px',
                    }}
                  >
                    Age Season
                  </label>
                  <select
                    id="context-age-select"
                    value={userContext.ageBand}
                    onChange={(e) =>
                      setUserContext((prev) => ({
                        ...prev,
                        ageBand: e.target.value as AgeBand,
                      }))
                    }
                    className="clean-select"
                    style={{ fontSize: '11px', padding: '4px 2px' }}
                  >
                    {AGE_BAND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.short}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-dim)',
                      marginBottom: '2px',
                    }}
                  >
                    Everyday World
                  </label>
                  <select
                    id="context-life-select"
                    value={userContext.lifeContext}
                    onChange={(e) =>
                      setUserContext((prev) => ({
                        ...prev,
                        lifeContext: e.target.value as LifeContext,
                      }))
                    }
                    className="clean-select"
                    style={{ fontSize: '11px', padding: '4px 2px' }}
                  >
                    {LIFE_CONTEXT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.short}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-dim)',
                      marginBottom: '2px',
                    }}
                  >
                    Setting
                  </label>
                  <select
                    id="context-locale-select"
                    value={userContext.locale}
                    onChange={(e) =>
                      setUserContext((prev) => ({
                        ...prev,
                        locale: e.target.value as LocaleSetting,
                      }))
                    }
                    className="clean-select"
                    style={{ fontSize: '11px', padding: '4px 2px' }}
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.short}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weightless Open Welcome Screen */}
      {welcomeVisible && !pureCanvasMode && (
        <div id="welcome-overlay" className="overlay-screen">
          <div className="overlay-card">
            <div
              id="welcome-orbital"
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <OrbitalSvg size={76} uid="welcome" />
            </div>
            <h1
              className="serif"
              style={{ fontSize: '36px', lineHeight: 1.15, marginBottom: '10px', color: 'var(--text-primary)' }}
            >
              Take a quiet breath.
              <br />
              <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                Meet how your mind naturally moves.
              </span>
            </h1>
            <p
              id="welcome-tw-text"
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                minHeight: '42px',
                marginBottom: '22px',
              }}
            >
              {welcomeTwText}
            </p>

            <div className="name-input-wrap">
              <input
                id="welcome-name-input"
                type="text"
                placeholder="Your first name (optional)"
                maxLength={24}
                value={welcomeInputName}
                onChange={(e) => setWelcomeInputName(e.target.value)}
                style={{ textAlign: 'center' }}
              />
            </div>

            <button
              type="button"
              onClick={() => handleDismissWelcome('test')}
              className="btn-primary"
              style={{ marginBottom: '12px' }}
            >
              Begin Quiet Reflection →
            </button>
            <button
              type="button"
              onClick={() => handleDismissWelcome('blueprint')}
              className="aura-inline-text-btn"
              style={{ width: '100%', textAlign: 'center', padding: '6px' }}
            >
              Explore Sample Portrait →
            </button>
          </div>
        </div>
      )}

      {/* Gentle Portrait Synthesis Loader */}
      {loaderVisible && (
        <div
          id="synthesis-loader"
          className="overlay-screen"
          style={{ display: 'flex', zIndex: 95 }}
        >
          <div style={{ textAlign: 'center', maxWidth: '340px' }}>
            <div
              id="loader-orbital"
              style={{ width: '76px', height: '76px', margin: '0 auto 14px' }}
            >
              <OrbitalSvg size={76} uid="loader" />
            </div>
            <h2 className="serif" style={{ fontSize: '28px', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Weaving Your Quiet Portrait...
            </h2>
            <p
              id="loader-tw-msg"
              style={{ fontSize: '13px', color: 'var(--accent)', minHeight: '36px' }}
            >
              {loaderMsg}
            </p>
          </div>
        </div>
      )}

      {/* Main App Shell (Hidden while Welcome or Synthesis Loader is active so they never overlap) */}
      {!welcomeVisible && !loaderVisible && (
        <div
          className={`app-container ${activeTab === 'test' ? 'is-typeform-mode' : ''} ${
            pureCanvasMode ? 'ui-hidden' : ''
          }`}
        >
        {/* Whisper-thin top navigation ONLY shown on Portrait / Together / Guides */}
        {activeTab !== 'test' && (
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-pill">
                <span className="brand-dot" />
                <span className="serif" style={{ fontSize: '18px', fontWeight: 500 }}>aura</span>
              </div>
              <button
                id="top-mood-pill"
                type="button"
                onClick={() => setAtmosphereOpen((prev) => !prev)}
                className="aura-resonance-micro-pill"
                style={{ padding: '4px 8px' }}
                title={`Tune Aura atmosphere (${activePalette.name})`}
              >
                <span className="aura-swatch-cluster">
                  {activePalette.colors.slice(1, 4).map((hex, i) => (
                    <span
                      key={i}
                      className="aura-micro-swatch"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
              </button>
            </div>
            <nav className="top-inline-nav">
              <button
                id="nav-test"
                type="button"
                onClick={() => handleSwitchTab('test')}
                className="top-nav-link"
              >
                Reflect
              </button>
              <button
                id="nav-blueprint"
                type="button"
                onClick={() => handleSwitchTab('blueprint')}
                className={`top-nav-link ${activeTab === 'blueprint' ? 'active' : ''}`}
              >
                Portrait
              </button>
              <button
                id="nav-chemistry"
                type="button"
                onClick={() => handleSwitchTab('chemistry')}
                className={`top-nav-link ${activeTab === 'chemistry' ? 'active' : ''}`}
              >
                Together
              </button>
              <button
                id="nav-pro"
                type="button"
                onClick={() => handleSwitchTab('pro')}
                className={`top-nav-link ${activeTab === 'pro' ? 'active' : ''}`}
              >
                Guides
              </button>
            </nav>
          </header>
        )}

        {/* VIEW 1: REFLECT (Weightless Zero-Scroll Full-Screen Typeform Stage) */}
        {activeTab === 'test' && (
          <QuietReflection
            questions={studioQuestions}
            activeFlow={activeFlow}
            responses={responses}
            dynamicQuestionIds={dynamicQuestionIds}
            onChangeDynamicQuestionIds={setDynamicQuestionIds}
            userContext={userContext}
            onChangeUserContext={setUserContext}
            currentQIdx={currentQIdx}
            currentStepSlug={currentStepSlug}
            reflectPart={reflectPart}
            activePaletteIndex={activePaletteIndex}
            onSelectPalette={(idx) => setActivePaletteIndex(idx)}
            onToggleAtmospherePopover={() => setAtmosphereOpen((prev) => !prev)}
            onSelectAnswer={(qId, val) => handleSelectAnswer(qId, val)}
            onSetCurrentQIdx={(idx) => setCurrentQIdx(idx)}
            onNavigateStepSlug={(slug, push) => handleNavigateStepSlug(slug, push)}
            onSwitchReflectPart={(part) => setReflectPart(part)}
            onFinishToPortrait={(tel) => triggerSynthesisLoader(tel)}
          />
        )}

        {/* VIEW 2: PORTRAIT */}
        {activeTab === 'blueprint' && (
          <PortraitView
            userName={userName}
            decomposition={decomposition}
            userContext={userContext}
            responses={responses}
            proUnlocked={proUnlocked}
            onSelectMask={(maskId) => handleSelectMask(maskId)}
            onOpenMindMoments={() => {
              setActiveTab('test');
              setReflectPart('moments');
              handleNavigateStepSlug(BASELINE_STEP_SLUGS[0], true);
            }}
            onUnlockPro={(msg) => handleUnlockPro(msg)}
            onSharePortrait={handleSharePortrait}
          />
        )}

        {/* VIEW 3: TOGETHER */}
        {activeTab === 'chemistry' && (
          <TogetherView
            userName={userName}
            userRawScores={userRawScores}
            chemMode={chemMode}
            partnerName={partnerName}
            partnerScores={partnerScores}
            partnerMaskId={partnerMaskId}
            activeSliderTarget={activeSliderTarget}
            chemistry={chemistry}
            onChangeChemMode={(mode) => {
              setChemMode(mode);
              refreshChemistry(userRawScores, partnerScores, partnerName, partnerMaskId, mode);
            }}
            onChangePartnerName={(name) => {
              setPartnerName(name);
              refreshChemistry(userRawScores, partnerScores, name, partnerMaskId, chemMode);
            }}
            onChangePartnerMask={(maskId) => {
              setPartnerMaskId(maskId);
              refreshChemistry(userRawScores, partnerScores, partnerName, maskId, chemMode);
            }}
            onApplyPreset={(code) => {
              const p = PARTNER_PRESETS[code];
              if (!p) return;
              setPartnerName(p.name);
              setPartnerScores({ ...p.scores });
              setPartnerMaskId(p.mask_id);
              refreshChemistry(userRawScores, p.scores, p.name, p.mask_id, chemMode);
            }}
            onChangeSliderTarget={(target) => setActiveSliderTarget(target)}
            onSlideTrait={(trait, val) => {
              if (activeSliderTarget === 'user') {
                const next = { ...userRawScores, [trait]: val };
                setUserRawScores(next);
                refreshChemistry(next, partnerScores, partnerName, partnerMaskId, chemMode);
              } else {
                const next = { ...partnerScores, [trait]: val };
                setPartnerScores(next);
                refreshChemistry(userRawScores, next, partnerName, partnerMaskId, chemMode);
              }
            }}
          />
        )}

        {/* VIEW 4: GUIDES */}
        {activeTab === 'pro' && (
          <MoreAndLabView
            onPreviewFullPortraitGuide={() => {
              handleUnlockPro('Opened Full Portrait Guide');
              handleSwitchTab('blueprint');
            }}
            onOpenTogetherView={() => handleSwitchTab('chemistry')}
            onShowToast={showToast}
          />
        )}
        </div>
      )}
    </>
  );
};
