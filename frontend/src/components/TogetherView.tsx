import React, { useEffect, useRef, useState } from 'react';
import {
  AURA_SCIENCE_BUNDLE,
  CALM_DIMENSION_LABELS,
  PARTNER_PRESETS,
} from '../data/scienceBundle';
import { ChemistryResult, DomainKey } from '../types/aura';

interface TogetherViewProps {
  userName: string;
  userRawScores: Record<DomainKey, number>;
  chemMode: 'partner' | 'cofounder' | 'friend';
  partnerName: string;
  partnerScores: Record<DomainKey, number>;
  partnerMaskId: string;
  activeSliderTarget: 'user' | 'partner';
  chemistry: ChemistryResult | null;
  onChangeChemMode: (mode: 'partner' | 'cofounder' | 'friend') => void;
  onChangePartnerName: (name: string) => void;
  onChangePartnerMask: (maskId: string) => void;
  onApplyPreset: (code: string) => void;
  onChangeSliderTarget: (target: 'user' | 'partner') => void;
  onSlideTrait: (trait: DomainKey, val: number) => void;
}

export const TogetherView: React.FC<TogetherViewProps> = ({
  userName,
  userRawScores,
  chemMode,
  partnerName,
  partnerScores,
  partnerMaskId,
  activeSliderTarget,
  chemistry,
  onChangeChemMode,
  onChangePartnerName,
  onChangePartnerMask,
  onApplyPreset,
  onChangeSliderTarget,
  onSlideTrait,
}) => {
  const [step, setStep] = useState<0 | 1>(0);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!chemistry || !radarCanvasRef.current) return;
    const canvas = radarCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scoresA = chemistry.person_a_decomposition.signal_layers.debiased_scores;
    const scoresB = chemistry.person_b_decomposition.signal_layers.debiased_scores;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 + 4;
    const R = Math.min(W, H) * 0.34;
    const keys: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];
    const labels = ['Curiosity', 'Focus', 'Social', 'Warmth', 'Sensitivity'];

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
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.stroke();
    }

    const drawPoly = (sc: Record<DomainKey, number>, fill: string, stroke: string) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const val = (sc[keys[i]] || 50) / 100;
        const x = cx + Math.cos(ang) * (R * val);
        const y = cy + Math.sin(ang) * (R * val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawPoly(scoresB, 'rgba(56, 189, 248, 0.18)', '#38bdf8');
    drawPoly(scoresA, 'rgba(244, 114, 182, 0.22)', '#f472b6');

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      ctx.fillText(labels[i], cx + Math.cos(ang) * (R + 25), cy + Math.sin(ang) * (R + 18));
    }
  }, [chemistry, step]);

  const masks = AURA_SCIENCE_BUNDLE.masks_schema.masks;
  const activeScores = activeSliderTarget === 'user' ? userRawScores : partnerScores;

  return (
    <section id="view-chemistry" className="view-section active">
      {/* Chapter Stepper */}
      <div className="chapter-stepper-bar">
        <div className="chapter-pills">
          <button
            type="button"
            onClick={() => setStep(0)}
            className={`chapter-pill ${step === 0 ? 'active' : ''}`}
          >
            1. Shared Harmony
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`chapter-pill ${step === 1 ? 'active' : ''}`}
          >
            2. Tune Rhythms
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { mode: 'partner' as const, id: 'chem-mode-partner', label: 'Partner' },
            { mode: 'cofounder' as const, id: 'chem-mode-cofounder', label: 'Co-Founder' },
            { mode: 'friend' as const, id: 'chem-mode-friend', label: 'Friend' },
          ].map((m) => (
            <button
              key={m.mode}
              id={m.id}
              type="button"
              onClick={() => onChangeChemMode(m.mode)}
              className={`aura-inline-text-btn ${chemMode === m.mode ? 'active-link' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: SHARED HARMONY & RADAR */}
      <div className={`portrait-chapter ${step === 0 ? 'active' : ''}`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '10px',
          }}
        >
          <div>
            <span className="typeform-eyebrow-step">
              {userName} &amp; {partnerName}
            </span>
            <h2 className="serif" style={{ fontSize: '28px', lineHeight: 1.15 }}>
              Overall Harmony
            </h2>
          </div>
          <div
            id="chem-score-val"
            className="serif"
            style={{ fontSize: '38px', color: 'var(--emerald)', lineHeight: 1 }}
          >
            {chemistry ? `${chemistry.overall_resonance_pct}%` : '88%'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Curiosity</div>
            <div id="chem-sub-prior" style={{ fontSize: '15px', fontWeight: 700, color: '#c4b5fd' }}>
              {chemistry ? `${chemistry.sub_metrics.cortical_prior_sync}%` : '92%'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Safety</div>
            <div id="chem-sub-safety" style={{ fontSize: '15px', fontWeight: 700, color: '#f472b6' }}>
              {chemistry ? `${chemistry.sub_metrics.allostatic_safety}%` : '86%'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Everyday Flow</div>
            <div id="chem-sub-exec" style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
              {chemistry ? `${chemistry.sub_metrics.deconfounded_execution_bridge}%` : '85%'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <canvas
            id="chemistry-radar"
            ref={radarCanvasRef}
            width={250}
            height={195}
            style={{ maxWidth: '100%' }}
          />
          <p
            id="chem-neuro-translation"
            style={{
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginTop: '6px',
            }}
          >
            {chemistry?.neuro_translation_note}
          </p>
        </div>
      </div>

      {/* STEP 2: TUNE PARTNER & RHYTHMS */}
      <div className={`portrait-chapter ${step === 1 ? 'active' : ''}`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <div className="name-input-wrap" style={{ marginBottom: 0, padding: '7px 12px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>With:</span>
            <input
              id="chem-partner-name"
              type="text"
              value={partnerName}
              onChange={(e) => onChangePartnerName(e.target.value)}
              style={{ fontSize: '13.5px', fontWeight: 600 }}
            />
          </div>
          <select
            id="chem-partner-mask"
            className="clean-select"
            value={partnerMaskId}
            onChange={(e) => onChangePartnerMask(e.target.value)}
          >
            {masks.map((m) => (
              <option key={m.id} value={m.id}>
                Rhythm: {m.calm_title || m.short_label}
              </option>
            ))}
          </select>
        </div>

        <div className="mask-pill-row" style={{ marginBottom: '12px' }}>
          {[
            { code: 'INFJ', label: 'Warm & Perceptive' },
            { code: 'ENFP', label: 'Spark Explorer' },
            { code: 'INTJ', label: 'Deep Architect' },
            { code: 'ENTP', label: 'Catalyst' },
            { code: 'ENFJ', label: 'Connector' },
          ].map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => onApplyPreset(preset.code)}
              className={`mask-pill ${
                PARTNER_PRESETS[preset.code]?.name === partnerName ? 'active' : ''
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
          <button
            id="chem-seg-user"
            type="button"
            onClick={() => onChangeSliderTarget('user')}
            className={`aura-inline-text-btn ${activeSliderTarget === 'user' ? 'active-link' : ''}`}
          >
            Adjust {userName}
          </button>
          <button
            id="chem-seg-partner"
            type="button"
            onClick={() => onChangeSliderTarget('partner')}
            className={`aura-inline-text-btn ${
              activeSliderTarget === 'partner' ? 'active-link' : ''
            }`}
          >
            Adjust {partnerName}
          </button>
        </div>

        <div
          id="chem-sliders-box"
          style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}
        >
          {(['O', 'C', 'E', 'A', 'N'] as DomainKey[]).map((k) => (
            <div key={k}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {CALM_DIMENSION_LABELS[k].name}
                </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {Math.round(activeScores[k])}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={Math.round(activeScores[k])}
                onChange={(e) => onSlideTrait(k, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="chapter-footer-nav">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="aura-inline-text-btn"
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          ← Back to Harmony
        </button>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          {step + 1} / 2
        </span>
        {step === 0 ? (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="aura-inline-text-btn"
            style={{ color: '#c4b5fd' }}
          >
            Tune Rhythms →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="aura-inline-text-btn"
            style={{ color: '#34d399' }}
          >
            View Harmony →
          </button>
        )}
      </div>
    </section>
  );
};
