import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  CohortSimulationResult,
  DomainKey,
  ItemBankQuestion,
  ShadowCalibrationRow,
  StudioBranchRule,
  StudioFlow,
} from './types/aura';

type StudioTab = 'questions' | 'flows' | 'science' | 'pdfs';
type QuestionFilter = 'all' | 'anchors' | 'shadows';

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

export const App: React.FC = () => {
  const initialUrl = useMemo(() => parseUrlState(), []);
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>(initialUrl.tab);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(initialUrl.flow);

  const [questions, setQuestions] = useState<ItemBankQuestion[]>(
    AURA_SCIENCE_BUNDLE.item_bank_schema.items
  );
  const [flows, setFlows] = useState<StudioFlow[]>(INITIAL_STUDIO_FLOWS);
  const [activeFlowId, setActiveFlowId] = useState<string>('core_calm_12');
  const [shadowMatrix, setShadowMatrix] = useState<ShadowCalibrationRow[]>(
    INITIAL_SHADOW_CALIBRATION_MATRIX
  );
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tab 1: Questions filter & Add Question form
  const [qFilter, setQFilter] = useState<QuestionFilter>('all');
  const [showAddQForm, setShowAddQForm] = useState<boolean>(false);
  const [newQText, setNewQText] = useState<string>('');
  const [newQTheme, setNewQTheme] = useState<string>('Everyday habit');
  const [newQDomain, setNewQDomain] = useState<DomainKey>('C');
  const [newQProbe, setNewQProbe] = useState<string>('sneaky_open_loops');
  const [newQStatus, setNewQStatus] = useState<'shadow_candidate' | 'calibrated_anchor'>(
    'shadow_candidate'
  );
  const [newQDirection, setNewQDirection] = useState<number>(-1);
  const [newQHypothesis, setNewQHypothesis] = useState<string>('');

  // Tab 2: New Flow & Conditional Branch form
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

  // Cohort Simulation state
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

  const selectedFlow = useMemo(() => {
    return (
      flows.find((f) => f.id === selectedFlowId) ||
      flows.find((f) => f.id === activeFlowId) ||
      flows[0]
    );
  }, [flows, selectedFlowId, activeFlowId]);

  const anchorCount = useMemo(
    () =>
      questions.filter(
        (q) => q.calibration_status !== 'shadow_candidate' && Number(q.weight) > 0
      ).length,
    [questions]
  );
  const shadowCount = useMemo(
    () =>
      questions.filter(
        (q) => q.calibration_status === 'shadow_candidate' || Number(q.weight) === 0
      ).length,
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    if (qFilter === 'anchors') {
      return questions.filter(
        (q) => q.calibration_status !== 'shadow_candidate' && Number(q.weight) > 0
      );
    }
    if (qFilter === 'shadows') {
      return questions.filter(
        (q) => q.calibration_status === 'shadow_candidate' || Number(q.weight) === 0
      );
    }
    return questions;
  }, [questions, qFilter]);

  // Build the interleaved sequence of questions + 3 Mind Moments for the selected flow
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

  const handleSaveNewQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      showToast('Please enter a question prompt first');
      return;
    }
    const created = await AuraAPI.addStudioQuestion({
      text: newQText,
      calm_theme: newQTheme,
      domain: newQDomain,
      probe_type: newQProbe,
      calibration_status: newQStatus,
      direction: newQDirection,
      scientific_hypothesis: newQHypothesis,
    });
    await refreshStudioData();
    setNewQText('');
    setNewQHypothesis('');
    setShowAddQForm(false);
    showToast(
      `Saved Q#${created.id} (${getQuestionSlug(created)}) to SQLite Item Bank`
    );
  };

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
      question_ids: questions.map((q) => q.id),
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
      `1. Read the machine-readable Agent Manifest & Science Schema: GET ${resolveApiUrl('/api/v1/agent/manifest')} (and OpenAPI docs at ${resolveApiUrl('/docs')}).`,
      `2. Inspect current questions, experimental flows, and SAPA shadow calibration: GET ${resolveApiUrl('/api/v1/studio/overview')}.`,
      `3. Add disarming behavioral shadow questions (weight w=0.0, calibration_status="shadow_candidate"): POST ${resolveApiUrl('/api/v1/studio/questions')}.`,
      `4. Create or update conditional branching flows: POST ${resolveApiUrl('/api/v1/studio/flows')} and activate via POST ${resolveApiUrl('/api/v1/studio/flows/{flow_id}/activate')}.`,
      `5. Run 50-user synthetic Monte Carlo cohort simulations to verify branch trigger rates & IRT Fisher Information before deploying: POST ${resolveApiUrl('/api/v1/agent/simulate')}.`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText).catch(() => {});
    }
    showToast("Copied API prompt for Kae's AI Agent!");
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="status-pill accent">STANDALONE RESEARCH WORKBENCH</span>
            <span className={`status-pill ${backendConnected ? 'emerald' : 'amber'}`}>
              ● {backendConnected ? 'SQLite + FastAPI Connected' : 'Edge Sandbox Mode (Auto-Sync)'}
            </span>
            <span className="status-pill">
              {questions.length} Questions: {anchorCount} Anchors · {shadowCount} Shadow w=0
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
              Aura Studio · Kae &amp; Conner Research Admin
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Standalone psychometric CMS, SQLite item bank editor, interleaved Mind Moments flow
              builder, and SAPA <code className="mono" style={{ color: 'var(--amber)' }}>w=0</code>{' '}
              shadow calibration workbench.
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
          <span>1. Questions DB ({questions.length})</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            {anchorCount} Anchors · {shadowCount} Shadow w=0
          </span>
        </button>

        <button
          id="studio-pill-flows"
          type="button"
          onClick={() => handleSelectTab('flows')}
          className={`studio-tab-btn ${activeStudioTab === 'flows' ? 'active' : ''}`}
        >
          <span>2. Flows &amp; Branching Builder ({flows.length})</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            Interleaved Mind Moments + Sim
          </span>
        </button>

        <button
          id="studio-pill-science"
          type="button"
          onClick={() => handleSelectTab('science')}
          className={`studio-tab-btn ${activeStudioTab === 'science' ? 'active' : ''}`}
        >
          <span>3. Science &amp; Shadow Calibration Matrix</span>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
            3-Layer Equation · 5 Rhythm Masks
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
      {/* TAB 1: QUESTIONS DB (15)                                              */}
      {/* ===================================================================== */}
      {activeStudioTab === 'questions' && (
        <section id="studio-panel-questions" className="studio-panel">
          <div
            className="status-bar-row"
            style={{
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600 }}>
                Item Bank in SQLite &amp; <code className="mono">item_bank_irt.json</code>
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Every question has its own deep-linkable URL slug (e.g.{' '}
                <code className="mono" style={{ color: 'var(--sky)' }}>
                  ?view=reflect&amp;step=q-01-deeper-patterns
                </code>
                ) and 2PL IRT parameters.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setQFilter('all')}
                className={`btn-ghost ${qFilter === 'all' ? 'active' : ''}`}
                style={{
                  borderColor: qFilter === 'all' ? 'var(--accent)' : 'var(--border)',
                  background: qFilter === 'all' ? 'var(--accent-soft)' : undefined,
                }}
              >
                All Items ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setQFilter('anchors')}
                className="btn-ghost"
                style={{
                  borderColor: qFilter === 'anchors' ? 'var(--emerald)' : 'var(--border)',
                  background: qFilter === 'anchors' ? 'var(--emerald-soft)' : undefined,
                }}
              >
                Core Calibrated Anchors ({anchorCount})
              </button>
              <button
                type="button"
                onClick={() => setQFilter('shadows')}
                className="btn-ghost"
                style={{
                  borderColor: qFilter === 'shadows' ? 'var(--amber)' : 'var(--border)',
                  background: qFilter === 'shadows' ? 'var(--amber-soft)' : undefined,
                }}
              >
                Sneaky Shadow Probes w=0 ({shadowCount})
              </button>

              <button
                id="btn-studio-open-add-q"
                type="button"
                onClick={() => setShowAddQForm(!showAddQForm)}
                className="btn-primary"
              >
                {showAddQForm ? 'Cancel' : '＋ Add New Question'}
              </button>
            </div>
          </div>

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
                ✦ Add New Question to Kae &amp; Conner’s SQLite Item Bank
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginBottom: '5px',
                  }}
                >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
                    Calibration Mode
                  </label>
                  <select
                    id="studio-select-q-status"
                    value={newQStatus}
                    onChange={(e) =>
                      setNewQStatus(
                        e.target.value as 'shadow_candidate' | 'calibrated_anchor'
                      )
                    }
                    className="clean-select"
                  >
                    <option value="shadow_candidate">Sneaky Shadow Candidate (w=0)</option>
                    <option value="calibrated_anchor">Calibrated Anchor (w=1.15)</option>
                  </select>
                </div>
              </div>

              <div className="grid-3col">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
                    Epistemic / Rhythm Probe Type
                  </label>
                  <select
                    value={newQProbe}
                    onChange={(e) => setNewQProbe(e.target.value)}
                    className="clean-select"
                  >
                    <option value="sneaky_open_loops">sneaky_open_loops (Salience / Tabs)</option>
                    <option value="sneaky_text_cushion">
                      sneaky_text_cushion (Allostatic Warmth)
                    </option>
                    <option value="sneaky_canceled_plans">
                      sneaky_canceled_plans (Transition Relief)
                    </option>
                    <option value="salience_vs_routine_split">
                      salience_vs_routine_split (Spark Rhythm)
                    </option>
                    <option value="acoustic_stream_split">
                      acoustic_stream_split (Deep-Current Rhythm)
                    </option>
                    <option value="valence_signal_gain">
                      valence_signal_gain (Finely Tuned Rhythm)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
                    Scoring Direction
                  </label>
                  <select
                    value={newQDirection}
                    onChange={(e) => setNewQDirection(Number(e.target.value))}
                    className="clean-select"
                  >
                    <option value={1}>+1 (Positive pole loading)</option>
                    <option value={-1}>-1 (Reverse / Split probe)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px',
                    }}
                  >
                    Scientific Hypothesis Note
                  </label>
                  <input
                    type="text"
                    placeholder="Ecological mechanism & expected r with anchor..."
                    value={newQHypothesis}
                    onChange={(e) => setNewQHypothesis(e.target.value)}
                    className="clean-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button id="btn-studio-save-q" type="submit" className="btn-primary">
                  Save Question to SQLite DB
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredQuestions.map((it) => {
              const isShadow =
                it.calibration_status === 'shadow_candidate' ||
                it.layer === 'shadow_behavioral_probe' ||
                Number(it.weight) === 0;
              const qSlug = getQuestionSlug(it);
              const stepUrl = resolveConsumerStepUrl(qSlug);
              return (
                <div
                  key={it.id}
                  className="card-subtle"
                  style={{
                    borderColor: isShadow
                      ? 'rgba(251, 191, 36, 0.38)'
                      : 'rgba(255, 255, 255, 0.09)',
                  }}
                >
                  <div
                    className="status-bar-row"
                    style={{ marginBottom: '6px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
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
                        className={`status-pill ${isShadow ? 'amber' : 'emerald'}`}
                        style={{ fontSize: '10.5px', padding: '2px 9px' }}
                      >
                        {isShadow ? 'Sneaky Shadow (w=0)' : 'Calibrated Anchor'}
                      </span>

                      <span
                        className="status-pill sky"
                        style={{ fontSize: '10.5px', padding: '2px 9px' }}
                      >
                        slug: {qSlug}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: '11px', color: 'var(--text-dim)' }}
                      >
                        2PL a={it.irt_a} · b={it.irt_b} · w={it.weight} · dir=
                        {it.direction > 0 ? '+1' : '-1'} · {it.calm_theme}
                      </span>
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
                      Probe:{' '}
                      <strong className="mono" style={{ color: 'var(--text-muted)' }}>
                        {it.probe_type || it.layer}
                      </strong>{' '}
                      · Aspect: {it.aspect}
                    </span>
                    {it.scientific_hypothesis && (
                      <span style={{ color: '#c4b5fd' }}>
                        Hypothesis: {it.scientific_hypothesis}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: FLOWS & BRANCHING BUILDER (3)                                  */}
      {/* ===================================================================== */}
      {activeStudioTab === 'flows' && (
        <section id="studio-panel-flows" className="studio-panel">
          <div
            className="status-bar-row"
            style={{
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600 }}>
                Assessment Flows, Interleaved Mind Moments &amp; Conditional Branching
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Select any flow to inspect its interleaved Mind Moments sequence, edit conditional{' '}
                <code className="mono">IF/THEN</code> branches, or run a 50-user Monte Carlo
                simulation.
              </p>
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
                style={{ color: '#c4b5fd', borderColor: 'rgba(167, 139, 250, 0.4)' }}
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
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#c4b5fd' }}>
                ✦ Create New Experimental Assessment Flow
              </div>
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
              <button
                type="submit"
                className="btn-primary"
                style={{ alignSelf: 'flex-end' }}
              >
                Create Flow
              </button>
            </form>
          )}

          {/* Flow Selector Cards */}
          <div className="grid-3col" style={{ marginBottom: '18px' }}>
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
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: isSelected
                      ? 'rgba(167, 139, 250, 0.65)'
                      : isLive
                      ? 'rgba(52, 211, 153, 0.4)'
                      : 'var(--border)',
                    background: isSelected
                      ? 'rgba(167, 139, 250, 0.1)'
                      : 'rgba(255, 255, 255, 0.025)',
                  }}
                >
                  <div>
                    <div
                      className="status-bar-row"
                      style={{ marginBottom: '6px' }}
                    >
                      <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                        {f.name}
                      </strong>
                      {isLive && (
                        <span className="status-pill emerald" style={{ fontSize: '10px' }}>
                          ● Active on Consumer Site
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                        marginBottom: '10px',
                      }}
                    >
                      {f.description}
                    </p>
                  </div>

                  <div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-dim)',
                        marginBottom: '8px',
                      }}
                    >
                      ID: {f.id} · {f.question_ids.length} Questions · {f.branches.length} Branches
                      · 3 Mind Moments
                    </div>

                    {!isLive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateFlow(f.id);
                        }}
                        className="btn-ghost"
                        style={{
                          width: '100%',
                          color: 'var(--emerald)',
                          borderColor: 'rgba(52, 211, 153, 0.4)',
                        }}
                      >
                        Set Active on Consumer Site
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Flow Builder: 2-Column Desktop Layout (Branching Rules + Interleaved Step Sequence) */}
          {selectedFlow && (
            <div className="grid-2col" style={{ marginBottom: '18px' }}>
              {/* Left Column: Visual Conditional Branching Rule Builder */}
              <div
                className="card-subtle"
                style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}
              >
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--amber)',
                    marginBottom: '8px',
                  }}
                >
                  ✦ Conditional Branch Rules for “{selectedFlow.name}”
                </div>

                {selectedFlow.branches.length === 0 ? (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-dim)',
                      marginBottom: '12px',
                    }}
                  >
                    No conditional branch rules yet (runs linearly with interleaved Mind Moments).
                    Add a rule below to dynamically route users into targeted shadow probes!
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    {selectedFlow.branches.map((br) => (
                      <div
                        key={br.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div>
                          <div
                            className="mono"
                            style={{ fontSize: '11.5px', color: 'var(--emerald)', fontWeight: 600 }}
                          >
                            IF [Question #{br.if_question_id}] [{br.operator} {br.threshold}] ➔ THEN
                            Branch to [Question #{br.then_goto_question_id}]
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            {br.rationale}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchRule(br.id)}
                          className="btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  id="studio-add-branch-form"
                  onSubmit={handleAddBranchRule}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                    ＋ Add Conditional Branch Rule
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 0.65fr 0.8fr 1.2fr',
                      gap: '6px',
                    }}
                  >
                    <select
                      id="branch-if-q"
                      value={branchIfQ}
                      onChange={(e) => setBranchIfQ(Number(e.target.value))}
                      className="clean-select"
                      style={{ fontSize: '11.5px', padding: '7px' }}
                    >
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          IF Q#{q.id}: {q.calm_theme}
                        </option>
                      ))}
                    </select>
                    <select
                      id="branch-op"
                      value={branchOp}
                      onChange={(e) =>
                        setBranchOp(e.target.value as StudioBranchRule['operator'])
                      }
                      className="clean-select"
                      style={{ fontSize: '11.5px', padding: '7px' }}
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
                      style={{ fontSize: '11.5px', padding: '7px' }}
                    >
                      <option value={4}>4 (Often me)</option>
                      <option value={5}>5 (Very much)</option>
                      <option value={3}>3 (Sometimes)</option>
                      <option value={2}>2 (Rarely)</option>
                      <option value={1}>1 (Not like me)</option>
                    </select>
                    <select
                      id="branch-goto-q"
                      value={branchGotoQ}
                      onChange={(e) => setBranchGotoQ(Number(e.target.value))}
                      className="clean-select"
                      style={{ fontSize: '11.5px', padding: '7px' }}
                    >
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          ➔ Go to Q#{q.id}: {q.calm_theme}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={branchRationale}
                      onChange={(e) => setBranchRationale(e.target.value)}
                      placeholder="Scientific rationale for this branch..."
                      className="clean-input"
                      style={{ fontSize: '12px', padding: '8px 10px' }}
                    />
                    <button
                      id="btn-studio-add-branch"
                      type="submit"
                      className="btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      ＋ Add Branch Rule
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: End-to-End Interleaved Flow Sequence (Questions + 3 Mind Moments + Step URLs) */}
              <div
                className="card-subtle"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.35)',
                  maxHeight: '460px',
                  overflowY: 'auto',
                }}
              >
                <div
                  className="status-bar-row"
                  style={{ marginBottom: '8px' }}
                >
                  <span
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: 'var(--sky)',
                    }}
                  >
                    ✦ End-to-End Interleaved Sequence ({interleavedFlowSequence.length} Steps)
                  </span>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    Q1..Q4 ➔ Still Water ➔ Q5..Q8 ➔ Night Sky ➔ Q9.. ➔ Inner Canvas
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {interleavedFlowSequence.map((item) => {
                    const stepUrl = resolveConsumerStepUrl(item.slug);
                    if (item.kind === 'moment') {
                      return (
                        <div
                          key={item.slug}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: 'rgba(56, 189, 248, 0.11)',
                            border: '1px solid rgba(56, 189, 248, 0.38)',
                          }}
                        >
                          <div>
                            <div
                              className="mono"
                              style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 600 }}
                            >
                              Step {String(item.stepNumber).padStart(2, '0')} · INTERLUDE ·{' '}
                              {item.moment.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              slug: <code className="mono">{item.slug}</code> ·{' '}
                              {item.moment.telemetry_channel}
                            </div>
                          </div>
                          <a
                            href={stepUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                            style={{
                              padding: '4px 9px',
                              fontSize: '10.5px',
                              color: 'var(--sky)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Preview Step URL ↗
                          </a>
                        </div>
                      );
                    }

                    const q = item.question;
                    const isShadow =
                      q.calibration_status === 'shadow_candidate' || Number(q.weight) === 0;
                    return (
                      <div
                        key={`step-q-${q.id}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '9px',
                          background: isShadow
                            ? 'rgba(251, 191, 36, 0.07)'
                            : 'rgba(255, 255, 255, 0.025)',
                          border: isShadow
                            ? '1px solid rgba(251, 191, 36, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text)' }}>
                            Step {String(item.stepNumber).padStart(2, '0')} · Q#{q.id} ({q.domain}) ·{' '}
                            {q.calm_theme}{' '}
                            {isShadow && (
                              <span
                                className="mono"
                                style={{ fontSize: '10px', color: 'var(--amber)' }}
                              >
                                [Shadow w=0]
                              </span>
                            )}
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}
                          >
                            ?view=reflect&amp;step={item.slug}
                          </div>
                        </div>
                        <a
                          href={stepUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                          style={{
                            padding: '3px 8px',
                            fontSize: '10.5px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Preview Step URL ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live Cohort Simulation Output */}
          {simResult && (
            <div
              id="studio-simulation-results"
              className="card-subtle"
              style={{
                borderColor: 'rgba(52, 211, 153, 0.5)',
                background: 'rgba(52, 211, 153, 0.06)',
              }}
            >
              <div
                className="status-bar-row"
                style={{ marginBottom: '12px' }}
              >
                <span
                  className="mono"
                  style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}
                >
                  ● MONTE CARLO COHORT SIMULATION ({simResult.synthetic_cohort_size} SYNTHETIC
                  USERS)
                </span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Flow: {simResult.flow_name} · Mean Items Answered:{' '}
                  {simResult.mean_questions_answered} · {simResult.timestamp}
                </span>
              </div>

              <div className="grid-3col">
                {/* 1. Branch Trigger Rates */}
                <div className="card-subtle">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '8px',
                    }}
                  >
                    Conditional Branch Trigger Rates
                  </div>
                  {simResult.branch_trigger_rates.length === 0 ? (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                      Linear flow (0 conditional branch rules configured).
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {simResult.branch_trigger_rates.map((b) => (
                        <div
                          key={b.rule_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span className="mono">{b.description}</span>
                          <strong style={{ color: 'var(--amber)' }}>
                            {b.triggered_count}/{simResult.synthetic_cohort_size} (
                            {b.trigger_rate_pct}%)
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Discovered Natural Rhythm Distribution */}
                <div className="card-subtle">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '8px',
                    }}
                  >
                    Discovered Natural Rhythm Distribution
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {simResult.discovered_rhythm_distribution.map((r) => (
                      <div
                        key={r.mask_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>{r.calm_title}</span>
                        <strong className="mono" style={{ color: 'var(--emerald)' }}>
                          {r.count} ({r.pct}%)
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Simulated Shadow-Item Empirical Correlations */}
                <div className="card-subtle">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '8px',
                    }}
                  >
                    Shadow-Item Empirical Correlations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {simResult.shadow_empirical_correlations.map((sc) => (
                      <div
                        key={sc.question_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>
                          Q#{sc.question_id} ({sc.calm_theme}) → {sc.domain}
                        </span>
                        <span className="mono" style={{ color: '#c4b5fd' }}>
                          r_anchor={sc.observed_r_anchor} · r_moment={sc.observed_r_telemetry} (SE -
                          {sc.se_reduction_if_promoted_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SCIENCE & SHADOW CALIBRATION MATRIX                            */}
      {/* ===================================================================== */}
      {activeStudioTab === 'science' && (
        <section id="studio-panel-science" className="studio-panel">
          {/* 3-Layer Blind Epistemic Source Separation Equation */}
          <div
            className="card-subtle"
            style={{
              marginBottom: '18px',
              borderColor: 'rgba(167, 139, 250, 0.42)',
              background: 'rgba(167, 139, 250, 0.05)',
            }}
          >
            <div
              className="mono"
              style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '6px' }}
            >
              3-LAYER BLIND EPISTEMIC SOURCE SEPARATION EQUATION
            </div>
            <div
              className="mono"
              style={{
                fontSize: '14px',
                color: 'var(--emerald)',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '10px',
                marginBottom: '8px',
                overflowX: 'auto',
              }}
            >
              y_raw = B_wiring(mask) + ΔP_unique + S_state(t) - ΔO_aphantasia(telemetry)
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Separates natural neurodevelopmental rhythm priors (
              <code className="mono">B_wiring(mask)</code>) and temporary allostatic fatigue (
              <code className="mono">S_state(t)</code>) from unique personal divergences (
              <code className="mono">ΔP_unique</code>), while protecting conceptual/non-visual
              thinkers via the Aphantasia Openness De-Confounder (+12% to +18% O boost when{' '}
              <code className="mono">imagery_vividness &lt;= 25</code>).
            </p>
          </div>

          {/* 5 Neurodevelopmental Rhythm Masks */}
          <div style={{ marginBottom: '20px' }}>
            <div
              className="mono"
              style={{ fontSize: '11px', color: 'var(--sky)', marginBottom: '10px' }}
            >
              5 NEURODEVELOPMENTAL RHYTHM MASKS (B_WIRING PRIOR OFFSETS &amp; DOUBLE-DISSOCIATION
              GATING)
            </div>
            <div className="grid-2col">
              {AURA_SCIENCE_BUNDLE.masks_schema.masks.map((m) => (
                <div
                  key={m.id}
                  className="card-subtle"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.28)' }}
                >
                  <div
                    className="status-bar-row"
                    style={{ marginBottom: '6px' }}
                  >
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {m.calm_title} ({m.name})
                    </strong>
                    <span className="status-pill sky" style={{ fontSize: '10px' }}>
                      {m.badge}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginBottom: '8px',
                      lineHeight: 1.4,
                    }}
                  >
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
                    Prior Offsets (B_wiring): O:{m.prior_offsets.O >= 0 ? `+${m.prior_offsets.O}` : m.prior_offsets.O}{' '}
                    · C:{m.prior_offsets.C >= 0 ? `+${m.prior_offsets.C}` : m.prior_offsets.C} · E:
                    {m.prior_offsets.E >= 0 ? `+${m.prior_offsets.E}` : m.prior_offsets.E} · A:
                    {m.prior_offsets.A >= 0 ? `+${m.prior_offsets.A}` : m.prior_offsets.A} · N:
                    {m.prior_offsets.N >= 0 ? `+${m.prior_offsets.N}` : m.prior_offsets.N}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '10.5px', color: 'var(--emerald)' }}
                  >
                    Gating Unmasking: Salience Split +{m.gating_reinterpretation.salience_vs_routine_split}%
                    · 1-on-1 Social +{m.gating_reinterpretation.sensory_overload_social_penalty}% ·
                    Perceptual Gain +{m.gating_reinterpretation.perceptual_gain_to_volatility_confound}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAPA Shadow-Item Empirical Calibration Matrix */}
          <div>
            <div
              className="mono"
              style={{ fontSize: '11px', color: 'var(--amber)', marginBottom: '10px' }}
            >
              SAPA SHADOW-ITEM EMPIRICAL CALIBRATION MATRIX (SNEAKY EVERYDAY HABITS · w=0)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {shadowMatrix.map((row) => (
                <div
                  key={row.question_id}
                  className="card-subtle"
                  style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}
                >
                  <div
                    className="status-bar-row"
                    style={{ marginBottom: '6px' }}
                  >
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Q#{row.question_id} · {row.short_name}
                    </strong>
                    <span
                      className={`status-pill ${
                        row.promotion_readiness === 'Ready for Anchor Promotion'
                          ? 'emerald'
                          : 'amber'
                      }`}
                    >
                      {row.promotion_readiness} (N={row.sample_n})
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '8px',
                    }}
                  >
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
                      <span style={{ color: 'var(--text-dim)' }}>
                        Anchor {row.target_domain}:{' '}
                      </span>
                      <strong style={{ color: '#c4b5fd' }}>
                        r ={' '}
                        {row.r_with_anchor_domain > 0
                          ? `+${row.r_with_anchor_domain}`
                          : row.r_with_anchor_domain}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>{row.target_probe}: </span>
                      <strong style={{ color: 'var(--emerald)' }}>
                        r = +{row.r_with_epistemic_probe}
                      </strong>
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
          {/* Local AI-Agent Quickstart Panel */}
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
                <span
                  className="mono"
                  style={{ fontSize: '10.5px', color: 'var(--sky)', fontWeight: 600 }}
                >
                  LOCAL AI-AGENT QUICKSTART PANEL · REST &amp; OPENAPI CONTROL PLANE
                </span>
                <h3 className="serif" style={{ fontSize: '22px', marginTop: '2px' }}>
                  Collaborate with Kae’s Local AI Coding &amp; Research Agent
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyAgentPrompt}
                className="btn-primary"
              >
                Copy Prompt for Kae’s AI Agent
              </button>
            </div>

            <div className="grid-2col mono" style={{ fontSize: '11px' }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.38)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                }}
              >
                <div style={{ color: 'var(--emerald)', marginBottom: '4px' }}>
                  GET /api/v1/agent/manifest
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Self-describing JSON protocol &amp; payload examples for autonomous agents.
                </div>
                <div style={{ color: 'var(--emerald)', marginBottom: '4px' }}>
                  GET /api/v1/studio/overview
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  Fetches all SQLite questions, flows, masks, live shadow Pearson r, and 28 PDFs.
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0,0,0,0.38)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                }}
              >
                <div style={{ color: 'var(--amber)', marginBottom: '4px' }}>
                  POST /api/v1/studio/questions · POST /api/v1/studio/flows
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Upserts sneaky shadow questions (w=0) and conditional branching rules to SQLite.
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

          {/* 28 Verified Full-Text Research PDFs */}
          <div
            className="mono"
            style={{ fontSize: '11px', color: 'var(--emerald)', marginBottom: '10px' }}
          >
            GROUNDING ARXIV &amp; NEUROSCIENCE CORPUS ({totalPapersCount} VERIFIED FULL-TEXT PDFs)
          </div>

          <div className="grid-2col">
            {(AURA_SCIENCE_BUNDLE.papers_corpus || []).map((cat) => (
              <div
                key={cat.domain_dir}
                className="card-subtle"
                style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}
              >
                <div
                  className="status-bar-row"
                  style={{ marginBottom: '10px' }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--emerald)',
                      fontWeight: 600,
                    }}
                  >
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
                      <strong style={{ color: 'var(--text)', display: 'block' }}>
                        {p.title}
                      </strong>
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
          {questions.length} ITEMS IN SQLITE BANK
        </span>
        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
          Aura Studio v4.0 · Dedicated Admin &amp; Subdomain Ready
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
export default App;
