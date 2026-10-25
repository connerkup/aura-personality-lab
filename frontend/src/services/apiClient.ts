import {
  AURA_SCIENCE_BUNDLE,
  CALM_DIMENSION_LABELS,
  INITIAL_SHADOW_CALIBRATION_MATRIX,
  INITIAL_STUDIO_FLOWS,
} from '../data/scienceBundle';
import {
  ChemistryResult,
  CohortSimulationResult,
  DecompositionResult,
  DomainKey,
  EpistemicProbes,
  InnerModality,
  IRTScoringResult,
  ItemBankQuestion,
  MaskPosterior,
  ScoreAssessmentResult,
  ShadowCalibrationRow,
  ShadowItemDiagnostic,
  StudioFlow,
  TelemetryProfile,
  TelemetryState,
} from '../types/aura';

const DOMAIN_KEYS: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];

function clamp(val: number, low = 2.0, high = 98.0): number {
  return Math.max(low, Math.min(high, val));
}

const STUDIO_STORAGE_KEY = 'aura_kae_studio_state_v2';

interface LocalStudioState {
  questions: ItemBankQuestion[];
  flows: StudioFlow[];
  active_flow_id: string;
  shadow_calibration_matrix: ShadowCalibrationRow[];
}

function loadLocalStudioState(): LocalStudioState {
  const defaultState: LocalStudioState = {
    questions: [...AURA_SCIENCE_BUNDLE.item_bank_schema.items],
    flows: JSON.parse(JSON.stringify(INITIAL_STUDIO_FLOWS)),
    active_flow_id: 'core_calm_12',
    shadow_calibration_matrix: JSON.parse(JSON.stringify(INITIAL_SHADOW_CALIBRATION_MATRIX)),
  };
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultState;
  }
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<LocalStudioState>;
    const questions =
      Array.isArray(parsed.questions) && parsed.questions.length >= 12
        ? parsed.questions
        : defaultState.questions;
    const flows =
      Array.isArray(parsed.flows) && parsed.flows.length > 0
        ? parsed.flows
        : defaultState.flows;
    const active_flow_id = parsed.active_flow_id || 'core_calm_12';
    const shadow_calibration_matrix =
      Array.isArray(parsed.shadow_calibration_matrix) &&
      parsed.shadow_calibration_matrix.length > 0
        ? parsed.shadow_calibration_matrix
        : defaultState.shadow_calibration_matrix;

    // Keep global bundle in sync with custom questions
    AURA_SCIENCE_BUNDLE.item_bank_schema.items = questions;
    return { questions, flows, active_flow_id, shadow_calibration_matrix };
  } catch {
    return defaultState;
  }
}

function saveLocalStudioState(state: LocalStudioState): void {
  AURA_SCIENCE_BUNDLE.item_bank_schema.items = state.questions;
  if (typeof window !== 'undefined') {
    window.AURA_SCIENCE_BUNDLE = AURA_SCIENCE_BUNDLE;
    try {
      window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }
}

export const EdgeScienceMirror = {
  getBundle() {
    return (typeof window !== 'undefined' && window.AURA_SCIENCE_BUNDLE) || AURA_SCIENCE_BUNDLE;
  },

  normalizeTelemetry(telemetry: Partial<TelemetryState> | Record<string, unknown> | null = null) {
    const defaults = {
      median_rt_ms: 290.0,
      rt_cv_pct: 14.5,
      false_starts: 0,
      accuracy_pct: 78.0,
      mean_chunk_ms: 420.0,
      imagery_vividness: 62.0,
      inner_modality: 'visual_cinema' as InnerModality,
    };

    if (!telemetry || typeof telemetry !== 'object') {
      const rt_cv = defaults.rt_cv_pct;
      const steadiness = Number(
        clamp(100.0 - Math.max(0.0, rt_cv - 6.0) * 1.85, 12.0, 99.0).toFixed(1)
      );
      return {
        provided: false,
        median_rt_ms: defaults.median_rt_ms,
        rt_cv_pct: rt_cv,
        rt_steadiness_pct: steadiness,
        false_starts: defaults.false_starts,
        memory_accuracy_pct: defaults.accuracy_pct,
        mean_chunk_ms: defaults.mean_chunk_ms,
        imagery_vividness: defaults.imagery_vividness,
        inner_modality: defaults.inner_modality,
      };
    }

    const telRecord = telemetry as Record<string, unknown>;
    const pulse =
      telRecord.pulse_reaction && typeof telRecord.pulse_reaction === 'object'
        ? (telRecord.pulse_reaction as Record<string, unknown>)
        : {};
    const constellation =
      telRecord.constellation_memory && typeof telRecord.constellation_memory === 'object'
        ? (telRecord.constellation_memory as Record<string, unknown>)
        : {};
    const minds_eye =
      telRecord.minds_eye && typeof telRecord.minds_eye === 'object'
        ? (telRecord.minds_eye as Record<string, unknown>)
        : {};

    const pick = <T>(sub: Record<string, unknown>, keys: string[], defVal: T): T => {
      for (const k of keys) {
        if (sub[k] !== undefined && sub[k] !== null) return sub[k] as T;
        if (telRecord[k] !== undefined && telRecord[k] !== null) return telRecord[k] as T;
      }
      return defVal;
    };

    const median_rt_ms = Number(pick(pulse, ['median_rt_ms', 'rt_ms'], defaults.median_rt_ms));
    let rt_cv_pct = Number(pick(pulse, ['rt_cv_pct', 'cv_pct'], defaults.rt_cv_pct));
    const false_starts = Math.max(0, parseInt(String(pick(pulse, ['false_starts'], 0)), 10) || 0);

    const raw_steadiness = pick<number | null>(
      pulse,
      ['rt_steadiness_pct', 'steadiness_pct'],
      null
    );
    let rt_steadiness_pct: number;
    if (
      raw_steadiness !== null &&
      pulse.rt_cv_pct === undefined &&
      telRecord.rt_cv_pct === undefined
    ) {
      rt_steadiness_pct = Number(clamp(Number(raw_steadiness), 10.0, 99.0).toFixed(1));
      rt_cv_pct = Number(Math.max(4.0, (100.0 - rt_steadiness_pct) / 1.85 + 6.0).toFixed(1));
    } else if (raw_steadiness !== null) {
      rt_steadiness_pct = Number(clamp(Number(raw_steadiness), 10.0, 99.0).toFixed(1));
    } else {
      rt_steadiness_pct = Number(
        clamp(100.0 - Math.max(0.0, rt_cv_pct - 6.0) * 1.85, 12.0, 99.0).toFixed(1)
      );
    }

    const memory_accuracy_pct = Number(
      clamp(
        Number(
          pick(constellation, ['accuracy_pct', 'memory_accuracy_pct'], defaults.accuracy_pct)
        ),
        0.0,
        100.0
      ).toFixed(1)
    );
    const mean_chunk_ms = Number(
      Number(pick(constellation, ['mean_chunk_ms', 'chunk_ms'], defaults.mean_chunk_ms)).toFixed(1)
    );
    const imagery_vividness = Number(
      clamp(
        Number(pick(minds_eye, ['imagery_vividness', 'vividness'], defaults.imagery_vividness)),
        0.0,
        100.0
      ).toFixed(1)
    );

    const default_modality: InnerModality =
      imagery_vividness <= 25.0 ? 'wordless_concept' : defaults.inner_modality;
    let inner_modality = String(
      pick(minds_eye, ['inner_modality', 'modality'], default_modality)
    ) as InnerModality;
    if (!['wordless_concept', 'inner_voice', 'visual_cinema'].includes(inner_modality)) {
      inner_modality = default_modality;
    }

    return {
      provided: true,
      median_rt_ms: Number(median_rt_ms.toFixed(1)),
      rt_cv_pct: Number(rt_cv_pct.toFixed(1)),
      rt_steadiness_pct,
      false_starts,
      memory_accuracy_pct,
      mean_chunk_ms,
      imagery_vividness,
      inner_modality,
    };
  },

  computeAphantasiaBoost(imagery_vividness: number): number {
    if (imagery_vividness <= 25.0) {
      const v = Math.max(0.0, Math.min(25.0, Number(imagery_vividness)));
      return Number((12.0 + 6.0 * ((25.0 - v) / 25.0)).toFixed(1));
    }
    return 0.0;
  },

  buildTelemetryProfile(
    telemetry: Partial<TelemetryState> | Record<string, unknown> | null = null
  ): TelemetryProfile {
    const norm = this.normalizeTelemetry(telemetry);
    const vivid = norm.imagery_vividness;
    const modality = norm.inner_modality;
    const rt_ms = norm.median_rt_ms;
    const rt_cv = norm.rt_cv_pct;
    const steadiness = norm.rt_steadiness_pct;
    const false_starts = norm.false_starts;
    const mem_acc = norm.memory_accuracy_pct;
    const chunk_ms = norm.mean_chunk_ms;

    const aphantasia_boost = this.computeAphantasiaBoost(vivid);

    let minds_eye_tier = 'vivid_mental_imagery';
    let minds_eye_label = 'Vivid Visual Mind';
    let minds_eye_calm_note = '';

    if (vivid <= 18.0) {
      minds_eye_tier = 'aphantasia_concept_first';
      minds_eye_label =
        modality === 'inner_voice'
          ? 'Pure Knowing & Inner Voice'
          : 'Pure Knowing (Conceptual Mind)';
      minds_eye_calm_note = `You think in wordless concepts rather than mental pictures—so we adjusted your Curiosity & Imagination portrait (+${Math.round(
        aphantasia_boost
      )}%) to honor your conceptual creativity.`;
    } else if (vivid <= 25.0) {
      minds_eye_tier = 'aphantasia_spectrum_sketch';
      minds_eye_label = 'Pure Knowing (Conceptual Mind)';
      minds_eye_calm_note = `You think in wordless concepts and spatial intuition rather than mental pictures—so we adjusted your Curiosity & Imagination portrait (+${Math.round(
        aphantasia_boost
      )}%) to honor your conceptual creativity.`;
    } else if (vivid <= 45.0) {
      minds_eye_tier = 'soft_sketch_imagery';
      minds_eye_label =
        modality === 'inner_voice'
          ? 'Inner Voice & Soft-Sketch Mind'
          : modality === 'wordless_concept'
          ? 'Concept-Led Soft-Sketch Mind'
          : 'Soft-Sketch Imagery Mind';
      minds_eye_calm_note =
        'You think through meaning, voice, and light gestural impressions rather than heavy visual detail—letting your mind move quickly to the heart of an idea.';
    } else if (vivid <= 80.0) {
      minds_eye_tier = 'vivid_mental_imagery';
      minds_eye_label =
        modality === 'inner_voice'
          ? 'Inner Voice & Clear Visual Mind'
          : modality === 'wordless_concept'
          ? 'Conceptual & Clear Visual Mind'
          : 'Clear Visual Mind';
      minds_eye_calm_note =
        "You can readily call up clear scenes, atmospheres, and memories in your mind's eye, blending visual imagery smoothly with your everyday intuition.";
    } else {
      minds_eye_tier = 'hyperphantasia_cinema';
      minds_eye_label = 'Lifelike Visual Cinema';
      minds_eye_calm_note =
        'Your inner world renders in cinema-grade light, texture, and motion—allowing you to replay memories and imagine possibilities almost as vividly as seeing them in person.';
    }

    let attentional_cadence_label = 'Steady & Measured Rhythm';
    let attentional_cadence_note =
      'Your attention locks in with an even, grounded rhythm—giving you steady pacing across both quiet and fast-moving moments.';
    if (rt_cv > 22.0 || false_starts >= 2) {
      attentional_cadence_label = 'Quick-Spark & Dynamic Rhythm';
      attentional_cadence_note =
        'Your attention moves in quick, high-energy bursts—anticipating what comes next and surging fastest when a moment feels alive, novel, and meaningful.';
    } else if (rt_ms >= 335.0 && rt_cv <= 20.0) {
      attentional_cadence_label = 'Deliberate & Unhurried Rhythm';
      attentional_cadence_note =
        'Your mind takes a calm beat to take in the moment before acting, trading rushed reflexes for steady, unhurried certainty.';
    }

    let pattern_memory_label = 'Big-Picture Impression Memory';
    let pattern_memory_note =
      'Your mind captures the overall gesture and flow of a space rather than holding onto rigid grid coordinates.';
    let pattern_synthesis_boost = 0.0;

    if (mem_acc >= 80.0 && chunk_ms <= 430.0) {
      pattern_memory_label = 'Whole-Constellation Memory';
      pattern_memory_note =
        'Instead of memorizing isolated points one by one, your mind naturally holds the whole constellation as a single connected shape.';
      pattern_synthesis_boost = Number(
        Math.min(4.5, (mem_acc - 75.0) * 0.1 + Math.max(0.0, 430.0 - chunk_ms) * 0.012).toFixed(1)
      );
    } else if (mem_acc >= 75.0) {
      pattern_memory_label = 'Careful Pattern Memory';
      pattern_memory_note =
        'You rebuild patterns step by step with deliberate care, making sure each star fits before placing the next.';
      pattern_synthesis_boost = 1.5;
    }

    return {
      minds_eye_label,
      minds_eye_tier,
      minds_eye_calm_note,
      attentional_cadence_label,
      attentional_cadence_calm_note: attentional_cadence_note,
      pattern_memory_label,
      pattern_memory_calm_note: pattern_memory_note,
      median_rt_ms: rt_ms,
      rt_cv_pct: rt_cv,
      rt_steadiness_pct: steadiness,
      false_starts,
      memory_accuracy_pct: mem_acc,
      mean_chunk_ms: chunk_ms,
      imagery_vividness: vivid,
      inner_modality: modality,
      aphantasia_deconfounder_applied: aphantasia_boost > 0.0,
      aphantasia_openness_boost_pct: aphantasia_boost,
      pattern_synthesis_boost_pct: pattern_synthesis_boost,
    };
  },

  extractEpistemicProbes(
    raw_scores: Record<DomainKey, number>,
    responses: Record<string | number, number> | null = null,
    telemetry: Partial<TelemetryState> | Record<string, unknown> | null = null
  ): EpistemicProbes {
    const getAns = (qid: number, def = 3.0): number => {
      if (!responses) return def;
      const v = responses[String(qid)] ?? responses[qid];
      return v !== undefined && v !== null ? Number(v) : def;
    };

    const q2 = getAns(2, 4.0);
    const q3 = getAns(3, 4.0);
    const q4 = getAns(4, 3.0);
    const q5 = getAns(5, 4.0);
    const q8 = getAns(8, 3.5);
    const q11 = getAns(11, 3.8);
    const q12 = getAns(12, 3.5);

    const normTel = this.normalizeTelemetry(telemetry);
    let rtPhasicBonus = 0.0;
    if (normTel.provided && normTel.rt_cv_pct > 22.0) {
      rtPhasicBonus = Math.min(
        14.0,
        (normTel.rt_cv_pct - 22.0) * 0.85 + normTel.false_starts * 2.5
      );
    }

    const salience_split = clamp(
      (q3 - 1.0) * 24.0 + Math.max(0.0, 60.0 - Number(raw_scores.C ?? 50.0)) * 0.35 + rtPhasicBonus
    );
    const acoustic_split = clamp(
      (q5 - 1.0) * 23.0 + Math.max(0.0, 60.0 - Number(raw_scores.E ?? 50.0)) * 0.3
    );
    const valence_gain = clamp((q2 - 1.0) * 22.0 + Number(raw_scores.O ?? 50.0) * 0.18);
    const compensatory_masking = clamp((q11 - 1.0) * 21.0 + (q4 - 2.5) * 8.0);

    const epoch_heaviness = (q12 - 3.0) / 2.0;
    const inferred_mood_energy = Number((-epoch_heaviness * 0.65).toFixed(2));
    const inferred_self_criticism = Number(
      Math.max(0.0, epoch_heaviness * 0.55 + (q11 - 3.0) * 0.2).toFixed(2)
    );

    return {
      salience_split_index: Number(salience_split.toFixed(1)),
      acoustic_stream_index: Number(acoustic_split.toFixed(1)),
      valence_gain_index: Number(valence_gain.toFixed(1)),
      directness_preference: Number(((q8 - 1.0) * 25.0).toFixed(1)),
      compensatory_masking_index: Number(compensatory_masking.toFixed(1)),
      inferred_mood_energy,
      inferred_self_criticism,
    };
  },

  scoreResponsesIRT(
    responses: Record<string | number, number>,
    telemetry: Partial<TelemetryState> | Record<string, unknown> | null = null
  ): IRTScoringResult {
    const bundle = this.getBundle();
    const items = bundle.item_bank_schema.items;
    const raw_scores: Record<DomainKey, number> = { O: 50, C: 50, E: 50, A: 50, N: 50 };
    const standard_errors: Record<DomainKey, number> = { O: 10, C: 10, E: 10, A: 10, N: 10 };
    const tel_profile = this.buildTelemetryProfile(telemetry);
    const norm_tel = this.normalizeTelemetry(telemetry);

    for (const d of DOMAIN_KEYS) {
      const domItems = items.filter(
        (it) =>
          it.domain === d &&
          it.layer !== 'compensatory_masking_probe' &&
          it.layer !== 'differential_epoch_probe' &&
          it.layer !== 'shadow_behavioral_probe' &&
          it.calibration_status !== 'shadow_candidate' &&
          Number(it.weight ?? 1.0) > 0.0
      );
      let weightedSum = 0.0;
      let weightTotal = 0.0;
      let fisherSum = 0.25;

      for (const it of domItems) {
        const ans = responses[String(it.id)] ?? responses[it.id];
        if (ans === undefined || ans === null) continue;
        const centered = (Number(ans) - 3.0) * Number(it.direction);
        const w = Number(it.weight);
        weightedSum += centered * w;
        weightTotal += 2.0 * w;

        const a = Number(it.irt_a || 1.5);
        const b = Number(it.irt_b || 0.0);
        const theta = centered / 2.0;
        const p = 1.0 / (1.0 + Math.exp(-a * (theta - b)));
        fisherSum += a * a * p * (1.0 - p);
      }

      raw_scores[d] =
        weightTotal > 0 ? Number(clamp(50.0 + (weightedSum / weightTotal) * 46.0).toFixed(1)) : 50.0;
      standard_errors[d] = Number(
        Math.min(18.0, Math.max(2.5, (1.0 / Math.sqrt(fisherSum)) * 12.0)).toFixed(1)
      );
    }

    const shadow_item_diagnostics: ShadowItemDiagnostic[] = [];
    for (const it of items) {
      if (it.calibration_status === 'shadow_candidate' || it.layer === 'shadow_behavioral_probe') {
        const ans = responses[String(it.id)] ?? responses[it.id];
        if (ans === undefined || ans === null) continue;
        const ans_f = Number(ans);
        const d = it.domain;
        const centered = (ans_f - 3.0) * Number(it.direction ?? 1);
        const implied_domain_pct = Number(clamp(50.0 + (centered / 2.0) * 46.0).toFixed(1));
        const anchor_domain_pct = raw_scores[d] ?? 50.0;
        shadow_item_diagnostics.push({
          item_id: Number(it.id),
          domain: d,
          probe_type: it.probe_type || 'shadow_probe',
          calibration_status: it.calibration_status || 'shadow_candidate',
          anchor_weight_applied: 0.0,
          raw_likert_response: ans_f,
          implied_domain_pct,
          anchor_domain_pct,
          divergence_from_anchor_pct: Number((implied_domain_pct - anchor_domain_pct).toFixed(1)),
          empirical_prior_r: Number(it.empirical_prior_r ?? 0.0),
          calm_theme: it.calm_theme || 'Everyday habit',
        });
      }
    }

    const aphantasia_boost = tel_profile.aphantasia_openness_boost_pct;
    const pattern_boost = norm_tel.provided ? tel_profile.pattern_synthesis_boost_pct : 0.0;
    const telemetry_deconfounded_scores = { ...raw_scores };
    if (aphantasia_boost > 0.0 || pattern_boost > 0.0) {
      telemetry_deconfounded_scores.O = Number(
        clamp(raw_scores.O + aphantasia_boost + pattern_boost * 0.5).toFixed(1)
      );
    }

    const seVals = Object.values(standard_errors);
    const mean_confidence_band = Number(
      (seVals.reduce((a, b) => a + b, 0) / seVals.length).toFixed(1)
    );
    return {
      raw_scores,
      telemetry_deconfounded_scores,
      aphantasia_openness_boost_pct: aphantasia_boost,
      standard_errors,
      mean_confidence_band,
      telemetry_profile: tel_profile,
      shadow_item_diagnostics,
    };
  },

  inferNeurodevelopmentalMaskProbabilities(
    debiased_scores: Record<DomainKey, number>,
    responses: Record<string | number, number> | null = null,
    telemetry: Partial<TelemetryState> | Record<string, unknown> | null = null
  ): MaskPosterior[] {
    const bundle = this.getBundle();
    const probes = this.extractEpistemicProbes(debiased_scores, responses, telemetry);
    const normTel = this.normalizeTelemetry(telemetry);
    const q4 =
      responses && (responses['4'] ?? responses[4]) !== undefined
        ? Number(responses['4'] ?? responses[4])
        : 3.0;

    const rt_cv = normTel.rt_cv_pct;
    const false_starts = normTel.false_starts;
    const mem_acc = normTel.memory_accuracy_pct;
    const chunk_ms = normTel.mean_chunk_ms;
    const vivid = normTel.imagery_vividness;
    const modality = normTel.inner_modality;

    const logits = bundle.masks_schema.masks.map((m) => {
      const mid = m.id;
      let sq = 0;
      for (const d of DOMAIN_KEYS) {
        const exp = 50 + Number(m.prior_offsets[d] || 0);
        const obs = Number(debiased_scores[d] ?? 50);
        sq += (obs - exp) * (obs - exp);
      }
      const dist = Math.sqrt(sq);

      let epistemic_evidence = 0.0;
      if (mid === 'adhd_dopamine_forager') {
        epistemic_evidence += (probes.salience_split_index - 50.0) * 0.045;
        if (q4 <= 3.0) epistemic_evidence += 0.35;
        if (normTel.provided) {
          if (rt_cv > 22.0) epistemic_evidence += 0.65 + Math.min(0.6, (rt_cv - 22.0) * 0.03);
          if (false_starts >= 1) epistemic_evidence += Math.min(0.55, false_starts * 0.22);
        }
      } else if (mid === 'monotropic_sensory_precision') {
        epistemic_evidence += (probes.acoustic_stream_index - 50.0) * 0.045;
        epistemic_evidence += (probes.directness_preference - 50.0) * 0.025;
        if (normTel.provided) {
          if (mem_acc >= 80.0 && chunk_ms <= 420.0) epistemic_evidence += 0.4;
          if (vivid <= 25.0 || modality === 'wordless_concept') epistemic_evidence += 0.25;
          if (rt_cv <= 18.0 && false_starts === 0) epistemic_evidence += 0.2;
        }
      } else if (mid === 'audhd_dual_attractor') {
        if (
          probes.salience_split_index >= 62.0 &&
          (probes.acoustic_stream_index >= 62.0 || q4 >= 3.8)
        ) {
          epistemic_evidence += 1.25;
        }
        if (normTel.provided) {
          if (rt_cv > 22.0 && mem_acc >= 80.0) epistemic_evidence += 0.65;
          else if (rt_cv > 22.0) epistemic_evidence += 0.35;
          if (vivid <= 25.0 && mem_acc >= 78.0) epistemic_evidence += 0.25;
        }
      } else if (mid === 'hsp_high_gain_sensor') {
        epistemic_evidence += (probes.valence_gain_index - 55.0) * 0.04;
        if (Number(debiased_scores.A ?? 50.0) >= 62.0) epistemic_evidence += 0.45;
        if (normTel.provided && vivid >= 81.0) epistemic_evidence += 0.4;
      } else if (mid === 'canonical_allistic') {
        if (probes.salience_split_index < 55.0 && probes.acoustic_stream_index < 55.0) {
          epistemic_evidence += 0.95;
        }
        if (
          normTel.provided &&
          rt_cv <= 18.0 &&
          false_starts === 0 &&
          vivid >= 26.0 &&
          vivid <= 80.0
        ) {
          epistemic_evidence += 0.35;
        }
      }

      const logit = -dist / 19.0 + epistemic_evidence;
      return { m, logit, dist };
    });

    const maxL = Math.max(...logits.map((x) => x.logit));
    const expSum = logits.reduce((acc, x) => acc + Math.exp(x.logit - maxL), 0);

    return logits
      .map(({ m, logit, dist }) => ({
        mask_id: m.id,
        name: m.name,
        short_label: m.short_label,
        calm_title: m.calm_title || m.short_label,
        calm_badge: m.calm_Badge || m.calm_badge || m.badge,
        fit_probability: Number(((Math.exp(logit - maxL) / expSum) * 100).toFixed(1)),
        euclidean_distance: Number(dist.toFixed(1)),
      }))
      .sort((a, b) => b.fit_probability - a.fit_probability);
  },

  decomposeSignal({
    raw_scores,
    mask_id = 'auto',
    mood_energy = null,
    self_criticism = null,
    responses = null,
    telemetry = null,
  }: {
    raw_scores: Record<DomainKey, number>;
    mask_id?: string;
    mood_energy?: number | null;
    self_criticism?: number | null;
    responses?: Record<string | number, number> | null;
    telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
  }): DecompositionResult {
    const bundle = this.getBundle();
    const domainsById: Record<string, (typeof bundle.cortical_schema.domains)[0]> = {};
    for (const d of bundle.cortical_schema.domains) domainsById[d.id] = d;
    const masksById: Record<string, (typeof bundle.masks_schema.masks)[0]> = {};
    for (const m of bundle.masks_schema.masks) masksById[m.id] = m;

    const probes = this.extractEpistemicProbes(raw_scores, responses, telemetry);
    const telemetry_profile = this.buildTelemetryProfile(telemetry);
    const normTel = this.normalizeTelemetry(telemetry);

    const effMood =
      mood_energy !== null && mood_energy !== undefined
        ? Number(mood_energy)
        : probes.inferred_mood_energy;
    const effCrit =
      self_criticism !== null && self_criticism !== undefined
        ? Number(self_criticism)
        : probes.inferred_self_criticism;

    const mEnergy = Math.max(-1.0, Math.min(1.0, effMood));
    const sCrit = Math.max(-1.0, Math.min(1.0, effCrit));

    const state_halo_shift: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    const debiased_scores: Record<DomainKey, number> = { O: 50, C: 50, E: 50, A: 50, N: 50 };
    const hardware_baseline: Record<DomainKey, number> = { O: 50, C: 50, E: 50, A: 50, N: 50 };
    const residual_personality: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    const mask_modulated_effective: Record<DomainKey, number> = {
      O: 50,
      C: 50,
      E: 50,
      A: 50,
      N: 50,
    };

    for (const d of DOMAIN_KEYS) {
      const domMeta = domainsById[d];
      const lam = Number(domMeta.mood_susceptibility);
      const rawVal = Number(raw_scores[d] ?? 50.0);

      let halo = 0.0;
      if (d === 'N') {
        halo = (-mEnergy * 14.0 + sCrit * 16.0) * lam;
      } else if (d === 'C' || d === 'E') {
        halo = (mEnergy * 15.0 - sCrit * 14.0) * lam;
      } else {
        halo = (mEnergy * 8.0 - sCrit * 6.0) * lam;
      }

      state_halo_shift[d] = Number(halo.toFixed(1));
      const debiased = clamp(rawVal - halo);
      debiased_scores[d] = Number(debiased.toFixed(1));
    }

    const aphantasia_boost = telemetry_profile.aphantasia_openness_boost_pct;
    const pattern_boost = normTel.provided ? telemetry_profile.pattern_synthesis_boost_pct : 0.0;
    if (aphantasia_boost > 0.0 || pattern_boost > 0.0) {
      debiased_scores.O = Number(
        clamp(debiased_scores.O + aphantasia_boost + pattern_boost * 0.4).toFixed(1)
      );
    }

    const inferred_mask_posteriors = this.inferNeurodevelopmentalMaskProbabilities(
      debiased_scores,
      responses,
      telemetry
    );

    const resolvedMaskId =
      !mask_id || mask_id === 'auto' || !masksById[mask_id]
        ? inferred_mask_posteriors[0].mask_id
        : mask_id;
    const mask = masksById[resolvedMaskId] || masksById['canonical_allistic'];

    for (const d of DOMAIN_KEYS) {
      const offset = Number(mask.prior_offsets[d] || 0.0);
      const bWire = clamp(50.0 + offset);
      hardware_baseline[d] = Number(bWire.toFixed(1));

      const deltaP = Number((debiased_scores[d] - bWire).toFixed(1));
      residual_personality[d] = deltaP;
      mask_modulated_effective[d] = Number(clamp(50.0 + deltaP).toFixed(1));
    }

    const gating = mask.gating_reinterpretation;
    const salienceBoost = Number(gating.salience_vs_routine_split || 0);
    const socialUnmask = Number(gating.sensory_overload_social_penalty || 0);
    const perceptualUnmask = Number(gating.perceptual_gain_to_volatility_confound || 0);

    const routine_conscientiousness = debiased_scores.C;
    const salience_locked_drive = Number(clamp(debiased_scores.C + salienceBoost).toFixed(1));
    const crowd_foraging_extraversion = debiased_scores.E;
    const dyadic_1on1_capacity = Number(clamp(debiased_scores.E + socialUnmask).toFixed(1));
    const raw_threat_sensitivity = debiased_scores.N;
    const true_affective_dysregulation = Number(
      clamp(debiased_scores.N - perceptualUnmask * 0.75).toFixed(1)
    );
    const perceptual_signal_resolution = Number(
      clamp(debiased_scores.O * 0.6 + debiased_scores.N * 0.4 + perceptualUnmask * 0.5).toFixed(1)
    );

    const O_eff = debiased_scores.O;
    const C_eff = debiased_scores.C;
    const E_eff = debiased_scores.E;
    const A_eff = debiased_scores.A;
    const N_eff = true_affective_dysregulation;

    const l_EI = E_eff >= 50 ? 'E' : 'I';
    const l_NS = O_eff >= 50 ? 'N' : 'S';
    const l_TF = A_eff >= 50 ? 'F' : 'T';
    const l_JP = C_eff >= 50 ? 'J' : 'P';
    const l_AT = N_eff >= 50 ? 'T' : 'A';
    const mbti_code = `${l_EI}${l_NS}${l_TF}${l_JP}`;

    const confs = [
      Math.abs(E_eff - 50) * 2,
      Math.abs(O_eff - 50) * 2,
      Math.abs(A_eff - 50) * 2,
      Math.abs(C_eff - 50) * 2,
    ];
    const pole_clarity_pct = Math.round(52 + (confs.reduce((a, b) => a + b, 0) / 4) * 0.46);

    const probs = (['O', 'C', 'E', 'A'] as DomainKey[]).map((k) =>
      Math.max(0.03, Math.min(0.97, debiased_scores[k] / 100))
    );
    const entropy =
      -probs.reduce((acc, p) => acc + (p * Math.log2(p) + (1 - p) * Math.log2(1 - p)), 0) / 4;

    const intellectBoost = pattern_boost + (aphantasia_boost > 0 ? 3.5 : 0.0);
    const deyoung_10_aspects = {
      O_intellect: Number(clamp(O_eff * 1.04 - 2 + intellectBoost).toFixed(1)),
      O_openness: Number(clamp(O_eff * 0.96 + 3).toFixed(1)),
      C_industriousness:
        salienceBoost > 0 ? salience_locked_drive : Number(clamp(C_eff * 1.03).toFixed(1)),
      C_orderliness: Number(clamp(routine_conscientiousness * 0.95).toFixed(1)),
      E_enthusiasm:
        socialUnmask > 0 ? dyadic_1on1_capacity : Number(clamp(E_eff * 1.02).toFixed(1)),
      E_assertiveness: Number(clamp(E_eff * 0.94 + (100 - A_eff) * 0.12).toFixed(1)),
      A_compassion: Number(clamp(A_eff * 1.05).toFixed(1)),
      A_politeness: Number(clamp(A_eff * 0.92).toFixed(1)),
      N_withdrawal: Number(clamp(true_affective_dysregulation * 1.02).toFixed(1)),
      N_volatility: Number(clamp(true_affective_dysregulation * 0.92).toFixed(1)),
    };

    const sortedDomains = [...DOMAIN_KEYS].sort(
      (a, b) => Math.abs(residual_personality[b]) - Math.abs(residual_personality[a])
    );
    const calmRhythmTitle = mask.calm_title || mask.short_label;
    const top_unique_divergences = sortedDomains.slice(0, 3).map((k) => {
      const diff = residual_personality[k];
      const calmName = CALM_DIMENSION_LABELS[k]?.name || domainsById[k].name;
      const interp =
        diff >= 0
          ? `More ${calmName.toLowerCase()} than is typical even for a ${calmRhythmTitle} (+${Math.round(
              Math.abs(diff)
            )}%).`
          : `More selective and measured in ${calmName.toLowerCase()} than a typical ${calmRhythmTitle} (${Math.round(
              diff
            )}%).`;
      return {
        domain: k,
        domain_name: calmName,
        delta: diff,
        interpretation: interp,
      };
    });

    const compIdx = probes.compensatory_masking_index;
    let masking_note =
      'What people see on the outside closely matches how effortless things feel on the inside.';
    if (compIdx >= 65.0) {
      masking_note =
        'People see how steady and capable you are on the outside, though they rarely see how much quiet energy you spend behind the scenes to keep everything running smoothly.';
    } else if (compIdx >= 45.0) {
      masking_note =
        'You balance natural spontaneity with thoughtful effort when structure is needed.';
    }

    let season_note = 'Your current energy feels close to your natural, rested baseline.';
    if (mEnergy <= -0.2) {
      season_note =
        "Because these past couple of weeks have felt heavier than your rested baseline, we gently adjusted your portrait so temporary fatigue isn't mistaken for who you are.";
    } else if (mEnergy >= 0.25) {
      season_note =
        'You’re in a bright, high-energy season right now—your portrait reflects both your current momentum and your steady core underneath.';
    }

    return {
      mask_applied: {
        id: mask.id,
        name: mask.name,
        short_label: mask.short_label,
        calm_title: calmRhythmTitle,
        calm_badge: mask.calm_Badge || mask.calm_badge || mask.badge,
        calm_summary: mask.calm_summary || mask.neural_mechanism,
        calm_reframe: mask.calm_reframe || mask.diagnostic_note,
        badge: mask.badge,
        neural_mechanism: mask.neural_mechanism,
        diagnostic_note: mask.diagnostic_note,
      },
      epistemic_probes: probes,
      telemetry_profile,
      calm_notes: {
        masking_note,
        season_note,
        minds_eye_note: telemetry_profile.minds_eye_calm_note,
      },
      signal_layers: {
        raw_observed: raw_scores,
        state_halo_shift,
        aphantasia_openness_boost: aphantasia_boost,
        debiased_scores,
        hardware_baseline,
        residual_personality,
        mask_modulated_effective,
      },
      gating_deconfound: {
        routine_conscientiousness,
        salience_locked_drive,
        crowd_foraging_extraversion,
        dyadic_1on1_capacity,
        raw_threat_sensitivity,
        true_affective_dysregulation,
        perceptual_signal_resolution,
      },
      cortical_4d: {
        mbti_code,
        full_code: `${mbti_code}-${l_AT}`,
        pole_clarity_pct,
        shannon_entropy_bits: Number(entropy.toFixed(2)),
        observer_manifold_dims: 4,
      },
      deyoung_10_aspects,
      top_unique_divergences,
      inferred_mask_posteriors,
    };
  },

  analyzeChemistry({
    person_a,
    person_b,
    context_mode = 'partner',
  }: {
    person_a: {
      name: string;
      scores: Record<DomainKey, number>;
      mask_id?: string;
      mood_energy?: number | null;
      self_criticism?: number | null;
      responses?: Record<string | number, number> | null;
      telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
    };
    person_b: {
      name: string;
      scores: Record<DomainKey, number>;
      mask_id?: string;
      mood_energy?: number | null;
      self_criticism?: number | null;
      responses?: Record<string | number, number> | null;
      telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
    };
    context_mode?: 'partner' | 'cofounder' | 'friend';
  }): ChemistryResult {
    const decompA = this.decomposeSignal({
      raw_scores: person_a.scores,
      mask_id: person_a.mask_id || 'auto',
      mood_energy: person_a.mood_energy,
      self_criticism: person_a.self_criticism,
      responses: person_a.responses,
      telemetry: person_a.telemetry,
    });
    const decompB = this.decomposeSignal({
      raw_scores: person_b.scores,
      mask_id: person_b.mask_id || 'auto',
      mood_energy: person_b.mood_energy,
      self_criticism: person_b.self_criticism,
      responses: person_b.responses,
      telemetry: person_b.telemetry,
    });

    const aDeb = decompA.signal_layers.debiased_scores;
    const bDeb = decompB.signal_layers.debiased_scores;
    const aGate = decompA.gating_deconfound;
    const bGate = decompB.gating_deconfound;

    const priorSync = 100 - Math.abs(aDeb.O - bDeb.O) * 0.75;
    const allostaticSafety =
      (aDeb.A + bDeb.A) * 0.52 -
      Math.abs(aGate.true_affective_dysregulation - bGate.true_affective_dysregulation) * 0.22;
    const rawCGap = Math.abs(aDeb.C - bDeb.C);
    const deconfoundedDriveGap = Math.abs(
      aGate.salience_locked_drive - bGate.salience_locked_drive
    );
    const executionHarmony = 100 - (rawCGap * 0.35 + deconfoundedDriveGap * 0.35);

    const overall = Math.round(
      clamp(priorSync * 0.38 + allostaticSafety * 0.34 + executionHarmony * 0.28, 52, 98)
    );

    const nameA = person_a.name || 'You';
    const nameB = person_b.name || 'Partner';
    const rhythmA = decompA.mask_applied.calm_title || decompA.mask_applied.short_label;
    const rhythmB = decompB.mask_applied.calm_title || decompB.mask_applied.short_label;

    return {
      overall_resonance_pct: overall,
      context_mode,
      sub_metrics: {
        cortical_prior_sync: Math.round(clamp(priorSync)),
        allostatic_safety: Math.round(clamp(allostaticSafety)),
        deconfounded_execution_bridge: Math.round(clamp(executionHarmony)),
        raw_unmasked_c_gap: Math.round(rawCGap),
        mask_corrected_drive_gap: Math.round(deconfoundedDriveGap),
      },
      neuro_translation_note: `On the surface, ${nameA} and ${nameB} have different paces around everyday checklists. Once you honor that ${nameA} moves with a ${rhythmA} and ${nameB} moves with a ${rhythmB}, you see that both of you bring deep care and devotion—just triggered in different ways.`,
      person_a_decomposition: decompA,
      person_b_decomposition: decompB,
    };
  },
};

export const AuraAPI = {
  backendConnected: false,

  async fetchScienceModels() {
    try {
      const res = await fetch('/api/v1/science/models', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        this.backendConnected = true;
        if (data && data.item_bank_schema && Array.isArray(data.item_bank_schema.items)) {
          // Ensure items 13, 14, 15 are preserved if backend item bank has them or merge with local
          const localState = loadLocalStudioState();
          const byId = new Map<number, ItemBankQuestion>();
          for (const it of data.item_bank_schema.items) byId.set(Number(it.id), it);
          for (const it of localState.questions) {
            if (!byId.has(Number(it.id))) byId.set(Number(it.id), it);
          }
          data.item_bank_schema.items = Array.from(byId.values()).sort((a, b) => a.id - b.id);
        }
        window.AURA_SCIENCE_BUNDLE = {
          ...AURA_SCIENCE_BUNDLE,
          ...data,
        };
        return window.AURA_SCIENCE_BUNDLE;
      }
    } catch {
      // Static edge fallback
    }
    this.backendConnected = false;
    loadLocalStudioState();
    return EdgeScienceMirror.getBundle();
  },

  async scoreAssessment(payload: {
    responses: Record<string | number, number>;
    mask_id?: string;
    mood_energy?: number | null;
    self_criticism?: number | null;
    telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
  }): Promise<ScoreAssessmentResult> {
    const telemetry =
      payload.telemetry ||
      (typeof window !== 'undefined' && window.AuraMicroGames
        ? window.AuraMicroGames.getState()
        : null);
    const reqBody = { ...payload, telemetry };
    if (this.backendConnected) {
      try {
        const res = await fetch('/api/v1/assessment/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback below
      }
    }
    const irt_scoring = EdgeScienceMirror.scoreResponsesIRT(payload.responses || {}, telemetry);
    const decomposition = EdgeScienceMirror.decomposeSignal({
      raw_scores: irt_scoring.raw_scores,
      mask_id: payload.mask_id || 'auto',
      mood_energy: payload.mood_energy,
      self_criticism: payload.self_criticism,
      responses: payload.responses,
      telemetry,
    });
    return { irt_scoring, decomposition };
  },

  async decomposeSignal(payload: {
    raw_scores: Record<DomainKey, number>;
    mask_id?: string;
    mood_energy?: number | null;
    self_criticism?: number | null;
    responses?: Record<string | number, number> | null;
    telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
  }): Promise<DecompositionResult> {
    const telemetry =
      payload.telemetry ||
      (typeof window !== 'undefined' && window.AuraMicroGames
        ? window.AuraMicroGames.getState()
        : null);
    const reqBody = { ...payload, telemetry };
    if (this.backendConnected) {
      try {
        const res = await fetch('/api/v1/assessment/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback below
      }
    }
    return EdgeScienceMirror.decomposeSignal(reqBody);
  },

  async analyzeChemistry(
    payload: Parameters<typeof EdgeScienceMirror.analyzeChemistry>[0]
  ): Promise<ChemistryResult> {
    if (this.backendConnected) {
      try {
        const res = await fetch('/api/v1/chemistry/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback below
      }
    }
    return EdgeScienceMirror.analyzeChemistry(payload);
  },

  // ============================================================================
  // Kae & Conner Studio Collaboration Endpoints (with deterministic fallback)
  // ============================================================================
  async getStudioOverview(): Promise<{
    questions: ItemBankQuestion[];
    flows: StudioFlow[];
    active_flow_id: string;
    shadow_calibration_matrix: ShadowCalibrationRow[];
  }> {
    const localState = loadLocalStudioState();
    try {
      const res = await fetch('/api/v1/studio/overview', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.questions)) {
          const mergedQuestions = data.questions as ItemBankQuestion[];
          const mergedFlows = Array.isArray(data.flows) ? (data.flows as StudioFlow[]) : localState.flows;
          const active_flow_id =
            data.active_flow_id ||
            mergedFlows.find((f) => f.is_active)?.id ||
            localState.active_flow_id;
          const matrix = Array.isArray(data.shadow_calibration_matrix)
            ? data.shadow_calibration_matrix
            : localState.shadow_calibration_matrix;

          const updated: LocalStudioState = {
            questions: mergedQuestions,
            flows: mergedFlows,
            active_flow_id,
            shadow_calibration_matrix: matrix,
          };
          saveLocalStudioState(updated);
          return updated;
        }
      }
    } catch {
      // Fallback to localStudioState
    }
    return localState;
  },

  async addStudioQuestion(input: {
    text: string;
    calm_theme: string;
    domain: DomainKey;
    probe_type: string;
    calibration_status: 'calibrated_anchor' | 'shadow_candidate';
    direction: number;
    empirical_prior_r?: number;
    scientific_hypothesis?: string;
  }): Promise<ItemBankQuestion> {
    const localState = loadLocalStudioState();
    const nextId =
      localState.questions.reduce((max, q) => Math.max(max, Number(q.id)), 15) + 1;

    const isShadow = input.calibration_status === 'shadow_candidate';
    const newQuestion: ItemBankQuestion = {
      id: nextId,
      domain: input.domain,
      aspect: CALM_DIMENSION_LABELS[input.domain]?.name || 'Custom Studio Probe',
      layer: isShadow ? 'shadow_behavioral_probe' : 'cortical_invariant',
      probe_type: input.probe_type || (isShadow ? 'sneaky_custom_probe' : 'cortical_prior'),
      calibration_status: input.calibration_status,
      empirical_prior_r: input.empirical_prior_r ?? (isShadow ? 0.54 : 0.65),
      direction: input.direction || 1,
      weight: isShadow ? 0.0 : 1.15,
      irt_a: 1.5,
      irt_b: 0.0,
      mood_halo_loading: 0.15,
      text: input.text.trim(),
      calm_theme: input.calm_theme.trim() || 'Everyday reflection',
      scientific_hypothesis:
        input.scientific_hypothesis ||
        'Added in Kae & Conner Studio for live SAPA empirical calibration.',
    };

    try {
      const res = await fetch('/api/v1/studio/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion),
      });
      if (res.ok) {
        const created = await res.json();
        if (created && created.id) {
          newQuestion.id = Number(created.id);
        }
      }
    } catch {
      // Fallback to local persistence
    }

    localState.questions = [...localState.questions, newQuestion];
    if (isShadow) {
      localState.shadow_calibration_matrix = [
        ...localState.shadow_calibration_matrix,
        {
          question_id: newQuestion.id,
          short_name: `${newQuestion.calm_theme} (Q#${newQuestion.id})`,
          prompt_snippet:
            newQuestion.text.length > 76
              ? `${newQuestion.text.slice(0, 76)}...`
              : newQuestion.text,
          target_domain: newQuestion.domain,
          target_probe: newQuestion.probe_type,
          anchor_weight: 0.0,
          r_with_anchor_domain: Number(newQuestion.empirical_prior_r ?? 0.54),
          r_with_epistemic_probe: 0.51,
          r_with_mind_moment: 'Still Water / Inner Canvas (r = +0.39)',
          sample_n: 50,
          promotion_readiness: 'Calibrating (Shadow w=0)',
          hypothesis: newQuestion.scientific_hypothesis || '',
        },
      ];
    }
    saveLocalStudioState(localState);
    return newQuestion;
  },

  async saveStudioFlow(flow: StudioFlow): Promise<StudioFlow> {
    const localState = loadLocalStudioState();
    try {
      const res = await fetch('/api/v1/studio/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          flow = { ...flow, ...saved };
        }
      }
    } catch {
      // Fallback to local persistence
    }

    const idx = localState.flows.findIndex((f) => f.id === flow.id);
    if (idx >= 0) {
      localState.flows[idx] = flow;
    } else {
      localState.flows.push(flow);
    }
    saveLocalStudioState(localState);
    return flow;
  },

  async activateStudioFlow(flowId: string): Promise<StudioFlow[]> {
    const localState = loadLocalStudioState();
    try {
      await fetch(`/api/v1/studio/flows/${encodeURIComponent(flowId)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_id: flowId }),
      });
    } catch {
      // Fallback to local persistence
    }

    localState.active_flow_id = flowId;
    localState.flows = localState.flows.map((f) => ({
      ...f,
      is_active: f.id === flowId,
    }));
    saveLocalStudioState(localState);
    return localState.flows;
  },

  async runCohortSimulation(
    flowId: string,
    cohortSize = 50
  ): Promise<CohortSimulationResult> {
    const localState = loadLocalStudioState();
    const flow =
      localState.flows.find((f) => f.id === flowId) || localState.flows[0];

    try {
      const res = await fetch('/api/v1/agent/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_id: flow.id, n_users: cohortSize }),
      });
      if (res.ok) {
        const remoteSim = await res.json();
        if (remoteSim && remoteSim.flow_id) {
          return remoteSim as CohortSimulationResult;
        }
      }
    } catch {
      // Deterministic Monte Carlo simulation fallback
    }

    // Run a deterministic 50-synthetic-user simulation across the flow's questions & branches
    const branchCounts = new Map<string, number>();
    for (const br of flow.branches) branchCounts.set(br.id, 0);

    const rhythmCounts = new Map<string, { title: string; count: number }>();
    for (const m of AURA_SCIENCE_BUNDLE.masks_schema.masks) {
      rhythmCounts.set(m.id, { title: m.calm_title || m.short_label, count: 0 });
    }

    let totalAnswered = 0;

    for (let u = 0; u < cohortSize; u++) {
      const synthResponses: Record<number, number> = {};
      // Deterministic pseudo-random answer profile per synthetic user
      for (const qid of flow.question_ids) {
        const seed = (u * 31 + qid * 17) % 100;
        const val = seed < 15 ? 2 : seed < 40 ? 3 : seed < 74 ? 4 : 5;
        synthResponses[qid] = val;
      }

      for (const br of flow.branches) {
        const ans = synthResponses[br.if_question_id] ?? 3;
        const hit =
          br.operator === '>='
            ? ans >= br.threshold
            : br.operator === '<='
            ? ans <= br.threshold
            : br.operator === '>'
            ? ans > br.threshold
            : br.operator === '<'
            ? ans < br.threshold
            : ans === br.threshold;
        if (hit) {
          branchCounts.set(br.id, (branchCounts.get(br.id) || 0) + 1);
        }
      }

      totalAnswered += flow.question_ids.length;
      const irt = EdgeScienceMirror.scoreResponsesIRT(synthResponses, null);
      const decomp = EdgeScienceMirror.decomposeSignal({
        raw_scores: irt.raw_scores,
        responses: synthResponses,
      });
      const rId = decomp.mask_applied.id;
      const entry = rhythmCounts.get(rId);
      if (entry) entry.count += 1;
    }

    const shadowQuestions = localState.questions.filter(
      (q) => q.calibration_status === 'shadow_candidate' || q.weight === 0
    );

    return {
      flow_id: flow.id,
      flow_name: flow.name,
      synthetic_cohort_size: cohortSize,
      mean_questions_answered: Number((totalAnswered / cohortSize).toFixed(1)),
      branch_trigger_rates: flow.branches.map((br) => {
        const c = branchCounts.get(br.id) || 0;
        return {
          rule_id: br.id,
          description: `IF Q#${br.if_question_id} ${br.operator} ${br.threshold} ➔ Q#${br.then_goto_question_id}`,
          triggered_count: c,
          trigger_rate_pct: Math.round((c / cohortSize) * 100),
        };
      }),
      discovered_rhythm_distribution: Array.from(rhythmCounts.entries()).map(
        ([mask_id, info]) => ({
          mask_id,
          calm_title: info.title,
          count: info.count,
          pct: Math.round((info.count / cohortSize) * 100),
        })
      ),
      shadow_empirical_correlations: shadowQuestions.map((sq) => ({
        question_id: sq.id,
        calm_theme: sq.calm_theme,
        domain: sq.domain,
        observed_r_anchor: Number((sq.empirical_prior_r ?? -0.58).toFixed(2)),
        observed_r_telemetry: Number(
          (sq.id === 13 ? 0.49 : sq.id === 14 ? 0.37 : sq.id === 15 ? 0.41 : 0.43).toFixed(2)
        ),
        se_reduction_if_promoted_pct: sq.id === 15 ? 14.2 : sq.id === 13 ? 12.8 : 11.4,
      })),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  },
};

declare global {
  interface Window {
    AuraAPI: typeof AuraAPI;
  }
}

if (typeof window !== 'undefined') {
  window.AuraAPI = AuraAPI;
}
