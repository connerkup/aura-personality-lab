# 01 — Social Neuroscience & Person-Space Manifold Literature Corpus

This directory (`/home/ubuntu/personality-lab/science/papers/01_social_manifold/`) contains **7 verified, full-text open-access PDF papers** establishing the mathematical and neurobiological foundations of **person-space manifolds, mental-state representational geometry, hippocampal social navigation maps, and Theory-of-Mind state-space inference** for Aura's `science/` engine.

---

## Corpus Summary Table

| # | PDF Filename | Title | Authors | Year | Source / ID | Size | Pages |
|---|---|---|---|---|---|---|---|
| 1 | `thornton2019_brain_represents_people_habitual_mental_states.pdf` | *The brain represents people as the mental states they habitually experience* | M. A. Thornton, M. E. Weaverdyck, D. I. Tamir | 2019 | *Nature Communications* 10, 2291 (`DOI:10.1038/s41467-019-10309-7`, `PMC6533269`) | 2.1 MB | 10 |
| 2 | `thornton2024_situations_mental_states_action_affordances.pdf` | *Neural representations of situations and mental states are composed of sums of representations of the actions they afford* | M. A. Thornton, D. I. Tamir | 2024 | *Nature Communications* 15, 620 (`DOI:10.1038/s41467-024-44870-7`, `PMC10799018`) | 1.0 MB | 13 |
| 3 | `schafer2025_social_navigation_power_affiliation_space.pdf` | *Social avoidance can be quantified as navigation in abstract social space* | M. Schafer, D. Schiller | 2025 | *Communications Psychology* 3, 41 (`DOI:10.1038/s44271-025-00215-8`, `PMC11936828`) | 4.4 MB | 12 |
| 4 | `courellis2024_hippocampal_abstract_geometry_inference.pdf` | *Abstract representations emerge in human hippocampal neurons during inference* | H. S. Courellis, J. Minxha, A. R. Cardenas, ..., S. Fusi, U. Rutishauser | 2024 | *Nature* 632, 841–849 (`DOI:10.1038/s41586-024-07799-x`, `PMC11338822`) | 4.6 MB | 26 |
| 5 | `ma2026_hippocampal_prefrontal_emotion_cognitive_maps.pdf` | *Map-like representations of emotion knowledge in hippocampal-prefrontal systems* | Y. Ma, P. A. Kragel | 2026 | *Nature Communications* 17, 685 (`DOI:10.1038/s41467-025-68240-z`, `PMC12891686`) | 10.4 MB | 14 |
| 6 | `rabinowitz2018_machine_theory_of_mind.pdf` | *Machine Theory of Mind* | N. C. Rabinowitz, F. Perbet, H. F. Song, C. Zhang, S. M. A. Eslami, M. Botvinick | 2018 | *ICML 2018*, PMLR 80:4218–4227 (`arXiv:1802.07740`) | 5.2 MB | 6 |
| 7 | `mitchell_heggs2022_neural_manifold_analysis_brain_dynamics.pdf` | *Neural manifold analysis of brain circuit dynamics in health and disease* | R. Mitchell-Heggs, S. Prado, G. P. Gava, M. A. Go, S. R. Schultz | 2022 | *Journal of Computational Neuroscience* (`arXiv:2203.11874`, `DOI:10.1007/s10827-022-00839-3`) | 18.7 MB | 23 |

---

## Detailed Mathematical & Mechanistic Insights for Aura's `science/` Engine

### 1. `thornton2019_brain_represents_people_habitual_mental_states.pdf`
- **Citation**: Thornton, M. A., Weaverdyck, M. E., & Tamir, D. I. (2019). The brain represents people as the mental states they habitually experience. *Nature Communications*, 10, 2291.
- **Source / ID**: `DOI:10.1038/s41467-019-10309-7` | `PMCID:PMC6533269`
- **Mathematical & Mechanistic Insight**:
  - Uses Representational Similarity Analysis (RSA) across the social brain network (dmPFC, vmPFC, precuneus, TPJ, anterior temporal lobe) to prove the **Summation Model of Person-Space Geometry**.
  - A person $p$'s neural representation $\mathbf{r}_p \in \mathbb{R}^d$ is constructed as the stationary probability-weighted linear expectation over the low-dimensional mental-state manifold $\mathcal{M}$ (spanned by the 3 orthogonal basis axes **Rationality, Social Impact, and Valence**):
    $$\mathbf{r}_p = \sum_{m \in \mathcal{M}} P(m \mid p)\,\mathbf{v}_m$$
  - Consequently, the Representational Dissimilarity Matrix (RDM) / similarity kernel between two individuals $p_i, p_j$ is governed by the quadratic form over the mental-state covariance matrix $\mathbf{\Sigma}_{\mathcal{M}} = \mathbf{V}^\top \mathbf{V}$:
    $$K_{\text{person}}(p_i, p_j) = \mathbf{p}_i^\top \mathbf{\Sigma}_{\mathcal{M}} \mathbf{p}_j$$
  - **Aura Engine Contribution**: Bridges fast transient mental-state trajectories $\mathbf{v}_m(t)$ and slow trait/person manifold coordinates $\mathbf{r}_p$ as an ergodic expectation over state visitation frequencies.

---

### 2. `thornton2024_situations_mental_states_action_affordances.pdf`
- **Citation**: Thornton, M. A., & Tamir, D. I. (2024). Neural representations of situations and mental states are composed of sums of representations of the actions they afford. *Nature Communications*, 15, 620.
- **Source / ID**: `DOI:10.1038/s41467-024-44870-7` | `PMCID:PMC10799018`
- **Mathematical & Mechanistic Insight**:
  - Establishes a **3-tier compositional linear operator chain** ($\text{Actions} \to \text{Mental States / Situations} \to \text{Persons}$).
  - Neural representations of mental states $\mathbf{v}_m$ and situational contexts $\mathbf{s}_c$ both decompose as conditional affordance-weighted linear combinations of action representations $\mathbf{a}_k$ embedded in the 6D psychological action manifold (**ACT-FAST**: Abstraction, Creation, Tradition, Food, Animacy, Spiritualism):
    $$\mathbf{v}_m = \sum_{k=1}^{K} P(a_k \mid m)\,\mathbf{a}_k, \qquad \mathbf{s}_c = \sum_{k=1}^{K} P(a_k \mid c)\,\mathbf{a}_k$$
  - Chaining this with the 2019 summation law yields a fully factorized bilinear generative model for person-space:
    $$\mathbf{r}_p = \mathbf{P}_{p \to m}\,\mathbf{P}_{m \to a}\,\mathbf{A}$$
  - **Aura Engine Contribution**: Enables zero-shot behavioral prediction and person–situation compatibility scoring via inner products $\langle \mathbf{r}_p, \mathbf{s}_c \rangle_{\mathcal{A}}$ in the shared action-affordance subspace.

---

### 3. `schafer2025_social_navigation_power_affiliation_space.pdf`
- **Citation**: Schafer, M., & Schiller, D. (2025). Social avoidance can be quantified as navigation in abstract social space. *Communications Psychology*, 3, 41.
- **Source / ID**: `DOI:10.1038/s44271-025-00215-8` | `PMCID:PMC11936828`
- **Mathematical & Mechanistic Insight**:
  - Extends the Tavares et al. (2015) and Schafer & Schiller (2018) **2D Hippocampal Social Cognitive Map** into a rigorous differential-geometric trajectory model over the Cartesian plane spanned by **Affiliation** ($A \in [-1, 1]$, horizontal axis) and **Power/Hierarchy** ($P \in [-1, 1]$, vertical axis).
  - For each social partner $j$ across interaction steps $t = 1, \dots, T$, defines:
    - **Egocentric Social Vector Angle**: $\theta_j(t) = \operatorname{atan2}(\Delta P_j(t), \Delta A_j(t))$
    - **Euclidean Social Distance**: $d_j(t) = \sqrt{(A_j(t) - A_{\text{self}})^2 + (P_j(t) - P_{\text{self}})^2}$
    - **Step-Size Speed & Path Tortuosity**: $v_j(t) = \|\mathbf{x}_j(t) - \mathbf{x}_j(t-1)\|_2$ and vector consistency $\bar{R}_j = \left\|\frac{1}{T}\sum_{t=1}^T \frac{\Delta \mathbf{x}_j(t)}{\|\Delta \mathbf{x}_j(t)\|_2}\right\|_2$
    - **Social Space Convex Hull Area**: $\operatorname{Area}(\operatorname{Conv}(\{\mathbf{x}_j(t)\}))$ quantifying expansion vs. constriction/avoidance of the social manifold.
  - **Aura Engine Contribution**: Supplies the exact geometric observables and state-update equations for tracking dyadic relational trajectories on Aura's 2D hippocampal $(\text{Affiliation}, \text{Power})$ sub-manifold.

---

### 4. `courellis2024_hippocampal_abstract_geometry_inference.pdf`
- **Citation**: Courellis, H. S., Minxha, J., Cardenas, A. R., Kimmel, D. L., Reed, C. M., Valiante, T. A., Salzman, C. D., Mamelak, A. N., Fusi, S., & Rutishauser, U. (2024). Abstract representations emerge in human hippocampal neurons during inference. *Nature*, 632, 841–849.
- **Source / ID**: `DOI:10.1038/s41586-024-07799-x` | `PMCID:PMC11338822`
- **Mathematical & Mechanistic Insight**:
  - Applies the Bernardi–Fusi neural population geometry framework to single-neuron recordings in the human hippocampus, demonstrating how sudden inferential insight transforms unstructured high-dimensional coding into a **low-dimensional, factorized abstract manifold** where latent variables are encoded along orthogonal, parallel hyperplanes.
  - Formalizes three core geometric metrics:
    1. **Shattering Dimensionality (SD)**: Mean cross-validated linear SVM decoding accuracy across all $\binom{C}{C/2}/2$ balanced binary dichotomies of $C$ task/social conditions.
    2. **Cross-Condition Generalization Performance (CCGP)**: Decoding accuracy when training a linear classifier on dichotomy $d$ restricted to one side of an orthogonal dichotomy $d'$ and testing on the held-out side of $d'$.
    3. **Parallelism Score (PS)**: Cosine similarity $\cos(\mathbf{w}_{d, 1}, \mathbf{w}_{d, 2})$ between linear hyperplane normal vectors separating latent factor $d$ across distinct contexts.
  - **Aura Engine Contribution**: Provides the exact mathematical benchmark suite (`SD`, `CCGP`, and `PS`) to verify that Aura's learned person-space embeddings disentangle orthogonal psychological dimensions without sacrificing nonlinear conjunctive expressivity.

---

### 5. `ma2026_hippocampal_prefrontal_emotion_cognitive_maps.pdf`
- **Citation**: Ma, Y., & Kragel, P. A. (2026). Map-like representations of emotion knowledge in hippocampal-prefrontal systems. *Nature Communications*, 17, 685.
- **Source / ID**: `DOI:10.1038/s41467-025-68240-z` | `PMCID:PMC12891686`
- **Mathematical & Mechanistic Insight**:
  - Demonstrates that hippocampal and prefrontal (vmPFC, dmPFC) ensembles represent affective states using both a continuous **2D metric coordinate system (Valence $\times$ Arousal)** and a predictive **Successor Representation (SR)** over state transitions:
    $$\mathbf{M} = \sum_{k=0}^{\infty} \gamma^k \mathbf{T}^k = (\mathbf{I} - \gamma \mathbf{T})^{-1}$$
    where $\mathbf{T}_{ij} = P(s_{t+1} = j \mid s_t = i)$ is the Markov transition matrix between mental/emotional states and $\gamma \in (0, 1)$ is the temporal discount factor.
  - Shows that hippocampal-prefrontal pattern similarity reflects a hybrid geodesic metric combining Euclidean distance $\|\mathbf{z}_i - \mathbf{z}_j\|_2$ in the 2D conceptual manifold and diffusive transition similarity $\mathbf{M}_{ij}$.
  - **Aura Engine Contribution**: Directly equips Aura's mental-state manifold with a Successor Representation operator $\mathbf{M} = (\mathbf{I} - \gamma \mathbf{T})^{-1}$ for multi-horizon affective forecasting and geodesic distance computation.

---

### 6. `rabinowitz2018_machine_theory_of_mind.pdf`
- **Citation**: Rabinowitz, N. C., Perbet, F., Song, H. F., Zhang, C., Eslami, S. M. A., & Botvinick, M. (2018). Machine Theory of Mind. *Proceedings of the 35th International Conference on Machine Learning (ICML)*, PMLR 80:4218–4227.
- **Source / ID**: `arXiv:1802.07740`
- **Mathematical & Mechanistic Insight**:
  - Introduces the **ToMnet** meta-learning observer architecture that explicitly decomposes an observed agent's generative policy into two coupled low-dimensional latent spaces:
    - **Character Embedding** $\mathbf{e}_{\text{char}} \in \mathbb{R}^{d_c}$: Computed by a Character Net aggregating past behavioral trajectories $\{\tau^{(k)}\}_{k=1}^{N_{\text{past}}}$ via permutation-invariant summation $\mathbf{e}_{\text{char}} = \sum_{k} f_\theta(\tau^{(k)})$, capturing stable traits, desires, and cognitive architecture.
    - **Mental State Embedding** $\mathbf{e}_{\text{mental}, t} \in \mathbb{R}^{d_m}$: Computed by a Mental Net conditioned on $\mathbf{e}_{\text{char}}$ and the current episode trajectory $\tau_{1:t}$ to infer transient beliefs (including false beliefs) and immediate intentions.
  - **Aura Engine Contribution**: Provides the canonical two-timescale architectural blueprint ($\mathbf{e}_{\text{char}}$ slow person-space manifold coordinate vs. $\mathbf{e}_{\text{mental}, t}$ fast state-space coordinate) for Aura's Bayesian/Neural Theory-of-Mind inference module.

---

### 7. `mitchell_heggs2022_neural_manifold_analysis_brain_dynamics.pdf`
- **Citation**: Mitchell-Heggs, R., Prado, S., Gava, G. P., Go, M. A., & Schultz, S. R. (2022/2023). Neural manifold analysis of brain circuit dynamics in health and disease. *Journal of Computational Neuroscience*, 51, 1–21.
- **Source / ID**: `arXiv:2203.11874` | `DOI:10.1007/s10827-022-00839-3`
- **Mathematical & Mechanistic Insight**:
  - Formalizes how high-dimensional population activity $\mathbf{X} \in \mathbb{R}^{N \times T}$ is constrained to a smooth, low-dimensional Riemannian submanifold $\mathcal{M}$ of **intrinsic dimensionality** $d_{\text{int}} \ll N$.
  - Details linear and nonlinear estimators for $d_{\text{int}}$ and manifold coordinates $\mathbf{Z} \in \mathbb{R}^{d_{\text{int}} \times T}$:
    - **Participation Ratio (PR)** from covariance eigenvalues $\{\lambda_i\}_{i=1}^N$:
      $$\operatorname{PR} = \frac{\left(\sum_{i=1}^N \lambda_i\right)^2}{\sum_{i=1}^N \lambda_i^2}$$
    - **Nonlinear Geodesic & Probabilistic Manifold Learning**: Isomap shortest-path graph distances, UMAP fuzzy simplicial sets, and MIND random-forest transition probabilities.
    - **Cross-Subject Manifold Alignment**: Canonical Correlation Analysis (CCA) and orthogonal Procrustes alignment $\min_{\mathbf{Q}^\top \mathbf{Q} = \mathbf{I}} \|\mathbf{Z}_A - \mathbf{Q}\mathbf{Z}_B\|_F^2$ to align individual neural/behavioral manifolds into a shared canonical person-space atlas.
  - **Aura Engine Contribution**: Supplies the spectral Participation Ratio (`PR`) estimator, geodesic manifold projection, and Procrustes/CCA alignment operators for Aura's `science/` dimensionality diagnostics.
