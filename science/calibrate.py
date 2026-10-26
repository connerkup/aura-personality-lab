#!/usr/bin/env python3
"""
Science Calibration & Verification Pipeline (Tier 1 -> Tier 2/3 Bridge).

Run this script whenever `science/models/*.json`, `science/papers/*/manifest.json`,
or `neuro_psychometrics.py` are updated:
    /home/ubuntu/personality-lab/.venv/bin/python science/calibrate.py

It verifies psychometric invariants (mood-immunity of cortical axes, neurodevelopmental
mask residual isolation, cognitive telemetry priors & Aphantasia de-confounding,
empirical shadow-item calibration, and literature corpus integrity) and compiles
`science/dist/science_bundle.json`.
"""

from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from science.engine.neuro_psychometrics import NeuroPsychometricEngine
from science.models.oregon_escs_behavioral_matrix import export_oregon_escs_matrix_json


def load_papers_corpus(science_dir: Path) -> list:
    papers_dir = science_dir / "papers"
    corpus = []
    if not papers_dir.exists():
        return corpus
    for sub in sorted(papers_dir.iterdir()):
        manifest_path = sub / "manifest.json"
        if sub.is_dir() and manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                papers_list = data.get("papers", [])
                corpus.append({
                    "domain_dir": sub.name,
                    "domain_title": data.get("domain", data.get("collection", sub.name)),
                    "paper_count": len(papers_list),
                    "papers": [
                        {
                            "filename": p.get("filename"),
                            "title": p.get("title"),
                            "authors": p.get("authors"),
                            "year": p.get("year"),
                            "identifier": (
                                p.get("arxiv_id")
                                or p.get("doi")
                                or p.get("pmcid")
                                or p.get("source_id")
                                or p.get("identifier", "")
                            ),
                            "pdf_url": f"/api/v1/science/pdf/{sub.name}/{p.get('filename')}",
                        }
                        for p in papers_list
                    ],
                })
    return corpus


def run_calibration_and_export() -> dict:
    engine = NeuroPsychometricEngine()
    science_dir = ROOT_DIR / "science"
    papers_corpus = load_papers_corpus(science_dir)
    total_pdfs = sum(c["paper_count"] for c in papers_corpus)

    print("=== AURA SCIENCE CALIBRATION PIPELINE ===")
    print(f"Loaded {len(engine.cortical_schema['domains'])} Cortical/Neuromodulatory Domains")
    print(f"Loaded {len(engine.masks_schema['masks'])} Neurodevelopmental Modulatory Masks")
    print(f"Loaded {len(engine.item_bank_schema['items'])} IRT Items (12 Anchors + 3 Sneaky Shadow Candidates)")
    print(
        f"Loaded Cognitive Telemetry Priors (schema v{engine.telemetry_priors_schema.get('schema_version', '1.0.0')})"
    )
    print(f"Indexed {total_pdfs} Verified Full-Text Research PDFs across {len(papers_corpus)} Science Directories")

    # 1. Verify Mood De-Biasing Invariant
    sample_raw = {"O": 84.0, "C": 36.0, "E": 44.0, "A": 76.0, "N": 64.0}
    depleted_run = engine.decompose_signal(
        raw_scores=sample_raw,
        mask_id="adhd_dopamine_forager",
        mood_energy=-0.7,
        self_criticism=0.6,
    )
    print("\n[Verification 1] ADHD Mask + Depleted Mood De-Biasing:")
    print("  Raw Observed Vector:          ", sample_raw)
    print("  Mood Halo Shift S_state(t):   ", depleted_run["signal_layers"]["state_halo_shift"])
    print("  Mood-Debiased Vector:         ", depleted_run["signal_layers"]["debiased_scores"])

    # 2. Verify Cognitive Telemetry & Aphantasia Openness De-Confounder
    sample_telemetry = {
        "pulse_reaction": {"median_rt_ms": 276.0, "rt_cv_pct": 26.4, "false_starts": 2},
        "constellation_memory": {"accuracy_pct": 92.0, "mean_chunk_ms": 335.0},
        "minds_eye": {"imagery_vividness": 10.0, "inner_modality": "wordless_concept"},
    }
    telemetry_run = engine.decompose_signal(
        raw_scores={"O": 68.0, "C": 42.0, "E": 46.0, "A": 74.0, "N": 56.0},
        mask_id="auto",
        telemetry=sample_telemetry,
    )
    tp = telemetry_run["telemetry_profile"]
    print("\n[Verification 2] Cognitive Telemetry + Aphantasia De-Confounder:")
    print(f"  Mind's Eye Label:             {tp['minds_eye_label']} (vividness={tp['imagery_vividness']})")
    print(
        f"  Aphantasia Openness Boost:    +{tp['aphantasia_openness_boost_pct']}% -> Debiased O = {telemetry_run['signal_layers']['debiased_scores']['O']}%"
    )

    # 3. Verify Shadow Item Empirical Calibration
    syn_sessions = engine.generate_synthetic_calibration_sessions(n_sessions=25, seed=2026)
    shadow_cal = engine.compute_shadow_item_calibration(syn_sessions)
    print("\n[Verification 3] Sneaky Behavioral Shadow-Item Calibration (N=25):")
    for sh in shadow_cal["shadow_items"]:
        print(
            f"  Q{sh['item_id']} ({sh['probe_type']}, domain={sh['domain']}): "
            f"empirical r={sh['empirical_target_r']} (p={sh['empirical_target_p_value']}), "
            f"est_irt_a={sh['estimated_irt_a']}, graduation_ready={sh['graduation_ready']}"
        )

    # 4. Verify Oregon ESCS 80/20 Bidirectional Blind Holdout Benchmark
    oregon_matrix = export_oregon_escs_matrix_json()
    oregon_bench = engine.evaluate_oregon_blind_holdout_benchmark()
    d1 = oregon_bench["direction_1_traits_to_behaviors"]
    d2 = oregon_bench["direction_2_behaviors_to_traits"]
    print("\n[Verification 4] Oregon ESCS 80/20 Bidirectional Blind Holdout Benchmark (N=250, 2,000 Holdout Cells):")
    print(
        f"  Direction 1 (Traits+Telemetry -> 40 Acts): Top-5 Hit Rate={d1['top5_hit_rate_pct']}% "
        f"(SR-Only={d1['top5_self_report_only_hit_rate_pct']}%, Lift=+{d1['telemetry_lift_pct']}%), "
        f"AUROC={d1['auroc']}, Brier={d1['brier_score']} (BSS={d1['brier_skill_score']})"
    )
    print(
        f"  Direction 2 (40 Acts+Telemetry -> Traits): Mean Domain r={d2['mean_domain_r']} "
        f"(MAE={d2['mean_domain_mae_pct_pts']} pts), Mean Aspect r={d2['mean_aspect_r']} "
        f"(MAE={d2['mean_aspect_mae_pct_pts']} pts)"
    )

    # 5. Export compiled science bundle to science/dist/science_bundle.json
    dist_dir = science_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    bundle = {
        "cortical_schema": engine.cortical_schema,
        "masks_schema": engine.masks_schema,
        "item_bank_schema": engine.item_bank_schema,
        "cognitive_telemetry_priors": engine.telemetry_priors_schema,
        "telemetry_priors_schema": engine.telemetry_priors_schema,
        "shadow_calibration_stats": shadow_cal,
        "oregon_escs_behavioral_matrix": oregon_matrix,
        "oregon_holdout_benchmark": oregon_bench,
        "papers_corpus": papers_corpus,
    }
    bundle_path = dist_dir / "science_bundle.json"
    with open(bundle_path, "w", encoding="utf-8") as f:
        json.dump(bundle, f, indent=2)

    print(f"\n[Export Complete] Synced compiled science bundle -> {bundle_path}")
    return bundle


if __name__ == "__main__":
    run_calibration_and_export()
