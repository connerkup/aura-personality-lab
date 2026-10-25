import React, { useEffect, useRef } from 'react';
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
  }, [chemistry]);

  const masks = AURA_SCIENCE_BUNDLE.masks_schema.masks;
  const activeScores = activeSliderTarget === 'user' ? userRawScores : partnerScores;

  return (
    <section id="view-chemistry" className="view-section active">
      <div className="glass-card" style={{ marginBottom: '14px' }}>
        <div
          className="seg-control"
          style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '12px' }}
        >
          <button
            id="chem-mode-partner"
            type="button"
            onClick={() => onChangeChemMode('partner')}
            className={`seg-btn ${chemMode === 'partner' ? 'active' : ''}`}
          >
            Romantic Partner
          </button>
          <button
            id="chem-mode-cofounder"
            type="button"
            onClick={() => onChangeChemMode('cofounder')}
            className={`seg-btn ${chemMode === 'cofounder' ? 'active' : ''}`}
          >
            Co-Founder
          </button>
          <button
            id="chem-mode-friend"
            type="button"
            onClick={() => onChangeChemMode('friend')}
            className={`seg-btn ${chemMode === 'friend' ? 'active' : ''}`}
          >
            Close Friend
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <div className="name-input-wrap" style={{ marginBottom: 0, padding: '8px 12px' }}>
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

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[
            { code: 'INFJ', label: 'Warm & Perceptive' },
            { code: 'ENFP', label: 'Spark-Driven Explorer' },
            { code: 'INTJ', label: 'Deep-Current Architect' },
            { code: 'ENTP', label: 'Curious Catalyst' },
            { code: 'ENFJ', label: 'Steady Connector' },
          ].map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => onApplyPreset(preset.code)}
              className="btn-ghost"
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                borderColor:
                  PARTNER_PRESETS[preset.code]?.name === partnerName
                    ? 'rgba(167,139,250,0.45)'
                    : undefined,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
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
              How Your Rhythms Meet
            </span>
            <h2 className="serif" style={{ fontSize: '26px', lineHeight: 1.15 }}>
              Overall Harmony
            </h2>
          </div>
          <div
            id="chem-score-val"
            className="serif"
            style={{ fontSize: '40px', color: 'var(--emerald)', lineHeight: 1 }}
          >
            {chemistry ? `${chemistry.overall_resonance_pct}%` : '88%'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div className="card-subtle" style={{ padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Shared Curiosity</div>
            <div
              id="chem-sub-prior"
              style={{ fontSize: '16px', fontWeight: 700, color: '#c4b5fd', marginTop: '2px' }}
            >
              {chemistry ? `${chemistry.sub_metrics.cortical_prior_sync}%` : '92%'}
            </div>
          </div>
          <div className="card-subtle" style={{ padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Emotional Safety</div>
            <div
              id="chem-sub-safety"
              style={{ fontSize: '16px', fontWeight: 700, color: '#f472b6', marginTop: '2px' }}
            >
              {chemistry ? `${chemistry.sub_metrics.allostatic_safety}%` : '86%'}
            </div>
          </div>
          <div className="card-subtle" style={{ padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Everyday Flow</div>
            <div
              id="chem-sub-exec"
              style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}
            >
              {chemistry ? `${chemistry.sub_metrics.deconfounded_execution_bridge}%` : '85%'}
            </div>
          </div>
        </div>
      </div>

      <div className="desktop-grid">
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <canvas
            id="chemistry-radar"
            ref={radarCanvasRef}
            width={290}
            height={240}
            style={{ maxWidth: '100%' }}
          />
          <div className="card-subtle" style={{ width: '100%', marginTop: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--amber)',
                marginBottom: '4px',
              }}
            >
              ✦ Understanding Each Other’s Pace
            </div>
            <p
              id="chem-neuro-translation"
              style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.52 }}
            >
              {chemistry?.neuro_translation_note}
            </p>
          </div>
        </div>

        <div className="glass-card">
          <div className="seg-control" style={{ marginBottom: '12px' }}>
            <button
              id="chem-seg-user"
              type="button"
              onClick={() => onChangeSliderTarget('user')}
              className={`seg-btn ${activeSliderTarget === 'user' ? 'active' : ''}`}
            >
              Adjust {userName}
            </button>
            <button
              id="chem-seg-partner"
              type="button"
              onClick={() => onChangeSliderTarget('partner')}
              className={`seg-btn ${activeSliderTarget === 'partner' ? 'active' : ''}`}
            >
              Adjust {partnerName}
            </button>
          </div>
          <div
            id="chem-sliders-box"
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {(['O', 'C', 'E', 'A', 'N'] as DomainKey[]).map((k) => (
              <div key={k}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '4px',
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
      </div>
    </section>
  );
};
