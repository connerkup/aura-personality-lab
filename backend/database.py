"""
SQLite WAL Persistence Layer for Aura Tier-2 Backend & Kae's Collaborative Science Studio.

Database file: `/home/ubuntu/personality-lab/backend/aura_production.db`
Tables:
  1. `assessment_sessions` — User assessment sessions, responses, micro-game telemetry, inferred mask, debiased scores.
  2. `shadow_telemetry`    — Seeded with 25 realistic synthetic multi-mask sessions on startup for live shadow-item calibration.
  3. `questions`           — Live editable item bank synced with `science/models/item_bank_irt.json`.
  4. `assessment_flows`    — Experimental question sequences, Mind Moments toggles, and conditional branching rules for Kae & Conner.
"""

from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional
import uuid

from science.engine.neuro_psychometrics import NeuroPsychometricEngine

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "aura_production.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
                    domain TEXT NOT NULL,
                    aspect TEXT NOT NULL,
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
                    active INTEGER NOT NULL DEFAULT 1
                );
                """
            )
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

            # Seed shadow_telemetry with 25 realistic synthetic calibration sessions if empty
            cur = conn.execute("SELECT COUNT(*) AS cnt FROM shadow_telemetry;")
            shadow_count = int(cur.fetchone()["cnt"])
            if shadow_count == 0:
                syn_sessions = engine.generate_synthetic_calibration_sessions(n_sessions=25, seed=2026)
                now_str = _utc_now()
                for s in syn_sessions:
                    conn.execute(
                        """
                        INSERT INTO shadow_telemetry (
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

            # Seed questions from item_bank_irt.json if empty or missing new items
            for item in engine.item_bank_schema.get("items", []):
                conn.execute(
                    """
                    INSERT OR IGNORE INTO questions (
                        id, domain, aspect, layer, probe_type, calibration_status,
                        empirical_prior_r, direction, weight, irt_a, irt_b,
                        mood_halo_loading, text, calm_theme, scientific_hypothesis, active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
                    """,
                    (
                        int(item["id"]),
                        str(item.get("domain", "O")),
                        str(item.get("aspect", "General")),
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
                    ),
                )

            # Seed assessment_flows with the 3 default experimental flows if empty
            cur_f = conn.execute("SELECT COUNT(*) AS cnt FROM assessment_flows;")
            if int(cur_f.fetchone()["cnt"]) == 0:
                now_str = _utc_now()
                for fl in DEFAULT_FLOWS:
                    conn.execute(
                        """
                        INSERT INTO assessment_flows (
                            id, name, description, is_active_default,
                            question_ids_json, mind_moments_json, branches_json, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                        """,
                        (
                            fl["id"],
                            fl["name"],
                            fl["description"],
                            int(fl["is_active_default"]),
                            json.dumps(fl["question_ids"]),
                            json.dumps(fl["mind_moments"]),
                            json.dumps(fl["branches"]),
                            now_str,
                        ),
                    )
    finally:
        conn.close()


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
        return {
            "live_assessment_sessions": c1,
            "seeded_shadow_calibration_sessions": c2,
            "total_calibration_corpus": c1 + c2,
            "active_questions": q_cnt,
            "experimental_flows": f_cnt,
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


def list_questions(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        sql = "SELECT * FROM questions"
        if active_only:
            sql += " WHERE active = 1"
        sql += " ORDER BY id ASC;"
        rows = conn.execute(sql).fetchall()
        return [
            {
                "id": int(r["id"]),
                "domain": r["domain"],
                "aspect": r["aspect"],
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
                "active": bool(r["active"]),
            }
            for r in rows
        ]
    finally:
        conn.close()


def _sync_questions_to_json(engine: NeuroPsychometricEngine) -> None:
    active_items = list_questions(active_only=True)
    clean_items = []
    for it in active_items:
        item_dict = {
            "id": it["id"],
            "domain": it["domain"],
            "aspect": it["aspect"],
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
        clean_items.append(item_dict)

    engine.item_bank_schema["items"] = clean_items
    with open(engine.models_dir / "item_bank_irt.json", "w", encoding="utf-8") as f:
        json.dump(engine.item_bank_schema, f, indent=2, ensure_ascii=False)
    engine.reload_models()


def upsert_question(q_data: Dict[str, Any], engine: NeuroPsychometricEngine) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn:
            qid = q_data.get("id")
            if qid is None:
                row = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM questions;").fetchone()
                qid = int(row["next_id"])
            else:
                qid = int(qid)

            calibration_status = str(q_data.get("calibration_status", "shadow_candidate"))
            default_weight = 0.0 if calibration_status == "shadow_candidate" else 1.15
            weight = float(q_data["weight"]) if "weight" in q_data and q_data["weight"] is not None else default_weight

            conn.execute(
                """
                INSERT INTO questions (
                    id, domain, aspect, layer, probe_type, calibration_status,
                    empirical_prior_r, direction, weight, irt_a, irt_b,
                    mood_halo_loading, text, calm_theme, scientific_hypothesis, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    domain = excluded.domain,
                    aspect = excluded.aspect,
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
                    active = excluded.active;
                """,
                (
                    qid,
                    str(q_data.get("domain", "O")),
                    str(q_data.get("aspect", "Everyday Behavioral Probe")),
                    str(q_data.get("layer", "shadow_behavioral_probe")),
                    str(q_data.get("probe_type", "sneaky_custom_probe")),
                    calibration_status,
                    float(q_data.get("empirical_prior_r", 0.45)),
                    int(q_data.get("direction", 1)),
                    weight,
                    float(q_data.get("irt_a", 1.45)),
                    float(q_data.get("irt_b", 0.0)),
                    float(q_data.get("mood_halo_loading", 0.18)),
                    str(q_data.get("text", "")),
                    str(q_data.get("calm_theme", "Everyday habit")),
                    str(q_data.get("scientific_hypothesis", "")),
                    1 if q_data.get("active", True) else 0,
                ),
            )
    finally:
        conn.close()

    _sync_questions_to_json(engine)
    questions = {q["id"]: q for q in list_questions(active_only=False)}
    return questions[qid]


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
