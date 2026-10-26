import {
  AttentionEngineType,
  BandwidthState,
  ChronotypePreference,
  ConfoundAdjustmentItem,
  CulturalRegionId,
  DeconfoundingSummary,
  DomainKey,
  FaithTrajectory,
  FamilyRoleNiche,
  HouseholdSpace,
  LifeTransitionState,
  ResourceCushionType,
  ScheduleAutonomy,
  SensoryThresholdType,
  SocialBatteryState,
  SocializedExpectation,
  UpbringingScript,
  UserContextProfile,
  WorkRoleBleedType,
} from '../types/aura';

export const BASELINE_STEP_SLUGS: string[] = [
  'baseline-bandwidth',
  'baseline-social-weather',
  'baseline-cultural-roots',
  'baseline-upbringing-script',
  'baseline-faith-worldview',
  'baseline-neurotype-sensory',
  'baseline-work-role-bleed',
  'baseline-daily-constraints',
];

export const CULTURAL_REGION_OPTIONS: {
  id: CulturalRegionId;
  label: string;
  commNorm: 'direct' | 'balanced' | 'high_context';
  dutyNorm: 'individual' | 'balanced' | 'collectivist';
  modestyBias: number; // scale midpoint compression
}[] = [
  {
    id: 'us_canada',
    label: 'United States / Canada',
    commNorm: 'direct',
    dutyNorm: 'individual',
    modestyBias: 0.0,
  },
  {
    id: 'uk_ireland',
    label: 'UK / Ireland',
    commNorm: 'high_context',
    dutyNorm: 'individual',
    modestyBias: 0.15,
  },
  {
    id: 'western_europe',
    label: 'Western / Central Europe (DE, NL, FR, CH)',
    commNorm: 'direct',
    dutyNorm: 'individual',
    modestyBias: 0.05,
  },
  {
    id: 'nordic_scandinavia',
    label: 'Nordic / Scandinavia (SE, NO, DK, FI)',
    commNorm: 'direct',
    dutyNorm: 'balanced',
    modestyBias: 0.22,
  },
  {
    id: 'mediterranean_southern_eu',
    label: 'Southern Europe / Mediterranean (IT, ES, GR, PT)',
    commNorm: 'balanced',
    dutyNorm: 'balanced',
    modestyBias: -0.1,
  },
  {
    id: 'eastern_europe',
    label: 'Eastern Europe / Slavic / Balkans',
    commNorm: 'direct',
    dutyNorm: 'collectivist',
    modestyBias: 0.1,
  },
  {
    id: 'latin_america',
    label: 'Latin America / Caribbean',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: -0.12,
  },
  {
    id: 'east_asia',
    label: 'East Asia (Japan, Korea, China, Taiwan)',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: 0.35,
  },
  {
    id: 'southeast_asia',
    label: 'Southeast Asia (PH, VN, TH, SG, ID, MY)',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: 0.28,
  },
  {
    id: 'south_asia',
    label: 'South Asia (India, Pakistan, Bangladesh, LK)',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: 0.2,
  },
  {
    id: 'middle_east_north_africa',
    label: 'Middle East / North Africa (MENA)',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: 0.08,
  },
  {
    id: 'sub_saharan_africa',
    label: 'Sub-Saharan Africa',
    commNorm: 'balanced',
    dutyNorm: 'collectivist',
    modestyBias: 0.05,
  },
  {
    id: 'australia_nz',
    label: 'Australia / New Zealand',
    commNorm: 'direct',
    dutyNorm: 'individual',
    modestyBias: 0.12,
  },
  {
    id: 'multicultural_immigrant',
    label: 'Multicultural / Immigrant Household (Cross-Cultural)',
    commNorm: 'high_context',
    dutyNorm: 'collectivist',
    modestyBias: 0.15,
  },
];

export const BANDWIDTH_OPTIONS: {
  id: BandwidthState;
  title: string;
  desc: string;
}[] = [
  {
    id: 'rested_spacious',
    title: 'Rested & Spacious',
    desc: 'Clear head, unhurried pace, plenty of mental bandwidth',
  },
  {
    id: 'steady_engaged',
    title: 'Steady & Engaged',
    desc: 'Normal full plate, feeling balanced and capable',
  },
  {
    id: 'stretched_thin',
    title: 'Stretched Thin',
    desc: 'Juggling heavy demands, mentally tired by evening',
  },
  {
    id: 'high_pressure_sprint',
    title: 'High-Pressure Sprint',
    desc: 'Wired and pushing hard through urgent deadlines',
  },
  {
    id: 'running_on_fumes',
    title: 'Running on Fumes',
    desc: 'Deeply exhausted or burned out right now',
  },
];

export const LIFE_TRANSITION_PILLS: {
  id: LifeTransitionState;
  label: string;
}[] = [
  { id: 'steady_chapter', label: 'Steady chapter' },
  { id: 'new_parent_caregiving', label: 'New child / caregiving' },
  { id: 'career_or_move_shift', label: 'Major career / move shift' },
  { id: 'breakup_or_grief', label: 'Breakup / grief' },
  { id: 'health_sleep_recovery', label: 'Health / sleep recovery' },
];

export const SOCIAL_BATTERY_OPTIONS: {
  id: SocialBatteryState;
  title: string;
  desc: string;
}[] = [
  {
    id: 'warm_outward',
    title: 'Warm & Outward',
    desc: 'Recharged and genuinely looking for connection or company',
  },
  {
    id: 'calm_even',
    title: 'Calm & Even',
    desc: 'Steady baseline — open to people or quiet time alike',
  },
  {
    id: 'peopled_out',
    title: 'Peopled-Out',
    desc: 'Had plenty of interaction lately; craving quiet recovery',
  },
  {
    id: 'restless_overstimulated',
    title: 'Restless & Overstimulated',
    desc: 'Sensory or mental noise feels high today',
  },
  {
    id: 'heavy_self_critical',
    title: 'Heavy or Self-Critical',
    desc: 'Carrying some weight, worry, or self-doubt right now',
  },
];

export const CHRONOTYPE_PILLS: {
  id: ChronotypePreference;
  label: string;
}[] = [
  { id: 'morning_lark', label: '☀️ Morning Lark (Early Peak)' },
  { id: 'midday_flexible', label: '🌤️ Midday Rhythm' },
  { id: 'night_owl', label: '🌙 Night Owl (Evening Peak)' },
];

export const SOCIALIZED_EXPECTATION_PILLS: {
  id: SocializedExpectation;
  label: string;
}[] = [
  {
    id: 'accommodating_caretaker',
    label: 'Warm, accommodating & caretaker-first',
  },
  {
    id: 'stoic_self_reliant',
    label: 'Stoic, unshakeable & self-reliant',
  },
  {
    id: 'egalitarian_balanced',
    label: 'Balanced / egalitarian expectations',
  },
];

export const UPBRINGING_SCRIPT_OPTIONS: {
  id: UpbringingScript;
  title: string;
  desc: string;
}[] = [
  {
    id: 'direct_autonomy',
    title: 'Speak Plainly & Follow Your Spark',
    desc: 'Direct disagreement was normal; personal autonomy came first',
  },
  {
    id: 'warm_expressive',
    title: 'Warm Expressiveness & Shared Belonging',
    desc: 'Big emotions, close-knit warmth, and showing up for everyone',
  },
  {
    id: 'harmony_face',
    title: 'Protect Harmony & Save Face',
    desc: 'High-context politeness, reading between the lines, avoiding blunt conflict',
  },
  {
    id: 'high_duty_standards',
    title: 'High Family Duty & Unforgiving Standards',
    desc: 'Excellence, filial obligation, and strict self-discipline were expected',
  },
  {
    id: 'quiet_self_reliance',
    title: 'Quiet Self-Reliance & Private Space',
    desc: 'Stoic independence, modesty, and not imposing on others',
  },
];

export const FAMILY_ROLE_PILLS: {
  id: FamilyRoleNiche;
  label: string;
}[] = [
  { id: 'eldest_responsible', label: 'Responsible Eldest / Anchor' },
  { id: 'family_peacekeeper', label: 'Family Peacekeeper / Mediator' },
  { id: 'independent_middle', label: 'Independent Middle' },
  { id: 'free_youngest', label: 'Free Youngest / Explorer' },
  { id: 'only_child_solo', label: 'Only Child / Solo' },
];

export const FAITH_TRAJECTORY_OPTIONS: {
  id: FaithTrajectory;
  title: string;
  desc: string;
}[] = [
  {
    id: 'secular_practical',
    title: 'Secular / Non-Religious Path',
    desc: 'Grew up and live with a secular, practical, or scientific lens',
  },
  {
    id: 'cultural_tradition',
    title: 'Cultural & Holiday Tradition',
    desc: 'Connected to heritage and community traditions without strict dogma',
  },
  {
    id: 'personal_spiritual',
    title: 'Personal Spirituality & Contemplation',
    desc: 'Guided by inner meaning, mindfulness, or nature rather than institutions',
  },
  {
    id: 'active_observant_faith',
    title: 'Active & Observant Faith Community',
    desc: 'Faith, prayer, and moral commitment actively anchor my daily life',
  },
  {
    id: 'strict_to_independent',
    title: 'Raised Strict Religious → Now Independent',
    desc: 'Grew up in a devout/strict faith and later stepped away or deconstructed',
  },
];

export const ATTENTION_ENGINE_OPTIONS: {
  id: AttentionEngineType;
  title: string;
  desc: string;
}[] = [
  {
    id: 'linear_checklist',
    title: 'Steady Linear Checklist',
    desc: 'I naturally work step-by-step from start to finish even on routine tasks',
  },
  {
    id: 'interest_hyperfocus',
    title: 'Interest-Driven Hyperfocus (Spark Engine)',
    desc: 'Laser-focused for hours when fascinated or urgent; friction on boring admin',
  },
  {
    id: 'deep_systemizer',
    title: 'Deep Systemizer & Pattern Precision',
    desc: 'I thrive on clear structure, predictable routines, and exact logical accuracy',
  },
  {
    id: 'nonlinear_explorer',
    title: 'Nonlinear Multi-Threaded Explorer',
    desc: 'I jump between parallel tabs and projects to keep momentum alive',
  },
  {
    id: 'flexible_switcher',
    title: 'Flexible Context-Switcher',
    desc: 'I adapt smoothly between structured execution and open-ended exploration',
  },
];

export const SENSORY_THRESHOLD_PILLS: {
  id: SensoryThresholdType;
  label: string;
}[] = [
  { id: 'lively_bustle', label: 'Energized by lively bustle' },
  { id: 'moderate_sensory', label: 'Moderate sensory threshold' },
  { id: 'noise_crowd_sensitive', label: 'Sensitive to loud noise / harsh light' },
];

export const WORK_ROLE_BLEED_OPTIONS: {
  id: WorkRoleBleedType;
  title: string;
  desc: string;
}[] = [
  {
    id: 'people_empathy_heavy',
    title: 'Constant People, Empathy & Social Performance',
    desc: 'Teaching, care, sales, leadership, or service — drains social battery by 6pm',
  },
  {
    id: 'risk_flaw_vigilance',
    title: 'Spotting Risks, Flaws & Worst-Case Scenarios',
    desc: 'Law, medicine, engineering, finance, or QA — trains constant critical vigilance',
  },
  {
    id: 'strict_ops_deadlines',
    title: 'Strict Deadlines, Checklists & Operational Order',
    desc: 'Operations, admin, or logistics — enforces structure all day long',
  },
  {
    id: 'creative_research',
    title: 'Open-Ended Creative or Research Exploration',
    desc: 'Design, writing, science, or strategy — rewards novelty and synthesis',
  },
  {
    id: 'natural_match',
    title: 'No Heavy Work Mask',
    desc: 'My daily role closely matches my natural off-the-clock temperament',
  },
];

export function compute14FactorDeconfounding(
  ctx?: Partial<UserContextProfile> | null,
  responses?: Record<string | number, number>
): DeconfoundingSummary {
  const domain_deltas: Record<DomainKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const aspect_deltas: Record<string, number> = {};
  const active_adjustments: ConfoundAdjustmentItem[] = [];

  if (!ctx) {
    return {
      domain_deltas,
      aspect_deltas,
      bicultural_active: false,
      scale_bias_note: 'Standard calibration',
      active_adjustments,
    };
  }

  // 1. Confound #1 & #13: Transient Bandwidth & Major Life Transition
  if (ctx.bandwidthState === 'running_on_fumes' || ctx.bandwidthState === 'stretched_thin') {
    const boostC = ctx.bandwidthState === 'running_on_fumes' ? 11 : 7;
    const dropN = ctx.bandwidthState === 'running_on_fumes' ? -10 : -6;
    domain_deltas.C += boostC;
    domain_deltas.N += dropN;
    aspect_deltas.C_industriousness = (aspect_deltas.C_industriousness || 0) + boostC;
    aspect_deltas.N_withdrawal = (aspect_deltas.N_withdrawal || 0) + dropN;
    active_adjustments.push({
      id: 'state_bandwidth',
      category: '1. Transient Bandwidth',
      label:
        ctx.bandwidthState === 'running_on_fumes'
          ? 'Burnout / Exhaustion De-Confounder'
          : 'Stretched-Thin Bandwidth Offset',
      domain: 'C',
      delta_pct: boostC,
      explanation: `Restored +${boostC}% to Conscientiousness and ${dropN}% to Stress Reactivity so current week exhaustion isn't misread as low lifelong drive.`,
    });
  } else if (ctx.bandwidthState === 'high_pressure_sprint') {
    domain_deltas.N -= 7;
    active_adjustments.push({
      id: 'state_sprint',
      category: '1. Transient Bandwidth',
      label: 'Acute Deadline Sprint Offset',
      domain: 'N',
      delta_pct: -7,
      explanation: 'Separated acute deadline adrenaline (-7% N) from baseline emotional volatility.',
    });
  }

  if (ctx.lifeTransition && ctx.lifeTransition !== 'steady_chapter') {
    domain_deltas.N -= 8;
    domain_deltas.C += 5;
    active_adjustments.push({
      id: 'life_transition',
      category: '13. Life Transition Shock',
      label: `Active Transition (${ctx.lifeTransition.replace(/_/g, ' ')})`,
      domain: 'N',
      delta_pct: -8,
      explanation:
        'Stabilized trait baseline against temporary life-transition turbulence (-8% N, +5% C).',
    });
  }

  // 2. Confound #2 & #9: Social Battery / Mood Halo & Biological Chronotype
  if (ctx.socialBatteryState === 'peopled_out') {
    domain_deltas.E += 10;
    aspect_deltas.E_enthusiasm = (aspect_deltas.E_enthusiasm || 0) + 11;
    active_adjustments.push({
      id: 'social_peopled_out',
      category: '2. Social Battery',
      label: 'Peopled-Out Recovery De-Confounder',
      domain: 'E',
      delta_pct: 10,
      explanation:
        'Restored +10% Extraversion so an empty social battery today is not mistaken for lifelong Introversion.',
    });
  } else if (ctx.socialBatteryState === 'heavy_self_critical') {
    domain_deltas.N -= 9;
    domain_deltas.C += 5;
    active_adjustments.push({
      id: 'mood_halo_heavy',
      category: '2. Mood Halo',
      label: 'Self-Critical Mood Halo Correction',
      domain: 'N',
      delta_pct: -9,
      explanation:
        'Removed temporary self-critical mood halo (-9% N, +5% C) across self-evaluative items.',
    });
  }

  if (ctx.chronotype === 'night_owl') {
    domain_deltas.C += 6;
    aspect_deltas.C_industriousness = (aspect_deltas.C_industriousness || 0) + 7;
    active_adjustments.push({
      id: 'chronotype_owl',
      category: '9. Circadian Chronotype',
      label: 'Night-Owl Circadian De-Confounder',
      domain: 'C',
      delta_pct: 6,
      explanation:
        'Removed morning-lark bias (+6% C) from task-initiation items for an evening-peak circadian rhythm.',
    });
  }

  // 3. Confound #3 & #11: Cultural Roots, Bicultural Code-Switching & Socialized Expectations
  const raisedObj = CULTURAL_REGION_OPTIONS.find((r) => r.id === ctx.countryRaised);
  const bicultural_active = Boolean(
    (ctx.countryRaised &&
      ctx.countryCurrent &&
      ctx.countryRaised !== ctx.countryCurrent) ||
      ctx.countryRaised === 'multicultural_immigrant'
  );

  if (bicultural_active) {
    domain_deltas.O += 6;
    aspect_deltas.O_openness = (aspect_deltas.O_openness || 0) + 6;
    active_adjustments.push({
      id: 'bicultural_switch',
      category: '3. Bicultural Lens',
      label: 'Bicultural Code-Switching Calibration',
      domain: 'O',
      delta_pct: 6,
      explanation:
        'Accounted for navigating two distinct cultural scripts between upbringing and current home (+6% perspective flexibility).',
    });
  }

  if (raisedObj?.commNorm === 'high_context' || ctx.upbringingScript === 'harmony_face') {
    domain_deltas.E += 8;
    aspect_deltas.E_assertiveness = (aspect_deltas.E_assertiveness || 0) + 11;
    active_adjustments.push({
      id: 'culture_high_context',
      category: '4. Cultural Script',
      label: 'High-Context / Harmony Script De-Confounder',
      domain: 'E',
      delta_pct: 8,
      explanation:
        'Restored +11% Assertiveness (+8% E) so diplomatic, face-saving cultural norms are not misread as passivity.',
    });
  }

  if (ctx.upbringingScript === 'high_duty_standards') {
    domain_deltas.N -= 7;
    active_adjustments.push({
      id: 'culture_filial_duty',
      category: '4. Upbringing Script',
      label: 'Filial Duty & High-Standards Calibration',
      domain: 'N',
      delta_pct: -7,
      explanation:
        'Separated cultural/family humility and high self-standards (-7% N) from anxious emotional instability.',
    });
  } else if (
    ctx.upbringingScript === 'quiet_self_reliance' ||
    ctx.countryRaised === 'nordic_scandinavia'
  ) {
    domain_deltas.A += 6;
    domain_deltas.E += 6;
    active_adjustments.push({
      id: 'culture_privacy_norm',
      category: '3. Cultural Script',
      label: 'Reserved Privacy Norm Calibration',
      domain: 'A',
      delta_pct: 6,
      explanation:
        'Separated cultural respect for private space (+6% A, +6% E) from social coldness or withdrawal.',
    });
  }

  if (ctx.socializedExpectation === 'accommodating_caretaker') {
    aspect_deltas.E_assertiveness = (aspect_deltas.E_assertiveness || 0) + 7;
    domain_deltas.A -= 4;
    active_adjustments.push({
      id: 'gender_caretaker_tax',
      category: '11. Socialized Expectations',
      label: 'Caretaker / Accommodation Expectation Offset',
      domain: 'A',
      delta_pct: -4,
      explanation:
        'Accounted for socialized caretaking expectations (+7% true Assertiveness, -4% obligatory Politeness mask).',
    });
  } else if (ctx.socializedExpectation === 'stoic_self_reliant') {
    domain_deltas.A += 6;
    aspect_deltas.A_compassion = (aspect_deltas.A_compassion || 0) + 8;
    active_adjustments.push({
      id: 'gender_stoic_tax',
      category: '11. Socialized Expectations',
      label: 'Stoic Socialization De-Confounder',
      domain: 'A',
      delta_pct: 6,
      explanation:
        'Restored +8% Compassion (+6% A) suppressed by stoic emotional-restraint socialization.',
    });
  }

  // 4. Confound #12: Childhood Family Role / Birth Order Niche
  if (ctx.familyRole === 'eldest_responsible') {
    domain_deltas.C -= 5;
    domain_deltas.O += 5;
    active_adjustments.push({
      id: 'family_eldest',
      category: '12. Family Role Niche',
      label: 'Parentified / Responsible Eldest De-Confounder',
      domain: 'C',
      delta_pct: -5,
      explanation:
        'Separated learned eldest-child over-functioning (-5% obligatory C, +5% natural O) from intrinsic temperament.',
    });
  } else if (ctx.familyRole === 'family_peacekeeper') {
    domain_deltas.N -= 6;
    domain_deltas.A -= 5;
    active_adjustments.push({
      id: 'family_peacekeeper',
      category: '12. Family Role Niche',
      label: 'Family Mediator / Peacekeeper De-Confounder',
      domain: 'N',
      delta_pct: -6,
      explanation:
        'Separated learned childhood room-scanning and conflict mediation (-6% N, -5% obligatory A) from core traits.',
    });
  }

  // 5. Confound #5: Faith, Spirituality & Worldview Trajectory
  if (ctx.faithTrajectory === 'active_observant_faith') {
    domain_deltas.O += 9;
    domain_deltas.N -= 6;
    aspect_deltas.O_openness = (aspect_deltas.O_openness || 0) + 9;
    active_adjustments.push({
      id: 'faith_observant',
      category: '5. Faith & Worldview',
      label: 'Observant Faith & Moral Conscience Calibration',
      domain: 'O',
      delta_pct: 9,
      explanation:
        'Removed secular bias from Openness (+9% O) and separated religious moral examination (-6% N) from clinical anxiety.',
    });
  } else if (ctx.faithTrajectory === 'strict_to_independent') {
    domain_deltas.O += 8;
    domain_deltas.N -= 8;
    aspect_deltas.O_intellect = (aspect_deltas.O_intellect || 0) + 10;
    active_adjustments.push({
      id: 'faith_deconstructed',
      category: '5. Faith Trajectory',
      label: 'Post-Religious Deconstruction Calibration',
      domain: 'O',
      delta_pct: 8,
      explanation:
        'Accounted for residual strict-upbringing guilt reflexes (-8% N) and independent authority-questioning (+10% Intellect).',
    });
  } else if (ctx.faithTrajectory === 'personal_spiritual') {
    aspect_deltas.O_openness = (aspect_deltas.O_openness || 0) + 6;
  }

  // 6. Confound #8: Neurotype, Attention Engine & Sensory Processing
  if (ctx.attentionEngine === 'interest_hyperfocus' || ctx.attentionEngine === 'nonlinear_explorer') {
    domain_deltas.C += 12;
    aspect_deltas.C_industriousness = (aspect_deltas.C_industriousness || 0) + 15;
    domain_deltas.O += 6;
    active_adjustments.push({
      id: 'neuro_spark_engine',
      category: '8. Neurotype & Focus',
      label: 'Interest-Based Spark Engine De-Confounder',
      domain: 'C',
      delta_pct: 12,
      explanation:
        'Separated routine-admin friction from true salience-locked drive (+15% Industriousness when fascinated).',
    });
  } else if (ctx.attentionEngine === 'deep_systemizer') {
    domain_deltas.A += 7;
    aspect_deltas.O_intellect = (aspect_deltas.O_intellect || 0) + 8;
    active_adjustments.push({
      id: 'neuro_systemizer',
      category: '8. Neurotype & Focus',
      label: 'Systemizing Precision De-Confounder',
      domain: 'A',
      delta_pct: 7,
      explanation:
        'Separated direct literal precision (+7% A) from interpersonal coldness.',
    });
  }

  if (ctx.sensoryThreshold === 'noise_crowd_sensitive') {
    domain_deltas.E += 9;
    domain_deltas.N -= 7;
    active_adjustments.push({
      id: 'sensory_gain_high',
      category: '8. Sensory Threshold',
      label: 'High Sensory Gain / Crowd-Noise De-Confounder',
      domain: 'E',
      delta_pct: 9,
      explanation:
        'Separated acoustic/visual overstimulation in loud rooms (+9% dyadic E, -7% N) from social dislike.',
    });
  }

  // 7. Confound #10: Occupational Role Bleed ("9-to-5 Work Persona")
  if (ctx.workRoleBleed === 'people_empathy_heavy') {
    domain_deltas.E += 8;
    domain_deltas.A -= 4;
    active_adjustments.push({
      id: 'work_people_hangover',
      category: '10. Occupational Role Bleed',
      label: 'People-Intensive Work Hangover Offset',
      domain: 'E',
      delta_pct: 8,
      explanation:
        'Accounted for 9-to-5 empathy/social exhaustion (+8% natural E restored after hours).',
    });
  } else if (ctx.workRoleBleed === 'risk_flaw_vigilance') {
    domain_deltas.N -= 8;
    domain_deltas.A += 6;
    active_adjustments.push({
      id: 'work_risk_vigilance',
      category: '10. Occupational Role Bleed',
      label: 'Occupational Risk-Spotting De-Confounder',
      domain: 'N',
      delta_pct: -8,
      explanation:
        'Subtracted professional flaw-spotting and worst-case training (-8% N, +6% A) from off-the-clock temperament.',
    });
  } else if (ctx.workRoleBleed === 'strict_ops_deadlines') {
    domain_deltas.C -= 5;
    domain_deltas.O += 5;
    active_adjustments.push({
      id: 'work_strict_ops',
      category: '10. Occupational Role Bleed',
      label: 'Operational Structure Role Offset',
      domain: 'C',
      delta_pct: -5,
      explanation:
        'Separated job-enforced checklist habits (-5% C, +5% O) from natural personal rhythm.',
    });
  }

  // 8. Confounds #6 & #14: Schedule Autonomy, Household Space, Resource Cushion & Age Cohort
  if (ctx.scheduleAutonomy === 'shift_or_demand_bound') {
    domain_deltas.C += 7;
    active_adjustments.push({
      id: 'constraint_schedule',
      category: '6. Schedule Autonomy',
      label: 'Shift / External Schedule Constraint Offset',
      domain: 'C',
      delta_pct: 7,
      explanation:
        'Removed white-collar schedule-autonomy bias (+7% C) for shift/demand-locked daily schedules.',
    });
  }

  if (ctx.householdSpace === 'family_kids_care') {
    aspect_deltas.C_orderliness = (aspect_deltas.C_orderliness || 0) + 8;
    domain_deltas.E += 5;
    active_adjustments.push({
      id: 'constraint_household',
      category: '6. Household Environment',
      label: 'Shared Family / Caregiving Space Offset',
      domain: 'C',
      delta_pct: 6,
      explanation:
        'Separated shared family/kid household clutter and quiet-time needs (+8% Orderliness, +5% E) from personal traits.',
    });
  }

  if (ctx.resourceCushion === 'outsourced_support') {
    domain_deltas.C -= 6;
    aspect_deltas.C_orderliness = (aspect_deltas.C_orderliness || 0) - 8;
    active_adjustments.push({
      id: 'cushion_outsourced',
      category: '14. Resource Cushion',
      label: 'Outsourced Domestic/Admin Support Adjustment',
      domain: 'C',
      delta_pct: -6,
      explanation:
        'Adjusted for delegated/outsourced tidiness and scheduling (-8% raw Orderliness halo).',
    });
  } else if (ctx.resourceCushion === 'tight_scarcity_load') {
    domain_deltas.C += 8;
    domain_deltas.N -= 7;
    active_adjustments.push({
      id: 'cushion_scarcity_tax',
      category: '14. Scarcity Bandwidth Tax',
      label: 'Resource & Time-Scarcity Bandwidth De-Confounder',
      domain: 'C',
      delta_pct: 8,
      explanation:
        'Removed financial/time scarcity bandwidth tax (+8% C, -7% N; Mullainathan & Shafir, 2013).',
    });
  }

  if (ctx.ageBand === '18_24') {
    domain_deltas.C += 6;
    domain_deltas.N -= 5;
    active_adjustments.push({
      id: 'age_cohort_18_24',
      category: '6. Age Cohort Norming',
      label: '18–24 Developmental Cohort Calibration',
      domain: 'C',
      delta_pct: 6,
      explanation:
        'Normed against 18–24 developmental cohort (Soto et al., 2011 Maturity Principle: +6% C, -5% N).',
    });
  } else if (ctx.ageBand === '60_plus') {
    domain_deltas.E += 5;
    domain_deltas.O += 4;
    active_adjustments.push({
      id: 'age_cohort_60_plus',
      category: '6. Age Cohort Norming',
      label: '60+Selective Social & Depth Cohort Calibration',
      domain: 'E',
      delta_pct: 5,
      explanation:
        'Normed against 60+ selective social-investment cohort (+5% E, +4% O).',
    });
  }

  // 9. Confound #7: Within-Person Scale-Usage Normalization (Modesty vs. Extreme Responding)
  let scale_bias_note = 'Balanced 1–5 scale usage';
  if (responses && Object.keys(responses).length >= 4) {
    const vals = Object.values(responses)
      .map(Number)
      .filter((v) => !Number.isNaN(v) && v >= 1 && v <= 5);
    if (vals.length >= 4) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      const sd = Math.sqrt(variance);
      if (sd <= 0.95) {
        scale_bias_note = `Modest / Midpoint Scale Responder (SD=${sd.toFixed(2)}) — auto-expanded`;
      } else if (sd >= 1.65) {
        scale_bias_note = `High-Contrast / Extreme Scale Responder (SD=${sd.toFixed(2)}) — auto-tempered`;
      } else {
        scale_bias_note = `Calibrated Within-Person Scale Spread (SD=${sd.toFixed(2)})`;
      }
    }
  }

  // Clamp domain deltas to a clean [-22, +22] range
  (['O', 'C', 'E', 'A', 'N'] as DomainKey[]).forEach((d) => {
    domain_deltas[d] = Math.max(-22, Math.min(22, Math.round(domain_deltas[d])));
  });

  return {
    domain_deltas,
    aspect_deltas,
    bicultural_active,
    scale_bias_note,
    active_adjustments,
  };
}
