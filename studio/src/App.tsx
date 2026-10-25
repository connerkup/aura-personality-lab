import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADAPTIVE_POOL_120,
  AGE_BAND_OPTIONS,
  CAT_PERSONA_PRESETS,
  DEFAULT_USER_CONTEXT,
  LANGUAGE_OPTIONS,
  LIFE_CONTEXT_OPTIONS,
  LOCALE_OPTIONS,
  formatParentTriggerBadge,
  getAdaptiveQuestionSlug,
  morphQuestionForContext,
  normalizeParentTrigger,
  selectNextAdaptiveQuestionClient,
} from './adaptivePool120';
import {
  AURA_SCIENCE_BUNDLE,
  CALM_DIMENSION_LABELS,
  getQuestionSlug,
  INITIAL_SHADOW_CALIBRATION_MATRIX,
  INITIAL_STUDIO_FLOWS,
  MIND_MOMENT_INTERLUDES,
} from './data/scienceBundle';
import {
  AuraAPI,
  resolveApiUrl,
  resolveConsumerStepUrl,
} from './services/apiClient';
import {
  AgeBand,
  CohortSimulationResult,
  DomainKey,
  ItemBankQuestion,
  LifeContext,
  LocaleSetting,
  NodeTier,
  ParentTriggerRule,
  ShadowCalibrationRow,
  StudioBranchRule,
  StudioFlow,
  SupportedLanguage,
  TelemetryState,
  UserContextProfile,
} from './types/aura';

type StudioTab = 'questions' | 'flows' | 'science' | 'pdfs';
type TierFilter = 'all' | 'anchor' | 'branch_probe' | 'deep_resolution' | 'everyday_moment';
type DomainFilter = 'ALL' | DomainKey;

const DOMAIN_LIST: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];

const TIER_META: Record<
  NodeTier,
  { label: string; badgeClass: string; border: string; bg: string }
> = {
  anchor: {
    label: 'Anchor (Steps 1–5)',
    badgeClass: 'emerald',
    border: 'rgba(52, 211, 153, 0.35)',
    bg: 'rgba(52, 211, 153, 0.05)',
  },
  branch_probe: {
    label: 'Branch Probe (IF/THEN)',
    badgeClass: 'accent',
    border: 'rgba(167, 139, 250, 0.42)',
    bg: 'rgba(167, 139, 250, 0.06)',
  },
  deep_resolution: {
    label: 'Deep Resolution (2PL IRT)',
    badgeClass: 'sky',
    border: 'rgba(56, 189, 248, 0.38)',
    bg: 'rgba(56, 189, 248, 0.05)',
  },
  everyday_moment: {
    label: 'Everyday Moment (Shadow w=0)',
    badgeClass: 'amber',
    border: 'rgba(251, 191, 36, 0.40)',
    bg: 'rgba(251, 191, 36, 0.06)',
  },
};

function resolveItemTier(it: ItemBankQuestion): NodeTier {
  if (
    it.node_tier === 'anchor' ||
    it.node_tier === 'branch_probe' ||
    it.node_tier === 'deep_resolution' ||
    it.node_tier === 'everyday_moment'
  ) {
    return it.node_tier;
  }
  if (it.id <= 12) return 'anchor';
  if (it.id <= 15 || it.id >= 101 || it.calibration_status === 'shadow_candidate') {
    return 'everyday_moment';
  }
  if (it.id <= 50) return 'branch_probe';
  return 'deep_resolution';
}

function parseUrlState(): { tab: StudioTab; flow: string } {
  if (typeof window === 'undefined') {
    return { tab: 'questions', flow: 'kae_adaptive_branching' };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const tab: StudioTab =
    rawTab === 'flows' || rawTab === 'science' || rawTab === 'pdfs' || rawTab === 'questions'
      ? rawTab
      : 'questions';
  const flow = params.get('flow') || 'kae_adaptive_branching';
  return { tab, flow };
}

export const StudioApp: React.FC = () => {
  const initialUrl = useMemo(() => parseUrlState(), []);
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>(initialUrl.tab);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(initialUrl.flow);

  const [questions, setQuestions] = useState<ItemBankQuestion[]>(() =>
    ADAPTIVE_POOL_120.map((q) => ({ ...q, slug: getAdaptiveQuestionSlug(q) }))
  );
  const [flows, setFlows] = useState<StudioFlow[]>(INITIAL_STUDIO_FLOWS);
  const [activeFlowId, setActiveFlowId] = useState<string>('core_calm_12');
  const [shadowMatrix, setShadowMatrix] = useState<ShadowCalibrationRow[]>(
    INITIAL_SHADOW_CALIBRATION_MATRIX
  );
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // =========================================================================
  // TAB 1 STATE: 120+ Dynamic Question Pool Filters, Editor & Bulk AI Seed
  // =========================================================================
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showAddQForm, setShowAddQForm] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [newQText, setNewQText] = useState<string>('');
  const [newQTheme, setNewQTheme] = useState<string>('Everyday habit');
  const [newQDomain, setNewQDomain] = useState<DomainKey>('C');
  const [newQAspect, setNewQAspect] = useState<string>('Goal-Locked Drive (Industriousness)');
  const [newQTier, setNewQTier] = useState<NodeTier>('branch_probe');
  const [newQIrtA, setNewQIrtA] = useState<number>(1.72);
  const [newQIrtB, setNewQIrtB] = useState<number>(0.35);
  const [newQHasTrigger, setNewQHasTrigger] = useState<boolean>(true);
  const [newQParentId, setNewQParentId] = useState<number>(3);
  const [newQParentOp, setNewQParentOp] = useState<ParentTriggerRule['operator']>('>=');
  const [newQParentThresh, setNewQParentThresh] = useState<number>(4);
  const [newQProbe, setNewQProbe] = useState<string>('salience_vs_routine_split');
  const [newQStatus, setNewQStatus] = useState<'shadow_candidate' | 'calibrated_anchor'>(
    'calibrated_anchor'
  );
  const [newQDirection, setNewQDirection] = useState<number>(1);
  const [newQHypothesis, setNewQHypothesis] = useState<string>('');

  // Bulk Add / AI Seed Modal state
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkParentId, setBulkParentId] = useState<number>(3);
  const [bulkDomain, setBulkDomain] = useState<DomainKey>('C');
  const [bulkTier, setBulkTier] = useState<NodeTier>('branch_probe');
  const [bulkRawLines, setBulkRawLines] = useState<string>(
    [
      'When a task feels repetitive, I invent a small game or timer challenge to keep my brain engaged. | Playful momentum | 1.74 | +0.35',
      'I keep a running voice-memo or scratchpad for sudden ideas so they don’t pull me off my current track. | Catching sparks | 1.68 | +0.15',
      'Once the most interesting puzzle of a project is solved, handing off the routine polish feels like a huge relief. | Puzzle vs polish | 1.81 | +0.55',
    ].join('\n')
  );

  // =========================================================================
  // TAB 2 STATE: Live Adaptive Tree & CAT Path Simulator + Contextual Morphing
  // =========================================================================
  const [catVisitedIds, setCatVisitedIds] = useState<number[]>([1]);
  const [catResponses, setCatResponses] = useState<Record<number, number>>({});
  const [catActivePresetId, setCatActivePresetId] = useState<string>('manual');
  const [catTelemetry, setCatTelemetry] = useState<TelemetryState>({
    pulse_reaction: {
      completed: false,
      median_rt_ms: 285,
      rt_cv_pct: 15.0,
      steadiness_pct: 83.0,
      false_starts: 0,
    },
    constellation_memory: {
      completed: false,
      accuracy_pct: 80,
      mean_chunk_ms: 410,
    },
    minds_eye: {
      completed: false,
      imagery_vividness: 65,
      inner_modality: 'visual_cinema',
    },
  });

  // Contextual Morphing & DIF De-Biasing Lab state
  const [morphContext, setMorphContext] = useState<UserContextProfile>(DEFAULT_USER_CONTEXT);
  const [morphInspectQuestionId, setMorphInspectQuestionId] = useState<number>(13);

  // Legacy Flow & Cohort Simulation state
  const [showNewFlowForm, setShowNewFlowForm] = useState<boolean>(false);
  const [newFlowName, setNewFlowName] = useState<string>('');
  const [newFlowDesc, setNewFlowDesc] = useState<string>('');
  const [branchIfQ, setBranchIfQ] = useState<number>(3);
  const [branchOp, setBranchOp] = useState<StudioBranchRule['operator']>('>=');
  const [branchThresh, setBranchThresh] = useState<number>(4);
  const [branchGotoQ, setBranchGotoQ] = useState<number>(13);
  const [branchRationale, setBranchRationale] = useState<string>(
    'Route high-salience responders into ecological habit probe'
  );
  const [simResult, setSimResult] = useState<CohortSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  const syncUrlParams = useCallback((nextTab: StudioTab, nextFlow: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nextTab);
    if (nextFlow) {
      url.searchParams.set('flow', nextFlow);
    }
    window.history.pushState({ tab: nextTab, flow: nextFlow }, '', url.toString());
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseUrlState();
      setActiveStudioTab(parsed.tab);
      setSelectedFlowId(parsed.flow);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectTab = (tab: StudioTab) => {
    setActiveStudioTab(tab);
    syncUrlParams(tab, selectedFlowId);
  };

  const handleSelectFlow = (flowId: string) => {
    setSelectedFlowId(flowId);
    syncUrlParams(activeStudioTab, flowId);
  };

  const refreshStudioData = useCallback(async () => {
    const overview = await AuraAPI.getStudioOverview();
    setQuestions(overview.questions);
    setFlows(overview.flows);
    setActiveFlowId(overview.active_flow_id);
    setShadowMatrix(overview.shadow_calibration_matrix);
    setBackendConnected(overview.backendConnected);
  }, []);

  useEffect(() => {
    refreshStudioData();
  }, [refreshStudioData]);

  // Tier counts across the 120+ pool
  const tierCounts = useMemo(() => {
    const counts = {
      all: questions.length,
      anchor: 0,
      branch_probe: 0,
      deep_resolution: 0,
      everyday_moment: 0,
    };
    for (const q of questions) {
      const t = resolveItemTier(q);
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const qClean = searchQuery.trim().toLowerCase();
    return questions.filter((it) => {
      const t = resolveItemTier(it);
      if (tierFilter !== 'all' && t !== tierFilter) return false;
      if (domainFilter !== 'ALL' && it.domain !== domainFilter) return false;
      if (qClean) {
        const slug = getQuestionSlug(it).toLowerCase();
        const text = (it.text || '').toLowerCase();
        const theme = (it.calm_theme || '').toLowerCase();
        const aspect = (it.aspect || '').toLowerCase();
        const idMatch = `q#${it.id}` === qClean || String(it.id) === qClean;
        if (
          !idMatch &&
          !slug.includes(qClean) &&
          !text.includes(qClean) &&
          !theme.includes(qClean) &&
          !aspect.includes(qClean)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [questions, tierFilter, domainFilter, searchQuery]);

  // =========================================================================
  // LIVE CAT SIMULATOR COMPUTATIONS
  // =========================================================================
  const currentCatQuestionId =
    catVisitedIds[catVisitedIds.length - 1] || 1;
  const currentCatQuestion = useMemo(
    () => questions.find((q) => q.id === currentCatQuestionId) || questions[0],
    [questions, currentCatQuestionId]
  );

  // Evaluation explaining why currentCatQuestion was chosen (relative to the prefix before it)
  const currentCatSelection = useMemo(() => {
    const prefixBeforeCurrent = catVisitedIds.slice(0, Math.max(0, catVisitedIds.length - 1));
    const prefixResponses: Record<number, number> = {};
    for (const qid of prefixBeforeCurrent) {
      if (catResponses[qid] !== undefined) {
        prefixResponses[qid] = catResponses[qid];
      }
    }
    return selectNextAdaptiveQuestionClient({
      pool: questions,
      answeredIds: prefixBeforeCurrent,
      responses: prefixResponses,
      telemetry: catTelemetry,
    });
  }, [questions, catVisitedIds, catResponses, catTelemetry]);

  // Next-Question Candidates Leaderboard given ALL answers so far
  const nextCatPreview = useMemo(() => {
    const answeredList = catVisitedIds.filter((id) => catResponses[id] !== undefined);
    return selectNextAdaptiveQuestionClient({
      pool: questions,
      answeredIds: answeredList,
      responses: catResponses,
      telemetry: catTelemetry,
    });
  }, [questions, catVisitedIds, catResponses, catTelemetry]);

  // Answer current question in CAT Simulator & advance to next adaptive branch
  const handleCatAnswerAndStep = useCallback(
    (val: number) => {
      const qId = currentCatQuestion.id;
      const nextResp = { ...catResponses, [qId]: val };
      setCatResponses(nextResp);

      // Update simulated Mind Moment telemetry automatically at step 4 (Still Water) and step 8 (Night Sky)
      const nextTel: TelemetryState = JSON.parse(JSON.stringify(catTelemetry));
      if (catVisitedIds.length === 4 && !nextTel.pulse_reaction.completed) {
        const isSpark = (nextResp[3] ?? 3) >= 4;
        nextTel.pulse_reaction = {
          completed: true,
          median_rt_ms: isSpark ? 258 : 292,
          rt_cv_pct: isSpark ? 25.4 : 13.8,
          steadiness_pct: isSpark ? 64.1 : 85.5,
          false_starts: isSpark ? 2 : 0,
        };
      }
      if (catVisitedIds.length === 8 && !nextTel.constellation_memory.completed) {
        const highPattern = (nextResp[1] ?? 3) >= 4;
        nextTel.constellation_memory = {
          completed: true,
          accuracy_pct: highPattern ? 91 : 78,
          mean_chunk_ms: highPattern ? 365 : 420,
        };
      }
      if (catVisitedIds.length === 15 && !nextTel.minds_eye.completed) {
        nextTel.minds_eye = {
          completed: true,
          imagery_vividness: 68,
          inner_modality: 'visual_cinema',
        };
      }
      setCatTelemetry(nextTel);

      if (catVisitedIds.length < 15) {
        const nextSel = selectNextAdaptiveQuestionClient({
          pool: questions,
          answeredIds: catVisitedIds,
          responses: nextResp,
          telemetry: nextTel,
        });
        if (nextSel.nextItem && !catVisitedIds.includes(nextSel.nextItem.id)) {
          const nextIds = [...catVisitedIds, nextSel.nextItem.id];
          setCatVisitedIds(nextIds);
          setMorphInspectQuestionId(nextSel.nextItem.id);
        }
      }
    },
    [catResponses, catTelemetry, catVisitedIds, currentCatQuestion, questions]
  );

  // Auto-run an entire 15-question adaptive path for a Persona Preset
  const handleRunPersonaPreset = useCallback(
    (presetId: string) => {
      const preset = CAT_PERSONA_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setCatActivePresetId(preset.id);

      const pathIds: number[] = [1];
      const simResp: Record<number, number> = {};
      const byId = new Map<number, ItemBankQuestion>();
      questions.forEach((q) => byId.set(q.id, q));

      for (let step = 0; step < 15; step++) {
        const curId = pathIds[step];
        const qObj = byId.get(curId) || questions[0];
        simResp[curId] = preset.answerPolicy(qObj);

        if (pathIds.length < 15) {
          const sel = selectNextAdaptiveQuestionClient({
            pool: questions,
            answeredIds: pathIds,
            responses: simResp,
            telemetry: preset.telemetry,
          });
          if (sel.nextItem && !pathIds.includes(sel.nextItem.id)) {
            pathIds.push(sel.nextItem.id);
          }
        }
      }

      setCatTelemetry(preset.telemetry);
      setCatResponses(simResp);
      setCatVisitedIds(pathIds);
      setMorphInspectQuestionId(pathIds[pathIds.length - 1] || 1);
      showToast(
        `Simulated 15-step adaptive CAT path for "${preset.name}" across ${questions.length}-item pool`
      );
    },
    [questions, showToast]
  );

  const handleResetCatSimulator = useCallback(() => {
    setCatActivePresetId('manual');
    setCatVisitedIds([1]);
    setCatResponses({});
    setCatTelemetry({
      pulse_reaction: {
        completed: false,
        median_rt_ms: 285,
        rt_cv_pct: 15.0,
        steadiness_pct: 83.0,
        false_starts: 0,
      },
      constellation_memory: {
        completed: false,
        accuracy_pct: 80,
        mean_chunk_ms: 410,
      },
      minds_eye: {
        completed: false,
        imagery_vividness: 65,
        inner_modality: 'visual_cinema',
      },
    });
    setMorphInspectQuestionId(1);
    showToast('Reset CAT Simulator to Step 01 (Anchor Q#1)');
  }, [showToast]);

  // Build visual dynamic path breadcrumb (including interwoven Mind Moments at Q4, Q8, Q15)
  const catBreadcrumbNodes = useMemo(() => {
    const byId = new Map<number, ItemBankQuestion>();
    questions.forEach((q) => byId.set(q.id, q));
    const nodes: Array<
      | {
          kind: 'question';
          stepOrder: number;
          qIndex: number;
          question: ItemBankQuestion;
          tier: NodeTier;
          answer?: number;
        }
      | {
          kind: 'moment';
          stepOrder: number;
          title: string;
          slug: string;
          completed: boolean;
        }
    > = [];

    let order = 1;
    catVisitedIds.forEach((qid, idx) => {
      const q = byId.get(qid);
      if (!q) return;
      nodes.push({
        kind: 'question',
        stepOrder: order++,
        qIndex: idx,
        question: q,
        tier: resolveItemTier(q),
        answer: catResponses[qid],
      });
      if (idx === 3) {
        nodes.push({
          kind: 'moment',
          stepOrder: order++,
          title: 'Still Water (RT CV)',
          slug: 'moment-still-water',
          completed: catTelemetry.pulse_reaction.completed,
        });
      } else if (idx === 7) {
        nodes.push({
          kind: 'moment',
          stepOrder: order++,
          title: 'Night Sky (Chunking)',
          slug: 'moment-night-sky',
          completed: catTelemetry.constellation_memory.completed,
        });
      } else if (idx === 14) {
        nodes.push({
          kind: 'moment',
          stepOrder: order++,
          title: 'Inner Canvas (VVIQ)',
          slug: 'moment-inner-canvas',
          completed: catTelemetry.minds_eye.completed,
        });
      }
    });
    return nodes;
  }, [questions, catVisitedIds, catResponses, catTelemetry]);

  // =========================================================================
  // QUESTION CREATE / EDIT / BULK SEED HANDLERS
  // =========================================================================
  const handleStartEditQuestion = (q: ItemBankQuestion) => {
    setEditingQuestionId(q.id);
    setNewQText(q.text);
    setNewQTheme(q.calm_theme);
    setNewQDomain(q.domain);
    setNewQAspect(q.aspect);
    setNewQTier(resolveItemTier(q));
    setNewQIrtA(q.irt_a);
    setNewQIrtB(q.irt_b);
    const pt = normalizeParentTrigger(q.parent_trigger);
    setNewQHasTrigger(Boolean(pt));
    if (pt) {
      setNewQParentId(pt.if_question_id);
      setNewQParentOp(pt.operator);
      setNewQParentThresh(pt.threshold);
    }
    setNewQProbe(q.probe_type || 'cortical_prior');
    setNewQStatus(
      q.calibration_status === 'shadow_candidate' ? 'shadow_candidate' : 'calibrated_anchor'
    );
    setNewQDirection(q.direction >= 0 ? 1 : -1);
    setNewQHypothesis(q.scientific_hypothesis || '');
    setShowAddQForm(true);
  };

  const handleSaveNewQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      showToast('Please enter a question prompt first');
      return;
    }
    const parentTrigger: ParentTriggerRule | null = newQHasTrigger
      ? {
          if_question_id: Number(newQParentId),
          operator: newQParentOp,
          threshold: Number(newQParentThresh),
          rationale: `Triggered when Q#${newQParentId} ${newQParentOp} ${newQParentThresh}`,
        }
      : null;

    const created = await AuraAPI.addStudioQuestion({
      id: editingQuestionId ?? undefined,
      text: newQText,
      calm_theme: newQTheme,
      domain: newQDomain,
      aspect: newQAspect,
      node_tier: newQTier,
      parent_trigger: parentTrigger,
      irt_a: Number(newQIrtA),
      irt_b: Number(newQIrtB),
      probe_type: newQProbe,
      calibration_status:
        newQTier === 'everyday_moment' ? 'shadow_candidate' : newQStatus,
      direction: newQDirection,
      scientific_hypothesis: newQHypothesis,
    });
    await refreshStudioData();
    setEditingQuestionId(null);
    setNewQText('');
    setNewQHypothesis('');
    setShowAddQForm(false);
    showToast(
      `Saved Q#${created.id} (${getQuestionSlug(created)}) [${created.node_tier}] to Item Pool`
    );
  };

  const handleBulkSeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkRawLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast('Enter at least one line to bulk seed');
      return;
    }
    const parsedBatch = lines.map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      const text = parts[0] || line;
      const calm_theme = parts[1] || `Branch probe ${idx + 1}`;
      const irt_a = parseFloat(parts[2] || '1.72') || 1.72;
      const irt_b = parseFloat(parts[3] || '0.30') || 0.3;
      return {
        text,
        calm_theme,
        domain: bulkDomain,
        node_tier: bulkTier,
        irt_a,
        irt_b,
        parent_trigger: {
          if_question_id: bulkParentId,
          operator: '>=' as const,
          threshold: 4,
          rationale: `AI Bulk Seeded branch child of Q#${bulkParentId}`,
        },
        scientific_hypothesis: `Bulk-seeded ${bulkTier} node attached to parent Q#${bulkParentId}.`,
      };
    });

    const added = await AuraAPI.bulkAddStudioQuestions(parsedBatch);
    await refreshStudioData();
    setShowBulkModal(false);
    showToast(`Bulk-seeded ${added.length} new adaptive branch questions into the pool!`);
  };

  const selectedFlow = useMemo(() => {
    return (
      flows.find((f) => f.id === selectedFlowId) ||
      flows.find((f) => f.id === activeFlowId) ||
      flows[0]
    );
  }, [flows, selectedFlowId, activeFlowId]);

  const interleavedFlowSequence = useMemo(() => {
    if (!selectedFlow) return [];
    const byId = new Map<number, ItemBankQuestion>();
    questions.forEach((q) => byId.set(Number(q.id), q));

    const qList = selectedFlow.question_ids
      .map((id) => byId.get(Number(id)))
      .filter((q): q is ItemBankQuestion => Boolean(q));

    const steps: Array<
      | {
          kind: 'question';
          stepNumber: number;
          question: ItemBankQuestion;
          slug: string;
        }
      | {
          kind: 'moment';
          stepNumber: number;
          moment: (typeof MIND_MOMENT_INTERLUDES)[number];
          slug: string;
        }
    > = [];

    let stepNum = 1;
    qList.forEach((q, idx) => {
      const qSlug = getQuestionSlug(q);
      steps.push({
        kind: 'question',
        stepNumber: stepNum++,
        question: q,
        slug: qSlug,
      });

      if (selectedFlow.include_mind_moments) {
        const oneBasedQPos = idx + 1;
        if (oneBasedQPos === 4) {
          const m1 = MIND_MOMENT_INTERLUDES[0];
          steps.push({
            kind: 'moment',
            stepNumber: stepNum++,
            moment: m1,
            slug: m1.slug,
          });
        } else if (oneBasedQPos === 8) {
          const m2 = MIND_MOMENT_INTERLUDES[1];
          steps.push({
            kind: 'moment',
            stepNumber: stepNum++,
            moment: m2,
            slug: m2.slug,
          });
        }
      }
    });

    if (selectedFlow.include_mind_moments) {
      const m3 = MIND_MOMENT_INTERLUDES[2];
      steps.push({
        kind: 'moment',
        stepNumber: stepNum++,
        moment: m3,
        slug: m3.slug,
      });
    }

    return steps;
  }, [selectedFlow, questions]);

  const handleActivateFlow = async (flowId: string) => {
    await AuraAPI.activateStudioFlow(flowId);
    await refreshStudioData();
    handleSelectFlow(flowId);
    const f = flows.find((x) => x.id === flowId);
    showToast(`Activated "${f?.name || flowId}" on live consumer site!`);
  };

  const handleCreateNewFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) {
      showToast('Please enter a flow name');
      return;
    }
    const slug = `kae_flow_${Date.now().toString().slice(-4)}`;
    const flowObj: StudioFlow = {
      id: slug,
      name: newFlowName.trim(),
      description:
        newFlowDesc.trim() ||
        'Custom experimental flow created in Kae & Conner Studio.',
      is_active: false,
      question_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      branches: [],
      include_mind_moments: true,
      created_by: 'Kae (Studio)',
      updated_at: new Date().toISOString().slice(0, 10),
    };
    await AuraAPI.saveStudioFlow(flowObj);
    await refreshStudioData();
    handleSelectFlow(flowObj.id);
    setNewFlowName('');
    setNewFlowDesc('');
    setShowNewFlowForm(false);
    showToast(`Created experimental flow "${flowObj.name}"`);
  };

  const handleAddBranchRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlow) return;
    const newRule: StudioBranchRule = {
      id: `br_${Date.now().toString().slice(-5)}`,
      if_question_id: Number(branchIfQ),
      operator: branchOp,
      threshold: Number(branchThresh),
      then_goto_question_id: Number(branchGotoQ),
      rationale:
        branchRationale.trim() ||
        `If Q#${branchIfQ} ${branchOp} ${branchThresh}, branch to Q#${branchGotoQ}`,
    };

    const nextQIds = [...selectedFlow.question_ids];
    if (!nextQIds.includes(Number(branchIfQ))) nextQIds.push(Number(branchIfQ));
    if (!nextQIds.includes(Number(branchGotoQ))) nextQIds.push(Number(branchGotoQ));

    const updatedFlow: StudioFlow = {
      ...selectedFlow,
      question_ids: nextQIds,
      branches: [...selectedFlow.branches, newRule],
      updated_at: new Date().toISOString().slice(0, 10),
    };
    await AuraAPI.saveStudioFlow(updatedFlow);
    await refreshStudioData();
    showToast(
      `Added branch rule: IF Q#${branchIfQ} ${branchOp} ${branchThresh} ➔ Q#${branchGotoQ}`
    );
  };

  const handleRemoveBranchRule = async (ruleId: string) => {
    if (!selectedFlow) return;
    const updatedFlow: StudioFlow = {
      ...selectedFlow,
      branches: selectedFlow.branches.filter((b) => b.id !== ruleId),
    };
    await AuraAPI.saveStudioFlow(updatedFlow);
    await refreshStudioData();
    showToast('Removed conditional branch rule');
  };

  const handleRunSimulation = async (flowId?: string) => {
    const targetId =
      flowId || selectedFlow?.id || activeFlowId || 'kae_adaptive_branching';
    setIsSimulating(true);
    try {
      const res = await AuraAPI.runCohortSimulation(targetId, 50);
      setSimResult(res);
      showToast(`Simulated 50 synthetic users on "${res.flow_name}"`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyAgentPrompt = () => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://127.0.0.1:8095';
    const promptText = [
      `You are collaborating with Kae & Conner on the Aura Personality Lab Studio (${origin}).`,
      `1. Read the machine-readable Agent Manifest & 120-Item CAT Schema: GET ${resolveApiUrl('/api/v1/agent/manifest')} (and OpenAPI docs at ${resolveApiUrl('/docs')}).`,
      `2. Inspect the 120+ Dynamic Question Pool, CAT tree triggers, and SAPA shadow calibration: GET ${resolveApiUrl('/api/v1/studio/overview')}.`,
      `3. Query real-time 2PL IRT Fisher Information next-item selection: POST ${resolveApiUrl('/api/v1/assessment/next-item')}.`,
      `4. Add or bulk-seed branch_probe, deep_resolution, or everyday_moment items: POST ${resolveApiUrl('/api/v1/studio/questions')}.`,
      `5. Run 50-user synthetic Monte Carlo cohort simulations: POST ${resolveApiUrl('/api/v1/agent/simulate')}.`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText).catch(() => {});
    }
    showToast("Copied API prompt for Kae's AI Agent!");
  };

  // Morphing preview item
  const morphTargetQuestion = useMemo(
    () =>
      questions.find((q) => q.id === morphInspectQuestionId) ||
      currentCatQuestion ||
      questions[0],
    [questions, morphInspectQuestionId, currentCatQuestion]
  );

  const morphPreviewResult = useMemo(
    () => morphQuestionForContext(morphTargetQuestion, morphContext),
    [morphTargetQuestion, morphContext]
  );

  const totalPapersCount = (AURA_SCIENCE_BUNDLE.papers_corpus || []).reduce(
    (acc, cat) => acc + (cat.papers?.length || 0),
    0
  );

  const activeLiveFlowObj =
    flows.find((f) => f.id === activeFlowId || f.is_active) || flows[0];

  return (
    <div id="kae-conner-studio" className="studio-shell">
      {/* ===================================================================== */}
      {/* TOP ADMIN WORKBENCH BAR                                               */}
      {/* ===================================================================== */}
      <header className="admin-topbar">
        <div className="status-bar-row" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="status-pill accent">120+ DYNAMIC CAT &amp; DIF STUDIO</span>
            <span className={`status-pill ${backendConnected ? 'emerald' : 'amber'}`}>
              ● {backendConnected ? 'SQLite + FastAPI Connected' : 'Edge CAT Mirror (120 Pool Active)'}
            </span>
            <span className="status-pill">
              Pool: {questions.length} Items ({tierCounts.anchor} Anchors · {tierCounts.branch_probe} Branch ·{' '}
              {tierCounts.deep_resolution} Deep 2PL · {tierCounts.everyday_moment} Everyday w=0)
            </span>
            <span className="status-pill sky">
              Active Flow: {activeLiveFlowObj?.name || activeFlowId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href="https://aura-kae-lab.pages.dev"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Open Consumer App ↗
            </a>
            <a
              href={resolveApiUrl('/docs')}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Open API / Swagger Docs ↗
            </a>
            <button
              id="btn-copy-agent-prompt"
              type="button"
              onClick={handleCopyAgentPrompt}
              className="btn-primary"
            >
              Copy Prompt for Kae’s AI Agent
            </button>
          </div>
        </div>

        <div className="status-bar-row">
          <div>
            <h1 className="serif" style={{ fontSize: '30px', fontWeight: 600, lineHeight: 1.15 }}>
              Aura Studio · Dynamic Question Tree, 2PL CAT &amp; Contextual DIF Lab
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Kae &amp; Conner’s 120+ item Computerized Adaptive Testing (CAT) workbench, real-time
              Fisher Information <code className="mono">I(θ)</code> path simulator, and LLM
              socioeconomic/age/language DIF de-biasing engine.
            </p>
          </div>
          <div
            className="mono"
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              background: 'rgba(0,0,0,0.35)',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            URL State: ?tab={activeStudioTab}&amp;flow={selectedFlow?.id || selectedFlowId}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 4 CLEAN NAVIGATION TABS                                               */}
      {/* ===================================================================== */}
      <nav className="studio-nav-tabs" aria-label="Studio Navigation">
        <button
          id="studio-pill-questions"
          type="button"
          onClick={() => handleSelectTab('questions')}
          className={`studio-tab-btn ${activeStudioTab === 'questions' ? 'active' : ''}`}
        >
          <span>1. Dynamic Question Pool ({questions.length})</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            4 Tiers · 2PL IRT (a, b) · Bulk AI Seed
          </span>
        </button>

        <button
          id="studio-pill-flows"
          type="button"
          onClick={() => handleSelectTab('flows')}
          className={`studio-tab-btn ${activeStudioTab === 'flows' ? 'active' : ''}`}
        >
          <span>2. Live Adaptive Tree &amp; CAT Simulator</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Bayesian θ±SE · Top-6 I(θ) · DIF Morphing
          </span>
        </button>

        <button
          id="studio-pill-science"
          type="button"
          onClick={() => handleSelectTab('science')}
          className={`studio-tab-btn ${activeStudioTab === 'science' ? 'active' : ''}`}
        >
          <span>3. Science, DIF Lab &amp; Shadow Matrix</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            3-Layer Equation · SES/Language De-Biasing
          </span>
        </button>

        <button
          id="studio-pill-pdfs"
          type="button"
          onClick={() => handleSelectTab('pdfs')}
          className={`studio-tab-btn ${activeStudioTab === 'pdfs' ? 'active' : ''}`}
        >
          <span>4. {totalPapersCount} Research PDFs &amp; Agent API</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            4 Domains · REST Control Plane
          </span>
        </button>
      </nav>

      {/* ===================================================================== */}
      {/* TAB 1: DYNAMIC QUESTION POOL (120+ ITEMS)                             */}
      {/* ===================================================================== */}
      {activeStudioTab === 'questions' && (
        <section id="studio-panel-questions" className="studio-panel">
          <div
            className="status-bar-row"
            style={{
              marginBottom: '14px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600 }}>
                120+ Calibrated CAT Question Pool (<code className="mono">adaptivePool120.ts</code> &amp; SQLite)
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Filter by CAT Node Tier, Big Five Domain, or search query. Every item carries 2PL IRT
                discrimination <code className="mono">a</code>, threshold <code className="mono">b ∈ [-1.5, +1.5]</code>,
                and optional <code className="mono">parent_trigger</code> branching rules.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                id="btn-studio-bulk-seed"
                type="button"
                onClick={() => setShowBulkModal((prev) => !prev)}
                className="btn-ghost"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.5)',
                  color: 'var(--sky)',
                }}
              >
                {showBulkModal ? 'Close Bulk Seed' : '⚡ Bulk Add / AI Seed'}
              </button>

              <button
                id="btn-studio-open-add-q"
                type="button"
                onClick={() => {
                  setEditingQuestionId(null);
                  setShowAddQForm(!showAddQForm);
                }}
                className="btn-primary"
              >
                {showAddQForm ? 'Cancel' : '＋ Add / Edit Question'}
              </button>
            </div>
          </div>

          {/* Tier Filter Pills + Domain Filter Pills + Search Input */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className="btn-ghost"
                style={{
                  borderColor: tierFilter === 'all' ? 'var(--accent)' : 'var(--border)',
                  background: tierFilter === 'all' ? 'var(--accent-soft)' : undefined,
                }}
              >
                All ({tierCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('anchor')}
                className="btn-ghost"
                style={{
                  borderColor: tierFilter === 'anchor' ? 'var(--emerald)' : 'var(--border)',
                  background: tierFilter === 'anchor' ? 'var(--emerald-soft)' : undefined,
                }}
              >
                Anchor ({tierCounts.anchor})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('branch_probe')}
                className="btn-ghost"
                style={{
                  borderColor: tierFilter === 'branch_probe' ? 'var(--accent)' : 'var(--border)',
                  background: tierFilter === 'branch_probe' ? 'var(--accent-soft)' : undefined,
                }}
              >
                Branch Probe ({tierCounts.branch_probe})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('deep_resolution')}
                className="btn-ghost"
                style={{
                  borderColor: tierFilter === 'deep_resolution' ? 'var(--sky)' : 'var(--border)',
                  background: tierFilter === 'deep_resolution' ? 'var(--sky-soft)' : undefined,
                }}
              >
                Deep Resolution ({tierCounts.deep_resolution})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('everyday_moment')}
                className="btn-ghost"
                style={{
                  borderColor: tierFilter === 'everyday_moment' ? 'var(--amber)' : 'var(--border)',
                  background: tierFilter === 'everyday_moment' ? 'var(--amber-soft)' : undefined,
                }}
              >
                Everyday Moment ({tierCounts.everyday_moment})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {(['ALL', 'O', 'C', 'E', 'A', 'N'] as DomainFilter[]).map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setDomainFilter(dom)}
                  className="btn-ghost mono"
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    borderColor: domainFilter === dom ? 'var(--sky)' : 'var(--border)',
                    background: domainFilter === dom ? 'var(--sky-soft)' : undefined,
                  }}
                >
                  {dom === 'ALL' ? 'All Domains' : dom}
                </button>
              ))}

              <input
                id="studio-search-questions"
                type="text"
                placeholder="Search 120+ items, slugs, aspects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="clean-input"
                style={{ width: '230px', padding: '6px 11px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* BULK ADD / AI SEED PANEL */}
          {showBulkModal && (
            <form
              id="studio-bulk-seed-form"
              onSubmit={handleBulkSeedSubmit}
              className="card-subtle"
              style={{
                marginBottom: '18px',
                borderColor: 'rgba(56, 189, 248, 0.55)',
                background: 'rgba(56, 189, 248, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div className="status-bar-row">
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sky)' }}>
                  ⚡ Bulk Add / AI Seed Branch Probes into CAT Pool
                </span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Format per line: Prompt Text | Calm Theme | irt_a | irt_b
                </span>
              </div>

              <div className="grid-3col">
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Attach to Parent Trigger Question
                  </label>
                  <select
                    value={bulkParentId}
                    onChange={(e) => setBulkParentId(Number(e.target.value))}
                    className="clean-select"
                  >
                    {questions.slice(0, 30).map((q) => (
                      <option key={q.id} value={q.id}>
                        IF Q#{q.id} ({q.calm_theme}) &gt;= 4
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Target Domain
                  </label>
                  <select
                    value={bulkDomain}
                    onChange={(e) => setBulkDomain(e.target.value as DomainKey)}
                    className="clean-select"
                  >
                    <option value="O">O · Curiosity &amp; Imagination</option>
                    <option value="C">C · Focus &amp; Follow-Through</option>
                    <option value="E">E · Social Energy</option>
                    <option value="A">A · Warmth &amp; Harmony</option>
                    <option value="N">N · Emotional Sensitivity</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Node Tier
                  </label>
                  <select
                    value={bulkTier}
                    onChange={(e) => setBulkTier(e.target.value as NodeTier)}
                    className="clean-select"
                  >
                    <option value="branch_probe">Branch Probe (IF/THEN)</option>
                    <option value="deep_resolution">Deep Resolution (2PL IRT)</option>
                    <option value="everyday_moment">Everyday Moment (Shadow w=0)</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={4}
                value={bulkRawLines}
                onChange={(e) => setBulkRawLines(e.target.value)}
                className="clean-input mono"
                style={{ fontSize: '11.5px', lineHeight: 1.45 }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowBulkModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  ⚡ Seed Questions into CAT Pool
                </button>
              </div>
            </form>
          )}

          {/* CREATE / EDIT QUESTION FORM */}
          {showAddQForm && (
            <form
              id="studio-add-question-form"
              onSubmit={handleSaveNewQuestion}
              className="card-subtle"
              style={{
                marginBottom: '18px',
                borderColor: 'rgba(167, 139, 250, 0.5)',
                background: 'rgba(167, 139, 250, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#c4b5fd' }}>
                ✦ {editingQuestionId ? `Edit Q#${editingQuestionId}` : 'Add New Question'} in 120+ CAT Pool
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Everyday Question Prompt (Zero clinical jargon)
                </label>
                <input
                  id="studio-input-q-text"
                  type="text"
                  placeholder="e.g., I keep my phone on silent and reply in warm batches when my energy is ready."
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  className="clean-input"
                />
              </div>

              <div className="grid-3col">
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    Calm Theme Badge
                  </label>
                  <input
                    id="studio-input-q-theme"
                    type="text"
                    value={newQTheme}
                    onChange={(e) => setNewQTheme(e.target.value)}
                    className="clean-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    Target Big Five Dimension
                  </label>
                  <select
                    id="studio-select-q-domain"
                    value={newQDomain}
                    onChange={(e) => setNewQDomain(e.target.value as DomainKey)}
                    className="clean-select"
                  >
                    <option value="O">O · Curiosity &amp; Imagination</option>
                    <option value="C">C · Focus &amp; Follow-Through</option>
                    <option value="E">E · Social Energy</option>
                    <option value="A">A · Warmth &amp; Harmony</option>
                    <option value="N">N · Emotional Sensitivity</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    CAT Node Tier
                  </label>
                  <select
                    id="studio-select-q-tier"
                    value={newQTier}
                    onChange={(e) => setNewQTier(e.target.value as NodeTier)}
                    className="clean-select"
                  >
                    <option value="anchor">Anchor (Steps 1–5)</option>
                    <option value="branch_probe">Branch Probe (Conditional IF/THEN)</option>
                    <option value="deep_resolution">Deep Resolution (2PL IRT [-1.5, +1.5])</option>
                    <option value="everyday_moment">Everyday Moment (Sneaky Shadow w=0)</option>
                  </select>
                </div>
              </div>

              <div className="grid-3col">
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    2PL IRT Discrimination (a) &amp; Threshold (b)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="2.5"
                      value={newQIrtA}
                      onChange={(e) => setNewQIrtA(parseFloat(e.target.value) || 1.6)}
                      className="clean-input mono"
                      title="IRT Discrimination a"
                    />
                    <input
                      type="number"
                      step="0.05"
                      min="-2.0"
                      max="2.0"
                      value={newQIrtB}
                      onChange={(e) => setNewQIrtB(parseFloat(e.target.value) || 0.0)}
                      className="clean-input mono"
                      title="IRT Difficulty/Threshold b"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    Parent Trigger Rule (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={newQHasTrigger}
                      onChange={(e) => setNewQHasTrigger(e.target.checked)}
                    />
                    {newQHasTrigger ? (
                      <>
                        <select
                          value={newQParentId}
                          onChange={(e) => setNewQParentId(Number(e.target.value))}
                          className="clean-select"
                          style={{ padding: '6px' }}
                        >
                          {questions.slice(0, 50).map((q) => (
                            <option key={q.id} value={q.id}>
                              Q#{q.id}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newQParentOp}
                          onChange={(e) =>
                            setNewQParentOp(e.target.value as ParentTriggerRule['operator'])
                          }
                          className="clean-select"
                          style={{ padding: '6px', width: '64px' }}
                        >
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value="==">==</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={newQParentThresh}
                          onChange={(e) => setNewQParentThresh(Number(e.target.value))}
                          className="clean-input mono"
                          style={{ width: '54px', padding: '6px' }}
                        />
                      </>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                        No parent trigger (unconditional)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    Scoring Direction &amp; Hypothesis
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '6px' }}>
                    <select
                      value={newQDirection}
                      onChange={(e) => setNewQDirection(Number(e.target.value))}
                      className="clean-select"
                    >
                      <option value={1}>+1 Pole</option>
                      <option value={-1}>-1 Split</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Scientific hypothesis..."
                      value={newQHypothesis}
                      onChange={(e) => setNewQHypothesis(e.target.value)}
                      className="clean-input"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button id="btn-studio-save-q" type="submit" className="btn-primary">
                  {editingQuestionId ? `Update Q#${editingQuestionId}` : 'Save Question to Pool'}
                </button>
              </div>
            </form>
          )}

          {/* QUESTION CARDS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredQuestions.map((it) => {
              const tier = resolveItemTier(it);
              const tMeta = TIER_META[tier];
              const qSlug = getQuestionSlug(it);
              const stepUrl = resolveConsumerStepUrl(qSlug);
              const trigBadge = formatParentTriggerBadge(it.parent_trigger);

              return (
                <div
                  key={it.id}
                  className="card-subtle"
                  style={{
                    borderColor: tMeta.border,
                    background: tMeta.bg,
                  }}
                >
                  <div className="status-bar-row" style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: '12px',
                          color: 'var(--accent)',
                          fontWeight: 600,
                        }}
                      >
                        Q#{it.id} · Domain {it.domain} ({CALM_DIMENSION_LABELS[it.domain]?.name})
                      </span>

                      <span
                        className={`status-pill ${tMeta.badgeClass}`}
                        style={{ fontSize: '10.5px', padding: '2px 9px' }}
                      >
                        {tMeta.label}
                      </span>

                      {trigBadge && (
                        <span
                          className="status-pill amber mono"
                          style={{ fontSize: '10.5px', padding: '2px 9px' }}
                        >
                          ↳ {trigBadge}
                        </span>
                      )}

                      <span
                        className="status-pill sky mono"
                        style={{ fontSize: '10.5px', padding: '2px 9px' }}
                      >
                        {qSlug}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        2PL a={Number(it.irt_a).toFixed(2)} · b=
                        {Number(it.irt_b) >= 0
                          ? `+${Number(it.irt_b).toFixed(2)}`
                          : Number(it.irt_b).toFixed(2)}{' '}
                        · dir={it.direction > 0 ? '+1' : '-1'} · {it.calm_theme}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditQuestion(it)}
                        className="btn-ghost"
                        style={{ padding: '4px 9px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMorphInspectQuestionId(it.id);
                          handleSelectTab('flows');
                        }}
                        className="btn-ghost"
                        style={{ padding: '4px 9px', fontSize: '11px', color: '#c4b5fd' }}
                      >
                        Morph / DIF ↗
                      </button>
                      <a
                        href={stepUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--sky)' }}
                      >
                        Preview Step URL ↗
                      </a>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--text)',
                      lineHeight: 1.45,
                      marginBottom: '6px',
                    }}
                  >
                    “{it.text}”
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      color: 'var(--text-dim)',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span>
                      Aspect: <strong style={{ color: 'var(--text-muted)' }}>{it.aspect}</strong> · Probe:{' '}
                      <code className="mono">{it.probe_type}</code>
                    </span>
                    {it.scientific_hypothesis && (
                      <span style={{ color: '#c4b5fd' }}>{it.scientific_hypothesis}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LIVE ADAPTIVE TREE & CAT PATH SIMULATOR + DIF MORPHING LAB     */}
      {/* ===================================================================== */}
      {activeStudioTab === 'flows' && (
        <section id="studio-panel-flows" className="studio-panel">
          {/* Top Header & Persona Presets Bar */}
          <div
            className="status-bar-row"
            style={{
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                Live 120-Item Computerized Adaptive Testing (CAT) &amp; Tree Path Simulator
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Click Likert answers 1..5 to step through the assessment one question at a time, or
                trigger a Persona Preset to watch Bayesian posteriors <code className="mono">θ_d ± SE_d</code> and
                Fisher Information <code className="mono">I(θ)</code> route through the 120-item tree!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {CAT_PERSONA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleRunPersonaPreset(preset.id)}
                  className="btn-ghost"
                  style={{
                    borderColor:
                      catActivePresetId === preset.id ? 'var(--emerald)' : 'rgba(167, 139, 250, 0.35)',
                    background:
                      catActivePresetId === preset.id ? 'var(--emerald-soft)' : 'rgba(167, 139, 250, 0.08)',
                    fontSize: '11.5px',
                  }}
                >
                  ⚡ {preset.name}
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetCatSimulator}
                className="btn-ghost"
                style={{ fontSize: '11.5px', color: 'var(--amber)' }}
              >
                ↺ Reset Path
              </button>
            </div>
          </div>

          {/* VISUAL DYNAMIC PATH BREADCRUMB */}
          <div
            id="cat-path-breadcrumb"
            className="card-subtle"
            style={{
              marginBottom: '16px',
              borderColor: 'rgba(167, 139, 250, 0.4)',
              background: 'rgba(17, 21, 34, 0.75)',
            }}
          >
            <div className="status-bar-row" style={{ marginBottom: '8px' }}>
              <span className="mono" style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 600 }}>
                ✦ VISUAL DYNAMIC PATH BREADCRUMB ({catVisitedIds.length} / 15 QUESTIONS + 3 MIND MOMENTS)
              </span>
              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Click any visited node to inspect or re-branch from that step
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {catBreadcrumbNodes.map((node, idx) => {
                if (node.kind === 'moment') {
                  return (
                    <React.Fragment key={node.slug}>
                      <span
                        className="status-pill sky mono"
                        style={{
                          fontSize: '10px',
                          padding: '4px 9px',
                          opacity: node.completed ? 1 : 0.7,
                        }}
                      >
                        🌊 {node.title}
                      </span>
                      {idx < catBreadcrumbNodes.length - 1 && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>➔</span>
                      )}
                    </React.Fragment>
                  );
                }

                const q = node.question;
                const isCurrent = q.id === currentCatQuestion.id;
                const tMeta = TIER_META[node.tier];
                return (
                  <React.Fragment key={`crumb-${q.id}-${node.qIndex}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setCatVisitedIds((prev) => prev.slice(0, node.qIndex + 1));
                        setMorphInspectQuestionId(q.id);
                      }}
                      className={`status-pill ${tMeta.badgeClass} mono`}
                      style={{
                        cursor: 'pointer',
                        fontSize: '10.5px',
                        padding: '4px 10px',
                        outline: isCurrent ? '2px solid #ffffff' : 'none',
                      }}
                      title={`${q.calm_theme}: "${q.text}"`}
                    >
                      #{node.qIndex + 1} Q#{q.id} ({q.domain}·{node.tier.replace('_', ' ')})
                      {node.answer !== undefined ? ` [=${node.answer}]` : ''}
                    </button>
                    {idx < catBreadcrumbNodes.length - 1 && (
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>➔</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 2-COLUMN LIVE CAT WORKBENCH: Interactive Question + Live Domain Posteriors */}
          <div className="grid-2col" style={{ marginBottom: '18px' }}>
            {/* LEFT: Active Interactive Question Stage + Why the Engine Selected This Question */}
            <div
              className="card-subtle"
              style={{
                borderColor: 'rgba(52, 211, 153, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div className="status-bar-row" style={{ marginBottom: '8px' }}>
                  <span className="status-pill emerald mono">
                    STEP {String(catVisitedIds.length).padStart(2, '0')} / 15 · Q#{currentCatQuestion.id} ({currentCatQuestion.domain})
                  </span>
                  <span className="status-pill accent mono">
                    Tier: {resolveItemTier(currentCatQuestion)} · 2PL a={currentCatQuestion.irt_a} b={currentCatQuestion.irt_b}
                  </span>
                </div>

                {/* Why the Engine Selected This Question */}
                <div
                  id="cat-selection-reason-box"
                  style={{
                    background: 'rgba(167, 139, 250, 0.1)',
                    border: '1px solid rgba(167, 139, 250, 0.35)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    marginBottom: '12px',
                  }}
                >
                  <div className="mono" style={{ fontSize: '10.5px', color: '#c4b5fd', fontWeight: 600 }}>
                    ✦ WHY THE CAT ENGINE SELECTED Q#{currentCatQuestion.id} ({getQuestionSlug(currentCatQuestion)}):
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '3px' }}>
                    {catVisitedIds.length === 1
                      ? 'Root Cortical Prior Anchor (Q#1 · Domain O Intellect) initializes the adaptive assessment tree.'
                      : currentCatSelection.selectionReason}
                  </div>
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--sky)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {morphQuestionForContext(currentCatQuestion, morphContext).morphedTheme}
                </div>

                <h3
                  className="serif"
                  style={{ fontSize: '23px', lineHeight: 1.3, color: 'var(--text)', marginBottom: '14px' }}
                >
                  “{morphQuestionForContext(currentCatQuestion, morphContext).morphedText}”
                </h3>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Click a Likert response (1..5) to answer Q#{currentCatQuestion.id} and branch to the next adaptive item:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {morphQuestionForContext(currentCatQuestion, morphContext).likertLabels.map((opt) => {
                    const isPicked = catResponses[currentCatQuestion.id] === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleCatAnswerAndStep(opt.val)}
                        className="btn-ghost"
                        style={{
                          flexDirection: 'column',
                          padding: '10px 6px',
                          borderColor: isPicked ? 'var(--emerald)' : 'var(--border)',
                          background: isPicked ? 'var(--emerald-soft)' : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <strong className="mono" style={{ fontSize: '14px', color: 'var(--emerald)' }}>
                          {opt.val}
                        </strong>
                        <span style={{ fontSize: '10.5px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Live Bayesian Domain Posteriors & Uncertainty Bars (θ_d ± SE_d) */}
            <div
              id="cat-posteriors-panel"
              className="card-subtle"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
            >
              <div className="status-bar-row" style={{ marginBottom: '10px' }}>
                <span className="mono" style={{ fontSize: '11.5px', color: 'var(--sky)', fontWeight: 600 }}>
                  ✦ LIVE BAYESIAN DOMAIN POSTERIORS (θ̂_d ± SE_d)
                </span>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                  Remaining Pool: {nextCatPreview.remainingCount} / {nextCatPreview.poolSize} items
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {DOMAIN_LIST.map((dom) => {
                  const post = nextCatPreview.domainPosteriors[dom];
                  const lowPct = Math.max(2, post.percentile - post.se);
                  const highPct = Math.min(98, post.percentile + post.se);
                  return (
                    <div
                      key={dom}
                      style={{
                        background: 'rgba(0,0,0,0.32)',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="status-bar-row" style={{ marginBottom: '5px', fontSize: '12px' }}>
                        <span>
                          <strong className="mono" style={{ color: 'var(--accent)' }}>
                            {dom}
                          </strong>{' '}
                          · {CALM_DIMENSION_LABELS[dom]?.name}
                        </span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)' }}>
                          θ={post.theta >= 0 ? `+${post.theta.toFixed(2)}` : post.theta.toFixed(2)} ·{' '}
                          {post.percentile}% (±{post.se}% SE · n={post.answered_count} · ΣI={post.fisher_info_sum})
                        </span>
                      </div>

                      {/* Uncertainty Band + Point Estimate Bar */}
                      <div
                        style={{
                          position: 'relative',
                          height: '9px',
                          borderRadius: '999px',
                          background: 'rgba(255,255,255,0.07)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: `${lowPct}%`,
                            width: `${Math.max(4, highPct - lowPct)}%`,
                            top: 0,
                            bottom: 0,
                            background: 'rgba(56, 189, 248, 0.28)',
                            borderRadius: '999px',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            width: `${post.percentile}%`,
                            top: '2px',
                            bottom: '2px',
                            background: 'linear-gradient(90deg, #8b5cf6, #34d399)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TOP 6 NEXT-QUESTION CANDIDATES LEADERBOARD */}
          <div
            id="cat-candidates-leaderboard"
            className="card-subtle"
            style={{
              marginBottom: '18px',
              borderColor: 'rgba(251, 191, 36, 0.4)',
            }}
          >
            <div className="status-bar-row" style={{ marginBottom: '10px' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--amber)', fontWeight: 600 }}>
                ✦ TOP 6 NEXT-QUESTION CANDIDATES LEADERBOARD (FROM {nextCatPreview.poolSize}-ITEM POOL)
              </span>
              <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Utility = I(θ)×Uncertainty + BranchTrigger + StageBonus + TelemetryPrior
              </span>
            </div>

            <div className="grid-3col">
              {nextCatPreview.topCandidates.map((cand, rankIdx) => {
                const tMeta = TIER_META[resolveItemTier(cand.item)];
                return (
                  <div
                    key={cand.item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '11px',
                      background:
                        rankIdx === 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.025)',
                      border:
                        rankIdx === 0
                          ? '1px solid rgba(52, 211, 153, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div>
                      <div className="status-bar-row" style={{ marginBottom: '4px' }}>
                        <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: rankIdx === 0 ? 'var(--emerald)' : 'var(--text)' }}>
                          #{rankIdx + 1} · Q#{cand.item.id} ({cand.item.domain})
                        </span>
                        <span className={`status-pill ${tMeta.badgeClass} mono`} style={{ fontSize: '9.5px', padding: '1px 7px' }}>
                          Utility {cand.total_utility.toFixed(2)}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        “{cand.item.text}”
                      </p>
                    </div>

                    <div className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '5px' }}>
                      <div>
                        Fisher I(θ)={cand.fisher_info.toFixed(2)} · Unc×{cand.uncertainty_weight.toFixed(2)} · Tier=
                        {resolveItemTier(cand.item)}
                      </div>
                      {cand.branch_triggered && (
                        <div style={{ color: 'var(--amber)', fontWeight: 600 }}>
                          ★ Triggered: {cand.trigger_description} (+{cand.branch_bonus})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LLM CONTEXTUAL MORPHING & DIF DE-BIASING LAB (INTEGRATED IN TAB 2) */}
          <div
            id="studio-dif-morphing-lab"
            className="card-subtle"
            style={{
              marginBottom: '18px',
              borderColor: 'rgba(56, 189, 248, 0.5)',
              background: 'rgba(56, 189, 248, 0.05)',
            }}
          >
            <div className="status-bar-row" style={{ marginBottom: '10px' }}>
              <div>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 600 }}>
                  🌍 LLM CONTEXTUAL MORPHING &amp; DIF (DIFFERENTIAL ITEM FUNCTIONING) DE-BIASING LAB
                </span>
                <h3 style={{ fontSize: '15.5px', fontWeight: 600, marginTop: '2px' }}>
                  Personalize Age, Socioeconomic / Work Reality, Locale &amp; Language While Holding 2PL IRT (a, b) Invariant
                </h3>
              </div>

              <select
                id="dif-select-question"
                value={morphTargetQuestion.id}
                onChange={(e) => setMorphInspectQuestionId(Number(e.target.value))}
                className="clean-select"
                style={{ width: '280px' }}
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    Q#{q.id} ({q.domain}) · {q.calm_theme}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-3col" style={{ marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Socioeconomic / Everyday Work Reality
                </label>
                <select
                  id="dif-select-life"
                  value={morphContext.lifeContext}
                  onChange={(e) =>
                    setMorphContext((prev) => ({
                      ...prev,
                      lifeContext: e.target.value as LifeContext,
                    }))
                  }
                  className="clean-select"
                >
                  {LIFE_CONTEXT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Age Season &amp; Geographic Setting
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <select
                    id="dif-select-age"
                    value={morphContext.ageBand}
                    onChange={(e) =>
                      setMorphContext((prev) => ({
                        ...prev,
                        ageBand: e.target.value as AgeBand,
                      }))
                    }
                    className="clean-select"
                  >
                    {AGE_BAND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    id="dif-select-locale"
                    value={morphContext.locale}
                    onChange={(e) =>
                      setMorphContext((prev) => ({
                        ...prev,
                        locale: e.target.value as LocaleSetting,
                      }))
                    }
                    className="clean-select"
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.short}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Language (Cross-Lingual IRT Equivalence)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        setMorphContext((prev) => ({
                          ...prev,
                          language: lang.id as SupportedLanguage,
                        }))
                      }
                      className="btn-ghost"
                      style={{
                        flex: 1,
                        borderColor:
                          morphContext.language === lang.id ? 'var(--sky)' : 'var(--border)',
                        background:
                          morphContext.language === lang.id ? 'var(--sky-soft)' : undefined,
                      }}
                    >
                      {lang.flag} · {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid-2col">
              <div
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  padding: '12px 14px',
                  borderRadius: '11px',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  CANONICAL ANCHOR PROMPT · Q#{morphTargetQuestion.id} ({morphTargetQuestion.calm_theme})
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  “{morphTargetQuestion.text}”
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(52, 211, 153, 0.08)',
                  padding: '12px 14px',
                  borderRadius: '11px',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                }}
              >
                <div className="status-bar-row" style={{ marginBottom: '4px' }}>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--emerald)', fontWeight: 600 }}>
                    MORPHED FOR [{morphPreviewResult.contextBadge}] · THEME: {morphPreviewResult.morphedTheme}
                  </span>
                  <span className="mono" style={{ fontSize: '10px', color: '#c4b5fd' }}>
                    IRT Invariant: a={morphTargetQuestion.irt_a}, b={morphTargetQuestion.irt_b}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.45, marginBottom: '6px' }}>
                  “{morphPreviewResult.morphedText}”
                </p>
                <div className="mono" style={{ fontSize: '10.5px', color: 'var(--sky)' }}>
                  DIF Audit: {morphPreviewResult.difNote}
                </div>
              </div>
            </div>
          </div>

          {/* FLOWS & MONTE CARLO COHORT SIMULATION SECTION */}
          <div
            className="status-bar-row"
            style={{
              marginBottom: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 600 }}>
                Saved Assessment Flows &amp; 50-User Monte Carlo Cohort Simulation
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                id="btn-studio-simulate-cohort"
                type="button"
                onClick={() => handleRunSimulation()}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  borderColor: 'rgba(52, 211, 153, 0.5)',
                }}
              >
                {isSimulating
                  ? 'Simulating 50 Users…'
                  : '▶ Run Cohort Simulation (50 Synthetic Users)'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewFlowForm(!showNewFlowForm)}
                className="btn-ghost"
              >
                {showNewFlowForm ? 'Cancel' : '＋ New Flow'}
              </button>
            </div>
          </div>

          {showNewFlowForm && (
            <form
              onSubmit={handleCreateNewFlow}
              className="card-subtle"
              style={{
                marginBottom: '16px',
                borderColor: 'rgba(167, 139, 250, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div className="grid-2col">
                <input
                  type="text"
                  placeholder="Flow Name (e.g., Kae's Evening Unwind Flow)"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  className="clean-input"
                />
                <input
                  type="text"
                  placeholder="Short description of hypothesis or target audience"
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  className="clean-input"
                />
              </div>
              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>
                Create Flow
              </button>
            </form>
          )}

          {/* Flow Selector Cards */}
          <div className="grid-3col" style={{ marginBottom: '16px' }}>
            {flows.map((f) => {
              const isSelected = selectedFlow?.id === f.id;
              const isLive = f.id === activeFlowId || f.is_active;
              return (
                <div
                  key={f.id}
                  onClick={() => handleSelectFlow(f.id)}
                  className="card-subtle"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected
                      ? 'rgba(167, 139, 250, 0.65)'
                      : isLive
                      ? 'rgba(52, 211, 153, 0.4)'
                      : 'var(--border)',
                  }}
                >
                  <div className="status-bar-row" style={{ marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13.5px' }}>{f.name}</strong>
                    {isLive && (
                      <span className="status-pill emerald" style={{ fontSize: '10px' }}>
                        ● Active
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {f.description}
                  </p>
                  {!isLive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivateFlow(f.id);
                      }}
                      className="btn-ghost"
                      style={{ width: '100%', fontSize: '11px', color: 'var(--emerald)' }}
                    >
                      Set Active on Consumer Site
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selectedFlow && (
            <div className="grid-2col" style={{ marginBottom: '16px' }}>
              <div className="card-subtle" style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--amber)', marginBottom: '8px' }}>
                  ✦ Conditional Branch Rules for “{selectedFlow.name}”
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {selectedFlow.branches.map((br) => (
                    <div
                      key={br.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                      }}
                    >
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)' }}>
                        IF Q#{br.if_question_id} {br.operator} {br.threshold} ➔ Q#{br.then_goto_question_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranchRule(br.id)}
                        className="btn-ghost"
                        style={{ padding: '2px 8px', fontSize: '10.5px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <form id="studio-add-branch-form" onSubmit={handleAddBranchRule} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <select
                    id="branch-if-q"
                    value={branchIfQ}
                    onChange={(e) => setBranchIfQ(Number(e.target.value))}
                    className="clean-select"
                    style={{ width: '120px', fontSize: '11px', padding: '6px' }}
                  >
                    {questions.slice(0, 40).map((q) => (
                      <option key={q.id} value={q.id}>
                        IF Q#{q.id}
                      </option>
                    ))}
                  </select>
                  <select
                    id="branch-op"
                    value={branchOp}
                    onChange={(e) => setBranchOp(e.target.value as StudioBranchRule['operator'])}
                    className="clean-select"
                    style={{ width: '64px', fontSize: '11px', padding: '6px' }}
                  >
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                  </select>
                  <select
                    id="branch-thresh"
                    value={branchThresh}
                    onChange={(e) => setBranchThresh(Number(e.target.value))}
                    className="clean-select"
                    style={{ width: '70px', fontSize: '11px', padding: '6px' }}
                  >
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                  </select>
                  <select
                    id="branch-goto-q"
                    value={branchGotoQ}
                    onChange={(e) => setBranchGotoQ(Number(e.target.value))}
                    className="clean-select"
                    style={{ width: '130px', fontSize: '11px', padding: '6px' }}
                  >
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        ➔ Q#{q.id}
                      </option>
                    ))}
                  </select>
                  <button id="btn-studio-add-branch" type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                    ＋ Add Rule
                  </button>
                </form>
              </div>

              <div className="card-subtle" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sky)', marginBottom: '6px' }}>
                  ✦ Interleaved Flow Sequence ({interleavedFlowSequence.length} Steps)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {interleavedFlowSequence.slice(0, 18).map((item) => (
                    <div key={item.slug} className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Step {String(item.stepNumber).padStart(2, '0')} · {item.slug}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {simResult && (
            <div
              id="studio-simulation-results"
              className="card-subtle"
              style={{
                borderColor: 'rgba(52, 211, 153, 0.5)',
                background: 'rgba(52, 211, 153, 0.06)',
              }}
            >
              <div className="status-bar-row" style={{ marginBottom: '10px' }}>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>
                  ● MONTE CARLO COHORT SIMULATION ({simResult.synthetic_cohort_size} SYNTHETIC USERS)
                </span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Flow: {simResult.flow_name} · {simResult.timestamp}
                </span>
              </div>
              <div className="grid-3col">
                <div className="card-subtle">
                  <strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Branch Trigger Rates
                  </strong>
                  {simResult.branch_trigger_rates.map((b) => (
                    <div key={b.rule_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span className="mono">{b.description}</span>
                      <strong style={{ color: 'var(--amber)' }}>{b.trigger_rate_pct}%</strong>
                    </div>
                  ))}
                </div>
                <div className="card-subtle">
                  <strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Natural Rhythm Distribution
                  </strong>
                  {simResult.discovered_rhythm_distribution.map((r) => (
                    <div key={r.mask_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>{r.calm_title}</span>
                      <strong className="mono" style={{ color: 'var(--emerald)' }}>{r.pct}%</strong>
                    </div>
                  ))}
                </div>
                <div className="card-subtle">
                  <strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Shadow Empirical Correlations
                  </strong>
                  {simResult.shadow_empirical_correlations.slice(0, 5).map((sc) => (
                    <div key={sc.question_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Q#{sc.question_id} ({sc.domain})</span>
                      <span className="mono" style={{ color: '#c4b5fd' }}>r={sc.observed_r_anchor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SCIENCE, DIF DE-BIASING EQUATIONS & SHADOW CALIBRATION MATRIX  */}
      {/* ===================================================================== */}
      {activeStudioTab === 'science' && (
        <section id="studio-panel-science" className="studio-panel">
          <div
            className="card-subtle"
            style={{
              marginBottom: '18px',
              borderColor: 'rgba(167, 139, 250, 0.42)',
              background: 'rgba(167, 139, 250, 0.05)',
            }}
          >
            <div className="mono" style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '6px' }}>
              3-LAYER BLIND EPISTEMIC SOURCE SEPARATION + CAT &amp; DIF INVARIANCE EQUATIONS
            </div>
            <div
              className="mono"
              style={{
                fontSize: '13.5px',
                color: 'var(--emerald)',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '10px',
                marginBottom: '8px',
                overflowX: 'auto',
              }}
            >
              y_raw = B_wiring(mask) + ΔP_unique + S_state(t) - ΔO_aphantasia(telemetry) · I_i(θ̂_d) = a_i² P_i(θ̂_d)[1 - P_i(θ̂_d)]
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Separates neurodevelopmental rhythm priors (<code className="mono">B_wiring(mask)</code>) and
              2-week allostatic fatigue (<code className="mono">S_state(t)</code>) from true personal
              divergences (<code className="mono">ΔP_unique</code>), while our LLM Contextual Morphing Engine
              projects surface wording onto the user’s socioeconomic, age, geographic, and linguistic frame
              so Differential Item Functioning bias <code className="mono">Δb_DIF → 0</code>.
            </p>
          </div>

          {/* 5 Neurodevelopmental Rhythm Masks */}
          <div style={{ marginBottom: '20px' }}>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--sky)', marginBottom: '10px' }}>
              5 NEURODEVELOPMENTAL RHYTHM MASKS (B_WIRING PRIOR OFFSETS &amp; DOUBLE-DISSOCIATION GATING)
            </div>
            <div className="grid-2col">
              {AURA_SCIENCE_BUNDLE.masks_schema.masks.map((m) => (
                <div
                  key={m.id}
                  className="card-subtle"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.28)' }}
                >
                  <div className="status-bar-row" style={{ marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {m.calm_title} ({m.name})
                    </strong>
                    <span className="status-pill sky" style={{ fontSize: '10px' }}>
                      {m.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {m.neural_mechanism}
                  </p>
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      color: '#c4b5fd',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    Prior Offsets (B_wiring): O:{m.prior_offsets.O >= 0 ? `+${m.prior_offsets.O}` : m.prior_offsets.O} · C:
                    {m.prior_offsets.C >= 0 ? `+${m.prior_offsets.C}` : m.prior_offsets.C} · E:
                    {m.prior_offsets.E >= 0 ? `+${m.prior_offsets.E}` : m.prior_offsets.E} · A:
                    {m.prior_offsets.A >= 0 ? `+${m.prior_offsets.A}` : m.prior_offsets.A} · N:
                    {m.prior_offsets.N >= 0 ? `+${m.prior_offsets.N}` : m.prior_offsets.N}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAPA Shadow-Item Empirical Calibration Matrix */}
          <div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--amber)', marginBottom: '10px' }}>
              SAPA SHADOW-ITEM EMPIRICAL CALIBRATION MATRIX (SNEAKY EVERYDAY HABITS · w=0)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {shadowMatrix.map((row) => (
                <div
                  key={row.question_id}
                  className="card-subtle"
                  style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}
                >
                  <div className="status-bar-row" style={{ marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Q#{row.question_id} · {row.short_name}
                    </strong>
                    <span
                      className={`status-pill ${
                        row.promotion_readiness === 'Ready for Anchor Promotion' ? 'emerald' : 'amber'
                      }`}
                    >
                      {row.promotion_readiness} (N={row.sample_n})
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {row.hypothesis}
                  </p>
                  <div
                    className="mono grid-3col"
                    style={{
                      fontSize: '11.5px',
                      background: 'rgba(0,0,0,0.32)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Anchor {row.target_domain}: </span>
                      <strong style={{ color: '#c4b5fd' }}>
                        r = {row.r_with_anchor_domain > 0 ? `+${row.r_with_anchor_domain}` : row.r_with_anchor_domain}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>{row.target_probe}: </span>
                      <strong style={{ color: 'var(--emerald)' }}>r = +{row.r_with_epistemic_probe}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Telemetry: </span>
                      <strong style={{ color: 'var(--sky)' }}>{row.r_with_mind_moment}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: 28 RESEARCH PDFs & AGENT API                                   */}
      {/* ===================================================================== */}
      {activeStudioTab === 'pdfs' && (
        <section id="studio-panel-pdfs" className="studio-panel">
          <div
            id="kae-agent-manifest-card"
            className="card-subtle"
            style={{
              marginBottom: '20px',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              background: 'rgba(56, 189, 248, 0.06)',
            }}
          >
            <div className="status-bar-row" style={{ marginBottom: '10px' }}>
              <div>
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--sky)', fontWeight: 600 }}>
                  LOCAL AI-AGENT QUICKSTART PANEL · REST &amp; OPENAPI CONTROL PLANE
                </span>
                <h3 className="serif" style={{ fontSize: '22px', marginTop: '2px' }}>
                  Collaborate with Kae’s Local AI Coding &amp; Research Agent
                </h3>
              </div>
              <button type="button" onClick={handleCopyAgentPrompt} className="btn-primary">
                Copy Prompt for Kae’s AI Agent
              </button>
            </div>

            <div className="grid-2col mono" style={{ fontSize: '11px' }}>
              <div style={{ background: 'rgba(0,0,0,0.38)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: 'var(--emerald)', marginBottom: '4px' }}>
                  POST /api/v1/assessment/next-item
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                  2PL IRT Fisher Information CAT selector over the 120-item tree with parent_trigger rules.
                </div>
                <div style={{ color: 'var(--emerald)', marginBottom: '4px' }}>
                  GET /api/v1/studio/overview
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  Fetches all 120+ SQLite questions, flows, masks, live shadow Pearson r, and 28 PDFs.
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.38)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: 'var(--amber)', marginBottom: '4px' }}>
                  POST /api/v1/studio/questions · POST /api/v1/studio/flows
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Upserts branch_probe, deep_resolution, and everyday_moment items to SQLite.
                </div>
                <div style={{ color: 'var(--sky)', marginBottom: '4px' }}>
                  POST /api/v1/agent/simulate
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  Runs N=50..500 synthetic Monte Carlo users across all 5 neurodevelopmental masks.
                </div>
              </div>
            </div>
          </div>

          <div className="mono" style={{ fontSize: '11px', color: 'var(--emerald)', marginBottom: '10px' }}>
            GROUNDING ARXIV &amp; NEUROSCIENCE CORPUS ({totalPapersCount} VERIFIED FULL-TEXT PDFs)
          </div>

          <div className="grid-2col">
            {(AURA_SCIENCE_BUNDLE.papers_corpus || []).map((cat) => (
              <div
                key={cat.domain_dir}
                className="card-subtle"
                style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}
              >
                <div className="status-bar-row" style={{ marginBottom: '10px' }}>
                  <span className="mono" style={{ fontSize: '11.5px', color: 'var(--emerald)', fontWeight: 600 }}>
                    science/papers/{cat.domain_dir}/
                  </span>
                  <span className="status-pill emerald" style={{ fontSize: '10px' }}>
                    {cat.paper_count} Verified PDFs
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cat.papers.map((p) => (
                    <div
                      key={p.filename}
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                        paddingLeft: '10px',
                        borderLeft: '2px solid rgba(167, 139, 250, 0.4)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <strong style={{ color: 'var(--text)', display: 'block' }}>{p.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>
                        {p.authors.slice(0, 3).join(', ')}
                        {p.authors.length > 3 ? ' et al.' : ''} ({p.year}) · {p.identifier}
                      </span>
                      <a
                        href={resolveApiUrl(`/api/v1/science/pdf/${cat.domain_dir}/${p.filename}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--accent)',
                          textDecoration: 'underline',
                          display: 'inline-block',
                          marginTop: '2px',
                        }}
                      >
                        {p.filename} ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Always render #lab-items-list for backwards-compatible DOM checks */}
      <div
        id="lab-items-list"
        style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
        }}
      >
        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--emerald)' }}>
          VERIFIED CORPUS SUMMARY: {totalPapersCount} FULL-TEXT PDFs ACROSS 4 DIRECTORIES ·{' '}
          {questions.length} ITEMS IN CAT POOL
        </span>
        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
          Aura Studio v5.0 · 120-Item Dynamic CAT + Contextual DIF De-Biasing Ready
        </span>
      </div>

      {toastMsg && (
        <div className="toast-banner" role="status">
          ✦ {toastMsg}
        </div>
      )}
    </div>
  );
};

export const App = StudioApp;
export default StudioApp;
