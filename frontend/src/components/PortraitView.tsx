import React, { useEffect, useRef } from 'react';
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
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Typical Rhythm Baseline polygon (Warm Amber dashed)
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
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);

    // Your Portrait polygon (Soft Lavender)
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
    ctx.fillStyle = 'rgba(167, 139, 250, 0.24)';
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Labels
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const lx = cx + Math.cos(ang) * (R + 26);
      const ly = cy + Math.sin(ang) * (R + 20);
      ctx.fillText(labels[i], lx, ly);
    }
  }, [decomposition]);

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

  return (
    <section id="view-blueprint" className="view-section active">
      {/* Card 1: Your Core Portrait */}
      <div className="glass-card" style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              id="bp-active-mask-badge"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--amber)',
                background: 'var(--amber-soft)',
                padding: '4px 11px',
                borderRadius: '999px',
              }}
            >
              {calmRhythmTitle}
            </span>
            <span
              id="bp-mbti-badge"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#f472b6',
                background: 'var(--rose-soft)',
                padding: '4px 11px',
                borderRadius: '999px',
              }}
            >
              {arch.vibe || 'Quiet Depth & Warmth'}
            </span>
          </div>
          <button
            type="button"
            onClick={onSharePortrait}
            className="btn-ghost"
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              color: '#c4b5fd',
              borderColor: 'rgba(167,139,250,0.3)',
            }}
          >
            Share Portrait ↗
          </button>
        </div>
        <div
          id="blueprint-owner-title"
          style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            fontWeight: 500,
            marginBottom: '3px',
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
          style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}
        >
          {arch.summary}
        </p>
      </div>

      {/* Card 2: Your Natural Rhythm (Discovered Automatically) */}
      <div className="glass-card" style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--amber)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            Your Natural Rhythm · Discovered Automatically
          </span>
          <span
            id="bp-rhythm-badge"
            style={{
              fontSize: '11px',
              color: 'var(--emerald)',
              background: 'var(--emerald-soft)',
              padding: '3px 10px',
              borderRadius: '999px',
            }}
          >
            {calmRhythmBadge}
          </span>
        </div>
        <h3
          id="bp-rhythm-title"
          className="serif"
          style={{ fontSize: '25px', lineHeight: 1.2, marginBottom: '8px' }}
        >
          {calmRhythmTitle}
        </h3>

        <div className="card-subtle" style={{ padding: '14px 16px', marginBottom: '12px' }}>
          <p
            id="bp-mask-mechanism"
            style={{
              fontSize: '13px',
              color: 'var(--text)',
              lineHeight: 1.58,
              marginBottom: '8px',
            }}
          >
            {maskApplied.calm_summary}
          </p>
          <p
            id="bp-mask-diagnostic"
            style={{ fontSize: '12.5px', color: 'var(--emerald)', lineHeight: 1.52 }}
          >
            {maskApplied.calm_reframe}
          </p>
        </div>

        {/* Gentle Callouts: Quiet Effort & Current Season */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px',
            marginBottom: '12px',
          }}
          className="calm-notes-grid"
        >
          <div
            className="card-subtle"
            style={{ padding: '12px 14px', borderColor: 'rgba(167,139,250,0.2)' }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#c4b5fd',
                marginBottom: '3px',
              }}
            >
              ✦ Quiet Effort Behind the Scenes
            </div>
            <p
              id="bp-calm-masking-note"
              style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}
            >
              {decomposition.calm_notes?.masking_note}
            </p>
          </div>
          <div
            className="card-subtle"
            style={{ padding: '12px 14px', borderColor: 'rgba(56,189,248,0.2)' }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--sky)',
                marginBottom: '3px',
              }}
            >
              ◎ Honoring Your Current Season
            </div>
            <p
              id="bp-calm-season-note"
              style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}
            >
              {decomposition.calm_notes?.season_note}
            </p>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginBottom: '7px' }}>
            Curious how another natural rhythm feels? Explore below:
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

      {/* Card 3: How Your Inner Mind Works (From Your 3 Mind Moments) */}
      <div className="glass-card" style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '10px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#c4b5fd',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              From Your Three Mind Moments
            </span>
            <h3 className="serif" style={{ fontSize: '23px', lineHeight: 1.2 }}>
              How Your Inner Mind Works
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenMindMoments}
            className="btn-ghost"
            style={{ fontSize: '11.5px', padding: '6px 11px' }}
          >
            Play Mind Moments →
          </button>
        </div>

        <div id="bp-mind-moments-grid" className="setting-grid">
          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--rose)',
                fontWeight: 600,
                marginBottom: '3px',
              }}
            >
              Inner Canvas · Mind’s Eye
            </div>
            <div
              id="moment-minds-eye-title"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '4px',
              }}
            >
              {cleanMindsEyeTitle}
            </div>
            <p
              id="moment-minds-eye-desc"
              style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.48 }}
            >
              {tel?.minds_eye_calm_note}
            </p>
          </div>
          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--sky)',
                fontWeight: 600,
                marginBottom: '3px',
              }}
            >
              Still Water · Attentional Rhythm
            </div>
            <div
              id="moment-still-water-title"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '4px',
              }}
            >
              {tel?.attentional_cadence_label || 'Steady & Present'}
            </div>
            <p
              id="moment-still-water-desc"
              style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.48 }}
            >
              {tel?.attentional_cadence_calm_note}
            </p>
          </div>
          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--amber)',
                fontWeight: 600,
                marginBottom: '3px',
              }}
            >
              Night Sky · Pattern Memory
            </div>
            <div
              id="moment-night-sky-title"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '4px',
              }}
            >
              {tel?.pattern_memory_label || 'Whole-Constellation Memory'}
            </div>
            <p
              id="moment-night-sky-desc"
              style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.48 }}
            >
              {tel?.pattern_memory_calm_note}
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: How Your Energy Shifts by Setting */}
      <div className="glass-card" style={{ marginBottom: '14px' }}>
        <div style={{ marginBottom: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--emerald)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            Context Matters
          </span>
          <h3 className="serif" style={{ fontSize: '23px', lineHeight: 1.2 }}>
            How Your Energy Shifts by Setting
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            You aren’t a single fixed number—your energy opens up when the setting matches how you
            are built.
          </p>
        </div>

        <div className="setting-grid">
          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              Everyday Errands vs. Deep Curiosity
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '5px',
              }}
            >
              <span
                id="gate-routine-c"
                style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}
              >
                {Math.round(gate.routine_conscientiousness)}%
              </span>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <strong
                id="gate-salience-c"
                style={{ fontSize: '21px', color: 'var(--emerald)' }}
              >
                {Math.round(gate.salience_locked_drive)}%
              </strong>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Routine checklists vs. when a question or project genuinely matters to you.
            </p>
          </div>

          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              Busy Rooms vs. One-on-One
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '5px',
              }}
            >
              <span
                id="gate-crowd-e"
                style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}
              >
                {Math.round(gate.crowd_foraging_extraversion)}%
              </span>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <strong id="gate-dyadic-e" style={{ fontSize: '21px', color: 'var(--sky)' }}>
                {Math.round(gate.dyadic_1on1_capacity)}%
              </strong>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Noisy group energy vs. warm, unhurried connection with one person.
            </p>
          </div>

          <div className="card-subtle" style={{ padding: '13px' }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              What You Notice vs. Inner Calm
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '5px',
              }}
            >
              <strong id="gate-signal-o" style={{ fontSize: '21px', color: 'var(--accent)' }}>
                {Math.round(gate.perceptual_signal_resolution)}%
              </strong>
              <span style={{ color: 'var(--text-dim)' }}>/</span>
              <span
                id="gate-dysreg-n"
                style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}
              >
                {Math.round(gate.true_affective_dysregulation)}%
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              How deeply you take in atmosphere and nuance vs. how much tension you carry.
            </p>
          </div>
        </div>
      </div>

      {/* Card 5: Your Five Dimensions & What Makes You Uniquely You */}
      <div className="desktop-grid" style={{ marginBottom: '14px' }}>
        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '8px',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <h3 className="serif" style={{ fontSize: '23px', lineHeight: 1.2 }}>
              Your Five Dimensions
            </h3>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--amber)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--amber)',
                }}
              />
              Typical for your rhythm
            </span>
          </div>
          <div id="bp-decomp-bars">
            {(['O', 'C', 'E', 'A', 'N'] as DomainKey[]).map((k) => {
              const meta = CALM_DIMENSION_LABELS[k];
              const debV = layers.debiased_scores[k];
              const bWire = layers.hardware_baseline[k];
              const deltaP = layers.residual_personality[k];
              const diffLabel =
                Math.abs(deltaP) < 3
                  ? `Right in step with a typical ${calmRhythmTitle}`
                  : deltaP > 0
                  ? `+${Math.round(deltaP)}% above typical for ${calmRhythmTitle}`
                  : `${Math.round(deltaP)}% gentler than typical for ${calmRhythmTitle}`;

              return (
                <div key={k} className="decomp-row">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.25,
                        }}
                      >
                        {meta.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {meta.subtitle}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(debV)}%
                    </span>
                  </div>
                  <div
                    className="spectrum-track"
                    title={`Warm amber dot = Typical for ${calmRhythmTitle} (${Math.round(
                      bWire
                    )}%)`}
                  >
                    <div
                      className="spectrum-fill"
                      style={{ width: `${debV}%`, background: DOMAIN_COLORS[k] }}
                    />
                    <div className="baseline-marker" style={{ left: `${bWire}%` }} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '6px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>
                      Typical for your rhythm:{' '}
                      <strong style={{ color: 'var(--amber)' }}>{Math.round(bWire)}%</strong>
                    </span>
                    <span style={{ color: 'var(--emerald)' }}>{diffLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <h3 className="serif" style={{ fontSize: '22px', lineHeight: 1.2 }}>
              Portrait Shape
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              You (Lavender) · Rhythm (Amber)
            </span>
          </div>
          <canvas
            id="blueprint-radar"
            ref={radarCanvasRef}
            width={290}
            height={245}
            style={{ maxWidth: '100%' }}
          />

          <div
            style={{
              width: '100%',
              marginTop: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--emerald)',
                marginBottom: '6px',
              }}
            >
              ✦ What Makes You Uniquely You
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Even among people who share your natural rhythm, these qualities stand out as
              distinctly yours:
            </p>
            <div id="bp-unique-divergences">
              {decomposition.top_unique_divergences.map((d) => (
                <div
                  key={d.domain}
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    padding: '7px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>{d.domain_name}:</strong>{' '}
                  {d.interpretation}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 6: Full 10-Nuance Guide ($9 Freemium Unlock with 1-tap Demo Preview) */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div>
            <h3 className="serif" style={{ fontSize: '23px', lineHeight: 1.2 }}>
              Full 10-Nuance Guide &amp; Ideal Setting
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              A closer look at your ten subtle strengths, gentle watch-outs, and where you thrive
            </p>
          </div>
          <span className="soft-pill">Full Guide</span>
        </div>

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
              gridTemplateColumns: '1fr',
              gap: '6px',
              marginBottom: '12px',
            }}
          >
            {aspectItems.map((a) => (
              <div
                key={a.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.025)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text)' }}>{a.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {Math.round(a.val)}%
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="card-subtle">
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--rose)',
                  marginBottom: '4px',
                }}
              >
                Gentle Watch-Out
              </div>
              <p
                id="bp-blindspot-text"
                style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}
              >
                {arch.blindspot}
              </p>
            </div>
            <div className="card-subtle">
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--emerald)',
                  marginBottom: '4px',
                }}
              >
                Where You Thrive
              </div>
              <p
                id="bp-env-text"
                style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}
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
              inset: '58px 12px 12px',
              background: 'rgba(8,9,16,0.86)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px',
              textAlign: 'center',
            }}
          >
            <div className="soft-pill" style={{ marginBottom: '6px' }}>
              ✦ Complete Portrait Guide
            </div>
            <h4 className="serif" style={{ fontSize: '23px', marginBottom: '6px' }}>
              Unlock Your Full 10-Nuance Guide
            </h4>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                maxWidth: '310px',
                marginBottom: '14px',
              }}
            >
              Explore all 10 personal nuances, what drains vs. restores your focus, and your
              printable keepsake guide.
            </p>
            <button
              type="button"
              onClick={() => onUnlockPro('Opened Full 10-Nuance Guide (Preview)')}
              className="btn-primary"
              style={{ maxWidth: '260px', padding: '11px 18px', fontSize: '13px' }}
            >
              Unlock Full Guide · $9 (Tap Preview)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
