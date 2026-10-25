import React, { useEffect, useRef, useState } from 'react';
import {
  ARCHETYPES,
  AURA_SCIENCE_BUNDLE,
  CALM_DIMENSION_LABELS,
} from '../data/scienceBundle';
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

export const PortraitView: React.FC<PortraitViewProps> = ({
  userName,
  decomposition,
  proUnlocked,
  onSelectMask,
  onOpenMindMoments,
  onUnlockPro,
  onSharePortrait,
}) => {
  const [chapter, setChapter] = useState<0 | 1 | 2 | 3>(0);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (proUnlocked) {
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
    const primaryTextColor = rootStyle.getPropertyValue('--text-primary').trim() || '#232533';
    const borderStroke = rootStyle.getPropertyValue('--glass-border').trim() || 'rgba(120,120,140,0.22)';

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

  if (!decomposition) return null;

  const c4d = decomposition.cortical_4d;
  const arch = ARCHETYPES[c4d.mbti_code] || ARCHETYPES.INFP;
  const maskApplied = decomposition.mask_applied;
  const calmRhythmTitle = maskApplied.calm_title || maskApplied.short_label;
  const calmRhythmBadge = maskApplied.calm_badge || 'Natural Rhythm';
  const masks = AURA_SCIENCE_BUNDLE.masks_schema.masks;
  const topDiscoveredId =
    decomposition.inferred_mask_posteriors && decomposition.inferred_mask_posteriors[0]
      ? decomposition.inferred_mask_posteriors[0].mask_id
      : maskApplied.id;

  const tel = decomposition.telemetry_profile;
  const cleanMindsEyeTitle = String(tel?.minds_eye_label || 'Clear Inner Canvas')
    .replace(/\(Aphantasia Spectrum\)/gi, '(Pure Knowing)')
    .replace(/\(Hyperphantasia Spectrum\)/gi, '(Lifelike Cinema)');

  const gate = decomposition.gating_deconfound;
  const layers = decomposition.signal_layers;
  const asp = decomposition.deyoung_10_aspects;

  const aspectItems = [
    { name: 'Pattern & Big-Picture Curiosity', val: asp.O_intellect },
    { name: 'Sensory & Aesthetic Appreciation', val: asp.O_openness },
    { name: 'Deep-Interest Momentum', val: asp.C_industriousness },
    { name: 'Love of Calm Order & Structure', val: asp.C_orderliness },
    { name: 'Warm One-on-One Presence', val: asp.E_enthusiasm },
    { name: 'Gentle Initiative & Guiding', val: asp.E_assertiveness },
    { name: 'Empathy & Heartfelt Care', val: asp.A_compassion },
    { name: 'Thoughtful Harmony with Others', val: asp.A_politeness },
    { name: 'Quiet Looking-Ahead & Caution', val: asp.N_withdrawal },
    { name: 'Sensitivity to Sudden Shifts', val: asp.N_volatility },
  ];

  const CHAPTERS = [
    { idx: 0 as const, label: '1. Rhythm' },
    { idx: 1 as const, label: '2. Dimensions' },
    { idx: 2 as const, label: '3. Mind & Setting' },
    { idx: 3 as const, label: '4. 10 Nuances' },
  ];

  return (
    <section id="view-blueprint" className="view-section active">
      {/* Chapter Stepper Bar */}
      <div className="chapter-stepper-bar">
        <div className="chapter-pills">
          {CHAPTERS.map((ch) => (
            <button
              key={ch.idx}
              type="button"
              onClick={() => setChapter(ch.idx)}
              className={`chapter-pill ${chapter === ch.idx ? 'active' : ''}`}
            >
              {ch.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSharePortrait}
          className="aura-inline-text-btn"
          style={{ color: 'var(--accent)', fontWeight: 600 }}
        >
          Share ↗
        </button>
      </div>

      {/* ====================================================================
          CHAPTER 1: CORE PORTRAIT & NATURAL RHYTHM
         ==================================================================== */}
      <div className={`portrait-chapter ${chapter === 0 ? 'active' : ''}`}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
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
            style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '2px' }}
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
            style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.55 }}
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
            <span className="typeform-eyebrow-step" style={{ color: 'var(--amber)' }}>
              Natural Rhythm
            </span>
            <span
              id="bp-rhythm-badge"
              style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 600 }}
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
            style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, marginBottom: '6px' }}
          >
            {maskApplied.calm_summary}
          </p>
          <p
            id="bp-mask-diagnostic"
            style={{ fontSize: '12.5px', color: 'var(--emerald)', lineHeight: 1.48, marginBottom: '10px' }}
          >
            {maskApplied.calm_reframe}
          </p>

          <div style={{ display: 'none' }}>
            <span id="bp-calm-masking-note">{decomposition.calm_notes?.masking_note}</span>
            <span id="bp-calm-season-note">{decomposition.calm_notes?.season_note}</span>
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
            <h3 className="serif" style={{ fontSize: '25px', marginBottom: '8px' }}>
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
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{meta.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                        {Math.round(debV)}%
                      </span>
                    </div>
                    <div className="spectrum-track">
                      <div
                        className="spectrum-fill"
                        style={{ width: `${debV}%`, background: DOMAIN_COLORS[k] }}
                      />
                      <div className="baseline-marker" style={{ left: `${bWire}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas
              id="blueprint-radar"
              ref={radarCanvasRef}
              width={250}
              height={200}
              style={{ maxWidth: '100%' }}
            />
            <div id="bp-unique-divergences" style={{ width: '100%', marginTop: '6px' }}>
              {decomposition.top_unique_divergences.slice(0, 2).map((d) => (
                <div
                  key={d.domain}
                  style={{ fontSize: '11.5px', color: 'var(--text-muted)', padding: '4px 0' }}
                >
                  <strong style={{ color: 'var(--text)' }}>{d.domain_name}:</strong>{' '}
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

        <div id="bp-mind-moments-grid" className="setting-grid" style={{ marginBottom: '16px' }}>
          <div className="compact-stat-row">
            <span style={{ fontSize: '11px', color: 'var(--rose)', fontWeight: 600 }}>
              Mind’s Eye
            </span>
            <strong id="moment-minds-eye-title" style={{ fontSize: '13.5px' }}>
              {cleanMindsEyeTitle}
            </strong>
            <span id="moment-minds-eye-desc" style={{ display: 'none' }}>
              {tel?.minds_eye_calm_note}
            </span>
          </div>
          <div className="compact-stat-row">
            <span style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 600 }}>
              Still Water
            </span>
            <strong id="moment-still-water-title" style={{ fontSize: '13.5px' }}>
              {tel?.attentional_cadence_label || 'Steady & Present'}
            </strong>
            <span id="moment-still-water-desc" style={{ display: 'none' }}>
              {tel?.attentional_cadence_calm_note}
            </span>
          </div>
          <div className="compact-stat-row">
            <span style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 600 }}>
              Night Sky
            </span>
            <strong id="moment-night-sky-title" style={{ fontSize: '13.5px' }}>
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
              <span id="gate-routine-c" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                {Math.round(gate.routine_conscientiousness)}%
              </span>{' '}
              →{' '}
              <strong id="gate-salience-c" style={{ fontSize: '16px', color: 'var(--emerald)' }}>
                {Math.round(gate.salience_locked_drive)}%
              </strong>
            </div>
          </div>

          <div className="compact-stat-row">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Crowds vs. One-on-One
            </span>
            <div>
              <span id="gate-crowd-e" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                {Math.round(gate.crowd_foraging_extraversion)}%
              </span>{' '}
              →{' '}
              <strong id="gate-dyadic-e" style={{ fontSize: '16px', color: 'var(--sky)' }}>
                {Math.round(gate.dyadic_1on1_capacity)}%
              </strong>
            </div>
          </div>

          <div className="compact-stat-row">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Perceptiveness vs. Tension
            </span>
            <div>
              <strong id="gate-signal-o" style={{ fontSize: '16px', color: 'var(--accent)' }}>
                {Math.round(gate.perceptual_signal_resolution)}%
              </strong>{' '}
              /{' '}
              <span id="gate-dysreg-n" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
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
                <strong style={{ color: 'var(--accent)' }}>{Math.round(a.val)}%</strong>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--rose)' }}>
                Gentle Watch-Out
              </div>
              <p id="bp-blindspot-text" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {arch.blindspot}
              </p>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--emerald)' }}>
                Where You Thrive
              </div>
              <p id="bp-env-text" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
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
            <h4 className="serif" style={{ fontSize: '23px', marginBottom: '6px' }}>
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
              Explore all 10 personal nuances, what drains vs. restores your focus, and your
              keepsake guide.
            </p>
            <button
              type="button"
              onClick={() => onUnlockPro('Opened Full 10-Nuance Guide (Preview)')}
              className="btn-primary"
              style={{ maxWidth: '250px', padding: '10px 16px', fontSize: '13px' }}
            >
              Unlock Full Guide · $9 (Tap Preview)
            </button>
          </div>
        )}
      </div>

      {/* Chapter Next / Prev Navigation */}
      <div className="chapter-footer-nav">
        <button
          type="button"
          onClick={() => setChapter((prev) => Math.max(0, prev - 1) as 0 | 1 | 2 | 3)}
          className="aura-inline-text-btn"
          style={{ visibility: chapter === 0 ? 'hidden' : 'visible' }}
        >
          ← Previous
        </button>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          {chapter + 1} / 4
        </span>
        {chapter < 3 ? (
          <button
            type="button"
            onClick={() => setChapter((prev) => Math.min(3, prev + 1) as 0 | 1 | 2 | 3)}
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
