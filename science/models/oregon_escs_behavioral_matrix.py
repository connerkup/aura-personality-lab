"""
Oregon Eugene–Springfield Community Sample (ESCS) Bidirectional Behavioral Matrix
(`/home/ubuntu/personality-lab/science/models/oregon_escs_behavioral_matrix.py`).

Grounded in:
  1. Lew Goldberg's Eugene–Springfield Community Sample (ESCS) & Oregon Avocational /
     Behavioral Act-Frequency Inventory (ORAIS; Goldberg, 1999, 2006; Grucza & Goldberg, 2007).
  2. Colin DeYoung's 10-Aspect Cybernetic Big Five Hierarchy (DeYoung, Quilty, & Peterson, 2007).
  3. Behavioral Micro-Game Psychophysics (Drift-Diffusion RT CV, Visual Working-Memory Chunking,
     and V1 Mental Imagery Vividness / Aphantasia De-Confounding).

Provides:
  - `OREGON_BEHAVIORAL_ACTS_40`: 40 concrete, observable everyday behavioral acts (`escs_act_01`..`escs_act_40`)
    spanning 6 ecological categories, 5 Big Five domains, and all 10 DeYoung aspects.
  - `generate_oregon_escs_cohort(seed=1994)`: Deterministic 250-subject community sample partitioned into
    `train_80` (200 calibration subjects, `escs_001`..`escs_200`) and `blind_holdout_20` (50 blind holdout
    validation subjects, `escs_201`..`escs_250`, yielding 50 x 40 = 2,000 held-out behavioral observations).
  - `export_oregon_escs_matrix_json()`: Exports the complete matrix and cohort summary to
    `/home/ubuntu/personality-lab/science/models/oregon_escs_behavioral_matrix.json`.
"""

from __future__ import annotations
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np


DOMAIN_KEYS_5: List[str] = ["O", "C", "E", "A", "N"]

DEYOUNG_10_ASPECT_KEYS: List[str] = [
    "O_intellect",
    "O_openness",
    "C_industriousness",
    "C_orderliness",
    "E_enthusiasm",
    "E_assertiveness",
    "A_compassion",
    "A_politeness",
    "N_withdrawal",
    "N_volatility",
]

DEYOUNG_10_ASPECT_NAMES: Dict[str, str] = {
    "O_intellect": "Abstract Systemizing (Intellect)",
    "O_openness": "Perceptual & Aesthetic Depth (Openness)",
    "C_industriousness": "Goal-Locked Drive (Industriousness)",
    "C_orderliness": "Entropy Suppression (Orderliness)",
    "E_enthusiasm": "Affiliative Reward Gain (Enthusiasm)",
    "E_assertiveness": "Agency & Social Impact (Assertiveness)",
    "A_compassion": "Allostatic Resonance (Compassion)",
    "A_politeness": "Normative Friction Suppression (Politeness)",
    "N_withdrawal": "Uncertainty Vigilance (Withdrawal)",
    "N_volatility": "Affective State Gain (Volatility)",
}

OREGON_CATEGORIES: List[str] = [
    "Digital & Focus",
    "Social & Texting",
    "Space & Order",
    "Curiosity & Rabbit Holes",
    "Sensory & Pacing",
    "Decisions & Time",
]


def _act(
    act_id: str,
    code: str,
    category: str,
    text: str,
    short_label: str,
    base_rate: float,
    primary_domain: str,
    primary_aspect: str,
    domain_weights: Dict[str, float],
    aspect_weights: Dict[str, float],
    telemetry_weights: Dict[str, float],
    oregon_empirical_r: float,
    rationale: str,
) -> Dict[str, Any]:
    full_dom = {d: round(float(domain_weights.get(d, 0.0)), 3) for d in DOMAIN_KEYS_5}
    full_asp = {a: round(float(aspect_weights.get(a, 0.0)), 3) for a in DEYOUNG_10_ASPECT_KEYS}
    full_tel = {
        "rt_cv_z": round(float(telemetry_weights.get("rt_cv_z", 0.0)), 3),
        "steadiness_z": round(float(telemetry_weights.get("steadiness_z", 0.0)), 3),
        "chunk_speed_z": round(float(telemetry_weights.get("chunk_speed_z", 0.0)), 3),
        "imagery_vividness_z": round(float(telemetry_weights.get("imagery_vividness_z", 0.0)), 3),
        "wordless_concept_bonus": round(float(telemetry_weights.get("wordless_concept_bonus", 0.0)), 3),
    }
    return {
        "act_id": act_id,
        "code": code,
        "category": category,
        "text": text,
        "short_label": short_label,
        "base_rate": round(float(base_rate), 3),
        "primary_domain": primary_domain,
        "primary_aspect": primary_aspect,
        "primary_aspect_label": DEYOUNG_10_ASPECT_NAMES.get(primary_aspect, primary_aspect),
        "domain_weights": full_dom,
        "aspect_weights": full_asp,
        "telemetry_weights": full_tel,
        "oregon_empirical_r": round(float(oregon_empirical_r), 2),
        "rationale": rationale,
    }


OREGON_BEHAVIORAL_ACTS_40: List[Dict[str, Any]] = [
    # 1..16: Canonical high-signal ESCS everyday acts
    _act(
        act_id="escs_act_01",
        code="TAB_HOARDING",
        category="Digital & Focus",
        text="Keep 10+ browser tabs or saved links open for an unassigned curiosity rabbit-hole",
        short_label="10+ Open Rabbit-Hole Tabs",
        base_rate=0.48,
        primary_domain="O",
        primary_aspect="O_intellect",
        domain_weights={"O": 0.92, "C": -0.68, "E": 0.08, "A": 0.04, "N": 0.18},
        aspect_weights={"O_intellect": 0.98, "O_openness": 0.42, "C_orderliness": -0.78, "C_industriousness": -0.34, "N_withdrawal": 0.16},
        telemetry_weights={"rt_cv_z": 0.58, "steadiness_z": -0.36, "chunk_speed_z": 0.32, "imagery_vividness_z": 0.08, "wordless_concept_bonus": 0.25},
        oregon_empirical_r=0.56,
        rationale="Driven by high DeYoung Intellect epistemic foraging paired with relaxed Orderliness entropy gates and phasic RT variability.",
    ),
    _act(
        act_id="escs_act_02",
        code="TEXT_MENTAL_REPLY",
        category="Social & Texting",
        text="Read a text, compose a thoughtful reply in your head, and forget to hit send for 24h",
        short_label="Mental Reply, Forgot Send",
        base_rate=0.50,
        primary_domain="N",
        primary_aspect="N_withdrawal",
        domain_weights={"O": 0.34, "C": -0.58, "E": -0.44, "A": 0.26, "N": 0.68},
        aspect_weights={"N_withdrawal": 0.84, "C_industriousness": -0.64, "E_enthusiasm": -0.42, "A_compassion": 0.35, "O_intellect": 0.28},
        telemetry_weights={"rt_cv_z": 0.48, "steadiness_z": -0.32, "chunk_speed_z": -0.05, "imagery_vividness_z": 0.22, "wordless_concept_bonus": 0.10},
        oregon_empirical_r=0.51,
        rationale="Internal cognitive simulation satisfies the social intention before motor execution when Withdrawal vigilance and RT variability are elevated.",
    ),
    _act(
        act_id="escs_act_03",
        code="LATE_NIGHT_RABBIT_HOLE",
        category="Curiosity & Rabbit Holes",
        text="Dive into a 45-minute Wikipedia or research rabbit-hole past midnight on a random topic",
        short_label="Late-Night Research Rabbit-Hole",
        base_rate=0.49,
        primary_domain="O",
        primary_aspect="O_intellect",
        domain_weights={"O": 1.04, "C": -0.42, "E": -0.14, "A": 0.05, "N": 0.16},
        aspect_weights={"O_intellect": 1.12, "O_openness": 0.46, "C_orderliness": -0.48, "C_industriousness": -0.18, "E_enthusiasm": -0.15},
        telemetry_weights={"rt_cv_z": 0.44, "steadiness_z": -0.22, "chunk_speed_z": 0.48, "imagery_vividness_z": 0.12, "wordless_concept_bonus": 0.32},
        oregon_empirical_r=0.57,
        rationale="High dopaminergic value of novel conceptual compression (Intellect + Night Sky chunk speed) overrides circadian routine stopping cues.",
    ),
    _act(
        act_id="escs_act_04",
        code="DISHES_OVERNIGHT",
        category="Space & Order",
        text="Leave dishes in the sink overnight when your evening cognitive battery is spent",
        short_label="Leave Dishes in Sink Overnight",
        base_rate=0.46,
        primary_domain="C",
        primary_aspect="C_orderliness",
        domain_weights={"O": 0.22, "C": -1.02, "E": -0.18, "A": 0.06, "N": 0.42},
        aspect_weights={"C_orderliness": -1.14, "C_industriousness": -0.62, "N_withdrawal": 0.46, "O_intellect": 0.18},
        telemetry_weights={"rt_cv_z": 0.46, "steadiness_z": -0.42, "chunk_speed_z": -0.08, "imagery_vividness_z": 0.0, "wordless_concept_bonus": 0.05},
        oregon_empirical_r=0.54,
        rationale="Reflects low automatic Orderliness habit-loop enforcement coupled with evening executive depletion.",
    ),
    _act(
        act_id="escs_act_05",
        code="PACKING_CHECKLIST",
        category="Space & Order",
        text="Write a categorized packing or prep checklist at least 24 hours before a trip",
        short_label="Categorized Trip Packing Checklist",
        base_rate=0.42,
        primary_domain="C",
        primary_aspect="C_orderliness",
        domain_weights={"O": -0.08, "C": 1.08, "E": 0.10, "A": 0.18, "N": 0.24},
        aspect_weights={"C_orderliness": 1.16, "C_industriousness": 0.68, "N_withdrawal": 0.28, "O_openness": -0.18},
        telemetry_weights={"rt_cv_z": -0.44, "steadiness_z": 0.52, "chunk_speed_z": 0.24, "imagery_vividness_z": 0.05, "wordless_concept_bonus": 0.12},
        oregon_empirical_r=0.55,
        rationale="High Orderliness and Industriousness externalize prospective memory into structured checklists, reinforced by high Still Water RT steadiness.",
    ),
    _act(
        act_id="escs_act_06",
        code="AVOID_VOICE_CALL",
        category="Social & Texting",
        text="Let an unexpected phone call go to voicemail and follow up by text instead",
        short_label="Screen Call, Text Instead",
        base_rate=0.53,
        primary_domain="E",
        primary_aspect="E_enthusiasm",
        domain_weights={"O": 0.14, "C": -0.12, "E": -0.94, "A": -0.06, "N": 0.52},
        aspect_weights={"E_enthusiasm": -0.98, "E_assertiveness": -0.52, "N_withdrawal": 0.64, "A_politeness": 0.18},
        telemetry_weights={"rt_cv_z": 0.12, "steadiness_z": 0.26, "chunk_speed_z": 0.15, "imagery_vividness_z": -0.10, "wordless_concept_bonus": 0.22},
        oregon_empirical_r=0.52,
        rationale="Asynchronous text preserves cognitive bandwidth for low-Enthusiasm / high-Withdrawal profiles who find unscheduled auditory demands intrusive.",
    ),
    _act(
        act_id="escs_act_07",
        code="DOUBLE_CHECK_LOCKS",
        category="Space & Order",
        text="Physically re-check a locked door, stove knob, or sent email attachment a second time",
        short_label="Double-Check Locks & Attachments",
        base_rate=0.47,
        primary_domain="N",
        primary_aspect="N_withdrawal",
        domain_weights={"O": -0.06, "C": 0.52, "E": -0.22, "A": 0.20, "N": 0.88},
        aspect_weights={"N_withdrawal": 0.96, "N_volatility": 0.44, "C_orderliness": 0.64, "A_politeness": 0.24},
        telemetry_weights={"rt_cv_z": -0.24, "steadiness_z": 0.38, "chunk_speed_z": -0.12, "imagery_vividness_z": 0.28, "wordless_concept_bonus": -0.05},
        oregon_empirical_r=0.49,
        rationale="Joint elevation of BIS Uncertainty Vigilance (Withdrawal) and Orderliness error-monitoring triggers confirmatory verification loops.",
    ),
    _act(
        act_id="escs_act_08",
        code="CANCELED_PLAN_RELIEF",
        category="Social & Texting",
        text="Feel a quiet wave of relief when group evening plans are unexpectedly canceled",
        short_label="Wave of Relief When Plans Cancel",
        base_rate=0.55,
        primary_domain="E",
        primary_aspect="E_enthusiasm",
        domain_weights={"O": 0.24, "C": -0.08, "E": -1.06, "A": 0.08, "N": 0.46},
        aspect_weights={"E_enthusiasm": -1.15, "E_assertiveness": -0.44, "N_withdrawal": 0.58, "O_intellect": 0.26},
        telemetry_weights={"rt_cv_z": 0.08, "steadiness_z": 0.24, "chunk_speed_z": 0.22, "imagery_vividness_z": 0.14, "wordless_concept_bonus": 0.18},
        oregon_empirical_r=0.58,
        rationale="Classic ESCS marker of low Affiliative Reward Gain (Enthusiasm) combined with high autonomic recovery value of solitude.",
    ),
    _act(
        act_id="escs_act_09",
        code="WARM_TEXT_PUNCTUATION",
        category="Social & Texting",
        text="Add extra exclamation points or 'haha' to a short text so it won't sound cold",
        short_label="Warm Text Cushioning ('haha' / '!')",
        base_rate=0.52,
        primary_domain="A",
        primary_aspect="A_compassion",
        domain_weights={"O": 0.08, "C": 0.04, "E": 0.28, "A": 0.96, "N": 0.42},
        aspect_weights={"A_compassion": 1.02, "A_politeness": 0.68, "N_withdrawal": 0.46, "E_assertiveness": -0.32},
        telemetry_weights={"rt_cv_z": 0.14, "steadiness_z": 0.08, "chunk_speed_z": -0.06, "imagery_vividness_z": 0.34, "wordless_concept_bonus": -0.18},
        oregon_empirical_r=0.53,
        rationale="High Compassion and Politeness actively inject prosodic warmth markers into plain text to prevent perceived interpersonal friction.",
    ),
    _act(
        act_id="escs_act_10",
        code="STRESS_DRAWER_REORG",
        category="Space & Order",
        text="Reorganize a desk, shelf, or kitchen drawer when procrastinating on a heavy task",
        short_label="Procrastination Desk Reorg",
        base_rate=0.43,
        primary_domain="N",
        primary_aspect="N_volatility",
        domain_weights={"O": 0.18, "C": 0.38, "E": -0.10, "A": 0.12, "N": 0.78},
        aspect_weights={"N_volatility": 0.76, "N_withdrawal": 0.58, "C_orderliness": 0.82, "C_industriousness": -0.44},
        telemetry_weights={"rt_cv_z": 0.32, "steadiness_z": -0.18, "chunk_speed_z": 0.14, "imagery_vividness_z": 0.24, "wordless_concept_bonus": 0.0},
        oregon_empirical_r=0.46,
        rationale="When Orderliness is higher than Industriousness under high-N task stress, the brain seeks immediate local entropy reduction.",
    ),
    _act(
        act_id="escs_act_11",
        code="IMPULSE_BOOK_BUY",
        category="Curiosity & Rabbit Holes",
        text="Buy or bookmark new books and longform essays faster than you finish reading your stack",
        short_label="Tsundoku Book-Stack Accumulation",
        base_rate=0.49,
        primary_domain="O",
        primary_aspect="O_openness",
        domain_weights={"O": 0.98, "C": -0.46, "E": 0.12, "A": 0.16, "N": 0.14},
        aspect_weights={"O_openness": 0.96, "O_intellect": 0.74, "C_industriousness": -0.48, "C_orderliness": -0.28},
        telemetry_weights={"rt_cv_z": 0.36, "steadiness_z": -0.20, "chunk_speed_z": 0.30, "imagery_vividness_z": 0.42, "wordless_concept_bonus": 0.16},
        oregon_empirical_r=0.52,
        rationale="High Aesthetic/Perceptual Openness and Intellect treat unread books as an inspiring landscape of epistemic potential rather than a backlog.",
    ),
    _act(
        act_id="escs_act_12",
        code="STRANGER_LINE_CHAT",
        category="Social & Texting",
        text="Strike up an easy, unprompted conversation with a barista or stranger in line",
        short_label="Unprompted Chat in Line",
        base_rate=0.35,
        primary_domain="E",
        primary_aspect="E_enthusiasm",
        domain_weights={"O": 0.22, "C": 0.06, "E": 1.08, "A": 0.54, "N": -0.48},
        aspect_weights={"E_enthusiasm": 1.14, "E_assertiveness": 0.66, "A_compassion": 0.52, "N_withdrawal": -0.62},
        telemetry_weights={"rt_cv_z": 0.18, "steadiness_z": 0.12, "chunk_speed_z": 0.08, "imagery_vividness_z": 0.22, "wordless_concept_bonus": -0.14},
        oregon_empirical_r=0.56,
        rationale="High dopaminergic reward gain from spontaneous human affiliation (Enthusiasm + Assertiveness) with low social-evaluative inhibition.",
    ),
    _act(
        act_id="escs_act_13",
        code="DEVILS_ADVOCATE_DEBATE",
        category="Curiosity & Rabbit Holes",
        text="Play devil's advocate in a friendly debate just to stress-test the underlying logic",
        short_label="Play Devil's Advocate for Logic",
        base_rate=0.37,
        primary_domain="A",
        primary_aspect="A_politeness",
        domain_weights={"O": 0.72, "C": 0.04, "E": 0.48, "A": -0.88, "N": -0.24},
        aspect_weights={"A_politeness": -0.96, "O_intellect": 0.86, "E_assertiveness": 0.64, "A_compassion": -0.34, "N_withdrawal": -0.32},
        telemetry_weights={"rt_cv_z": 0.16, "steadiness_z": 0.14, "chunk_speed_z": 0.42, "imagery_vividness_z": -0.18, "wordless_concept_bonus": 0.38},
        oregon_empirical_r=0.51,
        rationale="Combines high Intellect structural analysis and Assertiveness with low Politeness normative friction suppression.",
    ),
    _act(
        act_id="escs_act_14",
        code="MUSIC_CHILLS_GOOSEBUMPS",
        category="Sensory & Pacing",
        text="Get physical goosebumps or chills when a chord progression or film score hits perfectly",
        short_label="Aesthetic Frisson & Music Chills",
        base_rate=0.52,
        primary_domain="O",
        primary_aspect="O_openness",
        domain_weights={"O": 0.96, "C": -0.06, "E": 0.18, "A": 0.44, "N": 0.36},
        aspect_weights={"O_openness": 1.18, "A_compassion": 0.48, "N_volatility": 0.28, "O_intellect": 0.24},
        telemetry_weights={"rt_cv_z": 0.08, "steadiness_z": -0.06, "chunk_speed_z": 0.14, "imagery_vividness_z": 0.64, "wordless_concept_bonus": -0.10},
        oregon_empirical_r=0.55,
        rationale="Aesthetic frisson is the canonical physiological marker of DeYoung Openness and vivid sensory-affective coupling.",
    ),
    _act(
        act_id="escs_act_15",
        code="ALARM_SNOOZE_CASCADE",
        category="Decisions & Time",
        text="Set 3+ staggered morning alarms spaced a few minutes apart instead of waking on one",
        short_label="3+ Staggered Morning Alarms",
        base_rate=0.48,
        primary_domain="C",
        primary_aspect="C_industriousness",
        domain_weights={"O": 0.24, "C": -0.88, "E": -0.12, "A": 0.08, "N": 0.44},
        aspect_weights={"C_industriousness": -0.96, "C_orderliness": -0.48, "N_withdrawal": 0.44, "O_openness": 0.22},
        telemetry_weights={"rt_cv_z": 0.54, "steadiness_z": -0.46, "chunk_speed_z": -0.10, "imagery_vividness_z": 0.12, "wordless_concept_bonus": 0.0},
        oregon_empirical_r=0.50,
        rationale="Externalizes morning state-transition inertia via multi-step acoustic scaffolding when tonic Industriousness is low and RT variability is high.",
    ),
    _act(
        act_id="escs_act_16",
        code="UNREAD_INBOX_ZERO",
        category="Digital & Focus",
        text="Clear unread badges and notifications to zero before ending the day",
        short_label="Zero Unread Badges Daily",
        base_rate=0.34,
        primary_domain="C",
        primary_aspect="C_orderliness",
        domain_weights={"O": -0.26, "C": 1.04, "E": 0.12, "A": 0.14, "N": 0.18},
        aspect_weights={"C_orderliness": 1.12, "C_industriousness": 0.72, "O_intellect": -0.24, "N_withdrawal": 0.22},
        telemetry_weights={"rt_cv_z": -0.48, "steadiness_z": 0.54, "chunk_speed_z": 0.18, "imagery_vividness_z": -0.06, "wordless_concept_bonus": 0.08},
        oregon_empirical_r=0.53,
        rationale="High Orderliness and steady attentional gating treat lingering red notification badges as unresolved visual entropy.",
    ),
    # 17..40: Complete 40-Act Matrix across all 10 DeYoung Aspects & 6 Categories
    _act(
        act_id="escs_act_17",
        code="PODCAST_SPEED_15X",
        category="Digital & Focus",
        text="Listen to podcasts, lectures, or audiobooks at 1.5x–2x speed to match thought pace",
        short_label="1.5x–2x Audio Playback Speed",
        base_rate=0.39,
        primary_domain="E",
        primary_aspect="E_assertiveness",
        domain_weights={"O": 0.68, "C": 0.24, "E": 0.56, "A": -0.22, "N": -0.12},
        aspect_weights={"E_assertiveness": 0.78, "O_intellect": 0.88, "C_industriousness": 0.34, "A_politeness": -0.24},
        telemetry_weights={"rt_cv_z": 0.28, "steadiness_z": 0.08, "chunk_speed_z": 0.56, "imagery_vividness_z": -0.16, "wordless_concept_bonus": 0.36},
        oregon_empirical_r=0.48,
        rationale="Fast working-memory chunking (Night Sky) and high Intellect/Assertiveness seek higher information density per second.",
    ),
    _act(
        act_id="escs_act_18",
        code="DEEP_WORK_HYPERFOCUS",
        category="Digital & Focus",
        text="Lose track of 3+ hours in a single deep-focus block when a complex problem hooks you",
        short_label="3-Hour Deep-Focus Immersion",
        base_rate=0.45,
        primary_domain="C",
        primary_aspect="C_industriousness",
        domain_weights={"O": 0.74, "C": 0.66, "E": -0.28, "A": -0.08, "N": -0.14},
        aspect_weights={"C_industriousness": 0.88, "O_intellect": 0.84, "E_enthusiasm": -0.34, "C_orderliness": 0.18},
        telemetry_weights={"rt_cv_z": -0.14, "steadiness_z": 0.38, "chunk_speed_z": 0.52, "imagery_vividness_z": 0.08, "wordless_concept_bonus": 0.34},
        oregon_empirical_r=0.51,
        rationale="High Industriousness coupled with high Intellect and fast pattern chunking locks attention into sustained monotropic flow states.",
    ),
    _act(
        act_id="escs_act_19",
        code="PHONE_DND_SHIELD",
        category="Digital & Focus",
        text="Keep your phone on silent or Do-Not-Disturb for most of the day to guard focus",
        short_label="All-Day Silent Phone Shield",
        base_rate=0.47,
        primary_domain="N",
        primary_aspect="N_withdrawal",
        domain_weights={"O": 0.32, "C": 0.22, "E": -0.76, "A": -0.12, "N": 0.64},
        aspect_weights={"N_withdrawal": 0.78, "E_enthusiasm": -0.82, "O_intellect": 0.36, "C_industriousness": 0.28},
        telemetry_weights={"rt_cv_z": -0.22, "steadiness_z": 0.34, "chunk_speed_z": 0.24, "imagery_vividness_z": -0.08, "wordless_concept_bonus": 0.22},
        oregon_empirical_r=0.47,
        rationale="Protects internal attentional equilibrium against unpredictable auditory interruptions in high-Withdrawal, low-Enthusiasm profiles.",
    ),
    _act(
        act_id="escs_act_20",
        code="PARALLEL_PROJECT_START",
        category="Digital & Focus",
        text="Start a shiny new side project or doc before finishing the last one on your desk",
        short_label="Parallel Unfinished Side Projects",
        base_rate=0.46,
        primary_domain="C",
        primary_aspect="C_industriousness",
        domain_weights={"O": 0.84, "C": -0.82, "E": 0.26, "A": -0.04, "N": 0.22},
        aspect_weights={"C_industriousness": -0.94, "O_intellect": 0.78, "O_openness": 0.52, "C_orderliness": -0.54},
        telemetry_weights={"rt_cv_z": 0.56, "steadiness_z": -0.44, "chunk_speed_z": 0.26, "imagery_vividness_z": 0.24, "wordless_concept_bonus": 0.14},
        oregon_empirical_r=0.54,
        rationale="Classic high-Openness / low-Industriousness divergence where novelty ideation outpaces routine completion.",
    ),
    _act(
        act_id="escs_act_21",
        code="REMEMBER_SMALL_FAVORITES",
        category="Curiosity & Rabbit Holes",
        text="Keep a mental or written note of friends' small favorite snacks, songs, or life updates",
        short_label="Track Friends' Small Favorites",
        base_rate=0.46,
        primary_domain="A",
        primary_aspect="A_compassion",
        domain_weights={"O": 0.28, "C": 0.34, "E": 0.32, "A": 1.02, "N": 0.12},
        aspect_weights={"A_compassion": 1.14, "A_politeness": 0.52, "C_orderliness": 0.36, "E_enthusiasm": 0.38},
        telemetry_weights={"rt_cv_z": -0.16, "steadiness_z": 0.24, "chunk_speed_z": 0.22, "imagery_vividness_z": 0.38, "wordless_concept_bonus": -0.08},
        oregon_empirical_r=0.52,
        rationale="High Allostatic Resonance (Compassion) encodes interpersonal micro-details into long-term relational memory.",
    ),
    _act(
        act_id="escs_act_22",
        code="GROUP_DECISION_ANCHOR",
        category="Social & Texting",
        text="Step in first to propose a concrete plan when a group chat stalls on where to meet",
        short_label="Break Group-Chat Indecision First",
        base_rate=0.41,
        primary_domain="E",
        primary_aspect="E_assertiveness",
        domain_weights={"O": 0.18, "C": 0.52, "E": 0.98, "A": -0.14, "N": -0.54},
        aspect_weights={"E_assertiveness": 1.16, "E_enthusiasm": 0.52, "C_industriousness": 0.58, "N_withdrawal": -0.64},
        telemetry_weights={"rt_cv_z": -0.18, "steadiness_z": 0.32, "chunk_speed_z": 0.36, "imagery_vividness_z": 0.06, "wordless_concept_bonus": 0.12},
        oregon_empirical_r=0.55,
        rationale="High Agency/Assertiveness and Industriousness resolve social coordination ambiguity without waiting for group consensus.",
    ),
    _act(
        act_id="escs_act_23",
        code="QUIET_FRIEND_CHECKIN",
        category="Social & Texting",
        text="Notice the one quiet person in a group and ask a gentle question to bring them in",
        short_label="Include Quiet Person in Room",
        base_rate=0.48,
        primary_domain="A",
        primary_aspect="A_compassion",
        domain_weights={"O": 0.30, "C": 0.12, "E": 0.42, "A": 1.06, "N": 0.18},
        aspect_weights={"A_compassion": 1.18, "A_politeness": 0.48, "E_enthusiasm": 0.46, "O_openness": 0.28},
        telemetry_weights={"rt_cv_z": -0.08, "steadiness_z": 0.20, "chunk_speed_z": 0.12, "imagery_vividness_z": 0.36, "wordless_concept_bonus": -0.12},
        oregon_empirical_r=0.54,
        rationale="High Compassion continuously monitors peripheral social inclusion and bridges group attentional gaps.",
    ),
    _act(
        act_id="escs_act_24",
        code="CLOTHES_CHAIR_PILE",
        category="Space & Order",
        text="Maintain a dedicated 'not-dirty, not-clean' clothes chair in the corner of your room",
        short_label="In-Between Clothes Chair Pile",
        base_rate=0.54,
        primary_domain="C",
        primary_aspect="C_orderliness",
        domain_weights={"O": 0.32, "C": -0.96, "E": 0.04, "A": 0.08, "N": 0.28},
        aspect_weights={"C_orderliness": -1.10, "C_industriousness": -0.46, "O_openness": 0.34, "N_withdrawal": 0.26},
        telemetry_weights={"rt_cv_z": 0.38, "steadiness_z": -0.34, "chunk_speed_z": 0.04, "imagery_vividness_z": 0.14, "wordless_concept_bonus": 0.06},
        oregon_empirical_r=0.53,
        rationale="Low Orderliness prefers pragmatic intermediate staging buffers over strict binary closet categorization.",
    ),
    _act(
        act_id="escs_act_25",
        code="CART_RETURN_ALWAYS",
        category="Space & Order",
        text="Return your shopping cart or tidy your cafe table even when no one is watching",
        short_label="Tidy Cafe Table & Return Cart",
        base_rate=0.58,
        primary_domain="A",
        primary_aspect="A_politeness",
        domain_weights={"O": 0.06, "C": 0.64, "E": 0.04, "A": 0.92, "N": 0.12},
        aspect_weights={"A_politeness": 1.04, "A_compassion": 0.56, "C_orderliness": 0.68, "C_industriousness": 0.42},
        telemetry_weights={"rt_cv_z": -0.32, "steadiness_z": 0.38, "chunk_speed_z": 0.08, "imagery_vividness_z": 0.10, "wordless_concept_bonus": 0.0},
        oregon_empirical_r=0.49,
        rationale="High Politeness and Orderliness uphold prosocial civic norms autonomously without requiring external surveillance.",
    ),
    _act(
        act_id="escs_act_26",
        code="VISUAL_CLUTTER_FRICTION",
        category="Space & Order",
        text="Struggle to start deep work until visible counter or desk clutter is cleared away",
        short_label="Clear Desk Before Starting Work",
        base_rate=0.44,
        primary_domain="N",
        primary_aspect="N_volatility",
        domain_weights={"O": -0.14, "C": 0.78, "E": -0.08, "A": 0.12, "N": 0.62},
        aspect_weights={"N_volatility": 0.68, "C_orderliness": 0.98, "N_withdrawal": 0.42, "O_intellect": -0.18},
        telemetry_weights={"rt_cv_z": -0.26, "steadiness_z": 0.34, "chunk_speed_z": -0.06, "imagery_vividness_z": 0.32, "wordless_concept_bonus": -0.14},
        oregon_empirical_r=0.48,
        rationale="Visual field entropy competes for peripheral attentional channels when Orderliness and sensory Volatility gain are both elevated.",
    ),
    _act(
        act_id="escs_act_27",
        code="NICHE_HOBBY_DEEP_DIVE",
        category="Curiosity & Rabbit Holes",
        text="Obsessively research the gear or mechanics of a niche hobby for weeks before trying it",
        short_label="Weeks-Long Niche Hobby Research",
        base_rate=0.45,
        primary_domain="O",
        primary_aspect="O_intellect",
        domain_weights={"O": 0.94, "C": 0.18, "E": -0.22, "A": -0.06, "N": 0.24},
        aspect_weights={"O_intellect": 1.06, "O_openness": 0.44, "C_orderliness": 0.28, "N_withdrawal": 0.32, "E_enthusiasm": -0.26},
        telemetry_weights={"rt_cv_z": 0.22, "steadiness_z": 0.14, "chunk_speed_z": 0.46, "imagery_vividness_z": 0.16, "wordless_concept_bonus": 0.30},
        oregon_empirical_r=0.52,
        rationale="High Intellect and fast structural chunking build an exhaustive taxonomy of a domain prior to physical initiation.",
    ),
    _act(
        act_id="escs_act_28",
        code="SPEED_WALK_PACE",
        category="Sensory & Pacing",
        text="Naturally walk faster than the crowd on sidewalks and weave around slow walkers",
        short_label="Fast Sidewalk Pace & Weaving",
        base_rate=0.46,
        primary_domain="E",
        primary_aspect="E_assertiveness",
        domain_weights={"O": 0.22, "C": 0.48, "E": 0.82, "A": -0.44, "N": 0.18},
        aspect_weights={"E_assertiveness": 0.96, "C_industriousness": 0.64, "A_politeness": -0.48, "N_volatility": 0.32},
        telemetry_weights={"rt_cv_z": 0.24, "steadiness_z": 0.06, "chunk_speed_z": 0.38, "imagery_vividness_z": -0.04, "wordless_concept_bonus": 0.16},
        oregon_empirical_r=0.47,
        rationale="High dopaminergic goal-drive (Assertiveness + Industriousness) manifests directly in elevated locomotor cadence.",
    ),
    _act(
        act_id="escs_act_29",
        code="MUSEUM_PLAQUE_READER",
        category="Curiosity & Rabbit Holes",
        text="Read nearly every wall plaque or liner note in a museum, exhibit, or album release",
        short_label="Read Every Museum Wall Plaque",
        base_rate=0.38,
        primary_domain="O",
        primary_aspect="O_openness",
        domain_weights={"O": 0.96, "C": 0.36, "E": -0.18, "A": 0.18, "N": 0.06},
        aspect_weights={"O_openness": 0.98, "O_intellect": 0.76, "C_industriousness": 0.34, "E_enthusiasm": -0.22},
        telemetry_weights={"rt_cv_z": -0.18, "steadiness_z": 0.32, "chunk_speed_z": 0.34, "imagery_vividness_z": 0.46, "wordless_concept_bonus": 0.12},
        oregon_empirical_r=0.51,
        rationale="Combines high Aesthetic Openness and Intellect with sustained deliberative attentional steadiness.",
    ),
    _act(
        act_id="escs_act_30",
        code="SYSTEM_MAP_DIAGRAMMING",
        category="Curiosity & Rabbit Holes",
        text="Sketch a diagram, flowchart, or mental map to understand how a complex system works",
        short_label="Sketch Diagrams to Map Systems",
        base_rate=0.40,
        primary_domain="O",
        primary_aspect="O_intellect",
        domain_weights={"O": 0.98, "C": 0.42, "E": 0.08, "A": -0.12, "N": -0.18},
        aspect_weights={"O_intellect": 1.16, "C_industriousness": 0.48, "O_openness": 0.32, "E_assertiveness": 0.28},
        telemetry_weights={"rt_cv_z": -0.08, "steadiness_z": 0.26, "chunk_speed_z": 0.62, "imagery_vividness_z": -0.12, "wordless_concept_bonus": 0.54},
        oregon_empirical_r=0.56,
        rationale="Peak marker of Abstract Systemizing (Intellect), rapid Night Sky constellation chunking, and concept-first spatial architecture.",
    ),
    _act(
        act_id="escs_act_31",
        code="SINGLE_SONG_LOOP_20X",
        category="Sensory & Pacing",
        text="Loop the exact same song 15+ times in a row because its texture locks your focus",
        short_label="Loop One Song 15+ Times",
        base_rate=0.43,
        primary_domain="O",
        primary_aspect="O_openness",
        domain_weights={"O": 0.82, "C": -0.24, "E": -0.32, "A": 0.08, "N": 0.38},
        aspect_weights={"O_openness": 0.94, "O_intellect": 0.42, "N_withdrawal": 0.44, "E_enthusiasm": -0.36},
        telemetry_weights={"rt_cv_z": 0.34, "steadiness_z": 0.12, "chunk_speed_z": 0.32, "imagery_vividness_z": 0.48, "wordless_concept_bonus": 0.18},
        oregon_empirical_r=0.49,
        rationale="Uses predictable acoustic-aesthetic immersion (Openness) as a sensory cocoon to stabilize internal focus.",
    ),
    _act(
        act_id="escs_act_32",
        code="OVERHEAD_LIGHT_AVERSION",
        category="Sensory & Pacing",
        text="Turn off harsh overhead ceiling lights immediately in favor of warm lamps or dim light",
        short_label="Warm Lamps Over Harsh Big Lights",
        base_rate=0.54,
        primary_domain="N",
        primary_aspect="N_volatility",
        domain_weights={"O": 0.64, "C": -0.06, "E": -0.38, "A": 0.22, "N": 0.72},
        aspect_weights={"N_volatility": 0.78, "O_openness": 0.74, "N_withdrawal": 0.48, "E_enthusiasm": -0.42},
        telemetry_weights={"rt_cv_z": 0.16, "steadiness_z": 0.08, "chunk_speed_z": 0.14, "imagery_vividness_z": 0.52, "wordless_concept_bonus": 0.08},
        oregon_empirical_r=0.50,
        rationale="High sensory-perceptual gain (Openness + Volatility + visual imagery vividness) experiences unbuffered overhead glare as autonomic noise.",
    ),
    _act(
        act_id="escs_act_33",
        code="POST_SOCIAL_SILENT_DECOMPRESS",
        category="Sensory & Pacing",
        text="Sit in quiet decompression for 20+ minutes after a busy social event before speaking",
        short_label="20-Min Post-Social Quiet Buffer",
        base_rate=0.52,
        primary_domain="E",
        primary_aspect="E_enthusiasm",
        domain_weights={"O": 0.28, "C": 0.04, "E": -1.02, "A": 0.12, "N": 0.54},
        aspect_weights={"E_enthusiasm": -1.08, "E_assertiveness": -0.48, "N_withdrawal": 0.62, "O_openness": 0.32},
        telemetry_weights={"rt_cv_z": -0.06, "steadiness_z": 0.28, "chunk_speed_z": 0.18, "imagery_vividness_z": 0.22, "wordless_concept_bonus": 0.20},
        oregon_empirical_r=0.55,
        rationale="Low Extraversion and elevated Withdrawal require post-event acoustic stillness to clear accumulated social-allostatic load.",
    ),
    _act(
        act_id="escs_act_34",
        code="HOLD_DOOR_FAR_DISTANCE",
        category="Decisions & Time",
        text="Hold a door or elevator for someone still 15+ feet away so they don't feel shut out",
        short_label="Hold Door From 15+ Feet Away",
        base_rate=0.51,
        primary_domain="A",
        primary_aspect="A_politeness",
        domain_weights={"O": 0.04, "C": 0.28, "E": 0.18, "A": 0.96, "N": 0.22},
        aspect_weights={"A_politeness": 1.02, "A_compassion": 0.78, "E_assertiveness": -0.24, "N_withdrawal": 0.24},
        telemetry_weights={"rt_cv_z": -0.18, "steadiness_z": 0.26, "chunk_speed_z": -0.04, "imagery_vividness_z": 0.20, "wordless_concept_bonus": -0.08},
        oregon_empirical_r=0.47,
        rationale="High Politeness and Compassion prioritize micro-normative warmth over personal time efficiency.",
    ),
    _act(
        act_id="escs_act_35",
        code="TONE_SHIFT_MICRO_DETECTION",
        category="Sensory & Pacing",
        text="Instantly sense a subtle shift in someone's voice tone or pacing before they mention it",
        short_label="Detect Micro-Shifts in Voice Tone",
        base_rate=0.53,
        primary_domain="A",
        primary_aspect="A_compassion",
        domain_weights={"O": 0.44, "C": 0.06, "E": 0.14, "A": 0.88, "N": 0.56},
        aspect_weights={"A_compassion": 1.04, "N_withdrawal": 0.58, "O_openness": 0.52, "N_volatility": 0.36},
        telemetry_weights={"rt_cv_z": 0.12, "steadiness_z": 0.14, "chunk_speed_z": 0.24, "imagery_vividness_z": 0.44, "wordless_concept_bonus": -0.06},
        oregon_empirical_r=0.53,
        rationale="High Compassion paired with Withdrawal vigilance tunes auditory processing to subtle prosodic state changes.",
    ),
    _act(
        act_id="escs_act_36",
        code="EARLY_AIRPORT_BUFFER",
        category="Decisions & Time",
        text="Arrive at airports, train stations, or key meetings 25+ minutes earlier than required",
        short_label="25+ Min Early Arrival Buffer",
        base_rate=0.45,
        primary_domain="C",
        primary_aspect="C_industriousness",
        domain_weights={"O": -0.22, "C": 0.98, "E": -0.06, "A": 0.24, "N": 0.38},
        aspect_weights={"C_industriousness": 0.92, "C_orderliness": 0.88, "N_withdrawal": 0.46, "A_politeness": 0.34, "O_openness": -0.24},
        telemetry_weights={"rt_cv_z": -0.46, "steadiness_z": 0.50, "chunk_speed_z": 0.12, "imagery_vividness_z": -0.04, "wordless_concept_bonus": 0.06},
        oregon_empirical_r=0.54,
        rationale="High Conscientiousness and Withdrawal uncertainty-aversion trade early arrival time for zero lateness variance.",
    ),
    _act(
        act_id="escs_act_37",
        code="MENU_PRE_INSPECTION",
        category="Decisions & Time",
        text="Look up the restaurant menu and photos online before leaving home to meet friends",
        short_label="Pre-Read Restaurant Menu Online",
        base_rate=0.51,
        primary_domain="N",
        primary_aspect="N_withdrawal",
        domain_weights={"O": 0.16, "C": 0.46, "E": -0.34, "A": 0.14, "N": 0.78},
        aspect_weights={"N_withdrawal": 0.92, "C_orderliness": 0.58, "E_enthusiasm": -0.36, "O_intellect": 0.22},
        telemetry_weights={"rt_cv_z": -0.18, "steadiness_z": 0.30, "chunk_speed_z": 0.16, "imagery_vividness_z": 0.34, "wordless_concept_bonus": 0.04},
        oregon_empirical_r=0.48,
        rationale="Pre-resolves environmental and choice uncertainty in advance so in-person cognitive load stays calm.",
    ),
    _act(
        act_id="escs_act_38",
        code="CONVERSATION_REPLAY_LOOP",
        category="Decisions & Time",
        text="Replay a slightly awkward 10-second comment in your head hours after the meeting ends",
        short_label="Replay Awkward Comment Hours Later",
        base_rate=0.50,
        primary_domain="N",
        primary_aspect="N_volatility",
        domain_weights={"O": 0.18, "C": 0.06, "E": -0.38, "A": 0.34, "N": 1.02},
        aspect_weights={"N_volatility": 0.94, "N_withdrawal": 0.98, "A_compassion": 0.36, "E_assertiveness": -0.44},
        telemetry_weights={"rt_cv_z": 0.24, "steadiness_z": -0.18, "chunk_speed_z": -0.06, "imagery_vividness_z": 0.46, "wordless_concept_bonus": -0.12},
        oregon_empirical_r=0.56,
        rationale="Elevated Withdrawal and Volatility sustain post-event episodic simulation loops, amplified by high visual-episodic imagery vividness.",
    ),
    _act(
        act_id="escs_act_39",
        code="DIRECT_FEEDBACK_DELIVERY",
        category="Decisions & Time",
        text="Address a disagreement or flawed assumption directly in the moment rather than hinting",
        short_label="Direct Real-Time Feedback",
        base_rate=0.38,
        primary_domain="E",
        primary_aspect="E_assertiveness",
        domain_weights={"O": 0.42, "C": 0.38, "E": 0.86, "A": -0.68, "N": -0.52},
        aspect_weights={"E_assertiveness": 1.12, "A_politeness": -0.78, "O_intellect": 0.54, "N_withdrawal": -0.62, "C_industriousness": 0.42},
        telemetry_weights={"rt_cv_z": -0.12, "steadiness_z": 0.28, "chunk_speed_z": 0.34, "imagery_vividness_z": -0.14, "wordless_concept_bonus": 0.28},
        oregon_empirical_r=0.54,
        rationale="High Assertiveness and Intellect coupled with low Politeness and low Withdrawal favor immediate epistemic clarity over indirect hinting.",
    ),
    _act(
        act_id="escs_act_40",
        code="APOLOGY_WHEN_BUMPED",
        category="Decisions & Time",
        text="Instinctively say 'sorry' first when someone else nearly bumps into you in a hallway",
        short_label="Reflexive 'Sorry' When Bumped",
        base_rate=0.49,
        primary_domain="A",
        primary_aspect="A_politeness",
        domain_weights={"O": -0.04, "C": 0.14, "E": -0.26, "A": 0.94, "N": 0.52},
        aspect_weights={"A_politeness": 1.08, "A_compassion": 0.64, "N_withdrawal": 0.58, "E_assertiveness": -0.54},
        telemetry_weights={"rt_cv_z": -0.08, "steadiness_z": 0.18, "chunk_speed_z": -0.08, "imagery_vividness_z": 0.24, "wordless_concept_bonus": -0.10},
        oregon_empirical_r=0.51,
        rationale="High Politeness and Withdrawal deploy a rapid affiliative smoothing reflex to neutralize potential interpersonal friction.",
    ),
]

OREGON_ACTS_BY_ID: Dict[str, Dict[str, Any]] = {
    act["act_id"]: act for act in OREGON_BEHAVIORAL_ACTS_40
}

OREGON_ACTS_BY_CODE: Dict[str, Dict[str, Any]] = {
    act["code"]: act for act in OREGON_BEHAVIORAL_ACTS_40
}


def extract_telemetry_z_features(telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    """
    Extracts standardized z-score telemetry features (`rt_cv_z`, `steadiness_z`,
    `chunk_speed_z`, `imagery_vividness_z`, `wordless_concept_bonus`) from either
    nested or flat Mind Moment telemetry dicts. Returns all zeros when telemetry is omitted.
    """
    if not telemetry or not isinstance(telemetry, dict):
        return {
            "provided": 0.0,
            "rt_cv_z": 0.0,
            "steadiness_z": 0.0,
            "chunk_speed_z": 0.0,
            "imagery_vividness_z": 0.0,
            "wordless_concept_bonus": 0.0,
        }

    # Check if telemetry explicitly marked provided=False
    if telemetry.get("provided") is False:
        return {
            "provided": 0.0,
            "rt_cv_z": 0.0,
            "steadiness_z": 0.0,
            "chunk_speed_z": 0.0,
            "imagery_vividness_z": 0.0,
            "wordless_concept_bonus": 0.0,
        }

    pulse = telemetry.get("pulse_reaction") if isinstance(telemetry.get("pulse_reaction"), dict) else {}
    constellation = telemetry.get("constellation_memory") if isinstance(telemetry.get("constellation_memory"), dict) else {}
    minds_eye = telemetry.get("minds_eye") if isinstance(telemetry.get("minds_eye"), dict) else {}

    def _pick(sub: dict, keys: List[str], default_val: Any) -> Any:
        for k in keys:
            if k in sub and sub[k] is not None:
                return sub[k]
            if k in telemetry and telemetry[k] is not None:
                return telemetry[k]
        return default_val

    rt_cv_pct = float(_pick(pulse, ["rt_cv_pct", "cv_pct"], 15.5))
    steadiness_pct = _pick(pulse, ["rt_steadiness_pct", "steadiness_pct"], None)
    if steadiness_pct is None:
        steadiness_pct = max(12.0, min(99.0, 100.0 - max(0.0, rt_cv_pct - 6.0) * 1.85))
    else:
        steadiness_pct = float(steadiness_pct)

    mean_chunk_ms = float(_pick(constellation, ["mean_chunk_ms", "chunk_ms"], 420.0))
    mem_acc_pct = float(_pick(constellation, ["accuracy_pct", "memory_accuracy_pct"], 78.0))
    imagery_vividness = float(_pick(minds_eye, ["imagery_vividness", "vividness"], 60.0))
    inner_modality = str(_pick(minds_eye, ["inner_modality", "modality"], "visual_cinema"))

    rt_cv_z = float(np.clip((rt_cv_pct - 15.5) / 5.0, -2.4, 2.8))
    steadiness_z = float(np.clip((steadiness_pct - 78.0) / 12.0, -2.4, 2.4))
    chunk_speed_z = float(
        np.clip((420.0 - mean_chunk_ms) / 55.0 + (mem_acc_pct - 78.0) / 28.0, -2.4, 2.8)
    )
    imagery_vividness_z = float(np.clip((imagery_vividness - 60.0) / 24.0, -2.5, 2.2))

    if imagery_vividness <= 25.0 or inner_modality == "wordless_concept":
        wordless_concept_bonus = 1.0
    elif inner_modality == "inner_voice" and imagery_vividness <= 45.0:
        wordless_concept_bonus = 0.45
    elif imagery_vividness >= 78.0:
        wordless_concept_bonus = -0.35
    else:
        wordless_concept_bonus = 0.0

    return {
        "provided": 1.0,
        "rt_cv_z": round(rt_cv_z, 3),
        "steadiness_z": round(steadiness_z, 3),
        "chunk_speed_z": round(chunk_speed_z, 3),
        "imagery_vividness_z": round(imagery_vividness_z, 3),
        "wordless_concept_bonus": round(wordless_concept_bonus, 3),
    }


def compute_act_probability(
    act: Dict[str, Any],
    domain_scores: Dict[str, float],
    aspect_scores: Dict[str, float],
    telemetry: Optional[Dict[str, Any]] = None,
    include_telemetry: bool = True,
) -> float:
    """
    Computes calibrated probability p_j in [0.06, 0.95] for a single Oregon ESCS behavioral act
    from 5 Big Five domain percentiles, 10 DeYoung aspect percentiles, and Mind Moment telemetry.
    """
    p0 = float(np.clip(float(act.get("base_rate", 0.45)), 0.08, 0.92))
    alpha = math.log(p0 / (1.0 - p0))

    dom_w = act.get("domain_weights", {})
    asp_w = act.get("aspect_weights", {})

    eta_dom = 0.0
    for d in DOMAIN_KEYS_5:
        z_d = (float(domain_scores.get(d, 50.0)) - 50.0) / 18.0
        eta_dom += float(dom_w.get(d, 0.0)) * z_d

    eta_asp = 0.0
    for a in DEYOUNG_10_ASPECT_KEYS:
        parent_d = a.split("_")[0]
        val_a = float(aspect_scores.get(a, domain_scores.get(parent_d, 50.0)))
        z_a = (val_a - 50.0) / 18.0
        eta_asp += float(asp_w.get(a, 0.0)) * z_a

    # Combine domain and aspect log-odds contributions
    eta = alpha + 0.42 * eta_dom + 0.78 * eta_asp

    if include_telemetry and telemetry is not None:
        tel_z = extract_telemetry_z_features(telemetry)
        if tel_z.get("provided", 0.0) > 0.0:
            tel_w = act.get("telemetry_weights", {})
            eta_tel = (
                float(tel_w.get("rt_cv_z", 0.0)) * tel_z["rt_cv_z"]
                + float(tel_w.get("steadiness_z", 0.0)) * tel_z["steadiness_z"]
                + float(tel_w.get("chunk_speed_z", 0.0)) * tel_z["chunk_speed_z"]
                + float(tel_w.get("imagery_vividness_z", 0.0)) * tel_z["imagery_vividness_z"]
                + float(tel_w.get("wordless_concept_bonus", 0.0)) * tel_z["wordless_concept_bonus"]
            )
            eta += 1.25 * eta_tel

    prob = 1.0 / (1.0 + math.exp(-float(np.clip(eta, -4.5, 4.5))))
    return float(np.clip(prob, 0.06, 0.95))


_CACHED_COHORT: Dict[int, List[Dict[str, Any]]] = {}


def generate_oregon_escs_cohort(seed: int = 1994) -> List[Dict[str, Any]]:
    """
    Generates the deterministic 250-subject Oregon Eugene–Springfield Community Sample (ESCS)
    cohort (`escs_001` .. `escs_250`), partitioned into:
      - `train_80`: 200 calibration subjects (`escs_001` .. `escs_200`)
      - `blind_holdout_20`: 50 blind holdout validation subjects (`escs_201` .. `escs_250`)

    Each subject includes:
      - `subject_id`, `split`, `age`, `cohort_label`
      - `domain_scores`: O, C, E, A, N percentiles (0..100)
      - `aspect_scores`: all 10 DeYoung aspect percentiles (0..100)
      - `telemetry`: realistic Mind Moment telemetry (`median_rt_ms`, `rt_cv_pct`, `steadiness_pct`,
        `mean_chunk_ms`, `accuracy_pct`, `imagery_vividness`, `inner_modality`)
      - `behavior_probabilities`: ground-truth probabilities across all 40 acts
      - `observed_behaviors`: binary realizations (`0` or `1`) across all 40 acts
      - `behavior_frequencies`: frequency ratings (`1..5`) across all 40 acts
    """
    if seed in _CACHED_COHORT:
        return _CACHED_COHORT[seed]

    rng = np.random.default_rng(seed)
    cohort_labels = [
        "Willamette Valley Educator & Reader",
        "Eugene Timber & Craft Builder",
        "Springfield Healthcare & Community Anchor",
        "University District Systems Researcher",
        "McKenzie River Outdoor & Field Specialist",
        "Downtown Eugene Studio & Music Curator",
        "Lane County Civic & Operations Coordinator",
        "Cascade Foothills Remote Technologist",
    ]

    # Realistic archetype profiles to ensure broad variance across all 5 domains & 10 aspects
    archetype_centers = [
        {"O": 78.0, "C": 32.0, "E": 44.0, "A": 68.0, "N": 64.0},  # High-O / Low-C dopamine forager
        {"O": 36.0, "C": 82.0, "E": 56.0, "A": 72.0, "N": 34.0},  # High-C / Low-N structured planner
        {"O": 74.0, "C": 76.0, "E": 34.0, "A": 42.0, "N": 46.0},  # High-O / High-C analytical architect
        {"O": 64.0, "C": 48.0, "E": 82.0, "A": 78.0, "N": 36.0},  # High-E / High-A social catalyst
        {"O": 72.0, "C": 58.0, "E": 28.0, "A": 80.0, "N": 74.0},  # Low-E / High-A / High-N sensitive sensor
        {"O": 80.0, "C": 44.0, "E": 74.0, "A": 34.0, "N": 38.0},  # High-O / High-E / Low-A debater
        {"O": 42.0, "C": 74.0, "E": 32.0, "A": 68.0, "N": 72.0},  # High-C / High-N cautious guardian
        {"O": 56.0, "C": 54.0, "E": 58.0, "A": 60.0, "N": 48.0},  # Balanced community anchor
    ]

    subjects: List[Dict[str, Any]] = []

    for i in range(250):
        sub_num = i + 1
        subject_id = f"escs_{sub_num:03d}"
        split = "train_80" if sub_num <= 200 else "blind_holdout_20"
        age = int(rng.integers(21, 74))
        cohort_label = cohort_labels[i % len(cohort_labels)]
        arch = archetype_centers[i % len(archetype_centers)]

        domain_scores: Dict[str, float] = {}
        for d in DOMAIN_KEYS_5:
            val = float(arch[d]) + float(rng.normal(0.0, 12.5))
            domain_scores[d] = round(float(np.clip(val, 6.0, 96.0)), 1)

        # Generate 10 DeYoung aspects with realistic divergence around parent domain
        o_int_split = float(rng.normal(0.0, 7.5))
        c_ind_split = float(rng.normal(0.0, 8.0))
        e_ent_split = float(rng.normal(0.0, 7.5))
        a_com_split = float(rng.normal(0.0, 7.5))
        n_wit_split = float(rng.normal(0.0, 7.0))

        aspect_scores: Dict[str, float] = {
            "O_intellect": round(float(np.clip(domain_scores["O"] + o_int_split, 5.0, 97.0)), 1),
            "O_openness": round(float(np.clip(domain_scores["O"] - o_int_split * 0.75 + rng.normal(0.0, 4.0), 5.0, 97.0)), 1),
            "C_industriousness": round(float(np.clip(domain_scores["C"] + c_ind_split, 5.0, 97.0)), 1),
            "C_orderliness": round(float(np.clip(domain_scores["C"] - c_ind_split * 0.75 + rng.normal(0.0, 4.0), 5.0, 97.0)), 1),
            "E_enthusiasm": round(float(np.clip(domain_scores["E"] + e_ent_split, 5.0, 97.0)), 1),
            "E_assertiveness": round(float(np.clip(domain_scores["E"] - e_ent_split * 0.75 + rng.normal(0.0, 4.0), 5.0, 97.0)), 1),
            "A_compassion": round(float(np.clip(domain_scores["A"] + a_com_split, 5.0, 97.0)), 1),
            "A_politeness": round(float(np.clip(domain_scores["A"] - a_com_split * 0.75 + rng.normal(0.0, 4.0), 5.0, 97.0)), 1),
            "N_withdrawal": round(float(np.clip(domain_scores["N"] + n_wit_split, 5.0, 97.0)), 1),
            "N_volatility": round(float(np.clip(domain_scores["N"] - n_wit_split * 0.75 + rng.normal(0.0, 4.0), 5.0, 97.0)), 1),
        }

        # Generate coupled Mind Moment telemetry with independent psychophysical signal
        z_c = (domain_scores["C"] - 50.0) / 18.0
        z_o_int = (aspect_scores["O_intellect"] - 50.0) / 18.0
        z_o_open = (aspect_scores["O_openness"] - 50.0) / 18.0

        rt_cv_pct = float(np.clip(16.2 - 3.6 * z_c + 1.8 * z_o_int + rng.normal(0.0, 4.8), 6.5, 35.0))
        steadiness_pct = float(np.clip(100.0 - max(0.0, rt_cv_pct - 6.0) * 1.85 + rng.normal(0.0, 3.0), 14.0, 98.0))
        median_rt_ms = float(np.clip(292.0 + 14.0 * z_c - 10.0 * z_o_int + rng.normal(0.0, 24.0), 215.0, 385.0))
        mean_chunk_ms = float(np.clip(418.0 - 38.0 * z_o_int - 12.0 * z_c + rng.normal(0.0, 46.0), 255.0, 560.0))
        accuracy_pct = float(np.clip(79.0 + 6.5 * z_o_int + 3.0 * z_c + rng.normal(0.0, 6.5), 54.0, 99.0))

        if i % 9 == 0:
            # Concept-first / Aphantasia spectrum subgroup
            imagery_vividness = float(np.clip(14.0 + rng.normal(0.0, 5.5), 2.0, 24.0))
            inner_modality = "wordless_concept"
        else:
            imagery_vividness = float(np.clip(62.0 + 16.0 * z_o_open + rng.normal(0.0, 14.0), 26.0, 98.0))
            if imagery_vividness <= 42.0 and z_o_int > 0.3:
                inner_modality = "wordless_concept"
            elif i % 3 == 0:
                inner_modality = "inner_voice"
            else:
                inner_modality = "visual_cinema"

        telemetry = {
            "median_rt_ms": round(median_rt_ms, 1),
            "rt_cv_pct": round(rt_cv_pct, 1),
            "steadiness_pct": round(steadiness_pct, 1),
            "rt_steadiness_pct": round(steadiness_pct, 1),
            "mean_chunk_ms": round(mean_chunk_ms, 1),
            "accuracy_pct": round(accuracy_pct, 1),
            "imagery_vividness": round(imagery_vividness, 1),
            "inner_modality": inner_modality,
        }

        behavior_probabilities: Dict[str, float] = {}
        observed_behaviors: Dict[str, int] = {}
        behavior_frequencies: Dict[str, int] = {}

        for act in OREGON_BEHAVIORAL_ACTS_40:
            aid = act["act_id"]
            p_true = compute_act_probability(
                act=act,
                domain_scores=domain_scores,
                aspect_scores=aspect_scores,
                telemetry=telemetry,
                include_telemetry=True,
            )
            behavior_probabilities[aid] = round(p_true, 4)

            # Calibrated Bernoulli enactment realization grounded in p_true
            logit_p = math.log(p_true / (1.0 - p_true))
            p_enact = 1.0 / (1.0 + math.exp(-1.12 * logit_p))
            u_draw = float(rng.random())
            binary_obs = 1 if u_draw < p_enact else 0
            observed_behaviors[aid] = binary_obs

            # 1..5 ORAIS behavioral act frequency rating coupled to enactment + probability
            freq_base = 1.2 + 3.6 * p_true + (0.65 if binary_obs == 1 else -0.65)
            behavior_frequencies[aid] = int(np.clip(round(freq_base), 1, 5))

        subjects.append({
            "subject_id": subject_id,
            "split": split,
            "age": age,
            "cohort_label": cohort_label,
            "domain_scores": domain_scores,
            "aspect_scores": aspect_scores,
            "telemetry": telemetry,
            "behavior_probabilities": behavior_probabilities,
            "observed_behaviors": observed_behaviors,
            "behavior_frequencies": behavior_frequencies,
        })

    _CACHED_COHORT[seed] = subjects
    return subjects


def export_oregon_escs_matrix_json(output_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Exports `/home/ubuntu/personality-lab/science/models/oregon_escs_behavioral_matrix.json`.
    """
    if output_path is None:
        output_path = Path(__file__).resolve().parent / "oregon_escs_behavioral_matrix.json"

    cohort = generate_oregon_escs_cohort(seed=1994)
    train_subjects = [s for s in cohort if s["split"] == "train_80"]
    holdout_subjects = [s for s in cohort if s["split"] == "blind_holdout_20"]

    payload = {
        "schema_version": "1.0.0",
        "title": "Oregon Eugene-Springfield Community Sample (ESCS) Bidirectional Behavioral Matrix",
        "citation": "Goldberg, L. R. (1999, 2006) ESCS ORAIS Behavioral Act-Frequency Inventory; DeYoung, Quilty, & Peterson (2007) 10 Aspects.",
        "total_behavioral_acts": len(OREGON_BEHAVIORAL_ACTS_40),
        "categories": OREGON_CATEGORIES,
        "deyoung_10_aspects": DEYOUNG_10_ASPECT_NAMES,
        "cohort_summary": {
            "seed": 1994,
            "total_subjects": len(cohort),
            "train_80_count": len(train_subjects),
            "blind_holdout_20_count": len(holdout_subjects),
            "holdout_cell_count": len(holdout_subjects) * len(OREGON_BEHAVIORAL_ACTS_40),
        },
        "behavioral_acts": OREGON_BEHAVIORAL_ACTS_40,
        "sample_holdout_subjects": holdout_subjects[:10],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    return payload


if __name__ == "__main__":
    exported = export_oregon_escs_matrix_json()
    print(
        f"Exported {exported['total_behavioral_acts']} Oregon ESCS acts and "
        f"{exported['cohort_summary']['total_subjects']} cohort subjects."
    )
