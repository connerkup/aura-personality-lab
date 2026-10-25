import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LIKERT_OPTIONS } from '../data/scienceBundle';
import { ItemBankQuestion, StudioFlow, TelemetryState } from '../types/aura';
import { MindMoments } from './MindMoments';

interface QuietReflectionProps {
  questions: ItemBankQuestion[];
  activeFlow: StudioFlow;
  responses: Record<number, number>;
  currentQIdx: number;
  reflectPart: 'questions' | 'moments';
  onSelectAnswer: (qId: number, val: number, nextQIdxOverride?: number) => void;
  onSetCurrentQIdx: (idx: number) => void;
  onSwitchReflectPart: (part: 'questions' | 'moments') => void;
  onFinishToPortrait: (telemetry?: TelemetryState) => void;
}

export const QuietReflection: React.FC<QuietReflectionProps> = ({
  questions,
  activeFlow,
  responses,
  currentQIdx,
  reflectPart,
  onSelectAnswer,
  onSetCurrentQIdx,
  onSwitchReflectPart,
  onFinishToPortrait,
}) => {
  const [includeSneakyBonus, setIncludeSneakyBonus] = useState<boolean>(false);
  const [branchNotice, setBranchNotice] = useState<string | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  // Determine the ordered list of questions to present
  const flowQuestions = useMemo(() => {
    const byId = new Map<number, ItemBankQuestion>();
    questions.forEach((q) => byId.set(Number(q.id), q));

    let ids: number[] = [];
    if (activeFlow && Array.isArray(activeFlow.question_ids) && activeFlow.question_ids.length > 0) {
      ids = [...activeFlow.question_ids];
    } else {
      ids = questions
        .filter((q) => q.calibration_status !== 'shadow_candidate' && q.weight > 0)
        .map((q) => q.id);
    }

    if (includeSneakyBonus) {
      for (const bonusId of [13, 14, 15]) {
        if (!ids.includes(bonusId) && byId.has(bonusId)) {
          ids.push(bonusId);
        }
      }
      // Also include any custom studio questions > 15
      questions.forEach((q) => {
        if (q.id > 15 && !ids.includes(q.id)) {
          ids.push(q.id);
        }
      });
    }

    const resolved = ids
      .map((id) => byId.get(Number(id)))
      .filter((q): q is ItemBankQuestion => Boolean(q));

    return resolved.length > 0 ? resolved : questions.slice(0, 12);
  }, [questions, activeFlow, includeSneakyBonus]);

  const safeIdx = Math.max(0, Math.min(currentQIdx, flowQuestions.length - 1));
  const currentQuestion = flowQuestions[safeIdx] || flowQuestions[0];
  const totalCount = flowQuestions.length;

  const answeredCount = useMemo(() => {
    return flowQuestions.filter(
      (q) => responses[q.id] !== undefined && responses[q.id] !== null
    ).length;
  }, [flowQuestions, responses]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const evaluateBranchRule = (questionId: number, answerVal: number): number | null => {
    if (!activeFlow || !Array.isArray(activeFlow.branches)) return null;
    for (const br of activeFlow.branches) {
      if (Number(br.if_question_id) !== Number(questionId)) continue;
      const hit =
        br.operator === '>='
          ? answerVal >= br.threshold
          : br.operator === '<='
          ? answerVal <= br.threshold
          : br.operator === '>'
          ? answerVal > br.threshold
          : br.operator === '<'
          ? answerVal < br.threshold
          : answerVal === br.threshold;
      if (hit) {
        const targetIdx = flowQuestions.findIndex(
          (fq) => Number(fq.id) === Number(br.then_goto_question_id)
        );
        if (targetIdx >= 0 && targetIdx !== safeIdx) {
          return targetIdx;
        }
      }
    }
    return null;
  };

  const handleChoiceClick = (qId: number, val: number) => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    const branchedIdx = evaluateBranchRule(qId, val);
    onSelectAnswer(qId, val, branchedIdx !== null ? branchedIdx : undefined);

    if (branchedIdx !== null) {
      const targetQ = flowQuestions[branchedIdx];
      setBranchNotice(
        `Adaptive flow branched to Question ${String(branchedIdx + 1).padStart(2, '0')} (${
          targetQ?.calm_theme || 'Everyday habit'
        })`
      );
    } else {
      setBranchNotice(null);
    }

    autoAdvanceRef.current = window.setTimeout(() => {
      autoAdvanceRef.current = null;
      if (branchedIdx !== null) {
        onSetCurrentQIdx(branchedIdx);
      } else if (safeIdx < totalCount - 1) {
        onSetCurrentQIdx(safeIdx + 1);
      } else {
        onFinishToPortrait();
      }
    }, 200);
  };

  const handlePrev = () => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setBranchNotice(null);
    if (safeIdx > 0) {
      onSetCurrentQIdx(safeIdx - 1);
    }
  };

  const handleNext = () => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setBranchNotice(null);
    if (safeIdx < totalCount - 1) {
      onSetCurrentQIdx(safeIdx + 1);
    } else {
      onFinishToPortrait();
    }
  };

  const curVal =
    currentQuestion &&
    Object.prototype.hasOwnProperty.call(responses, currentQuestion.id)
      ? responses[currentQuestion.id]
      : undefined;

  const isShadowHabitQuestion =
    currentQuestion?.calibration_status === 'shadow_candidate' ||
    currentQuestion?.layer === 'shadow_behavioral_probe';

  return (
    <section id="view-test" className="view-section active">
      {/* 2-Part Flow Switcher */}
      <div className="seg-control" style={{ marginBottom: '14px' }}>
        <button
          id="reflect-tab-questions"
          type="button"
          onClick={() => onSwitchReflectPart('questions')}
          className={`seg-btn ${reflectPart === 'questions' ? 'active' : ''}`}
        >
          1. Quiet Questions ({totalCount})
        </button>
        <button
          id="reflect-tab-moments"
          type="button"
          onClick={() => onSwitchReflectPart('moments')}
          className={`seg-btn ${reflectPart === 'moments' ? 'active' : ''}`}
        >
          2. Three Mind Moments (30s)
        </button>
      </div>

      {/* Part 1: Quiet Reflection Questions */}
      {reflectPart === 'questions' && currentQuestion && (
        <div id="reflect-part-questions">
          <div className="glass-card" style={{ marginBottom: '12px' }}>
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
              <span
                id="q-counter"
                style={{
                  fontSize: '11.5px',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                }}
              >
                QUESTION {String(safeIdx + 1).padStart(2, '0')} OF{' '}
                {String(totalCount).padStart(2, '0')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isShadowHabitQuestion && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--amber)',
                      background: 'var(--amber-soft)',
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontWeight: 600,
                    }}
                  >
                    ✦ Everyday Habit Moment
                  </span>
                )}
                <span
                  id="q-aspect-badge"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px 11px',
                    borderRadius: '999px',
                  }}
                >
                  {currentQuestion.calm_theme || 'Quiet Reflection'}
                </span>
              </div>
            </div>

            <div
              className="spectrum-track"
              style={{ height: '4px', marginBottom: '18px', overflow: 'hidden' }}
            >
              <div
                id="q-progress-fill"
                className="spectrum-fill"
                style={{
                  width: `${((safeIdx + 1) / totalCount) * 100}%`,
                  background: 'linear-gradient(90deg,#8b5cf6,#ec4899)',
                }}
              />
            </div>

            {branchNotice && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  marginBottom: '10px',
                }}
              >
                ↳ {branchNotice}
              </div>
            )}

            <div
              style={{
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <h2
                id="q-prompt-text"
                className="serif"
                style={{ fontSize: '24px', lineHeight: 1.28, fontWeight: 400 }}
              >
                {currentQuestion.text}
              </h2>
            </div>

            <div id="likert-choices" className="choice-stack">
              {LIKERT_OPTIONS.map((opt) => {
                const isSelected =
                  curVal !== undefined && curVal !== null && Number(curVal) === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChoiceClick(currentQuestion.id, opt.val)}
                    className={`choice-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{opt.label}</span>
                    <span className="choice-indicator">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                id="btn-prev-q"
                type="button"
                onClick={handlePrev}
                className="btn-ghost"
                style={{ visibility: safeIdx === 0 ? 'hidden' : 'visible' }}
              >
                ← Back
              </button>
              <div style={{ textAlign: 'center' }}>
                <span
                  id="live-emerging-code"
                  style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}
                >
                  {answeredCount >= totalCount
                    ? 'Reflection complete · Ready for your portrait'
                    : `${answeredCount} of ${totalCount} answered · Take your time`}
                </span>
              </div>
              <button
                id="btn-next-q"
                type="button"
                onClick={handleNext}
                className="btn-ghost"
                style={{ color: 'var(--text)', borderColor: 'rgba(255,255,255,0.18)' }}
              >
                {safeIdx === totalCount - 1 ? 'See My Portrait →' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Bonus Toggle for the 3 "Sneaky Everyday Habits" Questions (#13, #14, #15) */}
          <div
            className="card-subtle"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 15px',
              marginBottom: '10px',
              borderColor: includeSneakyBonus
                ? 'rgba(251, 191, 36, 0.38)'
                : 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: includeSneakyBonus ? 'var(--amber)' : 'var(--text)',
                }}
              >
                ✦ 3 Everyday Habit Moments (Browser Tabs, Texting &amp; Canceled Plans)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Lighthearted, real-life habits that help discover your natural pace without clinical
                labels.
              </div>
            </div>
            <button
              id="btn-toggle-sneaky-habits"
              type="button"
              onClick={() => {
                const nextVal = !includeSneakyBonus;
                setIncludeSneakyBonus(nextVal);
                if (nextVal && safeIdx === 11) {
                  onSetCurrentQIdx(12);
                }
              }}
              className="btn-ghost"
              style={{
                whiteSpace: 'nowrap',
                fontSize: '11.5px',
                color: includeSneakyBonus ? 'var(--amber)' : '#c4b5fd',
                borderColor: includeSneakyBonus
                  ? 'rgba(251, 191, 36, 0.45)'
                  : 'rgba(167, 139, 250, 0.3)',
              }}
            >
              {includeSneakyBonus ? '✓ Included (15)' : '+ Include 3 Habits'}
            </button>
          </div>

          {/* Card to switch to 3 Mind Moments */}
          <div
            className="card-subtle"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                Want to include your 3 Mind Moments?
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Three calm, 10-second interactive moments for reaction rhythm, pattern memory &amp;
                your mind’s eye.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSwitchReflectPart('moments')}
              className="btn-ghost"
              style={{
                whiteSpace: 'nowrap',
                color: '#c4b5fd',
                borderColor: 'rgba(167,139,250,0.3)',
              }}
            >
              Open Moments →
            </button>
          </div>
        </div>
      )}

      {/* Part 2: Three Interactive Mind Moments */}
      {reflectPart === 'moments' && (
        <div id="reflect-part-moments">
          <div className="glass-card" style={{ marginBottom: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="soft-pill" style={{ marginBottom: '6px' }}>
                  ✦ Three Gentle Mind Moments · 30 Seconds
                </span>
                <h2 className="serif" style={{ fontSize: '26px', lineHeight: 1.18 }}>
                  Experience how your attention &amp; inner imagery move
                </h2>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              These three quiet activities take just a few seconds each. They help your portrait
              honor your natural reaction pace, your visual pattern memory, and how your mind’s eye
              pictures ideas.
            </p>

            <MindMoments
              onAllComplete={(tel) => {
                onFinishToPortrait(tel);
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border)',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => onSwitchReflectPart('questions')}
                className="btn-ghost"
              >
                ← Back to Quiet Questions
              </button>
              <button
                type="button"
                onClick={() => onFinishToPortrait()}
                className="btn-primary"
                style={{ width: 'auto', padding: '11px 20px' }}
              >
                See My Quiet Portrait →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
