import React from 'react';

interface MoreAndLabViewProps {
  onPreviewFullPortraitGuide: () => void;
  onOpenTogetherView?: () => void;
  onShowToast?: (msg: string) => void;
}

export const MoreAndLabView: React.FC<MoreAndLabViewProps> = ({
  onPreviewFullPortraitGuide,
  onOpenTogetherView,
  onShowToast,
}) => {
  return (
    <section id="view-pro" className="view-section active">
      <div id="pro-sub-pricing" className="guides-open-stage">
        <div style={{ marginBottom: '26px' }}>
          <span className="soft-pill" style={{ marginBottom: '10px' }}>
            ✦ Deep Portrait Guides &amp; Passes
          </span>
          <h2 className="serif" style={{ fontSize: '34px', lineHeight: 1.15, marginBottom: '8px' }}>
            Thoughtful Guides for Individuals, Partners &amp; Quiet Seasons
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '580px' }}>
            Every Aura guide is written in warm, everyday language—honoring how your attention,
            sensory rhythm, and energy move across different settings.
          </p>
        </div>

        <div className="guides-stack">
          {/* Guide 1: Personal Blueprint Guide */}
          <div className="guide-row-section">
            <div className="guide-row-header">
              <div>
                <span className="guide-eyebrow" style={{ color: 'var(--accent)' }}>
                  01 · PERSONAL BLUEPRINT GUIDE
                </span>
                <h3 className="serif guide-row-title">
                  Full Portrait Guide (All 10 Nuances)
                </h3>
              </div>
              <span className="serif guide-price" style={{ color: 'var(--accent)' }}>
                $9
              </span>
            </div>
            <p className="guide-row-desc">
              Your complete 10-nuance portrait, how your energy shifts between routine errands and
              deep curiosity, gentle watch-outs for quiet effort, and a printable keepsake edition.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button
                type="button"
                onClick={onPreviewFullPortraitGuide}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}
              >
                Preview Full Portrait Guide →
              </button>
            </div>
          </div>

          {/* Guide 2: Side-by-Side Couples & Friends Guide */}
          <div className="guide-row-section">
            <div className="guide-row-header">
              <div>
                <span className="guide-eyebrow" style={{ color: 'var(--rose)' }}>
                  02 · SIDE-BY-SIDE COUPLES &amp; FRIENDS GUIDE
                </span>
                <h3 className="serif guide-row-title">
                  Together Pass (Partners, Close Friends &amp; Co-Founders)
                </h3>
              </div>
              <span className="serif guide-price" style={{ color: 'var(--rose)' }}>
                $14
              </span>
            </div>
            <p className="guide-row-desc">
              Unlimited side-by-side rhythm comparisons—with gentle translations for how different
              nervous systems communicate, recharge, and protect shared emotional safety.
            </p>
            {onOpenTogetherView && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={onOpenTogetherView}
                  className="btn-ghost"
                  style={{ color: '#f472b6', borderColor: 'rgba(244, 114, 182, 0.35)' }}
                >
                  Explore Side-by-Side Harmony →
                </button>
              </div>
            )}
          </div>

          {/* Guide 3: Quiet Energy & Season Guide */}
          <div className="guide-row-section">
            <div className="guide-row-header">
              <div>
                <span className="guide-eyebrow" style={{ color: 'var(--sky)' }}>
                  03 · QUIET ENERGY &amp; SEASON GUIDE
                </span>
                <h3 className="serif guide-row-title">
                  Restorative Pacing &amp; Sensory Sanctuary Guide
                </h3>
              </div>
              <span className="serif guide-price" style={{ color: 'var(--sky)' }}>
                $19
              </span>
            </div>
            <p className="guide-row-desc">
              A personalized field guide for navigating heavy or high-transition seasons without
              burnout—tailored to your mind’s eye vividness, attentional rhythm, and sensory pace.
            </p>
            {onShowToast && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast('Included in your Full Portrait preview on the Portrait tab')
                  }
                  className="btn-ghost"
                  style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.32)' }}
                >
                  Preview Season Notes →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subtle Footer Link to Standalone Kae & Conner Science Studio */}
        <footer className="guides-studio-footer">
          <a
            id="link-standalone-studio"
            href="/studio"
            className="guides-studio-link"
          >
            Researcher Collaborator? Open Kae &amp; Conner Studio (/studio) ↗
          </a>
        </footer>
      </div>
    </section>
  );
};
