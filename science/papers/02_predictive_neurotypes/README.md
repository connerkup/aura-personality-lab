# 02 — Active Inference, Predictive Processing & Neurodevelopmental Priors

This directory houses the full-text primary literature grounding **Aura's Tier-1 Neuro-Computational Signal Decomposition** (`science/engine/neuro_psychometrics.py`) and **Neurodevelopmental Modulatory Masks** (`science/models/neurodevelopmental_masks.json`).

---

## 1. Core Mathematical Formulation in Aura

Standard lexical personality inventories (e.g., NEO-PI-R, BFI-2) assume a single canonical neurotypical prior. Consequently, they systematically misclassify neurodevelopmental hardware differences—such as **dopaminergic salience-gated action initiation (ADHD)**, **elevated bottom-up sensory precision and monotropic attention tunnels (Autism)**, or **amplified insula/perceptual signal gain (HSP)**—as character deficits or affective psychopathology.

Aura resolves this confound via a 3-layer Bayesian signal decomposition implemented in `NeuroPsychometricEngine.decompose_signal()`:

$$y_{\text{raw}}^{(d)} = B_{\text{wiring}}^{(d)}(\text{mask}) + \Delta P_{\text{unique}}^{(d)} + S_{\text{state}}^{(d)}(\text{mood}, \text{criticism})$$

where for each cortical/neuromodulatory domain $d \in \{O, C, E, A, N\}$:

1. **Allostatic State Halo Removal ($S_{\text{state}}$):**
   Ascending neuromodulatory state fluctuations (mood energy $m \in [-1, 1]$ and self-criticism $c \in [-1, 1]$) scale by each domain's empirical `mood_susceptibility` $\lambda_d \in [0.08, 0.65]$:
   $$S_{\text{state}}^{(N)} = (-14.0\,m + 16.0\,c)\,\lambda_N, \qquad S_{\text{state}}^{(C,E)} = (15.0\,m - 14.0\,c)\,\lambda_{C,E}, \qquad S_{\text{state}}^{(O,A)} = (8.0\,m - 6.0\,c)\,\lambda_{O,A}$$
   $$y_{\text{debiased}}^{(d)} = \text{clamp}\!\left(y_{\text{raw}}^{(d)} - S_{\text{state}}^{(d)},\; 2.0,\; 98.0\right)$$

2. **Neurodevelopmental Hardware Baseline ($B_{\text{wiring}}$):**
   Each mask $k \in \{\text{canonical\_allistic}, \text{adhd\_dopamine\_forager}, \text{monotropic\_sensory\_precision}, \text{audhd\_dual\_attractor}, \text{hsp\_high\_gain\_sensor}\}$ specifies structural prior offsets $\Delta B_k^{(d)}$ (`prior_offsets` in `neurodevelopmental_masks.json`):
   $$B_{\text{wiring}}^{(d)}(k) = \text{clamp}\!\left(50.0 + \Delta B_k^{(d)},\; 2.0,\; 98.0\right)$$

3. **True Residual Personality Divergence ($\Delta P_{\text{unique}}$):**
   $$\Delta P_{\text{unique}}^{(d)} = y_{\text{debiased}}^{(d)} - B_{\text{wiring}}^{(d)}(k)$$

4. **Precision-Gated Sub-Vector De-Confounding (`gating_reinterpretation`):**
   - **Salience-Locked Drive vs. Routine Conscientiousness (Dopaminergic Policy Precision $\gamma$):**
     $$C_{\text{salience}} = \text{clamp}\!\left(y_{\text{debiased}}^{(C)} + \Delta_{\text{salience\_split}},\; 2.0,\; 98.0\right)$$
   - **Dyadic 1-on-1 Capacity vs. Crowd Foraging Extraversion (Sensory Precision $\Pi_{\text{sensory}}$ Attenuation):**
     $$E_{\text{dyadic}} = \text{clamp}\!\left(y_{\text{debiased}}^{(E)} + \Delta_{\text{sensory\_social\_penalty}},\; 2.0,\; 98.0\right)$$
   - **Perceptual Signal Resolution vs. True Affective Dysregulation (Likelihood Gain $\zeta$ Separation):**
     $$N_{\text{true}} = \text{clamp}\!\left(y_{\text{debiased}}^{(N)} - 0.75\,\Delta_{\text{perceptual\_confound}},\; 2.0,\; 98.0\right)$$
     $$R_{\text{perceptual}} = \text{clamp}\!\left(0.6\,y_{\text{debiased}}^{(O)} + 0.4\,y_{\text{debiased}}^{(N)} + 0.5\,\Delta_{\text{perceptual\_confound}},\; 2.0,\; 98.0\right)$$

---

## 2. Verified Full-Text PDF Corpus

All 7 PDFs in this directory have been verified for `%PDF-1.x` binary headers and full-text integrity (>350 KB each):

| Filename | Authors & Year | Identifier | Size | Primary Aura Construct |
| :--- | :--- | :--- | :--- | :--- |
| `lawson_2014_aberrant_precision_autism.pdf` | Lawson, Rees, & Friston (2014) | `doi:10.3389/fnhum.2014.00302` | 351 KB | Elevated sensory precision ($\Pi_{\text{sensory}} / \Pi_{\text{prior}}$) in Autism (`monotropic_sensory_precision`) |
| `friston_2012_dopamine_affordance_active_inference.pdf` | Friston, Shiner, FitzGerald et al. (2012) | `doi:10.1371/journal.pcbi.1002327` | 1,086 KB | Dopaminergic policy precision ($\gamma$) & salience-coupled action gating (`adhd_dopamine_forager`) |
| `dacosta_2020_reward_maximisation_discrete_active_inference.pdf` | Da Costa, Sajid, Parr, Friston, & Smith (2020) | `arXiv:2009.08111` | 1,246 KB | Expected Free Energy $G(\pi)$: Epistemic foraging vs. pragmatic routine (`audhd_dual_attractor`, Domain $C$) |
| `mirza_2019_bayesian_selective_attention_active_inference.pdf` | Mirza, Adams, Friston, & Parr (2019) | `doi:10.1038/s41598-019-50138-8` | 7,823 KB | Likelihood precision ($\zeta$), attentional tunneling (Monotropism) & perceptual gain (`hsp_high_gain_sensor`) |
| `friston_2022_computational_psychiatry_synapses_sentience.pdf` | Friston (2022) | `doi:10.1038/s41380-022-01743-z` | 1,741 KB | Synaptic gain control (ACh, NE, DA, 5-HT) & State Halo ($S_{\text{state}}$) vs. Structural Priors ($B_{\text{wiring}}$) |
| `safron_deyoung_2021_cybernetic_big_five_free_energy.pdf` | Safron & DeYoung (2021) | `doi:10.31234/osf.io/653wp` | 554 KB | Unification of DeYoung's 10 Cybernetic Big Five Aspects with Active Inference (`deyoung_10_aspects`) |
| `hinrichs_bolis_2025_geometric_hyperscanning_affect_active_inference.pdf` | Hinrichs, Albarracin, Bolis et al. (2025) | `arXiv:2506.08599` | 3,252 KB | Multi-agent Fisher information geometry & cross-neurotype dyadic resonance (`analyze_dyadic_chemistry`) |

---

## 3. Paper-by-Paper Traceability to Code & JSON Parameterization

### 3.1 `lawson_2014_aberrant_precision_autism.pdf`
- **Citation:** Lawson, R. P., Rees, G., & Friston, K. J. (2014). *An aberrant precision account of autism*. Frontiers in Human Neuroscience, 8, 302.
- **Mathematical Core:**
  In hierarchical predictive coding, ascending prediction errors $\varepsilon_i = \Pi_i(\tilde{\mu}_{i-1} - g_i(\tilde{\mu}_i))$ are weighted by synaptic precision $\Pi_i$. Belief updating follows a precision-weighted ratio analogous to Kalman gain:
  $$K \propto \frac{\Pi_{\text{sensory}}}{\Pi_{\text{sensory}} + \Pi_{\text{prior}}}$$
  When bottom-up sensory precision $\Pi_{\text{sensory}}$ is chronically elevated relative to top-down prior attenuation $\Pi_{\text{prior}}$, volatile, high-entropy social environments produce unattenuated prediction-error cascades.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Parameterizes `monotropic_sensory_precision` (`prior_offsets`: `E: -24.0`, `A: -12.0`, `C: +10.0`, `O: +8.0`, `N: +11.0`).
  - Grounds `sensory_overload_social_penalty: 26.0`, allowing `decompose_signal()` to separate crowd-induced sensory saturation (`crowd_foraging_extraversion`) from true 1-on-1 relational capacity (`dyadic_1on1_capacity = clamp(debiased_scores['E'] + 26.0)`).

### 3.2 `friston_2012_dopamine_affordance_active_inference.pdf`
- **Citation:** Friston, K. J., Shiner, T., FitzGerald, T., Galea, J. M., Adams, R., Brown, H., Dolan, R. J., Moran, R., Stephan, K. E., & Bestmann, S. (2012). *Dopamine, Affordance and Active Inference*. PLOS Computational Biology, 8(1), e1002327.
- **Mathematical Core:**
  Posterior beliefs over action policies $\pi$ follow a softmax distribution weighted by dopaminergic precision $\gamma$ (inverse temperature):
  $$P(\pi) = \sigma(-\gamma \cdot G(\pi))$$
  Striatal D1/D2 dopamine modulates the confidence/precision $\gamma$ placed on action affordances. When tonic dopamine is low, low-salience routine policies fail to cross the execution threshold; when intrinsic novelty or urgency triggers phasic dopamine bursts, $\gamma$ spikes, locking the agent into deep hyperfocus.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Parameterizes `adhd_dopamine_forager` (`prior_offsets`: `C: -22.0`, `O: +14.0`, `E: +6.0`, `N: +10.0`) and `salience_vs_routine_split: 34.0`.
  - Directly drives `salience_locked_drive = clamp(debiased_scores['C'] + 34.0)` and replaces routine Conscientiousness with `salience_locked_drive` when computing `C_industriousness` in `deyoung_10_aspects`.

### 3.3 `dacosta_2020_reward_maximisation_discrete_active_inference.pdf`
- **Citation:** Da Costa, L., Sajid, N., Parr, T., Friston, K., & Smith, R. (2020). *Reward Maximisation through Discrete Active Inference*. arXiv:2009.08111.
- **Mathematical Core:**
  Formalizes Expected Free Energy $G(\pi)$ as the exact trade-off between **Epistemic Value** (expected information gain / state-space exploration) and **Extrinsic Pragmatic Value** (exploitation of prior preferences $C$):
  $$G(\pi) = -\mathbb{E}_{Q}\!\left[D_{\text{KL}}\!\left[Q(s_\tau \mid o_\tau, \pi) \parallel Q(s_\tau \mid \pi)\right]\right] - \mathbb{E}_{Q}\!\left[\ln P(o_\tau \mid C)\right]$$
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Grounds Domain `C` (*Attractor Depth vs. Exploration Temperature*) in `cortical_dimensions.json`.
  - Explains the bimodal tension in `audhd_dual_attractor` (`O: +16.0`, `C: -10.0`, `salience_vs_routine_split: 36.0`, `sensory_overload_social_penalty: 20.0`), where high epistemic novelty foraging coexists with a high need for low-noise sensory predictability.

### 3.4 `mirza_2019_bayesian_selective_attention_active_inference.pdf`
- **Citation:** Mirza, M. B., Adams, R. A., Friston, K. J., & Parr, T. (2019). *Introducing a Bayesian model of selective attention based on active inference*. Scientific Reports, 9, 13915.
- **Mathematical Core:**
  Selective attention operates by modulating the precision parameter $\zeta$ over sensory likelihood matrices $A(o_\tau \mid s_\tau) \propto \exp(\zeta \ln A)$. High localized $\zeta$ sharpens figure-ground signal resolution while suppressing peripheral channels.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Parameterizes both narrow attentional tunneling in `monotropic_sensory_precision` and amplified aesthetic/interoceptive micro-signal gain in `hsp_high_gain_sensor` (`perceptual_gain_to_volatility_confound: 24.0`).
  - Grounds the de-confounding of `true_affective_dysregulation` from `perceptual_signal_resolution` in `decompose_signal()` (lines 261–265 of `neuro_psychometrics.py`).

### 3.5 `friston_2022_computational_psychiatry_synapses_sentience.pdf`
- **Citation:** Friston, K. J. (2022). *Computational psychiatry: from synapses to sentience*. Molecular Psychiatry, 28, 256–268.
- **Mathematical Core:**
  Demonstrates how ascending neuromodulators—Acetylcholine (ACh: sensory likelihood precision), Noradrenaline (NE: unexpected volatility / state transition precision), Dopamine (DA: policy precision), and Serotonin (5-HT: interoceptive/threat precision)—govern synaptic gain across timescales.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Grounds the separation between `cortical_invariant` domains (`O`, `A`: low `mood_susceptibility` $\lambda \in [0.08, 0.18]$) and `neuromodulatory_gain` domains (`E`, `N`, `C`: high `mood_susceptibility` $\lambda \in [0.42, 0.65]$), enabling Step 1 of `decompose_signal()` (`state_halo_shift`).

### 3.6 `safron_deyoung_2021_cybernetic_big_five_free_energy.pdf`
- **Citation:** Safron, A., & DeYoung, C. G. (2021). *Integrating Cybernetic Big Five Theory with the free energy principle: A new strategy for modeling personalities as complex systems*. In *Measuring and Modeling Persons and Situations* (Academic Press) / PsyArXiv (`10.31234/osf.io/653wp`).
- **Mathematical Core:**
  Maps the Cybernetic Big Five hierarchy—meta-traits **Plasticity** ($O, E$) and **Stability** ($C, A, -N$) and DeYoung's **10 Aspects**—directly onto variational free energy minimization and precision-weighted active inference.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Directly informs Step 6 of `decompose_signal()` (`deyoung_10_aspects`, lines 295–307 of `neuro_psychometrics.py`), where `C_industriousness` uses `salience_locked_drive`, `E_enthusiasm` uses `dyadic_depth_capacity`, and `N_withdrawal`/`N_volatility` use de-confounded `true_dysregulation`.

### 3.7 `hinrichs_bolis_2025_geometric_hyperscanning_affect_active_inference.pdf`
- **Citation:** Hinrichs, N., Albarracin, M., Bolis, D., Jiang, Y., Christov-Moore, L., & Schilbach, L. (2025). *Geometric Hyperscanning of Affect under Active Inference*. arXiv:2506.08599.
- **Mathematical Core:**
  Models dyadic social interaction as coupled active inference agents navigating an information-geometric Fisher manifold $\mathcal{I}_{ij}(\theta)$. Formalizes Bolis & Schilbach's **Dialectical Misattunement Hypothesis**: cross-neurotype friction arises from diverging precision priors $(\Pi_A \neq \Pi_B)$ rather than an intrinsic deficit in social motivation.
- **Mapping to `neurodevelopmental_masks.json` & `neuro_psychometrics.py`:**
  - Directly underpins `NeuroPsychometricEngine.analyze_dyadic_chemistry()` (lines 373–452 of `neuro_psychometrics.py`), which computes `cortical_prior_sync`, `allostatic_safety`, and `deconfounded_execution_bridge` by translating between two partners' neurodevelopmental masks (`raw_unmasked_c_gap` vs. `mask_corrected_drive_gap`).
