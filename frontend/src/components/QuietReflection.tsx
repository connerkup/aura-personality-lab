import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ADAPTIVE_POOL_120,
  DEFAULT_USER_CONTEXT,
  EXACT_15_SLUGS,
  buildDynamicAdaptivePath,
  findQuestionBySlugOrId,
  getAdaptiveQuestionSlug,
  morphQuestionForContext,
  selectNextAdaptiveQuestionClient,
} from '../data/adaptivePool120';
import { LIKERT_OPTIONS } from '../data/scienceBundle';
import {
  ItemBankQuestion,
  StudioFlow,
  TelemetryState,
  UserContextProfile,
} from '../types/aura';
import { AURA_PALETTES } from './AuraWebGLCanvas';
import {
  AuraMicroGamesBridge,
  MIND_MOMENT_SLUGS,
  MindMoments,
} from './MindMoments';

export const QUESTION_SLUG_MAP: Record<number, string> = {
  ...EXACT_15_SLUGS,
};

export function getQuestionSlug(q: ItemBankQuestion): string {
  return getAdaptiveQuestionSlug(q);
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
  dynamicQuestionIds?: number[];
  onChangeDynamicQuestionIds?: (nextIds: number[]) => void;
  userContext?: UserContextProfile;
  currentQIdx: number;
  currentStepSlug: string;
  reflectPart: 'questions' | 'moments';
  activePaletteIndex: number;
  onSelectPalette: (paletteIndex: number) => void;
  onToggleAtmospherePopover?: () => void;
  onSelectAnswer: (qId: number, val: number, nextQIdxOverride?: number) => void;
  onSetCurrentQIdx: (idx: number) => void;
  onNavigateStepSlug: (slug: string, pushHistory?: boolean) => void;
  onSwitchReflectPart: (part: 'questions' | 'moments') => void;
  onFinishToPortrait: (telemetry?: TelemetryState) => void;
}

export const QuietReflection: React.FC<QuietReflectionProps> = ({
  questions,
  responses,
  dynamicQuestionIds,
  onChangeDynamicQuestionIds,
  userContext = DEFAULT_USER_CONTEXT,
  currentQIdx,
  currentStepSlug,
  reflectPart,
  activePaletteIndex,
  onSelectPalette,
  onToggleAtmospherePopover,
  onSelectAnswer,
  onSetCurrentQIdx,
  onNavigateStepSlug,
  onSwitchReflectPart,
  onFinishToPortrait,
}) => {
  const [momentsDirectSequence, setMomentsDirectSequence] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const autoAdvanceRef = useRef<number | null>(null);

  const effectivePool = useMemo(() => {
    return questions && questions.length >= 20 ? questions : ADAPTIVE_POOL_120;
  }, [questions]);

  const [internalDynamicIds, setInternalDynamicIds] = useState<number[]>(() =>
    dynamicQuestionIds && dynamicQuestionIds.length > 0 ? dynamicQuestionIds : [1]
  );

  const committedIds =
    dynamicQuestionIds && dynamicQuestionIds.length > 0
      ? dynamicQuestionIds
      : internalDynamicIds;

  const updateCommittedIds = useCallback(
    (nextIds: number[]) => {
      setInternalDynamicIds(nextIds);
      if (onChangeDynamicQuestionIds) {
        onChangeDynamicQuestionIds(nextIds);
      }
    },
    [onChangeDynamicQuestionIds]
  );

  // Build the 15-question adaptive path from committedIds + real-time CAT lookahead
  const flowQuestions = useMemo(() => {
    const byId = new Map<number, ItemBankQuestion>();
    effectivePool.forEach((q) => byId.set(Number(q.id), q));

    const currentTel = AuraMicroGamesBridge.getState();
    const full15Ids = buildDynamicAdaptivePath({
      pool: effectivePool,
      committedIds,
      responses,
      telemetry: currentTel,
      targetLength: 15,
    });

    // Ensure if currentStepSlug explicitly refers to any question in the 120-item pool, it is present
    if (currentStepSlug && currentStepSlug.startsWith('q-')) {
      const targetQ = findQuestionBySlugOrId(effectivePool, currentStepSlug);
      if (targetQ && !full15Ids.includes(targetQ.id)) {
        const replaceIdx = Math.max(0, Math.min(currentQIdx, 14));
        full15Ids[replaceIdx] = targetQ.id;
      }
    }

    const resolved = full15Ids
      .map((id) => byId.get(Number(id)))
      .filter((q): q is ItemBankQuestion => Boolean(q));

    return resolved.length > 0 ? resolved : effectivePool.slice(0, 15);
  }, [effectivePool, committedIds, responses, currentStepSlug, currentQIdx]);

  // Unified end-to-end interwoven sequence (18 steps total):
  // Q1..Q4 (dynamic) -> Mind Moment 1 (Still Water, Step 05/18) ->
  // Q5..Q8 (dynamic) -> Mind Moment 2 (Night Sky, Step 10/18) ->
  // Q9..Q15 (dynamic) -> Mind Moment 3 (Inner Canvas, Step 18/18)
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

  // Harmonize palette automatically when entering a Mind Moment
  useEffect(() => {
    if (activeStep?.kind === 'moment') {
      if (activeStep.momentIndex === 0) {
        onSelectPalette(3); // Forest Breath for Still Water
      } else if (activeStep.momentIndex === 1) {
        onSelectPalette(4); // Cosmic Stillness for Night Sky
      } else if (activeStep.momentIndex === 2) {
        onSelectPalette(2); // Golden Hour for Inner Canvas
      }
    }
  }, [activeStep?.kind, activeStep?.kind === 'moment' ? activeStep.momentIndex : -1, onSelectPalette]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const goToStepIndex = useCallback(
    (nextStepIdx: number, pushHistory = true, overrideInterwoven?: FlowStepItem[]) => {
      const stepsList = overrideInterwoven || interwovenSteps;
      if (nextStepIdx < 0) return;
      if (nextStepIdx >= stepsList.length) {
        onFinishToPortrait();
        return;
      }
      const target = stepsList[nextStepIdx];
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

      // Smoothly drift within the active luminance family so contrast stays 100% rock-solid during fast auto-advance
      const currentPal = AURA_PALETTES[activePaletteIndex] || AURA_PALETTES[0];
      const samePolarityIndices = currentPal.isDark ? [1, 4] : [0, 2, 3];
      const nextPaletteIdx =
        samePolarityIndices[(qId + val) % samePolarityIndices.length];
      onSelectPalette(nextPaletteIdx);

      // Compute the dynamically branched next question based on this answer!
      const nextResponses = { ...responses, [qId]: val };
      const qStepIdx =
        activeStep.kind === 'question' ? activeStep.questionIndex : currentQIdx;

      // Truncate dynamicQuestionIds up to current question step (in case user pressed <- Back and changed an answer)
      const prefixIds = flowQuestions
        .slice(0, qStepIdx + 1)
        .map((q, idx) => (idx === qStepIdx ? qId : q.id));

      let nextCommitted = [...prefixIds];
      if (nextCommitted.length < 15) {
        const sel = selectNextAdaptiveQuestionClient({
          pool: effectivePool,
          answeredIds: nextCommitted,
          responses: nextResponses,
          telemetry: AuraMicroGamesBridge.getState(),
        });
        if (sel.nextItem && !nextCommitted.includes(sel.nextItem.id)) {
          nextCommitted.push(sel.nextItem.id);
        }
      }
      updateCommittedIds(nextCommitted);
      onSelectAnswer(qId, val);
      setIsFadingOut(true);

      // Build updated step target so auto-advance lands on the newly selected adaptive question slug (or Mind Moment)
      const nextStepIdx = activeStepIndex + 1;
      const isNextStepMoment =
        (qStepIdx === 3 && nextStepIdx === 4) ||
        (qStepIdx === 7 && nextStepIdx === 9) ||
        qStepIdx === 14;

      const nextSelectedQuestionId = nextCommitted[qStepIdx + 1];
      const nextSelectedQuestion = nextSelectedQuestionId
        ? effectivePool.find((q) => q.id === nextSelectedQuestionId)
        : undefined;

      autoAdvanceRef.current = window.setTimeout(() => {
        autoAdvanceRef.current = null;
        setIsFadingOut(false);
        if (isNextStepMoment) {
          goToStepIndex(nextStepIdx, true);
        } else if (nextSelectedQuestion) {
          setMomentsDirectSequence(false);
          onSetCurrentQIdx(qStepIdx + 1);
          if (reflectPart !== 'questions') {
            onSwitchReflectPart('questions');
          }
          onNavigateStepSlug(getQuestionSlug(nextSelectedQuestion), true);
        } else {
          goToStepIndex(nextStepIdx, true);
        }
      }, 210);
    },
    [
      activeStep,
      activeStepIndex,
      currentQIdx,
      effectivePool,
      flowQuestions,
      goToStepIndex,
      onNavigateStepSlug,
      onSelectAnswer,
      onSelectPalette,
      onSetCurrentQIdx,
      onSwitchReflectPart,
      reflectPart,
      responses,
      updateCommittedIds,
    ]
  );

  const handlePrev = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setIsFadingOut(false);
    if (activeStepIndex > 0) {
      goToStepIndex(activeStepIndex - 1, true);
    }
  }, [activeStepIndex, goToStepIndex]);

  const handleNext = useCallback(() => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setIsFadingOut(false);
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

      // Re-select the next question after Still Water (qIdx 4) or Night Sky (qIdx 8) using the fresh Mind Moment telemetry!
      if (momentIdx === 0 || momentIdx === 1) {
        const answeredCountBeforeMoment = momentIdx === 0 ? 4 : 8;
        const prefixIds = flowQuestions
          .slice(0, answeredCountBeforeMoment)
          .map((q) => q.id);
        const sel = selectNextAdaptiveQuestionClient({
          pool: effectivePool,
          answeredIds: prefixIds,
          responses,
          telemetry: latestTel,
        });
        if (sel.nextItem) {
          const updatedIds = [...prefixIds, sel.nextItem.id];
          updateCommittedIds(updatedIds);
          setMomentsDirectSequence(false);
          onSetCurrentQIdx(answeredCountBeforeMoment);
          onSwitchReflectPart('questions');
          onNavigateStepSlug(getQuestionSlug(sel.nextItem), true);
          return;
        }
      }

      if (activeStepIndex < totalStepsCount - 1) {
        goToStepIndex(activeStepIndex + 1, true);
      } else {
        onFinishToPortrait(latestTel);
      }
    },
    [
      activeStepIndex,
      effectivePool,
      flowQuestions,
      goToStepIndex,
      momentsDirectSequence,
      onFinishToPortrait,
      onNavigateStepSlug,
      onSetCurrentQIdx,
      onSwitchReflectPart,
      responses,
      totalStepsCount,
      updateCommittedIds,
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

  const activePalette =
    AURA_PALETTES[activePaletteIndex] || AURA_PALETTES[0];

  // Apply LLM Contextual Morphing & DIF De-Biasing to current question & Likert choices
  const morphed = useMemo(() => {
    if (!currentQuestion) {
      return {
        morphedText: '',
        morphedTheme: 'Quiet Reflection',
        difNote: '',
        likertLabels: LIKERT_OPTIONS,
        isMorphed: false,
        contextBadge: 'EN',
      };
    }
    return morphQuestionForContext(currentQuestion, userContext);
  }, [currentQuestion, userContext]);

  const isBranchedItem =
    currentQuestion &&
    (currentQuestion.node_tier === 'branch_probe' ||
      currentQuestion.node_tier === 'deep_resolution' ||
      currentQuestion.node_tier === 'everyday_moment' ||
      currentQuestion.id > 12);

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

      {/* Ultra-Minimal 32px Top Micro-Bar */}
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
            <span className="typeform-topbar-brand serif">aura</span>
          )}
        </div>

        {/* Center Live Aura Resonance & Context Lens Pill (Tappable to open Atmosphere & Context Controls) */}
        <button
          id="aura-mood-pill"
          type="button"
          onClick={() => {
            if (onToggleAtmospherePopover) {
              onToggleAtmospherePopover();
            } else {
              onSelectPalette((activePaletteIndex + 1) % AURA_PALETTES.length);
            }
          }}
          className="aura-resonance-micro-pill"
          title="Tap to tune Aura atmosphere & life context lens"
        >
          <span className="aura-swatch-cluster">
            {activePalette.colors.slice(1, 4).map((hex, i) => (
              <span
                key={i}
                className="aura-micro-swatch"
                style={{ backgroundColor: hex }}
              />
            ))}
          </span>
          <span id="current-mood-badge">{activePalette.name}</span>
          {morphed.isMorphed && (
            <span
              className="mono"
              style={{
                fontSize: '9.5px',
                opacity: 0.82,
                paddingLeft: '4px',
                borderLeft: '1px solid var(--glass-border)',
              }}
            >
              {userContext.language.toUpperCase()}
            </span>
          )}
        </button>

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
          <div
            className={`typeform-question-stage quiz-content-transition ${
              isFadingOut ? 'quiz-fade-out' : ''
            }`}
          >
            <div
              id="q-aspect-badge"
              className="typeform-eyebrow-theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span>{morphed.morphedTheme || 'Quiet Reflection'}</span>
              <span
                id="q-adaptive-tree-pill"
                style={{
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  fontSize: '10.5px',
                  fontWeight: 600,
                }}
              >
                {isBranchedItem
                  ? '· ✦ Branched to you'
                  : `· Adaptive (${effectivePool.length})`}
              </span>
            </div>

            <h2 id="q-prompt-text" className="serif typeform-prompt-heading">
              {morphed.morphedText}
            </h2>

            <div id="likert-choices" className="choice-stack">
              {morphed.likertLabels.map((opt) => {
                const isSelected =
                  curVal !== undefined && curVal !== null && Number(curVal) === opt.val;
                const optionPalette =
                  AURA_PALETTES[
                    (currentQuestion.id + opt.val - 2) % AURA_PALETTES.length
                  ];
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChoiceClick(currentQuestion.id, opt.val)}
                    className={`choice-btn glass-option ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="typeform-choice-left">
                      <span className="typeform-num">{opt.val}</span>
                      <span className="typeform-choice-label">{opt.label}</span>
                    </span>
                    <span className="choice-resonance-indicator">
                      <span
                        className="choice-resonance-dot"
                        style={{ backgroundColor: optionPalette.colors[1] }}
                      />
                      {isSelected && <span className="typeform-check">✓</span>}
                    </span>
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
