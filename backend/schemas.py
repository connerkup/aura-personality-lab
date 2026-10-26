"""
Pydantic v2 Request & Response Schemas for Aura Tier-2 FastAPI Service & Kae's Science Studio.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ScoreAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    user_name: Optional[str] = Field(default="Anonymous Explorer", description="Optional display name for saved session.")
    session_id: Optional[str] = Field(default=None, description="Optional existing session_id to update.")
    responses: Dict[str, Union[int, float]] = Field(
        default_factory=dict,
        description="Map of question ID ('1'..'120') to Likert response (1..5).",
    )
    mask_id: Optional[str] = Field(
        default="auto",
        description="Neurodevelopmental mask ID or 'auto' for blind Bayesian inverse inference.",
    )
    mood_energy: Optional[float] = Field(
        default=None,
        description="Optional override for allostatic mood energy in [-1.0, +1.0]. Inferred from Q12 when omitted.",
    )
    self_criticism: Optional[float] = Field(
        default=None,
        description="Optional override for self-criticism halo in [-1.0, +1.0]. Inferred from Q11/Q12 when omitted.",
    )
    telemetry: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional behavioral micro-game telemetry (pulse_reaction, constellation_memory, minds_eye).",
    )


class DecomposeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    raw_scores: Dict[str, float] = Field(
        default_factory=lambda: {"O": 78.0, "C": 44.0, "E": 48.0, "A": 76.0, "N": 58.0},
        description="Raw observed Big Five domain percentiles (O, C, E, A, N in 0..100).",
    )
    mask_id: Optional[str] = Field(default="auto")
    mood_energy: Optional[float] = Field(default=None)
    self_criticism: Optional[float] = Field(default=None)
    responses: Optional[Dict[str, Union[int, float]]] = Field(default=None)
    telemetry: Optional[Dict[str, Any]] = Field(default=None)


class ContextProfilePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    age_band: str = Field(
        default="25_39",
        description="Target age band: '18_24', '25_39', '40_59', or '60_plus'.",
    )
    ses_life_context: str = Field(
        default="working_practical",
        description="Life & socioeconomic ecology: 'working_practical', 'student_early', 'knowledge_remote', or 'caregiver_family'.",
    )
    locale: str = Field(
        default="urban",
        description="Geographic ecology: 'urban', 'suburban', or 'rural'.",
    )
    language: str = Field(
        default="en",
        description="ISO language code: 'en', 'es', 'fr', 'pt', or 'ja'.",
    )
    custom_bio: Optional[str] = Field(
        default="",
        description="Optional free-text user bio (e.g., '23yo line cook & artist in Chicago' or '42yo rural paramedic').",
    )


class AdaptiveNextItemRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    answered_ids: List[int] = Field(default_factory=list, description="List of already-answered question IDs.")
    current_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional domain percentile estimates (O, C, E, A, N in 0..100).",
    )
    responses: Optional[Dict[str, Union[int, float]]] = Field(
        default=None,
        description="Optional map of answered question IDs to Likert responses (1..5) for live 2PL IRT & conditional branch evaluation.",
    )
    telemetry: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional Mind Moments telemetry for conditional telemetry branch triggers.",
    )
    context_profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional demographic/life-context profile to return DIF-free contextualized text alongside the selected item.",
    )


class ContextualMorphRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    question_id: Optional[int] = Field(
        default=1,
        description="Question ID to contextually morph (1..120).",
    )
    question_ids: Optional[List[int]] = Field(
        default=None,
        description="Optional batch of question IDs to contextualize in one call.",
    )
    context_profile: ContextProfilePayload = Field(
        default_factory=ContextProfilePayload,
        description="Age, SES/life context, locale, language, and optional custom bio.",
    )


class ChemistryPersonPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = Field(default="Person")
    scores: Dict[str, float] = Field(
        default_factory=lambda: {"O": 75.0, "C": 50.0, "E": 50.0, "A": 75.0, "N": 50.0}
    )
    mask_id: Optional[str] = Field(default="auto")
    mood_energy: Optional[float] = Field(default=None)
    self_criticism: Optional[float] = Field(default=None)
    responses: Optional[Dict[str, Union[int, float]]] = Field(default=None)
    telemetry: Optional[Dict[str, Any]] = Field(default=None)


class ChemistryRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    person_a: Dict[str, Any] = Field(default_factory=dict)
    person_b: Dict[str, Any] = Field(default_factory=dict)
    context_mode: str = Field(default="partner")


class StudioQuestionUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[int] = Field(default=None, description="Question ID (omit to auto-assign next integer ID).")
    slug: Optional[str] = Field(default=None, description="Deterministic human-readable slug (e.g., 'q-121-custom-probe').")
    domain: str = Field(default="C", description="Target Big Five domain: O, C, E, A, or N.")
    deyoung_aspect: Optional[str] = Field(default=None, description="DeYoung aspect code (e.g., 'C_orderliness', 'O_intellect').")
    aspect: str = Field(default="Everyday Behavioral Probe", description="DeYoung 10-aspect or behavioral sub-construct label.")
    node_tier: str = Field(
        default="everyday_moment",
        description="Node tier in the 120-item CAT tree: 'anchor', 'branch_probe', 'deep_resolution', or 'everyday_moment'.",
    )
    layer: str = Field(default="shadow_behavioral_probe", description="Psychometric layer identifier.")
    probe_type: str = Field(default="sneaky_custom_probe", description="Short slug for probe mechanism.")
    calibration_status: str = Field(
        default="shadow_candidate",
        description="'shadow_candidate' (weight=0 during anchor scoring) or 'calibrated_anchor'.",
    )
    empirical_prior_r: float = Field(default=0.50, description="Hypothesized or prior correlation r with target domain.")
    direction: int = Field(default=1, description="+1 if agreement increases domain score, -1 if reverse-keyed.")
    weight: Optional[float] = Field(default=None, description="Item weight (defaults to 0.0 for shadow_candidate, 1.15 for anchor).")
    irt_a: float = Field(default=1.45, description="2PL IRT discrimination parameter a.")
    irt_b: float = Field(default=-0.10, description="2PL IRT difficulty threshold parameter b.")
    mood_halo_loading: float = Field(default=0.18, description="Susceptibility to temporary mood/fatigue halo.")
    text: str = Field(..., description="Calm, disarming everyday question text shown to the user.")
    calm_theme: str = Field(default="Everyday habits", description="Gentle pill label shown above the question.")
    scientific_hypothesis: str = Field(
        default="",
        description="Internal scientific rationale for Kae & Conner's studio.",
    )
    parent_trigger: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional conditional parent trigger rule for tree branching.",
    )
    active: bool = Field(default=True)


class StudioQuestionBulkUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    questions: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Array of question objects to bulk-upsert into SQLite and item_bank_irt.json.",
    )
    items: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Alias for `questions`.",
    )


class StudioBranchRule(BaseModel):
    model_config = ConfigDict(extra="allow")

    if_question_id: int = Field(default=3, description="Source question ID to inspect.")
    operator: str = Field(default=">=", description="Comparison operator: '>=', '<=', '==', '>', '<'.")
    threshold: float = Field(default=4.0, description="Likert threshold (1..5) that triggers the branch.")
    then_inject_question_id: Optional[int] = Field(default=13, description="Question ID to dynamically inject when triggered.")
    then_goto_question_id: Optional[int] = Field(default=None, description="Alias for target question ID.")
    note: str = Field(default="", description="Human-readable explanation of why this branch triggers.")
    rationale: Optional[str] = Field(default=None, description="Alias for scientific rationale.")


class StudioFlowUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = Field(default=None, description="Unique flow slug (e.g., 'kae_evening_flow').")
    name: str = Field(..., description="Human-readable title of the experimental flow.")
    description: str = Field(default="", description="Summary of what this flow tests.")
    is_active_default: bool = Field(default=False, description="Whether to immediately make this the active consumer flow.")
    question_ids: List[int] = Field(
        default_factory=lambda: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        description="Ordered list of question IDs included in this flow.",
    )
    mind_moments: List[str] = Field(
        default_factory=lambda: ["pulse_reaction", "constellation_memory", "minds_eye"],
        description="Interactive micro-games enabled in this flow.",
    )
    branches: List[StudioBranchRule] = Field(
        default_factory=list,
        description="Conditional branching rules evaluated during the assessment.",
    )


class AgentSimulationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    n_synthetic_users: int = Field(
        default=50,
        ge=5,
        le=500,
        description="Number of synthetic multi-mask users to simulate (5..500).",
    )
    flow_id: Optional[str] = Field(
        default="adaptive_branching",
        description="ID of the experimental Studio flow to evaluate branch trigger rates against.",
    )
    seed: int = Field(default=2026, description="Deterministic RNG seed for reproducible Monte Carlo runs.")


class ScienceCalibrateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    items: Optional[List[Dict[str, Any]]] = Field(default=None)
    masks: Optional[List[Dict[str, Any]]] = Field(default=None)


class PredictBehaviorsFromTraitsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    raw_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="5 Big Five domain percentiles (O, C, E, A, N in 0..100).",
    )
    scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional alias for `raw_scores`.",
    )
    domain_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional alias for `raw_scores`.",
    )
    aspect_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional 10 DeYoung aspect percentiles (0..100).",
    )
    deyoung_10_aspects: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional alias for `aspect_scores`.",
    )
    telemetry: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional Mind Moment behavioral telemetry (pulse_reaction, constellation_memory, minds_eye).",
    )
    context_profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional demographic/life-context profile.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=40,
        description="Number of highest-information locked predictions to select (default 5, max 40).",
    )


class PredictTraitsFromBehaviorsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    observed_behaviors: Dict[str, Any] = Field(
        default_factory=dict,
        description="Map of Oregon ESCS act_id ('escs_act_01'..'escs_act_40') or code to binary (0/1), bool, or Likert (1..5).",
    )
    behaviors: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional alias for `observed_behaviors`.",
    )
    telemetry: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional Mind Moment behavioral telemetry.",
    )


class VerifyBlindPredictionsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    predictions: Optional[Any] = Field(
        default=None,
        description="Locked predictions list or response object from `/api/v1/prediction/behaviors-from-traits`.",
    )
    user_verifications: Dict[str, Any] = Field(
        default_factory=dict,
        description="Map of act_id to user verification (true/false or 1/0).",
    )
    verifications: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional alias for `user_verifications`.",
    )
    raw_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional prior 5 domain scores (0..100).",
    )
    aspect_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional prior 10 DeYoung aspect scores (0..100) for Active Bayesian Aspect Updating.",
    )
    commitment_hash: Optional[str] = Field(
        default=None,
        description="Optional SHA-256 pre-commitment hash to record in the SQLite verification ledger.",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional assessment session ID.",
    )

