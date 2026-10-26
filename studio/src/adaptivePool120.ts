import {
  AdaptiveCandidateScore,
  AdaptiveSelectionResult,
  AgeBand,
  DomainKey,
  DomainPosterior,
  ItemBankQuestion,
  LifeContext,
  LocaleSetting,
  MorphedQuestionResult,
  NodeTier,
  ParentTriggerRule,
  SupportedLanguage,
  TelemetryState,
  UserContextProfile,
} from './types/aura';

export const EXACT_15_SLUGS: Record<number, string> = {
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

export function getAdaptiveQuestionSlug(
  q: Pick<ItemBankQuestion, 'id'> & { slug?: string; calm_theme?: string }
): string {
  if (EXACT_15_SLUGS[q.id]) return EXACT_15_SLUGS[q.id];
  if (q.slug && q.slug.trim()) return q.slug.trim();
  const cleanTheme = (q.calm_theme || 'reflection')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const padWidth = q.id <= 15 ? 2 : 3;
  return `q-${String(q.id).padStart(padWidth, '0')}-${cleanTheme || 'item'}`;
}

export const ADAPTIVE_POOL_120: ItemBankQuestion[] = [
  // ==========================================================================
  // TIER 1: CORE CALIBRATED ANCHORS (IDs 1..12)
  // ==========================================================================
  {
    id: 1,
    slug: 'q-01-deeper-patterns',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.25,
    irt_a: 1.65,
    irt_b: -0.15,
    mood_halo_loading: 0.05,
    text: 'When I’m learning something new, I naturally look for the deeper pattern of how it all fits together before worrying about the small details.',
    calm_theme: 'How you take in ideas',
    scientific_hypothesis: 'Primary cortical prior anchor for top-down structural compression vs bottom-up exemplar accumulation.',
  },
  {
    id: 2,
    slug: 'q-02-subtle-shifts',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'double_dissociation_valence',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.2,
    irt_a: 1.55,
    irt_b: -0.2,
    mood_halo_loading: 0.08,
    text: 'A small shift in the light in a room, a piece of music, or someone’s tone of voice can stay with me for a long time.',
    calm_theme: 'What you notice',
    scientific_hypothesis: 'Separates high perceptual-aesthetic gain (HSP/Openness) from threat-driven vigilance.',
  },
  {
    id: 3,
    slug: 'q-03-focus-flow',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.25,
    irt_a: 1.78,
    irt_b: 0.05,
    mood_halo_loading: 0.35,
    text: 'Simple everyday errands can sit on my list for days, yet when a question or project truly fascinates me, hours pass like minutes.',
    calm_theme: 'Where your focus flows',
    scientific_hypothesis: 'Primary double-dissociation probe separating salience-gated dopamine foraging from routine chore completion.',
  },
  {
    id: 4,
    slug: 'q-04-tidy-space',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.52,
    irt_b: 0.05,
    mood_halo_loading: 0.25,
    text: 'My mind feels noticeably calmer when my space is tidy and I know what the next few days look like.',
    calm_theme: 'Structure & rhythm',
    scientific_hypothesis: 'Measures environmental entropy suppression and predictability preference.',
  },
  {
    id: 5,
    slug: 'q-05-two-conversations',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.25,
    irt_a: 1.72,
    irt_b: -0.05,
    mood_halo_loading: 0.3,
    text: 'When two conversations are happening at the same table, both voices reach me at almost the same volume—I feel much more at ease talking one-on-one.',
    calm_theme: 'Shared spaces',
    scientific_hypothesis: 'Isolates thalamocortical acoustic stream competition from genuine dyadic social warmth.',
  },
  {
    id: 6,
    slug: 'q-06-group-momentum',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'neuromodulatory_state',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.5,
    irt_b: 0.2,
    mood_halo_loading: 0.45,
    text: 'If a group of friends or coworkers is unsure what to do next, I feel comfortable gently stepping in to guide the plan.',
    calm_theme: 'Shared momentum',
    scientific_hypothesis: 'Measures social agency and vector leadership in unstructured group coordination.',
  },
  {
    id: 7,
    slug: 'q-07-feeling-heard',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.25,
    irt_a: 1.68,
    irt_b: -0.2,
    mood_halo_loading: 0.12,
    text: 'In a disagreement with someone I care about, making sure we both feel heard matters more to me than winning the point.',
    calm_theme: 'Connection & care',
    scientific_hypothesis: 'Measures interpersonal allostatic coupling vs decoupled point-scoring.',
  },
  {
    id: 8,
    slug: 'q-08-direct-truth',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'directness_prior',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.15,
    irt_a: 1.45,
    irt_b: 0.15,
    mood_halo_loading: 0.15,
    text: 'I appreciate when people say exactly what they mean, rather than wrapping the truth in polite hints.',
    calm_theme: 'Clarity with others',
    scientific_hypothesis: 'Distinguishes low-hint epistemic directness from low compassion.',
  },
  {
    id: 9,
    slug: 'q-09-looking-ahead',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'neuromodulatory_state',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.2,
    irt_a: 1.65,
    irt_b: 0.0,
    mood_halo_loading: 0.65,
    text: 'Even when things are going well, part of my mind quietly thinks ahead to what might need protecting.',
    calm_theme: 'Looking ahead',
    scientific_hypothesis: 'Captures prospective uncertainty forecasting and protective vigilance.',
  },
  {
    id: 10,
    slug: 'q-10-sudden-change',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'neuromodulatory_state',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.15,
    irt_a: 1.58,
    irt_b: -0.1,
    mood_halo_loading: 0.6,
    text: 'When plans change suddenly, I usually find my footing quickly without feeling thrown off for long.',
    calm_theme: 'Steadiness in change',
    scientific_hypothesis: 'Measures state-transition elasticity and affective buffering under surprise.',
  },
  {
    id: 11,
    slug: 'q-11-quiet-effort',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'compensatory_masking_probe',
    probe_type: 'compensatory_effort_cost',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 0.9,
    irt_a: 1.7,
    irt_b: 0.0,
    mood_halo_loading: 0.35,
    text: 'People around me see me as steady and on top of things, though they rarely see how much quiet effort it takes me behind the scenes.',
    calm_theme: 'Quiet effort',
    scientific_hypothesis: 'Quantifies behind-the-scenes executive scaffolding and compensatory masking cost.',
  },
  {
    id: 12,
    slug: 'q-12-current-season',
    node_tier: 'anchor',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'differential_epoch_probe',
    probe_type: 'epoch_state_delta',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 0.85,
    irt_a: 1.75,
    irt_b: 0.0,
    mood_halo_loading: 0.8,
    text: 'Compared to times in my life when I’ve felt most rested and at ease, these past couple of weeks have felt heavier or more tiring.',
    calm_theme: 'Your current season',
    scientific_hypothesis: 'Separates acute 2-week allostatic fatigue S_state(t) from lifelong trait baseline.',
  },

  // ==========================================================================
  // TIER 4 (SEEDED 13..15): EVERYDAY MOMENT SHADOW PROBES (IDs 13..15)
  // ==========================================================================
  {
    id: 13,
    slug: 'q-13-browser-tabs',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'If Q#3 >= 4 (curiosity vs routine split), branch to open-loop browser tabs habit probe.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_open_loops',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.61,
    direction: -1,
    weight: 0.0,
    irt_a: 1.42,
    irt_b: -0.1,
    mood_halo_loading: 0.14,
    text: 'Having 20+ open browser tabs or saved links feels more like a cozy library of possibilities than clutter I need to clear right away.',
    calm_theme: 'Everyday digital habits',
    scientific_hypothesis: 'Disarming ecological proxy for exploratory novelty foraging vs linear closure (Anchor C r = -0.61).',
  },
  {
    id: 14,
    slug: 'q-14-text-warmth',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'If Q#7 >= 4 (connection & care), branch to digital text-message warmth cushioning probe.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_text_cushion',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.58,
    direction: 1,
    weight: 0.0,
    irt_a: 1.48,
    irt_b: -0.25,
    mood_halo_loading: 0.16,
    text: "When sending a short text like 'Sounds good', I often add an exclamation point, emoji, or 'haha' just so a plain period doesn't accidentally read as cold.",
    calm_theme: 'Micro-moments of warmth',
    scientific_hypothesis: 'Captures interpersonal allostatic tone cushioning (Anchor A r = +0.58).',
  },
  {
    id: 15,
    slug: 'q-15-canceled-plans',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'If Q#5 >= 4 (two-conversation sensory split), branch to canceled-plan relief wave probe.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_canceled_plans',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.63,
    direction: -1,
    weight: 0.0,
    irt_a: 1.54,
    irt_b: -0.15,
    mood_halo_loading: 0.24,
    text: 'When a social plan I genuinely wanted to go to gets canceled at the last minute, my very first physical reaction is a quiet wave of relief.',
    calm_theme: 'Energy & transitions',
    scientific_hypothesis: 'Decouples affiliative care from autonomic transition & sensory saturation cost (Anchor E r = -0.63).',
  },

  // ==========================================================================
  // TIER 2: CONDITIONAL BRANCH PROBES (IDs 16..50)
  // ==========================================================================
  {
    id: 16,
    slug: 'q-016-metaphor-bridges',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 1,
      operator: '>=',
      threshold: 4,
      rationale: 'High pattern-seeking on Q#1 branches to cross-domain metaphor synthesis.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.74,
    irt_b: 0.45,
    mood_halo_loading: 0.06,
    text: 'I often explain a tricky idea by comparing it to something from a completely different part of life.',
    calm_theme: 'Connecting worlds',
    scientific_hypothesis: 'Probes relational abstraction across distant semantic manifolds.',
  },
  {
    id: 17,
    slug: 'q-017-concrete-first-steps',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 1,
      operator: '<=',
      threshold: 2,
      rationale: 'Practical preference on Q#1 branches to concrete hands-on learning.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.1,
    irt_a: 1.58,
    irt_b: -0.65,
    mood_halo_loading: 0.06,
    text: 'When someone teaches me a new skill, I prefer clear step-by-step examples over long theories about why it works.',
    calm_theme: 'Hands-on clarity',
    scientific_hypothesis: 'Resolves grounded procedural learning vs abstract theorizing at negative theta.',
  },
  {
    id: 18,
    slug: 'q-018-room-lighting-mood',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 4,
      rationale: 'High sensory notice on Q#2 branches to ambient light & sound sensitivity.',
    },
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'double_dissociation_valence',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.76,
    irt_b: 0.35,
    mood_halo_loading: 0.1,
    text: 'Harsh overhead lighting or a humming appliance in the background can quietly pull at my attention until I soften the space.',
    calm_theme: 'Sensory atmosphere',
    scientific_hypothesis: 'Distinguishes high sensory gain from affective anxiety.',
  },
  {
    id: 19,
    slug: 'q-019-lyrics-vs-melody',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 3,
      rationale: 'Moderate-to-high aesthetic notice on Q#2 probes harmonic texture capture.',
    },
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'double_dissociation_valence',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.56,
    irt_b: -0.15,
    mood_halo_loading: 0.08,
    text: 'When I hear a song for the first time, I feel the mood and texture of the sound long before I catch all the words.',
    calm_theme: 'Sound & feeling',
    scientific_hypothesis: 'Captures right-hemisphere prosodic/timbral envelope dominance.',
  },
  {
    id: 20,
    slug: 'q-020-rabbit-hole-joy',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'Salience hyperfocus on Q#3 branches to curiosity-driven exploration cascades.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.81,
    irt_b: 0.55,
    mood_halo_loading: 0.09,
    text: 'A random question at dinner can easily send me on a happy thirty-minute dive to understand how something actually works.',
    calm_theme: 'Following curiosity',
    scientific_hypothesis: 'Links phasic epistemic curiosity to O_intellect under salience gating.',
  },
  {
    id: 21,
    slug: 'q-021-unspoken-subtext',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'Emotional attunement on Q#7 probes intuitive reading of unspoken room atmosphere.',
    },
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'double_dissociation_valence',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.64,
    irt_b: 0.2,
    mood_halo_loading: 0.12,
    text: 'When I walk into a room, I usually sense the unspoken mood between people before anyone says a word.',
    calm_theme: 'Reading the room',
    scientific_hypothesis: 'Probes rapid implicit social-affective field perception.',
  },
  {
    id: 22,
    slug: 'q-022-spatial-mental-models',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 16,
      operator: '>=',
      threshold: 4,
      rationale: 'Deep metaphor synthesis on Q#16 branches to wordless structural intuition.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.2,
    irt_a: 1.79,
    irt_b: 0.85,
    mood_halo_loading: 0.05,
    text: 'Even when I don’t picture a detailed scene, I can feel the shape and structure of a complex problem in my mind.',
    calm_theme: 'Wordless structure',
    scientific_hypothesis: 'Aphantasia-safe high-threshold probe for non-visual topological reasoning.',
  },
  {
    id: 23,
    slug: 'q-023-novelty-sprint-energy',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'High salience split on Q#3 probes urgency and novelty-gated execution sprints.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.2,
    irt_a: 1.84,
    irt_b: 0.4,
    mood_halo_loading: 0.28,
    text: 'I often get more done in one inspired three-hour burst than in a whole week of trying to chip away ten minutes a day.',
    calm_theme: 'Burst vs steady pace',
    scientific_hypothesis: 'Discriminates phasic burst industriousness from linear incremental pacing.',
  },
  {
    id: 24,
    slug: 'q-024-deep-focus-tunnel',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'High salience split on Q#3 probes monotropic deep-tunnel flow protection.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.78,
    irt_b: 0.6,
    mood_halo_loading: 0.22,
    text: 'Once I’m deep inside a project that matters to me, a quick five-minute interruption takes me a long time to recover from.',
    calm_theme: 'Protecting deep focus',
    scientific_hypothesis: 'Captures monotropic attention-tunnel inertia and context-switch cost.',
  },
  {
    id: 25,
    slug: 'q-025-steady-checklist-peace',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 3,
      operator: '<=',
      threshold: 2,
      rationale: 'Low salience split on Q#3 probes linear sequential task satisfaction.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.62,
    irt_b: -0.5,
    mood_halo_loading: 0.2,
    text: 'I genuinely enjoy finishing small routine tasks in order before starting the next big thing.',
    calm_theme: 'Steady completion',
    scientific_hypothesis: 'Verifies tonic striatal gating and sequential closure reward.',
  },
  {
    id: 26,
    slug: 'q-026-visual-piles-memory',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 4,
      operator: '<=',
      threshold: 2,
      rationale: 'Low tidy-space reliance on Q#4 probes spatial-pile visual cue memory.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.1,
    irt_a: 1.69,
    irt_b: -0.55,
    mood_halo_loading: 0.18,
    text: 'If I tuck an important item away in a closed drawer, I’m much more likely to forget it exists than if I leave it where I can see it.',
    calm_theme: 'Visual memory cues',
    scientific_hypothesis: 'Captures object-permanence working-memory externalization in Spark rhythms.',
  },
  {
    id: 27,
    slug: 'q-027-evening-reset-ritual',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 4,
      operator: '>=',
      threshold: 4,
      rationale: 'High orderliness on Q#4 probes evening environment reset rituals.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.66,
    irt_b: 0.5,
    mood_halo_loading: 0.2,
    text: 'Putting things back in their place at the end of the day helps my mind close the chapter and rest.',
    calm_theme: 'Evening reset',
    scientific_hypothesis: 'Probes high-threshold environmental closure and sensory predictability.',
  },
  {
    id: 28,
    slug: 'q-028-invisible-prep-buffer',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 11,
      operator: '>=',
      threshold: 4,
      rationale: 'High quiet effort on Q#11 branches to over-preparing systems to prevent slips.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'compensatory_masking_probe',
    probe_type: 'compensatory_effort_cost',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.0,
    irt_a: 1.75,
    irt_b: 0.65,
    mood_halo_loading: 0.32,
    text: 'I often double-check times, directions, or reminders early so I never accidentally let someone down.',
    calm_theme: 'Careful preparation',
    scientific_hypothesis: 'Measures compensatory executive scaffolding under high conscientious appearance.',
  },
  {
    id: 29,
    slug: 'q-029-body-doubling-spark',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 23,
      operator: '>=',
      threshold: 4,
      rationale: 'Novelty sprint responder on Q#23 branches to co-working / body-doubling activation.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.1,
    irt_a: 1.71,
    irt_b: 0.25,
    mood_halo_loading: 0.2,
    text: 'A boring chore becomes ten times easier to start when someone else is quietly working in the same room.',
    calm_theme: 'Shared focus presence',
    scientific_hypothesis: 'Identifies social-allostatic task initiation scaffolding (body doubling).',
  },
  {
    id: 30,
    slug: 'q-030-quiet-corner-recharge',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'High acoustic saturation on Q#5 branches to post-gathering decompression need.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.2,
    irt_a: 1.8,
    irt_b: -0.45,
    mood_halo_loading: 0.25,
    text: 'Even after a wonderful gathering with people I love, I need quiet time alone to let my nervous system settle.',
    calm_theme: 'Quiet decompression',
    scientific_hypothesis: 'Separates post-social sensory recovery from low social warmth.',
  },
  {
    id: 31,
    slug: 'q-031-fireside-depth-joy',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'High 1-on-1 preference on Q#5 decouples dyadic warmth from crowd fatigue.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.74,
    irt_b: 0.15,
    mood_halo_loading: 0.2,
    text: 'In a calm, one-on-one conversation with a close friend, I can talk and laugh for hours without feeling drained.',
    calm_theme: 'One-on-one warmth',
    scientific_hypothesis: 'Measures unmasked dyadic social reward capacity when acoustic noise is removed.',
  },
  {
    id: 32,
    slug: 'q-032-lively-room-spark',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 5,
      operator: '<=',
      threshold: 2,
      rationale: 'Low acoustic saturation on Q#5 probes multi-stream social buzz energization.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'neuromodulatory_state',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.68,
    irt_b: 0.7,
    mood_halo_loading: 0.3,
    text: 'Walking into a lively gathering with music and overlapping conversations gives me an immediate lift of energy.',
    calm_theme: 'Shared buzz',
    scientific_hypothesis: 'Probes high-threshold extraverted reward gain in high-entropy environments.',
  },
  {
    id: 33,
    slug: 'q-033-gentle-facilitator',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 6,
      operator: '>=',
      threshold: 4,
      rationale: 'High group guidance on Q#6 branches to calm consensus catalysis.',
    },
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'neuromodulatory_state',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.65,
    irt_b: 0.55,
    mood_halo_loading: 0.3,
    text: 'When a conversation is going in circles, I naturally summarize what everyone agrees on so we can move forward.',
    calm_theme: 'Guiding clarity',
    scientific_hypothesis: 'Measures constructive social assertiveness and group synthesis.',
  },
  {
    id: 34,
    slug: 'q-034-lead-by-craft',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 6,
      operator: '<=',
      threshold: 2,
      rationale: 'Low verbal steering on Q#6 probes quiet leadership through example and craft.',
    },
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'neuromodulatory_state',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.1,
    irt_a: 1.59,
    irt_b: -0.6,
    mood_halo_loading: 0.25,
    text: 'I would rather contribute through thoughtful work behind the scenes than be the loudest voice steering the room.',
    calm_theme: 'Quiet contribution',
    scientific_hypothesis: 'Calibrates low-assertiveness / high-autonomy preference without social anxiety.',
  },
  {
    id: 35,
    slug: 'q-035-voice-note-warmth',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 31,
      operator: '>=',
      threshold: 4,
      rationale: 'Dyadic warmth on Q#31 branches to asynchronous deep connection habits.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.63,
    irt_b: 0.1,
    mood_halo_loading: 0.18,
    text: 'I love exchanging thoughtful voice notes or long messages with close friends where we can each reply at our own pace.',
    calm_theme: 'Unhurried connection',
    scientific_hypothesis: 'Measures high affiliative investment paired with asynchronous pacing control.',
  },
  {
    id: 36,
    slug: 'q-036-hosting-with-purpose',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 6,
      operator: '>=',
      threshold: 3,
      rationale: 'Moderate-to-high social agency on Q#6 probes structured role comfort in groups.',
    },
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'neuromodulatory_state',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.61,
    irt_b: 0.3,
    mood_halo_loading: 0.28,
    text: 'Gatherings feel much easier for me when I have a clear role—like cooking, hosting, or welcoming new faces.',
    calm_theme: 'Purposeful role',
    scientific_hypothesis: 'Captures role-structured social agency vs unstructured mingling.',
  },
  {
    id: 37,
    slug: 'q-037-emotional-barometer',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'High care on Q#7 branches to somatic absorption of others’ tension.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.2,
    irt_a: 1.79,
    irt_b: 0.45,
    mood_halo_loading: 0.2,
    text: 'When someone close to me is stressed or hurting, I feel a physical echo of it in my own body until they feel steadier.',
    calm_theme: 'Deep empathy',
    scientific_hypothesis: 'Measures high-gain insula/mirror allostatic resonance.',
  },
  {
    id: 38,
    slug: 'q-038-practical-care-acts',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 7,
      operator: '<=',
      threshold: 3,
      rationale: 'Measured verbal reassurance on Q#7 probes showing care through practical help.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.6,
    irt_b: -0.35,
    mood_halo_loading: 0.12,
    text: 'When someone I love is overwhelmed, my first instinct is to quietly fix a practical problem to take weight off their shoulders.',
    calm_theme: 'Practical devotion',
    scientific_hypothesis: 'Prevents instrumental care styles from being misclassified as coldness.',
  },
  {
    id: 39,
    slug: 'q-039-kind-candor-balance',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 8,
      operator: '>=',
      threshold: 4,
      rationale: 'High directness preference on Q#8 probes respectful truth-telling without harshness.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'directness_prior',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.15,
    irt_a: 1.72,
    irt_b: 0.3,
    mood_halo_loading: 0.14,
    text: 'To me, being honest and clear with someone is one of the deepest forms of respect I can offer.',
    calm_theme: 'Honest respect',
    scientific_hypothesis: 'Separates high-clarity epistemic honesty from interpersonal antagonism.',
  },
  {
    id: 40,
    slug: 'q-040-softening-the-landing',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 8,
      operator: '<=',
      threshold: 2,
      rationale: 'Diplomatic preference on Q#8 probes protective phrasing to preserve dignity.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.67,
    irt_b: 0.5,
    mood_halo_loading: 0.16,
    text: 'Before giving feedback, I carefully choose words that protect the other person’s confidence and dignity.',
    calm_theme: 'Gentle delivery',
    scientific_hypothesis: 'Measures high normative politeness and interpersonal face-saving.',
  },
  {
    id: 41,
    slug: 'q-041-micro-expression-radar',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 4,
      rationale: 'High subtle shift notice on Q#2 branches to interpersonal micro-shift sensitivity.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'double_dissociation_valence',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.75,
    irt_b: 0.6,
    mood_halo_loading: 0.18,
    text: 'I notice right away when someone’s smile doesn’t quite reach their eyes, even if they say everything is fine.',
    calm_theme: 'Unspoken care',
    scientific_hypothesis: 'Cross-loads perceptual sensitivity with empathic compassion.',
  },
  {
    id: 42,
    slug: 'q-042-boundary-guilt-echo',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 11,
      operator: '>=',
      threshold: 4,
      rationale: 'High behind-the-scenes effort on Q#11 probes lingering guilt after saying no.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'compensatory_masking_probe',
    probe_type: 'compensatory_effort_cost',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.1,
    irt_a: 1.71,
    irt_b: 0.4,
    mood_halo_loading: 0.3,
    text: 'Even when I have a good reason to say no to a request, part of me replays it afterward hoping they didn’t feel let down.',
    calm_theme: 'Protecting harmony',
    scientific_hypothesis: 'Captures affiliative fawning / over-accommodation cost.',
  },
  {
    id: 43,
    slug: 'q-043-clear-expectations-peace',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 8,
      operator: '>=',
      threshold: 4,
      rationale: 'Direct truth preference on Q#8 branches to relief in explicit agreements.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'directness_prior',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.1,
    irt_a: 1.64,
    irt_b: -0.2,
    mood_halo_loading: 0.15,
    text: 'Having to guess what someone really wants from subtle hints feels much more tiring than having an open conversation.',
    calm_theme: 'Unspoken rules',
    scientific_hypothesis: 'Identifies monotropic preference for explicit social contracts.',
  },
  {
    id: 44,
    slug: 'q-044-scenario-rehearsal',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 9,
      operator: '>=',
      threshold: 4,
      rationale: 'High looking-ahead vigilance on Q#9 branches to mental simulation of contingencies.',
    },
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'neuromodulatory_state',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.2,
    irt_a: 1.82,
    irt_b: 0.5,
    mood_halo_loading: 0.55,
    text: 'Before an important conversation, my mind naturally rehearses a few different ways it could unfold so I feel prepared.',
    calm_theme: 'Thinking ahead',
    scientific_hypothesis: 'Measures prospective active-inference policy simulation under uncertainty.',
  },
  {
    id: 45,
    slug: 'q-045-calm-in-real-crisis',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 9,
      operator: '>=',
      threshold: 4,
      rationale: 'High anticipatory vigilance on Q#9 tests paradoxical clarity during actual emergencies.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'double_dissociation_salience',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.15,
    irt_a: 1.73,
    irt_b: -0.25,
    mood_halo_loading: 0.35,
    text: 'Even if I overthink small everyday uncertainties, my mind becomes surprisingly clear and steady when a real emergency happens.',
    calm_theme: 'Clarity under pressure',
    scientific_hypothesis: 'Captures ADHD/Spark paradoxical catecholamine normalization under acute urgency.',
  },
  {
    id: 46,
    slug: 'q-046-transition-friction-beat',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 10,
      operator: '<=',
      threshold: 2,
      rationale: 'Sudden-change sensitivity on Q#10 probes sensory/plan recalibration pause.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.77,
    irt_b: 0.55,
    mood_halo_loading: 0.48,
    text: 'When a plan changes at the last minute, I need a quiet beat to update my mental map before I can jump into the new plan.',
    calm_theme: 'Updating the map',
    scientific_hypothesis: 'Separates predictive-coding prior-update cost from emotional volatility.',
  },
  {
    id: 47,
    slug: 'q-047-unruffled-pivot',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 10,
      operator: '>=',
      threshold: 4,
      rationale: 'High steadiness in change on Q#10 probes low-friction improvisational pivoting.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'neuromodulatory_state',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 1.15,
    irt_a: 1.65,
    irt_b: -0.7,
    mood_halo_loading: 0.45,
    text: 'A sudden detour or delayed train rarely bothers me—I treat it as part of the adventure.',
    calm_theme: 'Easy pivoting',
    scientific_hypothesis: 'Calibrates low negative prediction-error gain at negative N theta.',
  },
  {
    id: 48,
    slug: 'q-048-sensory-saturation-edge',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'Acoustic saturation on Q#5 separates sensory overload from emotional irritability.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'psychophysical_sensory_stream',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.8,
    irt_b: 0.35,
    mood_halo_loading: 0.42,
    text: 'When I feel frayed at the end of a long day, it’s usually from too much noise and commotion rather than being upset with anyone.',
    calm_theme: 'Sensory fullness',
    scientific_hypothesis: 'De-confounds sensory saturation from interpersonal volatility.',
  },
  {
    id: 49,
    slug: 'q-049-rested-self-contrast',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 12,
      operator: '>=',
      threshold: 4,
      rationale: 'Heavy current season on Q#12 branches to trait-vs-burnout state separation.',
    },
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'differential_epoch_probe',
    probe_type: 'epoch_state_delta',
    calibration_status: 'calibrated_anchor',
    direction: -1,
    weight: 0.95,
    irt_a: 1.76,
    irt_b: 0.25,
    mood_halo_loading: 0.75,
    text: 'When I have had a few days of real rest and low pressure, my natural optimism and curiosity return quickly.',
    calm_theme: 'Rested baseline',
    scientific_hypothesis: 'Confirms elastic trait recovery beneath acute allostatic load.',
  },
  {
    id: 50,
    slug: 'q-050-quiet-recovery-sanctuary',
    node_tier: 'branch_probe',
    parent_trigger: {
      if_question_id: 12,
      operator: '>=',
      threshold: 4,
      rationale: 'Current season fatigue on Q#12 probes restorative solitude recovery speed.',
    },
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'differential_epoch_probe',
    probe_type: 'epoch_state_delta',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.0,
    irt_a: 1.68,
    irt_b: 0.15,
    mood_halo_loading: 0.65,
    text: 'During busy seasons, protecting one unscheduled evening with zero obligations is essential for my peace of mind.',
    calm_theme: 'Sanctuary time',
    scientific_hypothesis: 'Measures intentional allostatic pacing during high-load epochs.',
  },

  // ==========================================================================
  // TIER 3: DEEP RESOLUTION 2PL IRT ITEMS (IDs 51..100)
  // ==========================================================================
  {
    id: 51,
    slug: 'q-051-everyday-curiosity',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.62,
    irt_b: -1.45,
    mood_halo_loading: 0.12,
    text: 'I enjoy learning a little bit about how everyday things around me are made or repaired.',
    calm_theme: 'Everyday curiosity',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.45 for aspect Abstract Systemizing (Intellect).',
  },
  {
    id: 52,
    slug: 'q-052-connecting-dots',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.7,
    irt_b: -0.75,
    mood_halo_loading: 0.12,
    text: 'When reading or watching something new, I like noticing how it connects to ideas I already know.',
    calm_theme: 'Connecting dots',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.75 for aspect Abstract Systemizing (Intellect).',
  },
  {
    id: 53,
    slug: 'q-053-questioning-assumptions',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.78,
    irt_b: 0.05,
    mood_halo_loading: 0.12,
    text: 'Even when a rule or habit is widely accepted, I like asking whether there is a wiser way to do it.',
    calm_theme: 'Fresh angles',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.05 for aspect Abstract Systemizing (Intellect).',
  },
  {
    id: 54,
    slug: 'q-054-complex-systems-play',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.85,
    irt_b: 0.8,
    mood_halo_loading: 0.12,
    text: 'Untangling a complicated problem with many moving parts feels more like play to me than work.',
    calm_theme: 'Deep systems',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.80 for aspect Abstract Systemizing (Intellect).',
  },
  {
    id: 55,
    slug: 'q-055-first-principles-synthesis',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'cortical_invariant',
    probe_type: 'cortical_prior',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.9,
    irt_b: 1.45,
    mood_halo_loading: 0.12,
    text: 'My mind naturally builds whole mental frameworks that unify ideas across science, art, and human behavior.',
    calm_theme: 'First principles',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.45 for aspect Abstract Systemizing (Intellect).',
  },
  {
    id: 56,
    slug: 'q-056-appreciating-craft',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'cortical_invariant',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.58,
    irt_b: -1.4,
    mood_halo_loading: 0.12,
    text: 'A warm cup of tea, a well-made tool, or a clean melody can brighten my mood right away.',
    calm_theme: 'Everyday beauty',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.40 for aspect Perceptual & Aesthetic Depth.',
  },
  {
    id: 57,
    slug: 'q-057-seasonal-light-notice',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'cortical_invariant',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.68,
    irt_b: -0.7,
    mood_halo_loading: 0.12,
    text: 'I notice the subtle change in the air and light whenever one season begins turning into the next.',
    calm_theme: 'Seasonal shifts',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.70 for aspect Perceptual & Aesthetic Depth.',
  },
  {
    id: 58,
    slug: 'q-058-texture-and-space',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'cortical_invariant',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.76,
    irt_b: 0.0,
    mood_halo_loading: 0.12,
    text: 'The colors, textures, and layout of a room strongly shape how clearly and comfortably I can think inside it.',
    calm_theme: 'Space & texture',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.00 for aspect Perceptual & Aesthetic Depth.',
  },
  {
    id: 59,
    slug: 'q-059-goosebumps-art-resonance',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'cortical_invariant',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.84,
    irt_b: 0.75,
    mood_halo_loading: 0.12,
    text: 'A single chord change in a song or a striking line in a story can give me physical goosebumps.',
    calm_theme: 'Deep resonance',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.75 for aspect Perceptual & Aesthetic Depth.',
  },
  {
    id: 60,
    slug: 'q-060-synesthetic-atmosphere',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'cortical_invariant',
    probe_type: 'valence_signal_gain',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.88,
    irt_b: 1.4,
    mood_halo_loading: 0.12,
    text: 'Places, memories, and ideas each carry their own distinct color, rhythm, or atmosphere in my mind.',
    calm_theme: 'Vivid inner world',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.40 for aspect Perceptual & Aesthetic Depth.',
  },
  {
    id: 61,
    slug: 'q-061-showing-up-for-others',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.6,
    irt_b: -1.45,
    mood_halo_loading: 0.12,
    text: 'When someone is counting on me, I find a way to show up and get the job done.',
    calm_theme: 'Keeping promises',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.45 for aspect Goal-Locked Drive (Industriousness).',
  },
  {
    id: 62,
    slug: 'q-062-steady-morning-start',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.68,
    irt_b: -0.8,
    mood_halo_loading: 0.12,
    text: 'Once I get moving on the first task of my day, it is much easier to keep a steady rhythm going.',
    calm_theme: 'Morning momentum',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.80 for aspect Goal-Locked Drive (Industriousness).',
  },
  {
    id: 63,
    slug: 'q-063-pacing-long-projects',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.75,
    irt_b: -0.05,
    mood_halo_loading: 0.12,
    text: 'On a month-long project, I can break the work into steady weekly steps without waiting for last-minute pressure.',
    calm_theme: 'Long-range pacing',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.05 for aspect Goal-Locked Drive (Industriousness).',
  },
  {
    id: 64,
    slug: 'q-064-unprompted-follow-through',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.82,
    irt_b: 0.85,
    mood_halo_loading: 0.12,
    text: 'Even when a task is tedious and nobody is checking on me, I finish it cleanly so it isn’t hanging over me.',
    calm_theme: 'Quiet discipline',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.85 for aspect Goal-Locked Drive (Industriousness).',
  },
  {
    id: 65,
    slug: 'q-065-effortless-habit-engine',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.89,
    irt_b: 1.5,
    mood_halo_loading: 0.12,
    text: 'Translating a long-term goal into daily habits feels natural and almost effortless to maintain over months.',
    calm_theme: 'Automatic follow-through',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.50 for aspect Goal-Locked Drive (Industriousness).',
  },
  {
    id: 66,
    slug: 'q-066-essentials-home-spot',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.56,
    irt_b: -1.35,
    mood_halo_loading: 0.12,
    text: 'I keep my keys, wallet, or essentials in a familiar spot so I don’t have to hunt for them.',
    calm_theme: 'Everyday essentials',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.35 for aspect Entropy Suppression (Orderliness).',
  },
  {
    id: 67,
    slug: 'q-067-clear-surface-start',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.65,
    irt_b: -0.65,
    mood_halo_loading: 0.12,
    text: 'Clearing off my table or workspace for two minutes helps me settle in before I begin working.',
    calm_theme: 'Clear workspace',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.65 for aspect Entropy Suppression (Orderliness).',
  },
  {
    id: 68,
    slug: 'q-068-structured-week-map',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.74,
    irt_b: 0.1,
    mood_halo_loading: 0.12,
    text: 'I like looking at my week on Sunday or Monday so there are no surprise collisions in my schedule.',
    calm_theme: 'Mapping the week',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.10 for aspect Entropy Suppression (Orderliness).',
  },
  {
    id: 69,
    slug: 'q-069-labeled-systems-joy',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.81,
    irt_b: 0.8,
    mood_halo_loading: 0.12,
    text: 'Organizing files, tools, or shelves into a clean, logical system gives me a genuine sense of calm.',
    calm_theme: 'Intentional order',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.80 for aspect Entropy Suppression (Orderliness).',
  },
  {
    id: 70,
    slug: 'q-070-zero-entropy-sanctuary',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'cortical_invariant',
    probe_type: 'attractor_depth',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.87,
    irt_b: 1.45,
    mood_halo_loading: 0.12,
    text: 'Everything in my home and digital life has a dedicated place, and I put things back almost immediately after using them.',
    calm_theme: 'Pristine order',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.45 for aspect Entropy Suppression (Orderliness).',
  },
  {
    id: 71,
    slug: 'q-071-warm-familiar-hello',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.58,
    irt_b: -1.4,
    mood_halo_loading: 0.12,
    text: 'Sharing a warm smile or brief hello with a neighbor or cashier feels quietly grounding.',
    calm_theme: 'Everyday warmth',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.40 for aspect Affiliative Reward Gain (Enthusiasm).',
  },
  {
    id: 72,
    slug: 'q-072-small-table-laughter',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.67,
    irt_b: -0.75,
    mood_halo_loading: 0.12,
    text: 'A relaxed meal with two or three people I trust leaves me feeling noticeably lighter and happier.',
    calm_theme: 'Shared laughter',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.75 for aspect Affiliative Reward Gain (Enthusiasm).',
  },
  {
    id: 73,
    slug: 'q-073-celebrating-good-news',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.75,
    irt_b: 0.0,
    mood_halo_loading: 0.12,
    text: 'When something exciting happens, my very first impulse is to reach out and share it with someone I love.',
    calm_theme: 'Sharing joy',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.00 for aspect Affiliative Reward Gain (Enthusiasm).',
  },
  {
    id: 74,
    slug: 'q-074-gathering-energizer',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.82,
    irt_b: 0.75,
    mood_halo_loading: 0.12,
    text: 'Being around upbeat, expressive people naturally recharges my batteries after a long solo stretch.',
    calm_theme: 'Social spark',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.75 for aspect Affiliative Reward Gain (Enthusiasm).',
  },
  {
    id: 75,
    slug: 'q-075-crowd-radiance',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.88,
    irt_b: 1.45,
    mood_halo_loading: 0.12,
    text: 'I feel most alive in vibrant rooms where I can bounce between conversations, meet new people, and build shared joy.',
    calm_theme: 'Radiant momentum',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.45 for aspect Affiliative Reward Gain (Enthusiasm).',
  },
  {
    id: 76,
    slug: 'q-076-speaking-up-kindly',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.6,
    irt_b: -1.45,
    mood_halo_loading: 0.12,
    text: 'If my order is mixed up or a small mistake happens, I can mention it calmly and politely.',
    calm_theme: 'Clear voice',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.45 for aspect Agency & Social Impact (Assertiveness).',
  },
  {
    id: 77,
    slug: 'q-077-sharing-an-idea',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.68,
    irt_b: -0.7,
    mood_halo_loading: 0.12,
    text: 'When I have a helpful idea in a small group, I feel comfortable putting it on the table.',
    calm_theme: 'Offering ideas',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.70 for aspect Agency & Social Impact (Assertiveness).',
  },
  {
    id: 78,
    slug: 'q-078-setting-the-direction',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.76,
    irt_b: 0.05,
    mood_halo_loading: 0.12,
    text: 'When a team is hesitating at a crossroads, I don’t mind making the call so everyone can move forward.',
    calm_theme: 'Steady direction',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.05 for aspect Agency & Social Impact (Assertiveness).',
  },
  {
    id: 79,
    slug: 'q-079-rallying-a-room',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.83,
    irt_b: 0.85,
    mood_halo_loading: 0.12,
    text: 'I enjoy stepping up in front of a group to rally people around a clear vision or ambitious goal.',
    calm_theme: 'Catalyzing action',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.85 for aspect Agency & Social Impact (Assertiveness).',
  },
  {
    id: 80,
    slug: 'q-080-natural-helm-presence',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'cortical_invariant',
    probe_type: 'social_agency',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.9,
    irt_b: 1.5,
    mood_halo_loading: 0.12,
    text: 'In high-stakes rooms, people naturally look to me to set the pace, negotiate clearly, and lead the charge.',
    calm_theme: 'Commanding clarity',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.50 for aspect Agency & Social Impact (Assertiveness).',
  },
  {
    id: 81,
    slug: 'q-081-wishing-well',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.58,
    irt_b: -1.5,
    mood_halo_loading: 0.12,
    text: 'When I see someone having a rough day in public, I silently wish for things to get easier for them.',
    calm_theme: 'Quiet goodwill',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.50 for aspect Allostatic Resonance (Compassion).',
  },
  {
    id: 82,
    slug: 'q-082-listening-without-rushing',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.69,
    irt_b: -0.8,
    mood_halo_loading: 0.12,
    text: 'When a friend needs to vent, I can sit with them and listen warmly without rushing to change the subject.',
    calm_theme: 'Unhurried listening',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.80 for aspect Allostatic Resonance (Compassion).',
  },
  {
    id: 83,
    slug: 'q-083-noticing-the-quiet-person',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.77,
    irt_b: -0.05,
    mood_halo_loading: 0.12,
    text: 'In a group conversation, I naturally notice if someone gets talked over and gently loop them back in.',
    calm_theme: 'Including others',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.05 for aspect Allostatic Resonance (Compassion).',
  },
  {
    id: 84,
    slug: 'q-084-holding-space-deeply',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.84,
    irt_b: 0.75,
    mood_halo_loading: 0.12,
    text: 'People often open up to me about things they haven’t told anyone else because they feel safe in my presence.',
    calm_theme: 'Deep holding',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.75 for aspect Allostatic Resonance (Compassion).',
  },
  {
    id: 85,
    slug: 'q-085-boundless-allostatic-care',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.89,
    irt_b: 1.4,
    mood_halo_loading: 0.12,
    text: 'Caring for the emotional well-being of the people around me feels like one of the central purposes of my life.',
    calm_theme: 'Wholehearted care',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.40 for aspect Allostatic Resonance (Compassion).',
  },
  {
    id: 86,
    slug: 'q-086-basic-fair-play',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.56,
    irt_b: -1.35,
    mood_halo_loading: 0.12,
    text: 'I treat everyone—from a company leader to someone sweeping the floor—with the same basic respect.',
    calm_theme: 'Fairness & respect',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.35 for aspect Normative Friction Suppression (Politeness).',
  },
  {
    id: 87,
    slug: 'q-087-patient-in-delays',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.65,
    irt_b: -0.65,
    mood_halo_loading: 0.12,
    text: 'When a line is moving slowly and people are doing their best, I keep my tone patient and kind.',
    calm_theme: 'Everyday patience',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.65 for aspect Normative Friction Suppression (Politeness).',
  },
  {
    id: 88,
    slug: 'q-088-deescalating-tension',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.74,
    irt_b: 0.05,
    mood_halo_loading: 0.12,
    text: 'When a discussion starts getting heated, I naturally lower my voice to help everyone stay respectful.',
    calm_theme: 'Cooling tension',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.05 for aspect Normative Friction Suppression (Politeness).',
  },
  {
    id: 89,
    slug: 'q-089-graceful-disagreement',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.81,
    irt_b: 0.8,
    mood_halo_loading: 0.12,
    text: 'Even when I strongly disagree with someone, I frame my point so they never feel belittled or cornered.',
    calm_theme: 'Diplomatic grace',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.80 for aspect Normative Friction Suppression (Politeness).',
  },
  {
    id: 90,
    slug: 'q-090-unshakeable-diplomacy',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'cortical_invariant',
    probe_type: 'allostatic_coupling',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.86,
    irt_b: 1.45,
    mood_halo_loading: 0.12,
    text: 'I almost never use sarcasm or sharp edges in an argument, even when the other person is being difficult.',
    calm_theme: 'Deep diplomacy',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.45 for aspect Normative Friction Suppression (Politeness).',
  },
  {
    id: 91,
    slug: 'q-091-healthy-caution',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'cortical_invariant',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.59,
    irt_b: -1.45,
    mood_halo_loading: 0.12,
    text: 'Before making a big commitment, I like taking a night to sleep on it and make sure it feels right.',
    calm_theme: 'Practical care',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.45 for aspect Uncertainty Vigilance (Withdrawal).',
  },
  {
    id: 92,
    slug: 'q-092-replaying-a-moment',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'cortical_invariant',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.68,
    irt_b: -0.75,
    mood_halo_loading: 0.12,
    text: 'After an important meeting or conversation, I sometimes replay a phrase I said and wonder how it came across.',
    calm_theme: 'Second-guessing',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.75 for aspect Uncertainty Vigilance (Withdrawal).',
  },
  {
    id: 93,
    slug: 'q-093-uncertainty-weight',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'cortical_invariant',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.76,
    irt_b: 0.0,
    mood_halo_loading: 0.12,
    text: 'Waiting for an important answer with no clear timeline takes up a noticeable amount of background energy in my mind.',
    calm_theme: 'Open uncertainty',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.00 for aspect Uncertainty Vigilance (Withdrawal).',
  },
  {
    id: 94,
    slug: 'q-094-protective-pullback',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'cortical_invariant',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.83,
    irt_b: 0.8,
    mood_halo_loading: 0.12,
    text: 'When several stressful things pile up at once, my instinct is to go quiet and pull back into my shell.',
    calm_theme: 'Pulling inward',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.80 for aspect Uncertainty Vigilance (Withdrawal).',
  },
  {
    id: 95,
    slug: 'q-095-hypervigilant-horizon',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'cortical_invariant',
    probe_type: 'threat_forecasting',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.9,
    irt_b: 1.5,
    mood_halo_loading: 0.12,
    text: 'My mind runs a nearly continuous background scan for what could go wrong so I’m never caught off guard.',
    calm_theme: 'Constant radar',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.50 for aspect Uncertainty Vigilance (Withdrawal).',
  },
  {
    id: 96,
    slug: 'q-096-noticing-frustration',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'cortical_invariant',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.58,
    irt_b: -1.4,
    mood_halo_loading: 0.12,
    text: 'When I’m hungry, tired, or rushed, I can feel my patience getting thinner than usual.',
    calm_theme: 'Honest signals',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-1.40 for aspect Affective State Gain (Volatility).',
  },
  {
    id: 97,
    slug: 'q-097-interrupted-plan-ripple',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'cortical_invariant',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.67,
    irt_b: -0.7,
    mood_halo_loading: 0.12,
    text: 'Being interrupted three times while trying to finish one simple task makes me feel a quick flash of frustration.',
    calm_theme: 'Broken rhythm',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=-0.70 for aspect Affective State Gain (Volatility).',
  },
  {
    id: 98,
    slug: 'q-098-atmosphere-contagion',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'cortical_invariant',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.75,
    irt_b: 0.05,
    mood_halo_loading: 0.12,
    text: 'If people around me are rushing or snapping at each other, it takes real effort not to absorb that agitation.',
    calm_theme: 'Feeling tension',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.05 for aspect Affective State Gain (Volatility).',
  },
  {
    id: 99,
    slug: 'q-099-fast-emotional-wave',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'cortical_invariant',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.83,
    irt_b: 0.85,
    mood_halo_loading: 0.12,
    text: 'Unexpected bad news hits me as a strong physical wave before my logical mind has time to talk me through it.',
    calm_theme: 'Vivid waves',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+0.85 for aspect Affective State Gain (Volatility).',
  },
  {
    id: 100,
    slug: 'q-100-high-gain-reactivity',
    node_tier: 'deep_resolution',
    parent_trigger: null,
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'cortical_invariant',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'calibrated_anchor',
    direction: 1,
    weight: 1.15,
    irt_a: 1.89,
    irt_b: 1.45,
    mood_halo_loading: 0.12,
    text: 'When a plan collapses or sensory chaos spikes, my heart rate and frustration surge before I can catch my breath.',
    calm_theme: 'High-gain pulse',
    scientific_hypothesis: 'High-precision 2PL IRT deep-resolution item calibrated at threshold b=+1.45 for aspect Affective State Gain (Volatility).',
  },
  // ==========================================================================
  // TIER 4: EVERYDAY MOMENT SNEAKY HABIT PROBES (IDs 101..120)
  // ==========================================================================
  {
    id: 101,
    slug: 'q-101-podcast-speed-curiosity',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#3 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_open_loops',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.56,
    direction: 1,
    weight: 0.0,
    irt_a: 1.52,
    irt_b: 0.15,
    mood_halo_loading: 0.15,
    text: 'I love pairing routine chores or walks with a podcast, audiobook, or deep-dive video so my mind has something rich to explore.',
    calm_theme: 'Everyday audio habits',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.56 with Domain O) bypassing evaluative bias.',
  },
  {
    id: 102,
    slug: 'q-102-window-seat-daydream',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#2 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'shadow_behavioral_probe',
    probe_type: 'valence_signal_gain',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.54,
    direction: 1,
    weight: 0.0,
    irt_a: 1.49,
    irt_b: -0.2,
    mood_halo_loading: 0.15,
    text: 'On a train, bus, or car ride, I can happily spend an hour just watching light, clouds, and neighborhoods pass by the window.',
    calm_theme: 'Window seat moments',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.54 with Domain O) bypassing evaluative bias.',
  },
  {
    id: 103,
    slug: 'q-103-midnight-wikipedia-trail',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 1,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#1 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'O',
    aspect: 'Abstract Systemizing (Intellect)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_open_loops',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.62,
    direction: 1,
    weight: 0.0,
    irt_a: 1.61,
    irt_b: 0.4,
    mood_halo_loading: 0.15,
    text: 'I often look up one simple practical fact and end up three articles deeper learning how a whole hidden system works.',
    calm_theme: 'Curiosity trails',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.62 with Domain O) bypassing evaluative bias.',
  },
  {
    id: 104,
    slug: 'q-104-playlist-atmosphere-loop',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#2 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'O',
    aspect: 'Perceptual & Aesthetic Depth',
    layer: 'shadow_behavioral_probe',
    probe_type: 'valence_signal_gain',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.57,
    direction: 1,
    weight: 0.0,
    irt_a: 1.55,
    irt_b: 0.1,
    mood_halo_loading: 0.15,
    text: 'When a song matches the exact mood I’m in, I can happily play it on loop ten times in a row.',
    calm_theme: 'Soundtrack looping',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.57 with Domain O) bypassing evaluative bias.',
  },
  {
    id: 105,
    slug: 'q-105-unread-badge-detente',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#3 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_open_loops',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.59,
    direction: -1,
    weight: 0.0,
    irt_a: 1.64,
    irt_b: 0.25,
    mood_halo_loading: 0.15,
    text: 'I can live peacefully with a high unread message badge for weeks, yet spend an hour perfecting a brand-new list or project.',
    calm_theme: 'Digital notifications',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.59 with Domain C) bypassing evaluative bias.',
  },
  {
    id: 106,
    slug: 'q-106-alarm-snooze-runway',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#3 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_open_loops',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.52,
    direction: -1,
    weight: 0.0,
    irt_a: 1.5,
    irt_b: -0.15,
    mood_halo_loading: 0.15,
    text: 'Setting two or three staggered alarms in the morning feels like a gentle runway into waking up rather than a single jolt.',
    calm_theme: 'Morning runway',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.52 with Domain C) bypassing evaluative bias.',
  },
  {
    id: 107,
    slug: 'q-107-packing-last-hour-focus',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 3,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#3 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'C',
    aspect: 'Goal-Locked Drive (Industriousness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'salience_vs_routine_split',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.6,
    direction: -1,
    weight: 0.0,
    irt_a: 1.68,
    irt_b: 0.35,
    mood_halo_loading: 0.15,
    text: 'Before a trip, I almost always do my best, fastest packing in the final evening when the departure finally feels real.',
    calm_theme: 'Packing rhythm',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.60 with Domain C) bypassing evaluative bias.',
  },
  {
    id: 108,
    slug: 'q-108-clean-desk-procrastination',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 11,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#11 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'C',
    aspect: 'Entropy Suppression (Orderliness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'compensatory_effort_cost',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.55,
    direction: -1,
    weight: 0.0,
    irt_a: 1.58,
    irt_b: 0.05,
    mood_halo_loading: 0.15,
    text: 'Right when a big, ambiguous task is waiting for me, I suddenly feel a strong urge to tidy my space or reorganize my notes.',
    calm_theme: 'Productive detour',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.55 with Domain C) bypassing evaluative bias.',
  },
  {
    id: 109,
    slug: 'q-109-quiet-french-exit',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#5 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_canceled_plans',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.58,
    direction: -1,
    weight: 0.0,
    irt_a: 1.62,
    irt_b: 0.2,
    mood_halo_loading: 0.15,
    text: 'At a big gathering, I secretly prefer slipping out with a warm wave to one or two friends rather than doing a twenty-minute round of goodbyes.',
    calm_theme: 'Leaving gatherings',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.58 with Domain E) bypassing evaluative bias.',
  },
  {
    id: 110,
    slug: 'q-110-earbuds-sanctuary-signal',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 5,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#5 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'acoustic_stream_split',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.61,
    direction: -1,
    weight: 0.0,
    irt_a: 1.66,
    irt_b: 0.1,
    mood_halo_loading: 0.15,
    text: 'I sometimes wear headphones on errands or transit—even with nothing playing—just to create a calm bubble of personal space.',
    calm_theme: 'Headphone bubble',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.61 with Domain E) bypassing evaluative bias.',
  },
  {
    id: 111,
    slug: 'q-111-coffee-shop-ambient-hum',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 5,
      operator: '<=',
      threshold: 3,
      rationale: 'Triggered when Q#5 <= 3 to sample ecological everyday micro-behavior.',
    },
    domain: 'E',
    aspect: 'Affiliative Reward Gain (Enthusiasm)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'social_agency',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.49,
    direction: 1,
    weight: 0.0,
    irt_a: 1.48,
    irt_b: -0.1,
    mood_halo_loading: 0.15,
    text: 'Working or reading alone in a cozy shared space where people are murmuring nearby feels comforting without needing to talk.',
    calm_theme: 'Ambient company',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.49 with Domain E) bypassing evaluative bias.',
  },
  {
    id: 112,
    slug: 'q-112-spontaneous-voice-catchup',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 6,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#6 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'E',
    aspect: 'Agency & Social Impact (Assertiveness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'social_agency',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.56,
    direction: 1,
    weight: 0.0,
    irt_a: 1.59,
    irt_b: 0.3,
    mood_halo_loading: 0.15,
    text: 'A spontaneous ten-minute phone call while walking or driving gives me a quick, warm boost of energy.',
    calm_theme: 'Spontaneous call',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.56 with Domain E) bypassing evaluative bias.',
  },
  {
    id: 113,
    slug: 'q-113-apologize-to-furniture',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#7 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_text_cushion',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.55,
    direction: 1,
    weight: 0.0,
    irt_a: 1.57,
    irt_b: 0.05,
    mood_halo_loading: 0.15,
    text: 'If someone bumps into me in a hallway, I often hear myself saying “sorry!” before I even realize it wasn’t my fault.',
    calm_theme: 'Reflexive politeness',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.55 with Domain A) bypassing evaluative bias.',
  },
  {
    id: 114,
    slug: 'q-114-reread-sent-message',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#7 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'sneaky_text_cushion',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.59,
    direction: 1,
    weight: 0.0,
    irt_a: 1.63,
    irt_b: 0.2,
    mood_halo_loading: 0.15,
    text: 'After sending an important message, I often re-read it once more just to feel how it will land from the other person’s side.',
    calm_theme: 'Thoughtful replies',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.59 with Domain A) bypassing evaluative bias.',
  },
  {
    id: 115,
    slug: 'q-115-remember-small-favorites',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 7,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#7 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'A',
    aspect: 'Allostatic Resonance (Compassion)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'allostatic_coupling',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.62,
    direction: 1,
    weight: 0.0,
    irt_a: 1.65,
    irt_b: -0.15,
    mood_halo_loading: 0.15,
    text: 'Months after someone mentions their favorite snack, song, or small worry in passing, my mind still quietly remembers it.',
    calm_theme: 'Small details of care',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.62 with Domain A) bypassing evaluative bias.',
  },
  {
    id: 116,
    slug: 'q-116-direct-edit-kindness',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 8,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#8 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'A',
    aspect: 'Normative Friction Suppression (Politeness)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'directness_prior',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: -0.53,
    direction: -1,
    weight: 0.0,
    irt_a: 1.54,
    irt_b: 0.25,
    mood_halo_loading: 0.15,
    text: 'When a friend asks for my honest opinion on their work, I show care by giving clear, specific suggestions rather than vague praise.',
    calm_theme: 'Practical honesty',
    scientific_hypothesis: 'Ecological everyday habit probe (r=-0.53 with Domain A) bypassing evaluative bias.',
  },
  {
    id: 117,
    slug: 'q-117-menu-preview-comfort',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 9,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#9 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'threat_forecasting',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.57,
    direction: 1,
    weight: 0.0,
    irt_a: 1.61,
    irt_b: 0.1,
    mood_halo_loading: 0.15,
    text: 'Before going to a new place or event, I like glancing at photos, directions, or the menu ahead of time so arrival feels easy.',
    calm_theme: 'Previewing new places',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.57 with Domain N) bypassing evaluative bias.',
  },
  {
    id: 118,
    slug: 'q-118-notification-do-not-disturb',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 10,
      operator: '<=',
      threshold: 3,
      rationale: 'Triggered when Q#10 <= 3 to sample ecological everyday micro-behavior.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'serotonergic_buffer',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.54,
    direction: 1,
    weight: 0.0,
    irt_a: 1.58,
    irt_b: -0.05,
    mood_halo_loading: 0.15,
    text: 'My phone stays on silent or vibrate almost all year so sudden notification pings don’t jolt my train of thought.',
    calm_theme: 'Silent notifications',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.54 with Domain N) bypassing evaluative bias.',
  },
  {
    id: 119,
    slug: 'q-119-weather-barometer-mood',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 2,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#2 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'N',
    aspect: 'Affective State Gain (Volatility)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'valence_signal_gain',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.51,
    direction: 1,
    weight: 0.0,
    irt_a: 1.52,
    irt_b: -0.2,
    mood_halo_loading: 0.15,
    text: 'After several grey days in a row, the first afternoon of warm sunlight noticeably lifts my energy and outlook.',
    calm_theme: 'Light & weather',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.51 with Domain N) bypassing evaluative bias.',
  },
  {
    id: 120,
    slug: 'q-120-sleep-on-big-reply',
    node_tier: 'everyday_moment',
    parent_trigger: {
      if_question_id: 9,
      operator: '>=',
      threshold: 4,
      rationale: 'Triggered when Q#9 >= 4 to sample ecological everyday micro-behavior.',
    },
    domain: 'N',
    aspect: 'Uncertainty Vigilance (Withdrawal)',
    layer: 'shadow_behavioral_probe',
    probe_type: 'epoch_state_delta',
    calibration_status: 'shadow_candidate',
    empirical_prior_r: 0.58,
    direction: 1,
    weight: 0.0,
    irt_a: 1.64,
    irt_b: 0.3,
    mood_halo_loading: 0.15,
    text: 'When a message stirs up strong feelings late at night, I prefer drafting my thoughts and waiting until morning to hit send.',
    calm_theme: 'Unhurried replies',
    scientific_hypothesis: 'Ecological everyday habit probe (r=+0.58 with Domain N) bypassing evaluative bias.',
  },

];

const DOMAIN_KEYS: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];

function clamp(val: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, val));
}

export function normalizeParentTrigger(
  raw: ParentTriggerRule | Record<string, unknown> | null | undefined
): ParentTriggerRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ifId = Number(r.if_question_id ?? r.parent_id ?? r.question_id ?? 0);
  if (!ifId || Number.isNaN(ifId)) return null;
  const opRaw = String(r.operator || '>=');
  const operator: ParentTriggerRule['operator'] =
    opRaw === '<=' || opRaw === '==' || opRaw === '>' || opRaw === '<' ? opRaw : '>=';
  const threshold = Number(r.threshold ?? r.min_val ?? r.min_score ?? 4);
  return {
    if_question_id: ifId,
    operator,
    threshold,
    rationale: r.rationale ? String(r.rationale) : undefined,
  };
}

export function formatParentTriggerBadge(
  raw: ParentTriggerRule | Record<string, unknown> | null | undefined
): string | null {
  const pt = normalizeParentTrigger(raw);
  if (!pt) return null;
  return `IF Q#${pt.if_question_id} ${pt.operator} ${pt.threshold}`;
}

export function evaluateParentTrigger(
  raw: ParentTriggerRule | Record<string, unknown> | null | undefined,
  responses: Record<string | number, number>
): { answered: boolean; triggered: boolean; description: string | null } {
  const pt = normalizeParentTrigger(raw);
  if (!pt) return { answered: false, triggered: false, description: null };
  const desc = `IF Q#${pt.if_question_id} ${pt.operator} ${pt.threshold}`;
  const ans = responses[pt.if_question_id] ?? responses[String(pt.if_question_id)];
  if (ans === undefined || ans === null) {
    return { answered: false, triggered: false, description: desc };
  }
  const v = Number(ans);
  let hit = false;
  if (pt.operator === '>=') hit = v >= pt.threshold;
  else if (pt.operator === '<=') hit = v <= pt.threshold;
  else if (pt.operator === '>') hit = v > pt.threshold;
  else if (pt.operator === '<') hit = v < pt.threshold;
  else hit = v === pt.threshold;
  return { answered: true, triggered: hit, description: desc };
}

export function findQuestionBySlugOrId(
  pool: ItemBankQuestion[],
  slugOrId: string | number
): ItemBankQuestion | undefined {
  const effectivePool = pool && pool.length > 0 ? pool : ADAPTIVE_POOL_120;
  if (typeof slugOrId === 'number') {
    return effectivePool.find((q) => Number(q.id) === slugOrId);
  }
  const clean = String(slugOrId).trim().toLowerCase();
  if (!clean) return undefined;
  const direct = effectivePool.find(
    (q) => getAdaptiveQuestionSlug(q).toLowerCase() === clean
  );
  if (direct) return direct;
  const m = clean.match(/^q-0*(\d+)\b/);
  if (m) {
    const idNum = parseInt(m[1], 10);
    return effectivePool.find((q) => Number(q.id) === idNum);
  }
  return undefined;
}

export function computeLiveDomainPosteriors(
  pool: ItemBankQuestion[],
  responses: Record<string | number, number>,
  telemetry?: Partial<TelemetryState> | Record<string, unknown> | null
): Record<DomainKey, DomainPosterior> {
  const effectivePool = pool && pool.length > 0 ? pool : ADAPTIVE_POOL_120;
  const result = {} as Record<DomainKey, DomainPosterior>;

  // Phase 1 Neurological Baseline Priors from the 3 Mind Moments
  const priorShift: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const priorWeight: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  if (telemetry && typeof telemetry === 'object') {
    const t = telemetry as Record<string, any>;
    const pr = t.pulse_reaction;
    if (pr && pr.completed) {
      if ((typeof pr.rt_cv_pct === 'number' && pr.rt_cv_pct >= 18) || (pr.false_starts ?? 0) >= 1) {
        // Variable attentional cadence / dopamine foraging prior
        priorShift.O += 0.22;
        priorWeight.O += 0.35;
        priorShift.C -= 0.28;
        priorWeight.C += 0.45;
      } else if (typeof pr.steadiness_pct === 'number' && pr.steadiness_pct >= 86) {
        // Steady tonic executive control prior
        priorShift.C += 0.24;
        priorWeight.C += 0.40;
        priorShift.N -= 0.16;
        priorWeight.N += 0.30;
      }
    }
    const cm = t.constellation_memory;
    if (cm && cm.completed && typeof cm.accuracy_pct === 'number') {
      if (cm.accuracy_pct >= 80 && (cm.mean_chunk_ms ?? 450) <= 500) {
        priorShift.O += 0.24;
        priorWeight.O += 0.40;
        priorShift.C += 0.12;
        priorWeight.C += 0.25;
      }
    }
    const me = t.minds_eye;
    if (me && me.completed && typeof me.imagery_vividness === 'number') {
      if (me.imagery_vividness <= 25 || me.inner_modality === 'wordless_concept') {
        // Aphantasia / Conceptual Knowing de-confounder prior
        priorShift.O += 0.32;
        priorWeight.O += 0.45;
      } else if (me.imagery_vividness >= 80 || me.inner_modality === 'visual_cinema') {
        priorShift.O += 0.22;
        priorWeight.O += 0.35;
      }
    }
  }

  for (const d of DOMAIN_KEYS) {
    const domItems = effectivePool.filter((it) => it.domain === d);
    let weightedSum = priorShift[d] * priorWeight[d];
    let weightTotal = priorWeight[d];
    let fisherSum = 0.35 + priorWeight[d] * 0.45; // Bayesian prior precision I_0 + neurological baseline
    let answeredCount = 0;

    for (const it of domItems) {
      const ans = responses[it.id] ?? responses[String(it.id)];
      if (ans === undefined || ans === null) continue;
      answeredCount += 1;

      const centered = ((Number(ans) - 3.0) / 2.0) * Number(it.direction || 1);
      const rawW = Number(it.weight ?? 1.0);
      const effW =
        rawW > 0 ? rawW : Math.max(0.45, Math.abs(Number(it.empirical_prior_r || 0.55)) * 0.8);

      weightedSum += centered * effW;
      weightTotal += effW;
    }

    const theta =
      weightTotal > 0 ? Number(clamp((weightedSum / weightTotal) * 1.45, -1.75, 1.75).toFixed(2)) : 0.0;

    for (const it of domItems) {
      const ans = responses[it.id] ?? responses[String(it.id)];
      if (ans === undefined || ans === null) continue;
      const a = Number(it.irt_a || 1.5);
      const b = Number(it.irt_b || 0.0);
      const p = 1.0 / (1.0 + Math.exp(-a * (theta - b)));
      fisherSum += a * a * p * (1.0 - p);
    }

    const theta_se = Number(clamp(1.0 / Math.sqrt(fisherSum), 0.18, 1.65).toFixed(2));
    const se = Number(clamp(theta_se * 9.6, 2.5, 17.5).toFixed(1));
    const percentile = Number(clamp(50.0 + (theta / 1.55) * 44.0, 2.0, 98.0).toFixed(1));

    result[d] = {
      domain: d,
      theta,
      percentile,
      se,
      theta_se,
      answered_count: answeredCount,
      fisher_info_sum: Number(fisherSum.toFixed(2)),
    };
  }

  return result;
}

export function selectNextAdaptiveQuestionClient(params: {
  pool?: ItemBankQuestion[];
  answeredIds: number[];
  responses: Record<string | number, number>;
  telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
}): AdaptiveSelectionResult {
  const effectivePool =
    params.pool && params.pool.length >= 20 ? params.pool : ADAPTIVE_POOL_120;
  const answeredSet = new Set((params.answeredIds || []).map(Number));
  const responses = params.responses || {};
  const telemetry = params.telemetry || null;

  const domainPosteriors = computeLiveDomainPosteriors(effectivePool, responses, telemetry);
  const stepNumber = answeredSet.size + 1;

  // 4-Phase Neurological-First Funnel:
  // Phase 1: Mind Moments 1..3 (Neurological Baseline, completed before Question 1)
  // Phase 2 (Question steps 1..5): Warm Everyday Rhythm & Symmetry-Breaking Anchors ('anchor')
  // Phase 3 (Question steps 6..11): Targeted Conditional IF/THEN Branch Probes ('branch_probe')
  // Phase 4 (Question steps 12..15): High-Discrimination 2PL Deep Nuance Resolution ('deep_resolution')
  const stageTier: NodeTier =
    stepNumber <= 5
      ? 'anchor'
      : stepNumber <= 11
      ? 'branch_probe'
      : 'deep_resolution';

  const unanswered = effectivePool.filter((it) => !answeredSet.has(Number(it.id)));
  if (unanswered.length === 0) {
    const fallback = effectivePool[0];
    return {
      nextItem: fallback,
      selectionReason: 'Assessment pool complete.',
      poolSize: effectivePool.length,
      remainingCount: 0,
      stepNumber,
      stageTier,
      domainPosteriors,
      topCandidates: [],
    };
  }

  const lastAnsweredId =
    params.answeredIds && params.answeredIds.length > 0
      ? Number(params.answeredIds[params.answeredIds.length - 1])
      : null;

  // Extract Phase 1 Mind Moment telemetry signals for adaptive routing
  let pulseHighVariance = false;
  let pulseSteadyTonic = false;
  let constellationHighPrecision = false;
  let mindsEyeConceptual = false;
  let mindsEyeVividCinema = false;
  if (telemetry && typeof telemetry === 'object') {
    const t = telemetry as Record<string, any>;
    if (t.pulse_reaction?.completed) {
      if (t.pulse_reaction.rt_cv_pct >= 18 || (t.pulse_reaction.false_starts ?? 0) >= 1) {
        pulseHighVariance = true;
      } else if ((t.pulse_reaction.steadiness_pct ?? 0) >= 86) {
        pulseSteadyTonic = true;
      }
    }
    if (t.constellation_memory?.completed && t.constellation_memory.accuracy_pct >= 80) {
      constellationHighPrecision = true;
    }
    if (t.minds_eye?.completed) {
      if (t.minds_eye.imagery_vividness <= 25 || t.minds_eye.inner_modality === 'wordless_concept') {
        mindsEyeConceptual = true;
      } else if (t.minds_eye.imagery_vividness >= 80 || t.minds_eye.inner_modality === 'visual_cinema') {
        mindsEyeVividCinema = true;
      }
    }
  }

  const scoredCandidates: AdaptiveCandidateScore[] = unanswered.map((it) => {
    const domPost = domainPosteriors[it.domain] || domainPosteriors.O;
    const a = Number(it.irt_a || 1.5);
    const b = Number(it.irt_b || 0.0);
    const theta = domPost.theta;
    const p = 1.0 / (1.0 + Math.exp(-a * (theta - b)));
    const fisher_info = Number((a * a * p * (1.0 - p)).toFixed(3));

    // Domain uncertainty & coverage weight
    let uncertainty_weight = Number(
      ((domPost.se / 10.0) * (1.0 + 0.45 / (1.0 + domPost.answered_count))).toFixed(3)
    );
    if (stepNumber <= 5 && domPost.answered_count === 0) {
      uncertainty_weight = Number((uncertainty_weight + 0.72).toFixed(3));
    }

    // Evaluate conditional branch trigger
    const trigEval = evaluateParentTrigger(it.parent_trigger, responses);
    let branch_bonus = 0.0;
    if (it.parent_trigger) {
      if (trigEval.triggered) {
        const isImmediateChild =
          lastAnsweredId !== null &&
          normalizeParentTrigger(it.parent_trigger)?.if_question_id === lastAnsweredId;
        branch_bonus = isImmediateChild ? 1.95 : 1.35;
      } else if (trigEval.answered && !trigEval.triggered) {
        branch_bonus = -0.85;
      } else {
        branch_bonus = -0.25;
      }
    }

    // Resolve item tier
    const itemTier = (it.node_tier ||
      (it.id <= 12
        ? 'anchor'
        : it.id <= 15 || it.id >= 96
        ? 'everyday_moment'
        : it.id <= 55
        ? 'branch_probe'
        : 'deep_resolution')) as NodeTier;

    let stage_bonus = 0.0;
    if (stepNumber === 1) {
      // First question after Phase 1 Neurological Baseline:
      // Route gently based on what Still Water, Night Sky, and Inner Canvas revealed!
      if (pulseHighVariance && (it.id === 13 || it.id === 3)) {
        stage_bonus = it.id === 13 ? 2.85 : 2.65;
      } else if (mindsEyeConceptual && it.id === 1) {
        stage_bonus = 2.85;
      } else if (pulseSteadyTonic && (it.id === 12 || it.id === 1)) {
        stage_bonus = it.id === 12 ? 2.75 : 2.65;
      } else if (it.id === 12 || it.id === 1 || it.id === 13) {
        stage_bonus = it.id === 1 ? 2.55 : 2.45;
      } else if (itemTier === 'anchor') {
        stage_bonus = 1.25;
      }
    } else if (stepNumber <= 5) {
      // Phase 2: Warm Everyday Snapshots & Broad 5-Domain Anchors
      if (itemTier === 'anchor') stage_bonus = 1.38;
      else if (itemTier === 'everyday_moment' && it.id <= 15) stage_bonus = 1.24;
      else if (itemTier === 'branch_probe' && trigEval.triggered) stage_bonus = 0.85;
      else stage_bonus = -0.35;
    } else if (stepNumber <= 11) {
      // Phase 3: Targeted Conditional Branch Probes
      if (itemTier === 'branch_probe') stage_bonus = 1.25;
      else if (itemTier === 'everyday_moment' && trigEval.triggered) stage_bonus = 1.08;
      else if (itemTier === 'deep_resolution') stage_bonus = 0.78;
      else if (itemTier === 'anchor') stage_bonus = 0.45;
      else stage_bonus = 0.25;
    } else {
      // Phase 4 (Steps 12..15): High-Discrimination 2PL Deep Nuance Resolution
      const closenessToTheta = Math.max(0, 1.0 - Math.abs(b - theta) * 0.55);
      if (itemTier === 'deep_resolution') stage_bonus = Number((1.35 + closenessToTheta * 0.42).toFixed(2));
      else if (itemTier === 'everyday_moment') stage_bonus = 0.95;
      else if (itemTier === 'branch_probe') stage_bonus = 0.72;
      else stage_bonus = 0.20;
    }

    // Telemetry-informed routing bonus from Phase 1 Mind Moments
    let telemetry_bonus = 0.0;
    if (
      pulseHighVariance &&
      (it.domain === 'C' ||
        it.probe_type === 'salience_vs_routine_split' ||
        it.probe_type === 'sneaky_open_loops')
    ) {
      telemetry_bonus += 0.46;
    }
    if (constellationHighPrecision && it.domain === 'O' && b >= 0.1) {
      telemetry_bonus += 0.38;
    }
    if (mindsEyeConceptual && it.domain === 'O') {
      if (it.aspect.includes('Intellect') || it.probe_type === 'cortical_prior') {
        telemetry_bonus += 0.44;
      } else {
        // De-confound purely visual-imagery Openness items for conceptual thinkers
        telemetry_bonus -= 0.32;
      }
    }
    if (mindsEyeVividCinema && it.domain === 'O' && it.aspect.includes('Openness')) {
      telemetry_bonus += 0.36;
    }
    telemetry_bonus = Number(telemetry_bonus.toFixed(3));

    const total_utility = Number(
      (fisher_info * uncertainty_weight + branch_bonus + stage_bonus + telemetry_bonus).toFixed(3)
    );

    const reasons: string[] = [];
    if (telemetry_bonus > 0 && stepNumber <= 5) {
      reasons.push(`Phase 1 Mind Moment Baseline Prior (+${telemetry_bonus.toFixed(2)})`);
    }
    if (trigEval.triggered && trigEval.description) {
      const parentAns =
        responses[normalizeParentTrigger(it.parent_trigger)!.if_question_id] ??
        responses[String(normalizeParentTrigger(it.parent_trigger)!.if_question_id)];
      reasons.push(`Branch Trigger [${trigEval.description} · answered ${parentAns}]`);
    }
    reasons.push(
      `Domain ${it.domain} Fisher I(θ)=${fisher_info.toFixed(2)} at θ=${
        domPost.theta >= 0 ? `+${domPost.theta}` : domPost.theta
      } (SE ±${domPost.se}%)`
    );
    if (telemetry_bonus > 0 && stepNumber > 5) {
      reasons.push(`Mind Moment Telemetry Prior (+${telemetry_bonus.toFixed(2)})`);
    }

    return {
      item: { ...it, node_tier: itemTier, slug: getAdaptiveQuestionSlug(it) },
      fisher_info,
      uncertainty_weight,
      branch_bonus: Number(branch_bonus.toFixed(2)),
      stage_bonus: Number(stage_bonus.toFixed(2)),
      telemetry_bonus,
      total_utility,
      branch_triggered: trigEval.triggered,
      trigger_description: trigEval.description,
      reason_summary: reasons.join(' · '),
    };
  });

  scoredCandidates.sort((x, y) => {
    if (y.total_utility !== x.total_utility) return y.total_utility - x.total_utility;
    return x.item.id - y.item.id;
  });

  const winner = scoredCandidates[0];
  return {
    nextItem: winner.item,
    selectionReason: winner.reason_summary,
    poolSize: effectivePool.length,
    remainingCount: unanswered.length,
    stepNumber,
    stageTier,
    domainPosteriors,
    topCandidates: scoredCandidates.slice(0, 6),
  };
}

export function buildDynamicAdaptivePath(params: {
  pool?: ItemBankQuestion[];
  committedIds: number[];
  responses: Record<string | number, number>;
  telemetry?: Partial<TelemetryState> | Record<string, unknown> | null;
  targetLength?: number;
}): number[] {
  const effectivePool =
    params.pool && params.pool.length >= 20 ? params.pool : ADAPTIVE_POOL_120;
  const targetLen = params.targetLength ?? 15;
  const validPoolIds = new Set(effectivePool.map((q) => Number(q.id)));

  const path: number[] = [];
  for (const rawId of params.committedIds || []) {
    const id = Number(rawId);
    if (validPoolIds.has(id) && !path.includes(id)) {
      path.push(id);
    }
  }

  // Project remaining slots up to targetLength (15) using selectNextAdaptiveQuestionClient
  // (including Question 1 when path is initially empty, routed by Phase 1 Mind Moment telemetry!)
  const simulatedResponses: Record<string | number, number> = { ...(params.responses || {}) };
  while (path.length < targetLen && path.length < effectivePool.length) {
    const sel = selectNextAdaptiveQuestionClient({
      pool: effectivePool,
      answeredIds: path,
      responses: simulatedResponses,
      telemetry: params.telemetry,
    });
    if (!sel.nextItem || path.includes(sel.nextItem.id)) {
      const nextFallback = effectivePool.find((q) => !path.includes(q.id));
      if (!nextFallback) break;
      path.push(nextFallback.id);
    } else {
      path.push(sel.nextItem.id);
    }
  }

  return path.slice(0, targetLen);
}

// ============================================================================
// PILLAR 2: LLM CONTEXTUAL MORPHING & DIF DE-BIASING ENGINE
// ============================================================================

export const DEFAULT_USER_CONTEXT: UserContextProfile = {
  ageBand: '25_39',
  lifeContext: 'knowledge_remote',
  locale: 'urban',
  language: 'en',
};

export const AGE_BAND_OPTIONS: { id: AgeBand; label: string; short: string }[] = [
  { id: '18_24', label: '18–24 · Emerging Path', short: '18–24' },
  { id: '25_39', label: '25–39 · Building Momentum', short: '25–39' },
  { id: '40_59', label: '40–59 · Established Steward', short: '40–59' },
  { id: '60_plus', label: '60+ · Seasoned Wisdom', short: '60+' },
];

export const LIFE_CONTEXT_OPTIONS: {
  id: LifeContext;
  label: string;
  short: string;
  sesNote: string;
}[] = [
  {
    id: 'working_practical',
    label: 'Hands-On / Shift / Service & Trade',
    short: 'Hands-On / Shift',
    sesNote: 'Eliminates white-collar office/laptop assumptions; grounds items in tangible crew, shift, and hands-on craft realities.',
  },
  {
    id: 'student_creative',
    label: 'Student / Artist / Early Explorer',
    short: 'Student / Creative',
    sesNote: 'Grounds prompts in studio, classes, shared living, and creative skill-building.',
  },
  {
    id: 'knowledge_remote',
    label: 'Flexible / Studio / Desk Work',
    short: 'Flexible / Desk',
    sesNote: 'Standard modern flexible work & digital communication framing.',
  },
  {
    id: 'caregiver_family',
    label: 'Family / Caregiver / Community Anchor',
    short: 'Family / Caregiver',
    sesNote: 'Reframes solitary leisure assumptions around household rhythm, family care, and shared emotional labor.',
  },
];

export const LOCALE_OPTIONS: { id: LocaleSetting; label: string; short: string }[] = [
  { id: 'urban', label: 'City / Bustling Neighborhood', short: 'Urban' },
  { id: 'suburban', label: 'Town / Quiet Neighborhood', short: 'Town / Suburb' },
  { id: 'rural', label: 'Rural / Open Country & Small Town', short: 'Rural' },
];

export const LANGUAGE_OPTIONS: { id: SupportedLanguage; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: 'EN' },
  { id: 'es', label: 'Español', flag: 'ES' },
  { id: 'fr', label: 'Français', flag: 'FR' },
  { id: 'pt', label: 'Português', flag: 'PT' },
];

export const TRANSLATED_LIKERT_OPTIONS: Record<
  SupportedLanguage,
  { val: number; label: string }[]
> = {
  en: [
    { val: 1, label: 'Not like me' },
    { val: 2, label: 'Rarely me' },
    { val: 3, label: 'Sometimes' },
    { val: 4, label: 'Often me' },
    { val: 5, label: 'Very much me' },
  ],
  es: [
    { val: 1, label: 'Nada como yo' },
    { val: 2, label: 'Rara vez yo' },
    { val: 3, label: 'A veces' },
    { val: 4, label: 'A menudo yo' },
    { val: 5, label: 'Totalmente yo' },
  ],
  fr: [
    { val: 1, label: 'Pas du tout moi' },
    { val: 2, label: 'Rarement moi' },
    { val: 3, label: 'Parfois' },
    { val: 4, label: 'Souvent moi' },
    { val: 5, label: 'Tout à fait moi' },
  ],
  pt: [
    { val: 1, label: 'Nada a ver comigo' },
    { val: 2, label: 'Raramente eu' },
    { val: 3, label: 'Às vezes' },
    { val: 4, label: 'Muitas vezes eu' },
    { val: 5, label: 'Totalmente eu' },
  ],
};

export interface CatPersonaPreset {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  telemetry: TelemetryState;
  answerPolicy: (q: ItemBankQuestion) => number;
}

export const CAT_PERSONA_PRESETS: CatPersonaPreset[] = [
  {
    id: 'spark_explorer',
    name: 'Spark-Driven Explorer',
    subtitle: 'High curiosity & novelty sprints · High salience split (Q#3=5, Q#13=5)',
    badge: 'Spark Rhythm (ADHD Prior)',
    telemetry: {
      pulse_reaction: { completed: true, median_rt_ms: 255, rt_cv_pct: 26.4, steadiness_pct: 62.3, false_starts: 2 },
      constellation_memory: { completed: true, accuracy_pct: 84, mean_chunk_ms: 390 },
      minds_eye: { completed: true, imagery_vividness: 74, inner_modality: 'visual_cinema' },
    },
    answerPolicy: (q) => {
      if (q.id === 3 || q.id === 13 || q.id === 20 || q.id === 23 || q.id === 24) return 5;
      if (q.id === 4) return 2;
      if (q.domain === 'O') return 5;
      if (q.domain === 'C') return q.direction < 0 ? 5 : 2;
      if (q.domain === 'E') return 4;
      if (q.domain === 'A') return 4;
      return 3;
    },
  },
  {
    id: 'deep_architect',
    name: 'Deep-Current Architect',
    subtitle: 'High sensory precision & 1-on-1 depth · Wordless conceptual thinker',
    badge: 'Deep-Current (Monotropic)',
    telemetry: {
      pulse_reaction: { completed: true, median_rt_ms: 312, rt_cv_pct: 11.2, steadiness_pct: 90.4, false_starts: 0 },
      constellation_memory: { completed: true, accuracy_pct: 94, mean_chunk_ms: 345 },
      minds_eye: { completed: true, imagery_vividness: 16, inner_modality: 'wordless_concept' },
    },
    answerPolicy: (q) => {
      if (q.id === 1 || q.id === 5 || q.id === 8 || q.id === 15 || q.id === 30 || q.id === 31) return 5;
      if (q.domain === 'O') return 5;
      if (q.domain === 'C') return q.direction > 0 ? 4 : 3;
      if (q.domain === 'E') return q.direction < 0 ? 5 : 2;
      if (q.domain === 'A') return q.probe_type === 'directness_prior' ? 5 : 4;
      return 4;
    },
  },
  {
    id: 'sensory_creative',
    name: 'Finely Tuned Creative',
    subtitle: 'High aesthetic & emotional resonance · Notices every micro-shift',
    badge: 'Finely Tuned (HSP Gain)',
    telemetry: {
      pulse_reaction: { completed: true, median_rt_ms: 298, rt_cv_pct: 15.8, steadiness_pct: 81.9, false_starts: 0 },
      constellation_memory: { completed: true, accuracy_pct: 82, mean_chunk_ms: 410 },
      minds_eye: { completed: true, imagery_vividness: 92, inner_modality: 'visual_cinema' },
    },
    answerPolicy: (q) => {
      if (q.id === 2 || q.id === 7 || q.id === 14 || q.id === 18 || q.id === 37 || q.id === 41) return 5;
      if (q.domain === 'O') return 5;
      if (q.domain === 'A') return q.direction > 0 ? 5 : 2;
      if (q.domain === 'N') return q.direction > 0 ? 4 : 2;
      return 3;
    },
  },
  {
    id: 'grounded_organizer',
    name: 'Steady-Current Organizer',
    subtitle: 'Even pacing, tidy environment, and low transition friction',
    badge: 'Steady-Current Baseline',
    telemetry: {
      pulse_reaction: { completed: true, median_rt_ms: 278, rt_cv_pct: 12.4, steadiness_pct: 88.2, false_starts: 0 },
      constellation_memory: { completed: true, accuracy_pct: 80, mean_chunk_ms: 405 },
      minds_eye: { completed: true, imagery_vividness: 64, inner_modality: 'visual_cinema' },
    },
    answerPolicy: (q) => {
      if (q.id === 4 || q.id === 6 || q.id === 10 || q.id === 25 || q.id === 27) return 5;
      if (q.id === 3 || q.id === 13 || q.id === 15) return 2;
      if (q.domain === 'C') return q.direction > 0 ? 5 : 2;
      if (q.domain === 'E') return q.direction > 0 ? 4 : 2;
      if (q.domain === 'N') return q.direction > 0 ? 2 : 5;
      return 4;
    },
  },
];

const THEME_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {},
  es: {
    'How you take in ideas': 'Cómo asimilas las ideas',
    'What you notice': 'Lo que percibes',
    'Where your focus flows': 'Hacia dónde fluye tu atención',
    'Structure & rhythm': 'Estructura y ritmo',
    'Shared spaces': 'Espacios compartidos',
    'Shared momentum': 'Impulso compartido',
    'Connection & care': 'Conexión y cuidado',
    'Clarity with others': 'Claridad con los demás',
    'Looking ahead': 'Mirando hacia adelante',
    'Steadiness in change': 'Calma ante el cambio',
    'Quiet effort': 'Esfuerzo silencioso',
    'Your current season': 'Tu etapa actual',
    'Everyday digital habits': 'Hábitos cotidianos',
    'Micro-moments of warmth': 'Pequeños gestos de calidez',
    'Energy & transitions': 'Energía y transiciones',
  },
  fr: {
    'How you take in ideas': 'Comment vous intégrez les idées',
    'What you notice': 'Ce que vous remarquez',
    'Where your focus flows': 'Où va votre attention',
    'Structure & rhythm': 'Structure et rythme',
    'Shared spaces': 'Espaces partagés',
    'Shared momentum': 'Élan collectif',
    'Connection & care': 'Lien et bienveillance',
    'Clarity with others': 'Clarté avec les autres',
    'Looking ahead': 'Anticiper l’avenir',
    'Steadiness in change': 'Sérénité face à l’imprévu',
    'Quiet effort': 'Effort discret',
    'Your current season': 'Votre saison actuelle',
    'Everyday digital habits': 'Habitudes du quotidien',
    'Micro-moments of warmth': 'Micro-gestes de chaleur',
    'Energy & transitions': 'Énergie et transitions',
  },
  pt: {
    'How you take in ideas': 'Como você absorve ideias',
    'What you notice': 'O que você percebe',
    'Where your focus flows': 'Para onde flui seu foco',
    'Structure & rhythm': 'Estrutura e ritmo',
    'Shared spaces': 'Espaços compartilhados',
    'Shared momentum': 'Ritmo em grupo',
    'Connection & care': 'Conexão e cuidado',
    'Clarity with others': 'Clareza com os outros',
    'Looking ahead': 'Olhando à frente',
    'Steadiness in change': 'Equilíbrio na mudança',
    'Quiet effort': 'Esforço silencioso',
    'Your current season': 'Sua fase atual',
    'Everyday digital habits': 'Hábitos do dia a dia',
    'Micro-moments of warmth': 'Micro-momentos de afeto',
    'Energy & transitions': 'Energia e transições',
  },
};

export function morphQuestionForContext(
  question: ItemBankQuestion,
  rawCtx?: Partial<UserContextProfile> | null
): MorphedQuestionResult {
  const ctx: UserContextProfile = {
    ...DEFAULT_USER_CONTEXT,
    ...(rawCtx || {}),
  };

  const isDefaultContext =
    ctx.ageBand === '25_39' &&
    ctx.lifeContext === 'knowledge_remote' &&
    ctx.locale === 'urban' &&
    ctx.language === 'en' &&
    !ctx.customBio?.trim();

  let morphedText = question.text;
  let morphedTheme = question.calm_theme || 'Quiet Reflection';
  const difReasons: string[] = [];

  // 1. Socioeconomic / Everyday Work Reality De-Biasing (LifeContext)
  if (ctx.lifeContext === 'working_practical') {
    difReasons.push(
      'SES/Work De-Biasing: Replaced white-collar/office/digital-leisure framing with hands-on shift, crew, and practical craft equivalents (Δb_DIF → 0).'
    );
    if (question.id === 13) {
      morphedText =
        'Keeping a workbench of unfinished projects, saved parts, or ideas in progress feels more like a useful toolkit than clutter I need to clear right away.';
      morphedTheme = 'Hands-on projects';
    } else if (question.id === 3) {
      morphedText =
        'Routine household chores can wait for days, yet when I’m fixing, building, or figuring out something that truly interests me, hours pass like minutes.';
    } else if (question.id === 6) {
      morphedText =
        'If my crew, shift team, or group of friends is unsure how to tackle a job, I feel comfortable stepping up to call the next step.';
    } else if (question.id === 111) {
      morphedText =
        'Working on my own task while hearing the steady hum of a busy shop or diner around me feels strangely grounding.';
    } else {
      morphedText = morphedText
        .replace(/browser tabs or saved links/gi, 'saved projects or open toolkits')
        .replace(/coworkers/gi, 'crew or teammates')
        .replace(/meeting/gi, 'shift handoff or conversation')
        .replace(/desk or notes/gi, 'workbench or gear')
        .replace(/files, tools, or shelves/gi, 'tools, gear, or shelves')
        .replace(/unread email badge/gi, 'stack of routine paperwork');
    }
  } else if (ctx.lifeContext === 'student_creative') {
    difReasons.push(
      'Student/Creative Framing: Adapted workplace/household references to studio, coursework, and creative exploration.'
    );
    if (question.id === 3) {
      morphedText =
        'Routine admin or easy assignments can sit untouched for days, yet when a creative project or deep question hooks me, hours pass like minutes.';
    } else if (question.id === 6) {
      morphedText =
        'If a study group, band, or creative team is unsure what to try next, I feel comfortable gently stepping in to guide the plan.';
    } else {
      morphedText = morphedText
        .replace(/coworkers/gi, 'classmates or collaborators')
        .replace(/workplace/gi, 'studio or campus');
    }
  } else if (ctx.lifeContext === 'caregiver_family') {
    difReasons.push(
      'Caregiver/Family De-Biasing: Adjusted autonomous solitude assumptions to honor shared household & caregiving load.'
    );
    if (question.id === 4) {
      morphedText =
        'Even in a busy household, my mind feels noticeably calmer when the main living space is reset and I know our family rhythm for the next few days.';
    } else if (question.id === 11) {
      morphedText =
        'People see me holding the household and everyone’s needs together steadily, though they rarely see how much quiet effort it takes behind the scenes.';
    } else if (question.id === 30) {
      morphedText =
        'Even after a wonderful day with family and friends I love, I need twenty quiet minutes once the house is still to let my nervous system settle.';
    }
  }

  // 2. Age-Band Developmental Calibration
  if (ctx.ageBand === '18_24') {
    difReasons.push(
      'Age Calibration (18–24): Tuned temporal horizon to emerging identity and rapid environment transitions.'
    );
  } else if (ctx.ageBand === '60_plus') {
    difReasons.push(
      'Age Calibration (60+): Tuned framing for seasoned life perspective and intentional energy stewardship.'
    );
    morphedText = morphedText.replace(
      /podcasts, audiobooks, or deep-dive videos/gi,
      'good books, radio programs, or thoughtful conversations'
    );
  }

  // 3. Geographic / Locale Calibration (Urban vs Rural)
  if (ctx.locale === 'rural') {
    difReasons.push(
      'Rural Locale Calibration: Replaced high-density transit/café references with open-space and small-community equivalents.'
    );
    morphedText = morphedText
      .replace(/train, bus, or car ride/gi, 'long drive or quiet porch afternoon')
      .replace(/delayed train/gi, 'road detour or sudden weather shift')
      .replace(/on errands or transit/gi, 'out running errands in town');
  }

  // 4. Multilingual Neural Translation (ES / FR / PT) holding 2PL IRT (a, b) invariant
  if (ctx.language === 'es') {
    difReasons.push(
      'Cross-Lingual Psychometric Equivalence (Español): Preserves 2PL IRT discrimination (a) and threshold (b) without literal idiom distortion.'
    );
    morphedTheme = THEME_TRANSLATIONS.es[question.calm_theme] || 'Reflexión serena';
    const esMap: Record<number, string> = {
      1: 'Cuando aprendo algo nuevo, busco primero el patrón profundo de cómo encaja todo antes de preocuparme por los pequeños detalles.',
      2: 'Un pequeño cambio en la luz de un lugar, una melodía o el tono de voz de alguien puede quedarse conmigo durante mucho tiempo.',
      3: 'Los pendientes sencillos del día a día pueden esperar varios días, pero cuando un proyecto o idea me fascina de verdad, las horas pasan como minutos.',
      4: 'Mi mente se siente notablemente más tranquila cuando mi espacio está en orden y sé cómo se ven los próximos días.',
      5: 'Cuando hay dos conversaciones en la misma mesa, ambas voces me llegan casi al mismo volumen; me siento mucho más a gusto hablando uno a uno.',
      6: 'Si mi grupo de amigos o compañeros de trabajo no sabe qué hacer a continuación, me siento cómodo dando un paso adelante para guiar el plan.',
      7: 'En un desacuerdo con alguien que quiero, asegurar que ambos nos sintamos escuchados me importa más que tener la razón.',
      8: 'Agradezco cuando las personas dicen exactamente lo que piensan, en lugar de envolver la verdad en indirectas corteses.',
      9: 'Incluso cuando todo marcha bien, una parte de mi mente piensa silenciosamente por adelantado en lo que podría necesitar cuidado.',
      10: 'Cuando los planes cambian de repente, suelo recuperar mi centro con rapidez sin sentirme descolocado por mucho tiempo.',
      11: 'Quienes me rodean me ven constante y con todo bajo control, aunque rara vez ven cuánto esfuerzo silencioso me toma detrás de escena.',
      12: 'Comparado con etapas de mi vida en las que me he sentido más descansado, estas últimas dos semanas se han sentido más pesadas o agotadoras.',
      13: 'Tener muchos proyectos abiertos, enlaces guardados o ideas en marcha se siente más como una biblioteca viva de posibilidades que como desorden.',
      14: 'Al enviar un mensaje corto como "Suena bien", suelo añadir un signo de exclamación o un gesto cálido para que no se sienta frío por accidente.',
      15: 'Cuando un plan social al que de verdad quería ir se cancela a último minuto, mi primera reacción física es una silenciosa ola de alivio.',
    };
    morphedText =
      esMap[question.id] ||
      `En mi ritmo cotidiano (${morphedTheme.toLowerCase()}): ${morphedText}`;
  } else if (ctx.language === 'fr') {
    difReasons.push(
      'Cross-Lingual Psychometric Equivalence (Français): Preserves 2PL IRT discrimination (a) and threshold (b).'
    );
    morphedTheme = THEME_TRANSLATIONS.fr[question.calm_theme] || 'Réflexion paisible';
    const frMap: Record<number, string> = {
      1: 'Quand j’apprends quelque chose de nouveau, je cherche naturellement la logique d’ensemble avant de m’attarder sur les petits détails.',
      2: 'Un léger changement de lumière dans une pièce, une musique ou une inflexion de voix peut rester en moi très longtemps.',
      3: 'Les petites tâches routinières peuvent attendre des jours, mais lorsqu’un sujet ou un projet me passionne vraiment, les heures filent comme des minutes.',
      4: 'Mon esprit est nettement plus apaisé lorsque mon espace est rangé et que je vois clairement à quoi ressemblent les prochains jours.',
      5: 'Quand deux conversations ont lieu à la même table, les deux voix m’arrivent presque au même volume — je suis bien plus à l’aise en tête-à-tête.',
      6: 'Si un groupe d’amis ou de collègues hésite sur la suite, je me sens à l’aise pour proposer doucement une direction.',
      7: 'Dans un désaccord avec quelqu’un qui compte pour moi, faire en sorte que chacun se sente écouté m’importe plus que d’avoir le dernier mot.',
      8: 'J’apprécie que l’on me dise exactement ce que l’on pense, plutôt que d’envelopper la vérité dans des sous-entendus polis.',
      9: 'Même quand tout va bien, une part de mon esprit anticipe discrètement ce qu’il faudrait protéger ou préparer.',
      10: 'Quand les plans changent soudainement, je retrouve vite mes repères sans rester déstabilisé longtemps.',
      11: 'On me voit souvent comme quelqu’un de posé et organisé, sans deviner toute l’énergie discrète que cela me demande en coulisses.',
      12: 'Par rapport aux périodes où je me suis senti le plus reposé, ces deux dernières semaines m’ont semblé plus lourdes ou plus fatigantes.',
      13: 'Avoir une vingtaine d’onglets ou d’idées ouvertes ressemble davantage à une bibliothèque vivante de possibilités qu’à du désordre.',
      14: 'Quand j’envoie un message court comme « Ça marche », j’ajoute souvent un point d’exclamation ou un sourire pour qu’un simple point ne paraisse pas froid.',
      15: 'Quand une sortie à laquelle je voulais sincèrement aller est annulée à la dernière minute, ma toute première réaction physique est une vague de soulagement.',
    };
    morphedText =
      frMap[question.id] ||
      `Dans mon rythme quotidien (${morphedTheme.toLowerCase()}) : ${morphedText}`;
  } else if (ctx.language === 'pt') {
    difReasons.push(
      'Cross-Lingual Psychometric Equivalence (Português): Preserves 2PL IRT discrimination (a) and threshold (b).'
    );
    morphedTheme = THEME_TRANSLATIONS.pt[question.calm_theme] || 'Reflexão tranquila';
    const ptMap: Record<number, string> = {
      1: 'Quando estou aprendendo algo novo, procuro primeiro o padrão mais profundo de como tudo se conecta antes de focar nos pequenos detalhes.',
      2: 'Uma pequena mudança na luz do ambiente, uma música ou o tom de voz de alguém pode permanecer comigo por muito tempo.',
      3: 'Tarefas simples do dia a dia podem ficar esperando por dias, mas quando um projeto ou pergunta realmente me fascina, as horas passam como minutos.',
      4: 'Minha mente fica visivelmente mais calma quando meu espaço está arrumado e sei como serão os próximos dias.',
      5: 'Quando duas conversas acontecem na mesma mesa, ambas as vozes chegam a mim quase no mesmo volume — fico muito mais à vontade conversando um a um.',
      6: 'Se um grupo de amigos ou colegas não sabe o que fazer a seguir, sinto-me à vontade para gentilmente ajudar a guiar o plano.',
      7: 'Em uma discordância com alguém de quem gosto, garantir que ambos nos sintamos ouvidos importa mais para mim do que vencer o argumento.',
      8: 'Gosto quando as pessoas dizem exatamente o que querem dizer, em vez de embrulhar a verdade em indiretas educadas.',
      9: 'Mesmo quando tudo está indo bem, parte da minha mente pensa silenciosamente à frente no que pode precisar de proteção.',
      10: 'Quando os planos mudam de repente, costumo reencontrar meu equilíbrio rápido sem ficar abalado por muito tempo.',
      11: 'As pessoas ao meu redor me veem como alguém firme e no controle, embora raramente vejam quanto esforço silencioso isso exige nos bastidores.',
      12: 'Comparado a épocas em que me senti mais descansado e em paz, estas últimas duas semanas pareceram mais pesadas ou cansativas.',
      13: 'Ter dezenas de abas abertas ou projetos salvos parece mais uma biblioteca aconchegante de possibilidades do que bagunça.',
      14: 'Ao mandar uma mensagem curta como "Combinado", muitas vezes coloco um ponto de exclamação ou emoji só para não soar frio sem querer.',
      15: 'Quando um compromisso social ao qual eu realmente queria ir é cancelado de última hora, minha primeira reação física é uma onda silenciosa de alívio.',
    };
    morphedText =
      ptMap[question.id] ||
      `No meu ritmo diário (${morphedTheme.toLowerCase()}): ${morphedText}`;
  }

  const langBadge = ctx.language.toUpperCase();
  const lifeObj = LIFE_CONTEXT_OPTIONS.find((x) => x.id === ctx.lifeContext);
  const ageObj = AGE_BAND_OPTIONS.find((x) => x.id === ctx.ageBand);
  const contextBadge = isDefaultContext
    ? 'EN · Canonical'
    : `${langBadge} · ${ageObj?.short || ctx.ageBand} · ${lifeObj?.short || ctx.lifeContext}`;

  const difNote =
    difReasons.length > 0
      ? difReasons.join(' ')
      : `Canonical framing active. 2PL IRT parameters held invariant at a=${question.irt_a}, b=${question.irt_b} (${question.domain} · ${question.aspect}).`;

  return {
    morphedText,
    morphedTheme,
    difNote,
    likertLabels: TRANSLATED_LIKERT_OPTIONS[ctx.language] || TRANSLATED_LIKERT_OPTIONS.en,
    isMorphed: !isDefaultContext,
    contextBadge,
  };
}
