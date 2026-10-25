# Aura — Neuro-Computational Personality & Quiet Mind Studio

**Live Production App:** [https://aura-kae-lab.pages.dev](https://aura-kae-lab.pages.dev)

Aura is a 3-tier monorepo combining **empirical personality science, active-inference neurodevelopmental priors, and cognitive micro-telemetry** with a **calm, zero-jargon consumer experience** and an internal **Collaborative Science & Flow Studio** for Kae and Conner.

---

## 1. Monorepo Architecture (`science/` $\to$ `backend/` $\to$ `frontend/`)

```text
aura-personality-lab/
├── science/                                # TIER 1: Pure Psychometric & Neuro-Computational Science (Kae's Domain)
│   ├── engine/
│   │   └── neuro_psychometrics.py          # 3-Layer Blind Epistemic Decomposition, IRT/CAT, Aphantasia De-Confounder,
│   │                                       # and SAPA Shadow-Item Empirical Calibration
│   ├── models/
│   │   ├── cortical_dimensions.json        # 4D Cortical Invariants + Neuromodulatory Gains + DeYoung 10 Aspects
│   │   ├── neurodevelopmental_masks.json   # Baseline Brain Wiring Masks (B_wiring) + Calm Narrative Translations
│   │   ├── item_bank_irt.json              # 12 Core Calibrated Anchor Items + 3 "Sneaky" Shadow Candidate Items
│   │   └── cognitive_telemetry_priors.json # Normative priors for Still Water (RT), Night Sky (WM), Inner Canvas (Aphantasia)
│   ├── papers/                             # 28 Verified Full-Text arXiv & Peer-Reviewed PDFs (~83 MB)
│   │   ├── 01_social_manifold/             # 7 PDFs (Thornton & Tamir, Schiller, Fusi & Rutishauser, DeepMind ToMnet)
│   │   ├── 02_predictive_neurotypes/       # 7 PDFs (Friston, Lawson, Da Costa, Safron & DeYoung, Bolis)
│   │   ├── 03_computational_psychometrics/ # 8 PDFs (Bürkner Stan IRT, Ročková Deep CAT, Epskamp & Borsboom Ising/RNM)
│   │   └── 04_cognitive_telemetry/         # 6 PDFs (Pearson Aphantasia, Braver RT Variability, Tsodyks Working Memory)
│   └── calibrate.py                        # Science CLI: validates schemas, runs synthetic cohorts & exports bundles
│
├── backend/                                # TIER 2: FastAPI + Pydantic v2 + SQLite (WAL) API & Studio Control Plane
│   ├── main.py                             # FastAPI application (`/api/v1/*`, `/api/v1/studio/*`, `/api/v1/agent/*`, `/docs`)
│   ├── database.py                         # SQLite WAL persistence (`questions`, `assessment_flows`, `assessment_sessions`, `shadow_telemetry`)
│   ├── schemas.py                          # Strict Pydantic v2 request/response schemas
│   └── server.py                           # Uvicorn ASGI server entrypoint
│
├── frontend/                               # TIER 3: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
│   ├── src/
│   │   ├── components/                     # Calm Sanctuary UI (`Reflect`, `MindMoments`, `Portrait`, `Together`, `ScienceStudio`)
│   │   ├── api/                            # Typed REST client (`client.ts`) with deterministic edge fallback
│   │   ├── data/                           # Compiled science bundle (`scienceBundle.ts`)
│   │   └── types/                          # Strict TypeScript interfaces (`science.ts`)
│   ├── package.json
│   └── vite.config.ts
│
├── AGENT_API.md                            # Self-contained guide for Kae's local AI agent to query & control the studio
└── pyproject.toml                          # `uv` Python project configuration
```

---

## 2. Core Scientific Thesis

Standard personality questionnaires confound three separate biological layers into a single static score. Aura decomposes observed responses and cognitive telemetry via:

$$\mathbf{y}_{\text{observed}} = \underbrace{\mathbf{B}_{\text{wiring}}(m)}_{\substack{\text{1. Baseline Brain Rhythm} \\ \text{(Inferred Blindly)}}} + \underbrace{\Delta \mathbf{P}_{\text{unique}}}_{\substack{\text{2. True Personal Signature} \\ \text{(Residual Divergence)}}} + \underbrace{\mathbf{S}_{\text{state}}(t)}_{\substack{\text{3. Current Season & Mood} \\ \text{(Epoch De-Biased)}}}$$

1. **Blind Epistemic Rhythm Inference ($\mathbf{B}_{\text{wiring}}$):** Infers the user's natural operating rhythm (*Spark-Driven*, *Deep-Current*, *Tides & Anchor*, *Finely Tuned*, or *Steady-Current*) without upfront diagnostic labels using within-domain double dissociations ($\Delta C_{\text{salience}}, \Delta E_{\text{acoustic}}, \Delta N_{\text{valence}}$) and quiet-effort cost ($\mathcal{M}$).
2. **Three 10-Second Interactive Mind Moments:**
   - **Still Water:** Measures baseline reaction time (`ms`) and intra-individual attentional variability (`RT-CV%`).
   - **Night Sky:** Measures $3 \times 3$ visuospatial constellation working memory and chunking speed.
   - **Inner Canvas:** Detects **Concept-First / Pure Knowing (Aphantasia)** vs. vivid visual imagery and **Wordless Concepts (Anendophasia)** vs. inner monologue, automatically applying the **Aphantasia Conceptual Creativity Adjustment** (`+12% to +18%` Openness).
3. **Zero-Weight Shadow Calibration for "Sneaky Questions" (SAPA Method):**
   - Candidate indirect/behavioral questions (`calibration_status: "shadow_candidate"`, `weight: 0.0`) collect empirical cross-correlations ($r$) and 2PL IRT discrimination ($\hat{a}_j$) against anchor traits and micro-game telemetry before graduating to active scoring.

---

## 3. Quickstart (Local Development)

### Start the Tier-1 / Tier-2 FastAPI + SQLite Server
```bash
uv sync
.venv/bin/python backend/server.py 8095
```
- **Consumer App & Kae's Studio GUI:** `http://localhost:8095`
- **Interactive OpenAPI / Swagger GUI:** `http://localhost:8095/docs`
- **AI-Agent Discovery Manifest:** `http://localhost:8095/api/v1/agent/manifest`

### Build the Tier-3 React + TypeScript Frontend
```bash
cd frontend
pnpm install
pnpm run build
```

---

## 4. For Kae’s Local AI Agent
Point any local AI coding or research agent at [`AGENT_API.md`](file:///home/ubuntu/personality-lab/AGENT_API.md) or `GET http://localhost:8095/api/v1/agent/manifest` to add questions, create conditional branching flows, query empirical shadow-item correlations, or run 50-user Monte Carlo cohort simulations (`POST /api/v1/agent/simulate`).
