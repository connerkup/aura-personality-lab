# 03 · Computational Psychometrics, Bayesian IRT/CAT & State-Trait Dynamics

This directory contains **8 verified full-text PDF papers** from arXiv that form the mathematical and statistical backbone of Aura's neuro-computational psychometric engine ([`science/engine/neuro_psychometrics.py`](../../engine/neuro_psychometrics.py)) and its calibrated parameter schemas ([`item_bank_irt.json`](../../models/item_bank_irt.json), [`cortical_dimensions.json`](../../models/cortical_dimensions.json), and [`neurodevelopmental_masks.json`](../../models/neurodevelopmental_masks.json)).

---

## Core Mathematical Synthesis in Aura

Standard personality inventories conflate three distinct generative mechanisms into a single sum-score:
1. **Neurodevelopmental Hardware Baseline ($B_{\text{wiring}}(\text{mask})$):** Striatal dopamine gating (salience vs. routine coupling in ADHD), thalamocortical sensory precision (monotropism / crowd saturation in Autism), or amplified insula gain (HSP).
2. **True Individual Trait Divergence ($\Delta P_{\text{unique}}$):** Decade-stable cortical priors and cybernetic aspect weights unique to the individual relative to their neurotype baseline.
3. **Allostatic State & Evaluative Halo ($S_{\text{state}}(\text{mood}, \text{self\_criticism})$):** Transient within-person affective fluctuations, burnout/depletion, and harsh self-evaluative response styles.

In [`science/engine/neuro_psychometrics.py`](../../engine/neuro_psychometrics.py), `NeuroPsychometricEngine` operationalizes this 3-layer decomposition alongside Bayesian Item Response Theory (IRT) and Multidimensional Computerized Adaptive Testing (MCAT):

$$y_{\text{raw}, d} = \underbrace{B_{\text{wiring}, d}(\text{mask})}_{\text{Neurotype Prior Offset}} + \underbrace{\Delta P_{\text{unique}, d}}_{\text{Residual Trait Attractor}} + \underbrace{S_{\text{state}, d}(\text{mood}, \text{self\_criticism}; \lambda_d)}_{\text{Within-Person Halo & State Perturbation}}$$

---

## Downloaded Full-Text Papers & Engine Mapping

### 1. Bayesian Item Response Theory (IRT) & Hierarchical Latent Estimation
* **File:** [`buerkner_2019_bayesian_irt_brms_stan.pdf`](./buerkner_2019_bayesian_irt_brms_stan.pdf) (921.1 KB)
* **Title:** *Bayesian Item Response Modeling in R with brms and Stan*
* **Author:** Paul-Christian Bürkner (2019; *Journal of Statistical Software*, 2021)
* **arXiv ID:** `1905.09501`
* **Algorithmic Formulation:** Formulates 1PL, 2PL, 3PL, and Graded Response Models (GRM) within a hierarchical Bayesian generalized non-linear mixed model framework:
  $$P(y_{pi} \mid \theta_p, a_i, b_i) = \frac{1}{1 + \exp\big(-a_i(\theta_p - b_i)\big)}, \qquad \theta_p \sim \mathcal{N}(\mu_{\text{group}}, \sigma_\theta^2)$$
* **How it Informs `neuro_psychometrics.py`:**
  * Directly underpins `NeuroPsychometricEngine.score_responses_irt()` (lines 53–99). Each item $i$ in `item_bank_irt.json` carries a calibrated discrimination parameter $a_i$ (`irt_a`) and difficulty/location threshold $b_i$ (`irt_b`).
  * Rather than reporting naïve raw percentages without uncertainty, `score_responses_irt()` accumulates item-level Fisher Information $I_i(\hat{\theta}_d) = a_i^2 p_i(\hat{\theta}_d)(1 - p_i(\hat{\theta}_d))$ on top of a Bayesian prior precision baseline ($I_0 = 0.25$) to compute posterior standard error bands:
    $$\text{SE}(\hat{\theta}_d) = \text{clip}\!\left(\frac{12.0}{\sqrt{I_0 + \sum_{i \in d} a_i^2 p_i(1 - p_i)}},\; 2.5,\; 18.0\right)$$

### 2. Bayesian Multidimensional Computerized Adaptive Testing (MCAT)
* **File:** [`li_gibbons_rockova_2025_deep_multidimensional_cat.pdf`](./li_gibbons_rockova_2025_deep_multidimensional_cat.pdf) (930.0 KB)
* **Title:** *Deep Computerized Adaptive Testing*
* **Authors:** Jiguang Li, Robert Gibbons, & Veronika Ročková (2025)
* **arXiv ID:** `2502.19275`
* **Algorithmic Formulation:** Combines Bayesian sparse multivariate IRT with sequential adaptive item selection across correlated latent dimensions, avoiding expensive per-step MCMC integration while balancing expected Fisher information gain against cross-dimensional factor coverage.
* **How it Informs `neuro_psychometrics.py`:**
  * Directly informs `NeuroPsychometricEngine.select_next_adaptive_item()` (lines 101–144). During live adaptive testing, the engine evaluates every remaining candidate item $i$ in domain $d$ at the current latent trait estimate $\hat{\theta}_d = (\text{score}_d - 50)/25$ and maximizes a composite acquisition utility:
    $$U(i \mid \hat{\theta}) = \underbrace{a_i^2 p_i(\hat{\theta}_d)\big(1 - p_i(\hat{\theta}_d)\big)}_{\text{Expected Fisher Information } I_i(\hat{\theta}_d)} + \underbrace{2.5 \cdot (2 - n_d)}_{\text{Multidimensional Coverage Bonus}}$$

### 3. Thurstonian Comparative Judgment & Boltzmann Attractor Gating
* **File:** [`tran_phung_venkatesh_2014_thurstonian_boltzmann_machines.pdf`](./tran_phung_venkatesh_2014_thurstonian_boltzmann_machines.pdf) (1,297.8 KB)
* **Title:** *Thurstonian Boltzmann Machines: Learning from Multiple Inequalities*
* **Authors:** Truyen Tran, Dinh Phung, & Svetha Venkatesh (2014; *ICML*)
* **arXiv ID:** `1408.0055`
* **Algorithmic Formulation:** Embeds Thurstone's Law of Comparative Judgment into energy-based Boltzmann machines, mapping ordinal ratings, pairwise inequalities ($u_i > u_j$), and forced-choice tradeoffs onto continuous latent utility vectors without ipsative distortion.
* **How it Informs `neuro_psychometrics.py`:**
  * Grounds the tradeoff-framed items in `item_bank_irt.json` (e.g., Item 1: abstract mental model vs. concrete sensory storage; Item 3: 8-hour salience hyperfocus vs. routine chores; Item 5: 1-on-1 depth vs. noisy crowd saturation; Item 7: emotional resonance vs. decoupled systemic logic).
  * Informs the Boltzmann softmax posterior in `infer_neurodevelopmental_mask_probabilities()` (lines 146–189), which combines Euclidean distance from mask prior vectors with specific Thurstonian gating probe responses (`q3`, `q5`) to infer posterior probabilities over candidate neurodevelopmental masks.

### 4. De-Confounding Evaluative Halos, Response Styles & Latent Uncertainty
* **File:** [`colombi_giordano_gottard_iannario_2016_ordinal_responses_latent_uncertainty.pdf`](./colombi_giordano_gottard_iannario_2016_ordinal_responses_latent_uncertainty.pdf) (2,879.0 KB)
* **Title:** *Modelling Ordinal Responses with Uncertainty: a Hierarchical Marginal Model with Latent Uncertainty components*
* **Authors:** Roberto Colombi, Sabrina Giordano, Anna Gottard, & Maria Iannario (2016)
* **arXiv ID:** `1607.00882`
* **Algorithmic Formulation:** Decomposes ordinal rating-scale responses into a hierarchical marginal model that separates substantive latent trait evaluations from respondent uncertainty and systematic scale-usage / evaluative halo shifts.
* **How it Informs `neuro_psychometrics.py`:**
  * Directly informs Step 1 of `decompose_signal()` (lines 219–236), which strips out the Allostatic State & Self-Criticism Halo $S_{\text{state}, d}$ scaled by each domain's empirical `mood_susceptibility` $\lambda_d$:
    $$\text{halo}_d = \begin{cases} (-14.0 \cdot \text{mood} + 16.0 \cdot \text{criticism}) \cdot \lambda_N & d = \text{N} \\ (15.0 \cdot \text{mood} - 14.0 \cdot \text{criticism}) \cdot \lambda_d & d \in \{\text{C}, \text{E}\} \\ (8.0 \cdot \text{mood} - 6.0 \cdot \text{criticism}) \cdot \lambda_d & d \in \{\text{O}, \text{A}\} \end{cases}$$
    yielding the de-confounded score $y_{\text{debiased}, d} = \text{clamp}(y_{\text{raw}, d} - \text{halo}_d)$.

### 5. Formal Equivalence of IRT Latent Spaces and Ising Attractor Landscapes
* **File:** [`epskamp_maris_waldorp_borsboom_2016_network_psychometrics_irt_ising.pdf`](./epskamp_maris_waldorp_borsboom_2016_network_psychometrics_irt_ising.pdf) (1,038.6 KB)
* **Title:** *Network Psychometrics*
* **Authors:** Sacha Epskamp, Gunter K. J. Maris, Lourens J. Waldorp, & Denny Borsboom (2016; *Wiley Handbook of Psychometric Testing*, 2018)
* **arXiv ID:** `1609.02818`
* **Algorithmic Formulation:** Proves the exact mathematical isomorphism between Multidimensional Item Response Theory (MIRT) and the Ising spin-glass Markov Random Field $P(y) = \frac{1}{Z}\exp(\sum_i \tau_i y_i + \sum_{i<j} \omega_{ij} y_i y_j)$, demonstrating how continuous latent dimensions correspond to low-rank eigenmodes creating discrete attractor basins in phase space.
* **How it Informs `neuro_psychometrics.py`:**
  * Grounds the `cortical_4d` Observer Manifold computation in `decompose_signal()` (lines 267–294, 353–365). Rather than treating continuous Big Five traits and 16 discrete cognitive styles as incompatible paradigms, `decompose_signal()` projects the 4 de-confounded cortical axes (`O_eff`, `C_eff`, `E_eff`, `A_eff`) onto a 16-basin attractor index (`attractor_basin_index` $\in \{0..15\}$) and computes thermodynamic state dispersion via normalized Shannon entropy:
    $$H(\mathbf{p}) = -\frac{1}{4}\sum_{k \in \{O,C,E,A\}} \Big[p_k \log_2 p_k + (1 - p_k)\log_2(1 - p_k)\Big]$$

### 6. Generalized Network Psychometrics: Latent + Residual Network Decomposition
* **File:** [`epskamp_rhemtulla_borsboom_2016_generalized_network_psychometrics.pdf`](./epskamp_rhemtulla_borsboom_2016_generalized_network_psychometrics.pdf) (943.9 KB)
* **Title:** *Generalized Network Psychometrics: Combining Network and Latent Variable Models*
* **Authors:** Sacha Epskamp, Mijke Rhemtulla, & Denny Borsboom (2016; *Psychometrika*, 2017)
* **arXiv ID:** `1605.09288`
* **Algorithmic Formulation:** Formulates Residual Network Modeling (RNM) and Latent Network Modeling (LNM), partitioning covariance into $\Sigma = \Lambda \Psi \Lambda^\top + (I - \Omega_\Theta)^{-1} \Delta (I - \Omega_\Theta)^{-\top}$ so direct local facet interactions (e.g., sensory saturation $\to$ crowd withdrawal) can be separated from global latent factors.
* **How it Informs `neuro_psychometrics.py`:**
  * Directly informs Steps 2–4 and 7 of `decompose_signal()` (lines 237–266, 309–325):
    1. Subtracts the structural neurodevelopmental prior $B_{\text{wiring}}(\text{mask})$ to isolate the individual's **Residual Personality Vector** $\Delta P_{\text{unique}, d} = y_{\text{debiased}, d} - B_{\text{wiring}, d}$.
    2. Applies local residual gating corrections (`gating_deconfound`) to separate `routine_conscientiousness` from `salience_locked_drive`, `crowd_foraging_extraversion` from `dyadic_1on1_capacity`, and `raw_threat_sensitivity` from `true_affective_dysregulation` and `perceptual_signal_resolution`.

### 7. Dynamical State-Space & Multilevel Graphical VAR (Within- vs. Between-Person Dynamics)
* **File:** [`epskamp_waldorp_mottus_borsboom_2016_ggm_timeseries_within_between_person.pdf`](./epskamp_waldorp_mottus_borsboom_2016_ggm_timeseries_within_between_person.pdf) (688.5 KB)
* **Title:** *The Gaussian Graphical Model in Cross-sectional and Time-series Data*
* **Authors:** Sacha Epskamp, Lourens J. Waldorp, René Mõttus, & Denny Borsboom (2016; *Multivariate Behavioral Research*, 2018)
* **arXiv ID:** `1609.04156`
* **Algorithmic Formulation:** Formulates multilevel Graphical Vector Autoregression (`mlVAR`) for intensive longitudinal personality and affect data:
  $$\mathbf{y}_{p,t} = \boldsymbol{\mu}_p + \mathbf{B}_p (\mathbf{y}_{p,t-1} - \boldsymbol{\mu}_p) + \boldsymbol{\varepsilon}_{p,t}, \qquad \boldsymbol{\varepsilon}_{p,t} \sim \mathcal{N}(\mathbf{0}, \boldsymbol{\Sigma}_p)$$
  cleanly separating the stationary between-person trait attractor $\boldsymbol{\mu}_p$ from temporal lagged state inertia $\mathbf{B}_p$ and contemporaneous state perturbations $\boldsymbol{\varepsilon}_{p,t}$.
* **How it Informs `neuro_psychometrics.py`:**
  * Provides the dynamical state-space basis for separating the stationary person attractor $\boldsymbol{\mu}_p = B_{\text{wiring}} + \Delta P_{\text{unique}}$ from transient affective shocks $\boldsymbol{\varepsilon}_{p,t} = S_{\text{state}}(t)$.
  * Also informs `analyze_dyadic_chemistry()` (lines 373–452), which evaluates dyadic co-regulation across two coupled agents (`cortical_prior_sync`, `allostatic_safety`, and `deconfounded_execution_bridge`) using their stationary de-confounded attractors rather than unmasked state snapshots.

### 8. Psychometric Network Accuracy & Posterior Uncertainty Quantification
* **File:** [`epskamp_borsboom_fried_2016_psychological_networks_accuracy.pdf`](./epskamp_borsboom_fried_2016_psychological_networks_accuracy.pdf) (718.1 KB)
* **Title:** *Estimating Psychological Networks and their Accuracy: A Tutorial Paper*
* **Authors:** Sacha Epskamp, Denny Borsboom, & Eiko I. Fried (2016; *Behavior Research Methods*, 2018)
* **arXiv ID:** `1604.08462`
* **Algorithmic Formulation:** Demonstrates why psychological profiles and network parameters require explicit confidence intervals and stability metrics to prevent over-interpreting noisy rank orderings.
* **How it Informs `neuro_psychometrics.py`:**
  * Motivates every confidence and stability diagnostic returned by `NeuroPsychometricEngine`: domain-specific `standard_errors` and `mean_confidence_band` in `score_responses_irt()`, `pole_clarity_pct` and `shannon_entropy_bits` in `decompose_signal()`, and full normalized posterior distributions (`fit_probability`) across all 5 neurodevelopmental masks in `infer_neurodevelopmental_mask_probabilities()`.
