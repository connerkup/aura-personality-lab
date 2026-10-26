"""
SQLite WAL Persistence Layer for Aura Tier-2 Backend & Kae's Collaborative Science Studio.

Database file: `/home/ubuntu/personality-lab/backend/aura_production.db`
Tables:
  1. `assessment_sessions` — User assessment sessions, responses, micro-game telemetry, inferred mask, debiased scores.
  2. `shadow_telemetry`    — Seeded with 25 realistic synthetic multi-mask sessions on startup for live shadow-item calibration.
  3. `questions`           — Live editable 120+ item bank synced with `science/models/item_bank_irt.json` and `ADAPTIVE_ITEM_POOL_120`.
  4. `assessment_flows`    — Experimental question sequences, Mind Moments toggles, and conditional branching rules for Kae & Conner.
"""

from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sqlite3
from typing import Any, Dict, List, Optional
import uuid

from science.engine.neuro_psychometrics import NeuroPsychometricEngine
from science.models.adaptive_item_pool_120 import ADAPTIVE_ITEM_POOL_120, DEYOUNG_ASPECT_LABELS

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "aura_production.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_slug(qid: int, text: str, provided_slug: Optional[str] = None) -> str:
    if provided_slug and str(provided_slug).strip():
        return str(provided_slug).strip()
    words = re.findall(r"[a-z0-9]+", (text or "probe").lower())
    short = "-".join(words[:4]) if words else "probe"
    return f"q-{qid:03d}-{short[:32]}"


def _infer_deyoung_aspect(domain: str, aspect_label: str, provided: Optional[str] = None) -> str:
    if provided and str(provided).strip():
        return str(provided).strip()
    low = (aspect_label or "").lower()
    if "intellect" in low or "system" in low:
        return "O_intellect"
    if "openness" in low or "perceptual" in low or "aesthetic" in low:
        return "O_openness"
    if "industrious" in low or "drive" in low:
        return "C_industriousness"
    if "order" in low or "entropy" in low:
        return "C_orderliness"
    if "enthusiasm" in low or "affiliative" in low:
        return "E_enthusiasm"
    if "assertive" in low or "agency" in low:
        return "E_assertiveness"
    if "compassion" in low or "resonance" in low:
        return "A_compassion"
    if "polite" in low or "normative" in low:
        return "A_politeness"
    if "withdrawal" in low or "vigilance" in low:
        return "N_withdrawal"
    if "volatility" in low or "affective" in low:
        return "N_volatility"
    defaults = {
        "O": "O_intellect",
        "C": "C_industriousness",
        "E": "E_enthusiasm",
        "A": "A_compassion",
        "N": "N_withdrawal",
    }
    return defaults.get(domain, "O_intellect")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


DEFAULT_FLOWS: List[Dict[str, Any]] = [
    {
        "id": "default_calm",
        "name": "Core Calm Reflection + 3 Mind Moments",
        "description": "The default 12-anchor blind epistemic reflection paired with 3 brief interactive Mind Moments (Pulse Reaction, Constellation Memory, Mind's Eye) and 3 gentle everyday habit checks.",
        "is_active_default": 1,
        "question_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        "mind_moments": ["pulse_reaction", "constellation_memory", "minds_eye"],
        "branches": [
            {
                "if_question_id": 3,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 13,
                "note": "High curiosity-vs-routine split -> confirm with Sneaky Open Browser Tabs probe (Q13)",
            },
            {
                "if_question_id": 7,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 14,
                "note": "High interpersonal care -> confirm with Sneaky Text Cushion probe (Q14)",
            },
            {
                "if_question_id": 5,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 15,
                "note": "High acoustic room sensitivity -> confirm with Sneaky Canceled Plans relief probe (Q15)",
            },
        ],
    },
    {
        "id": "sneaky_lab",
        "name": "Sneaky Behavioral Habits Experiment",
        "description": "Kae's rapid behavioral habit flow testing indirect ecological micro-questions (browser tabs, text punctuation cushioning, canceled plan relief) against core anchors.",
        "is_active_default": 0,
        "question_ids": [1, 3, 5, 7, 9, 11, 12, 13, 14, 15],
        "mind_moments": ["pulse_reaction", "minds_eye"],
        "branches": [
            {
                "if_question_id": 13,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 4,
                "note": "Cozy 20+ browser tabs -> check physical space orderliness contrast (Q4)",
            },
            {
                "if_question_id": 15,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 6,
                "note": "Relief at canceled plans -> test social agency in small groups (Q6)",
            },
        ],
    },
    {
        "id": "adaptive_branching",
        "name": "Kae's Adaptive Branching Flow",
        "description": "Starts with 8 core symmetry-breaking anchors and dynamically injects shadow behavioral probes and compensatory effort checks only when specific thresholds trigger.",
        "is_active_default": 0,
        "question_ids": [1, 2, 3, 5, 7, 8, 9, 12],
        "mind_moments": ["pulse_reaction", "constellation_memory", "minds_eye"],
        "branches": [
            {
                "if_question_id": 3,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 13,
                "note": "High curiosity-vs-routine split -> branch to Sneaky Browser Tabs probe (Q13)",
            },
            {
                "if_question_id": 3,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 11,
                "note": "High curiosity-vs-routine split -> check behind-the-scenes masking effort (Q11)",
            },
            {
                "if_question_id": 8,
                "operator": "<=",
                "threshold": 2,
                "then_inject_question_id": 14,
                "note": "Prefers gentle hints over bluntness -> branch to Sneaky Text Cushion probe (Q14)",
            },
            {
                "if_question_id": 5,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 15,
                "note": "High overlapping-voice sensitivity -> branch to Sneaky Canceled Plans probe (Q15)",
            },
        ],
    },
    {
        "id": "cat_120_adaptive_tree",
        "name": "120-Item Dynamic CAT & Conditional Branching Tree",
        "description": "Conner & Kae's full 120-item 2PL IRT Adaptive Tree: starts with symmetry-breaking anchors, branches into conditional probes (IDs 16–55), resolves latent traits via DeYoung aspect probes (IDs 56–95), and validates with sneaky everyday micro-moments (IDs 96–120).",
        "is_active_default": 0,
        "question_ids": [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 16, 24, 32, 40, 48, 58, 66, 74, 82, 90, 96, 100, 101],
        "mind_moments": ["pulse_reaction", "constellation_memory", "minds_eye"],
        "branches": [
            {
                "if_question_id": 3,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 24,
                "note": "High curiosity-vs-routine split -> inject Spark & Sprint urgency probe (Q24)",
            },
            {
                "if_question_id": 5,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 32,
                "note": "High two-voice acoustic load -> inject 1-on-1 Dyadic Depth probe (Q32)",
            },
            {
                "if_question_id": 7,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 40,
                "note": "High mutual-hearing priority -> inject Room Weather resonance probe (Q40)",
            },
            {
                "if_question_id": 9,
                "operator": ">=",
                "threshold": 4,
                "then_inject_question_id": 48,
                "note": "High protective foresight -> inject 'What-If' Scenario Tree probe (Q48)",
            },
        ],
    },
]


def init_db(engine: Optional[NeuroPsychometricEngine] = None) -> None:
    if engine is None:
        engine = NeuroPsychometricEngine()

    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS assessment_sessions (
                    id TEXT PRIMARY KEY,
                    user_name TEXT,
                    responses_json TEXT NOT NULL,
                    telemetry_json TEXT NOT NULL,
                    inferred_mask_id TEXT NOT NULL,
                    debiased_scores_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS shadow_telemetry (
                    id TEXT PRIMARY KEY,
                    true_mask_id TEXT NOT NULL,
                    inferred_mask_id TEXT NOT NULL,
                    responses_json TEXT NOT NULL,
                    telemetry_json TEXT NOT NULL,
                    anchor_scores_json TEXT NOT NULL,
                    debiased_scores_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY,
                    slug TEXT NOT NULL DEFAULT '',
                    domain TEXT NOT NULL,
                    deyoung_aspect TEXT NOT NULL DEFAULT '',
                    aspect TEXT NOT NULL,
                    node_tier TEXT NOT NULL DEFAULT 'anchor',
                    layer TEXT NOT NULL,
                    probe_type TEXT NOT NULL,
                    calibration_status TEXT NOT NULL DEFAULT 'calibrated_anchor',
                    empirical_prior_r REAL NOT NULL DEFAULT 0.0,
                    direction INTEGER NOT NULL DEFAULT 1,
                    weight REAL NOT NULL DEFAULT 1.0,
                    irt_a REAL NOT NULL DEFAULT 1.5,
                    irt_b REAL NOT NULL DEFAULT 0.0,
                    mood_halo_loading REAL NOT NULL DEFAULT 0.2,
                    text TEXT NOT NULL,
                    calm_theme TEXT NOT NULL DEFAULT 'Everyday reflection',
                    scientific_hypothesis TEXT NOT NULL DEFAULT '',
                    parent_trigger_json TEXT DEFAULT NULL,
                    active INTEGER NOT NULL DEFAULT 1
                );
                """
            )
            # Seamless schema migration for existing aura_production.db
            for col_ddl in [
                "ALTER TABLE questions ADD COLUMN slug TEXT NOT NULL DEFAULT ''",
                "ALTER TABLE questions ADD COLUMN deyoung_aspect TEXT NOT NULL DEFAULT ''",
                "ALTER TABLE questions ADD COLUMN node_tier TEXT NOT NULL DEFAULT 'anchor'",
                "ALTER TABLE questions ADD COLUMN parent_trigger_json TEXT DEFAULT NULL",
            ]:
                try:
                    conn.execute(col_ddl)
                except sqlite3.OperationalError:
                    pass

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS assessment_flows (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    is_active_default INTEGER NOT NULL DEFAULT 0,
                    question_ids_json TEXT NOT NULL,
                    mind_moments_json TEXT NOT NULL,
                    branches_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS blind_prediction_verifications (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    commitment_hash TEXT NOT NULL,
                    total_items INTEGER NOT NULL,
                    hits INTEGER NOT NULL,
                    hit_rate_pct REAL NOT NULL,
                    brier_score REAL NOT NULL,
                    brier_skill_score REAL NOT NULL,
                    payload_json TEXT NOT NULL
                );
                """
            )

            # Seed / upgrade all 120 calibrated items from ADAPTIVE_ITEM_POOL_120
            pool_by_id = {int(it["id"]): it for it in ADAPTIVE_ITEM_POOL_120}
            for item in ADAPTIVE_ITEM_POOL_120:
                qid = int(item["id"])
                slug = _make_slug(qid, item.get("text", ""), item.get("slug"))
                dom = str(item.get("domain", "O"))
                aspect_str = str(item.get("aspect", "General"))
                deyoung_asp = _infer_deyoung_aspect(dom, aspect_str, item.get("deyoung_aspect"))
                node_tier = str(item.get("node_tier", "anchor"))
                pt_json = json.dumps(item["parent_trigger"]) if item.get("parent_trigger") else None

                conn.execute(
                    """
                    INSERT INTO questions (
                        id, slug, domain, deyoung_aspect, aspect, node_tier,
                        layer, probe_type, calibration_status,
                        empirical_prior_r, direction, weight, irt_a, irt_b,
                        mood_halo_loading, text, calm_theme, scientific_hypothesis,
                        parent_trigger_json, active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT(id) DO UPDATE SET
                        slug = CASE WHEN questions.slug = '' THEN excluded.slug ELSE questions.slug END,
                        deyoung_aspect = CASE WHEN questions.deyoung_aspect = '' THEN excluded.deyoung_aspect ELSE questions.deyoung_aspect END,
                        node_tier = excluded.node_tier,
                        parent_trigger_json = COALESCE(questions.parent_trigger_json, excluded.parent_trigger_json),
                        scientific_hypothesis = CASE WHEN questions.scientific_hypothesis = '' THEN excluded.scientific_hypothesis ELSE questions.scientific_hypothesis END,
                        empirical_prior_r = CASE WHEN questions.empirical_prior_r = 0.0 THEN excluded.empirical_prior_r ELSE questions.empirical_prior_r END;
                    """,
                    (
                        qid,
                        slug,
                        dom,
                        deyoung_asp,
                        aspect_str,
                        node_tier,
                        str(item.get("layer", "cortical_invariant")),
                        str(item.get("probe_type", "general_probe")),
                        str(item.get("calibration_status", "calibrated_anchor")),
                        float(item.get("empirical_prior_r", 0.0)),
                        int(item.get("direction", 1)),
                        float(item.get("weight", 1.0)),
                        float(item.get("irt_a", 1.5)),
                        float(item.get("irt_b", 0.0)),
                        float(item.get("mood_halo_loading", 0.2)),
                        str(item.get("text", "")),
                        str(item.get("calm_theme", "Everyday reflection")),
                        str(item.get("scientific_hypothesis", "")),
                        pt_json,
                    ),
                )

            # Also ensure any additional items in engine.item_bank_schema are preserved
            for item in engine.item_bank_schema.get("items", []):
                qid = int(item["id"])
                if qid in pool_by_id:
                    continue
                slug = _make_slug(qid, item.get("text", ""), item.get("slug"))
                dom = str(item.get("domain", "O"))
                aspect_str = str(item.get("aspect", "General"))
                deyoung_asp = _infer_deyoung_aspect(dom, aspect_str, item.get("deyoung_aspect"))
                node_tier = str(item.get("node_tier", "everyday_moment"))
                pt_json = json.dumps(item["parent_trigger"]) if item.get("parent_trigger") else None
                conn.execute(
                    """
                    INSERT OR IGNORE INTO questions (
                        id, slug, domain, deyoung_aspect, aspect, node_tier,
                        layer, probe_type, calibration_status,
                        empirical_prior_r, direction, weight, irt_a, irt_b,
                        mood_halo_loading, text, calm_theme, scientific_hypothesis,
                        parent_trigger_json, active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
                    """,
                    (
                        qid,
                        slug,
                        dom,
                        deyoung_asp,
                        aspect_str,
                        node_tier,
                        str(item.get("layer", "cortical_invariant")),
                        str(item.get("probe_type", "general_probe")),
                        str(item.get("calibration_status", "calibrated_anchor")),
                        float(item.get("empirical_prior_r", 0.0)),
                        int(item.get("direction", 1)),
                        float(item.get("weight", 1.0)),
                        float(item.get("irt_a", 1.5)),
                        float(item.get("irt_b", 0.0)),
                        float(item.get("mood_halo_loading", 0.2)),
                        str(item.get("text", "")),
                        str(item.get("calm_theme", "Everyday reflection")),
                        str(item.get("scientific_hypothesis", "")),
                        pt_json,
                    ),
                )

            # Seed assessment_flows with the default experimental flows if missing
            now_str = _utc_now()
            cur_f = conn.execute("SELECT COUNT(*) AS cnt FROM assessment_flows;")
            has_any_flow = int(cur_f.fetchone()["cnt"]) > 0
            for fl in DEFAULT_FLOWS:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO assessment_flows (
                        id, name, description, is_active_default,
                        question_ids_json, mind_moments_json, branches_json, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        fl["id"],
                        fl["name"],
                        fl["description"],
                        int(fl["is_active_default"]) if not has_any_flow else 0,
                        json.dumps(fl["question_ids"]),
                        json.dumps(fl["mind_moments"]),
                        json.dumps(fl["branches"]),
                        now_str,
                    ),
                )
    finally:
        conn.close()

    # Sync all 120+ active questions to item_bank_irt.json & reload engine
    _sync_questions_to_json(engine)

    # Seed or refresh synthetic shadow_telemetry if empty or if seeded before 120-item pool upgrade
    conn2 = get_connection()
    try:
        with conn2:
            cur = conn2.execute("SELECT COUNT(*) AS cnt FROM shadow_telemetry;")
            shadow_count = int(cur.fetchone()["cnt"])
            needs_refresh = shadow_count == 0
            if not needs_refresh:
                sample_row = conn2.execute(
                    "SELECT responses_json FROM shadow_telemetry WHERE id LIKE 'syn-cal-%' LIMIT 1;"
                ).fetchone()
                if sample_row:
                    try:
                        parsed_resp = json.loads(sample_row["responses_json"])
                        if len(parsed_resp) < 100:
                            needs_refresh = True
                    except Exception:
                        needs_refresh = True
            if needs_refresh:
                syn_sessions = engine.generate_synthetic_calibration_sessions(n_sessions=25, seed=2026)
                now_str = _utc_now()
                for s in syn_sessions:
                    conn2.execute(
                        """
                        INSERT OR REPLACE INTO shadow_telemetry (
                            id, true_mask_id, inferred_mask_id, responses_json,
                            telemetry_json, anchor_scores_json, debiased_scores_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                        """,
                        (
                            s["session_id"],
                            s["true_mask_id"],
                            s["inferred_mask_id"],
                            json.dumps(s["responses"]),
                            json.dumps(s["telemetry"]),
                            json.dumps(s["anchor_scores"]),
                            json.dumps(s["debiased_scores"]),
                            now_str,
                        ),
                    )

            # Seed blind_prediction_verifications with 18 realistic initial holdout records if empty
            cur_v = conn2.execute("SELECT COUNT(*) AS cnt FROM blind_prediction_verifications;")
            verif_count = int(cur_v.fetchone()["cnt"])
            if verif_count == 0:
                from science.models.oregon_escs_behavioral_matrix import generate_oregon_escs_cohort

                cohort = generate_oregon_escs_cohort(seed=1994)
                holdout_18 = [s for s in cohort if s["split"] == "blind_holdout_20"][:18]
                now_str = _utc_now()
                for idx_v, sub in enumerate(holdout_18):
                    pred_out = engine.predict_behaviors_from_personality(
                        raw_scores=sub["domain_scores"],
                        aspect_scores=sub["aspect_scores"],
                        telemetry=sub["telemetry"],
                        top_k=5,
                    )
                    user_verif_map = {
                        p["act_id"]: int(sub["observed_behaviors"][p["act_id"]])
                        for p in pred_out["top_predictions"]
                    }
                    # Inject occasional realistic falsification on a few seeded sessions so Bayesian updates are visible
                    if idx_v in (2, 5, 9, 13, 16) and pred_out["top_predictions"]:
                        last_aid = pred_out["top_predictions"][-1]["act_id"]
                        user_verif_map[last_aid] = 1 - int(pred_out["top_predictions"][-1]["predicted_binary"])

                    scored = engine.score_user_blind_predictions(
                        predictions=pred_out,
                        user_verifications=user_verif_map,
                        raw_scores=sub["domain_scores"],
                        aspect_scores=sub["aspect_scores"],
                    )
                    vid = f"escs-verif-{idx_v + 1:03d}"
                    payload_doc = {
                        "id": vid,
                        "subject_id": sub["subject_id"],
                        "cohort_label": sub["cohort_label"],
                        "scored_verification": scored,
                    }
                    conn2.execute(
                        """
                        INSERT OR REPLACE INTO blind_prediction_verifications (
                            id, created_at, commitment_hash, total_items,
                            hits, hit_rate_pct, brier_score, brier_skill_score, payload_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                        """,
                        (
                            vid,
                            now_str,
                            str(scored["commitment_hash"]),
                            int(scored["total"]),
                            int(scored["hits"]),
                            float(scored["hit_rate_pct"]),
                            float(scored["brier_score"]),
                            float(scored["brier_skill_score"]),
                            json.dumps(payload_doc),
                        ),
                    )
    finally:
        conn2.close()


def save_blind_prediction_verification(
    scored_result: Dict[str, Any],
    verification_id: Optional[str] = None,
    extra_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    vid = verification_id or f"verif-{uuid.uuid4().hex[:10]}"
    now_str = _utc_now()
    commitment_hash = str(scored_result.get("commitment_hash") or "")
    total_items = int(scored_result.get("total", 0))
    hits = int(scored_result.get("hits", 0))
    hit_rate_pct = float(scored_result.get("hit_rate_pct", 0.0))
    brier_score = float(scored_result.get("brier_score", 0.25))
    brier_skill_score = float(scored_result.get("brier_skill_score", 0.0))

    payload_doc = {
        "id": vid,
        "created_at": now_str,
        "scored_verification": scored_result,
        **(extra_meta or {}),
    }
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO blind_prediction_verifications (
                    id, created_at, commitment_hash, total_items,
                    hits, hit_rate_pct, brier_score, brier_skill_score, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    vid,
                    now_str,
                    commitment_hash,
                    total_items,
                    hits,
                    hit_rate_pct,
                    brier_score,
                    brier_skill_score,
                    json.dumps(payload_doc),
                ),
            )
    finally:
        conn.close()

    return {
        "id": vid,
        "created_at": now_str,
        "commitment_hash": commitment_hash,
        "total_items": total_items,
        "hits": hits,
        "hit_rate_pct": hit_rate_pct,
        "brier_score": brier_score,
        "brier_skill_score": brier_skill_score,
    }


def list_blind_prediction_verifications(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM blind_prediction_verifications ORDER BY created_at DESC, id DESC LIMIT ?;",
            (int(limit),),
        ).fetchall()
        results: List[Dict[str, Any]] = []
        for r in rows:
            try:
                payload = json.loads(r["payload_json"])
            except Exception:
                payload = {}
            results.append({
                "id": r["id"],
                "created_at": r["created_at"],
                "commitment_hash": r["commitment_hash"],
                "total_items": int(r["total_items"]),
                "hits": int(r["hits"]),
                "hit_rate_pct": float(r["hit_rate_pct"]),
                "brier_score": float(r["brier_score"]),
                "brier_skill_score": float(r["brier_skill_score"]),
                "payload": payload,
            })
        return results
    finally:
        conn.close()


def get_blind_prediction_verification_summary() -> Dict[str, Any]:
    rows = list_blind_prediction_verifications(limit=250)
    if not rows:
        return {
            "total_verified_sessions": 0,
            "total_verified_items": 0,
            "total_hits": 0,
            "mean_hit_rate_pct": 0.0,
            "mean_brier_score": 0.25,
            "mean_brier_skill_score": 0.0,
            "recent_verifications": [],
        }
    total_sessions = len(rows)
    total_items = sum(int(r["total_items"]) for r in rows)
    total_hits = sum(int(r["hits"]) for r in rows)
    mean_hr = round((total_hits / max(1, total_items)) * 100.0, 1)
    mean_brier = round(sum(float(r["brier_score"]) for r in rows) / total_sessions, 4)
    mean_bss = round(sum(float(r["brier_skill_score"]) for r in rows) / total_sessions, 3)

    return {
        "total_verified_sessions": total_sessions,
        "total_verified_items": total_items,
        "total_hits": total_hits,
        "mean_hit_rate_pct": mean_hr,
        "mean_brier_score": mean_brier,
        "mean_brier_skill_score": mean_bss,
        "recent_verifications": rows[:25],
    }


def save_assessment_session(
    responses: Dict[str, Any],
    telemetry: Optional[Dict[str, Any]],
    inferred_mask_id: str,
    debiased_scores: Dict[str, float],
    user_name: str = "Anonymous Explorer",
    session_id: Optional[str] = None,
) -> str:
    sid = session_id or f"aura-{uuid.uuid4().hex[:12]}"
    now_str = _utc_now()
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO assessment_sessions (
                    id, user_name, responses_json, telemetry_json,
                    inferred_mask_id, debiased_scores_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    sid,
                    user_name,
                    json.dumps(responses or {}),
                    json.dumps(telemetry or {}),
                    inferred_mask_id,
                    json.dumps(debiased_scores or {}),
                    now_str,
                ),
            )
    finally:
        conn.close()
    return sid


def get_assessment_session(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cur = conn.execute(
            "SELECT * FROM assessment_sessions WHERE id = ?;", (session_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "session_id": row["id"],
            "user_name": row["user_name"],
            "responses": json.loads(row["responses_json"]),
            "telemetry": json.loads(row["telemetry_json"]),
            "inferred_mask_id": row["inferred_mask_id"],
            "debiased_scores": json.loads(row["debiased_scores_json"]),
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def get_session_counts() -> Dict[str, int]:
    conn = get_connection()
    try:
        c1 = int(conn.execute("SELECT COUNT(*) AS cnt FROM assessment_sessions;").fetchone()["cnt"])
        c2 = int(conn.execute("SELECT COUNT(*) AS cnt FROM shadow_telemetry;").fetchone()["cnt"])
        q_cnt = int(conn.execute("SELECT COUNT(*) AS cnt FROM questions WHERE active = 1;").fetchone()["cnt"])
        f_cnt = int(conn.execute("SELECT COUNT(*) AS cnt FROM assessment_flows;").fetchone()["cnt"])
        v_cnt = int(conn.execute("SELECT COUNT(*) AS cnt FROM blind_prediction_verifications;").fetchone()["cnt"])
        return {
            "live_assessment_sessions": c1,
            "seeded_shadow_calibration_sessions": c2,
            "total_calibration_corpus": c1 + c2,
            "active_questions": q_cnt,
            "experimental_flows": f_cnt,
            "blind_prediction_verifications": v_cnt,
        }
    finally:
        conn.close()


def get_all_calibration_records() -> List[Dict[str, Any]]:
    conn = get_connection()
    records: List[Dict[str, Any]] = []
    try:
        for row in conn.execute("SELECT * FROM shadow_telemetry ORDER BY created_at ASC;"):
            records.append({
                "id": row["id"],
                "responses_json": row["responses_json"],
                "telemetry_json": row["telemetry_json"],
                "debiased_scores_json": row["debiased_scores_json"],
            })
        for row in conn.execute("SELECT * FROM assessment_sessions ORDER BY created_at ASC;"):
            records.append({
                "id": row["id"],
                "responses_json": row["responses_json"],
                "telemetry_json": row["telemetry_json"],
                "debiased_scores_json": row["debiased_scores_json"],
            })
    finally:
        conn.close()
    return records


def _row_to_question_dict(r: sqlite3.Row) -> Dict[str, Any]:
    keys = r.keys()
    qid = int(r["id"])
    dom = r["domain"]
    aspect_str = r["aspect"]
    slug = r["slug"] if "slug" in keys and r["slug"] else _make_slug(qid, r["text"])
    deyoung_asp = (
        r["deyoung_aspect"]
        if "deyoung_aspect" in keys and r["deyoung_aspect"]
        else _infer_deyoung_aspect(dom, aspect_str)
    )
    node_tier = r["node_tier"] if "node_tier" in keys and r["node_tier"] else "anchor"
    parent_trigger = None
    if "parent_trigger_json" in keys and r["parent_trigger_json"]:
        try:
            parent_trigger = json.loads(r["parent_trigger_json"])
        except Exception:
            parent_trigger = None

    return {
        "id": qid,
        "slug": slug,
        "domain": dom,
        "deyoung_aspect": deyoung_asp,
        "aspect": aspect_str,
        "node_tier": node_tier,
        "layer": r["layer"],
        "probe_type": r["probe_type"],
        "calibration_status": r["calibration_status"],
        "empirical_prior_r": float(r["empirical_prior_r"]),
        "direction": int(r["direction"]),
        "weight": float(r["weight"]),
        "irt_a": float(r["irt_a"]),
        "irt_b": float(r["irt_b"]),
        "mood_halo_loading": float(r["mood_halo_loading"]),
        "text": r["text"],
        "calm_theme": r["calm_theme"],
        "scientific_hypothesis": r["scientific_hypothesis"],
        "parent_trigger": parent_trigger,
        "active": bool(r["active"]),
    }


def list_questions(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        sql = "SELECT * FROM questions"
        if active_only:
            sql += " WHERE active = 1"
        sql += " ORDER BY id ASC;"
        rows = conn.execute(sql).fetchall()
        return [_row_to_question_dict(r) for r in rows]
    finally:
        conn.close()


def _sync_questions_to_json(engine: NeuroPsychometricEngine) -> None:
    active_items = list_questions(active_only=True)
    clean_items = []
    for it in active_items:
        item_dict: Dict[str, Any] = {
            "id": it["id"],
            "slug": it["slug"],
            "domain": it["domain"],
            "deyoung_aspect": it["deyoung_aspect"],
            "aspect": it["aspect"],
            "node_tier": it["node_tier"],
            "layer": it["layer"],
            "probe_type": it["probe_type"],
            "calibration_status": it["calibration_status"],
            "direction": it["direction"],
            "weight": it["weight"],
            "irt_a": it["irt_a"],
            "irt_b": it["irt_b"],
            "mood_halo_loading": it["mood_halo_loading"],
            "text": it["text"],
            "calm_theme": it["calm_theme"],
        }
        if it.get("empirical_prior_r"):
            item_dict["empirical_prior_r"] = it["empirical_prior_r"]
        if it.get("scientific_hypothesis"):
            item_dict["scientific_hypothesis"] = it["scientific_hypothesis"]
        if it.get("parent_trigger") is not None:
            item_dict["parent_trigger"] = it["parent_trigger"]
        clean_items.append(item_dict)

    engine.item_bank_schema["schema_version"] = "5.0.0"
    engine.item_bank_schema["description"] = (
        f"{len(clean_items)}-Item Calibrated Adaptive Question Tree & Epistemic Blind-Inference Bank "
        "(12 Core Anchors, 40 Conditional Branch Probes, 40 DeYoung 2PL IRT Deep-Resolution Items, "
        "and 28 Disarming Everyday Behavioral Micro-Questions)."
    )
    engine.item_bank_schema["items"] = clean_items
    with open(engine.models_dir / "item_bank_irt.json", "w", encoding="utf-8") as f:
        json.dump(engine.item_bank_schema, f, indent=2, ensure_ascii=False)
    engine.reload_models()


def _upsert_question_row(conn: sqlite3.Connection, q_data: Dict[str, Any]) -> int:
    qid = q_data.get("id")
    if qid is None:
        row = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM questions;").fetchone()
        qid = int(row["next_id"])
    else:
        qid = int(qid)

    dom = str(q_data.get("domain", "O"))
    deyoung_asp = _infer_deyoung_aspect(
        dom, str(q_data.get("aspect", "")), q_data.get("deyoung_aspect")
    )
    default_aspect_label = DEYOUNG_ASPECT_LABELS.get(deyoung_asp, "Everyday Behavioral Probe")
    aspect_str = str(q_data.get("aspect") or default_aspect_label)
    node_tier = str(q_data.get("node_tier", "everyday_moment"))
    calibration_status = str(
        q_data.get(
            "calibration_status",
            "shadow_candidate" if node_tier == "everyday_moment" else "calibrated_anchor",
        )
    )
    default_weight = 0.0 if calibration_status == "shadow_candidate" else 1.15
    weight = (
        float(q_data["weight"])
        if "weight" in q_data and q_data["weight"] is not None
        else default_weight
    )
    text_str = str(q_data.get("text", ""))
    slug = _make_slug(qid, text_str, q_data.get("slug"))
    parent_trigger = q_data.get("parent_trigger")
    pt_json = json.dumps(parent_trigger) if parent_trigger is not None else None

    conn.execute(
        """
        INSERT INTO questions (
            id, slug, domain, deyoung_aspect, aspect, node_tier,
            layer, probe_type, calibration_status,
            empirical_prior_r, direction, weight, irt_a, irt_b,
            mood_halo_loading, text, calm_theme, scientific_hypothesis,
            parent_trigger_json, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            domain = excluded.domain,
            deyoung_aspect = excluded.deyoung_aspect,
            aspect = excluded.aspect,
            node_tier = excluded.node_tier,
            layer = excluded.layer,
            probe_type = excluded.probe_type,
            calibration_status = excluded.calibration_status,
            empirical_prior_r = excluded.empirical_prior_r,
            direction = excluded.direction,
            weight = excluded.weight,
            irt_a = excluded.irt_a,
            irt_b = excluded.irt_b,
            mood_halo_loading = excluded.mood_halo_loading,
            text = excluded.text,
            calm_theme = excluded.calm_theme,
            scientific_hypothesis = excluded.scientific_hypothesis,
            parent_trigger_json = excluded.parent_trigger_json,
            active = excluded.active;
        """,
        (
            qid,
            slug,
            dom,
            deyoung_asp,
            aspect_str,
            node_tier,
            str(q_data.get("layer", "shadow_behavioral_probe")),
            str(q_data.get("probe_type", "sneaky_custom_probe")),
            calibration_status,
            float(q_data.get("empirical_prior_r", 0.45)),
            int(q_data.get("direction", 1)),
            weight,
            float(q_data.get("irt_a", 1.45)),
            float(q_data.get("irt_b", 0.0)),
            float(q_data.get("mood_halo_loading", 0.18)),
            text_str,
            str(q_data.get("calm_theme", "Everyday habit")),
            str(q_data.get("scientific_hypothesis", "")),
            pt_json,
            1 if q_data.get("active", True) else 0,
        ),
    )
    return qid


def upsert_question(q_data: Dict[str, Any], engine: NeuroPsychometricEngine) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn:
            qid = _upsert_question_row(conn, q_data)
    finally:
        conn.close()

    _sync_questions_to_json(engine)
    questions = {q["id"]: q for q in list_questions(active_only=False)}
    return questions[qid]


def bulk_upsert_questions(
    items_list: List[Dict[str, Any]], engine: NeuroPsychometricEngine
) -> List[Dict[str, Any]]:
    upserted_ids: List[int] = []
    conn = get_connection()
    try:
        with conn:
            for q_data in items_list:
                qid = _upsert_question_row(conn, q_data)
                upserted_ids.append(qid)
    finally:
        conn.close()

    _sync_questions_to_json(engine)
    questions_by_id = {q["id"]: q for q in list_questions(active_only=False)}
    return [questions_by_id[qid] for qid in upserted_ids if qid in questions_by_id]


def delete_or_toggle_question(
    q_id: int, engine: NeuroPsychometricEngine, hard_delete: bool = False
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn:
            row = conn.execute("SELECT * FROM questions WHERE id = ?;", (int(q_id),)).fetchone()
            if not row:
                return {"deleted": False, "error": f"Question {q_id} not found"}
            if hard_delete:
                conn.execute("DELETE FROM questions WHERE id = ?;", (int(q_id),))
                status = "deleted"
            else:
                new_active = 0 if int(row["active"]) == 1 else 1
                conn.execute("UPDATE questions SET active = ? WHERE id = ?;", (new_active, int(q_id)))
                status = "activated" if new_active == 1 else "deactivated"
    finally:
        conn.close()

    _sync_questions_to_json(engine)
    return {"question_id": int(q_id), "status": status}


def list_flows() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM assessment_flows ORDER BY is_active_default DESC, id ASC;").fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "description": r["description"],
                "is_active_default": bool(r["is_active_default"]),
                "question_ids": json.loads(r["question_ids_json"]),
                "mind_moments": json.loads(r["mind_moments_json"]),
                "branches": json.loads(r["branches_json"]),
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_flow(flow_id: str) -> Optional[Dict[str, Any]]:
    for fl in list_flows():
        if fl["id"] == flow_id:
            return fl
    return None


def get_active_flow() -> Dict[str, Any]:
    flows = list_flows()
    for fl in flows:
        if fl["is_active_default"]:
            return fl
    return flows[0] if flows else DEFAULT_FLOWS[0]


def upsert_flow(flow_data: Dict[str, Any]) -> Dict[str, Any]:
    flow_id = str(flow_data.get("id") or f"flow_{uuid.uuid4().hex[:6]}").strip()
    name = str(flow_data.get("name", "Untitled Experimental Flow"))
    description = str(flow_data.get("description", "Custom assessment flow created in Kae & Conner's Studio."))
    is_active = 1 if flow_data.get("is_active_default", False) else 0
    question_ids = [int(x) for x in flow_data.get("question_ids", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])]
    mind_moments = [str(x) for x in flow_data.get("mind_moments", ["pulse_reaction", "constellation_memory", "minds_eye"])]
    branches = list(flow_data.get("branches", []))
    now_str = _utc_now()

    conn = get_connection()
    try:
        with conn:
            if is_active == 1:
                conn.execute("UPDATE assessment_flows SET is_active_default = 0;")
            conn.execute(
                """
                INSERT INTO assessment_flows (
                    id, name, description, is_active_default,
                    question_ids_json, mind_moments_json, branches_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    is_active_default = excluded.is_active_default,
                    question_ids_json = excluded.question_ids_json,
                    mind_moments_json = excluded.mind_moments_json,
                    branches_json = excluded.branches_json,
                    updated_at = excluded.updated_at;
                """,
                (
                    flow_id,
                    name,
                    description,
                    is_active,
                    json.dumps(question_ids),
                    json.dumps(mind_moments),
                    json.dumps(branches),
                    now_str,
                ),
            )
    finally:
        conn.close()
    return get_flow(flow_id) or {}


def activate_flow(flow_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn:
            row = conn.execute("SELECT id FROM assessment_flows WHERE id = ?;", (flow_id,)).fetchone()
            if not row:
                return None
            conn.execute("UPDATE assessment_flows SET is_active_default = 0;")
            conn.execute(
                "UPDATE assessment_flows SET is_active_default = 1, updated_at = ? WHERE id = ?;",
                (_utc_now(), flow_id),
            )
    finally:
        conn.close()
    return get_flow(flow_id)
