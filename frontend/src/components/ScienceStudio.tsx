import React, { useState } from 'react';
import { AURA_SCIENCE_BUNDLE } from '../data/scienceBundle';
import { AuraAPI } from '../services/apiClient';
import {
  CohortSimulationResult,
  DomainKey,
  ItemBankQuestion,
  ShadowCalibrationRow,
  StudioBranchRule,
  StudioFlow,
} from '../types/aura';

interface ScienceStudioProps {
  questions: ItemBankQuestion[];
  flows: StudioFlow[];
  activeFlowId: string;
  shadowMatrix: ShadowCalibrationRow[];
  onRefreshStudioData: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const ScienceStudio: React.FC<ScienceStudioProps> = ({
  questions,
  flows,
  activeFlowId,
  shadowMatrix,
  onRefreshStudioData,
  onShowToast,
}) => {
  const [activeStudioTab, setActiveStudioTab] = useState<
    'questions' | 'flows' | 'science' | 'pdfs'
  >('questions');

  // 1. Add Question Form State
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

  // 2. Flows & Branches Builder State
  const [selectedFlowId, setSelectedFlowId] = useState<string>(
    activeFlowId || 'kae_adaptive_branching'
  );
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

  // Cohort Simulation State
  const [simResult, setSimResult] = useState<CohortSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const selectedFlow =
    flows.find((f) => f.id === selectedFlowId) ||
    flows.find((f) => f.id === activeFlowId) ||
    flows[0];

  const handleSaveNewQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      onShowToast('Please enter a question prompt first');
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
    await onRefreshStudioData();
    setNewQText('');
    setNewQHypothesis('');
    setShowAddQForm(false);
    onShowToast(`Saved Q#${created.id} to SQLite Item Bank (${created.calibration_status})`);
  };

  const handleActivateFlow = async (flowId: string) => {
    await AuraAPI.activateStudioFlow(flowId);
    await onRefreshStudioData();
    setSelectedFlowId(flowId);
    const f = flows.find((x) => x.id === flowId);
    onShowToast(`Activated "${f?.name || flowId}" on live site!`);
  };

  const handleCreateNewFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) {
      onShowToast('Please enter a flow name');
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
    await onRefreshStudioData();
    setSelectedFlowId(flowObj.id);
    setNewFlowName('');
    setNewFlowDesc('');
    setShowNewFlowForm(false);
    onShowToast(`Created flow "${flowObj.name}"`);
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
    await onRefreshStudioData();
    onShowToast(
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
    await onRefreshStudioData();
    onShowToast('Removed branch rule');
  };

  const handleRunSimulation = async (flowId?: string) => {
    const targetId = flowId || selectedFlow?.id || activeFlowId || 'kae_adaptive_branching';
    setIsSimulating(true);
    try {
      const res = await AuraAPI.runCohortSimulation(targetId, 50);
      setSimResult(res);
      onShowToast(`Simulated 50 synthetic users on "${res.flow_name}"`);
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
      `1. Read the machine-readable Agent Manifest & Science Schema: GET ${origin}/api/v1/agent/manifest (and OpenAPI docs at ${origin}/docs).`,
      `2. Inspect current questions, experimental flows, and SAPA shadow calibration: GET ${origin}/api/v1/studio/overview.`,
      `3. Add disarming behavioral shadow questions (weight w=0.0, calibration_status="shadow_candidate"): POST ${origin}/api/v1/studio/questions.`,
      `4. Create or update conditional branching flows: POST ${origin}/api/v1/studio/flows and activate via POST ${origin}/api/v1/studio/flows/{flow_id}/activate.`,
      `5. Run 50-user synthetic Monte Carlo cohort simulations to verify branch trigger rates & IRT Fisher Information before deploying: POST ${origin}/api/v1/agent/simulate.`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText).catch(() => {});
    }
    onShowToast("Copied API prompt for Kae's AI Agent!");
  };

  const totalPapersCount = (AURA_SCIENCE_BUNDLE.papers_corpus || []).reduce(
    (acc, cat) => acc + (cat.papers?.length || 0),
    0
  );

  return (
    <div id="kae-conner-studio">
      {/* Studio Header Card */}
      <div className="glass-card" style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '6px',
          }}
        >
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--accent)' }}>
            KAE &amp; CONNER COLLABORATION WORKBENCH · 3-TIER STACK
          </span>
          <span
            className="mono"
            style={{
              fontSize: '10px',
              color: 'var(--emerald)',
              background: 'var(--emerald-soft)',
              padding: '3px 9px',
              borderRadius: '999px',
            }}
          >
            FastAPI + SQLite + React 19 / TS
          </span>
        </div>

        <h3 className="serif" style={{ fontSize: '24px', marginBottom: '4px' }}>
          Kae &amp; Conner Science Studio
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          A minimal internal workbench where Kae and Conner can inspect the SQLite question bank,
          test disarming <code className="mono" style={{ color: 'var(--amber)' }}>w=0</code>{' '}
          shadow questions, design conditional branching flows, and run synthetic cohort
          simulations—while keeping the public sanctuary 100% calm and jargon-free.
        </p>

        {/* Minimal 4-Pill Internal Workbench Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            marginBottom: '14px',
          }}
        >
          <button
            id="studio-pill-questions"
            type="button"
            onClick={() => setActiveStudioTab('questions')}
            className={`seg-btn ${activeStudioTab === 'questions' ? 'active' : ''}`}
            style={{
              border: '1px solid var(--border)',
              textAlign: 'left',
              padding: '9px 11px',
            }}
          >
            1. Questions DB ({questions.length})
          </button>
          <button
            id="studio-pill-flows"
            type="button"
            onClick={() => setActiveStudioTab('flows')}
            className={`seg-btn ${activeStudioTab === 'flows' ? 'active' : ''}`}
            style={{
              border: '1px solid var(--border)',
              textAlign: 'left',
              padding: '9px 11px',
            }}
          >
            2. Flows &amp; Branches ({flows.length})
          </button>
          <button
            id="studio-pill-science"
            type="button"
            onClick={() => setActiveStudioTab('science')}
            className={`seg-btn ${activeStudioTab === 'science' ? 'active' : ''}`}
            style={{
              border: '1px solid var(--border)',
              textAlign: 'left',
              padding: '9px 11px',
            }}
          >
            3. Live Science &amp; Shadow Matrix
          </button>
          <button
            id="studio-pill-pdfs"
            type="button"
            onClick={() => setActiveStudioTab('pdfs')}
            className={`seg-btn ${activeStudioTab === 'pdfs' ? 'active' : ''}`}
            style={{
              border: '1px solid var(--border)',
              textAlign: 'left',
              padding: '9px 11px',
            }}
          >
            4. {totalPapersCount} Research PDFs
          </button>
        </div>

        {/* =================================================================== */}
        {/* PILL 1: QUESTIONS DB                                                */}
        {/* =================================================================== */}
        {activeStudioTab === 'questions' && (
          <div id="studio-panel-questions">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Item Bank in SQLite &amp; <code className="mono">item_bank_irt.json</code>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  12 Calibrated Anchors + {questions.filter((q) => q.weight === 0).length} Sneaky
                  Shadow Candidates (<code className="mono">w=0</code>)
                </div>
              </div>
              <button
                id="btn-studio-open-add-q"
                type="button"
                onClick={() => setShowAddQForm(!showAddQForm)}
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}
              >
                {showAddQForm ? 'Cancel' : '＋ Add Question'}
              </button>
            </div>

            {showAddQForm && (
              <form
                id="studio-add-question-form"
                onSubmit={handleSaveNewQuestion}
                className="card-subtle"
                style={{
                  marginBottom: '12px',
                  borderColor: 'rgba(167, 139, 250, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#c4b5fd' }}>
                  ✦ Add New Question to Kae’s Lab DB
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Everyday Question Text (Zero clinical jargon)
                  </label>
                  <input
                    id="studio-input-q-text"
                    type="text"
                    placeholder="e.g., I keep my phone on silent and reply in warm batches when my energy is ready."
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    className="clean-select"
                    style={{ width: '100%' }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      Calm Theme Badge
                    </label>
                    <input
                      id="studio-input-q-theme"
                      type="text"
                      value={newQTheme}
                      onChange={(e) => setNewQTheme(e.target.value)}
                      className="clean-select"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      Target Dimension
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
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
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
                      <option value="shadow_candidate">Sneaky Shadow (w=0)</option>
                      <option value="calibrated_anchor">Core Anchor (w=1.15)</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      Rhythm / Epistemic Probe
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
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
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
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    id="btn-studio-save-q"
                    type="submit"
                    className="btn-primary"
                    style={{ width: 'auto', padding: '9px 18px', fontSize: '12.5px' }}
                  >
                    Save to DB
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {questions.map((it) => {
                const isShadow =
                  it.calibration_status === 'shadow_candidate' ||
                  it.layer === 'shadow_behavioral_probe' ||
                  Number(it.weight) === 0;
                return (
                  <div
                    key={it.id}
                    className="card-subtle"
                    style={{
                      padding: '11px 13px',
                      borderColor: isShadow
                        ? 'rgba(251, 191, 36, 0.35)'
                        : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '11px',
                            color: 'var(--accent)',
                            fontWeight: 600,
                          }}
                        >
                          Q#{it.id} · Domain {it.domain}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 600,
                            background: isShadow
                              ? 'var(--amber-soft)'
                              : 'rgba(52, 211, 153, 0.14)',
                            color: isShadow ? 'var(--amber)' : 'var(--emerald)',
                          }}
                        >
                          {isShadow ? 'Sneaky Shadow (w=0)' : 'Calibrated Anchor'}
                        </span>
                      </div>
                      <span
                        className="mono"
                        style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}
                      >
                        a={it.irt_a} · w={it.weight} · {it.calm_theme}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text)', marginBottom: '4px' }}>
                      “{it.text}”
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10.5px',
                        color: 'var(--text-dim)',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <span>
                        Probe:{' '}
                        <strong style={{ color: 'var(--text-muted)' }}>
                          {it.probe_type || it.layer}
                        </strong>
                      </span>
                      {it.scientific_hypothesis && (
                        <span style={{ color: '#c4b5fd' }}>{it.scientific_hypothesis}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PILL 2: FLOWS & CONDITIONAL BRANCHES                                */}
        {/* =================================================================== */}
        {activeStudioTab === 'flows' && (
          <div id="studio-panel-flows">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Experimental Assessment Flows &amp; Adaptive Branching
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Select a flow to edit its conditional branches or set it active on the live site.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  id="btn-studio-simulate-cohort"
                  type="button"
                  onClick={() => handleRunSimulation()}
                  className="btn-ghost"
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--emerald)',
                    borderColor: 'rgba(52, 211, 153, 0.4)',
                  }}
                >
                  {isSimulating
                    ? 'Simulating…'
                    : '▶ Run Cohort Simulation (50 Synthetic Users)'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFlowForm(!showNewFlowForm)}
                  className="btn-ghost"
                  style={{ fontSize: '11.5px', color: '#c4b5fd' }}
                >
                  ＋ New Flow
                </button>
              </div>
            </div>

            {showNewFlowForm && (
              <form
                onSubmit={handleCreateNewFlow}
                className="card-subtle"
                style={{
                  marginBottom: '12px',
                  borderColor: 'rgba(167,139,250,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#c4b5fd' }}>
                  Create New Experimental Flow
                </div>
                <input
                  type="text"
                  placeholder="Flow Name (e.g., Kae's Evening Unwind Flow)"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  className="clean-select"
                />
                <input
                  type="text"
                  placeholder="Short description of hypothesis or target audience"
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  className="clean-select"
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', alignSelf: 'flex-end', padding: '8px 16px' }}
                >
                  Create Flow
                </button>
              </form>
            )}

            {/* Flow Cards */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              {flows.map((f) => {
                const isSelected = selectedFlow?.id === f.id;
                const isLive = f.id === activeFlowId || f.is_active;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFlowId(f.id)}
                    className="card-subtle"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected
                        ? 'rgba(167, 139, 250, 0.55)'
                        : isLive
                        ? 'rgba(52, 211, 153, 0.35)'
                        : 'var(--border)',
                      background: isSelected
                        ? 'rgba(167, 139, 250, 0.08)'
                        : 'rgba(255, 255, 255, 0.025)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>
                          {f.name}
                        </strong>
                        {isLive && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--emerald)',
                              background: 'var(--emerald-soft)',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            ● Active on Live Site
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!isLive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateFlow(f.id);
                            }}
                            className="btn-ghost"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              color: 'var(--emerald)',
                              borderColor: 'rgba(52, 211, 153, 0.35)',
                            }}
                          >
                            Set Active on Live Site
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {f.description}
                    </p>
                    <div
                      className="mono"
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-dim)',
                        marginTop: '6px',
                      }}
                    >
                      Questions ({f.question_ids.length}): [{f.question_ids.join(', ')}] · Branches:{' '}
                      {f.branches.length}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Conditional Branch Builder for Selected Flow */}
            {selectedFlow && (
              <div
                className="card-subtle"
                style={{
                  borderColor: 'rgba(251, 191, 36, 0.3)',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
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
                      fontSize: '11.5px',
                      color: 'var(--text-dim)',
                      marginBottom: '10px',
                    }}
                  >
                    No conditional branch rules yet (runs linearly). Add a rule below to dynamically
                    route users based on their answers!
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {selectedFlow.branches.map((br) => (
                      <div
                        key={br.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div>
                          <div
                            className="mono"
                            style={{ fontSize: '11px', color: 'var(--emerald)' }}
                          >
                            IF [Question #{br.if_question_id}] [{br.operator} {br.threshold}] ➔ THEN
                            Branch to [Question #{br.then_goto_question_id}]
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {br.rationale}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchRule(br.id)}
                          className="btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '10.5px' }}
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
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text)' }}>
                    ＋ Add Branch Rule
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 0.6fr 0.6fr 1.2fr',
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
                      className="clean-select"
                      style={{ fontSize: '11.5px', padding: '7px 10px' }}
                    />
                    <button
                      id="btn-studio-add-branch"
                      type="submit"
                      className="btn-primary"
                      style={{
                        width: 'auto',
                        whiteSpace: 'nowrap',
                        padding: '7px 14px',
                        fontSize: '11.5px',
                      }}
                    >
                      ＋ Add Branch Rule
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Live Cohort Simulation Output */}
            {simResult && (
              <div
                id="studio-simulation-results"
                className="card-subtle"
                style={{
                  borderColor: 'rgba(52, 211, 153, 0.45)',
                  background: 'rgba(52, 211, 153, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 600 }}
                  >
                    ● MONTE CARLO COHORT SIMULATION ({simResult.synthetic_cohort_size} SYNTHETIC
                    USERS)
                  </span>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    {simResult.flow_name} · {simResult.timestamp}
                  </span>
                </div>

                {simResult.branch_trigger_rates.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: '4px',
                      }}
                    >
                      Conditional Branch Trigger Rates:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {simResult.branch_trigger_rates.map((b) => (
                        <div
                          key={b.rule_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
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
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '4px',
                    }}
                  >
                    Live Shadow-Item Empirical Correlations (Simulated Cohort):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {simResult.shadow_empirical_correlations.map((sc) => (
                      <div
                        key={sc.question_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>
                          Q#{sc.question_id} ({sc.calm_theme}) → Anchor {sc.domain}
                        </span>
                        <span className="mono" style={{ color: '#c4b5fd' }}>
                          r_anchor={sc.observed_r_anchor} · r_moment={sc.observed_r_telemetry} (SE
                          -{sc.se_reduction_if_promoted_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* PILL 3: LIVE SCIENCE & SAPA SHADOW CALIBRATION MATRIX               */}
        {/* =================================================================== */}
        {activeStudioTab === 'science' && (
          <div id="studio-panel-science">
            <div
              className="card-subtle"
              style={{
                marginBottom: '12px',
                borderColor: 'rgba(167, 139, 250, 0.35)',
              }}
            >
              <div
                className="mono"
                style={{ fontSize: '10.5px', color: 'var(--accent)', marginBottom: '4px' }}
              >
                3-LAYER BLIND EPISTEMIC SOURCE SEPARATION EQUATION
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '12.5px',
                  color: 'var(--emerald)',
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: '8px',
                  marginBottom: '6px',
                }}
              >
                y_raw = B_wiring(mask) + ΔP_unique + S_state(t) - ΔO_aphantasia(telemetry)
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Separates natural neurodevelopmental rhythm priors (
                <code className="mono">B_wiring</code>) and temporary allostatic fatigue (
                <code className="mono">S_state</code>) from unique personal divergences (
                <code className="mono">ΔP_unique</code>), while protecting non-visual thinkers via
                the Aphantasia Openness De-Confounder (+12% to +18% O boost when{' '}
                <code className="mono">imagery_vividness &lt;= 25</code>).
              </p>
            </div>

            {/* SAPA Shadow-Item Empirical Calibration Table */}
            <div style={{ marginBottom: '12px' }}>
              <div
                className="mono"
                style={{ fontSize: '10.5px', color: 'var(--amber)', marginBottom: '6px' }}
              >
                SAPA SHADOW-ITEM EMPIRICAL CALIBRATION TABLE (SNEAKY EVERYDAY HABITS · w=0)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shadowMatrix.map((row) => (
                  <div
                    key={row.question_id}
                    className="card-subtle"
                    style={{
                      padding: '11px 13px',
                      borderColor: 'rgba(251, 191, 36, 0.28)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      <strong style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                        Q#{row.question_id} · {row.short_name}
                      </strong>
                      <span
                        className="mono"
                        style={{
                          fontSize: '10px',
                          color:
                            row.promotion_readiness === 'Ready for Anchor Promotion'
                              ? 'var(--emerald)'
                              : 'var(--amber)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                        }}
                      >
                        {row.promotion_readiness} (N={row.sample_n})
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        marginBottom: '6px',
                      }}
                    >
                      {row.hypothesis}
                    </p>
                    <div
                      className="mono"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        fontSize: '10.5px',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '6px 8px',
                        borderRadius: '8px',
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
          </div>
        )}

        {/* =================================================================== */}
        {/* PILL 4: 28 FULL-TEXT RESEARCH PDFs                                  */}
        {/* =================================================================== */}
        {activeStudioTab === 'pdfs' && (
          <div id="studio-panel-pdfs">
            <div
              className="mono"
              style={{ fontSize: '10.5px', color: 'var(--emerald)', marginBottom: '6px' }}
            >
              GROUNDING ARXIV &amp; NEUROSCIENCE CORPUS ({totalPapersCount} FULL-TEXT PDFs)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(AURA_SCIENCE_BUNDLE.papers_corpus || []).map((cat) => (
                <div
                  key={cat.domain_dir}
                  className="card-subtle"
                  style={{
                    padding: '12px',
                    borderColor: 'rgba(52,211,153,0.28)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--emerald)',
                        fontWeight: 600,
                      }}
                    >
                      science/papers/{cat.domain_dir}/
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: '10px', color: 'var(--text-dim)', flexShrink: 0 }}
                    >
                      {cat.paper_count} Verified PDFs
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {cat.papers.map((p) => (
                      <div
                        key={p.filename}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.35,
                          paddingLeft: '8px',
                          borderLeft: '2px solid rgba(167,139,250,0.35)',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        <strong style={{ color: 'var(--text)', display: 'block' }}>
                          {p.title}
                        </strong>
                        <a
                          href={`/api/v1/science/pdf/${cat.domain_dir}/${p.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mono"
                          style={{
                            fontSize: '9.5px',
                            color: 'var(--accent)',
                            display: 'inline-block',
                            overflowWrap: 'anywhere',
                            textDecoration: 'underline',
                          }}
                        >
                          {p.filename} ({p.year}) ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Always render #lab-items-list for backwards-compatible DOM checks */}
        <div
          id="lab-items-list"
          style={{
            display: activeStudioTab === 'pdfs' ? 'none' : 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          <div className="mono" style={{ fontSize: '10px', color: 'var(--emerald)' }}>
            VERIFIED CORPUS SUMMARY: {totalPapersCount} FULL-TEXT PDFs ACROSS 4 DIRECTORIES ·{' '}
            {questions.length} ITEMS IN BANK
          </div>
        </div>
      </div>

      {/* Compact Card for Kae's AI Agent (/api/v1/agent/manifest & /docs) */}
      <div
        id="kae-agent-manifest-card"
        className="glass-card"
        style={{
          borderColor: 'rgba(56, 189, 248, 0.35)',
          padding: '16px 18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span
              className="mono"
              style={{ fontSize: '10px', color: 'var(--sky)', fontWeight: 600 }}
            >
              AGENT-FIRST API · /api/v1/agent/manifest &amp; /docs
            </span>
            <h4 className="serif" style={{ fontSize: '20px', marginTop: '2px' }}>
              For Kae’s AI Agent
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Kae’s AI coding or research agent can autonomously inspect the math, add shadow
              questions, build conditional branching flows, and run 50-user simulations via REST.
            </p>
          </div>
          <button
            id="btn-copy-agent-prompt"
            type="button"
            onClick={handleCopyAgentPrompt}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '9px 15px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Copy Prompt for Kae’s AI Agent
          </button>
        </div>
      </div>
    </div>
  );
};
