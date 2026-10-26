import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  predictBehaviorsFromPersonalityClient,
  scoreUserBlindPredictionsClient,
} from '../data/oregonBehavioralMatrix';
import {
  ARCHETYPES,
  AURA_SCIENCE_BUNDLE,
  CALM_DIMENSION_LABELS,
} from '../data/scienceBundle';
import { AuraAPI } from '../services/apiClient';
import { DecompositionResult, DomainKey } from '../types/aura';

interface PortraitViewProps {
  userName: string;
  decomposition: DecompositionResult | null;
  proUnlocked: boolean;
  onSelectMask: (maskId: string) => void;
  onOpenMindMoments: () => void;
  onUnlockPro: (msg?: string) => void;
  onSharePortrait: () => void;
}

const DOMAIN_COLORS: Record<DomainKey, string> = {
  O: 'linear-gradient(90deg, #8b5cf6, #c084fc)',
  C: 'linear-gradient(90deg, #38bdf8, #818cf8)',
  E: 'linear-gradient(90deg, #f472b6, #fb7185)',
  A: 'linear-gradient(90deg, #34d399, #2dd4bf)',
  N: 'linear-gradient(90deg, #fbbf24, #f87171)',
};

const PROOF_STORAGE_KEY = 'aura_consumer_proof_verifications_v1';

export const PortraitView: React.FC<PortraitViewProps> = ({
  userName,
  decomposition,
  proUnlocked,
  onSelectMask,
  onOpenMindMoments,
  onUnlockPro,
  onSharePortrait,
}) => {
  const [chapter, setChapter] = useState<0 | 1 | 2 | 3 | 4>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('chapter');
      if (p === 'proof' || p === '5' || p === '4') return 4;
    }
    return 0;
  });
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [userVerifications, setUserVerifications] = useState<
    Record<string, 'do_this' | 'rarely'>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(PROOF_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return {};
  });
  const [revealAllProof, setRevealAllProof] = useState<boolean>(false);

  useEffect(() => {
    if (proUnlocked && chapter !== 4) {
      setChapter(3);
    }
  }, [proUnlocked]);

  useEffect(() => {
    if (!decomposition || !radarCanvasRef.current) return;
    const canvas = radarCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const debiased = decomposition.signal_layers.debiased_scores;
    const hardwareBaseline = decomposition.signal_layers.hardware_baseline;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 + 4;
    const R = Math.min(W, H) * 0.34;
    const labels = ['Curiosity', 'Focus', 'Social', 'Warmth', 'Sensitivity'];
    const keys: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];

    const rootStyle = getComputedStyle(document.documentElement);
    const primaryTextColor =
      rootStyle.getPropertyValue('--text-primary').trim() || '#232533';
    const borderStroke =
      rootStyle.getPropertyValue('--glass-border').trim() ||
      'rgba(120,120,140,0.22)';

    for (let ring = 1; ring <= 4; ring++) {
      const r = (R * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const val = (hardwareBaseline[keys[i]] || 50) / 100;
      const x = cx + Math.cos(ang) * (R * val);
      const y = cy + Math.sin(ang) * (R * val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const val = (debiased[keys[i]] || 50) / 100;
      const x = cx + Math.cos(ang) * (R * val);
      const y = cy + Math.sin(ang) * (R * val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.24)';
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = primaryTextColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const lx = cx + Math.cos(ang) * (R + 26);
      const ly = cy + Math.sin(ang) * (R + 20);
      ctx.fillText(labels[i], lx, ly);
    }
  }, [decomposition, chapter]);

  const blindPredictionBundle = useMemo(() => {
    if (!decomposition) return null;
    return predictBehaviorsFromPersonalityClient({
      domainScores: decomposition.signal_layers.debiased_scores,
      aspectScores: decomposition.deyoung_10_aspects,
      telemetry: decomposition.telemetry_profile,
      topK: 5,
    });
  }, [decomposition]);

  const blindScoreSummary = useMemo(() => {
    if (!blindPredictionBundle) return null;
    return scoreUserBlindPredictionsClient(
      blindPredictionBundle.topPredictions,
      userVerifications
    );
  }, [blindPredictionBundle, userVerifications]);

  const handleVerifyHabit = (actId: string, choice: 'do_this' | 'rarely') => {
    const next = { ...userVerifications, [actId]: choice };
    setUserVerifications(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PROOF_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }
    if (blindPredictionBundle) {
      AuraAPI.verifyBlindPredictions({
        predictions: blindPredictionBundle.topPredictions,
        userVerifications: next,
      }).catch(() => {
        // offline client fallback already active
      });
    }
  };

  if (!decomposition || !blindPredictionBundle || !blindScoreSummary) return null;

  const c4d = decomposition.cortical_4d;
  const arch = ARCHETYPES[c4d.mbti_code] || ARCHETYPES.INFP;
  const maskApplied = decomposition.mask_applied;
  const calmRhythmTitle = maskApplied.calm_title || maskApplied.short_label;
  const calmRhythmBadge = maskApplied.calm_badge || 'Natural Rhythm';
  const masks = AURA_SCIENCE_BUNDLE.masks_schema.masks;
  const topDiscoveredId =
    decomposition.inferred_mask_posteriors &&
    decomposition.inferred_mask_posteriors[0]
      ? decomposition.inferred_mask_posteriors[0].mask_id
      : maskApplied.id;

  const tel = decomposition.telemetry_profile;
  const cleanMindsEyeTitle = String(
    tel?.minds_eye_label || 'Clear Inner Canvas'
  )
    .replace(/\(Aphantasia Spectrum\)/gi, '(Pure Knowing)')
    .replace(/\(Hyperphantasia Spectrum\)/gi, '(Lifelike Cinema)');

  const gate = decomposition.gating_deconfound;
  const layers = decomposition.signal_layers;
  const asp = decomposition.deyoung_10_aspects;
  const postShift = blindScoreSummary.aspectPosteriorUpdates;

  const aspectItems = [
    {
      name: 'Pattern & Big-Picture Curiosity',
      val: Math.max(4, Math.min(98, asp.O_intellect + (postShift.O_intellect || 0))),
    },
    {
      name: 'Sensory & Aesthetic Appreciation',
      val: Math.max(4, Math.min(98, asp.O_openness + (postShift.O_openness || 0))),
    },
    {
      name: 'Deep-Interest Momentum',
      val: Math.max(
        4,
        Math.min(98, asp.C_industriousness + (postShift.C_industriousness || 0))
      ),
    },
    {
      name: 'Love of Calm Order & Structure',
      val: Math.max(
        4,
        Math.min(98, asp.C_orderliness + (postShift.C_orderliness || 0))
      ),
    },
    {
      name: 'Warm One-on-One Presence',
      val: Math.max(
        4,
        Math.min(98, asp.E_enthusiasm + (postShift.E_enthusiasm || 0))
      ),
    },
    {
      name: 'Gentle Initiative & Guiding',
      val: Math.max(
        4,
        Math.min(98, asp.E_assertiveness + (postShift.E_assertiveness || 0))
      ),
    },
    {
      name: 'Empathy & Heartfelt Care',
      val: Math.max(
        4,
        Math.min(98, asp.A_compassion + (postShift.A_compassion || 0))
      ),
    },
    {
      name: 'Thoughtful Harmony with Others',
      val: Math.max(
        4,
        Math.min(98, asp.A_politeness + (postShift.A_politeness || 0))
      ),
    },
    {
      name: 'Quiet Looking-Ahead & Caution',
      val: Math.max(
        4,
        Math.min(98, asp.N_withdrawal + (postShift.N_withdrawal || 0))
      ),
    },
    {
      name: 'Sensitivity to Sudden Shifts',
      val: Math.max(
        4,
        Math.min(98, asp.N_volatility + (postShift.N_volatility || 0))
      ),
    },
  ];

  const CHAPTERS: {
    idx: 0 | 1 | 2 | 3 | 4;
    label: string;
    id?: string;
    testId?: string;
  }[] = [
    { idx: 0, label: '1. Rhythm' },
    { idx: 1, label: '2. Traits' },
    { idx: 2, label: '3. Mind' },
    { idx: 3, label: '4. Nuance' },
    {
      idx: 4,
      label: '5. Proof 🔒',
      id: 'bp-tab-proof',
      testId: 'portrait-chapter-proof',
    },
  ];

  const { commitmentHash, oregonTwin, topPredictions } = blindPredictionBundle;

  return (
    <section id="view-blueprint" className="view-section active">
      {/* Chapter Stepper Bar */}
      <div className="chapter-stepper-bar">
        <div className="chapter-pills" style={{ gap: '4px' }}>
          {CHAPTERS.map((ch) => (
            <button
              key={ch.idx}
              id={ch.id}
              data-testid={ch.testId}
              type="button"
              onClick={() => setChapter(ch.idx)}
              className={`chapter-pill ${chapter === ch.idx ? 'active' : ''}`}
              style={{ padding: '4px 6.5px', fontSize: '10.5px' }}
            >
              {ch.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSharePortrait}
          className="aura-inline-text-btn"
          style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}
        >
          Share ↗
        </button>
      </div>

      {/* ====================================================================
          CHAPTER 1: CORE PORTRAIT & NATURAL RHYTHM
         ==================================================================== */}
      <div className={`portrait-chapter ${chapter === 0 ? 'active' : ''}`}>
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span id="bp-active-mask-badge" className="typeform-eyebrow-step">
              {calmRhythmTitle}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span id="bp-mbti-badge" className="typeform-eyebrow-theme">
              {arch.vibe || 'Quiet Depth & Warmth'}
            </span>
          </div>

          <div
            id="blueprint-owner-title"
            style={{
              fontSize: '12px',
              color: 'var(--text-dim)',
              marginBottom: '2px',
            }}
          >
            {userName}’s Quiet Mind Portrait
          </div>
          <h2
            id="bp-archetype-title"
            className="serif"
            style={{ fontSize: '30px', lineHeight: 1.15, marginBottom: '8px' }}
          >
            {arch.title}
          </h2>
          <p
            id="bp-archetype-summary"
            style={{
              fontSize: '13.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.55,
            }}
          >
            {arch.summary}
          </p>
        </div>

        <div className="open-divider-section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span
              className="typeform-eyebrow-step"
              style={{ color: 'var(--amber)' }}
            >
              Natural Rhythm
            </span>
            <span
              id="bp-rhythm-badge"
              style={{
                fontSize: '11px',
                color: 'var(--emerald)',
                fontWeight: 600,
              }}
            >
              {calmRhythmBadge}
            </span>
          </div>
          <h3
            id="bp-rhythm-title"
            className="serif"
            style={{ fontSize: '23px', lineHeight: 1.2, marginBottom: '6px' }}
          >
            {calmRhythmTitle}
          </h3>
          <p
            id="bp-mask-mechanism"
            style={{
              fontSize: '13px',
              color: 'var(--text)',
              lineHeight: 1.5,
              marginBottom: '6px',
            }}
          >
            {maskApplied.calm_summary}
          </p>
          <p
            id="bp-mask-diagnostic"
            style={{
              fontSize: '12.5px',
              color: 'var(--emerald)',
              lineHeight: 1.48,
              marginBottom: '10px',
            }}
          >
            {maskApplied.calm_reframe}
          </p>

          <div style={{ display: 'none' }}>
            <span id="bp-calm-masking-note">
              {decomposition.calm_notes?.masking_note}
            </span>
            <span id="bp-calm-season-note">
              {decomposition.calm_notes?.season_note}
            </span>
          </div>

          <div id="bp-mask-pills" className="mask-pill-row">
            {masks.map((m) => {
              const active = m.id === maskApplied.id;
              const isDiscovered = m.id === topDiscoveredId;
              const label = m.calm_title || m.short_label;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMask(m.id)}
                  className={`mask-pill ${active ? 'active' : ''}`}
                >
                  {label}
                  {isDiscovered ? ' ✦' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================================
          CHAPTER 2: FIVE DIMENSIONS & PORTRAIT SHAPE
         ==================================================================== */}
      <div className={`portrait-chapter ${chapter === 1 ? 'active' : ''}`}>
        <div className="desktop-grid">
          <div>
            <h3
              className="serif"
              style={{ fontSize: '25px', marginBottom: '8px' }}
            >
              Your Five Dimensions
            </h3>
            <div id="bp-decomp-bars">
              {(['O', 'C', 'E', 'A', 'N'] as DomainKey[]).map((k) => {
                const meta = CALM_DIMENSION_LABELS[k];
                const debV = layers.debiased_scores[k];
                const bWire = layers.hardware_baseline[k];
                return (
                  <div key={k} className="decomp-row" style={{ padding: '9px 0' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {meta.name}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--accent)',
                        }}
                      >
                        {Math.round(debV)}%
                      </span>
                    </div>
                    <div className="spectrum-track">
                      <div
                        className="spectrum-fill"
                        style={{ width: `${debV}%`, background: DOMAIN_COLORS[k] }}
                      />
                      <div
                        className="baseline-marker"
                        style={{ left: `${bWire}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <canvas
              id="blueprint-radar"
              ref={radarCanvasRef}
              width={250}
              height={200}
              style={{ maxWidth: '100%' }}
            />
            <div
              id="bp-unique-divergences"
              style={{ width: '100%', marginTop: '6px' }}
            >
              {decomposition.top_unique_divergences.slice(0, 2).map((d) => (
                <div
                  key={d.domain}
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    padding: '4px 0',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>
                    {d.domain_name}:
                  </strong>{' '}
                  {d.interpretation}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          CHAPTER 3: INNER MIND & SETTING SHIFTS
         ==================================================================== */}
      <div className={`portrait-chapter ${chapter === 2 ? 'active' : ''}`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <h3 className="serif" style={{ fontSize: '25px' }}>
            Inner Mind &amp; Setting Shifts
          </h3>
          <button
            type="button"
            onClick={onOpenMindMoments}
            className="aura-inline-text-btn"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            Replay Moments →
          </button>
        </div>

        <div
          id="bp-mind-moments-grid"
          className="setting-grid"
          style={{ marginBottom: '16px' }}
        >
          <div className="compact-stat-row">
            <div>
              <span
                style={{ fontSize: '11px', color: 'var(--rose)', fontWeight: 600 }}
              >
                Inner Canvas · V1 &amp; Gestalt
              </span>
              <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                V1 Gain {tel?.imagery_vividness ?? 72}% · {(tel?.inner_modality || 'visual_cinema').replace('_', ' ')}
              </div>
            </div>
            <strong id="moment-minds-eye-title" style={{ fontSize: '13px' }}>
              {cleanMindsEyeTitle}
            </strong>
            <span id="moment-minds-eye-desc" style={{ display: 'none' }}>
              {tel?.minds_eye_calm_note}
            </span>
          </div>
          <div className="compact-stat-row">
            <div>
              <span
                style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 600 }}
              >
                Still Water · Go / No-Go Tempo
              </span>
              <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                {tel?.median_rt_ms ?? 264}ms · {tel?.rt_steadiness_pct ?? 91}% Steadiness · Lure Hold
              </div>
            </div>
            <strong id="moment-still-water-title" style={{ fontSize: '13px' }}>
              {tel?.attentional_cadence_label || 'Steady & Present'}
            </strong>
            <span id="moment-still-water-desc" style={{ display: 'none' }}>
              {tel?.attentional_cadence_calm_note}
            </span>
          </div>
          <div className="compact-stat-row">
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--amber)',
                  fontWeight: 600,
                }}
              >
                Night Sky · Working Memory
              </span>
              <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                {tel?.memory_accuracy_pct ?? 100}% Span · {tel?.mean_chunk_ms ?? 420}ms Chunk · Decoy Filter
              </div>
            </div>
            <strong id="moment-night-sky-title" style={{ fontSize: '13px' }}>
              {tel?.pattern_memory_label || 'Whole-Constellation Memory'}
            </strong>
            <span id="moment-night-sky-desc" style={{ display: 'none' }}>
              {tel?.pattern_memory_calm_note}
            </span>
          </div>
        </div>

        <div className="setting-grid">
          <div className="compact-stat-row">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Routine vs. Deep Curiosity
            </span>
            <div>
              <span
                id="gate-routine-c"
                style={{ fontSize: '13px', color: 'var(--text-dim)' }}
              >
                {Math.round(gate.routine_conscientiousness)}%
              </span>{' '}
              →{' '}
              <strong
                id="gate-salience-c"
                style={{ fontSize: '16px', color: 'var(--emerald)' }}
              >
                {Math.round(gate.salience_locked_drive)}%
              </strong>
            </div>
          </div>

          <div className="compact-stat-row">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Crowds vs. One-on-One
            </span>
            <div>
              <span
                id="gate-crowd-e"
                style={{ fontSize: '13px', color: 'var(--text-dim)' }}
              >
                {Math.round(gate.crowd_foraging_extraversion)}%
              </span>{' '}
              →{' '}
              <strong
                id="gate-dyadic-e"
                style={{ fontSize: '16px', color: 'var(--sky)' }}
              >
                {Math.round(gate.dyadic_1on1_capacity)}%
              </strong>
            </div>
          </div>

          <div className="compact-stat-row">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Perceptiveness vs. Tension
            </span>
            <div>
              <strong
                id="gate-signal-o"
                style={{ fontSize: '16px', color: 'var(--accent)' }}
              >
                {Math.round(gate.perceptual_signal_resolution)}%
              </strong>{' '}
              /{' '}
              <span
                id="gate-dysreg-n"
                style={{ fontSize: '13px', color: 'var(--text-dim)' }}
              >
                {Math.round(gate.true_affective_dysregulation)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          CHAPTER 4: FULL 10-NUANCE GUIDE
         ==================================================================== */}
      <div
        className={`portrait-chapter ${chapter === 3 ? 'active' : ''}`}
        style={{ position: 'relative' }}
      >
        <h3 className="serif" style={{ fontSize: '25px', marginBottom: '8px' }}>
          Full 10-Nuance Guide
        </h3>

        <div
          id="pro-lock-blur"
          style={{
            transition: 'filter 0.3s ease',
            filter: proUnlocked ? 'none' : 'blur(6px)',
            pointerEvents: proUnlocked ? 'auto' : 'none',
          }}
        >
          <div
            id="bp-aspects-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px 14px',
              marginBottom: '12px',
            }}
          >
            {aspectItems.map((a) => (
              <div
                key={a.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11.5px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{a.name}</span>
                <strong style={{ color: 'var(--accent)' }}>
                  {Math.round(a.val)}%
                </strong>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--rose)',
                }}
              >
                Gentle Watch-Out
              </div>
              <p
                id="bp-blindspot-text"
                style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}
              >
                {arch.blindspot}
              </p>
            </div>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--emerald)',
                }}
              >
                Where You Thrive
              </div>
              <p
                id="bp-env-text"
                style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}
              >
                {arch.environment}
              </p>
            </div>
          </div>
        </div>

        {!proUnlocked && (
          <div
            id="pro-lock-cta"
            style={{
              position: 'absolute',
              inset: '36px 0 0',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <h4
              className="serif"
              style={{ fontSize: '23px', marginBottom: '6px' }}
            >
              Unlock Your Full 10-Nuance Guide
            </h4>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                maxWidth: '300px',
                marginBottom: '14px',
              }}
            >
              Explore all 10 personal nuances, what drains vs. restores your
              focus, and your keepsake guide.
            </p>
            <button
              type="button"
              onClick={() =>
                onUnlockPro('Opened Full 10-Nuance Guide (Preview)')
              }
              className="btn-primary"
              style={{ maxWidth: '250px', padding: '10px 16px', fontSize: '13px' }}
            >
              Unlock Full Guide · $9 (Tap Preview)
            </button>
          </div>
        )}
      </div>

      {/* ====================================================================
          CHAPTER 5: EMPIRICAL PROOF · BLIND BEHAVIORAL PREDICTIONS (ZERO-SCROLL)
         ==================================================================== */}
      <div
        id="portrait-chapter-proof-panel"
        className={`portrait-chapter ${chapter === 4 ? 'active' : ''}`}
      >
        {/* Top Compact Header Strip */}
        <div style={{ marginBottom: '7px' }}>
          <div
            className="mono"
            style={{
              fontSize: '9.5px',
              color: 'var(--accent)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span id="proof-commitment-hash">
              OREGON HOLDOUT · 🔒 #{commitmentHash.slice(0, 8)}
            </span>
            <span id="proof-oregon-twin" style={{ color: 'var(--emerald)' }}>
              Twin: {oregonTwin.subjectId.replace('ESCS-Holdout ', 'ESCS ')} (r={oregonTwin.similarityR})
            </span>
          </div>

          <h3
            className="serif"
            style={{
              fontSize: '20px',
              lineHeight: 1.15,
              marginBottom: '2px',
              color: 'var(--text-primary)',
            }}
          >
            Can Aura Predict Your Actual Week?
          </h3>
          <p
            style={{
              fontSize: '11.5px',
              lineHeight: 1.25,
              color: 'var(--text-muted)',
            }}
          >
            Aura locked 5 concrete predictions before you tap. Mark what you
            actually do to test or falsify the model:
          </p>
        </div>

        {/* 5 Ultra-Compact Behavioral Prediction Cards */}
        <div
          id="proof-predictions-list"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          {topPredictions.map((pred, idx) => {
            const itemRes = blindScoreSummary.itemResults[idx];
            const answered = itemRes?.answered || false;
            const userChoice = itemRes?.userChoice || null;
            const isMatch = itemRes?.isMatch || false;
            const showUnlocked = answered || revealAllProof;

            let badgeText = `🔒 Locked (${pred.confidencePct}% conf)`;
            let badgeColor = 'var(--text-dim)';
            if (answered) {
              if (isMatch) {
                badgeText = `✓ Locked: ${pred.predictedLabel} (${pred.confidencePct}%) · Match`;
                badgeColor = 'var(--emerald)';
              } else {
                badgeText = `⚡ Locked: ${pred.predictedLabel} (${pred.confidencePct}%) · Falsified (↑ ${pred.aspect_short_label})`;
                badgeColor = 'var(--amber)';
              }
            } else if (revealAllProof) {
              badgeText = `🔓 Locked: ${pred.predictedLabel} (${pred.confidencePct}% conf)`;
              badgeColor = 'var(--accent)';
            }

            return (
              <div
                key={pred.id}
                data-testid={`proof-card-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '12px',
                  background: 'var(--pill-bg)',
                  border: answered
                    ? isMatch
                      ? '1px solid rgba(16, 185, 129, 0.45)'
                      : '1px solid rgba(245, 158, 11, 0.48)'
                    : '1px solid var(--glass-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      lineHeight: 1.22,
                      color: 'var(--text-primary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    <strong style={{ fontWeight: 600 }}>
                      {pred.short_label}:
                    </strong>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {pred.text}
                    </span>
                  </div>
                  <div
                    className="mono"
                    data-testid={`proof-badge-${idx}`}
                    style={{
                      fontSize: '10px',
                      lineHeight: 1.2,
                      marginTop: '2px',
                      color: badgeColor,
                      fontWeight: showUnlocked ? 600 : 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {badgeText}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    data-testid={`proof-yes-${idx}`}
                    onClick={() => handleVerifyHabit(pred.id, 'do_this')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10.5px',
                      fontWeight: userChoice === 'do_this' ? 700 : 500,
                      borderRadius: '999px',
                      cursor: 'pointer',
                      border:
                        userChoice === 'do_this'
                          ? '1px solid var(--border-active)'
                          : '1px solid var(--glass-border)',
                      background:
                        userChoice === 'do_this'
                          ? 'var(--accent-soft)'
                          : 'transparent',
                      color:
                        userChoice === 'do_this'
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    Do this
                  </button>
                  <button
                    type="button"
                    data-testid={`proof-no-${idx}`}
                    onClick={() => handleVerifyHabit(pred.id, 'rarely')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10.5px',
                      fontWeight: userChoice === 'rarely' ? 700 : 500,
                      borderRadius: '999px',
                      cursor: 'pointer',
                      border:
                        userChoice === 'rarely'
                          ? '1px solid var(--border-active)'
                          : '1px solid var(--glass-border)',
                      background:
                        userChoice === 'rarely'
                          ? 'var(--accent-soft)'
                          : 'transparent',
                      color:
                        userChoice === 'rarely'
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    Rarely
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Live Calibration & Falsifiability Bar */}
        <div
          id="proof-calibration-bar"
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: '12px',
            background: 'var(--pill-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '10.5px',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
              <span id="proof-hit-rate">
                Empirical Hit Rate: {blindScoreSummary.hits}/
                {blindScoreSummary.answeredCount} ({blindScoreSummary.hitRatePct}
                %)
              </span>
              <span style={{ color: 'var(--text-dim)', margin: '0 5px' }}>·</span>
              <span id="proof-brier-skill" style={{ color: 'var(--emerald)' }}>
                Brier Skill:{' '}
                {blindScoreSummary.brierSkillScore >= 0 ? '+' : ''}
                {blindScoreSummary.brierSkillScore} vs Chance
              </span>
            </div>

            <button
              id="btn-reveal-all-proof"
              type="button"
              onClick={() => setRevealAllProof((prev) => !prev)}
              className="aura-inline-text-btn"
              style={{
                fontSize: '10.5px',
                color: 'var(--accent)',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {revealAllProof ? 'Hide Locked' : 'Reveal All 5'}
            </button>
          </div>

          <div
            id="proof-posterior-note"
            style={{
              fontSize: '10.5px',
              lineHeight: 1.2,
              marginTop: '3px',
              color:
                blindScoreSummary.falsifiedCount > 0
                  ? 'var(--amber)'
                  : 'var(--text-dim)',
              fontWeight: blindScoreSummary.falsifiedCount > 0 ? 600 : 400,
            }}
          >
            {blindScoreSummary.falsifiedCount > 0
              ? 'Falsified items updated your live Aspect posterior'
              : blindScoreSummary.summaryUpdateNote}
          </div>
        </div>
      </div>

      {/* Chapter Next / Prev Navigation */}
      <div
        className="chapter-footer-nav"
        style={{ marginTop: '12px', paddingTop: '10px' }}
      >
        <button
          type="button"
          onClick={() =>
            setChapter((prev) => Math.max(0, prev - 1) as 0 | 1 | 2 | 3 | 4)
          }
          className="aura-inline-text-btn"
          style={{ visibility: chapter === 0 ? 'hidden' : 'visible' }}
        >
          ← Previous
        </button>
        <span
          className="mono"
          style={{ fontSize: '11px', color: 'var(--text-dim)' }}
        >
          {chapter + 1} / 5
        </span>
        {chapter < 4 ? (
          <button
            type="button"
            onClick={() =>
              setChapter((prev) => Math.min(4, prev + 1) as 0 | 1 | 2 | 3 | 4)
            }
            className="aura-inline-text-btn"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            Next Chapter →
          </button>
        ) : (
          <button
            type="button"
            onClick={onSharePortrait}
            className="aura-inline-text-btn"
            style={{ color: 'var(--emerald)', fontWeight: 600 }}
          >
            Share Portrait ↗
          </button>
        )}
      </div>
    </section>
  );
};
