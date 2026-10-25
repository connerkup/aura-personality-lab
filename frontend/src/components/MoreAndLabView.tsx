import React from 'react';
import {
  ItemBankQuestion,
  ShadowCalibrationRow,
  StudioFlow,
} from '../types/aura';
import { ScienceStudio } from './ScienceStudio';

interface MoreAndLabViewProps {
  subTab: 'pricing' | 'lab';
  questions: ItemBankQuestion[];
  flows: StudioFlow[];
  activeFlowId: string;
  shadowMatrix: ShadowCalibrationRow[];
  onChangeSubTab: (sub: 'pricing' | 'lab') => void;
  onPreviewFullPortraitGuide: () => void;
  onRefreshStudioData: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const MoreAndLabView: React.FC<MoreAndLabViewProps> = ({
  subTab,
  questions,
  flows,
  activeFlowId,
  shadowMatrix,
  onChangeSubTab,
  onPreviewFullPortraitGuide,
  onRefreshStudioData,
  onShowToast,
}) => {
  return (
    <section id="view-pro" className="view-section active">
      <div className="seg-control" style={{ marginBottom: '14px' }}>
        <button
          id="pro-btn-pricing"
          type="button"
          onClick={() => onChangeSubTab('pricing')}
          className={`seg-btn ${subTab === 'pricing' ? 'active' : ''}`}
        >
          Portrait Guides &amp; Passes
        </button>
        <button
          id="pro-btn-lab"
          type="button"
          onClick={() => onChangeSubTab('lab')}
          className={`seg-btn ${subTab === 'lab' ? 'active' : ''}`}
        >
          Researcher View (Kae’s Lab)
        </button>
      </div>

      {subTab === 'pricing' && (
        <div id="pro-sub-pricing">
          <div className="glass-card" style={{ marginBottom: '12px' }}>
            <span className="soft-pill" style={{ marginBottom: '8px' }}>
              ✦ Go Deeper with Aura
            </span>
            <h2 className="serif" style={{ fontSize: '27px', marginBottom: '12px' }}>
              Guides for Individuals, Couples &amp; Teams
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                className="card-subtle"
                style={{ borderColor: 'rgba(167,139,250,0.35)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <strong style={{ fontSize: '14.5px' }}>
                    Full Portrait Guide (10 Nuances)
                  </strong>
                  <span
                    className="serif"
                    style={{ fontSize: '24px', color: 'var(--accent)' }}
                  >
                    $9
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    margin: '4px 0 10px',
                  }}
                >
                  Your complete 10-nuance portrait, how your energy shifts across settings, gentle
                  watch-outs, and a printable keepsake PDF.
                </p>
                <button
                  type="button"
                  onClick={onPreviewFullPortraitGuide}
                  className="btn-primary"
                  style={{ padding: '10px', fontSize: '12.5px' }}
                >
                  Preview Full Portrait Guide →
                </button>
              </div>

              <div className="card-subtle">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <strong style={{ fontSize: '14.5px' }}>
                    Together Pass (Couples &amp; Friends)
                  </strong>
                  <span
                    className="serif"
                    style={{ fontSize: '24px', color: 'var(--rose)' }}
                  >
                    $14
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                  }}
                >
                  Unlimited side-by-side portraits for partners, close friends, and co-founders—with
                  gentle notes on how your natural rhythms support each other.
                </p>
              </div>

              <div className="card-subtle">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <strong style={{ fontSize: '14.5px' }}>Studio &amp; Teams Sanctuary</strong>
                  <span
                    className="serif"
                    style={{ fontSize: '24px', color: 'var(--sky)' }}
                  >
                    $49
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/mo</span>
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                  }}
                >
                  Shared working-rhythm guides for thoughtful teams, counselors, and creative
                  studios.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'lab' && (
        <div id="pro-sub-lab">
          <ScienceStudio
            questions={questions}
            flows={flows}
            activeFlowId={activeFlowId}
            shadowMatrix={shadowMatrix}
            onRefreshStudioData={onRefreshStudioData}
            onShowToast={onShowToast}
          />
        </div>
      )}
    </section>
  );
};
