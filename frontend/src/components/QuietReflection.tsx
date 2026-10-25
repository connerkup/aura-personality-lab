import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LIKERT_OPTIONS } from '../data/scienceBundle';
import { ItemBankQuestion, StudioFlow, TelemetryState } from '../types/aura';
import { MIND_MOMENT_SLUGS, MindMoments, useTelemetryState } from './MindMoments';

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
      questionIndex: number; // 0-based index among flowQuestions
    }
  | {
      kind: 'moment';
      slug: string;
      momentIndex: 0 | 1 | 2;
      momentTitle: string;
      momentSubtitle: string;
    };

interface QuietReflectionProps {
  questions: ItemBankQuestion[];
  activeFlow: StudioFlow;
  responses: Record<number, number>;
  currentQIdx: number;
  currentStepSlug: string;
  reflectPart: 'questions' | 'moments';
  includeSneakyBonus: boolean;
  onToggleSneakyBonus: (next: boolean) => void;
  onSelectAnswer: (qId: number, val: number, nextQIdxOverride?: number) => void;
  onSetCurrentQIdx: (idx: number) => void;
  onNavigateStepSlug: (slug: string, pushHistory?: boolean) => void;
  onSwitchReflectPart: (part: 'questions' | 'moments') => void;
  onResetProgress: () => void;
  onFinishToPortrait: (telemetry?: TelemetryState) => void;
}

export const QuietReflection: React.FC<QuietReflectionProps> = ({
  questions,
  activeFlow,
  responses,
  currentQIdx,
  currentStepSlug,
  reflectPart,
  includeSneakyBonus,
  onToggleSneakyBonus,
  onSelectAnswer,
  onSetCurrentQIdx,
  onNavigateStepSlug,
  onSwitchReflectPart,
  onResetProgress,
  onFinishToPortrait,
}) => {
  const [branchNotice, setBranchNotice] = useState<string | null>(null);
  // Whether user is walking the natural interwoven flow ('interwoven') or clicked "Three Mind Moments" directly ('moments_direct')
  const [momentsDirectSequence, setMomentsDirectSequence] = useState<boolean>(false);
  const autoAdvanceRef = useRef<number | null>(null);
  const telemetry = useTelemetryState();

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

  // Build the unified end-to-end interwoven sequence:
  // Q1..Q4 -> Mind Moment 1 (Still Water) -> Q5..Q8 -> Mind Moment 2 (Night Sky) -> Q9..Q12 (or Q15) -> Mind Moment 3 (Inner Canvas)
  const interwovenSteps = useMemo<FlowStepItem[]>(() => {
    const steps: FlowStepItem[] = [];
    flowQuestions.forEach((q, qIdx) => {
      steps.push({
        kind: 'question',
        slug: getQuestionSlug(q),
        question: q,
        questionIndex: qIdx,
      });

      // After Question 4 (index 3), weave in Mind Moment 1: Still Water
      if (qIdx === 3) {
        steps.push({
          kind: 'moment',
          slug: MIND_MOMENT_SLUGS[0],
          momentIndex: 0,
          momentTitle: 'Moment 01 · Still Water',
          momentSubtitle: 'Attentional Steadiness Interlude',
        });
      }

      // After Question 8 (index 7), weave in Mind Moment 2: Night Sky
      if (qIdx === 7) {
        steps.push({
          kind: 'moment',
          slug: MIND_MOMENT_SLUGS[1],
          momentIndex: 1,
          momentTitle: 'Moment 02 · Night Sky',
          momentSubtitle: 'Pattern Memory Interlude',
        });
      }
    });

    // After the final question, weave in Mind Moment 3: Inner Canvas
    steps.push({
      kind: 'moment',
      slug: MIND_MOMENT_SLUGS[2],
      momentIndex: 2,
      momentTitle: 'Moment 03 · Inner Canvas',
      momentSubtitle: 'Mind’s Eye & Inner Stream Finale',
    });

    return steps;
  }, [flowQuestions]);

  // Resolve active step in interwovenSteps
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
  const totalQuestionsCount = flowQuestions.length;

  const answeredQuestionsCount = useMemo(() => {
    return flowQuestions.filter(
      (q) => responses[q.id] !== undefined && responses[q.id] !== null
    ).length;
  }, [flowQuestions, responses]);

  const completedMomentsCount = useMemo(() => {
    let c = 0;
    if (telemetry.pulse_reaction.completed) c += 1;
    if (telemetry.constellation_memory.completed) c += 1;
    if (telemetry.minds_eye.completed) c += 1;
    return c;
  }, [telemetry]);

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

  const evaluateBranchRule = useCallback(
    (questionId: number, answerVal: number): number | null => {
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
          const targetStepIdx = interwovenSteps.findIndex(
            (s) => s.kind === 'question' && Number(s.question.id) === Number(br.then_goto_question_id)
          );
          if (targetStepIdx >= 0 && targetStepIdx !== activeStepIndex) {
            return targetStepIdx;
          }
        }
      }
      return null;
    },
    [activeFlow, interwovenSteps, activeStepIndex]
  );

  const handleChoiceClick = useCallback(
    (qId: number, val: number) => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }

      const branchedStepIdx = evaluateBranchRule(qId, val);
      const branchedStep =
        branchedStepIdx !== null ? interwovenSteps[branchedStepIdx] : null;

      onSelectAnswer(qId, val);

      if (branchedStep && branchedStep.kind === 'question') {
        if (!includeSneakyBonus && branchedStep.question.id >= 13) {
          onToggleSneakyBonus(true);
        }
        setBranchNotice(
          `Adaptive flow queued Habit Question ${String(branchedStep.questionIndex + 1).padStart(
            2,
            '0'
          )} (${branchedStep.question.calm_theme || 'Everyday habit'}) into your reflection`
        );
      } else {
        setBranchNotice(null);
      }

      autoAdvanceRef.current = window.setTimeout(() => {
        autoAdvanceRef.current = null;
        goToStepIndex(activeStepIndex + 1, true);
      }, 210);
    },
    [
      activeStepIndex,
      evaluateBranchRule,
      goToStepIndex,
      includeSneakyBonus,
      interwovenSteps,
      onSelectAnswer,
      onToggleSneakyBonus,
    ]
  );

  const handlePrev = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setBranchNotice(null);
    if (activeStepIndex > 0) {
      goToStepIndex(activeStepIndex - 1, true);
    }
  }, [activeStepIndex, goToStepIndex]);

  const handleNext = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setBranchNotice(null);
    if (activeStepIndex < totalStepsCount - 1) {
      goToStepIndex(activeStepIndex + 1, true);
    } else {
      onFinishToPortrait();
    }
  }, [activeStepIndex, goToStepIndex, onFinishToPortrait, totalStepsCount]);

  // Typeform-style Keyboard Navigation (Keys 1-5 to answer, Up/Down/Left/Right/Enter to navigate)
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

  // Compute progress percentage across the entire interwoven flow
  const progressPct = Math.min(
    100,
    Math.max(4, Math.round(((activeStepIndex + 1) / totalStepsCount) * 100))
  );

  // Label for the next step after a Mind Moment
  const nextStepAfterMomentLabel = useMemo(() => {
    if (activeStep.kind !== 'moment') return undefined;
    if (momentsDirectSequence) {
      if (activeStep.momentIndex === 0) return 'Continue to Night Sky →';
      if (activeStep.momentIndex === 1) return 'Continue to Inner Canvas →';
      return 'Complete Mind Moments & See My Portrait →';
    }
    const nextStep = interwovenSteps[activeStepIndex + 1];
    if (!nextStep) {
      return 'Complete Mind Moments & See My Portrait →';
    }
    if (nextStep.kind === 'question') {
      return `Continue to Question ${String(nextStep.questionIndex + 1).padStart(2, '0')} →`;
    }
    return `Continue to ${nextStep.momentTitle} →`;
  }, [activeStep, activeStepIndex, interwovenSteps, momentsDirectSequence]);

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

      // In the end-to-end interwoven flow, advance to the next step in interwovenSteps!
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

  const safeQOrdinal =
    activeStep.kind === 'question'
      ? activeStep.questionIndex + 1
      : Math.max(1, Math.min(currentQIdx + 1, flowQuestions.length));

  const curVal =
    currentQuestion && Object.prototype.hasOwnProperty.call(responses, currentQuestion.id)
      ? responses[currentQuestion.id]
      : undefined;

  const isShadowHabitQuestion =
    currentQuestion?.calibration_status === 'shadow_candidate' ||
    currentQuestion?.layer === 'shadow_behavioral_probe';

  return (
    <section id="view-test" className="view-section active typeform-stage-section">
      {/* Razor-Thin Continuous Top Viewport Progress Bar */}
      <div className="typeform-top-progress-rail" aria-hidden="true">
        <div
          id="q-progress-fill"
          className="typeform-top-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Whisper-Quiet Top Journey Bar & Quick Jump Switcher */}
      <div className="typeform-journey-bar">
        <div className="seg-control typeform-seg-control">
          <button
            id="reflect-tab-questions"
            type="button"
            onClick={() => {
              setMomentsDirectSequence(false);
              onSwitchReflectPart('questions');
              const qStep = interwovenSteps.find(
                (s) =>
                  s.kind === 'question' &&
                  s.questionIndex === Math.max(0, Math.min(currentQIdx, flowQuestions.length - 1))
              );
              if (qStep) onNavigateStepSlug(qStep.slug, true);
            }}
            className={`seg-btn ${activeStep.kind === 'question' ? 'active' : ''}`}
          >
            Quiet Questions ({answeredQuestionsCount}/{totalQuestionsCount})
          </button>
          <button
            id="reflect-tab-moments"
            type="button"
            onClick={() => {
              setMomentsDirectSequence(true);
              onSwitchReflectPart('moments');
              if (activeStep.kind !== 'moment') {
                onNavigateStepSlug(MIND_MOMENT_SLUGS[0], true);
              }
            }}
            className={`seg-btn ${activeStep.kind === 'moment' ? 'active' : ''}`}
          >
            Three Mind Moments ({completedMomentsCount}/3)
          </button>
        </div>

        {/* Clickable End-to-End Flow Map Pills */}
        <div className="typeform-step-map" role="navigation" aria-label="Assessment Steps">
          {interwovenSteps.map((step, sIdx) => {
            const isCurrent = sIdx === activeStepIndex;
            const isDone =
              step.kind === 'question'
                ? responses[step.question.id] !== undefined
                : step.momentIndex === 0
                ? telemetry.pulse_reaction.completed
                : step.momentIndex === 1
                ? telemetry.constellation_memory.completed
                : telemetry.minds_eye.completed;

            const shortLabel =
              step.kind === 'question'
                ? String(step.questionIndex + 1).padStart(2, '0')
                : step.momentIndex === 0
                ? '✦ M1'
                : step.momentIndex === 1
                ? '✦ M2'
                : '✦ M3';

            return (
              <button
                key={step.slug}
                type="button"
                title={
                  step.kind === 'question'
                    ? `Question ${step.questionIndex + 1}: ${step.question.calm_theme} (?step=${step.slug})`
                    : `${step.momentTitle} (?step=${step.slug})`
                }
                onClick={() => {
                  setMomentsDirectSequence(false);
                  goToStepIndex(sIdx, true);
                }}
                className={`typeform-step-node ${step.kind === 'moment' ? 'is-moment' : ''} ${
                  isCurrent ? 'active' : ''
                } ${isDone ? 'done' : ''}`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          ACTIVE STEP: QUESTION STAGE (Open Borderless Typeform Canvas)
         ==================================================================== */}
      {activeStep.kind === 'question' && currentQuestion && (
        <div id="reflect-part-questions" className="typeform-canvas-wrap">
          <div className="typeform-question-stage">
            {/* Eyebrow Metadata + URL Slug Indicator */}
            <div className="typeform-eyebrow-row">
              <span id="q-counter" className="typeform-eyebrow-step">
                QUESTION {String(safeQOrdinal).padStart(2, '0')} OF{' '}
                {String(totalQuestionsCount).padStart(2, '0')}
              </span>
              <span className="typeform-eyebrow-sep">→</span>
              <span id="q-aspect-badge" className="typeform-eyebrow-theme">
                {currentQuestion.calm_theme || 'Quiet Reflection'}
              </span>
              {isShadowHabitQuestion && (
                <span className="typeform-habit-pill">✦ Everyday Habit Moment</span>
              )}
              <span id="step-url-slug-badge" className="typeform-slug-pill mono">
                ?step={activeStep.slug}
              </span>
            </div>

            {branchNotice && <div className="typeform-branch-banner">↳ {branchNotice}</div>}

            {/* Large Open Editorial Serif Prompt */}
            <h2 id="q-prompt-text" className="serif typeform-prompt-heading">
              {currentQuestion.text}
            </h2>

            {/* Typeform Keycap Choice Rows */}
            <div id="likert-choices" className="choice-stack typeform-choice-stack">
              {LIKERT_OPTIONS.map((opt) => {
                const isSelected =
                  curVal !== undefined && curVal !== null && Number(curVal) === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChoiceClick(currentQuestion.id, opt.val)}
                    className={`choice-btn typeform-choice-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="typeform-choice-left">
                      <kbd className="typeform-keycap">{opt.val}</kbd>
                      <span className="typeform-choice-label">{opt.label}</span>
                    </span>
                    <span className="choice-indicator">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>

            {/* Upcoming Mind Moment Interlude Hint on Q4 & Q8 */}
            {(safeQOrdinal === 4 || safeQOrdinal === 8) && (
              <div className="typeform-upcoming-interlude-hint">
                ✦ Next up after this question:{' '}
                <strong>
                  {safeQOrdinal === 4
                    ? 'Mind Moment 01 · Still Water (8s palate cleanser)'
                    : 'Mind Moment 02 · Night Sky Constellation (8s palate cleanser)'}
                </strong>
              </div>
            )}

            {/* Minimal Typeform Utility Footer */}
            <div className="typeform-footer-bar">
              <div className="typeform-nav-arrows">
                <button
                  id="btn-prev-q"
                  type="button"
                  onClick={handlePrev}
                  className="btn-ghost typeform-arrow-btn"
                  style={{ visibility: activeStepIndex === 0 ? 'hidden' : 'visible' }}
                >
                  ↑ Back
                </button>
                <button
                  id="btn-next-q"
                  type="button"
                  onClick={handleNext}
                  className="btn-ghost typeform-arrow-btn"
                >
                  {activeStepIndex === totalStepsCount - 1 ? 'See My Portrait →' : 'Next ↓'}
                </button>
              </div>

              <div className="typeform-footer-meta">
                <span id="live-emerging-code" className="typeform-kbd-hint">
                  {answeredQuestionsCount >= totalQuestionsCount
                    ? 'All questions answered · Ready for your portrait'
                    : `Press 1–5 or tap to answer · ${answeredQuestionsCount}/${totalQuestionsCount} answered`}
                </span>
                {(answeredQuestionsCount > 0 || completedMomentsCount > 0) && (
                  <button
                    id="btn-reset-reflection"
                    type="button"
                    onClick={onResetProgress}
                    className="typeform-reset-link"
                  >
                    Start Fresh ↺
                  </button>
                )}
              </div>
            </div>

            {/* Subtle Inline Controls for 3 Everyday Habits & Direct Mind Moments */}
            <div className="typeform-subtle-extras">
              <button
                id="btn-toggle-sneaky-habits"
                type="button"
                onClick={() => {
                  const nextVal = !includeSneakyBonus;
                  onToggleSneakyBonus(nextVal);
                }}
                className="typeform-extra-link"
              >
                {includeSneakyBonus
                  ? '✓ 3 Everyday Habit Moments Included (15 Qs)'
                  : '+ Include 3 Everyday Habit Moments (Browser Tabs, Texting & Plans)'}
              </button>
              <span className="typeform-extra-dot">·</span>
              <button
                type="button"
                onClick={() => onFinishToPortrait()}
                className="typeform-extra-link"
              >
                Jump to My Portrait →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ACTIVE STEP: MIND MOMENT INTERLUDE (Borderless Full-Screen Canvas)
         ==================================================================== */}
      {activeStep.kind === 'moment' && (
        <div id="reflect-part-moments" className="typeform-canvas-wrap">
          <div className="typeform-moment-stage">
            <div className="typeform-eyebrow-row" style={{ marginBottom: '12px' }}>
              <span className="typeform-eyebrow-step">
                STEP {String(activeStepIndex + 1).padStart(2, '0')} OF{' '}
                {String(totalStepsCount).padStart(2, '0')}
              </span>
              <span className="typeform-eyebrow-sep">→</span>
              <span className="typeform-eyebrow-theme">{activeStep.momentSubtitle}</span>
              <span id="step-url-slug-badge" className="typeform-slug-pill mono">
                ?step={activeStep.slug}
              </span>
            </div>

            <MindMoments
              activeMomentIndex={activeStep.momentIndex}
              nextStepLabel={nextStepAfterMomentLabel}
              onSelectMomentIndex={(idx) => {
                onNavigateStepSlug(MIND_MOMENT_SLUGS[idx], true);
              }}
              onCompleteSingleMoment={handleCompleteSingleMoment}
              onAllComplete={(tel) => {
                onFinishToPortrait(tel);
              }}
            />

            <div className="typeform-footer-bar" style={{ marginTop: '18px' }}>
              <button
                type="button"
                onClick={handlePrev}
                className="btn-ghost typeform-arrow-btn"
              >
                ← Previous Step
              </button>
              <button
                type="button"
                onClick={() => onFinishToPortrait()}
                className="btn-ghost typeform-arrow-btn"
                style={{ color: '#c4b5fd', borderColor: 'rgba(167, 139, 250, 0.35)' }}
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
