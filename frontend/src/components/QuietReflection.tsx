import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LIKERT_OPTIONS } from '../data/scienceBundle';
import { ItemBankQuestion, StudioFlow, TelemetryState } from '../types/aura';
import { MIND_MOMENT_SLUGS, MindMoments } from './MindMoments';

export const QUESTION_SLUG_MAP: Record<number, string> = {
  1: 'q-01-deeper-patterns',
  2: 'q-02-subtle-shifts',
  3: 'q-03-focus-flow',
  4: 'q-04-tidy-space',
  5: 'q-05-two-conversations',
  6: 'q-06-group-momentum',
  7: 'q-07-feeling-heard',
  8: 'q-08-direct-truth',
  9: 'q-09-looking-ahead',
  10: 'q-10-sudden-change',
  11: 'q-11-quiet-effort',
  12: 'q-12-current-season',
  13: 'q-13-browser-tabs',
  14: 'q-14-text-warmth',
  15: 'q-15-canceled-plans',
};

export function getQuestionSlug(q: ItemBankQuestion): string {
  if (QUESTION_SLUG_MAP[q.id]) {
    return QUESTION_SLUG_MAP[q.id];
  }
  const cleanTheme = (q.calm_theme || 'reflection')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `q-${String(q.id).padStart(2, '0')}-${cleanTheme || 'item'}`;
}

export type FlowStepItem =
  | {
      kind: 'question';
      slug: string;
      question: ItemBankQuestion;
      questionIndex: number;
    }
  | {
      kind: 'moment';
      slug: string;
      momentIndex: 0 | 1 | 2;
    };

interface QuietReflectionProps {
  questions: ItemBankQuestion[];
  activeFlow: StudioFlow;
  responses: Record<number, number>;
  currentQIdx: number;
  currentStepSlug: string;
  reflectPart: 'questions' | 'moments';
  onSelectAnswer: (qId: number, val: number, nextQIdxOverride?: number) => void;
  onSetCurrentQIdx: (idx: number) => void;
  onNavigateStepSlug: (slug: string, pushHistory?: boolean) => void;
  onSwitchReflectPart: (part: 'questions' | 'moments') => void;
  onFinishToPortrait: (telemetry?: TelemetryState) => void;
}

export const QuietReflection: React.FC<QuietReflectionProps> = ({
  questions,
  activeFlow,
  responses,
  currentQIdx,
  currentStepSlug,
  reflectPart,
  onSelectAnswer,
  onSetCurrentQIdx,
  onNavigateStepSlug,
  onSwitchReflectPart,
  onFinishToPortrait,
}) => {
  const [momentsDirectSequence, setMomentsDirectSequence] = useState<boolean>(false);
  const autoAdvanceRef = useRef<number | null>(null);

  // Present all 15 questions (12 core + 3 everyday habit moments) seamlessly
  const flowQuestions = useMemo(() => {
    const byId = new Map<number, ItemBankQuestion>();
    questions.forEach((q) => byId.set(Number(q.id), q));

    let ids: number[] = [];
    if (activeFlow && Array.isArray(activeFlow.question_ids) && activeFlow.question_ids.length > 0) {
      ids = [...activeFlow.question_ids];
    } else {
      ids = questions.map((q) => q.id);
    }

    for (const bonusId of [13, 14, 15]) {
      if (!ids.includes(bonusId) && byId.has(bonusId)) {
        ids.push(bonusId);
      }
    }

    const resolved = ids
      .map((id) => byId.get(Number(id)))
      .filter((q): q is ItemBankQuestion => Boolean(q));

    return resolved.length > 0 ? resolved : questions.slice(0, 15);
  }, [questions, activeFlow]);

  // Unified end-to-end interwoven sequence:
  // Q1..Q4 -> Mind Moment 1 (Still Water) -> Q5..Q8 -> Mind Moment 2 (Night Sky) -> Q9..Q15 -> Mind Moment 3 (Inner Canvas)
  const interwovenSteps = useMemo<FlowStepItem[]>(() => {
    const steps: FlowStepItem[] = [];
    flowQuestions.forEach((q, qIdx) => {
      steps.push({
        kind: 'question',
        slug: getQuestionSlug(q),
        question: q,
        questionIndex: qIdx,
      });

      if (qIdx === 3) {
        steps.push({
          kind: 'moment',
          slug: MIND_MOMENT_SLUGS[0],
          momentIndex: 0,
        });
      }

      if (qIdx === 7) {
        steps.push({
          kind: 'moment',
          slug: MIND_MOMENT_SLUGS[1],
          momentIndex: 1,
        });
      }
    });

    steps.push({
      kind: 'moment',
      slug: MIND_MOMENT_SLUGS[2],
      momentIndex: 2,
    });

    return steps;
  }, [flowQuestions]);

  const activeStepIndex = useMemo(() => {
    if (reflectPart === 'moments') {
      const foundMoment = interwovenSteps.findIndex(
        (s) => s.kind === 'moment' && s.slug === currentStepSlug
      );
      if (foundMoment >= 0) return foundMoment;
      const firstMoment = interwovenSteps.findIndex((s) => s.kind === 'moment');
      return firstMoment >= 0 ? firstMoment : 0;
    }

    if (currentStepSlug) {
      const idxBySlug = interwovenSteps.findIndex((s) => s.slug === currentStepSlug);
      if (idxBySlug >= 0) return idxBySlug;
    }

    const safeQ = Math.max(0, Math.min(currentQIdx, flowQuestions.length - 1));
    const idxByQ = interwovenSteps.findIndex(
      (s) => s.kind === 'question' && s.questionIndex === safeQ
    );
    return idxByQ >= 0 ? idxByQ : 0;
  }, [reflectPart, currentStepSlug, interwovenSteps, currentQIdx, flowQuestions.length]);

  const activeStep = interwovenSteps[activeStepIndex] || interwovenSteps[0];
  const totalStepsCount = interwovenSteps.length;

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const goToStepIndex = useCallback(
    (nextStepIdx: number, pushHistory = true) => {
      if (nextStepIdx < 0) return;
      if (nextStepIdx >= interwovenSteps.length) {
        onFinishToPortrait();
        return;
      }
      const target = interwovenSteps[nextStepIdx];
      if (target.kind === 'question') {
        setMomentsDirectSequence(false);
        onSetCurrentQIdx(target.questionIndex);
        if (reflectPart !== 'questions') {
          onSwitchReflectPart('questions');
        }
        onNavigateStepSlug(target.slug, pushHistory);
      } else {
        if (reflectPart !== 'moments') {
          onSwitchReflectPart('moments');
        }
        onNavigateStepSlug(target.slug, pushHistory);
      }
    },
    [
      interwovenSteps,
      onFinishToPortrait,
      onNavigateStepSlug,
      onSetCurrentQIdx,
      onSwitchReflectPart,
      reflectPart,
    ]
  );

  const handleChoiceClick = useCallback(
    (qId: number, val: number) => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }

      onSelectAnswer(qId, val);

      autoAdvanceRef.current = window.setTimeout(() => {
        autoAdvanceRef.current = null;
        goToStepIndex(activeStepIndex + 1, true);
      }, 190);
    },
    [activeStepIndex, goToStepIndex, onSelectAnswer]
  );

  const handlePrev = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    if (activeStepIndex > 0) {
      goToStepIndex(activeStepIndex - 1, true);
    }
  }, [activeStepIndex, goToStepIndex]);

  const handleNext = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    if (activeStepIndex < totalStepsCount - 1) {
      goToStepIndex(activeStepIndex + 1, true);
    } else {
      onFinishToPortrait();
    }
  }, [activeStepIndex, goToStepIndex, onFinishToPortrait, totalStepsCount]);

  // Keyboard shortcuts: 1-5 to answer, ArrowUp/ArrowLeft vs ArrowDown/ArrowRight
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (activeStep.kind === 'question') {
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
          e.preventDefault();
          handleChoiceClick(activeStep.question.id, Number(e.key));
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrev();
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStep, handleChoiceClick, handleNext, handlePrev]);

  const progressPct = Math.min(
    100,
    Math.max(4, Math.round(((activeStepIndex + 1) / totalStepsCount) * 100))
  );

  const handleCompleteSingleMoment = useCallback(
    (momentIdx: 0 | 1 | 2, latestTel: TelemetryState) => {
      if (momentsDirectSequence) {
        if (momentIdx === 0) {
          onNavigateStepSlug(MIND_MOMENT_SLUGS[1], true);
          return;
        }
        if (momentIdx === 1) {
          onNavigateStepSlug(MIND_MOMENT_SLUGS[2], true);
          return;
        }
        onFinishToPortrait(latestTel);
        return;
      }

      if (activeStepIndex < totalStepsCount - 1) {
        goToStepIndex(activeStepIndex + 1, true);
      } else {
        onFinishToPortrait(latestTel);
      }
    },
    [
      activeStepIndex,
      goToStepIndex,
      momentsDirectSequence,
      onFinishToPortrait,
      onNavigateStepSlug,
      totalStepsCount,
    ]
  );

  const currentQuestion =
    activeStep.kind === 'question'
      ? activeStep.question
      : flowQuestions[Math.max(0, Math.min(currentQIdx, flowQuestions.length - 1))] ||
        flowQuestions[0];

  const curVal =
    currentQuestion && Object.prototype.hasOwnProperty.call(responses, currentQuestion.id)
      ? responses[currentQuestion.id]
      : undefined;

  return (
    <section id="view-test" className="view-section active typeform-stage-section">
      {/* 2px Continuous Top Viewport Progress Line */}
      <div className="typeform-top-progress-rail" aria-hidden="true">
        <div
          id="q-progress-fill"
          className="typeform-top-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Ultra-Minimal 44px Top Bar */}
      <div className="typeform-minimal-topbar">
        <div className="typeform-topbar-left">
          {activeStepIndex > 0 ? (
            <button
              id="btn-prev-q"
              type="button"
              onClick={handlePrev}
              className="typeform-topbar-back"
              aria-label="Previous step"
            >
              ← Back
            </button>
          ) : (
            <span className="typeform-topbar-brand">Aura</span>
          )}
        </div>

        <div className="typeform-topbar-right">
          <span id="q-counter" className="typeform-topbar-counter mono">
            {String(activeStepIndex + 1).padStart(2, '0')} /{' '}
            {String(totalStepsCount).padStart(2, '0')}
          </span>
          <button
            id="btn-next-q"
            type="button"
            onClick={() => onFinishToPortrait()}
            className="typeform-topbar-skip"
          >
            Portrait →
          </button>
        </div>
      </div>

      {/* ====================================================================
          ACTIVE STEP: WEIGHTLESS QUESTION SCREEN
         ==================================================================== */}
      {activeStep.kind === 'question' && currentQuestion && (
        <div id="reflect-part-questions" className="typeform-canvas-wrap">
          <div className="typeform-question-stage">
            <div id="q-aspect-badge" className="typeform-eyebrow-theme">
              {currentQuestion.calm_theme || 'Quiet Reflection'}
            </div>

            <h2 id="q-prompt-text" className="serif typeform-prompt-heading">
              {currentQuestion.text}
            </h2>

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
                    <span className="typeform-choice-left">
                      <span className="typeform-num">{opt.val}</span>
                      <span className="typeform-choice-label">{opt.label}</span>
                    </span>
                    {isSelected && <span className="typeform-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ACTIVE STEP: WEIGHTLESS MIND MOMENT INTERLUDE
         ==================================================================== */}
      {activeStep.kind === 'moment' && (
        <div id="reflect-part-moments" className="typeform-canvas-wrap">
          <div className="typeform-moment-stage">
            <MindMoments
              activeMomentIndex={activeStep.momentIndex}
              onSelectMomentIndex={(idx) => {
                onNavigateStepSlug(MIND_MOMENT_SLUGS[idx], true);
              }}
              onCompleteSingleMoment={handleCompleteSingleMoment}
              onAllComplete={(tel) => {
                onFinishToPortrait(tel);
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
