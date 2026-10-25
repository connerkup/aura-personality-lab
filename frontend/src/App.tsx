import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AURA_SCIENCE_BUNDLE,
  INITIAL_STUDIO_FLOWS,
  PARTNER_PRESETS,
  SAMPLE_DEMO_RESPONSES,
} from './data/scienceBundle';
import { AuraAPI } from './services/apiClient';
import {
  ChemistryResult,
  DecompositionResult,
  DomainKey,
  ItemBankQuestion,
  StudioFlow,
  TelemetryState,
} from './types/aura';

type MainTab = 'test' | 'blueprint' | 'chemistry' | 'pro';

const STORAGE_KEY = 'aura_consumer_progress_v1';

interface PersistedConsumerProgress {
  userName?: string;
  responses?: Record<number, number>;
  telemetry?: TelemetryState;
  currentStepSlug?: string;
  userMaskId?: string;
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
        initialStepSlug: QUESTION_SLUG_MAP[1],
        initialPart: 'questions' as 'questions' | 'moments',
      };
    }
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const stepParam = params.get('step');
    const tabFromView = viewParamToTab(viewParam);

    const isMomentSlug =
      stepParam === MIND_MOMENT_SLUGS[0] ||
      stepParam === MIND_MOMENT_SLUGS[1] ||
      stepParam === MIND_MOMENT_SLUGS[2];

    const hasExplicitRoute = Boolean(
      tabFromView || stepParam || params.get('u') || params.get('s')
    );

    return {
      hasExplicitRoute,
      initialTab: tabFromView || 'test',
      initialStepSlug: stepParam || QUESTION_SLUG_MAP[1],
      initialPart: (isMomentSlug ? 'moments' : 'questions') as 'questions' | 'moments',
    };
  }, []);

  const savedProgress = useMemo(() => loadSavedProgress(), []);

  useEffect(() => {
    if (savedProgress?.telemetry) {
      AuraMicroGamesBridge.setState(savedProgress.telemetry);
    }
  }, [savedProgress]);

  const [welcomeVisible, setWelcomeVisible] = useState<boolean>(() => {
    if (
      initialUrlState.initialTab !== 'test' ||
      (initialUrlState.hasExplicitRoute &&
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
    return savedProgress?.currentStepSlug || QUESTION_SLUG_MAP[1];
  });

  const [userName, setUserName] = useState<string>(() => savedProgress?.userName || 'Alex');
  const [responses, setResponses] = useState<Record<number, number>>(() => {
    if (savedProgress?.responses && typeof savedProgress.responses === 'object') {
      return savedProgress.responses;
    }
    return {};
  });
  const [currentQIdx, setCurrentQIdx] = useState<number>(() => {
    const slugToMatch =
      (initialUrlState.hasExplicitRoute && initialUrlState.initialStepSlug) ||
      savedProgress?.currentStepSlug ||
      QUESTION_SLUG_MAP[1];
    const entry = Object.entries(QUESTION_SLUG_MAP).find(([, s]) => s === slugToMatch);
    if (entry) {
      return Math.max(0, Number(entry[0]) - 1);
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
        url.searchParams.set('step', stepSlug || QUESTION_SLUG_MAP[1]);
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
      const nextStep = params.get('step') || QUESTION_SLUG_MAP[1];
      setActiveTab(nextTab);
      if (nextTab === 'test') {
        setCurrentStepSlug(nextStep);
        const isMoment =
          nextStep === MIND_MOMENT_SLUGS[0] ||
          nextStep === MIND_MOMENT_SLUGS[1] ||
          nextStep === MIND_MOMENT_SLUGS[2];
        setReflectPart(isMoment ? 'moments' : 'questions');
        if (!isMoment) {
          const foundQ = studioQuestions.find((q) => getQuestionSlug(q) === nextStep);
          if (foundQ) {
            setCurrentQIdx(Math.max(0, foundQ.id - 1));
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

    if (hasAnyAnswer || hasAnyMoment || currentStepSlug !== QUESTION_SLUG_MAP[1]) {
      saveProgressToStorage({
        userName,
        responses,
        telemetry,
        currentStepSlug,
        userMaskId,
      });
    }
  }, [userName, responses, telemetry, currentStepSlug, userMaskId]);

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
      customTelemetry?: TelemetryState
    ) => {
      const effResp = getEffectiveResponsesForScoring(customResponses ?? responses);
      const effMask = customMaskId ?? userMaskId;
      const effTel = customTelemetry ?? AuraMicroGamesBridge.getState();

      const res = await AuraAPI.scoreAssessment({
        responses: effResp,
        mask_id: effMask,
        telemetry: effTel,
      });
      setUserRawScores(res.irt_scoring.raw_scores);
      setDecomposition(res.decomposition);
      return res;
    },
    [responses, userMaskId, getEffectiveResponsesForScoring]
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
    refreshPortrait(responses, userMaskId, telemetry);
  }, [telemetry]);

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
    setCurrentQIdx(0);
    setReflectPart('questions');
    const firstSlug = QUESTION_SLUG_MAP[1];
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
        setCurrentQIdx(0);
        const firstSlug = QUESTION_SLUG_MAP[1];
        setCurrentStepSlug(firstSlug);
        AuraMicroGamesBridge.resetState();
        setReflectPart('questions');
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

  return (
    <>
      <div
        id="toast-banner"
        className={`toast-banner ${toastMsg ? 'visible' : ''}`}
      >
        {toastMsg || 'Copied link to clipboard!'}
      </div>

      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* Weightless Open Welcome Screen */}
      {welcomeVisible && (
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
              style={{ fontSize: '34px', lineHeight: 1.15, marginBottom: '10px' }}
            >
              Take a quiet breath.
              <br />
              <span style={{ color: '#c4b5fd', fontStyle: 'italic' }}>
                Meet how your mind naturally moves.
              </span>
            </h1>
            <p
              id="welcome-tw-text"
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
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
            <h2 className="serif" style={{ fontSize: '26px', marginBottom: '6px' }}>
              Weaving Your Quiet Portrait...
            </h2>
            <p
              id="loader-tw-msg"
              style={{ fontSize: '13px', color: '#c4b5fd', minHeight: '36px' }}
            >
              {loaderMsg}
            </p>
          </div>
        </div>
      )}

      {/* Main App Shell */}
      <div className={`app-container ${activeTab === 'test' ? 'is-typeform-mode' : ''}`}>
        {/* Whisper-thin top navigation ONLY shown on Portrait / Together / Guides */}
        {activeTab !== 'test' && (
          <header className="top-header">
            <div className="brand-pill">
              <span className="brand-dot" />
              <span>Aura</span>
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
            currentQIdx={currentQIdx}
            currentStepSlug={currentStepSlug}
            reflectPart={reflectPart}
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
            proUnlocked={proUnlocked}
            onSelectMask={(maskId) => handleSelectMask(maskId)}
            onOpenMindMoments={() => {
              setActiveTab('test');
              setReflectPart('moments');
              handleNavigateStepSlug(MIND_MOMENT_SLUGS[0], true);
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
    </>
  );
};
