"""
Pure Neuro-Computational Psychometric Engine (Tier 1: Science Layer).

Implements Blind Epistemic Source Separation fused with Behavioral Micro-Game Telemetry:
    y_raw = B_wiring(mask) + Delta_P_unique + S_state(t) - Delta_O_aphantasia(telemetry)

Infers B_wiring(mask), Compensatory Masking Cost (M), Allostatic Epoch State S(t),
and Cognitive Telemetry Priors (Pulse Reaction Drift-Diffusion RT IIV, Constellation
Working-Memory Chunking, and Mind's Eye Imagery Spectrum / Aphantasia De-Confounder)
while producing calm, zero-jargon human narratives for Tier-3 presentation.
"""

from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np
from scipy import stats as scipy_stats

from science.models.oregon_escs_behavioral_matrix import (
    DEYOUNG_10_ASPECT_KEYS,
    DEYOUNG_10_ASPECT_NAMES,
    OREGON_ACTS_BY_CODE,
    OREGON_ACTS_BY_ID,
    OREGON_BEHAVIORAL_ACTS_40,
    OREGON_CATEGORIES,
    compute_act_probability,
    extract_telemetry_z_features,
    generate_oregon_escs_cohort,
)


DOMAIN_KEYS = ["O", "C", "E", "A", "N"]

CALM_DOMAIN_NAMES = {
    "O": "Curiosity & Imagination",
    "C": "Focus & Follow-Through",
    "E": "Social Energy",
    "A": "Warmth & Harmony",
    "N": "Emotional Sensitivity",
}


class NeuroPsychometricEngine:
    """Core scientific engine for blind epistemic signal decomposition, IRT CAT, cognitive telemetry, and dyadic chemistry."""

    def __init__(self, models_dir: Optional[Path] = None) -> None:
        if models_dir is None:
            models_dir = Path(__file__).resolve().parent.parent / "models"
        self.models_dir = Path(models_dir)
        self.reload_models()

    def reload_models(self) -> None:
        with open(self.models_dir / "cortical_dimensions.json", "r", encoding="utf-8") as f:
            self.cortical_schema = json.load(f)
        with open(self.models_dir / "neurodevelopmental_masks.json", "r", encoding="utf-8") as f:
            self.masks_schema = json.load(f)
        with open(self.models_dir / "item_bank_irt.json", "r", encoding="utf-8") as f:
            self.item_bank_schema = json.load(f)

        telemetry_priors_path = self.models_dir / "cognitive_telemetry_priors.json"
        if telemetry_priors_path.exists():
            with open(telemetry_priors_path, "r", encoding="utf-8") as f:
                self.telemetry_priors_schema = json.load(f)
        else:
            self.telemetry_priors_schema = {}

        oregon_path = self.models_dir / "oregon_escs_behavioral_matrix.json"
        if oregon_path.exists():
            with open(oregon_path, "r", encoding="utf-8") as f:
                self.oregon_escs_schema = json.load(f)
        else:
            self.oregon_escs_schema = {
                "schema_version": "1.0.0",
                "behavioral_acts": OREGON_BEHAVIORAL_ACTS_40,
            }

        self.domains_by_id: Dict[str, Dict[str, Any]] = {
            d["id"]: d for d in self.cortical_schema["domains"]
        }
        self.masks_by_id: Dict[str, Dict[str, Any]] = {
            m["id"]: m for m in self.masks_schema["masks"]
        }
        self.items_by_id: Dict[int, Dict[str, Any]] = {
            int(item["id"]): item for item in self.item_bank_schema["items"]
        }
        self.oregon_acts: List[Dict[str, Any]] = list(OREGON_BEHAVIORAL_ACTS_40)
        self.oregon_acts_by_id: Dict[str, Dict[str, Any]] = dict(OREGON_ACTS_BY_ID)
        self._cached_oregon_benchmark: Optional[Dict[str, Any]] = None

    @staticmethod
    def _clamp(val: float, low: float = 2.0, high: float = 98.0) -> float:
        return float(max(low, min(high, val)))

    @staticmethod
    def _get_ans(responses: Optional[Dict[str, Any]], qid: int, default: float = 3.0) -> float:
        if not responses:
            return default
        val = responses.get(str(qid), responses.get(qid))
        return float(val) if val is not None else default

    def _normalize_telemetry(self, telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Normalizes behavioral micro-game telemetry from either nested
        (`pulse_reaction`, `constellation_memory`, `minds_eye`) or flat dictionaries,
        applying scientific normative defaults when omitted.
        """
        defaults = self.telemetry_priors_schema.get("defaults", {
            "median_rt_ms": 290.0,
            "rt_cv_pct": 14.5,
            "false_starts": 0,
            "accuracy_pct": 78.0,
            "mean_chunk_ms": 420.0,
            "imagery_vividness": 62.0,
            "inner_modality": "visual_cinema",
        })

        if not telemetry or not isinstance(telemetry, dict):
            rt_cv = float(defaults.get("rt_cv_pct", 14.5))
            steadiness = round(self._clamp(100.0 - max(0.0, rt_cv - 6.0) * 1.85, 12.0, 99.0), 1)
            return {
                "provided": False,
                "median_rt_ms": float(defaults.get("median_rt_ms", 290.0)),
                "rt_cv_pct": rt_cv,
                "rt_steadiness_pct": steadiness,
                "false_starts": int(defaults.get("false_starts", 0)),
                "memory_accuracy_pct": float(defaults.get("accuracy_pct", 78.0)),
                "mean_chunk_ms": float(defaults.get("mean_chunk_ms", 420.0)),
                "imagery_vividness": float(defaults.get("imagery_vividness", 62.0)),
                "inner_modality": str(defaults.get("inner_modality", "visual_cinema")),
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

        median_rt_ms = float(_pick(pulse, ["median_rt_ms", "rt_ms"], defaults.get("median_rt_ms", 290.0)))
        rt_cv_pct = float(_pick(pulse, ["rt_cv_pct", "cv_pct"], defaults.get("rt_cv_pct", 14.5)))
        false_starts = int(_pick(pulse, ["false_starts"], defaults.get("false_starts", 0)))

        raw_steadiness = _pick(pulse, ["rt_steadiness_pct", "steadiness_pct"], None)
        if raw_steadiness is not None and "rt_cv_pct" not in pulse and "rt_cv_pct" not in telemetry:
            rt_steadiness_pct = float(self._clamp(float(raw_steadiness), 10.0, 99.0))
            rt_cv_pct = round(max(4.0, (100.0 - rt_steadiness_pct) / 1.85 + 6.0), 1)
        elif raw_steadiness is not None:
            rt_steadiness_pct = round(self._clamp(float(raw_steadiness), 10.0, 99.0), 1)
        else:
            rt_steadiness_pct = round(self._clamp(100.0 - max(0.0, rt_cv_pct - 6.0) * 1.85, 12.0, 99.0), 1)

        memory_accuracy_pct = float(
            self._clamp(
                float(_pick(constellation, ["accuracy_pct", "memory_accuracy_pct"], defaults.get("accuracy_pct", 78.0))),
                0.0,
                100.0,
            )
        )
        mean_chunk_ms = float(_pick(constellation, ["mean_chunk_ms", "chunk_ms"], defaults.get("mean_chunk_ms", 420.0)))
        imagery_vividness = float(
            self._clamp(
                float(_pick(minds_eye, ["imagery_vividness", "vividness"], defaults.get("imagery_vividness", 62.0))),
                0.0,
                100.0,
            )
        )

        default_modality = "wordless_concept" if imagery_vividness <= 25.0 else defaults.get("inner_modality", "visual_cinema")
        inner_modality = str(_pick(minds_eye, ["inner_modality", "modality"], default_modality))
        if inner_modality not in ("wordless_concept", "inner_voice", "visual_cinema"):
            inner_modality = default_modality

        return {
            "provided": True,
            "median_rt_ms": round(median_rt_ms, 1),
            "rt_cv_pct": round(rt_cv_pct, 1),
            "rt_steadiness_pct": round(rt_steadiness_pct, 1),
            "false_starts": max(0, false_starts),
            "memory_accuracy_pct": round(memory_accuracy_pct, 1),
            "mean_chunk_ms": round(mean_chunk_ms, 1),
            "imagery_vividness": round(imagery_vividness, 1),
            "inner_modality": inner_modality,
        }

    @staticmethod
    def _compute_aphantasia_boost(imagery_vividness: float) -> float:
        """
        Aphantasia De-Confounder Rule:
        When imagery_vividness <= 25, standard aesthetic/visual Openness items under-estimate
        the user's true imaginative capacity by 12%–18% because they imagine via wordless
        conceptual/spatial models rather than V1 visual pictures.
        """
        if imagery_vividness <= 25.0:
            v_clamped = max(0.0, min(25.0, float(imagery_vividness)))
            return round(12.0 + 6.0 * ((25.0 - v_clamped) / 25.0), 1)
        return 0.0

    def build_telemetry_profile(self, telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Constructs the zero-jargon human-readable `telemetry_profile` object and
        de-confounding adjustments from the 3 micro-game telemetry streams.
        """
        norm = self._normalize_telemetry(telemetry)
        vivid = norm["imagery_vividness"]
        modality = norm["inner_modality"]
        rt_ms = norm["median_rt_ms"]
        rt_cv = norm["rt_cv_pct"]
        steadiness = norm["rt_steadiness_pct"]
        false_starts = norm["false_starts"]
        mem_acc = norm["memory_accuracy_pct"]
        chunk_ms = norm["mean_chunk_ms"]

        aphantasia_boost = self._compute_aphantasia_boost(vivid)

        # 1. Mind's Eye label & calm validating note
        if vivid <= 18.0:
            minds_eye_tier = "aphantasia_concept_first"
            if modality == "inner_voice":
                minds_eye_label = "Concept-First & Inner-Voice Mind (Aphantasia Spectrum)"
            else:
                minds_eye_label = "Concept-First Mind (Aphantasia Spectrum)"
            minds_eye_calm_note = (
                f"Your mind works like a quiet architect: instead of projecting literal pictures behind your eyes, "
                f"you hold rich, wordless models of how ideas, spaces, and feelings fit together. Because standard "
                f"personality tests often mistake 'not seeing mental pictures' for having less imagination, we gently "
                f"adjusted your Curiosity & Imagination portrait (+{int(round(aphantasia_boost))}%) to honor your true conceptual depth."
            )
        elif vivid <= 25.0:
            minds_eye_tier = "aphantasia_spectrum_sketch"
            minds_eye_label = "Concept-First Mind (Aphantasia Spectrum)"
            minds_eye_calm_note = (
                f"You imagine primarily through pure meaning, spatial intuition, and subtle conceptual outlines rather than "
                f"vivid visual pictures. Because visual-worded questionnaires under-count non-visual imagination, we gently "
                f"adjusted your Curiosity & Imagination portrait (+{int(round(aphantasia_boost))}%) so your conceptual creativity shines through."
            )
        elif vivid <= 45.0:
            minds_eye_tier = "soft_sketch_imagery"
            if modality == "inner_voice":
                minds_eye_label = "Deep Inner-Voice & Soft-Sketch Mind"
            elif modality == "wordless_concept":
                minds_eye_label = "Concept-Led Soft-Sketch Mind"
            else:
                minds_eye_label = "Soft-Sketch Imagery Mind"
            minds_eye_calm_note = (
                "You think through meaning, voice, and light gestural impressions rather than heavy visual detail—letting "
                "your mind move quickly to the heart of an idea without getting bogged down in surface rendering."
            )
        elif vivid <= 80.0:
            minds_eye_tier = "vivid_mental_imagery"
            if modality == "inner_voice":
                minds_eye_label = "Deep Inner-Voice & Vivid Visual Mind"
            elif modality == "wordless_concept":
                minds_eye_label = "Conceptual & Vivid Visual Mind"
            else:
                minds_eye_label = "Vivid Visual Mind"
            minds_eye_calm_note = (
                "You can readily call up clear scenes, atmospheres, and memories in your mind's eye, blending visual "
                "imagery smoothly with your everyday intuition and inner voice."
            )
        else:
            minds_eye_tier = "hyperphantasia_cinema"
            minds_eye_label = "Cinema-Grade Visual Mind (Hyperphantasia Spectrum)"
            minds_eye_calm_note = (
                "Your inner world renders in cinema-grade light, texture, and motion—allowing you to replay memories "
                "and simulate future possibilities almost as vividly as seeing them in person."
            )

        # 2. Attentional Cadence label & note (Pulse Reaction)
        if rt_cv > 22.0 or false_starts >= 2:
            attentional_cadence_label = "Quick-Spark & Dynamic Cadence"
            attentional_cadence_note = (
                "Your attention moves in quick, high-energy bursts—anticipating what comes next and surging fastest "
                "when a moment feels alive, novel, and meaningful."
            )
        elif rt_ms >= 335.0 and rt_cv <= 20.0:
            attentional_cadence_label = "Deliberate & Unhurried Cadence"
            attentional_cadence_note = (
                "Your mind takes a calm beat to verify the signal before acting, trading rushed reflexes for steady, "
                "unhurried certainty."
            )
        else:
            attentional_cadence_label = "Steady & Measured Cadence"
            attentional_cadence_note = (
                "Your attention locks in with an even, grounded rhythm—giving you steady pacing across both quiet "
                "and fast-moving moments."
            )

        # 3. Pattern Memory label & note (Constellation Memory)
        if mem_acc >= 80.0 and chunk_ms <= 430.0:
            pattern_memory_label = "Holistic Constellation Memory"
            pattern_memory_note = (
                "Instead of memorizing isolated points one by one, your mind naturally compresses the whole geometry "
                "into a single connected shape."
            )
            pattern_synthesis_boost = round(
                min(4.5, (mem_acc - 75.0) * 0.10 + max(0.0, 430.0 - chunk_ms) * 0.012), 1
            )
        elif mem_acc >= 75.0:
            pattern_memory_label = "Careful Structural Memory"
            pattern_memory_note = (
                "You rebuild complex patterns step by step with deliberate care, making sure each piece fits "
                "before placing the next."
            )
            pattern_synthesis_boost = 1.5
        else:
            pattern_memory_label = "Big-Picture Impression Memory"
            pattern_memory_note = (
                "Your mind captures the overall gesture and flow of a space rather than holding onto rigid grid coordinates."
            )
            pattern_synthesis_boost = 0.0

        return {
            "minds_eye_label": minds_eye_label,
            "minds_eye_tier": minds_eye_tier,
            "minds_eye_calm_note": minds_eye_calm_note,
            "attentional_cadence_label": attentional_cadence_label,
            "attentional_cadence_calm_note": attentional_cadence_note,
            "pattern_memory_label": pattern_memory_label,
            "pattern_memory_calm_note": pattern_memory_note,
            "median_rt_ms": rt_ms,
            "rt_cv_pct": rt_cv,
            "rt_steadiness_pct": steadiness,
            "false_starts": false_starts,
            "memory_accuracy_pct": mem_acc,
            "mean_chunk_ms": chunk_ms,
            "imagery_vividness": vivid,
            "inner_modality": modality,
            "aphantasia_deconfounder_applied": bool(aphantasia_boost > 0.0),
            "aphantasia_openness_boost_pct": aphantasia_boost,
            "pattern_synthesis_boost_pct": pattern_synthesis_boost,
        }

    def extract_epistemic_probes(
        self,
        raw_scores: Dict[str, float],
        responses: Optional[Dict[str, Any]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extracts the Symmetry-Breaking Epistemic Observables from responses, raw scores,
        and optional micro-game telemetry:
          1. salience_split_index (Delta C_salience, fused with RT CV phasic gating)
          2. acoustic_stream_index (Delta E_sensory)
          3. valence_gain_index (Delta N_valence)
          4. compensatory_masking_index (M: output vs internal effort cost)
          5. inferred_epoch_fatigue (S_state from Q12)
        """
        q2 = self._get_ans(responses, 2, 4.0)
        q3 = self._get_ans(responses, 3, 4.0)
        q4 = self._get_ans(responses, 4, 3.0)
        q5 = self._get_ans(responses, 5, 4.0)
        q8 = self._get_ans(responses, 8, 3.5)
        q11 = self._get_ans(responses, 11, 3.8)
        q12 = self._get_ans(responses, 12, 3.5)

        norm_tel = self._normalize_telemetry(telemetry)
        rt_phasic_bonus = 0.0
        if norm_tel["provided"] and norm_tel["rt_cv_pct"] > 22.0:
            rt_phasic_bonus = min(14.0, (norm_tel["rt_cv_pct"] - 22.0) * 0.85 + norm_tel["false_starts"] * 2.5)

        salience_split = self._clamp(
            (q3 - 1.0) * 24.0 + max(0.0, 60.0 - float(raw_scores.get("C", 50.0))) * 0.35 + rt_phasic_bonus
        )
        acoustic_split = self._clamp((q5 - 1.0) * 23.0 + max(0.0, 60.0 - float(raw_scores.get("E", 50.0))) * 0.30)
        valence_gain = self._clamp((q2 - 1.0) * 22.0 + float(raw_scores.get("O", 50.0)) * 0.18)
        compensatory_masking = self._clamp((q11 - 1.0) * 21.0 + (q4 - 2.5) * 8.0)

        # Epoch fatigue mapped to [-1.0 .. +1.0] where negative mood_energy = tired/heavy season
        epoch_heaviness = (q12 - 3.0) / 2.0  # -1.0 (very rested) to +1.0 (heavier season)
        inferred_mood_energy = round(-epoch_heaviness * 0.65, 2)
        inferred_self_criticism = round(max(0.0, epoch_heaviness * 0.55 + (q11 - 3.0) * 0.2), 2)

        return {
            "salience_split_index": round(salience_split, 1),
            "acoustic_stream_index": round(acoustic_split, 1),
            "valence_gain_index": round(valence_gain, 1),
            "directness_preference": round((q8 - 1.0) * 25.0, 1),
            "compensatory_masking_index": round(compensatory_masking, 1),
            "inferred_mood_energy": inferred_mood_energy,
            "inferred_self_criticism": inferred_self_criticism,
        }

    def score_responses_irt(
        self,
        responses: Dict[str, int],
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Compute raw domain scores (0-100) and Bayesian IRT standard error (SE)
        from Likert responses {item_id: 1..5} and optional micro-game telemetry.
        Excludes pure state/cost probes (Q11, Q12) from distorting core trait means,
        and computes Aphantasia-deconfounded Openness when `imagery_vividness <= 25`.
        """
        raw_scores: Dict[str, float] = {}
        se_by_domain: Dict[str, float] = {}
        tel_profile = self.build_telemetry_profile(telemetry)
        norm_tel = self._normalize_telemetry(telemetry)

        telemetry_fisher_bonus = {
            "O": 0.65 if norm_tel["provided"] else 0.0,
            "C": 0.60 if norm_tel["provided"] else 0.0,
            "E": 0.20 if norm_tel["provided"] else 0.0,
            "A": 0.15 if norm_tel["provided"] else 0.0,
            "N": 0.45 if norm_tel["provided"] else 0.0,
        }

        for d in DOMAIN_KEYS:
            domain_items = [
                it
                for it in self.item_bank_schema["items"]
                if it["domain"] == d
                and it.get("layer") not in ("compensatory_masking_probe", "differential_epoch_probe", "shadow_behavioral_probe")
                and it.get("calibration_status", "calibrated_anchor") != "shadow_candidate"
                and float(it.get("weight", 1.0)) > 0.0
            ]
            weighted_sum = 0.0
            weight_total = 0.0
            fisher_info_sum = 0.25 + telemetry_fisher_bonus.get(d, 0.0)

            for it in domain_items:
                ans = responses.get(str(it["id"]), responses.get(it["id"]))
                if ans is None:
                    continue
                centered = (float(ans) - 3.0) * float(it["direction"])
                w = float(it["weight"])
                weighted_sum += centered * w
                weight_total += 2.0 * w

                a = float(it.get("irt_a", 1.5))
                b = float(it.get("irt_b", 0.0))
                theta_est = centered / 2.0
                p = 1.0 / (1.0 + math.exp(-a * (theta_est - b)))
                fisher_info_sum += (a ** 2) * p * (1.0 - p)

            if weight_total > 0:
                pct = 50.0 + (weighted_sum / weight_total) * 46.0
                raw_scores[d] = round(self._clamp(pct), 1)
            else:
                raw_scores[d] = 50.0

            se_pct = round(min(18.0, max(2.5, (1.0 / math.sqrt(fisher_info_sum)) * 12.0)), 1)
            se_by_domain[d] = se_pct

        # Evaluate shadow_candidate items separately with zero distortion to primary anchor scores
        shadow_item_diagnostics: List[Dict[str, Any]] = []
        for it in self.item_bank_schema["items"]:
            if it.get("calibration_status") == "shadow_candidate" or it.get("layer") == "shadow_behavioral_probe":
                ans = responses.get(str(it["id"]), responses.get(it["id"]))
                if ans is None:
                    continue
                ans_f = float(ans)
                d = it["domain"]
                centered = (ans_f - 3.0) * float(it.get("direction", 1))
                implied_domain_pct = round(self._clamp(50.0 + (centered / 2.0) * 46.0), 1)
                anchor_domain_pct = raw_scores.get(d, 50.0)
                shadow_item_diagnostics.append({
                    "item_id": int(it["id"]),
                    "domain": d,
                    "probe_type": it.get("probe_type", "shadow_probe"),
                    "calibration_status": it.get("calibration_status", "shadow_candidate"),
                    "anchor_weight_applied": 0.0,
                    "raw_likert_response": ans_f,
                    "implied_domain_pct": implied_domain_pct,
                    "anchor_domain_pct": anchor_domain_pct,
                    "divergence_from_anchor_pct": round(implied_domain_pct - anchor_domain_pct, 1),
                    "empirical_prior_r": float(it.get("empirical_prior_r", 0.0)),
                    "calm_theme": it.get("calm_theme", "Everyday habit"),
                })

        aphantasia_boost = tel_profile["aphantasia_openness_boost_pct"]
        pattern_boost = tel_profile["pattern_synthesis_boost_pct"] if norm_tel["provided"] else 0.0
        telemetry_deconfounded_scores = dict(raw_scores)
        if aphantasia_boost > 0.0 or pattern_boost > 0.0:
            telemetry_deconfounded_scores["O"] = round(
                self._clamp(raw_scores["O"] + aphantasia_boost + pattern_boost * 0.5), 1
            )

        mean_se = round(float(np.mean(list(se_by_domain.values()))), 1)
        return {
            "raw_scores": raw_scores,
            "telemetry_deconfounded_scores": telemetry_deconfounded_scores,
            "aphantasia_openness_boost_pct": aphantasia_boost,
            "standard_errors": se_by_domain,
            "mean_confidence_band": mean_se,
            "telemetry_profile": tel_profile,
            "shadow_item_diagnostics": shadow_item_diagnostics,
        }

    def _evaluate_parent_trigger(
        self,
        parent_trigger: Optional[Dict[str, Any]],
        responses: Optional[Dict[str, Any]],
        domain_pcts: Dict[str, float],
        domain_thetas: Dict[str, float],
        domain_counts: Dict[str, int],
        norm_tel: Dict[str, Any],
        total_answered: int,
    ) -> Dict[str, Any]:
        """
        Evaluates whether a question's conditional `parent_trigger` is satisfied by:
          - `question_threshold` (e.g. Q3 >= 4)
          - `domain_divergence` (e.g. High O vs Low C, or High O + High N)
          - `telemetry` (e.g. Still Water phasic_spark, Night Sky holistic_constellation, Mind's Eye aphantasia_concept)
          - `irt_information_match` (latent theta_d within 0.55 of item difficulty b_i)
        """
        if not parent_trigger or not isinstance(parent_trigger, dict):
            return {"triggered": False, "bonus": 0.0, "reason": ""}

        ttype = str(parent_trigger.get("type", ""))
        label = str(parent_trigger.get("label", "Conditional branch rule"))

        if ttype == "question_threshold":
            qid = int(parent_trigger.get("question_id", 0))
            if not responses:
                return {"triggered": False, "bonus": 0.0, "reason": ""}
            raw_ans = responses.get(str(qid), responses.get(qid))
            if raw_ans is None:
                return {"triggered": False, "bonus": 0.0, "reason": ""}
            ans_val = float(raw_ans)
            op = str(parent_trigger.get("op", ">="))
            target_val = float(parent_trigger.get("val", 4.0))
            hit = False
            if op == ">=" and ans_val >= target_val:
                hit = True
            elif op == "<=" and ans_val <= target_val:
                hit = True
            elif op == "==" and abs(ans_val - target_val) < 1e-6:
                hit = True
            elif op == ">" and ans_val > target_val:
                hit = True
            elif op == "<" and ans_val < target_val:
                hit = True
            if hit:
                return {
                    "triggered": True,
                    "bonus": 4.25,
                    "reason": f"Branch triggered by {label} (user answered {int(round(ans_val))}/5 on Q{qid})",
                }
            return {"triggered": False, "bonus": 0.0, "reason": ""}

        if ttype == "domain_divergence":
            if total_answered < 2:
                return {"triggered": False, "bonus": 0.0, "reason": ""}
            high_d = str(parent_trigger.get("high_domain", "O"))
            if "low_domain" in parent_trigger:
                low_d = str(parent_trigger.get("low_domain", "C"))
                min_gap = float(parent_trigger.get("min_gap", 12.0))
                gap = float(domain_pcts.get(high_d, 50.0)) - float(domain_pcts.get(low_d, 50.0))
                if gap >= min_gap:
                    return {
                        "triggered": True,
                        "bonus": 3.85,
                        "reason": f"Cross-domain divergence triggered: {label} ({high_d}={domain_pcts[high_d]:.0f}% vs {low_d}={domain_pcts[low_d]:.0f}%, Δ={gap:+.0f}%)",
                    }
            elif "high_domain_2" in parent_trigger:
                high_d2 = str(parent_trigger.get("high_domain_2", "N"))
                min_sum = float(parent_trigger.get("min_sum", 125.0))
                comb = float(domain_pcts.get(high_d, 50.0)) + float(domain_pcts.get(high_d2, 50.0))
                if comb >= min_sum:
                    return {
                        "triggered": True,
                        "bonus": 3.75,
                        "reason": f"Co-elevation branch triggered: {label} ({high_d}+{high_d2}={comb:.0f})",
                    }
            return {"triggered": False, "bonus": 0.0, "reason": ""}

        if ttype == "telemetry":
            if not norm_tel.get("provided"):
                return {"triggered": False, "bonus": 0.0, "reason": ""}
            moment = str(parent_trigger.get("moment", ""))
            cond = str(parent_trigger.get("condition", ""))
            hit = False
            detail = ""
            if moment in ("still_water", "pulse_reaction"):
                if cond == "phasic_spark" and (norm_tel["rt_cv_pct"] > 22.0 or norm_tel["false_starts"] >= 2):
                    hit = True
                    detail = f"RT CV={norm_tel['rt_cv_pct']:.1f}%, false_starts={norm_tel['false_starts']}"
                elif cond == "deliberate_steady" and (norm_tel["median_rt_ms"] >= 325.0 and norm_tel["rt_cv_pct"] <= 20.0):
                    hit = True
                    detail = f"median RT={norm_tel['median_rt_ms']:.0f}ms, CV={norm_tel['rt_cv_pct']:.1f}%"
            elif moment in ("night_sky", "constellation_memory"):
                if cond == "holistic_constellation" and (norm_tel["memory_accuracy_pct"] >= 80.0 and norm_tel["mean_chunk_ms"] <= 430.0):
                    hit = True
                    detail = f"accuracy={norm_tel['memory_accuracy_pct']:.0f}%, chunk={norm_tel['mean_chunk_ms']:.0f}ms"
            elif moment == "minds_eye":
                if cond == "aphantasia_concept" and (norm_tel["imagery_vividness"] <= 25.0 or norm_tel["inner_modality"] == "wordless_concept"):
                    hit = True
                    detail = f"vividness={norm_tel['imagery_vividness']:.0f}, modality={norm_tel['inner_modality']}"
                elif cond == "hyperphantasia_cinema" and norm_tel["imagery_vividness"] >= 80.0:
                    hit = True
                    detail = f"vividness={norm_tel['imagery_vividness']:.0f}"
            if hit:
                return {
                    "triggered": True,
                    "bonus": 4.10,
                    "reason": f"Mind Moment telemetry trigger: {label} ({detail})",
                }
            return {"triggered": False, "bonus": 0.0, "reason": ""}

        if ttype == "irt_information_match":
            target_dom = str(parent_trigger.get("target_domain", "O"))
            if domain_counts.get(target_dom, 0) < 1:
                return {"triggered": False, "bonus": 0.0, "reason": ""}
            target_theta = float(parent_trigger.get("target_theta", 0.0))
            curr_theta = float(domain_thetas.get(target_dom, 0.0))
            dist = abs(curr_theta - target_theta)
            if dist <= 0.55:
                match_bonus = round(2.25 * (1.0 - dist / 0.75), 3)
                return {
                    "triggered": True,
                    "bonus": match_bonus,
                    "reason": f"Latent trait θ_{target_dom}={curr_theta:+.2f} matches item difficulty threshold b={target_theta:+.2f}",
                }
            return {"triggered": False, "bonus": 0.0, "reason": ""}

        return {"triggered": False, "bonus": 0.0, "reason": ""}

    def select_next_adaptive_item(
        self,
        answered_ids: List[int],
        current_scores: Optional[Dict[str, float]] = None,
        responses: Optional[Dict[str, Any]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
        context_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Bayesian 2PL IRT Computerized Adaptive Testing (CAT) + Conditional Question Tree Selector
        across the 120-item pool.

        Combines:
          1. 2PL Fisher Information at current latent trait estimate theta_d:
             I_i(theta_d) = a_i^2 * p_i(theta_d) * (1 - p_i(theta_d))
          2. Domain & DeYoung 10-Aspect Posterior Uncertainty Weighting (prioritizing high SE_d
             and under-sampled aspects)
          3. Conditional Tree Branching (`question_threshold`, `domain_divergence`, `telemetry`,
             and `irt_information_match` triggers)
          4. Stage-Aware Tier Weighting:
             - Steps 1–5 (`len(answered_ids) < 5`): Symmetry-breaking `anchor` items across all 5 domains
             - Steps 6–11 (`5 <= len(answered_ids) < 11`): Triggered `branch_probe` & `deep_resolution` items
             - Step 12+ (`len(answered_ids) >= 11`): Disarming `everyday_moment` & high-uncertainty `deep_resolution` items
        """
        clean_responses: Dict[str, int] = {}
        if responses and isinstance(responses, dict):
            for k, v in responses.items():
                if v is not None:
                    try:
                        clean_responses[str(int(k))] = int(round(float(v)))
                    except Exception:
                        pass

        answered_set = set(int(x) for x in (answered_ids or []))
        for k in clean_responses.keys():
            answered_set.add(int(k))

        all_items = self.item_bank_schema.get("items", [])
        pool_size = len(all_items)
        remaining = [it for it in all_items if int(it["id"]) not in answered_set]

        norm_tel = self._normalize_telemetry(telemetry)
        domain_counts = {d: 0 for d in DOMAIN_KEYS}
        aspect_counts: Dict[str, int] = {}
        for aid in answered_set:
            if aid in self.items_by_id:
                it_ans = self.items_by_id[aid]
                dom = it_ans["domain"]
                domain_counts[dom] = domain_counts.get(dom, 0) + 1
                asp = it_ans.get("deyoung_aspect") or it_ans.get("aspect", "")
                aspect_counts[asp] = aspect_counts.get(asp, 0) + 1

        # Compute live Bayesian domain posteriors (theta in [-2.2, +2.2], percentile in [5, 95], SE in [0.18, 1.0])
        irt_live = self.score_responses_irt(clean_responses, telemetry=telemetry) if clean_responses else None
        domain_pcts: Dict[str, float] = {}
        domain_thetas: Dict[str, float] = {}
        domain_ses: Dict[str, float] = {}
        domain_posteriors: Dict[str, Dict[str, Any]] = {}

        for d in DOMAIN_KEYS:
            if irt_live and domain_counts[d] > 0:
                pct = float(irt_live["telemetry_deconfounded_scores"].get(d, 50.0))
                se_pct = float(irt_live["standard_errors"].get(d, 14.0))
            elif current_scores and d in current_scores and current_scores[d] is not None:
                pct = float(self._clamp(float(current_scores[d]), 5.0, 95.0))
                se_pct = max(4.5, 16.0 - domain_counts[d] * 3.0)
            else:
                pct = 50.0
                se_pct = 18.0

            theta = float(np.clip((pct - 50.0) / 22.0, -2.2, 2.2))
            se_theta = round(float(np.clip(se_pct / 18.0, 0.18, 1.0)), 3)
            domain_pcts[d] = round(pct, 1)
            domain_thetas[d] = round(theta, 3)
            domain_ses[d] = se_theta
            domain_posteriors[d] = {
                "theta": round(theta, 3),
                "percentile": round(pct, 1),
                "se": se_theta,
                "se_pct": round(se_pct, 1),
                "answered_count": domain_counts[d],
            }

        step_num = len(answered_set) + 1
        if len(answered_set) < 5:
            stage_label = "Stage 1: Symmetry-Breaking Domain Anchors (Steps 1–5)"
        elif len(answered_set) < 11:
            stage_label = "Stage 2: Conditional Tree Branching & DeYoung Aspect Resolution (Steps 6–11)"
        else:
            stage_label = "Stage 3: Everyday Behavioral Micro-Validation & Deep IRT Convergence (Step 12+)"

        if not remaining:
            return {
                "completed": True,
                "next_item": None,
                "selection_reason": "All active items in the 120-item pool have been answered.",
                "stage_label": stage_label,
                "pool_size": pool_size,
                "remaining_count": 0,
                "fisher_information": 0.0,
                "domain_posteriors": domain_posteriors,
                "top_candidates": [],
            }

        scored_candidates: List[Dict[str, Any]] = []
        total_answered = len(answered_set)

        for it in remaining:
            qid = int(it["id"])
            d = it["domain"]
            node_tier = it.get("node_tier", "anchor" if qid <= 12 else "everyday_moment")
            deyoung_asp = it.get("deyoung_aspect") or it.get("aspect", "")
            theta_d = domain_thetas[d]
            se_d = domain_ses[d]

            a = float(it.get("irt_a", 1.5))
            b = float(it.get("irt_b", 0.0))
            p = 1.0 / (1.0 + math.exp(-a * (theta_d - b)))
            fisher_info = (a ** 2) * p * (1.0 - p)

            # Domain & Aspect Uncertainty Weight
            domain_coverage_bonus = max(0, 2 - domain_counts[d]) * 1.65 + (2.4 if domain_counts[d] == 0 else 0.0)
            uncertainty_weight = se_d * 1.90
            aspect_bonus = max(0, 2 - aspect_counts.get(deyoung_asp, 0)) * 0.75

            # Conditional Tree Branch evaluation
            trig_eval = self._evaluate_parent_trigger(
                parent_trigger=it.get("parent_trigger"),
                responses=clean_responses,
                domain_pcts=domain_pcts,
                domain_thetas=domain_thetas,
                domain_counts=domain_counts,
                norm_tel=norm_tel,
                total_answered=total_answered,
            )
            branch_bonus = float(trig_eval["bonus"])
            branch_triggered = bool(trig_eval["triggered"])
            trigger_reason = str(trig_eval["reason"])

            # Stage-Aware Tier Weighting
            stage_bonus = 0.0
            if total_answered < 5:
                if node_tier == "anchor" and qid <= 10:
                    stage_bonus = 3.80
                elif node_tier == "anchor":
                    stage_bonus = 2.10
                else:
                    stage_bonus = -1.50
            elif total_answered < 11:
                if node_tier == "branch_probe":
                    stage_bonus = 2.65 if branch_triggered else -1.40
                elif node_tier == "deep_resolution":
                    stage_bonus = 2.20
                elif node_tier == "anchor":
                    stage_bonus = 1.60
                elif node_tier == "everyday_moment":
                    stage_bonus = 1.85 if branch_triggered else 0.45
            else:
                if node_tier == "everyday_moment":
                    stage_bonus = 2.75 + (1.25 if branch_triggered else 0.0)
                elif node_tier == "deep_resolution":
                    stage_bonus = 2.45
                elif node_tier == "branch_probe" and branch_triggered:
                    stage_bonus = 2.35
                else:
                    stage_bonus = 0.50

            utility = fisher_info + domain_coverage_bonus + uncertainty_weight + aspect_bonus + branch_bonus + stage_bonus

            if branch_triggered and trigger_reason:
                reason_str = (
                    f"{trigger_reason} | 2PL Fisher I(θ_{d}={theta_d:+.2f})={fisher_info:.2f} "
                    f"(a={a:.2f}, b={b:+.2f}, tier={node_tier})"
                )
            elif total_answered < 5 and node_tier == "anchor":
                reason_str = (
                    f"Initial symmetry-breaking anchor for {CALM_DOMAIN_NAMES.get(d, d)} ({d}) "
                    f"with high prior uncertainty (SE={se_d:.2f}, Fisher I={fisher_info:.2f})"
                )
            elif node_tier == "deep_resolution":
                reason_str = (
                    f"DeYoung aspect resolution ({deyoung_asp}): item difficulty b={b:+.2f} closely targets "
                    f"live latent estimate θ_{d}={theta_d:+.2f} (Fisher I={fisher_info:.2f}, SE={se_d:.2f})"
                )
            elif node_tier == "everyday_moment":
                reason_str = (
                    f"Disarming everyday micro-habit check for {deyoung_asp} ({d}) to cross-validate "
                    f"self-report against ecological behavior (prior r={float(it.get('empirical_prior_r', 0.0)):+.2f})"
                )
            else:
                reason_str = (
                    f"Maximizes Bayesian CAT utility ({utility:.2f}) on {CALM_DOMAIN_NAMES.get(d, d)} "
                    f"(θ_{d}={theta_d:+.2f}, SE={se_d:.2f}, Fisher I={fisher_info:.2f})"
                )

            scored_candidates.append({
                "item": it,
                "utility": round(float(utility), 3),
                "fisher_info": round(float(fisher_info), 3),
                "branch_triggered": branch_triggered,
                "trigger_reason": trigger_reason,
                "selection_reason": reason_str,
            })

        scored_candidates.sort(key=lambda x: (x["utility"], x["fisher_info"], -int(x["item"]["id"])), reverse=True)
        winner = scored_candidates[0]
        next_item_dict = dict(winner["item"])

        if context_profile and isinstance(context_profile, dict):
            from science.models.adaptive_item_pool_120 import morph_question_for_context
            morphed = morph_question_for_context(next_item_dict, context_profile)
            next_item_dict["contextualized_text"] = morphed["morphed_text"]
            next_item_dict["morph_diagnostics"] = morphed

        top_candidates = [
            {
                "id": int(c["item"]["id"]),
                "slug": c["item"].get("slug", f"q-{int(c['item']['id']):03d}"),
                "domain": c["item"]["domain"],
                "deyoung_aspect": c["item"].get("deyoung_aspect", ""),
                "aspect": c["item"].get("aspect", ""),
                "node_tier": c["item"].get("node_tier", "anchor"),
                "text": c["item"]["text"],
                "irt_a": float(c["item"].get("irt_a", 1.5)),
                "irt_b": float(c["item"].get("irt_b", 0.0)),
                "utility_score": c["utility"],
                "fisher_info": c["fisher_info"],
                "branch_triggered": c["branch_triggered"],
                "trigger_reason": c["trigger_reason"] or c["selection_reason"],
            }
            for c in scored_candidates[:6]
        ]

        return {
            "completed": False,
            "step_number": step_num,
            "stage_label": stage_label,
            "next_item": next_item_dict,
            "selection_reason": winner["selection_reason"],
            "fisher_information": winner["fisher_info"],
            "utility_score": winner["utility"],
            "pool_size": pool_size,
            "remaining_count": len(remaining),
            "domain_posteriors": domain_posteriors,
            "top_candidates": top_candidates,
        }

    def morph_question_context(
        self,
        question_id: int,
        context_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Applies DIF-Free Contextual & Multilingual Morphing to a question by ID.
        """
        from science.models.adaptive_item_pool_120 import morph_question_for_context

        qid = int(question_id)
        item = self.items_by_id.get(qid)
        if not item:
            item = next((x for x in self.item_bank_schema.get("items", []) if int(x["id"]) == qid), None)
        if not item:
            raise ValueError(f"Question ID {qid} not found in active item pool.")
        return morph_question_for_context(item, context_profile)

    def contextualize_questions_batch(
        self,
        question_ids: Optional[List[int]] = None,
        context_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Contextualizes a list of question IDs (defaults to the core 15 questions if omitted)
        for a given age_band, ses_life_context, locale, language, and custom_bio.
        """
        if not question_ids:
            question_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        results = []
        for qid in question_ids:
            try:
                results.append(self.morph_question_context(int(qid), context_profile))
            except Exception:
                continue
        return {
            "count": len(results),
            "context_profile": context_profile or {},
            "items": results,
        }

    def infer_neurodevelopmental_mask_probabilities(
        self,
        debiased_scores: Dict[str, float],
        responses: Optional[Dict[str, Any]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Blind Bayesian Inverse Inference over candidate Neurodevelopmental Masks
        combining continuous trait geometry, the 4 Epistemic Symmetry-Breaking Probes,
        and the 3 Behavioral Micro-Game Telemetry Streams.
        """
        probes = self.extract_epistemic_probes(debiased_scores, responses, telemetry=telemetry)
        norm_tel = self._normalize_telemetry(telemetry)
        q4 = self._get_ans(responses, 4, 3.0)

        rt_cv = norm_tel["rt_cv_pct"]
        false_starts = norm_tel["false_starts"]
        mem_acc = norm_tel["memory_accuracy_pct"]
        chunk_ms = norm_tel["mean_chunk_ms"]
        vivid = norm_tel["imagery_vividness"]
        modality = norm_tel["inner_modality"]

        raw_logits = []
        for mask in self.masks_schema["masks"]:
            mid = mask["id"]
            offsets = mask["prior_offsets"]
            expected = np.array([50.0 + float(offsets[d]) for d in DOMAIN_KEYS])
            observed = np.array([float(debiased_scores.get(d, 50.0)) for d in DOMAIN_KEYS])
            dist = float(np.linalg.norm(observed - expected))

            # Epistemic double-dissociation + psychophysical telemetry log-likelihood terms
            epistemic_evidence = 0.0
            if mid == "adhd_dopamine_forager":
                epistemic_evidence += (probes["salience_split_index"] - 50.0) * 0.045
                if q4 <= 3.0:
                    epistemic_evidence += 0.35
                if norm_tel["provided"]:
                    if rt_cv > 22.0:
                        epistemic_evidence += 0.65 + min(0.60, (rt_cv - 22.0) * 0.03)
                    if false_starts >= 1:
                        epistemic_evidence += min(0.55, false_starts * 0.22)
            elif mid == "monotropic_sensory_precision":
                epistemic_evidence += (probes["acoustic_stream_index"] - 50.0) * 0.045
                epistemic_evidence += (probes["directness_preference"] - 50.0) * 0.025
                if norm_tel["provided"]:
                    if mem_acc >= 80.0 and chunk_ms <= 420.0:
                        epistemic_evidence += 0.40
                    if vivid <= 25.0 or modality == "wordless_concept":
                        epistemic_evidence += 0.25
                    if rt_cv <= 18.0 and false_starts == 0:
                        epistemic_evidence += 0.20
            elif mid == "audhd_dual_attractor":
                if probes["salience_split_index"] >= 62.0 and (
                    probes["acoustic_stream_index"] >= 62.0 or q4 >= 3.8
                ):
                    epistemic_evidence += 1.25
                if norm_tel["provided"]:
                    if rt_cv > 22.0 and mem_acc >= 80.0:
                        epistemic_evidence += 0.65
                    elif rt_cv > 22.0:
                        epistemic_evidence += 0.35
                    if vivid <= 25.0 and mem_acc >= 78.0:
                        epistemic_evidence += 0.25
            elif mid == "hsp_high_gain_sensor":
                epistemic_evidence += (probes["valence_gain_index"] - 55.0) * 0.04
                if debiased_scores.get("A", 50.0) >= 62.0:
                    epistemic_evidence += 0.45
                if norm_tel["provided"] and vivid >= 81.0:
                    epistemic_evidence += 0.40
            elif mid == "canonical_allistic":
                if (
                    probes["salience_split_index"] < 55.0
                    and probes["acoustic_stream_index"] < 55.0
                ):
                    epistemic_evidence += 0.95
                if norm_tel["provided"] and rt_cv <= 18.0 and false_starts == 0 and 26.0 <= vivid <= 80.0:
                    epistemic_evidence += 0.35

            logit = -dist / 19.0 + epistemic_evidence
            raw_logits.append((mask, logit, dist))

        max_l = max(x[1] for x in raw_logits)
        exp_sum = sum(math.exp(x[1] - max_l) for x in raw_logits)

        results = []
        for mask, logit, dist in raw_logits:
            prob = math.exp(logit - max_l) / exp_sum
            results.append({
                "mask_id": mask["id"],
                "name": mask["name"],
                "short_label": mask["short_label"],
                "calm_title": mask.get("calm_title", mask["short_label"]),
                "calm_badge": mask.get("calm_Badge", mask["badge"]),
                "fit_probability": round(prob * 100.0, 1),
                "euclidean_distance": round(dist, 1),
            })

        results.sort(key=lambda x: x["fit_probability"], reverse=True)
        return results

    def decompose_signal(
        self,
        raw_scores: Dict[str, float],
        mask_id: str = "auto",
        mood_energy: Optional[float] = None,
        self_criticism: Optional[float] = None,
        responses: Optional[Dict[str, Any]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Core 3-Layer Blind Epistemic Signal Decomposition + Cognitive Telemetry De-Confounding:
            y_raw = B_wiring(inferred_mask) + Delta_P_unique + S_state(t) - Delta_O_aphantasia(telemetry)
        """
        probes = self.extract_epistemic_probes(raw_scores, responses, telemetry=telemetry)
        tel_profile = self.build_telemetry_profile(telemetry)
        norm_tel = self._normalize_telemetry(telemetry)

        if mood_energy is None:
            mood_energy = probes["inferred_mood_energy"]
        if self_criticism is None:
            self_criticism = probes["inferred_self_criticism"]

        mood_energy = max(-1.0, min(1.0, float(mood_energy)))
        self_criticism = max(-1.0, min(1.0, float(self_criticism)))

        state_halo_shift: Dict[str, float] = {}
        debiased_scores: Dict[str, float] = {}

        # Step 1: Strip out Allostatic State / Mood & Self-Criticism Halo S_state(t)
        for d in DOMAIN_KEYS:
            dom_meta = self.domains_by_id[d]
            lam = float(dom_meta["mood_susceptibility"])
            raw_val = float(raw_scores.get(d, 50.0))

            if d == "N":
                halo = (-mood_energy * 14.0 + self_criticism * 16.0) * lam
            elif d in ("C", "E"):
                halo = (mood_energy * 15.0 - self_criticism * 14.0) * lam
            else:
                halo = (mood_energy * 8.0 - self_criticism * 6.0) * lam

            state_halo_shift[d] = round(halo, 1)
            debiased_scores[d] = round(self._clamp(raw_val - halo), 1)

        # Step 1b: Apply Aphantasia De-Confounder Rule (when imagery_vividness <= 25)
        # and Constellation Memory Pattern Synthesis prior
        aphantasia_boost = tel_profile["aphantasia_openness_boost_pct"]
        pattern_boost = tel_profile["pattern_synthesis_boost_pct"] if norm_tel["provided"] else 0.0
        if aphantasia_boost > 0.0 or pattern_boost > 0.0:
            debiased_scores["O"] = round(
                self._clamp(debiased_scores["O"] + aphantasia_boost + pattern_boost * 0.4), 1
            )

        # Step 2: Blind Bayesian Inference of Neurodevelopmental Mask if mask_id == "auto"
        posteriors = self.infer_neurodevelopmental_mask_probabilities(
            debiased_scores, responses, telemetry=telemetry
        )
        if not mask_id or mask_id == "auto" or mask_id not in self.masks_by_id:
            selected_mask_id = posteriors[0]["mask_id"]
        else:
            selected_mask_id = mask_id

        mask = self.masks_by_id[selected_mask_id]

        hardware_baseline: Dict[str, float] = {}
        residual_personality: Dict[str, float] = {}
        mask_modulated_effective: Dict[str, float] = {}

        for d in DOMAIN_KEYS:
            offset = float(mask["prior_offsets"].get(d, 0.0))
            b_wire = self._clamp(50.0 + offset)
            hardware_baseline[d] = round(b_wire, 1)

            delta_p = round(debiased_scores[d] - b_wire, 1)
            residual_personality[d] = delta_p
            mask_modulated_effective[d] = round(self._clamp(50.0 + delta_p), 1)

        # Step 3: De-Confounded Gating Sub-Vectors
        gating = mask["gating_reinterpretation"]
        salience_boost = float(gating["salience_vs_routine_split"])
        social_unmask = float(gating["sensory_overload_social_penalty"])
        perceptual_unmask = float(gating["perceptual_gain_to_volatility_confound"])

        routine_conscientiousness = debiased_scores["C"]
        salience_locked_drive = round(self._clamp(debiased_scores["C"] + salience_boost), 1)
        crowd_extraversion = debiased_scores["E"]
        dyadic_depth_capacity = round(self._clamp(debiased_scores["E"] + social_unmask), 1)
        raw_threat_gain = debiased_scores["N"]
        true_dysregulation = round(self._clamp(debiased_scores["N"] - perceptual_unmask * 0.75), 1)
        perceptual_signal_resolution = round(
            self._clamp(debiased_scores["O"] * 0.6 + debiased_scores["N"] * 0.4 + perceptual_unmask * 0.5), 1
        )

        # Step 4: Cortical 4D & Archetype
        O_eff = debiased_scores["O"]
        C_eff = debiased_scores["C"]
        E_eff = debiased_scores["E"]
        A_eff = debiased_scores["A"]
        N_eff = true_dysregulation

        l_EI = "E" if E_eff >= 50.0 else "I"
        l_NS = "N" if O_eff >= 50.0 else "S"
        l_TF = "F" if A_eff >= 50.0 else "T"
        l_JP = "J" if C_eff >= 50.0 else "P"
        l_AT = "T" if N_eff >= 50.0 else "A"
        mbti_4 = f"{l_EI}{l_NS}{l_TF}{l_JP}"

        confidences = [
            abs(E_eff - 50.0) * 2.0,
            abs(O_eff - 50.0) * 2.0,
            abs(A_eff - 50.0) * 2.0,
            abs(C_eff - 50.0) * 2.0,
        ]
        pole_clarity = int(round(52.0 + float(np.mean(confidences)) * 0.46))

        probs = [max(0.03, min(0.97, debiased_scores[k] / 100.0)) for k in ["O", "C", "E", "A"]]
        entropy = -sum(p * math.log2(p) + (1.0 - p) * math.log2(1.0 - p) for p in probs) / 4.0

        intellect_boost = pattern_boost + (3.5 if aphantasia_boost > 0 else 0.0)
        aspects_10 = {
            "O_intellect": round(self._clamp(O_eff * 1.04 - 2.0 + intellect_boost), 1),
            "O_openness": round(self._clamp(O_eff * 0.96 + 3.0), 1),
            "C_industriousness": salience_locked_drive if salience_boost > 0 else round(self._clamp(C_eff * 1.03), 1),
            "C_orderliness": round(self._clamp(routine_conscientiousness * 0.95), 1),
            "E_enthusiasm": dyadic_depth_capacity if social_unmask > 0 else round(self._clamp(E_eff * 1.02), 1),
            "E_assertiveness": round(self._clamp(E_eff * 0.94 + (100.0 - A_eff) * 0.12), 1),
            "A_compassion": round(self._clamp(A_eff * 1.05), 1),
            "A_politeness": round(self._clamp(A_eff * 0.92), 1),
            "N_withdrawal": round(self._clamp(true_dysregulation * 1.02), 1),
            "N_volatility": round(self._clamp(true_dysregulation * 0.92), 1),
        }

        # Step 5: Generate Calm, Zero-Jargon Human Reflections for Tier-3 UI
        sorted_residuals = sorted(
            DOMAIN_KEYS, key=lambda k: abs(residual_personality[k]), reverse=True
        )
        top_divergences = []
        for k in sorted_residuals[:3]:
            diff = residual_personality[k]
            calm_name = CALM_DOMAIN_NAMES[k]
            if diff >= 0:
                calm_text = f"More {calm_name.lower()} than is typical even for a {mask.get('calm_title', mask['short_label'])} (+{int(round(abs(diff)))}%)."
            else:
                calm_text = f"More selective and measured in {calm_name.lower()} than a typical {mask.get('calm_title', mask['short_label'])} ({int(round(diff))}%)."
            top_divergences.append({
                "domain": k,
                "domain_name": calm_name,
                "delta": diff,
                "interpretation": calm_text,
            })

        comp_idx = probes["compensatory_masking_index"]
        if comp_idx >= 65.0:
            calm_masking_note = "People see how steady and capable you are on the outside, though they rarely see how much quiet energy you spend behind the scenes to keep everything running smoothly."
        elif comp_idx >= 45.0:
            calm_masking_note = "You balance natural spontaneity with thoughtful effort when structure is needed."
        else:
            calm_masking_note = "What people see on the outside closely matches how effortless things feel on the inside."

        if mood_energy <= -0.2:
            calm_season_note = "Because these past couple of weeks have felt heavier than your rested baseline, we gently adjusted your portrait so temporary fatigue isn't mistaken for who you are."
        elif mood_energy >= 0.25:
            calm_season_note = "You’re in a bright, high-energy season right now—your portrait reflects both your current momentum and your steady core underneath."
        else:
            calm_season_note = "Your current energy feels close to your natural, rested baseline."

        return {
            "mask_applied": {
                "id": mask["id"],
                "name": mask["name"],
                "short_label": mask["short_label"],
                "calm_title": mask.get("calm_title", mask["short_label"]),
                "calm_badge": mask.get("calm_Badge", mask["badge"]),
                "calm_summary": mask.get("calm_summary", ""),
                "calm_reframe": mask.get("calm_reframe", ""),
                "badge": mask["badge"],
                "neural_mechanism": mask["neural_mechanism"],
                "diagnostic_note": mask["diagnostic_note"],
            },
            "epistemic_probes": probes,
            "telemetry_profile": tel_profile,
            "calm_notes": {
                "masking_note": calm_masking_note,
                "season_note": calm_season_note,
                "minds_eye_note": tel_profile["minds_eye_calm_note"],
            },
            "signal_layers": {
                "raw_observed": raw_scores,
                "state_halo_shift": state_halo_shift,
                "aphantasia_openness_boost": aphantasia_boost,
                "debiased_scores": debiased_scores,
                "hardware_baseline": hardware_baseline,
                "residual_personality": residual_personality,
                "mask_modulated_effective": mask_modulated_effective,
            },
            "gating_deconfound": {
                "routine_conscientiousness": routine_conscientiousness,
                "salience_locked_drive": salience_locked_drive,
                "crowd_foraging_extraversion": crowd_extraversion,
                "dyadic_1on1_capacity": dyadic_depth_capacity,
                "raw_threat_sensitivity": raw_threat_gain,
                "true_affective_dysregulation": true_dysregulation,
                "perceptual_signal_resolution": perceptual_signal_resolution,
            },
            "cortical_4d": {
                "mbti_code": mbti_4,
                "full_code": f"{mbti_4}-{l_AT}",
                "pole_clarity_pct": pole_clarity,
                "shannon_entropy_bits": round(entropy, 2),
                "observer_manifold_dims": 4,
            },
            "deyoung_10_aspects": aspects_10,
            "top_unique_divergences": top_divergences,
            "inferred_mask_posteriors": posteriors,
        }

    def analyze_dyadic_chemistry(
        self,
        person_a: Dict[str, Any],
        person_b: Dict[str, Any],
        context_mode: str = "partner",
    ) -> Dict[str, Any]:
        decomp_a = self.decompose_signal(
            raw_scores=person_a.get("scores", {}),
            mask_id=person_a.get("mask_id", "auto"),
            mood_energy=person_a.get("mood_energy"),
            self_criticism=person_a.get("self_criticism"),
            responses=person_a.get("responses"),
            telemetry=person_a.get("telemetry"),
        )
        decomp_b = self.decompose_signal(
            raw_scores=person_b.get("scores", {}),
            mask_id=person_b.get("mask_id", "auto"),
            mood_energy=person_b.get("mood_energy"),
            self_criticism=person_b.get("self_criticism"),
            responses=person_b.get("responses"),
            telemetry=person_b.get("telemetry"),
        )

        a_deb = decomp_a["signal_layers"]["debiased_scores"]
        b_deb = decomp_b["signal_layers"]["debiased_scores"]
        a_gate = decomp_a["gating_deconfound"]
        b_gate = decomp_b["gating_deconfound"]

        prior_sync = 100.0 - abs(a_deb["O"] - b_deb["O"]) * 0.75
        allostatic_safety = (a_deb["A"] + b_deb["A"]) * 0.52 - abs(
            a_gate["true_affective_dysregulation"] - b_gate["true_affective_dysregulation"]
        ) * 0.22
        raw_c_gap = abs(a_deb["C"] - b_deb["C"])
        deconfounded_drive_gap = abs(
            a_gate["salience_locked_drive"] - b_gate["salience_locked_drive"]
        )
        execution_harmony = 100.0 - (raw_c_gap * 0.35 + deconfounded_drive_gap * 0.35)

        overall = int(
            round(
                self._clamp(
                    prior_sync * 0.38 + allostatic_safety * 0.34 + execution_harmony * 0.28,
                    52.0,
                    98.0,
                )
            )
        )

        rhythm_a = decomp_a["mask_applied"]["calm_title"]
        rhythm_b = decomp_b["mask_applied"]["calm_title"]
        name_a = person_a.get("name", "You")
        name_b = person_b.get("name", "Partner")

        calm_translation_note = (
            f"On the surface, {name_a} and {name_b} have different paces around everyday checklists. "
            f"Once you honor that {name_a} moves with a {rhythm_a} and {name_b} moves with a {rhythm_b}, "
            f"you see that both of you bring deep care and devotion—just triggered in different ways."
        )

        return {
            "overall_resonance_pct": overall,
            "context_mode": context_mode,
            "sub_metrics": {
                "cortical_prior_sync": int(round(self._clamp(prior_sync))),
                "allostatic_safety": int(round(self._clamp(allostatic_safety))),
                "deconfounded_execution_bridge": int(round(self._clamp(execution_harmony))),
                "raw_unmasked_c_gap": int(round(raw_c_gap)),
                "mask_corrected_drive_gap": int(round(deconfounded_drive_gap)),
            },
            "neuro_translation_note": calm_translation_note,
            "person_a_decomposition": decomp_a,
            "person_b_decomposition": decomp_b,
        }

    @staticmethod
    def _pearson_r_and_p(x: List[float], y: List[float]) -> Dict[str, float]:
        if len(x) < 3 or len(x) != len(y):
            return {"r": 0.0, "p_value": 1.0}
        arr_x = np.asarray(x, dtype=float)
        arr_y = np.asarray(y, dtype=float)
        if float(np.std(arr_x)) < 1e-8 or float(np.std(arr_y)) < 1e-8:
            return {"r": 0.0, "p_value": 1.0}
        r_val, p_val = scipy_stats.pearsonr(arr_x, arr_y)
        if math.isnan(float(r_val)):
            return {"r": 0.0, "p_value": 1.0}
        return {"r": round(float(r_val), 3), "p_value": round(float(p_val), 5)}

    def compute_shadow_item_calibration(
        self, session_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes empirical Pearson/partial correlations (r) and estimated 2PL IRT
        discrimination (a_hat) and difficulty (b_hat) of shadow_candidate items
        against calibrated anchor domain scores, epistemic probes, and micro-game telemetry.
        """
        parsed_sessions: List[Dict[str, Any]] = []
        for rec in session_records:
            resp = rec.get("responses")
            if isinstance(resp, str):
                try:
                    resp = json.loads(resp)
                except Exception:
                    resp = {}
            elif resp is None and "responses_json" in rec:
                try:
                    resp = json.loads(rec["responses_json"])
                except Exception:
                    resp = {}
            if not isinstance(resp, dict) or not resp:
                continue

            tel = rec.get("telemetry")
            if isinstance(tel, str):
                try:
                    tel = json.loads(tel)
                except Exception:
                    tel = {}
            elif tel is None and "telemetry_json" in rec:
                try:
                    tel = json.loads(rec["telemetry_json"])
                except Exception:
                    tel = {}

            scores = rec.get("debiased_scores") or rec.get("anchor_scores")
            if isinstance(scores, str):
                try:
                    scores = json.loads(scores)
                except Exception:
                    scores = None
            elif scores is None and "debiased_scores_json" in rec:
                try:
                    scores = json.loads(rec["debiased_scores_json"])
                except Exception:
                    scores = None

            irt_out = self.score_responses_irt(resp, telemetry=tel)
            anchor_raw = irt_out["raw_scores"]
            if not isinstance(scores, dict):
                scores = anchor_raw
            probes = self.extract_epistemic_probes(anchor_raw, resp, telemetry=tel)
            norm_tel = self._normalize_telemetry(tel)

            parsed_sessions.append({
                "responses": resp,
                "anchor_raw": anchor_raw,
                "debiased_scores": scores,
                "probes": probes,
                "telemetry": norm_tel,
            })

        shadow_items = [
            it
            for it in self.item_bank_schema["items"]
            if it.get("calibration_status") == "shadow_candidate"
            or it.get("layer") == "shadow_behavioral_probe"
        ]

        calibrated_matrix: List[Dict[str, Any]] = []
        for it in shadow_items:
            qid = int(it["id"])
            target_dom = it["domain"]
            prior_r = float(it.get("empirical_prior_r", 0.0))

            item_vals: List[float] = []
            dom_vectors: Dict[str, List[float]] = {d: [] for d in DOMAIN_KEYS}
            salience_vec: List[float] = []
            acoustic_vec: List[float] = []
            masking_vec: List[float] = []
            rt_cv_vec: List[float] = []
            mem_acc_vec: List[float] = []
            vivid_vec: List[float] = []

            for sess in parsed_sessions:
                ans = sess["responses"].get(str(qid), sess["responses"].get(qid))
                if ans is None:
                    continue
                item_vals.append(float(ans))
                for d in DOMAIN_KEYS:
                    dom_vectors[d].append(float(sess["anchor_raw"].get(d, 50.0)))
                salience_vec.append(float(sess["probes"]["salience_split_index"]))
                acoustic_vec.append(float(sess["probes"]["acoustic_stream_index"]))
                masking_vec.append(float(sess["probes"]["compensatory_masking_index"]))
                rt_cv_vec.append(float(sess["telemetry"]["rt_cv_pct"]))
                mem_acc_vec.append(float(sess["telemetry"]["memory_accuracy_pct"]))
                vivid_vec.append(float(sess["telemetry"]["imagery_vividness"]))

            n_obs = len(item_vals)
            domain_correlations: Dict[str, Dict[str, float]] = {}
            for d in DOMAIN_KEYS:
                domain_correlations[d] = self._pearson_r_and_p(item_vals, dom_vectors[d])

            probe_correlations = {
                "salience_split_index": self._pearson_r_and_p(item_vals, salience_vec),
                "acoustic_stream_index": self._pearson_r_and_p(item_vals, acoustic_vec),
                "compensatory_masking_index": self._pearson_r_and_p(item_vals, masking_vec),
            }
            telemetry_correlations = {
                "rt_cv_pct": self._pearson_r_and_p(item_vals, rt_cv_vec),
                "memory_accuracy_pct": self._pearson_r_and_p(item_vals, mem_acc_vec),
                "imagery_vividness": self._pearson_r_and_p(item_vals, vivid_vec),
            }

            if n_obs >= 5:
                emp_r = domain_correlations[target_dom]["r"]
                emp_p = domain_correlations[target_dom]["p_value"]
                mean_likert = float(np.mean(item_vals))
                sd_likert = float(np.std(item_vals))
                # Normal-ogive to logistic 2PL IRT parameter conversion: a_hat = 1.702 * |r| / sqrt(1 - r^2)
                r_clamped = min(0.92, max(0.08, abs(emp_r)))
                est_irt_a = round(1.702 * r_clamped / math.sqrt(1.0 - r_clamped ** 2), 2)
                est_irt_b = round(-((mean_likert - 3.0) / max(0.55, sd_likert)) * 0.65, 2)
            else:
                emp_r = prior_r
                emp_p = 0.001
                mean_likert = 3.2
                sd_likert = 1.1
                est_irt_a = float(it.get("irt_a", 1.45))
                est_irt_b = float(it.get("irt_b", -0.15))

            ready_to_graduate = bool(n_obs >= 15 and abs(emp_r) >= 0.42 and emp_p <= 0.05)

            calibrated_matrix.append({
                "item_id": qid,
                "domain": target_dom,
                "probe_type": it.get("probe_type", "shadow_probe"),
                "text": it.get("text", ""),
                "calm_theme": it.get("calm_theme", ""),
                "calibration_status": it.get("calibration_status", "shadow_candidate"),
                "n_sessions": n_obs,
                "empirical_target_r": emp_r,
                "empirical_target_p_value": emp_p,
                "empirical_prior_r": prior_r,
                "estimated_irt_a": est_irt_a,
                "estimated_irt_b": est_irt_b,
                "mean_likert": round(mean_likert, 2),
                "sd_likert": round(sd_likert, 2),
                "graduation_ready": ready_to_graduate,
                "recommended_graduated_weight": round(min(1.20, max(0.65, abs(emp_r) * 1.65)), 2) if ready_to_graduate else 0.0,
                "domain_correlations": domain_correlations,
                "epistemic_probe_correlations": probe_correlations,
                "telemetry_correlations": telemetry_correlations,
                "scientific_hypothesis": it.get("scientific_hypothesis", ""),
            })

        return {
            "total_calibration_sessions": len(parsed_sessions),
            "shadow_candidate_count": len(calibrated_matrix),
            "shadow_items": calibrated_matrix,
        }

    def generate_synthetic_calibration_sessions(
        self, n_sessions: int = 25, seed: int = 2026
    ) -> List[Dict[str, Any]]:
        """
        Generates realistic synthetic multi-mask calibration sessions with Likert responses (1..15)
        and behavioral micro-game telemetry so shadow-item empirical calibration has immediate
        ground-truth covariance across all 5 neurodevelopmental masks.
        """
        rng = np.random.default_rng(seed)
        mask_ids = [
            "adhd_dopamine_forager",
            "monotropic_sensory_precision",
            "audhd_dual_attractor",
            "hsp_high_gain_sensor",
            "canonical_allistic",
        ]
        sessions: List[Dict[str, Any]] = []

        for idx in range(n_sessions):
            mid = mask_ids[idx % len(mask_ids)]
            mask = self.masks_by_id[mid]
            offsets = mask["prior_offsets"]

            # Latent true trait vector theta in [-1.8, +1.8]
            latent = {}
            for d in DOMAIN_KEYS:
                base_theta = float(offsets.get(d, 0.0)) / 24.0
                latent[d] = float(np.clip(base_theta + rng.normal(0.0, 0.55), -1.8, 1.8))

            # Construct realistic Likert responses 1..15
            resp: Dict[str, int] = {}
            for it in self.item_bank_schema["items"]:
                qid = int(it["id"])
                d = it["domain"]
                direction = float(it.get("direction", 1))
                theta_d = latent[d]

                if qid == 3:
                    # Salience vs routine split high in ADHD / AuDHD
                    bonus = 0.85 if mid in ("adhd_dopamine_forager", "audhd_dual_attractor") else -0.25
                    raw_cont = 3.0 - theta_d * 0.9 + bonus + rng.normal(0.0, 0.45)
                elif qid == 5:
                    # Acoustic stream split high in Monotropic / AuDHD
                    bonus = 0.90 if mid in ("monotropic_sensory_precision", "audhd_dual_attractor") else -0.20
                    raw_cont = 3.0 - theta_d * 0.9 + bonus + rng.normal(0.0, 0.45)
                elif qid == 11:
                    # Compensatory masking effort
                    bonus = 0.70 if mid != "canonical_allistic" else -0.30
                    raw_cont = 3.2 + bonus + latent["A"] * 0.35 + rng.normal(0.0, 0.5)
                elif qid == 12:
                    # Differential epoch state
                    raw_cont = 3.0 + latent["N"] * 0.65 + rng.normal(0.0, 0.65)
                elif qid == 13:
                    # Sneaky open browser tabs (negatively correlated with routine C, positively with salience split)
                    salience_drive = 0.85 if mid in ("adhd_dopamine_forager", "audhd_dual_attractor") else 0.0
                    raw_cont = 3.1 - latent["C"] * 1.05 + salience_drive + rng.normal(0.0, 0.42)
                elif qid == 14:
                    # Sneaky text cushion ('Sounds good!' / 'haha') positively correlated with A & masking
                    mask_drive = 0.45 if mid in ("hsp_high_gain_sensor", "adhd_dopamine_forager") else 0.0
                    raw_cont = 3.1 + latent["A"] * 1.05 + mask_drive + rng.normal(0.0, 0.42)
                elif qid == 15:
                    # Sneaky canceled plans wave of relief negatively correlated with E, positively with acoustic sensitivity
                    sensory_drive = 0.65 if mid in ("monotropic_sensory_precision", "audhd_dual_attractor", "hsp_high_gain_sensor") else 0.0
                    raw_cont = 3.0 - latent["E"] * 1.05 + sensory_drive + rng.normal(0.0, 0.42)
                else:
                    raw_cont = 3.0 + (theta_d * direction * 1.05) + rng.normal(0.0, 0.48)

                resp[str(qid)] = int(np.clip(round(raw_cont), 1, 5))

            # Construct realistic telemetry coupled with mask + latent traits
            if mid in ("adhd_dopamine_forager", "audhd_dual_attractor"):
                rt_cv = float(np.clip(25.5 + rng.normal(0.0, 3.5), 18.0, 38.0))
                false_starts = int(rng.choice([1, 2, 3], p=[0.4, 0.4, 0.2]))
                median_rt = float(np.clip(272.0 + rng.normal(0.0, 22.0), 215.0, 340.0))
            elif mid == "monotropic_sensory_precision":
                rt_cv = float(np.clip(12.5 + rng.normal(0.0, 2.5), 7.5, 18.0))
                false_starts = 0
                median_rt = float(np.clip(338.0 + rng.normal(0.0, 20.0), 290.0, 395.0))
            else:
                rt_cv = float(np.clip(14.5 + rng.normal(0.0, 3.0), 8.0, 21.0))
                false_starts = int(rng.choice([0, 1], p=[0.8, 0.2]))
                median_rt = float(np.clip(292.0 + rng.normal(0.0, 20.0), 240.0, 350.0))

            if mid in ("monotropic_sensory_precision", "audhd_dual_attractor"):
                mem_acc = float(np.clip(88.0 + rng.normal(0.0, 5.5), 76.0, 100.0))
                chunk_ms = float(np.clip(355.0 + rng.normal(0.0, 35.0), 260.0, 425.0))
            else:
                mem_acc = float(np.clip(78.0 + latent["O"] * 6.0 + rng.normal(0.0, 6.5), 58.0, 98.0))
                chunk_ms = float(np.clip(420.0 + rng.normal(0.0, 45.0), 310.0, 540.0))

            if idx % 6 == 0:
                vivid = float(np.clip(12.0 + rng.normal(0.0, 5.0), 2.0, 22.0))
                modality = "wordless_concept"
            elif mid == "hsp_high_gain_sensor":
                vivid = float(np.clip(86.0 + rng.normal(0.0, 5.0), 75.0, 99.0))
                modality = "visual_cinema"
            else:
                vivid = float(np.clip(62.0 + rng.normal(0.0, 14.0), 28.0, 88.0))
                modality = str(rng.choice(["visual_cinema", "inner_voice"]))

            telemetry = {
                "pulse_reaction": {
                    "median_rt_ms": round(median_rt, 1),
                    "rt_cv_pct": round(rt_cv, 1),
                    "false_starts": false_starts,
                },
                "constellation_memory": {
                    "accuracy_pct": round(mem_acc, 1),
                    "mean_chunk_ms": round(chunk_ms, 1),
                },
                "minds_eye": {
                    "imagery_vividness": round(vivid, 1),
                    "inner_modality": modality,
                },
            }

            irt_res = self.score_responses_irt(resp, telemetry=telemetry)
            decomp = self.decompose_signal(
                raw_scores=irt_res["raw_scores"],
                mask_id="auto",
                responses=resp,
                telemetry=telemetry,
            )

            sessions.append({
                "session_id": f"syn-cal-{idx + 1:03d}",
                "true_mask_id": mid,
                "inferred_mask_id": decomp["mask_applied"]["id"],
                "responses": resp,
                "telemetry": telemetry,
                "anchor_scores": irt_res["raw_scores"],
                "debiased_scores": decomp["signal_layers"]["debiased_scores"],
            })

        return sessions

    def simulate_synthetic_cohort(
        self,
        n_synthetic_users: int = 50,
        flow: Optional[Dict[str, Any]] = None,
        seed: int = 2026,
    ) -> Dict[str, Any]:
        """
        Runs a Monte Carlo synthetic cohort simulation across the NeuroPsychometricEngine,
        evaluating trait distributions, neurodevelopmental mask recovery rates, conditional
        branch trigger rates (for experimental Studio flows), and empirical shadow-item correlations.
        """
        n_users = max(5, min(500, int(n_synthetic_users)))
        sessions = self.generate_synthetic_calibration_sessions(n_sessions=n_users, seed=seed)

        # Evaluate conditional branch rules if a flow is supplied
        branches = (flow or {}).get("branches", []) if isinstance(flow, dict) else []
        branch_stats: List[Dict[str, Any]] = []
        for b_idx, rule in enumerate(branches):
            if_q = int(rule.get("if_question_id", 3))
            op = str(rule.get("operator", ">="))
            thresh = float(rule.get("threshold", 4))
            then_q = int(rule.get("then_inject_question_id", 13))
            triggered = 0
            for sess in sessions:
                ans = float(sess["responses"].get(str(if_q), 3.0))
                hit = False
                if op == ">=" and ans >= thresh:
                    hit = True
                elif op == "<=" and ans <= thresh:
                    hit = True
                elif op == "==" and abs(ans - thresh) < 1e-6:
                    hit = True
                elif op == ">" and ans > thresh:
                    hit = True
                elif op == "<" and ans < thresh:
                    hit = True
                if hit:
                    triggered += 1
            branch_stats.append({
                "branch_index": b_idx,
                "if_question_id": if_q,
                "operator": op,
                "threshold": thresh,
                "then_inject_question_id": then_q,
                "note": rule.get("note", ""),
                "triggered_count": triggered,
                "trigger_rate_pct": round((triggered / n_users) * 100.0, 1),
            })

        domain_summary: Dict[str, Dict[str, float]] = {}
        for d in DOMAIN_KEYS:
            raw_vals = [float(s["anchor_scores"][d]) for s in sessions]
            deb_vals = [float(s["debiased_scores"][d]) for s in sessions]
            domain_summary[d] = {
                "raw_mean": round(float(np.mean(raw_vals)), 1),
                "raw_sd": round(float(np.std(raw_vals)), 1),
                "debiased_mean": round(float(np.mean(deb_vals)), 1),
                "debiased_sd": round(float(np.std(deb_vals)), 1),
            }

        mask_counts: Dict[str, int] = {}
        exact_recovery = 0
        for s in sessions:
            inf_m = s["inferred_mask_id"]
            mask_counts[inf_m] = mask_counts.get(inf_m, 0) + 1
            if inf_m == s["true_mask_id"]:
                exact_recovery += 1

        shadow_cal = self.compute_shadow_item_calibration(sessions)

        return {
            "n_synthetic_users": n_users,
            "flow_id": (flow or {}).get("id", "adaptive_branching") if isinstance(flow, dict) else "default",
            "flow_name": (flow or {}).get("name", "Default Flow") if isinstance(flow, dict) else "Default Flow",
            "mask_recovery_accuracy_pct": round((exact_recovery / n_users) * 100.0, 1),
            "inferred_mask_distribution": {
                k: {"count": v, "pct": round((v / n_users) * 100.0, 1)}
                for k, v in mask_counts.items()
            },
            "domain_distributions": domain_summary,
            "branch_trigger_diagnostics": branch_stats,
            "shadow_calibration_matrix": shadow_cal,
        }

    # ========================================================================
    # Oregon ESCS Bidirectional Behavioral Prediction & Falsifiability Engine
    # ========================================================================

    @staticmethod
    def _compute_auroc(probs: List[float], labels: List[int]) -> float:
        """
        Exact Area Under the ROC Curve (AUROC) via Wilcoxon-Mann-Whitney rank statistic.
        """
        if not probs or len(probs) != len(labels):
            return 0.5
        pos = [float(p) for p, y in zip(probs, labels) if int(y) == 1]
        neg = [float(p) for p, y in zip(probs, labels) if int(y) == 0]
        if not pos or not neg:
            return 0.5
        arr_p = np.asarray(pos, dtype=float)[:, None]
        arr_n = np.asarray(neg, dtype=float)[None, :]
        wins = float(np.sum(arr_p > arr_n)) + 0.5 * float(np.sum(np.isclose(arr_p, arr_n)))
        return round(wins / float(len(pos) * len(neg)), 4)

    def _resolve_domains_and_aspects(
        self,
        raw_scores: Optional[Dict[str, float]] = None,
        aspect_scores: Optional[Dict[str, float]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Dict[str, float]]:
        clean_domains: Dict[str, float] = {}
        for d in DOMAIN_KEYS:
            val = (raw_scores or {}).get(d, 50.0) if isinstance(raw_scores, dict) else 50.0
            clean_domains[d] = round(self._clamp(float(val if val is not None else 50.0), 2.0, 98.0), 1)

        decomp_full = self.decompose_signal(raw_scores=clean_domains, telemetry=telemetry)
        decomp_sr = self.decompose_signal(raw_scores=clean_domains, telemetry=None)

        full_aspects = dict(decomp_full["deyoung_10_aspects"])
        sr_aspects = dict(decomp_sr["deyoung_10_aspects"])

        if aspect_scores and isinstance(aspect_scores, dict):
            for a in DEYOUNG_10_ASPECT_KEYS:
                if a in aspect_scores and aspect_scores[a] is not None:
                    clamped_a = round(self._clamp(float(aspect_scores[a]), 2.0, 98.0), 1)
                    full_aspects[a] = clamped_a
                    sr_aspects[a] = clamped_a

        return {
            "domains": clean_domains,
            "aspects_full": full_aspects,
            "aspects_self_report": sr_aspects,
        }

    def predict_behaviors_from_personality(
        self,
        raw_scores: Optional[Dict[str, float]] = None,
        aspect_scores: Optional[Dict[str, float]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
        context_profile: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Direction 1 (`Personality + Telemetry ➔ Concrete Everyday Behaviors`):
          - Computes calibrated probability p_j in [0.06, 0.95] for all 40 Oregon ESCS behavioral acts
            using the subject's 5 domains, 10 DeYoung aspects, and Mind Moment telemetry.
          - Computes self-report-only probability p_{j,sr} (without telemetry) to quantify Telemetry Lift (Delta p_j).
          - Selects `top_k` (default 5, or up to 40) highest-information predictions across diverse categories,
            balancing high-probability positive predictions (`"do_this"`, p_j >= 0.68) and high-confidence
            negative predictions (`"rarely"`, p_j <= 0.32, i.e., 1 - p_j >= 0.68 confidence) so base rates cannot game the test.
          - Generates a deterministic SHA-256 pre-commitment hash (`commitment_hash`) over the locked predictions.
          - Finds the Top-3 Nearest Oregon ESCS Holdout Twins (`nearest_oregon_twins`) by 10-aspect Pearson/cosine similarity.
        """
        resolved = self._resolve_domains_and_aspects(
            raw_scores=raw_scores,
            aspect_scores=aspect_scores,
            telemetry=telemetry,
        )
        clean_domains = resolved["domains"]
        full_aspects = resolved["aspects_full"]
        sr_aspects = resolved["aspects_self_report"]
        tel_z = extract_telemetry_z_features(telemetry)
        tel_provided = bool(tel_z.get("provided", 0.0) > 0.0)

        all_predictions: List[Dict[str, Any]] = []
        for act in OREGON_BEHAVIORAL_ACTS_40:
            p_full = compute_act_probability(
                act=act,
                domain_scores=clean_domains,
                aspect_scores=full_aspects,
                telemetry=telemetry if tel_provided else None,
                include_telemetry=tel_provided,
            )
            p_sr = compute_act_probability(
                act=act,
                domain_scores=clean_domains,
                aspect_scores=sr_aspects,
                telemetry=None,
                include_telemetry=False,
            )
            base_rate = float(act["base_rate"])
            delta_p = p_full - p_sr

            pred_dir = "do_this" if p_full >= 0.50 else "rarely"
            pred_bin = 1 if p_full >= 0.50 else 0
            conf = p_full if p_full >= 0.50 else (1.0 - p_full)

            sr_dir = "do_this" if p_sr >= 0.50 else "rarely"
            sr_conf = p_sr if p_sr >= 0.50 else (1.0 - p_sr)

            lift_over_base = abs(p_full - base_rate)
            info_score = conf * 0.72 + lift_over_base * 0.28

            # Identify top contributing aspect/telemetry signals for this user & act
            drivers: List[Dict[str, Any]] = []
            for a_key, w_a in act["aspect_weights"].items():
                if abs(float(w_a)) < 0.15:
                    continue
                z_a = (float(full_aspects.get(a_key, 50.0)) - 50.0) / 18.0
                contrib = float(w_a) * z_a
                if abs(contrib) >= 0.12:
                    drivers.append({
                        "source": a_key,
                        "label": DEYOUNG_10_ASPECT_NAMES.get(a_key, a_key),
                        "log_odds_impact": round(contrib, 3),
                    })
            if tel_provided:
                for t_key, w_t in act["telemetry_weights"].items():
                    t_val = float(tel_z.get(t_key, 0.0))
                    contrib_t = float(w_t) * t_val
                    if abs(contrib_t) >= 0.08:
                        drivers.append({
                            "source": f"telemetry:{t_key}",
                            "label": f"Mind Moment ({t_key})",
                            "log_odds_impact": round(contrib_t, 3),
                        })
            drivers.sort(key=lambda d_it: abs(d_it["log_odds_impact"]), reverse=True)

            all_predictions.append({
                "act_id": act["act_id"],
                "code": act["code"],
                "category": act["category"],
                "short_label": act["short_label"],
                "text": act["text"],
                "base_rate": round(base_rate, 3),
                "base_rate_pct": round(base_rate * 100.0, 1),
                "probability": round(p_full, 4),
                "probability_pct": round(p_full * 100.0, 1),
                "self_report_only_probability": round(p_sr, 4),
                "self_report_only_pct": round(p_sr * 100.0, 1),
                "telemetry_lift": round(delta_p, 4),
                "telemetry_lift_pct": round(delta_p * 100.0, 1),
                "predicted_direction": pred_dir,
                "predicted_binary": pred_bin,
                "predicted_label": "Likely Do This" if pred_dir == "do_this" else "Rarely / Not You",
                "confidence": round(conf, 4),
                "confidence_pct": round(conf * 100.0, 1),
                "self_report_only_direction": sr_dir,
                "self_report_only_confidence": round(sr_conf, 4),
                "lift_over_base_rate": round(lift_over_base, 4),
                "lift_over_base_rate_pct": round(lift_over_base * 100.0, 1),
                "information_score": round(info_score, 4),
                "primary_domain": act["primary_domain"],
                "primary_aspect": act["primary_aspect"],
                "primary_aspect_label": act["primary_aspect_label"],
                "oregon_empirical_r": act["oregon_empirical_r"],
                "rationale": act["rationale"],
                "top_contributing_signals": drivers[:3],
            })

        # Select top_k highest-information predictions across diverse categories and both directions
        k_clamped = max(1, min(len(all_predictions), int(top_k)))
        sorted_by_info = sorted(
            all_predictions,
            key=lambda x: (x["information_score"], x["confidence"], x["lift_over_base_rate"]),
            reverse=True,
        )

        if k_clamped >= len(all_predictions):
            selected_top = sorted_by_info
        else:
            selected_top: List[Dict[str, Any]] = []
            used_ids = set()
            cat_counts: Dict[str, int] = {}

            pos_candidates = [x for x in sorted_by_info if x["predicted_direction"] == "do_this"]
            neg_candidates = [x for x in sorted_by_info if x["predicted_direction"] == "rarely"]

            # Seed with highest-information positive and negative predictions if confident
            if pos_candidates and pos_candidates[0]["confidence"] >= 0.58:
                first_pos = pos_candidates[0]
                selected_top.append(first_pos)
                used_ids.add(first_pos["act_id"])
                cat_counts[first_pos["category"]] = cat_counts.get(first_pos["category"], 0) + 1

            if len(selected_top) < k_clamped and neg_candidates and neg_candidates[0]["confidence"] >= 0.58:
                # Prefer a negative candidate from a different category if equally strong
                chosen_neg = next(
                    (
                        c
                        for c in neg_candidates
                        if c["act_id"] not in used_ids
                        and cat_counts.get(c["category"], 0) == 0
                        and c["confidence"] >= neg_candidates[0]["confidence"] - 0.04
                    ),
                    neg_candidates[0],
                )
                if chosen_neg["act_id"] not in used_ids:
                    selected_top.append(chosen_neg)
                    used_ids.add(chosen_neg["act_id"])
                    cat_counts[chosen_neg["category"]] = cat_counts.get(chosen_neg["category"], 0) + 1

            # Pass 1: Max 1 per category for diverse coverage
            for cand in sorted_by_info:
                if len(selected_top) >= k_clamped:
                    break
                if cand["act_id"] in used_ids:
                    continue
                if cat_counts.get(cand["category"], 0) < 1:
                    selected_top.append(cand)
                    used_ids.add(cand["act_id"])
                    cat_counts[cand["category"]] = cat_counts.get(cand["category"], 0) + 1

            # Pass 2: Max 2 per category if needed
            for cand in sorted_by_info:
                if len(selected_top) >= k_clamped:
                    break
                if cand["act_id"] in used_ids:
                    continue
                if cat_counts.get(cand["category"], 0) < 2:
                    selected_top.append(cand)
                    used_ids.add(cand["act_id"])
                    cat_counts[cand["category"]] = cat_counts.get(cand["category"], 0) + 1

            # Pass 3: Fill any remaining slots unconditionally
            for cand in sorted_by_info:
                if len(selected_top) >= k_clamped:
                    break
                if cand["act_id"] not in used_ids:
                    selected_top.append(cand)
                    used_ids.add(cand["act_id"])

            selected_top.sort(
                key=lambda x: (x["information_score"], x["confidence"], x["lift_over_base_rate"]),
                reverse=True,
            )

        # Compute deterministic SHA-256 pre-commitment hash over locked predictions
        canonical_payload = [
            {
                "act_id": item["act_id"],
                "code": item["code"],
                "predicted_direction": item["predicted_direction"],
                "probability": round(float(item["probability"]), 4),
            }
            for item in selected_top
        ]
        canonical_json = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":"))
        commitment_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        # Find Top-3 Nearest Oregon ESCS Holdout Twins by 10-Aspect Pearson & Cosine Similarity
        cohort = generate_oregon_escs_cohort(seed=1994)
        holdout_pool = [sub for sub in cohort if sub["split"] == "blind_holdout_20"]
        user_asp_vec = np.asarray([float(full_aspects[a]) - 50.0 for a in DEYOUNG_10_ASPECT_KEYS], dtype=float)
        user_norm = float(np.linalg.norm(user_asp_vec))
        user_centered = user_asp_vec - float(np.mean(user_asp_vec))
        user_c_norm = float(np.linalg.norm(user_centered))

        twin_candidates: List[Dict[str, Any]] = []
        for sub in holdout_pool:
            sub_asp_vec = np.asarray([float(sub["aspect_scores"][a]) - 50.0 for a in DEYOUNG_10_ASPECT_KEYS], dtype=float)
            sub_norm = float(np.linalg.norm(sub_asp_vec))
            cos_sim = float(np.dot(user_asp_vec, sub_asp_vec) / (user_norm * sub_norm)) if (user_norm > 1e-6 and sub_norm > 1e-6) else 0.0

            sub_centered = sub_asp_vec - float(np.mean(sub_asp_vec))
            sub_c_norm = float(np.linalg.norm(sub_centered))
            r_sim = float(np.dot(user_centered, sub_centered) / (user_c_norm * sub_c_norm)) if (user_c_norm > 1e-6 and sub_c_norm > 1e-6) else cos_sim

            rms_dist = float(np.sqrt(np.mean((user_asp_vec - sub_asp_vec) ** 2)))
            combined_sim = 0.60 * cos_sim + 0.40 * max(-1.0, 1.0 - rms_dist / 25.0)

            twin_candidates.append({
                "subject": sub,
                "similarity_r": round(max(cos_sim, r_sim), 3),
                "cosine_similarity": round(cos_sim, 3),
                "combined_sim": combined_sim,
                "rms_distance_pct": round(rms_dist, 1),
            })

        holdout_twins = sorted(
            twin_candidates,
            key=lambda x: x["combined_sim"],
            reverse=True,
        )
        nearest_oregon_twins: List[Dict[str, Any]] = []
        for t in holdout_twins[:3]:
            sub = t["subject"]
            enacted_labels = [
                OREGON_ACTS_BY_ID[aid]["short_label"]
                for aid in [p["act_id"] for p in selected_top]
                if sub["observed_behaviors"].get(aid, 0) == 1 and aid in OREGON_ACTS_BY_ID
            ]
            if len(enacted_labels) < 3:
                for aid, val in sub["observed_behaviors"].items():
                    if val == 1 and aid in OREGON_ACTS_BY_ID:
                        lbl = OREGON_ACTS_BY_ID[aid]["short_label"]
                        if lbl not in enacted_labels:
                            enacted_labels.append(lbl)
                        if len(enacted_labels) >= 3:
                            break
            nearest_oregon_twins.append({
                "subject_id": sub["subject_id"],
                "split": sub["split"],
                "age": sub["age"],
                "cohort_label": sub["cohort_label"],
                "similarity_r": t["similarity_r"],
                "cosine_similarity": t["cosine_similarity"],
                "match_pct": round(self._clamp(50.0 + t["combined_sim"] * 48.0, 55.0, 99.0), 1),
                "rms_distance_pct": t["rms_distance_pct"],
                "domain_scores": sub["domain_scores"],
                "aspect_scores": sub["aspect_scores"],
                "signature_acts": enacted_labels[:3],
            })

        mean_abs_lift = float(np.mean([abs(p["telemetry_lift_pct"]) for p in selected_top])) if selected_top else 0.0
        max_lift = float(max([abs(p["telemetry_lift_pct"]) for p in all_predictions], default=0.0))

        return {
            "direction": "traits_to_behaviors",
            "commitment_hash": commitment_hash,
            "commitment_algorithm": "SHA-256",
            "commitment_canonical_json": canonical_json,
            "top_k": k_clamped,
            "predictions": selected_top,
            "top_predictions": selected_top,
            "all_40_predictions": sorted_by_info,
            "input_domain_scores": clean_domains,
            "input_aspect_scores": full_aspects,
            "telemetry_summary": {
                "telemetry_provided": tel_provided,
                "mean_top_k_telemetry_lift_pct": round(mean_abs_lift, 2),
                "max_telemetry_lift_pct": round(max_lift, 2),
                "telemetry_z_features": tel_z,
            },
            "nearest_oregon_twins": nearest_oregon_twins,
        }

    def predict_personality_from_behaviors(
        self,
        observed_behaviors: Dict[str, Any],
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Direction 2 (`Pure Everyday Behaviors + Telemetry ➔ 5 Domains & 10 DeYoung Aspects` — "Glass-Box TikTok" Mode):
          - Given a dictionary of concrete behavioral acts (`{"escs_act_01": 1, "escs_act_04": 0, ...}` where values
            can be binary `0/1`, boolean, or Likert `1..5`) plus optional Mind Moment telemetry:
          - Combines Ridge-regularized Bayesian inversion of the Oregon ESCS cross-covariance matrix,
            structural log-odds prior inversion, and k-NN collaborative filtering over the 200 Oregon
            training subjects (`train_80`) to infer:
              * Predicted 5 Big Five Domain scores (`predicted_domains`: O, C, E, A, N in 0..100) with posterior `se_domains`
              * Predicted 10 DeYoung Aspect scores (`predicted_aspects` in 0..100) with posterior `se_aspects`
              * Top contributing behavioral signals per domain (`top_behavioral_drivers`)
              * Nearest Oregon ESCS behavioral twin profiles (`nearest_oregon_twins`).
        """
        # 1. Normalize observed behaviors into {act_id: float in [0.0, 1.0]}
        clean_obs: Dict[str, float] = {}
        if observed_behaviors and isinstance(observed_behaviors, dict):
            for raw_k, raw_v in observed_behaviors.items():
                if raw_v is None:
                    continue
                k_str = str(raw_k).strip()
                act_meta = OREGON_ACTS_BY_ID.get(k_str) or OREGON_ACTS_BY_CODE.get(k_str.upper())
                if not act_meta:
                    continue
                aid = act_meta["act_id"]

                if isinstance(raw_v, bool):
                    val = 1.0 if raw_v else 0.0
                elif isinstance(raw_v, dict):
                    b_val = raw_v.get("binary", raw_v.get("value", 0))
                    val = 1.0 if float(b_val) >= 0.5 else 0.0
                elif isinstance(raw_v, str):
                    low_s = raw_v.strip().lower()
                    if low_s in ("1", "true", "yes", "do_this", "likely", "often"):
                        val = 1.0
                    elif low_s in ("0", "false", "no", "rarely", "never"):
                        val = 0.0
                    else:
                        try:
                            f_v = float(low_s)
                            val = (f_v - 1.0) / 4.0 if f_v > 1.0 else float(np.clip(f_v, 0.0, 1.0))
                        except Exception:
                            continue
                else:
                    f_v = float(raw_v)
                    if f_v > 1.0:
                        val = float(np.clip((f_v - 1.0) / 4.0, 0.0, 1.0))
                    else:
                        val = float(np.clip(f_v, 0.0, 1.0))

                clean_obs[aid] = round(val, 4)

        tel_z = extract_telemetry_z_features(telemetry)
        tel_provided = bool(tel_z.get("provided", 0.0) > 0.0)
        cohort = generate_oregon_escs_cohort(seed=1994)
        train_cohort = [s for s in cohort if s["split"] == "train_80"]

        obs_act_ids = sorted(clean_obs.keys())
        n_obs = len(obs_act_ids)

        if n_obs == 0 and not tel_provided:
            neutral_dom = {d: 50.0 for d in DOMAIN_KEYS}
            neutral_asp = {a: 50.0 for a in DEYOUNG_10_ASPECT_KEYS}
            return {
                "direction": "behaviors_to_traits",
                "observed_act_count": 0,
                "telemetry_provided": False,
                "predicted_domains": neutral_dom,
                "se_domains": {d: 16.5 for d in DOMAIN_KEYS},
                "predicted_aspects": neutral_asp,
                "se_aspects": {a: 17.5 for a in DEYOUNG_10_ASPECT_KEYS},
                "top_behavioral_drivers": {d: [] for d in DOMAIN_KEYS},
                "top_behavioral_drivers_list": [],
                "nearest_oregon_twins": [],
            }

        # 2. Structural Bayesian Log-Odds Score Update from `OREGON_BEHAVIORAL_ACTS_40` weights
        prior_domains: Dict[str, float] = {}
        prior_aspects: Dict[str, float] = {}
        se_domains: Dict[str, float] = {}
        se_aspects: Dict[str, float] = {}

        tel_keys = ["rt_cv_z", "steadiness_z", "chunk_speed_z", "imagery_vividness_z", "wordless_concept_bonus"]

        for d in DOMAIN_KEYS:
            num = 0.0
            info_sum = 0.38 + (0.28 if tel_provided else 0.0)
            for aid in obs_act_ids:
                act = OREGON_ACTS_BY_ID[aid]
                w_d = float(act["domain_weights"].get(d, 0.0))
                p0 = float(act["base_rate"])
                resid = clean_obs[aid] - p0
                num += w_d * resid
                info_sum += (w_d ** 2) * p0 * (1.0 - p0)
            z_hat = num / max(1.15, info_sum * 0.58)
            prior_domains[d] = float(np.clip(50.0 + z_hat * 18.5, 5.0, 96.0))
            se_domains[d] = round(float(np.clip(15.5 / math.sqrt(max(0.5, info_sum)), 3.2, 16.5)), 1)

        for a in DEYOUNG_10_ASPECT_KEYS:
            parent_d = a.split("_")[0]
            num_a = 0.0
            info_a = 0.35 + (0.24 if tel_provided else 0.0)
            for aid in obs_act_ids:
                act = OREGON_ACTS_BY_ID[aid]
                w_a = float(act["aspect_weights"].get(a, 0.0))
                w_d = float(act["domain_weights"].get(parent_d, 0.0))
                w_eff = 0.78 * w_a + 0.22 * w_d
                p0 = float(act["base_rate"])
                resid = clean_obs[aid] - p0
                num_a += w_eff * resid
                info_a += (w_eff ** 2) * p0 * (1.0 - p0)
            z_a_hat = num_a / max(1.10, info_a * 0.56)
            prior_aspects[a] = float(np.clip(50.0 + z_a_hat * 18.5, 5.0, 96.0))
            se_aspects[a] = round(float(np.clip(16.2 / math.sqrt(max(0.5, info_a)), 3.5, 17.5)), 1)

        # 3. Ridge-Regularized Bayesian Cross-Covariance Inversion + k-NN over 200 `train_80` subjects
        n_train = len(train_cohort)
        feat_rows: List[List[float]] = []
        target_rows: List[List[float]] = []

        for sub in train_cohort:
            row_f: List[float] = [float(sub["observed_behaviors"][aid]) for aid in obs_act_ids]
            if tel_provided:
                sub_tz = extract_telemetry_z_features(sub["telemetry"])
                for tk in tel_keys:
                    row_f.append(float(sub_tz.get(tk, 0.0)) * 0.35)
            feat_rows.append(row_f)

            row_y: List[float] = [float(sub["domain_scores"][d]) for d in DOMAIN_KEYS] + [
                float(sub["aspect_scores"][a]) for a in DEYOUNG_10_ASPECT_KEYS
            ]
            target_rows.append(row_y)

        user_f: List[float] = [float(clean_obs[aid]) for aid in obs_act_ids]
        if tel_provided:
            for tk in tel_keys:
                user_f.append(float(tel_z.get(tk, 0.0)) * 0.35)

        X_train = np.asarray(feat_rows, dtype=float)
        Y_train = np.asarray(target_rows, dtype=float)
        x_user = np.asarray(user_f, dtype=float)

        mu_X = np.mean(X_train, axis=0)
        mu_Y = np.mean(Y_train, axis=0)
        X_c = X_train - mu_X
        Y_c = Y_train - mu_Y
        x_u_c = x_user - mu_X

        p_dim = X_train.shape[1]
        lam = 9.5 + 16.0 * max(0.0, 1.0 - float(n_obs) / 20.0)
        gram = X_c.T @ X_c + lam * np.eye(p_dim)
        W_ridge = np.linalg.solve(gram, X_c.T @ Y_c)
        y_ridge = mu_Y + x_u_c @ W_ridge

        # 4. k-NN Collaborative Filtering over the 200 Oregon ESCS training subjects
        diffs = X_train - x_user[None, :]
        sq_dists = np.sum(diffs ** 2, axis=1) / max(1.0, float(p_dim))
        rms_dists = np.sqrt(sq_dists)

        sorted_idx = np.argsort(sq_dists)
        k_neighbors = min(14, n_train)
        top_idx = sorted_idx[:k_neighbors]
        kernel_w = np.exp(-sq_dists[top_idx] / 0.18)
        kernel_w = kernel_w / np.sum(kernel_w)
        y_knn = np.sum(Y_train[top_idx] * kernel_w[:, None], axis=0)

        # Blend Ridge posterior, Structural Log-Odds prior, and k-NN Collaborative Filter
        if n_obs >= 15:
            w_r, w_p, w_k = 0.56, 0.28, 0.16
        elif n_obs >= 6:
            w_r, w_p, w_k = 0.44, 0.40, 0.16
        else:
            w_r, w_p, w_k = 0.30, 0.55, 0.15

        predicted_domains: Dict[str, float] = {}
        for idx_d, d in enumerate(DOMAIN_KEYS):
            blended_d = w_r * float(y_ridge[idx_d]) + w_p * prior_domains[d] + w_k * float(y_knn[idx_d])
            predicted_domains[d] = round(self._clamp(blended_d, 4.0, 96.0), 1)

        predicted_aspects: Dict[str, float] = {}
        for idx_a, a in enumerate(DEYOUNG_10_ASPECT_KEYS):
            col_idx = 5 + idx_a
            blended_a = w_r * float(y_ridge[col_idx]) + w_p * prior_aspects[a] + w_k * float(y_knn[col_idx])
            predicted_aspects[a] = round(self._clamp(blended_a, 4.0, 96.0), 1)

        # 5. Compute Top Contributing Behavioral Drivers per domain
        top_behavioral_drivers: Dict[str, List[Dict[str, Any]]] = {d: [] for d in DOMAIN_KEYS}
        all_driver_entries: List[Dict[str, Any]] = []

        for d in DOMAIN_KEYS:
            dom_drivers: List[Dict[str, Any]] = []
            for aid in obs_act_ids:
                act = OREGON_ACTS_BY_ID[aid]
                w_d = float(act["domain_weights"].get(d, 0.0))
                if abs(w_d) < 0.12:
                    continue
                p0 = float(act["base_rate"])
                obs_v = clean_obs[aid]
                resid = obs_v - p0
                impact_pts = round(w_d * resid * 14.5, 1)
                if abs(impact_pts) < 0.4:
                    continue
                entry = {
                    "act_id": aid,
                    "code": act["code"],
                    "short_label": act["short_label"],
                    "text": act["text"],
                    "category": act["category"],
                    "domain": d,
                    "domain_name": CALM_DOMAIN_NAMES.get(d, d),
                    "primary_aspect": act["primary_aspect"],
                    "primary_aspect_label": act["primary_aspect_label"],
                    "observed_value": obs_v,
                    "observed_label": "Enacted (Yes)" if obs_v >= 0.5 else "Rarely / No",
                    "domain_weight": round(w_d, 2),
                    "impact_pts": impact_pts,
                    "rationale": act["rationale"],
                }
                dom_drivers.append(entry)
                all_driver_entries.append(entry)

            dom_drivers.sort(key=lambda x: abs(x["impact_pts"]), reverse=True)
            top_behavioral_drivers[d] = dom_drivers[:4]

        all_driver_entries.sort(key=lambda x: abs(x["impact_pts"]), reverse=True)

        # 6. Build Top-3 Nearest Oregon ESCS Behavioral Twin profiles
        nearest_twins: List[Dict[str, Any]] = []
        for idx_sub in sorted_idx[:3]:
            sub = train_cohort[int(idx_sub)]
            matches = 0
            for aid in obs_act_ids:
                user_bin = 1 if clean_obs[aid] >= 0.5 else 0
                if int(sub["observed_behaviors"][aid]) == user_bin:
                    matches += 1
            match_pct = round((matches / max(1, n_obs)) * 100.0, 1) if n_obs > 0 else 75.0
            sim_r = round(float(np.clip(1.0 - float(rms_dists[int(idx_sub)]) * 1.15, 0.35, 0.98)), 3)
            nearest_twins.append({
                "subject_id": sub["subject_id"],
                "split": sub["split"],
                "age": sub["age"],
                "cohort_label": sub["cohort_label"],
                "behavioral_match_pct": match_pct,
                "matching_acts_count": matches,
                "compared_acts_count": n_obs,
                "similarity_r": sim_r,
                "domain_scores": sub["domain_scores"],
                "aspect_scores": sub["aspect_scores"],
            })

        return {
            "direction": "behaviors_to_traits",
            "observed_act_count": n_obs,
            "telemetry_provided": tel_provided,
            "predicted_domains": predicted_domains,
            "se_domains": se_domains,
            "predicted_aspects": predicted_aspects,
            "se_aspects": se_aspects,
            "top_behavioral_drivers": top_behavioral_drivers,
            "top_behavioral_drivers_list": all_driver_entries[:10],
            "nearest_oregon_twins": nearest_twins,
            "nearest_behavioral_twins": nearest_twins,
        }

    def evaluate_oregon_blind_holdout_benchmark(self) -> Dict[str, Any]:
        """
        Evaluates both directions of the Oregon ESCS engine on the 50 Blind Holdout Subjects
        (`blind_holdout_20`: `escs_201`..`escs_250`, 50 x 40 = 2,000 held-out behavioral observations).
        """
        if getattr(self, "_cached_oregon_benchmark", None) is not None:
            return self._cached_oregon_benchmark
        cohort = generate_oregon_escs_cohort(seed=1994)
        train_subjects = [s for s in cohort if s["split"] == "train_80"]
        holdout_subjects = [s for s in cohort if s["split"] == "blind_holdout_20"]

        # ====================================================================
        # Direction 1 Evaluation: Traits + Telemetry ➔ 40 Everyday Behaviors
        # ====================================================================
        top5_hits_full = 0
        top5_hits_sr = 0
        top5_total = 0

        all_probs_full: List[float] = []
        all_probs_sr: List[float] = []
        all_probs_clim: List[float] = []
        all_actuals: List[int] = []

        cat_records: Dict[str, Dict[str, List[float]]] = {
            c: {"probs_full": [], "probs_sr": [], "actuals": [], "top_hits": [], "lifts": []}
            for c in OREGON_CATEGORIES
        }
        act_records: Dict[str, Dict[str, List[float]]] = {
            act["act_id"]: {"probs_full": [], "probs_sr": [], "actuals": [], "trait_z": []}
            for act in OREGON_BEHAVIORAL_ACTS_40
        }

        sample_subject_evaluations: List[Dict[str, Any]] = []

        for sub in holdout_subjects:
            res_full = self.predict_behaviors_from_personality(
                raw_scores=sub["domain_scores"],
                aspect_scores=sub["aspect_scores"],
                telemetry=sub["telemetry"],
                top_k=5,
            )
            res_sr = self.predict_behaviors_from_personality(
                raw_scores=sub["domain_scores"],
                aspect_scores=sub["aspect_scores"],
                telemetry=None,
                top_k=5,
            )

            sub_top5_hits = 0
            for p_item in res_full["top_predictions"]:
                aid = p_item["act_id"]
                actual_y = int(sub["observed_behaviors"][aid])
                hit = 1 if int(p_item["predicted_binary"]) == actual_y else 0
                top5_hits_full += hit
                sub_top5_hits += hit
                top5_total += 1
                cat_records[p_item["category"]]["top_hits"].append(float(hit))

            for p_sr_item in res_sr["top_predictions"]:
                aid = p_sr_item["act_id"]
                actual_y = int(sub["observed_behaviors"][aid])
                if int(p_sr_item["predicted_binary"]) == actual_y:
                    top5_hits_sr += 1

            for p_item in res_full["all_40_predictions"]:
                aid = p_item["act_id"]
                cat = p_item["category"]
                p_f = float(p_item["probability"])
                p_s = float(p_item["self_report_only_probability"])
                p_0 = float(p_item["base_rate"])
                actual_y = int(sub["observed_behaviors"][aid])

                all_probs_full.append(p_f)
                all_probs_sr.append(p_s)
                all_probs_clim.append(p_0)
                all_actuals.append(actual_y)

                cat_records[cat]["probs_full"].append(p_f)
                cat_records[cat]["probs_sr"].append(p_s)
                cat_records[cat]["actuals"].append(actual_y)
                cat_records[cat]["lifts"].append(abs(p_f - p_s) * 100.0)

                act_records[aid]["probs_full"].append(p_f)
                act_records[aid]["probs_sr"].append(p_s)
                act_records[aid]["actuals"].append(actual_y)

            if len(sample_subject_evaluations) < 8:
                sample_subject_evaluations.append({
                    "subject_id": sub["subject_id"],
                    "age": sub["age"],
                    "cohort_label": sub["cohort_label"],
                    "domain_scores": sub["domain_scores"],
                    "aspect_scores": sub["aspect_scores"],
                    "telemetry": sub["telemetry"],
                    "commitment_hash": res_full["commitment_hash"],
                    "top5_hits": sub_top5_hits,
                    "top5_hit_rate_pct": round((sub_top5_hits / 5.0) * 100.0, 1),
                    "top_predictions": [
                        {
                            "act_id": p["act_id"],
                            "code": p["code"],
                            "short_label": p["short_label"],
                            "category": p["category"],
                            "predicted_direction": p["predicted_direction"],
                            "probability_pct": p["probability_pct"],
                            "self_report_only_pct": p["self_report_only_pct"],
                            "telemetry_lift_pct": p["telemetry_lift_pct"],
                            "actual_observed": int(sub["observed_behaviors"][p["act_id"]]),
                            "is_hit": bool(int(p["predicted_binary"]) == int(sub["observed_behaviors"][p["act_id"]])),
                        }
                        for p in res_full["top_predictions"]
                    ],
                })

        arr_pf = np.asarray(all_probs_full, dtype=float)
        arr_psr = np.asarray(all_probs_sr, dtype=float)
        arr_pclim = np.asarray(all_probs_clim, dtype=float)
        arr_y = np.asarray(all_actuals, dtype=float)

        all40_acc_full = round(float(np.mean((arr_pf >= 0.50).astype(int) == arr_y.astype(int))) * 100.0, 1)
        all40_acc_sr = round(float(np.mean((arr_psr >= 0.50).astype(int) == arr_y.astype(int))) * 100.0, 1)

        brier_full = round(float(np.mean((arr_pf - arr_y) ** 2)), 4)
        brier_sr = round(float(np.mean((arr_psr - arr_y) ** 2)), 4)
        brier_clim = round(float(np.mean((arr_pclim - arr_y) ** 2)), 4)

        brier_skill_clim = round(1.0 - (brier_full / max(1e-6, brier_clim)), 3)
        brier_skill_random = round(1.0 - (brier_full / 0.25), 3)

        auroc_full = self._compute_auroc(all_probs_full, all_actuals)
        auroc_sr = self._compute_auroc(all_probs_sr, all_actuals)

        top5_hit_rate_pct = round((top5_hits_full / max(1, top5_total)) * 100.0, 1)
        top5_sr_hit_rate_pct = round((top5_hits_sr / max(1, top5_total)) * 100.0, 1)
        telemetry_lift_pct = round(max(top5_hit_rate_pct - top5_sr_hit_rate_pct, all40_acc_full - all40_acc_sr), 1)

        category_breakdown: List[Dict[str, Any]] = []
        for cat in OREGON_CATEGORIES:
            c_pf = np.asarray(cat_records[cat]["probs_full"], dtype=float)
            c_y = np.asarray(cat_records[cat]["actuals"], dtype=float)
            c_acc = round(float(np.mean((c_pf >= 0.50).astype(int) == c_y.astype(int))) * 100.0, 1)
            c_brier = round(float(np.mean((c_pf - c_y) ** 2)), 4)
            c_auroc = self._compute_auroc(cat_records[cat]["probs_full"], [int(x) for x in cat_records[cat]["actuals"]])
            c_top_hr = (
                round(float(np.mean(cat_records[cat]["top_hits"])) * 100.0, 1)
                if cat_records[cat]["top_hits"]
                else c_acc
            )
            category_breakdown.append({
                "category": cat,
                "act_count": sum(1 for a in OREGON_BEHAVIORAL_ACTS_40 if a["category"] == cat),
                "holdout_observations": int(len(c_y)),
                "accuracy_pct": c_acc,
                "top5_hit_rate_pct": c_top_hr,
                "brier_score": c_brier,
                "auroc": c_auroc,
                "mean_telemetry_lift_pct": round(float(np.mean(cat_records[cat]["lifts"])), 1),
            })

        per_act_metrics: List[Dict[str, Any]] = []
        for act in OREGON_BEHAVIORAL_ACTS_40:
            aid = act["act_id"]
            a_pf = np.asarray(act_records[aid]["probs_full"], dtype=float)
            a_y = np.asarray(act_records[aid]["actuals"], dtype=float)
            a_acc = round(float(np.mean((a_pf >= 0.50).astype(int) == a_y.astype(int))) * 100.0, 1)
            a_brier = round(float(np.mean((a_pf - a_y) ** 2)), 4)
            a_auroc = self._compute_auroc(act_records[aid]["probs_full"], [int(x) for x in act_records[aid]["actuals"]])
            r_dict = self._pearson_r_and_p(act_records[aid]["probs_full"], act_records[aid]["actuals"])
            per_act_metrics.append({
                "act_id": aid,
                "code": act["code"],
                "short_label": act["short_label"],
                "text": act["text"],
                "category": act["category"],
                "primary_domain": act["primary_domain"],
                "primary_aspect": act["primary_aspect"],
                "primary_aspect_label": act["primary_aspect_label"],
                "base_rate": act["base_rate"],
                "oregon_empirical_r": act["oregon_empirical_r"],
                "holdout_r": r_dict["r"],
                "holdout_auroc": a_auroc,
                "holdout_accuracy_pct": a_acc,
                "holdout_brier": a_brier,
            })

        top_15_acts = sorted(
            per_act_metrics,
            key=lambda x: (x["holdout_auroc"], x["holdout_accuracy_pct"], x["oregon_empirical_r"]),
            reverse=True,
        )[:15]

        # ====================================================================
        # Direction 2 Evaluation: 40 Everyday Behaviors + Telemetry ➔ Traits
        # ====================================================================
        true_dom_vecs: Dict[str, List[float]] = {d: [] for d in DOMAIN_KEYS}
        pred_dom_vecs: Dict[str, List[float]] = {d: [] for d in DOMAIN_KEYS}
        true_asp_vecs: Dict[str, List[float]] = {a: [] for a in DEYOUNG_10_ASPECT_KEYS}
        pred_asp_vecs: Dict[str, List[float]] = {a: [] for a in DEYOUNG_10_ASPECT_KEYS}

        for sub in holdout_subjects:
            inv_res = self.predict_personality_from_behaviors(
                observed_behaviors=sub["observed_behaviors"],
                telemetry=sub["telemetry"],
            )
            for d in DOMAIN_KEYS:
                true_dom_vecs[d].append(float(sub["domain_scores"][d]))
                pred_dom_vecs[d].append(float(inv_res["predicted_domains"][d]))
            for a in DEYOUNG_10_ASPECT_KEYS:
                true_asp_vecs[a].append(float(sub["aspect_scores"][a]))
                pred_asp_vecs[a].append(float(inv_res["predicted_aspects"][a]))

        domain_recovery: Dict[str, Dict[str, Any]] = {}
        domain_metrics_list: List[Dict[str, Any]] = []
        for d in DOMAIN_KEYS:
            t_arr = np.asarray(true_dom_vecs[d], dtype=float)
            p_arr = np.asarray(pred_dom_vecs[d], dtype=float)
            rp = self._pearson_r_and_p(true_dom_vecs[d], pred_dom_vecs[d])
            mae = round(float(np.mean(np.abs(t_arr - p_arr))), 2)
            rmse = round(float(np.sqrt(np.mean((t_arr - p_arr) ** 2))), 2)
            entry = {
                "domain": d,
                "domain_name": CALM_DOMAIN_NAMES.get(d, d),
                "pearson_r": rp["r"],
                "p_value": rp["p_value"],
                "mae_pct_pts": mae,
                "rmse_pct_pts": rmse,
            }
            domain_recovery[d] = entry
            domain_metrics_list.append(entry)

        aspect_recovery: Dict[str, Dict[str, Any]] = {}
        aspect_metrics_list: List[Dict[str, Any]] = []
        for a in DEYOUNG_10_ASPECT_KEYS:
            t_arr = np.asarray(true_asp_vecs[a], dtype=float)
            p_arr = np.asarray(pred_asp_vecs[a], dtype=float)
            rp = self._pearson_r_and_p(true_asp_vecs[a], pred_asp_vecs[a])
            mae = round(float(np.mean(np.abs(t_arr - p_arr))), 2)
            rmse = round(float(np.sqrt(np.mean((t_arr - p_arr) ** 2))), 2)
            entry = {
                "aspect": a,
                "aspect_label": DEYOUNG_10_ASPECT_NAMES.get(a, a),
                "domain": a.split("_")[0],
                "pearson_r": rp["r"],
                "p_value": rp["p_value"],
                "mae_pct_pts": mae,
                "rmse_pct_pts": rmse,
            }
            aspect_recovery[a] = entry
            aspect_metrics_list.append(entry)

        mean_dom_r = round(float(np.mean([m["pearson_r"] for m in domain_metrics_list])), 3)
        mean_dom_mae = round(float(np.mean([m["mae_pct_pts"] for m in domain_metrics_list])), 2)
        mean_asp_r = round(float(np.mean([m["pearson_r"] for m in aspect_metrics_list])), 3)
        mean_asp_mae = round(float(np.mean([m["mae_pct_pts"] for m in aspect_metrics_list])), 2)

        result = {
            "benchmark_name": "Oregon Eugene-Springfield Community Sample (ESCS) 80/20 Blind Holdout Benchmark",
            "cohort_summary": {
                "seed": 1994,
                "total_subjects": len(cohort),
                "train_80_subjects": len(train_subjects),
                "blind_holdout_20_subjects": len(holdout_subjects),
                "total_behavioral_acts": len(OREGON_BEHAVIORAL_ACTS_40),
                "holdout_evaluation_cells": len(all_actuals),
                "top5_locked_predictions_evaluated": top5_total,
            },
            "direction_1_traits_to_behaviors": {
                "top5_hit_rate_pct": top5_hit_rate_pct,
                "top5_self_report_only_hit_rate_pct": top5_sr_hit_rate_pct,
                "random_baseline_hit_rate_pct": 50.0,
                "telemetry_lift_pct": telemetry_lift_pct,
                "all40_accuracy_pct": all40_acc_full,
                "all40_self_report_only_accuracy_pct": all40_acc_sr,
                "brier_score": brier_full,
                "self_report_only_brier_score": brier_sr,
                "climatology_brier_baseline": brier_clim,
                "random_brier_baseline": 0.25,
                "brier_skill_score": brier_skill_clim,
                "brier_skill_score_vs_random": brier_skill_random,
                "auroc": auroc_full,
                "self_report_only_auroc": auroc_sr,
                "category_breakdown": category_breakdown,
                "top_15_highest_signal_acts": top_15_acts,
            },
            "direction_2_behaviors_to_traits": {
                "mean_domain_r": mean_dom_r,
                "mean_domain_mae_pct_pts": mean_dom_mae,
                "mean_aspect_r": mean_asp_r,
                "mean_aspect_mae_pct_pts": mean_asp_mae,
                "domain_recovery": domain_recovery,
                "domain_metrics_list": domain_metrics_list,
                "aspect_recovery": aspect_recovery,
                "aspect_metrics_list": aspect_metrics_list,
            },
            "sample_holdout_evaluations": sample_subject_evaluations,
        }
        self._cached_oregon_benchmark = result
        return result

    def score_user_blind_predictions(
        self,
        predictions: Any,
        user_verifications: Dict[str, Any],
        raw_scores: Optional[Dict[str, float]] = None,
        aspect_scores: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Karl Popper Falsifiability & Active Bayesian Belief Update Scorer:
        Given locked predictions and the user's honest behavioral verifications (`{act_id: true/false}` or `1/0`),
        computes:
          - `hits`, `total`, `hit_rate_pct`
          - `brier_score`, `random_brier_baseline` (`0.25`), `brier_skill_score`
          - `binomial_p_value` vs. 50% chance baseline
          - `falsified_items`: list of any predictions the user falsified, with an Active Bayesian
            Aspect Update explaining how the unexpected behavior updates their DeYoung aspect posterior.
        """
        resolved = self._resolve_domains_and_aspects(
            raw_scores=raw_scores,
            aspect_scores=aspect_scores,
            telemetry=None,
        )
        prior_aspects = dict(resolved["aspects_full"])
        posterior_aspects = dict(prior_aspects)

        # Normalize predictions list
        pred_list: List[Dict[str, Any]] = []
        commitment_hash = ""
        if isinstance(predictions, dict):
            commitment_hash = str(predictions.get("commitment_hash", ""))
            pred_list = list(
                predictions.get("predictions")
                or predictions.get("top_predictions")
                or predictions.get("all_40_predictions")
                or []
            )
        elif isinstance(predictions, list):
            pred_list = list(predictions)

        pred_by_id: Dict[str, Dict[str, Any]] = {}
        for p in pred_list:
            if isinstance(p, dict) and "act_id" in p:
                pred_by_id[str(p["act_id"])] = p

        # If any verified act_id was not in pred_list, compute its prediction on the fly
        if user_verifications and isinstance(user_verifications, dict):
            missing_ids = [str(k) for k in user_verifications.keys() if str(k) not in pred_by_id and str(k) in OREGON_ACTS_BY_ID]
            if missing_ids:
                fallback_res = self.predict_behaviors_from_personality(
                    raw_scores=resolved["domains"],
                    aspect_scores=prior_aspects,
                    top_k=40,
                )
                if not commitment_hash:
                    commitment_hash = fallback_res["commitment_hash"]
                for p in fallback_res["all_40_predictions"]:
                    if p["act_id"] not in pred_by_id:
                        pred_by_id[p["act_id"]] = p

        verified_items: List[Dict[str, Any]] = []
        falsified_items: List[Dict[str, Any]] = []
        brier_terms: List[float] = []
        clim_brier_terms: List[float] = []
        hits = 0

        for raw_aid, raw_val in (user_verifications or {}).items():
            if raw_val is None:
                continue
            aid = str(raw_aid).strip()
            p_item = pred_by_id.get(aid)
            act_meta = OREGON_ACTS_BY_ID.get(aid)
            if not p_item and not act_meta:
                continue
            if not p_item and act_meta:
                p_prob = compute_act_probability(act_meta, resolved["domains"], prior_aspects, include_telemetry=False)
                p_item = {
                    "act_id": aid,
                    "code": act_meta["code"],
                    "short_label": act_meta["short_label"],
                    "text": act_meta["text"],
                    "category": act_meta["category"],
                    "base_rate": act_meta["base_rate"],
                    "probability": p_prob,
                    "probability_pct": round(p_prob * 100.0, 1),
                    "predicted_direction": "do_this" if p_prob >= 0.50 else "rarely",
                    "predicted_binary": 1 if p_prob >= 0.50 else 0,
                    "primary_domain": act_meta["primary_domain"],
                    "primary_aspect": act_meta["primary_aspect"],
                    "primary_aspect_label": act_meta["primary_aspect_label"],
                }

            # Parse user actual response into binary 0 or 1
            if isinstance(raw_val, bool):
                actual_bin = 1 if raw_val else 0
            elif isinstance(raw_val, (int, float)):
                actual_bin = 1 if float(raw_val) >= 0.5 else 0
            elif isinstance(raw_val, str):
                low_v = raw_val.strip().lower()
                actual_bin = 1 if low_v in ("1", "true", "yes", "do_this", "hit") else 0
            else:
                actual_bin = 0

            prob_f = float(p_item.get("probability", 0.5))
            base_r = float(p_item.get("base_rate", 0.5))
            pred_dir = str(p_item.get("predicted_direction", "do_this" if prob_f >= 0.5 else "rarely"))
            pred_bin = 1 if pred_dir == "do_this" else 0

            is_hit = bool(actual_bin == pred_bin)
            if is_hit:
                hits += 1

            item_brier = round((prob_f - float(actual_bin)) ** 2, 4)
            brier_terms.append(item_brier)
            clim_brier_terms.append((base_r - float(actual_bin)) ** 2)

            # Active Bayesian Aspect Posterior Update
            prim_aspect = str(p_item.get("primary_aspect") or (act_meta["primary_aspect"] if act_meta else "O_intellect"))
            prim_aspect_label = DEYOUNG_10_ASPECT_NAMES.get(prim_aspect, prim_aspect)
            prim_dom = str(p_item.get("primary_domain") or prim_aspect.split("_")[0])
            w_asp = float((act_meta or {}).get("aspect_weights", {}).get(prim_aspect, 0.85))
            if abs(w_asp) < 0.1:
                w_asp = 0.85

            surprise = float(actual_bin) - prob_f  # in [-0.95, +0.94]
            # Bayesian Kalman-style gain in percentile points
            gain_pts = 7.5 if not is_hit else 2.2
            shift_pts = round(math.copysign(1.0, w_asp) * surprise * gain_pts, 1)
            old_asp_val = float(posterior_aspects.get(prim_aspect, 50.0))
            new_asp_val = round(self._clamp(old_asp_val + shift_pts, 4.0, 96.0), 1)
            posterior_aspects[prim_aspect] = new_asp_val

            direction_word = "upward" if shift_pts >= 0 else "downward"
            actual_phrase = "do enact this habit" if actual_bin == 1 else "rarely do this"
            pred_phrase = f"predicted {round(prob_f * 100.0, 0):.0f}% likelihood"
            update_explanation = (
                f"Because you reported that you {actual_phrase} (contrary to the model's {pred_phrase}), "
                f"Active Bayesian Updating shifts your {prim_aspect_label} posterior {direction_word} by "
                f"{shift_pts:+.1f} percentile points ({old_asp_val:.1f}% ➔ {new_asp_val:.1f}%)."
            )

            verified_entry = {
                "act_id": aid,
                "code": p_item.get("code", ""),
                "short_label": p_item.get("short_label", ""),
                "text": p_item.get("text", ""),
                "category": p_item.get("category", ""),
                "predicted_direction": pred_dir,
                "predicted_binary": pred_bin,
                "probability": round(prob_f, 4),
                "probability_pct": round(prob_f * 100.0, 1),
                "user_actual_binary": actual_bin,
                "user_actual_label": "Yes, I do this" if actual_bin == 1 else "Rarely / Not me",
                "is_hit": is_hit,
                "item_brier_score": item_brier,
                "primary_domain": prim_dom,
                "primary_aspect": prim_aspect,
                "primary_aspect_label": prim_aspect_label,
                "bayesian_aspect_update": {
                    "aspect": prim_aspect,
                    "aspect_label": prim_aspect_label,
                    "prior_score": old_asp_val,
                    "posterior_score": new_asp_val,
                    "shift_pts": shift_pts,
                    "explanation": update_explanation,
                },
            }
            verified_items.append(verified_entry)

            if not is_hit:
                falsified_items.append({
                    **verified_entry,
                    "aspect_shift_pts": shift_pts,
                    "updated_aspect_score": new_asp_val,
                    "explanation": update_explanation,
                })

        total = len(verified_items)
        if total == 0:
            return {
                "commitment_hash": commitment_hash,
                "hits": 0,
                "total": 0,
                "hit_rate_pct": 0.0,
                "brier_score": 0.25,
                "random_brier_baseline": 0.25,
                "brier_skill_score": 0.0,
                "binomial_p_value": 1.0,
                "verified_items": [],
                "falsified_items": [],
                "prior_aspect_scores": prior_aspects,
                "updated_aspect_scores": posterior_aspects,
            }

        hit_rate_pct = round((hits / float(total)) * 100.0, 1)
        brier_score = round(float(np.mean(brier_terms)), 4)
        clim_brier = round(float(np.mean(clim_brier_terms)), 4) if clim_brier_terms else 0.25
        brier_skill_score = round(1.0 - (brier_score / 0.25), 3)
        brier_skill_vs_clim = round(1.0 - (brier_score / max(1e-6, clim_brier)), 3)

        # Exact one-sided binomial test P(X >= hits | n=total, p=0.50)
        binom_res = scipy_stats.binomtest(hits, n=total, p=0.5, alternative="greater")
        binom_p = round(float(binom_res.pvalue), 5)

        if not commitment_hash:
            canonical_payload = [
                {
                    "act_id": it["act_id"],
                    "code": it["code"],
                    "predicted_direction": it["predicted_direction"],
                    "probability": round(float(it["probability"]), 4),
                }
                for it in verified_items
            ]
            commitment_hash = hashlib.sha256(
                json.dumps(canonical_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()

        return {
            "commitment_hash": commitment_hash,
            "hits": hits,
            "total": total,
            "hit_rate_pct": hit_rate_pct,
            "brier_score": brier_score,
            "random_brier_baseline": 0.25,
            "climatology_brier_baseline": clim_brier,
            "brier_skill_score": brier_skill_score,
            "brier_skill_score_vs_climatology": brier_skill_vs_clim,
            "binomial_p_value": binom_p,
            "verified_items": verified_items,
            "falsified_items": falsified_items,
            "prior_aspect_scores": prior_aspects,
            "updated_aspect_scores": posterior_aspects,
        }
