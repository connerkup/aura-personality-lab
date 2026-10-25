# Aura Science Studio — AI-Agent Control & Collaboration Guide (`AGENT_API.md`)

Welcome! If you are an AI coding or research agent assisting **Kae** or **Conner**, you can inspect, test, and evolve the entire **Aura Neuro-Psychometric Engine & Collaborative Studio** directly via clean REST endpoints or Python calls.

---

## 1. Quick Discovery Endpoints

- **Self-Describing Agent Manifest**: `GET http://localhost:8095/api/v1/agent/manifest`
- **Interactive Swagger UI (OpenAPI 3.1)**: `http://localhost:8095/docs`
- **Full Studio State (Questions, Flows, Branches, Masks, Shadow Correlations, 28 PDFs)**: `GET http://localhost:8095/api/v1/studio/overview`
- **System & SQLite WAL Health**: `GET http://localhost:8095/api/v1/health`

---

## 2. How the Science Engine Works (`science/engine/neuro_psychometrics.py`)

Aura separates four confounded signal layers in human personality assessment:
$$\mathbf{y}_{\text{raw}} = \mathbf{B}_{\text{wiring}}(\text{mask}) + \Delta\mathbf{P}_{\text{unique}} + \mathbf{S}_{\text{state}}(t) - \Delta O_{\text{aphantasia}}(\text{telemetry})$$

1. **12 Calibrated Anchor Questions (`id: 1..12`, `calibration_status: "calibrated_anchor"`)**:
   - Encode Double-Dissociation Context Splits (`Q3` salience vs. routine, `Q5` two-voice acoustic stream), Compensatory Masking Cost (`Q11`), and Differential Epoch State (`Q12`).
2. **Sneaky Behavioral Micro-Questions (`id: 13..15+`, `calibration_status: "shadow_candidate"`)**:
   - Disarming everyday habits (e.g. `Q13` 20+ open browser tabs, `Q14` adding *"!"* or *"haha"* to short texts, `Q15` quiet physical relief when plans cancel).
   - **Zero-Distortion Guarantee**: Shadow candidates carry `weight = 0.0` during primary anchor scoring so Kae can freely experiment with new questions in production without distorting anchor scores until empirical calibration proves they are ready to graduate (`graduation_ready: true`).
3. **3 Behavioral Micro-Game Telemetry Streams**:
   - `pulse_reaction`: Median RT (`ms`), RT Coefficient of Variation (`rt_cv_pct`), and anticipatory `false_starts`.
   - `constellation_memory`: Spatial pattern reconstruction `accuracy_pct` and `mean_chunk_ms`.
   - `minds_eye`: Cortical visual imagery vividness (`0..100`) and `inner_modality` (`wordless_concept`, `inner_voice`, `visual_cinema`). Automatically triggers the **Aphantasia Openness De-Confounder (+12% to +18%)** when `imagery_vividness <= 25`.

---

## 3. Common Tasks for Kae's AI Agent

### A. Add or Update a Question (`POST /api/v1/studio/questions`)
Adds a question to SQLite (`backend/aura_production.db`) and automatically syncs `science/models/item_bank_irt.json`:

```bash
curl -s -X POST http://localhost:8095/api/v1/studio/questions \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "C",
    "aspect": "Entropy Suppression (Orderliness)",
    "layer": "shadow_behavioral_probe",
    "probe_type": "sneaky_laundry_chair",
    "calibration_status": "shadow_candidate",
    "empirical_prior_r": -0.54,
    "direction": -1,
    "irt_a": 1.44,
    "irt_b": -0.10,
    "text": "I have a dedicated chair or surface for clothes that are not dirty enough for the wash but not quite ready to go back in the closet.",
    "calm_theme": "Everyday spaces",
    "scientific_hypothesis": "Ecological proxy for intermediate state-buffering vs binary closure."
  }'
```

### B. Create or Update an Experimental Branching Flow (`POST /api/v1/studio/flows`)
Kae can design custom question sequences, choose which Mind Moments run, and define `if_question_id` conditional branching rules:

```bash
curl -s -X POST http://localhost:8095/api/v1/studio/flows \
  -H "Content-Type: application/json" \
  -d '{
    "id": "kae_adaptive_v2",
    "name": "Kae Adaptive Habit Flow",
    "description": "Branches into sneaky habit probes when curiosity-split or acoustic sensitivity is high.",
    "is_active_default": true,
    "question_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "mind_moments": ["pulse_reaction", "constellation_memory", "minds_eye"],
    "branches": [
      {
        "if_question_id": 3,
        "operator": ">=",
        "threshold": 4,
        "then_inject_question_id": 13,
        "note": "High curiosity-vs-routine split -> branch to Sneaky Browser Tabs probe (Q13)"
      },
      {
        "if_question_id": 5,
        "operator": ">=",
        "threshold": 4,
        "then_inject_question_id": 15,
        "note": "High acoustic room sensitivity -> branch to Sneaky Canceled Plans probe (Q15)"
      }
    ]
  }'
```

### C. Activate Any Flow for Live Testing (`POST /api/v1/studio/flows/{flow_id}/activate`)
```bash
curl -s -X POST http://localhost:8095/api/v1/studio/flows/adaptive_branching/activate
```

### D. Run a Synthetic Monte Carlo Cohort Simulation (`POST /api/v1/agent/simulate`)
Test how an experimental flow, branching rule, or shadow item performs across $N$ synthetic multi-mask users in one call:

```bash
curl -s -X POST http://localhost:8095/api/v1/agent/simulate \
  -H "Content-Type: application/json" \
  -d '{"n_synthetic_users": 60, "flow_id": "adaptive_branching", "seed": 2026}'
```

### E. Read Full-Text Research PDFs (`GET /api/v1/science/pdf/{domain_dir}/{filename}`)
All 28 open-access papers in `science/papers/` are indexed in `GET /api/v1/studio/overview` and served directly as `application/pdf` at `/api/v1/science/pdf/{domain_dir}/{filename}`.
