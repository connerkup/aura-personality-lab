import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoreAndLabView } from './components/MoreAndLabView';
import { AuraMicroGamesBridge, useTelemetryState } from './components/MindMoments';
import { OrbitalSvg } from './components/OrbitalSvg';
import { PortraitView } from './components/PortraitView';
import { QuietReflection } from './components/QuietReflection';
import { TogetherView } from './components/TogetherView';
import {
  AURA_SCIENCE_BUNDLE,
  INITIAL_SHADOW_CALIBRATION_MATRIX,
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
  ShadowCalibrationRow,
  StudioFlow,
  TelemetryState,
} from './types/aura';

type MainTab = 'test' | 'blueprint' | 'chemistry' | 'pro';

export const App: React.FC = () => {
  // Check URL for direct studio route (?studio=1 or /studio)
  const isDirectStudioUrl = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('studio') === '1' ||
      params.get('studio') === 'true' ||
      window.location.pathname.endsWith('/studio')
    );
  }, []);

  // Welcome & Loader Modal State
  const [welcomeVisible, setWelcomeVisible] = useState<boolean>(!isDirectStudioUrl);
  const [welcomeInputName, setWelcomeInputName] = useState<string>('');
  const [welcomeTwText, setWelcomeTwText] = useState<string>('');
  const [loaderVisible, setLoaderVisible] = useState<boolean>(false);
  const [loaderMsg, setLoaderMsg] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>(
    isDirectStudioUrl ? 'pro' : 'test'
  );
  const [reflectPart, setReflectPart] = useState<'questions' | 'moments'>('questions');
  const [proSubTab, setProSubTab] = useState<'pricing' | 'lab'>(
    isDirectStudioUrl ? 'lab' : 'pricing'
  );

  // User Reflection State (MUST start completely empty `{}`!)
  const [userName, setUserName] = useState<string>('Alex');
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [currentQIdx, setCurrentQIdx] = useState<number>(0);
  const [userRawScores, setUserRawScores] = useState<Record<DomainKey, number>>({
    O: 84.0,
    C: 38.0,
    E: 44.0,
    A: 76.0,
    N: 62.0,
  });
  const [userMaskId, setUserMaskId] = useState<string>('auto');
  const [proUnlocked, setProUnlocked] = useState<boolean>(false);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);

  // Together / Relationship Harmony State
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

  // Studio / Questions & Flows State
  const [studioQuestions, setStudioQuestions] = useState<ItemBankQuestion[]>(
    () => AURA_SCIENCE_BUNDLE.item_bank_schema.items
  );
  const [studioFlows, setStudioFlows] = useState<StudioFlow[]>(() => INITIAL_STUDIO_FLOWS);
  const [activeFlowId, setActiveFlowId] = useState<string>('core_calm_12');
  const [shadowMatrix, setShadowMatrix] = useState<ShadowCalibrationRow[]>(
    () => INITIAL_SHADOW_CALIBRATION_MATRIX
  );

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

  // Welcome typewriter effect
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
    setShadowMatrix(overview.shadow_calibration_matrix);
  }, []);

  // Effective responses: ONLY use SAMPLE_DEMO_RESPONSES as fallback for Portrait/Together preview when user hasn't answered any questions yet
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

  // Initial bootstrap
  useEffect(() => {
    (async () => {
      await AuraAPI.fetchScienceModels();
      await refreshStudioData();
      await refreshPortrait({}, 'auto');
      await refreshChemistry();
    })();
  }, []);

  // Re-compute portrait whenever telemetry changes
  useEffect(() => {
    refreshPortrait(responses, userMaskId, telemetry);
  }, [telemetry]);

  const handleSwitchTab = useCallback(
    async (tab: MainTab) => {
      setActiveTab(tab);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (tab === 'blueprint') {
        await refreshPortrait();
      } else if (tab === 'chemistry') {
        await refreshChemistry();
      } else if (tab === 'pro') {
        await refreshStudioData();
      }
    },
    [refreshPortrait, refreshChemistry, refreshStudioData]
  );

  const handleDismissWelcome = useCallback(
    async (targetTab: MainTab = 'test') => {
      if (welcomeInputName.trim()) {
        setUserName(welcomeInputName.trim());
      }
      if (targetTab === 'test') {
        // CRITICAL: Ensure completely empty responses `{}` on fresh reflection start
        setResponses({});
        setCurrentQIdx(0);
        AuraMicroGamesBridge.resetState();
        setReflectPart('questions');
      }
      setWelcomeVisible(false);
      await handleSwitchTab(targetTab);
    },
    [welcomeInputName, handleSwitchTab]
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
    const url = `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(
      userName
    )}&m=${encodeURIComponent(maskId)}&s=${vec}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`Copied Quiet Portrait link for ${userName}!`);
  }, [userRawScores, decomposition, userMaskId, userName, showToast]);

  // Attach global window helpers for full backwards compatibility with Playwright scripts
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.switchTab = (tabName: MainTab) => handleSwitchTab(tabName);
    w.switchReflectPart = (part: 'questions' | 'moments') => setReflectPart(part);
    w.dismissWelcome = (target: MainTab) => handleDismissWelcome(target);
    w.selectAnswer = (qId: number, val: number) => handleSelectAnswer(qId, val);
    w.selectNeuroMask = (maskId: string) => handleSelectMask(maskId);
    w.unlockProDemo = (msg?: string) => handleUnlockPro(msg);
    w.setProSubTab = (sub: 'pricing' | 'lab') => setProSubTab(sub);
    w.copyShareLink = () => handleSharePortrait();
    w.resetReflection = () => {
      setResponses({});
      setCurrentQIdx(0);
      AuraMicroGamesBridge.resetState();
      showToast('Started a fresh quiet reflection');
    };
  }, [
    handleSwitchTab,
    handleDismissWelcome,
    handleSelectAnswer,
    handleSelectMask,
    handleUnlockPro,
    handleSharePortrait,
    showToast,
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
      {/* Toast Banner */}
      <div
        id="toast-banner"
        className={`toast-banner ${toastMsg ? 'visible' : ''}`}
      >
        {toastMsg || 'Copied link to clipboard!'}
      </div>

      {/* Ambient Sanctuary Background */}
      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* Welcome Modal */}
      {welcomeVisible && (
        <div id="welcome-overlay" className="overlay-screen">
          <div className="glass-card overlay-card">
            <div
              id="welcome-orbital"
              style={{
                width: '86px',
                height: '86px',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <OrbitalSvg size={86} uid="welcome" />
            </div>
            <div className="soft-pill" style={{ marginBottom: '14px' }}>
              ✦ Quiet Mind Portrait
            </div>
            <h1
              className="serif"
              style={{ fontSize: '33px', lineHeight: 1.14, marginBottom: '10px' }}
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
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                minHeight: '42px',
                marginBottom: '18px',
              }}
            >
              {welcomeTwText}
            </p>

            <div className="name-input-wrap">
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                }}
              >
                First name (optional)
              </span>
              <input
                id="welcome-name-input"
                type="text"
                placeholder="e.g., Alex"
                maxLength={24}
                value={welcomeInputName}
                onChange={(e) => setWelcomeInputName(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => handleDismissWelcome('test')}
              className="btn-primary"
              style={{ marginBottom: '9px' }}
            >
              Begin Quiet Reflection
            </button>
            <button
              type="button"
              onClick={() => handleDismissWelcome('blueprint')}
              className="btn-ghost"
              style={{ width: '100%' }}
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
              style={{ width: '82px', height: '82px', margin: '0 auto 14px' }}
            >
              <OrbitalSvg size={82} uid="loader" />
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
      <div className="app-container">
        <header className="top-header">
          <div className="brand-pill">
            <span className="brand-dot" />
            <span>Aura</span>
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
              · Quiet Mind Portrait
            </span>
          </div>
          <div id="header-tier-badge" className="tier-badge">
            Calm Reflection
          </div>
        </header>

        {/* VIEW 1: REFLECT */}
        {activeTab === 'test' && (
          <QuietReflection
            questions={studioQuestions}
            activeFlow={activeFlow}
            responses={responses}
            currentQIdx={currentQIdx}
            reflectPart={reflectPart}
            onSelectAnswer={(qId, val) => handleSelectAnswer(qId, val)}
            onSetCurrentQIdx={(idx) => setCurrentQIdx(idx)}
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

        {/* VIEW 4: MORE & KAE'S SCIENCE STUDIO */}
        {activeTab === 'pro' && (
          <MoreAndLabView
            subTab={proSubTab}
            questions={studioQuestions}
            flows={studioFlows}
            activeFlowId={activeFlowId}
            shadowMatrix={shadowMatrix}
            onChangeSubTab={(sub) => setProSubTab(sub)}
            onPreviewFullPortraitGuide={() => {
              handleUnlockPro('Opened Full Portrait Guide');
              handleSwitchTab('blueprint');
            }}
            onRefreshStudioData={refreshStudioData}
            onShowToast={showToast}
          />
        )}
      </div>

      {/* Bottom Mobile Navigation */}
      <nav className="bottom-nav">
        <button
          id="nav-test"
          type="button"
          onClick={() => handleSwitchTab('test')}
          className={`nav-tab ${activeTab === 'test' ? 'active' : ''}`}
        >
          <span className="nav-icon">✦</span>
          <span>Reflect</span>
        </button>
        <button
          id="nav-blueprint"
          type="button"
          onClick={() => handleSwitchTab('blueprint')}
          className={`nav-tab ${activeTab === 'blueprint' ? 'active' : ''}`}
        >
          <span className="nav-icon">◎</span>
          <span>Portrait</span>
        </button>
        <button
          id="nav-chemistry"
          type="button"
          onClick={() => handleSwitchTab('chemistry')}
          className={`nav-tab ${activeTab === 'chemistry' ? 'active' : ''}`}
        >
          <span className="nav-icon">∞</span>
          <span>Together</span>
        </button>
        <button
          id="nav-pro"
          type="button"
          onClick={() => handleSwitchTab('pro')}
          className={`nav-tab ${activeTab === 'pro' ? 'active' : ''}`}
        >
          <span className="nav-icon">✧</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
