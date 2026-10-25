import {
  DomainKey,
  ItemBankQuestion,
  NeuroMask,
  PaperCategory,
  ShadowCalibrationRow,
  StudioFlow,
} from '../types/aura';

export const ARCHETYPES: Record<
  string,
  {
    title: string;
    vibe: string;
    summary: string;
    blindspot: string;
    environment: string;
  }
> = {
  INFP: {
    title: 'The Empathic World-Builder',
    vibe: 'Deeply Intuitive & Warm',
    summary:
      'You listen for the deeper meaning beneath everyday moments. Your mind naturally weaves together imagination, quiet values, and care for how people truly feel.',
    blindspot:
      'When life feels noisy or rushed, everyday administrative errands can pile up while you protect your inner energy and the harmony of people around you.',
    environment:
      'You flourish in calm, high-trust spaces with creative freedom, meaningful purpose, and unhurried one-on-one connection.',
  },
  INFJ: {
    title: 'The Quiet Horizon Keeper',
    vibe: 'Insightful & Deeply Caring',
    summary:
      'You hold a long, compassionate view of people and possibilities. You sense unspoken patterns early and care deeply about helping things grow in a gentle, thoughtful way.',
    blindspot:
      'Because you take in so much of the emotional weather around you, crowded or tense rooms can quietly drain your reserves before you realize it.',
    environment:
      'You thrive in quiet, purposeful work with depth, clear values, and space to think without constant interruption.',
  },
  INTJ: {
    title: 'The Quiet Architect',
    vibe: 'Long-Range & Clear-Eyed',
    summary:
      'Your mind naturally steps back to see how the whole picture fits together over time. You love turning complex tangles into calm, elegant clarity.',
    blindspot:
      'When you are deeply absorbed in solving a problem, you may forget to slow down and share the warm steps of how you arrived there.',
    environment:
      'You do your best work with autonomy, deep uninterrupted focus, and thoughtful peers who value clarity and follow-through.',
  },
  INTP: {
    title: 'The Curious Pattern-Weaver',
    vibe: 'Inventive & Reflective',
    summary:
      'You are happiest exploring how ideas work from the inside out. Your mind loves following a fascinating question wherever it leads.',
    blindspot:
      'Once you have figured out the interesting puzzle in your head, routine finishing touches can suddenly feel heavy or repetitive.',
    environment:
      'You thrive in open-ended exploration, research, creative problem-solving, and spaces that welcome curiosity over rigid checklists.',
  },
  ENFP: {
    title: 'The Warm Spark-Weaver',
    vibe: 'Imaginative & Full of Heart',
    summary:
      'You bring warmth, curiosity, and fresh possibility into the room. You naturally connect disparate ideas and help people see what could be.',
    blindspot:
      'Repetitive upkeep and rigid routines can quickly dim your spark once the initial excitement of discovery has passed.',
    environment:
      'You come alive in creative, people-warm environments where new ideas, storytelling, and genuine connection are welcomed.',
  },
  ENTP: {
    title: 'The Playful Horizon-Expander',
    vibe: 'Curious & Quick-Silver',
    summary:
      'Your mind lights up when exploring fresh angles, turning assumptions upside down, and discovering unexpected connections in conversation.',
    blindspot:
      'Settled routines can feel like a closed door, tempting you to stir up a new project before the last one is tucked in.',
    environment:
      'You thrive in lively, creative settings where brainstorming, experimentation, and candid dialogue are celebrated.',
  },
  ENFJ: {
    title: 'The Warm Gathering Light',
    vibe: 'Attuned & Encouraging',
    summary:
      'You naturally feel the rhythm of a group and care about bringing out the best in everyone around you. People feel seen and steadied in your presence.',
    blindspot:
      'Carrying everyone else’s hopes and worries inside your own heart can leave little quiet room left over for your own rest.',
    environment:
      'You flourish in collaborative, heart-led communities, mentoring, creative leadership, and mission-driven teams.',
  },
  ENTJ: {
    title: 'The Steady Wayfinder',
    vibe: 'Clear-Sighted & Momentum-Building',
    summary:
      'You see the path forward clearly and enjoy bringing structure and momentum to big, meaningful goals.',
    blindspot:
      'When the path feels obvious to you, moving too quickly can accidentally rush people who need a gentler pace to feel heard.',
    environment:
      'You excel when guiding ambitious projects, building thoughtful systems, and collaborating with people who appreciate clear direction.',
  },
  ISFP: {
    title: 'The Gentle Sensory Artist',
    vibe: 'Present & Quietly Expressive',
    summary:
      'You experience life through texture, atmosphere, and quiet authenticity. You care deeply, preferring to show warmth through presence rather than loud words.',
    blindspot:
      'Harsh or overly rigid schedules can make you pull inward to protect your inner peace.',
    environment:
      'You thrive in hands-on, aesthetically rich spaces where you can move at a humane, unhurried rhythm.',
  },
  ISTP: {
    title: 'The Calm Craftsperson',
    vibe: 'Grounded & Observant',
    summary:
      'You have a steady, practical intuition for how things work in the real world, meeting challenges with quiet composure.',
    blindspot:
      'Sitting through long, abstract meetings without a clear purpose can quickly drain your patience.',
    environment:
      'You do your best work with autonomy, tangible problems to solve, and space to work with your hands or mind undisturbed.',
  },
  ISFJ: {
    title: 'The Quiet Sanctuary Builder',
    vibe: 'Devoted & Grounding',
    summary:
      'You remember the small human details that make people feel safe and cared for. Your steadiness is an anchor for the people you love.',
    blindspot:
      'You often say yes to helping others while quietly setting your own tiredness aside.',
    environment:
      'You flourish in warm, dependable settings where care, continuity, and thoughtful craftsmanship are valued.',
  },
  ISTJ: {
    title: 'The Steady Anchor',
    vibe: 'Reliable & Clear-Minded',
    summary:
      'You bring calm order and quiet dependability to everything you touch. When you give your word, people can rest easy knowing it will be done well.',
    blindspot:
      'Sudden, unannounced changes of plan can feel unnecessarily jarring when you have already built a careful rhythm.',
    environment:
      'You thrive in well-organized, respectful environments that honor preparation, depth, and follow-through.',
  },
  ESFP: {
    title: 'The Joyful Moment-Maker',
    vibe: 'Warm & Immediately Present',
    summary:
      'You notice the beauty and warmth of the present moment and generously invite others to enjoy it with you.',
    blindspot:
      'Long stretches of solitary, abstract planning can feel heavy without human warmth nearby.',
    environment:
      'You shine in lively, expressive, people-centered spaces with tangible energy and shared joy.',
  },
  ESTP: {
    title: 'The Agile Navigator',
    vibe: 'Present & Resourceful',
    summary:
      'You read the room in real time and move with natural confidence when plans need quick, grounded action.',
    blindspot:
      'Slow, over-complicated processes can make you restless when a simple, direct step is right in front of you.',
    environment:
      'You thrive in dynamic, hands-on settings where adaptability and clear action matter.',
  },
  ESFJ: {
    title: 'The Warm Hearth-Keeper',
    vibe: 'Generous & Community-Hearted',
    summary:
      'You weave people together with everyday kindness, remembering what matters to each person and making shared spaces feel welcoming.',
    blindspot:
      'Tension between people you care about can weigh heavily on your mind until harmony is restored.',
    environment:
      'You flourish in supportive, collaborative communities where mutual care and shared traditions are cherished.',
  },
  ESTJ: {
    title: 'The Clear-Hearted Organizer',
    vibe: 'Structured & Dependable',
    summary:
      'You love helping groups turn good intentions into clear, workable plans so everyone knows how to succeed together.',
    blindspot:
      'When focusing on getting things across the finish line, you may need to pause and leave extra room for unspoken feelings.',
    environment:
      'You excel in well-run, purposeful teams that value clarity, fairness, and shared accomplishment.',
  },
};

export const PARTNER_PRESETS: Record<
  string,
  {
    name: string;
    scores: Record<DomainKey, number>;
    mask_id: string;
  }
> = {
  INFJ: {
    name: 'Jordan',
    scores: { O: 84, C: 74, E: 38, A: 80, N: 36 },
    mask_id: 'hsp_high_gain_sensor',
  },
  ENFP: {
    name: 'Sam',
    scores: { O: 86, C: 42, E: 78, A: 76, N: 48 },
    mask_id: 'adhd_dopamine_forager',
  },
  INTJ: {
    name: 'Morgan',
    scores: { O: 84, C: 82, E: 32, A: 48, N: 28 },
    mask_id: 'monotropic_sensory_precision',
  },
  ENTP: {
    name: 'Riley',
    scores: { O: 88, C: 44, E: 74, A: 62, N: 34 },
    mask_id: 'adhd_dopamine_forager',
  },
  ENFJ: {
    name: 'Taylor',
    scores: { O: 78, C: 74, E: 80, A: 84, N: 36 },
    mask_id: 'canonical_allistic',
  },
};

export const LIKERT_OPTIONS = [
  { val: 1, label: 'Not like me' },
  { val: 2, label: 'Rarely me' },
  { val: 3, label: 'Sometimes' },
  { val: 4, label: 'Often me' },
  { val: 5, label: 'Very much me' },
];

export const CALM_DIMENSION_LABELS: Record<
  DomainKey,
  { name: string; subtitle: string }
> = {
  O: {
    name: 'Curiosity & Imagination',
    subtitle: 'How readily your mind explores patterns, ideas, and sensory nuance',
  },
  C: {
    name: 'Focus & Follow-Through',
    subtitle: 'How you hold structure across everyday tasks and deep interests',
  },
  E: {
    name: 'Social Energy',
    subtitle: 'Where you feel most recharged—quiet sanctuary vs. shared momentum',
  },
  A: {
    name: 'Warmth & Harmony',
    subtitle: 'How deeply you tune in to others’ feelings and mutual care',
  },
  N: {
    name: 'Emotional Sensitivity',
    subtitle: 'How vividly you feel shifts in atmosphere, uncertainty, and change',
  },
};

export const SAMPLE_DEMO_RESPONSES: Record<number, number> = {
  1: 5,
  2: 4,
  3: 5,
  4: 2,
  5: 4,
  6: 3,
  7: 5,
  8: 4,
  9: 4,
  10: 3,
  11: 4,
  12: 4,
};

export const INITIAL_ITEMS: ItemBankQuestion[] = [
  {
    id: 1,
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
  },
  {
    id: 2,
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
  },
  {
    id: 3,
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
  },
  {
    id: 4,
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
  },
  {
    id: 5,
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
  },
  {
    id: 6,
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
  },
  {
    id: 7,
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
  },
  {
    id: 8,
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
  },
  {
    id: 9,
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
  },
  {
    id: 10,
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
  },
  {
    id: 11,
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
  },
  {
    id: 12,
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
  },
  {
    id: 13,
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
    scientific_hypothesis:
      "Disarming ecological behavioral proxy for exploratory novelty foraging vs. linear closure (Anchor C r = -0.61, Salience-Split r = +0.64) that bypasses self-evaluative shame around 'messiness'.",
  },
  {
    id: 14,
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
    scientific_hypothesis:
      'Disarming digital pragmatics proxy for interpersonal allostatic cushioning and affiliative tone regulation (Anchor A r = +0.58, Compensatory Masking r = +0.44).',
  },
  {
    id: 15,
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
    scientific_hypothesis:
      "Decouples affiliative care ('genuinely wanted to go') from autonomic transition & sensory saturation cost (Anchor E r = -0.63, Acoustic Stream Split r = +0.59).",
  },
];

export const INITIAL_MASKS: NeuroMask[] = [
  {
    id: 'adhd_dopamine_forager',
    name: 'Interest-Based Nervous System (Dopamine-Foraging / Salience-Gated)',
    short_label: 'Spark-Driven Rhythm',
    calm_title: 'Spark-Driven Rhythm',
    calm_Badge: 'Lit by Curiosity',
    calm_badge: 'Lit by Curiosity',
    calm_summary:
      'Your focus is powered by meaning, novelty, and genuine interest rather than routine obligation. Everyday checklists can feel surprisingly heavy, yet when a question or project truly captures your heart, your depth of focus is extraordinary.',
    calm_reframe:
      "Most personality tests mistake a dislike of routine errands for 'low discipline.' Once we separate routine chores from curiosity-driven work, your true follow-through is strong and deeply devoted.",
    badge: 'Salience-Gated Mask',
    neural_mechanism:
      'Lower tonic prefrontal/striatal dopamine baseline paired with high-amplitude phasic bursts under novelty, urgency, or deep intrinsic interest. Action gating is salience-coupled rather than routine-coupled.',
    prior_offsets: { O: 14.0, C: -22.0, E: 6.0, A: 0.0, N: 10.0 },
    gating_reinterpretation: {
      salience_vs_routine_split: 34.0,
      sensory_overload_social_penalty: 4.0,
      perceptual_gain_to_volatility_confound: 8.0,
    },
    diagnostic_note:
      "Standard tests misread low routine chore completion (-22% C offset) as 'low conscientiousness.' De-confounding reveals high Salience-Locked Hyperfocus (+34% drive on high-interest problems).",
  },
  {
    id: 'monotropic_sensory_precision',
    name: 'Monotropic / High-Sensory-Precision (Deep-Tunnel Systemizer)',
    short_label: 'Deep-Current Rhythm',
    calm_title: 'Deep-Current Rhythm',
    calm_Badge: 'Built for Depth',
    calm_badge: 'Built for Depth',
    calm_summary:
      "You experience the world in high definition. Busy, overlapping rooms drain your energy quickly—not because you don't care about people, but because your mind naturally tunes in deeply to one conversation or idea at a time.",
    calm_reframe:
      "Traditional tests often confuse crowd fatigue with being 'distant.' In quiet, one-on-one spaces where you don't have to filter out background noise, your warmth and loyalty shine clearly.",
    badge: 'High Sensory Precision',
    neural_mechanism:
      'Elevated bottom-up thalamocortical sensory precision (pi_sensory) and deep, narrow attention tunnels (Monotropism). High-entropy social environments trigger sensory saturation rather than social apathy.',
    prior_offsets: { O: 8.0, C: 10.0, E: -24.0, A: -12.0, N: 11.0 },
    gating_reinterpretation: {
      salience_vs_routine_split: 18.0,
      sensory_overload_social_penalty: 28.0,
      perceptual_gain_to_volatility_confound: 12.0,
    },
    diagnostic_note:
      "Standard tests misclassify sensory crowd-fatigue (-24% E) and direct communication (-12% A) as 'aloofness.' Masking isolates genuine 1-on-1 allostatic loyalty (+28% de-confounded social capacity).",
  },
  {
    id: 'audhd_dual_attractor',
    name: 'Dual-Attractor Paradox (Novelty Foraging × Sensory Sanctuary)',
    short_label: 'Tides & Anchor Rhythm',
    calm_title: 'Tides & Anchor Rhythm',
    calm_Badge: 'Explorer & Sanctuary',
    calm_badge: 'Explorer & Sanctuary',
    calm_summary:
      'You hold a rare, creative balance inside you: one part of your mind craves fresh horizons, new ideas, and spontaneity, while another part needs a quiet, predictable sanctuary to feel grounded.',
    calm_reframe:
      'On ordinary personality tests, your love of novelty and your need for calm cancel each other out into a blurry middle score. Seeing both sides together honors how you actually move through the world.',
    badge: 'Bimodal Paradox Mask',
    neural_mechanism:
      'Simultaneous prefrontal novelty foraging (dopamine-salience gating) and high bottom-up sensory precision requiring environmental predictability.',
    prior_offsets: { O: 16.0, C: -12.0, E: -14.0, A: -4.0, N: 14.0 },
    gating_reinterpretation: {
      salience_vs_routine_split: 36.0,
      sensory_overload_social_penalty: 22.0,
      perceptual_gain_to_volatility_confound: 14.0,
    },
    diagnostic_note:
      'Competing needs for novelty and order cancel out on linear tests. This mask unmasks bimodal high-entropy intellectual exploration paired with low-noise sensory protection.',
  },
  {
    id: 'hsp_high_gain_sensor',
    name: 'High-Gain Perceptive & Allostatic Sensor (Deep Perceptual Resolution)',
    short_label: 'Finely Tuned Rhythm',
    calm_title: 'Finely Tuned Rhythm',
    calm_Badge: 'High Perceptual Clarity',
    calm_badge: 'High Perceptual Clarity',
    calm_summary:
      'You notice subtle shifts in tone, atmosphere, music, and emotion that others walk right past. Because you take in so much nuance, you feel both beauty and tension more vividly than most.',
    calm_reframe:
      "Most tests lump deep perceptiveness into 'worry' or 'stress.' Separating your natural attentiveness from stress shows a remarkably steady, perceptive core.",
    badge: 'Amplified Signal Gain',
    neural_mechanism:
      'Amplified insula and mirror-network gain on subtle aesthetic, emotional, and interpersonal micro-signals.',
    prior_offsets: { O: 12.0, C: 4.0, E: -10.0, A: 14.0, N: 18.0 },
    gating_reinterpretation: {
      salience_vs_routine_split: 8.0,
      sensory_overload_social_penalty: 16.0,
      perceptual_gain_to_volatility_confound: 26.0,
    },
    diagnostic_note:
      "Standard Big Five tests dump high perceptual & empathic resolution straight into 'High Neuroticism' (+18% N offset). Masking separates signal sensitivity from emotional dysregulation.",
  },
  {
    id: 'canonical_allistic',
    name: 'Canonical Allistic Baseline (Steady-Current Rhythm)',
    short_label: 'Steady-Current Rhythm',
    calm_title: 'Steady-Current Rhythm',
    calm_Badge: 'Even Pace',
    calm_badge: 'Even Pace',
    calm_summary:
      "Your energy flows with a natural, even cadence across both everyday routines and shared social spaces. You don't have to fight steep internal friction just to switch between tasks or environments.",
    calm_reframe:
      'Because your baseline pace translates directly into everyday habits, your portrait reflects your preferences with very little hidden friction.',
    badge: 'Unmasked Prior',
    neural_mechanism:
      'Standard tonic/phasic striatal dopamine gating with linear routine-to-action coupling and typical thalamocortical sensory attenuation.',
    prior_offsets: { O: 0.0, C: 0.0, E: 0.0, A: 0.0, N: 0.0 },
    gating_reinterpretation: {
      salience_vs_routine_split: 4.0,
      sensory_overload_social_penalty: 4.0,
      perceptual_gain_to_volatility_confound: 4.0,
    },
    diagnostic_note:
      'Standard normative comparison with minimal neurodevelopmental mask offset.',
  },
];

export const PAPERS_CORPUS: PaperCategory[] = [
  {
    domain_dir: '01_social_manifold',
    domain_title: '01_social_manifold',
    paper_count: 7,
    papers: [
      {
        filename: 'thornton2019_brain_represents_people_habitual_mental_states.pdf',
        title: 'The brain represents people as the mental states they habitually experience',
        authors: ['Mark A. Thornton', 'Miriam E. Weaverdyck', 'Diana I. Tamir'],
        year: 2019,
        identifier: 'DOI:10.1038/s41467-019-10309-7 | PMCID:PMC6533269',
      },
      {
        filename: 'thornton2024_situations_mental_states_action_affordances.pdf',
        title:
          'Neural representations of situations and mental states are composed of sums of representations of the actions they afford',
        authors: ['Mark A. Thornton', 'Diana I. Tamir'],
        year: 2024,
        identifier: 'DOI:10.1038/s41467-024-44870-7 | PMCID:PMC10799018',
      },
      {
        filename: 'schafer2025_social_navigation_power_affiliation_space.pdf',
        title: 'Social avoidance can be quantified as navigation in abstract social space',
        authors: ['Matthew Schafer', 'Daniela Schiller'],
        year: 2025,
        identifier: 'DOI:10.1038/s44271-025-00215-8 | PMCID:PMC11936828',
      },
      {
        filename: 'courellis2024_hippocampal_abstract_geometry_inference.pdf',
        title: 'Abstract representations emerge in human hippocampal neurons during inference',
        authors: [
          'Hristos S. Courellis',
          'Juri Minxha',
          'Araceli R. Cardenas',
          'Daniel L. Kimmel',
          'Chrystal M. Reed',
          'Taufik A. Valiante',
          'C. Daniel Salzman',
          'Adam N. Mamelak',
          'Stefano Fusi',
          'Ueli Rutishauser',
        ],
        year: 2024,
        identifier: 'DOI:10.1038/s41586-024-07799-x | PMCID:PMC11338822',
      },
      {
        filename: 'ma2026_hippocampal_prefrontal_emotion_cognitive_maps.pdf',
        title: 'Map-like representations of emotion knowledge in hippocampal-prefrontal systems',
        authors: ['Yudan Ma', 'Philip A. Kragel'],
        year: 2026,
        identifier: 'DOI:10.1038/s41467-025-68240-z | PMCID:PMC12891686',
      },
      {
        filename: 'rabinowitz2018_machine_theory_of_mind.pdf',
        title: 'Machine Theory of Mind',
        authors: [
          'Neil C. Rabinowitz',
          'Frank Perbet',
          'H. Francis Song',
          'Chiyuan Zhang',
          'S. M. Ali Eslami',
          'Matthew Botvinick',
        ],
        year: 2018,
        identifier: 'arXiv:1802.07740',
      },
      {
        filename: 'mitchell_heggs2022_neural_manifold_analysis_brain_dynamics.pdf',
        title: 'Neural manifold analysis of brain circuit dynamics in health and disease',
        authors: [
          'Rufus Mitchell-Heggs',
          'Seigfred Prado',
          'Giuseppe P. Gava',
          'Mary Ann Go',
          'Simon R. Schultz',
        ],
        year: 2022,
        identifier: 'arXiv:2203.11874 | DOI:10.1007/s10827-022-00839-3',
      },
    ],
  },
  {
    domain_dir: '02_predictive_neurotypes',
    domain_title: '02_predictive_neurotypes',
    paper_count: 7,
    papers: [
      {
        filename: 'lawson_2014_aberrant_precision_autism.pdf',
        title: 'An aberrant precision account of autism',
        authors: ['Rebecca P. Lawson', 'Geraint E. Rees', 'Karl J. Friston'],
        year: 2014,
        identifier: 'doi:10.3389/fnhum.2014.00302',
      },
      {
        filename: 'friston_2012_dopamine_affordance_active_inference.pdf',
        title: 'Dopamine, Affordance and Active Inference',
        authors: [
          'Karl J. Friston',
          'Tamara Shiner',
          'Thomas H. B. FitzGerald',
          'Joseph M. Galea',
          'Rick A. Adams',
          'Harriet R. Brown',
          'Raymond J. Dolan',
          'Rosalyn Moran',
          'Klaas Enno Stephan',
          'Sven Bestmann',
        ],
        year: 2012,
        identifier: 'doi:10.1371/journal.pcbi.1002327',
      },
      {
        filename: 'dacosta_2020_reward_maximisation_discrete_active_inference.pdf',
        title: 'Reward Maximisation through Discrete Active Inference',
        authors: [
          'Lancelot Da Costa',
          'Noor Sajid',
          'Thomas Parr',
          'Karl J. Friston',
          'Ryan S. Smith',
        ],
        year: 2020,
        identifier: 'arXiv:2009.08111',
      },
      {
        filename: 'mirza_2019_bayesian_selective_attention_active_inference.pdf',
        title: 'Introducing a Bayesian model of selective attention based on active inference',
        authors: ['Muammer Berk Mirza', 'Rick A. Adams', 'Karl J. Friston', 'Thomas Parr'],
        year: 2019,
        identifier: 'doi:10.1038/s41598-019-50138-8',
      },
      {
        filename: 'friston_2022_computational_psychiatry_synapses_sentience.pdf',
        title: 'Computational psychiatry: from synapses to sentience',
        authors: ['Karl J. Friston'],
        year: 2022,
        identifier: 'doi:10.1038/s41380-022-01743-z',
      },
      {
        filename: 'safron_deyoung_2021_cybernetic_big_five_free_energy.pdf',
        title:
          'Integrating Cybernetic Big Five Theory with the free energy principle: A new strategy for modeling personalities as complex systems',
        authors: ['Adam Safron', 'Colin G. DeYoung'],
        year: 2021,
        identifier: 'doi:10.1016/B978-0-12-819200-9.00010-7 | doi:10.31234/osf.io/653wp',
      },
      {
        filename: 'hinrichs_bolis_2025_geometric_hyperscanning_affect_active_inference.pdf',
        title: 'Geometric Hyperscanning of Affect under Active Inference',
        authors: [
          'Nicolás Hinrichs',
          'Mahault Albarracin',
          'Dimitris Bolis',
          'Yuyue Jiang',
          'Leonardo Christov-Moore',
          'Leonhard Schilbach',
        ],
        year: 2025,
        identifier: 'arXiv:2506.08599 | doi:10.48550/arXiv.2506.08599',
      },
    ],
  },
  {
    domain_dir: '03_computational_psychometrics',
    domain_title: '03_computational_psychometrics',
    paper_count: 8,
    papers: [
      {
        filename: 'buerkner_2019_bayesian_irt_brms_stan.pdf',
        title: 'Bayesian Item Response Modeling in R with brms and Stan',
        authors: ['Paul-Christian Bürkner'],
        year: 2019,
        identifier: '1905.09501',
      },
      {
        filename: 'li_gibbons_rockova_2025_deep_multidimensional_cat.pdf',
        title: 'Deep Computerized Adaptive Testing',
        authors: ['Jiguang Li', 'Robert Gibbons', 'Veronika Ročková'],
        year: 2025,
        identifier: '2502.19275',
      },
      {
        filename: 'tran_phung_venkatesh_2014_thurstonian_boltzmann_machines.pdf',
        title: 'Thurstonian Boltzmann Machines: Learning from Multiple Inequalities',
        authors: ['Truyen Tran', 'Dinh Phung', 'Svetha Venkatesh'],
        year: 2014,
        identifier: '1408.0055',
      },
      {
        filename: 'colombi_giordano_gottard_iannario_2016_ordinal_responses_latent_uncertainty.pdf',
        title:
          'Modelling Ordinal Responses with Uncertainty: a Hierarchical Marginal Model with Latent Uncertainty components',
        authors: ['Roberto Colombi', 'Sabrina Giordano', 'Anna Gottard', 'Maria Iannario'],
        year: 2016,
        identifier: '1607.00882',
      },
      {
        filename: 'epskamp_maris_waldorp_borsboom_2016_network_psychometrics_irt_ising.pdf',
        title: 'Network Psychometrics',
        authors: ['Sacha Epskamp', 'Gunter K. J. Maris', 'Lourens J. Waldorp', 'Denny Borsboom'],
        year: 2016,
        identifier: '1609.02818',
      },
      {
        filename: 'epskamp_rhemtulla_borsboom_2016_generalized_network_psychometrics.pdf',
        title: 'Generalized Network Psychometrics: Combining Network and Latent Variable Models',
        authors: ['Sacha Epskamp', 'Mijke Rhemtulla', 'Denny Borsboom'],
        year: 2016,
        identifier: '1605.09288',
      },
      {
        filename: 'epskamp_waldorp_mottus_borsboom_2016_ggm_timeseries_within_between_person.pdf',
        title: 'The Gaussian Graphical Model in Cross-sectional and Time-series Data',
        authors: ['Sacha Epskamp', 'Lourens J. Waldorp', 'René Mõttus', 'Denny Borsboom'],
        year: 2016,
        identifier: '1609.04156',
      },
      {
        filename: 'epskamp_borsboom_fried_2016_psychological_networks_accuracy.pdf',
        title: 'Estimating Psychological Networks and their Accuracy: A Tutorial Paper',
        authors: ['Sacha Epskamp', 'Denny Borsboom', 'Eiko I. Fried'],
        year: 2016,
        identifier: '1604.08462',
      },
    ],
  },
  {
    domain_dir: '04_cognitive_telemetry',
    domain_title:
      'Cognitive Telemetry, Aphantasia/Hyperphantasia Imagery Spectrum, Drift-Diffusion RT Variability & Working Memory Chunking',
    paper_count: 6,
    papers: [
      {
        filename: 'dawes_pearson_2020_cognitive_profile_multisensory_aphantasia.pdf',
        title: 'A cognitive profile of multi-sensory imagery, memory and dreaming in aphantasia',
        authors: ['Alexei J. Dawes', 'Rebecca Keogh', 'Thomas Andrillon', 'Joel Pearson'],
        year: 2020,
        identifier: '10.1038/s41598-020-65705-7',
      },
      {
        filename: 'boere_krigolson_2025_eeg_neural_processing_aphantasia.pdf',
        title: 'Task evoked EEG reveals neural processing differences in aphantasia',
        authors: [
          'K. Boere',
          'R. Krempel',
          'E. Walsh',
          'H. Li',
          'L. McLaughlin',
          'O. E. Krigolson',
          'A. Blomkvist',
        ],
        year: 2025,
        identifier: '10.1038/s41598-025-27735-x',
      },
      {
        filename: 'duch_2021_imagery_agnosia_aphantasia_phenomenology.pdf',
        title: 'Imagery agnosia and its phenomenology',
        authors: ['Włodzisław Duch'],
        year: 2021,
        identifier: 'arXiv:2112.10882',
      },
      {
        filename: 'yarkoni_braver_2009_trial_by_trial_rt_variability_fmri.pdf',
        title:
          'BOLD correlates of trial-by-trial reaction time variability in gray and white matter: a multi-study fMRI analysis',
        authors: [
          'Tal Yarkoni',
          'Deanna M. Barch',
          'Jeremy R. Gray',
          'Thomas E. Conturo',
          'Todd S. Braver',
        ],
        year: 2009,
        identifier: '10.1371/journal.pone.0004257',
      },
      {
        filename: 'garrido_perez_2025_active_inference_drift_diffusion_effort.pdf',
        title:
          'Cognitive Effort in the Two-Step Task: An Active Inference Drift-Diffusion Model Approach',
        authors: [
          'Alvaro Garrido Perez',
          'Viktor Lemoine',
          'Amrapali Pednekar',
          'Maarten Rood',
          'Olga Kulagina',
        ],
        year: 2025,
        identifier: 'arXiv:2508.04435',
      },
      {
        filename: 'zhong_tsodyks_2024_synaptic_theory_chunking_working_memory.pdf',
        title: 'Synaptic Theory of Chunking in Working Memory',
        authors: ['Weishun Zhong', 'Mikhail Katkov', 'Misha Tsodyks'],
        year: 2024,
        identifier: 'arXiv:2408.07637',
      },
    ],
  },
];

export const INITIAL_SHADOW_CALIBRATION_MATRIX: ShadowCalibrationRow[] = [
  {
    question_id: 13,
    short_name: '20+ Open Browser Tabs ("Cozy Library")',
    prompt_snippet:
      'Having 20+ open browser tabs or saved links feels more like a cozy library of possibilities than clutter...',
    target_domain: 'C',
    target_probe: 'Salience Split (ΔC_salience)',
    anchor_weight: 0.0,
    r_with_anchor_domain: -0.61,
    r_with_epistemic_probe: 0.64,
    r_with_mind_moment: 'Still Water RT CV (r = +0.49)',
    sample_n: 340,
    promotion_readiness: 'Calibrating (Shadow w=0)',
    hypothesis:
      'Bypasses evaluative shame around "messiness" to measure exploratory open-loop foraging vs. closure.',
  },
  {
    question_id: 14,
    short_name: 'Exclamation / "haha" Text Cushion',
    prompt_snippet:
      "When sending a short text like 'Sounds good', I often add an exclamation point, emoji, or 'haha'...",
    target_domain: 'A',
    target_probe: 'Compensatory Masking (M_cost)',
    anchor_weight: 0.0,
    r_with_anchor_domain: 0.58,
    r_with_epistemic_probe: 0.44,
    r_with_mind_moment: 'Inner Canvas Voice Stream (r = +0.37)',
    sample_n: 340,
    promotion_readiness: 'Calibrating (Shadow w=0)',
    hypothesis:
      'Captures micro-pragmatic interpersonal cushioning and affiliative error-prevention without asking "Are you polite?".',
  },
  {
    question_id: 15,
    short_name: 'Canceled Social Plans Relief Wave',
    prompt_snippet:
      'When a social plan I genuinely wanted to go to gets canceled at the last minute, my first physical reaction is relief...',
    target_domain: 'E',
    target_probe: 'Acoustic Stream Split (ΔE_sensory)',
    anchor_weight: 0.0,
    r_with_anchor_domain: -0.63,
    r_with_epistemic_probe: 0.59,
    r_with_mind_moment: 'Night Sky Constellation Precision (r = +0.41)',
    sample_n: 340,
    promotion_readiness: 'Ready for Anchor Promotion',
    hypothesis:
      'Cleanly separates genuine social warmth ("wanted to go") from autonomic state-transition & sensory cost.',
  },
];

export const INITIAL_STUDIO_FLOWS: StudioFlow[] = [
  {
    id: 'core_calm_12',
    name: 'Core Calm Reflection (12 Anchors)',
    description:
      'The production 12-question blind epistemic reflection bank paired with the 3 interactive Mind Moments.',
    is_active: true,
    question_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    branches: [],
    include_mind_moments: true,
    created_by: 'Conner & Kae',
    updated_at: '2026-10-25',
  },
  {
    id: 'sneaky_habits_15',
    name: 'Sneaky Behavioral Habits Experiment (15 Items)',
    description:
      'Includes the 12 core calibrated anchors plus the 3 disarming everyday habit shadow probes (#13 Browser Tabs, #14 Text Cushion, #15 Canceled Plans) at weight w=0 for live SAPA calibration.',
    is_active: false,
    question_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    branches: [],
    include_mind_moments: true,
    created_by: 'Kae (Lab Experiment)',
    updated_at: '2026-10-25',
  },
  {
    id: 'kae_adaptive_branching',
    name: "Kae's Adaptive Branching Flow",
    description:
      'Dynamically routes users into targeted Sneaky Shadow probes (#13, #14, #15) when their answers on Q3 (Salience Focus), Q5 (Shared Spaces), or Q7 (Connection & Care) cross >= 4.',
    is_active: false,
    question_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    branches: [
      {
        id: 'br_salience_tabs',
        if_question_id: 3,
        operator: '>=',
        threshold: 4,
        then_goto_question_id: 13,
        rationale:
          'If user reports high curiosity-vs-errand split (Q3 >= 4), immediately probe ecological open-loop browser tabs (#13).',
      },
      {
        id: 'br_sensory_plans',
        if_question_id: 5,
        operator: '>=',
        threshold: 4,
        then_goto_question_id: 15,
        rationale:
          'If user reports two-conversation acoustic saturation (Q5 >= 4), branch to canceled-plan relief wave (#15) to decouple transition cost from social warmth.',
      },
      {
        id: 'br_warmth_text',
        if_question_id: 7,
        operator: '>=',
        threshold: 4,
        then_goto_question_id: 14,
        rationale:
          'If user prioritizes mutual emotional resonance (Q7 >= 4), probe digital text-message tone cushioning (#14).',
      },
    ],
    include_mind_moments: true,
    created_by: 'Kae & Conner Studio',
    updated_at: '2026-10-25',
  },
];

export const AURA_SCIENCE_BUNDLE = {
  cortical_schema: {
    schema_version: '2.0.0',
    framework_name: 'Aura Neuro-Computational & Cybernetic Trait Architecture',
    description:
      "Separates 4D Cortical Inference Architecture (decade-stable cognitive priors) from Neuromodulatory Gain States (season/mood-sensitive) and DeYoung's 10 Aspects.",
    observer_manifold: {
      dimensionality: 4,
      attractor_basins: 16,
      references: [
        'Tavares et al. (2015) Neuron - Hippocampal 2D Power x Affiliation Social Map',
        'Thornton & Tamir (2017, 2020) PNAS - 3D/4D Cortical Mentalizing Space (mPFC/TPJ)',
        'DeYoung (2015) Cybernetic Big Five Theory (CB5T)',
      ],
    },
    domains: [
      {
        id: 'O' as DomainKey,
        name: 'Prior vs. Sensory Precision',
        legacy_big_five: 'Openness / Intellect',
        cortical_layer: 'cortical_invariant',
        neural_substrate:
          'Thalamocortical top-down prior precision vs. bottom-up sensory prediction error gain (ACh / NE ratio)',
        mood_susceptibility: 0.08,
      },
      {
        id: 'C' as DomainKey,
        name: 'Attractor Depth vs. Exploration Temperature',
        legacy_big_five: 'Conscientiousness',
        cortical_layer: 'hybrid_gated',
        neural_substrate:
          'Striatal D1/D2 action gating & dlPFC goal maintenance vs. high-temperature state-space foraging',
        mood_susceptibility: 0.42,
      },
      {
        id: 'E' as DomainKey,
        name: 'External Foraging vs. Internal Simulation',
        legacy_big_five: 'Extraversion',
        cortical_layer: 'neuromodulatory_gain',
        neural_substrate:
          'Mesolimbic phasic/tonic Dopamine (VTA -> Nucleus Accumbens) reward-prediction-error gain',
        mood_susceptibility: 0.48,
      },
      {
        id: 'A' as DomainKey,
        name: 'Allostatic Coupling vs. Decoupled Logic',
        legacy_big_five: 'Agreeableness',
        cortical_layer: 'cortical_invariant',
        neural_substrate:
          'Anterior Insula / ACC / Oxytocin allostatic coupling vs. decoupled algorithmic policy optimization',
        mood_susceptibility: 0.18,
      },
      {
        id: 'N' as DomainKey,
        name: 'Threat & Uncertainty Error Gain',
        legacy_big_five: 'Neuroticism / Negative Emotionality',
        cortical_layer: 'neuromodulatory_gain',
        neural_substrate:
          'Serotonergic dorsal raphe tone + Amygdala-Habenula-Insula negative prediction-error gain',
        mood_susceptibility: 0.65,
      },
    ],
  },
  masks_schema: {
    schema_version: '3.0.0',
    description:
      'Neurodevelopmental Modulatory Masks (B_wiring) with Blind Epistemic Double-Dissociation Signatures and calm, non-clinical user translations.',
    masks: INITIAL_MASKS,
  },
  item_bank_schema: {
    schema_version: '4.0.0',
    description:
      '15-Item Epistemic Blind-Inference & Shadow Calibration Bank (12 Calibrated Anchors + 3 Disarming Sneaky Behavioral Micro-Questions).',
    items: INITIAL_ITEMS,
  },
  papers_corpus: PAPERS_CORPUS,
  shadow_calibration_matrix: INITIAL_SHADOW_CALIBRATION_MATRIX,
};

declare global {
  interface Window {
    AURA_SCIENCE_BUNDLE: typeof AURA_SCIENCE_BUNDLE;
  }
}

if (typeof window !== 'undefined') {
  window.AURA_SCIENCE_BUNDLE = AURA_SCIENCE_BUNDLE;
}
