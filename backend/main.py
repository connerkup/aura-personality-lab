"""
Aura Tier-2 Production FastAPI Application (`backend/main.py`).

Stack:
  - FastAPI + Pydantic v2 + Uvicorn
  - SQLite WAL (`backend/aura_production.db`)
  - NeuroPsychometricEngine (`science/engine/neuro_psychometrics.py`)
  - 120-Item Dynamic CAT Question Tree + DIF-Free Contextual LLM Morphing Engine
  - Kae & Conner's Internal Science Studio + AI-Agent Discovery & Simulation API
"""

from __future__ import annotations
import json
import mimetypes
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import pydantic

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from science.calibrate import load_papers_corpus, run_calibration_and_export
from science.engine.neuro_psychometrics import NeuroPsychometricEngine
from science.models.adaptive_item_pool_120 import (
    AGE_BAND_LABELS,
    DEYOUNG_ASPECT_LABELS,
    LANGUAGE_LABELS,
    LOCALE_LABELS,
    SES_CONTEXT_LABELS,
)
from backend.database import (
    DB_PATH,
    activate_flow,
    bulk_upsert_questions,
    delete_or_toggle_question,
    get_active_flow,
    get_all_calibration_records,
    get_assessment_session,
    get_flow,
    get_session_counts,
    init_db,
    list_flows,
    list_questions,
    save_assessment_session,
    upsert_flow,
    upsert_question,
)
from backend.schemas import (
    AdaptiveNextItemRequest,
    AgentSimulationRequest,
    ChemistryRequest,
    ContextualMorphRequest,
    DecomposeRequest,
    ScienceCalibrateRequest,
    ScoreAssessmentRequest,
    StudioFlowUpsertRequest,
    StudioQuestionBulkUpsertRequest,
    StudioQuestionUpsertRequest,
)

ENGINE = NeuroPsychometricEngine()
init_db(ENGINE)

app = FastAPI(
    title="Aura Neuro-Psychometric Science & Studio API",
    version="5.0.0",
    description=(
        "Tier-2 Production FastAPI + Pydantic v2 + SQLite (WAL) service for Aura's "
        "Blind Epistemic Source Separation Engine, 120-Item 2PL IRT Dynamic Question Tree, "
        "DIF-Free Contextual & Multilingual Morphing Engine, Behavioral Micro-Game Telemetry, "
        "and Kae & Conner's Collaborative Studio."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _compute_live_shadow_stats() -> Dict[str, Any]:
    records = get_all_calibration_records()
    return ENGINE.compute_shadow_item_calibration(records)


def _build_adaptive_pool_summary(questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    tier_counts: Dict[str, int] = {}
    domain_counts: Dict[str, int] = {}
    aspect_counts: Dict[str, int] = {}
    for q in questions:
        if not q.get("active", True):
            continue
        t = str(q.get("node_tier", "anchor"))
        d = str(q.get("domain", "O"))
        a = str(q.get("deyoung_aspect", ""))
        tier_counts[t] = tier_counts.get(t, 0) + 1
        domain_counts[d] = domain_counts.get(d, 0) + 1
        if a:
            aspect_counts[a] = aspect_counts.get(a, 0) + 1

    return {
        "total_active_items": sum(tier_counts.values()),
        "node_tiers": tier_counts,
        "domains": domain_counts,
        "deyoung_aspects": aspect_counts,
        "deyoung_aspect_labels": DEYOUNG_ASPECT_LABELS,
        "context_morph_dimensions": {
            "age_bands": AGE_BAND_LABELS,
            "ses_life_contexts": SES_CONTEXT_LABELS,
            "locales": LOCALE_LABELS,
            "languages": LANGUAGE_LABELS,
        },
    }


@app.get("/api/v1/health")
def get_health() -> Dict[str, Any]:
    counts = get_session_counts()
    return {
        "status": "ok",
        "stack": {
            "framework": "FastAPI",
            "validation": f"Pydantic v{pydantic.__version__}",
            "database": "SQLite3 (WAL mode)",
            "database_path": str(DB_PATH),
            "science_engine": "science.engine.neuro_psychometrics.NeuroPsychometricEngine",
        },
        "architecture": {
            "tier_1_science": "science.engine.neuro_psychometrics.NeuroPsychometricEngine",
            "tier_2_backend": "backend.main:app (FastAPI + SQLite WAL)",
            "tier_3_frontend": "frontend/dist (React 19 + Vite SPA)",
        },
        "schema_versions": {
            "cortical_schema": ENGINE.cortical_schema.get("schema_version", "3.0.0"),
            "masks_schema": ENGINE.masks_schema.get("schema_version", "3.0.0"),
            "item_bank_schema": ENGINE.item_bank_schema.get("schema_version", "5.0.0"),
            "telemetry_priors_schema": ENGINE.telemetry_priors_schema.get("schema_version", "1.0.0"),
        },
        "session_counts": counts,
        "masks_loaded": len(ENGINE.masks_schema.get("masks", [])),
        "items_loaded": len(ENGINE.item_bank_schema.get("items", [])),
        "active_flow_id": get_active_flow().get("id", "default_calm"),
    }


@app.get("/api/v1/science/models")
def get_science_models() -> Dict[str, Any]:
    shadow_stats = _compute_live_shadow_stats()
    papers_corpus = load_papers_corpus(ROOT_DIR / "science")
    questions = list_questions(active_only=False)
    return {
        "cortical_schema": ENGINE.cortical_schema,
        "masks_schema": ENGINE.masks_schema,
        "item_bank_schema": ENGINE.item_bank_schema,
        "telemetry_priors_schema": ENGINE.telemetry_priors_schema,
        "cognitive_telemetry_priors": ENGINE.telemetry_priors_schema,
        "shadow_calibration_stats": shadow_stats,
        "adaptive_pool_summary": _build_adaptive_pool_summary(questions),
        "active_flow": get_active_flow(),
        "flows": list_flows(),
        "papers_corpus": papers_corpus,
    }


@app.put("/api/v1/science/calibrate")
def put_science_calibrate(payload: ScienceCalibrateRequest) -> Dict[str, Any]:
    if payload.items is not None:
        ENGINE.item_bank_schema["items"] = payload.items
        with open(ENGINE.models_dir / "item_bank_irt.json", "w", encoding="utf-8") as f:
            json.dump(ENGINE.item_bank_schema, f, indent=2, ensure_ascii=False)
    if payload.masks is not None:
        ENGINE.masks_schema["masks"] = payload.masks
        with open(ENGINE.models_dir / "neurodevelopmental_masks.json", "w", encoding="utf-8") as f:
            json.dump(ENGINE.masks_schema, f, indent=2, ensure_ascii=False)

    ENGINE.reload_models()
    init_db(ENGINE)
    run_calibration_and_export()
    return {
        "status": "calibrated",
        "items_count": len(ENGINE.item_bank_schema["items"]),
        "masks_count": len(ENGINE.masks_schema["masks"]),
        "shadow_calibration_stats": _compute_live_shadow_stats(),
    }


@app.get("/api/v1/science/pdf/{domain_dir}/{filename}")
def get_science_pdf(domain_dir: str, filename: str) -> FileResponse:
    papers_root = (ROOT_DIR / "science" / "papers").resolve()
    target_pdf = (papers_root / domain_dir / filename).resolve()
    if not str(target_pdf).startswith(str(papers_root)) or not target_pdf.exists() or not target_pdf.is_file():
        raise HTTPException(status_code=404, detail=f"PDF not found: {domain_dir}/{filename}")
    return FileResponse(
        path=str(target_pdf),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@app.post("/api/v1/assessment/score")
def post_assessment_score(payload: ScoreAssessmentRequest) -> Dict[str, Any]:
    responses = {str(k): int(round(float(v))) for k, v in (payload.responses or {}).items()}
    mask_id = payload.mask_id or "auto"
    telemetry = payload.telemetry

    irt_res = ENGINE.score_responses_irt(responses, telemetry=telemetry)
    decomp = ENGINE.decompose_signal(
        raw_scores=irt_res["raw_scores"],
        mask_id=mask_id,
        mood_energy=payload.mood_energy,
        self_criticism=payload.self_criticism,
        responses=responses,
        telemetry=telemetry,
    )

    session_id: Optional[str] = payload.session_id
    if responses:
        session_id = save_assessment_session(
            responses=responses,
            telemetry=telemetry,
            inferred_mask_id=decomp["mask_applied"]["id"],
            debiased_scores=decomp["signal_layers"]["debiased_scores"],
            user_name=payload.user_name or "Anonymous Explorer",
            session_id=payload.session_id,
        )

    return {
        "session_id": session_id,
        "irt_scoring": irt_res,
        "decomposition": decomp,
    }


@app.post("/api/v1/assessment/decompose")
def post_assessment_decompose(payload: DecomposeRequest) -> Dict[str, Any]:
    responses = (
        {str(k): int(round(float(v))) for k, v in payload.responses.items()}
        if payload.responses
        else None
    )
    decomp = ENGINE.decompose_signal(
        raw_scores=payload.raw_scores,
        mask_id=payload.mask_id or "auto",
        mood_energy=payload.mood_energy,
        self_criticism=payload.self_criticism,
        responses=responses,
        telemetry=payload.telemetry,
    )
    return decomp


@app.post("/api/v1/assessment/next-item")
@app.post("/api/v1/studio/adaptive/next-item")
def post_assessment_next_item(payload: AdaptiveNextItemRequest) -> Dict[str, Any]:
    return ENGINE.select_next_adaptive_item(
        answered_ids=payload.answered_ids,
        current_scores=payload.current_scores,
        responses=payload.responses,
        telemetry=payload.telemetry,
        context_profile=payload.context_profile,
    )


@app.post("/api/v1/studio/llm/morph-question")
@app.post("/api/v1/assessment/contextualize")
def post_contextual_morph(payload: ContextualMorphRequest) -> Dict[str, Any]:
    ctx_dict = payload.context_profile.model_dump() if payload.context_profile else {}
    if payload.question_ids:
        batch = ENGINE.contextualize_questions_batch(
            question_ids=payload.question_ids,
            context_profile=ctx_dict,
        )
        first = batch["items"][0] if batch["items"] else {}
        return {
            **first,
            "batch_count": batch["count"],
            "items": batch["items"],
        }

    qid = payload.question_id if payload.question_id is not None else 1
    try:
        return ENGINE.morph_question_context(question_id=int(qid), context_profile=ctx_dict)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/v1/profiles/{session_id}")
def get_profile_by_session_id(session_id: str) -> Dict[str, Any]:
    session = get_assessment_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Profile session '{session_id}' not found")

    responses = session.get("responses", {})
    telemetry = session.get("telemetry", {})
    irt_res = ENGINE.score_responses_irt(responses, telemetry=telemetry)
    decomp = ENGINE.decompose_signal(
        raw_scores=irt_res["raw_scores"],
        mask_id=session.get("inferred_mask_id", "auto"),
        responses=responses,
        telemetry=telemetry,
    )
    return {
        "session": session,
        "irt_scoring": irt_res,
        "decomposition": decomp,
    }


@app.post("/api/v1/chemistry/analyze")
def post_chemistry_analyze(payload: ChemistryRequest) -> Dict[str, Any]:
    return ENGINE.analyze_dyadic_chemistry(
        person_a=payload.person_a,
        person_b=payload.person_b,
        context_mode=payload.context_mode,
    )


# ============================================================================
# Kae & Conner's Internal Science & Flow Studio Endpoints (`/api/v1/studio/*`)
# ============================================================================


@app.get("/api/v1/studio/overview")
def get_studio_overview() -> Dict[str, Any]:
    questions = list_questions(active_only=False)
    flows = list_flows()
    active_flow = get_active_flow()
    shadow_stats = _compute_live_shadow_stats()
    papers_corpus = load_papers_corpus(ROOT_DIR / "science")
    counts = get_session_counts()

    return {
        "studio_title": "Kae & Conner's Aura Science & Flow Studio",
        "session_counts": counts,
        "active_flow": active_flow,
        "flows": flows,
        "questions": questions,
        "adaptive_pool_summary": _build_adaptive_pool_summary(questions),
        "masks": ENGINE.masks_schema.get("masks", []),
        "cortical_domains": ENGINE.cortical_schema.get("domains", []),
        "telemetry_priors": ENGINE.telemetry_priors_schema,
        "shadow_calibration_stats": shadow_stats,
        "papers_corpus": papers_corpus,
    }


@app.post("/api/v1/studio/questions")
def post_studio_question(payload: StudioQuestionUpsertRequest) -> Dict[str, Any]:
    saved_q = upsert_question(payload.model_dump(), ENGINE)
    return {
        "status": "saved",
        "question": saved_q,
        "questions": list_questions(active_only=False),
        "shadow_calibration_stats": _compute_live_shadow_stats(),
    }


@app.post("/api/v1/studio/questions/bulk")
def post_studio_questions_bulk(payload: StudioQuestionBulkUpsertRequest) -> Dict[str, Any]:
    raw_list = payload.questions if payload.questions is not None else (payload.items or [])
    if not raw_list:
        raise HTTPException(status_code=400, detail="Provide a non-empty `questions` or `items` list.")
    saved_items = bulk_upsert_questions(raw_list, ENGINE)
    all_questions = list_questions(active_only=False)
    return {
        "status": "bulk_saved",
        "upserted_count": len(saved_items),
        "upserted_questions": saved_items,
        "total_questions": len(all_questions),
        "adaptive_pool_summary": _build_adaptive_pool_summary(all_questions),
    }


@app.delete("/api/v1/studio/questions/{q_id}")
def delete_studio_question(
    q_id: int,
    hard: bool = Query(default=False, description="If true, permanently delete row; otherwise toggle active status."),
) -> Dict[str, Any]:
    result = delete_or_toggle_question(q_id, ENGINE, hard_delete=hard)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return {
        **result,
        "questions": list_questions(active_only=False),
    }


@app.post("/api/v1/studio/flows")
def post_studio_flow(payload: StudioFlowUpsertRequest) -> Dict[str, Any]:
    saved_flow = upsert_flow(payload.model_dump())
    return {
        "status": "saved",
        "flow": saved_flow,
        "active_flow": get_active_flow(),
        "flows": list_flows(),
    }


@app.post("/api/v1/studio/flows/{flow_id}/activate")
def post_activate_studio_flow(flow_id: str) -> Dict[str, Any]:
    activated = activate_flow(flow_id)
    if not activated:
        raise HTTPException(status_code=404, detail=f"Flow '{flow_id}' not found")
    return {
        "status": "activated",
        "active_flow": activated,
        "flows": list_flows(),
    }


# ============================================================================
# AI-Agent Discovery & Monte Carlo Simulation Endpoints (`/api/v1/agent/*`)
# ============================================================================


@app.get("/api/v1/agent/manifest")
def get_agent_manifest() -> Dict[str, Any]:
    return {
        "agent_protocol_version": "2.0.0",
        "name": "Aura Science Studio, 120-Item Dynamic CAT Tree & DIF-Free Contextual Morpher Control Plane",
        "summary": (
            "Self-describing guide for Kae's or Conner's AI coding/research agent. "
            "Use these endpoints to inspect or bulk-add questions across the 120-item CAT pool, "
            "test live Bayesian 2PL IRT + conditional tree selection, run DIF-free contextual "
            "morphing across age/SES/locale/language, and run synthetic Monte Carlo simulations."
        ),
        "interactive_docs": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "agent_markdown_guide": "/home/ubuntu/personality-lab/AGENT_API.md",
        },
        "endpoints": [
            {
                "method": "GET",
                "path": "/api/v1/studio/overview",
                "purpose": "Fetch all 120+ SQLite questions (12 anchors, 40 branch probes, 40 DeYoung 2PL IRT resolution items, 28 everyday moments), flows, masks, and shadow correlations.",
            },
            {
                "method": "POST",
                "path": "/api/v1/assessment/next-item",
                "purpose": "Run live Bayesian 2PL IRT + Conditional Tree Branching selection across the 120-item pool.",
                "example_payload": {
                    "answered_ids": [1, 3, 5],
                    "responses": {"1": 5, "3": 5, "5": 4},
                    "telemetry": {"pulse_reaction": {"median_rt_ms": 268, "rt_cv_pct": 25.4, "false_starts": 2}},
                },
            },
            {
                "method": "POST",
                "path": "/api/v1/studio/llm/morph-question",
                "purpose": "Adapt any question to a user's age_band, ses_life_context, locale, language, and custom_bio with zero Differential Item Functioning (DIF).",
                "example_payload": {
                    "question_id": 6,
                    "context_profile": {
                        "age_band": "25_39",
                        "ses_life_context": "working_practical",
                        "locale": "rural",
                        "language": "en",
                        "custom_bio": "31yo rural paramedic & volunteer firefighter",
                    },
                },
            },
            {
                "method": "POST",
                "path": "/api/v1/studio/questions/bulk",
                "purpose": "Bulk-upsert hundreds or thousands of calibrated or shadow questions in one atomic SQLite + JSON transaction.",
            },
            {
                "method": "POST",
                "path": "/api/v1/studio/questions",
                "purpose": "Create or update a single question in SQLite and automatically sync to science/models/item_bank_irt.json.",
            },
            {
                "method": "DELETE",
                "path": "/api/v1/studio/questions/{q_id}",
                "purpose": "Toggle active status of question {q_id} (or pass ?hard=true to permanently delete).",
            },
            {
                "method": "POST",
                "path": "/api/v1/studio/flows",
                "purpose": "Create or update an experimental assessment flow with custom question ordering, Mind Moments micro-games, and conditional branching rules.",
            },
            {
                "method": "POST",
                "path": "/api/v1/studio/flows/{flow_id}/activate",
                "purpose": "Set {flow_id} as the active default consumer flow in the main app.",
            },
            {
                "method": "POST",
                "path": "/api/v1/agent/simulate",
                "purpose": "Run a synthetic Monte Carlo cohort simulation (N=5..500) across all 5 neurodevelopmental masks.",
            },
        ],
    }


@app.post("/api/v1/agent/simulate")
def post_agent_simulate(payload: AgentSimulationRequest) -> Dict[str, Any]:
    flow = get_flow(payload.flow_id) if payload.flow_id else get_active_flow()
    if not flow:
        flow = get_active_flow()
    return ENGINE.simulate_synthetic_cohort(
        n_synthetic_users=payload.n_synthetic_users,
        flow=flow,
        seed=payload.seed,
    )


# ============================================================================
# Standalone Kae & Conner Studio Serving (`/studio` -> `studio/dist`)
# & Public Consumer Frontend Serving (`/` -> `frontend/dist`)
# ============================================================================


def _resolve_studio_root() -> Path:
    dist_dir = ROOT_DIR / "studio" / "dist"
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        return dist_dir
    return ROOT_DIR / "studio"


def _resolve_frontend_root() -> Path:
    dist_dir = ROOT_DIR / "frontend" / "dist"
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        return dist_dir
    return ROOT_DIR / "frontend"


@app.get("/studio", include_in_schema=False)
@app.get("/studio/", include_in_schema=False)
@app.get("/studio/{rel_path:path}", include_in_schema=False)
def serve_studio_spa(rel_path: str = ""):
    studio_root = _resolve_studio_root().resolve()
    clean_rel = rel_path.lstrip("/")
    if not clean_rel:
        target = studio_root / "index.html"
    else:
        target = (studio_root / clean_rel).resolve()
        if not str(target).startswith(str(studio_root)):
            raise HTTPException(status_code=403, detail="Forbidden")

    if not target.exists() or not target.is_file():
        target = studio_root / "index.html"

    if not target.exists():
        return JSONResponse(
            status_code=200,
            content={"status": "Aura Studio Building", "note": "Run pnpm build in studio/"},
        )

    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(
        path=str(target),
        media_type=mime_type or "application/octet-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"Unknown API endpoint: /{full_path}")

    frontend_root = _resolve_frontend_root().resolve()
    studio_root = _resolve_studio_root().resolve()
    rel = full_path.lstrip("/")
    if not rel:
        target = frontend_root / "index.html"
    else:
        target = (frontend_root / rel).resolve()
        if not str(target).startswith(str(frontend_root)):
            raise HTTPException(status_code=403, detail="Forbidden")
        # If an asset was requested from /studio (without trailing slash), check studio_root/assets as fallback
        if (not target.exists() or not target.is_file()) and rel.startswith("assets/"):
            studio_asset = (studio_root / rel).resolve()
            if str(studio_asset).startswith(str(studio_root)) and studio_asset.exists() and studio_asset.is_file():
                target = studio_asset

    if not target.exists() or not target.is_file():
        target = frontend_root / "index.html"

    if not target.exists():
        return JSONResponse(
            status_code=200,
            content={"status": "Aura Backend Running", "note": "Frontend build in progress"},
        )

    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(
        path=str(target),
        media_type=mime_type or "application/octet-stream",
        headers={"Cache-Control": "no-cache"},
    )
