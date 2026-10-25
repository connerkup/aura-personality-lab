export type DomainKey = 'O' | 'C' | 'E' | 'A' | 'N';

export type InnerModality = 'wordless_concept' | 'inner_voice' | 'visual_cinema';

export interface PulseReactionTelemetry {
  completed: boolean;
  median_rt_ms: number;
  rt_cv_pct: number;
  steadiness_pct: number;
  false_starts: number;
}

export interface ConstellationMemoryTelemetry {
  completed: boolean;
  accuracy_pct: number;
  mean_chunk_ms: number;
}

export interface MindsEyeTelemetry {
  completed: boolean;
  imagery_vividness: number;
  inner_modality: InnerModality;
}

export interface TelemetryState {
  pulse_reaction: PulseReactionTelemetry;
  constellation_memory: ConstellationMemoryTelemetry;
  minds_eye: MindsEyeTelemetry;
}

export interface TelemetryProfile {
  minds_eye_label: string;
  minds_eye_tier: string;
  minds_eye_calm_note: string;
  attentional_cadence_label: string;
  attentional_cadence_calm_note: string;
  pattern_memory_label: string;
  pattern_memory_calm_note: string;
  median_rt_ms: number;
  rt_cv_pct: number;
  rt_steadiness_pct: number;
  false_starts: number;
  memory_accuracy_pct: number;
  mean_chunk_ms: number;
  imagery_vividness: number;
  inner_modality: InnerModality;
  aphantasia_deconfounder_applied: boolean;
  aphantasia_openness_boost_pct: number;
  pattern_synthesis_boost_pct: number;
}

export interface ItemBankQuestion {
  id: number;
  domain: DomainKey;
  aspect: string;
  layer: string;
  probe_type: string;
  calibration_status?: 'calibrated_anchor' | 'shadow_candidate' | string;
  empirical_prior_r?: number;
  direction: number;
  weight: number;
  irt_a: number;
  irt_b: number;
  mood_halo_loading: number;
  text: string;
  calm_theme: string;
  scientific_hypothesis?: string;
}

export interface NeuroMask {
  id: string;
  name: string;
  short_label: string;
  calm_title: string;
  calm_Badge?: string;
  calm_badge?: string;
  calm_summary: string;
  calm_reframe: string;
  badge: string;
  neural_mechanism: string;
  prior_offsets: Record<DomainKey, number>;
  gating_reinterpretation: {
    salience_vs_routine_split: number;
    sensory_overload_social_penalty: number;
    perceptual_gain_to_volatility_confound: number;
  };
  diagnostic_note: string;
}

export interface EpistemicProbes {
  salience_split_index: number;
  acoustic_stream_index: number;
  valence_gain_index: number;
  directness_preference: number;
  compensatory_masking_index: number;
  inferred_mood_energy: number;
  inferred_self_criticism: number;
}

export interface MaskPosterior {
  mask_id: string;
  name: string;
  short_label: string;
  calm_title: string;
  calm_badge: string;
  fit_probability: number;
  euclidean_distance: number;
}

export interface UniqueDivergence {
  domain: DomainKey;
  domain_name: string;
  delta: number;
  interpretation: string;
}

export interface DecompositionResult {
  mask_applied: {
    id: string;
    name: string;
    short_label: string;
    calm_title: string;
    calm_badge: string;
    calm_summary: string;
    calm_reframe: string;
    badge: string;
    neural_mechanism: string;
    diagnostic_note: string;
  };
  epistemic_probes: EpistemicProbes;
  telemetry_profile: TelemetryProfile;
  calm_notes: {
    masking_note: string;
    season_note: string;
    minds_eye_note: string;
  };
  signal_layers: {
    raw_observed: Record<DomainKey, number>;
    state_halo_shift: Record<DomainKey, number>;
    aphantasia_openness_boost: number;
    debiased_scores: Record<DomainKey, number>;
    hardware_baseline: Record<DomainKey, number>;
    residual_personality: Record<DomainKey, number>;
    mask_modulated_effective: Record<DomainKey, number>;
  };
  gating_deconfound: {
    routine_conscientiousness: number;
    salience_locked_drive: number;
    crowd_foraging_extraversion: number;
    dyadic_1on1_capacity: number;
    raw_threat_sensitivity: number;
    true_affective_dysregulation: number;
    perceptual_signal_resolution: number;
  };
  cortical_4d: {
    mbti_code: string;
    full_code: string;
    pole_clarity_pct: number;
    shannon_entropy_bits: number;
    observer_manifold_dims: number;
  };
  deyoung_10_aspects: {
    O_intellect: number;
    O_openness: number;
    C_industriousness: number;
    C_orderliness: number;
    E_enthusiasm: number;
    E_assertiveness: number;
    A_compassion: number;
    A_politeness: number;
    N_withdrawal: number;
    N_volatility: number;
  };
  top_unique_divergences: UniqueDivergence[];
  inferred_mask_posteriors: MaskPosterior[];
}

export interface ShadowItemDiagnostic {
  item_id: number;
  domain: DomainKey;
  probe_type: string;
  calibration_status: string;
  anchor_weight_applied: number;
  raw_likert_response: number;
  implied_domain_pct: number;
  anchor_domain_pct: number;
  divergence_from_anchor_pct: number;
  empirical_prior_r: number;
  calm_theme: string;
}

export interface IRTScoringResult {
  raw_scores: Record<DomainKey, number>;
  telemetry_deconfounded_scores?: Record<DomainKey, number>;
  aphantasia_openness_boost_pct?: number;
  standard_errors: Record<DomainKey, number>;
  mean_confidence_band: number;
  telemetry_profile?: TelemetryProfile;
  shadow_item_diagnostics?: ShadowItemDiagnostic[];
}

export interface ScoreAssessmentResult {
  irt_scoring: IRTScoringResult;
  decomposition: DecompositionResult;
}

export interface ChemistryResult {
  overall_resonance_pct: number;
  context_mode: 'partner' | 'cofounder' | 'friend';
  sub_metrics: {
    cortical_prior_sync: number;
    allostatic_safety: number;
    deconfounded_execution_bridge: number;
    raw_unmasked_c_gap: number;
    mask_corrected_drive_gap: number;
  };
  neuro_translation_note: string;
  person_a_decomposition: DecompositionResult;
  person_b_decomposition: DecompositionResult;
}

export interface PaperEntry {
  filename: string;
  title: string;
  authors: string[];
  year: number;
  identifier: string;
}

export interface PaperCategory {
  domain_dir: string;
  domain_title: string;
  paper_count: number;
  papers: PaperEntry[];
}

export interface ShadowCalibrationRow {
  question_id: number;
  short_name: string;
  prompt_snippet: string;
  target_domain: DomainKey;
  target_probe: string;
  anchor_weight: number;
  r_with_anchor_domain: number;
  r_with_epistemic_probe: number;
  r_with_mind_moment: string;
  sample_n: number;
  promotion_readiness: 'Calibrating (Shadow w=0)' | 'Ready for Anchor Promotion' | 'Promoted Anchor';
  hypothesis: string;
}

export interface StudioBranchRule {
  id: string;
  if_question_id: number;
  operator: '>=' | '<=' | '==' | '>' | '<';
  threshold: number;
  then_goto_question_id: number;
  rationale: string;
}

export interface StudioFlow {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  question_ids: number[];
  branches: StudioBranchRule[];
  include_mind_moments: boolean;
  created_by: string;
  updated_at: string;
}

export interface CohortSimulationResult {
  flow_id: string;
  flow_name: string;
  synthetic_cohort_size: number;
  mean_questions_answered: number;
  branch_trigger_rates: {
    rule_id: string;
    description: string;
    triggered_count: number;
    trigger_rate_pct: number;
  }[];
  discovered_rhythm_distribution: {
    mask_id: string;
    calm_title: string;
    count: number;
    pct: number;
  }[];
  shadow_empirical_correlations: {
    question_id: number;
    calm_theme: string;
    domain: DomainKey;
    observed_r_anchor: number;
    observed_r_telemetry: number;
    se_reduction_if_promoted_pct: number;
  }[];
  timestamp: string;
}
