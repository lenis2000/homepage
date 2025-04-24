# TODO List for AI Agent: Writing "Random Matrix Theory: From Foundations to Frontiers"

**Overall Goal:** Repackage the content from the existing lecture notes (`S25-rmt-lecture-notes.txt`) into the new book structure defined by the provided outline (`outline.txt`). Follow the precise instructions below chapter by chapter. Ensure all mathematical notation is rendered using LaTeX delimiters (`$` or `$$`).

## Preface: User's Guide to This Book

- [ ] **Task:** Write the preface.
- [ ] **Content:**
    - [ ] Explain the purpose of the book.
    - [ ] Include the "Multiple Learning Pathways" section as described in the outline (Core Theory, Applications-First, Computational Focus, Fast Track). Define which chapters correspond to each track based on the outline.
    - [ ] Include a description of the "Visual Prerequisite Map" (mentioning its purpose, the agent doesn't need to *create* the visual map itself).
    - [ ] Include a description of the "Chapter Integration Points" feature.
    - [ ] Mention the "Special Features Throughout" as listed at the end of the outline (Conceptual Roadmaps, Multiple Proof Techniques, etc.).

## Part I: Foundations and Global Behavior

### Chapter 1: Introduction and Probabilistic Foundations

- [ ] **Task:** Write Chapter 1.
- [ ] **Goal:** Introduce Random Matrix Theory (RMT), refresh necessary probability concepts, define basic ensembles, and provide computational context.

- [ ] **Section: Motivation: Why study random matrices?**
    - [ ] **Instruction:** Use the content from Lecture Notes Section 1.1 ("Why study random matrices?"). Include the paragraphs "On the history.", "Classical groups and Lie theory.", "Toolbox.", and "Applications.".
    - [ ] **Reference:** Lecture Notes `S25-rmt-lecture-notes.txt`, Section 1.1.

- [ ] **Section: Essential Probability Refresher**
    - [ ] **Instruction:** Use the content from Lecture Notes Section 1.2 ("Recall Central Limit Theorem").
    - [ ] Include the definition of iid random variables (Def 1.1).
    - [ ] State and explain the Classical Central Limit Theorem (Thm 1.2), including the convergence in distribution definition (Eq 1.2) and Remark 1.3.
    - [ ] Include the Bernoulli example (Example 1.4), including the derivation steps using Stirling's formula and the normalized quantity $z$ (Eq 1.3).
    - [ ] Include Figure 1.1 (`./pictures/uniform_pdfs.pdf`) with its caption.
    - [ ] Include the proposition on moments of the normal distribution (Prop 1.5) and its proof (Eq 1.4).
    - [ ] Include the discussion on the proof of CLT by moments (Section 1.2.3), including Remark 1.6, the multinomial expansion, Example 1.7, the discussion of n-dependent and combinatorial factors, and the final convergence result for moments.
    - [ ] Include the discussion on convergence in distribution vs. convergence of moments (Section 1.2.4), mentioning the uniqueness of the normal distribution determined by its moments.
    - [ ] **LaTeX Snippets:** Ensure all equations (1.1) - (1.4) and inline math are correctly formatted. E.g.,
        ```latex
        Z_n = \frac{1}{\sqrt{n}} \sum_{i=1}^n \left(X_i - \mu\right)
        ```latex
        \lim_{n \to \infty} \operatorname{\mathbb{P}}(Z_n \leq x) = \operatorname{\mathbb{P}}(Z \leq x) = \int_{-\infty}^x \frac{1}{\sqrt{2\pi \sigma^2}}\ssp e^{-\frac{t^2}{2\sigma^2}} \, dt
        ```latex
        \operatorname{\mathbb{E}}[Z^k] = \begin{cases} 0, & \text{if } k \text{ is odd}, \\ \sigma^k (k-1)!! = \sigma^k \cdot (k-1)(k-3) \cdots 1, & \text{if } k \text{ is even}. \end{cases}
        ```

- [ ] **Section: Defining Random Matrix Ensembles**
    - [ ] **Instruction:** Use the content from Lecture Notes Section 1.3.1 ("Where can randomness come from?"). Describe the three sources: iid entries (mentioning symmetry classes and Footnote 1 about quaternions), correlated entries (listing examples), and Haar measure on matrix groups (mentioning $O(n), U(n), Sp(n)$ and Footnote 2, and the $UD_\lambda U^\dagger$ example).
    - [ ] Include the definition of Real Wigner Matrices (Def 1.8).
    - [ ] Include the GOE example (Example 1.9).
    - [ ] Include the definition of Wishart Matrices (Remark 1.10).

- [ ] **Section: [NEW] Computational Companion**
    - [ ] **Instruction:** Write a brief section explaining that the book will be accompanied by computational examples (e.g., Python notebooks) to illustrate key concepts like eigenvalue distributions, convergence, etc. Mention that Appendix A contains code implementations. *Agent does not need to generate the code here.*

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 1.4 (Problems 1.4.1 to 1.4.10). Format them clearly as list items.

### Chapter 2: The Empirical Spectral Distribution and Wigner's Semicircle Law

- [ ] **Task:** Write Chapter 2.
- [ ] **Goal:** Define the ESD, prove Wigner's Semicircle Law using the moment method, introduce the Stieltjes transform method, and hint at universality and topology connections.

- [ ] **Section: The Empirical Spectral Distribution (ESD)**
    - [ ] **Instruction:** Use content from Lecture Notes Section 1.3.3 ("Empirical spectral distribution").
    - [ ] Define the ESD (Eq 1.5).
    - [ ] Discuss the first two moments (Eq 1.6, 1.7) and the need for rescaling.
    - [ ] State Wigner's Semicircle Law (Thm 1.11), defining the semicircle density (Eq 1.9) and explaining the modes of convergence (Remark 1.12). Mention Marchenko-Pastur (Remark 1.13).
    - [ ] **LaTeX Snippets:**
        ```latex
        \mu_n = \frac{1}{n} \sum_{i=1}^n \delta_{\lambda_i}
        ```latex
        \nu_n\coloneqq \frac{1}{n}\sum_{i=1}^{n}\delta_{\lambda_i/\sqrt{n}} \longrightarrow \mu_{\mathrm{sc}}
        ```latex
        \mu_{\mathrm{sc}}(dx) \coloneqq \frac{1}{2\pi} \sqrt{4-x^2} \ssp \mathbf{1}_{|x| \leq 2}\ssp dx
        ```

- [ ] **Section: Moment Method Proof**
    - [ ] **Instruction:** Use content from Lecture Notes Section 1.3.4 ("Expected moments...") and Chapter 2 ("Wigner semicircle law").
    - [ ] Define normalized moments $m_k^{(n)}$ (Def 1.14).
    - [ ] State and prove the convergence of expected moments (Lemma 1.15), including the trace expansion (Eq 1.11) and the combinatorial argument linking terms to paths/trees (referencing Problem 1.4.9).
    - [ ] Include the recap from Lecture Notes Section 2.1.
    - [ ] Include the detailed computations from Lecture Notes Section 2.2:
        - [ ] Moments of the semicircle law (Section 2.2.1), including the integral calculation using substitution and the sine integral formula (Eq 2.1).
        - [ ] Counting trees and Catalan numbers (Section 2.2.2), defining Dyck Paths (Def 2.2), Rooted Plane Trees (Def 2.3), Catalan Numbers (Def 2.4, Eq 2.2, 2.3), proving equivalence (Lemma 2.5, Eq 2.4), stating the Dyck-Tree correspondence (Prop 2.7, Fig 2.1), and proving the recurrence (Prop 2.8, Fig 2.2). Mention Stanley's book (Remark 2.6).
    - [ ] Include the analysis steps from Lecture Notes Section 2.3:
        - [ ] Uniqueness of semicircle distribution via moments (Section 2.3.1), stating Carleman's criterion (Prop 2.9, Eq 2.5) and applying it (Remarks 2.10, 2.11, 2.12).
        - [ ] Convergence proof details (Section 2.3.2), including the need for variance bounds (Prop 2.13), the concentration bound using Chebyshev/Borel-Cantelli, tightness (Eq 2.6), subsequential limits, and characterizing the limit (Remark 2.14).
    - [ ] Include the proof of the variance bound from Lecture Notes Section 2.4 (Prop 2.13).
    - [ ] **LaTeX Snippets:** Ensure all definitions, theorems, lemmas, propositions, equations, and figures are included and correctly formatted.

- [ ] **Section: Stieltjes Transform Method**
    - [ ] **Instruction:** Write a section introducing the Stieltjes transform method.
    - [ ] Define the Stieltjes transform $G_n(z)$ for a measure $\mu_n$.
        ```latex
        G_n(z) = \int_{\mathbb{R}}\frac{d\mu_n(\lambda)}{\lambda - z}
        ```
    - [ ] Mention its key properties (e.g., maps upper half-plane to lower half-plane).
    - [ ] State the Stieltjes inversion formula relating the density $\rho(x)$ to the imaginary part: $\rho(x) = \frac{1}{\pi} \lim_{y \to 0^+} \operatorname{Im} G(x+iy)$.
    - [ ] Outline how this method can be used to prove the Semicircle Law (e.g., by showing convergence of $\mathbb{E}[G_n(z)]$ to the Stieltjes transform of the semicircle law and controlling variance). *Note: The lecture notes use this method later (Sec 4.4), but the outline places it here. Adapt accordingly or instruct the agent to synthesize.*

- [ ] **Section: [NEW] Bridge to Topology**
    - [ ] **Instruction:** Write a brief section hinting at the connection between the moment method's combinatorial counting (pairings, trees) and the enumeration of topological surfaces (maps). Mention that this will be explored in detail in Chapter 10. Refer to the Harer-Zagier formula as a key result linking matrix integrals to topology.

- [ ] **Section: [NEW] Universality Precursors**
    - [ ] **Instruction:** Write a brief section discussing the concept of universality in RMT. Mention that the Semicircle Law holds for a wide class of Wigner matrices, not just Gaussian ones (referencing Section 2.5 variants like Thm 2.15-2.19). Explain that this robustness suggests deeper underlying principles, which will be explored in later chapters (especially Chapter 6).

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 2.6 (Problems 2.6.1 to 2.6.8). Format them clearly as list items.

## Part II: Classical Ensembles, Exact Structures, and Determinantal Processes

### Chapter 3: Gaussian and Related β-Ensembles

- [ ] **Task:** Write Chapter 3.
- [ ] **Goal:** Define Gaussian ensembles (GOE, GUE, GSE), derive their eigenvalue densities, introduce related ensembles (Wishart, Jacobi), discuss tridiagonal representations, and connect to orthogonal polynomials.

- [ ] **Section: The Gaussian Ensembles (GOE, GUE, GSE)**
    - [ ] **Instruction:** Use content from Lecture Notes Section 3.2 ("Gaussian ensembles").
    - [ ] Define GOE and GUE based on underlying Gaussian matrices (Section 3.2.1). Mention GSE (Remark 3.1).
    - [ ] Derive the GOE joint eigenvalue density (JEDF) (Section 3.2.2, Thm 3.2). Include the steps: Joint density of entries (Sec 3.2.3, Eq 3.2), Spectral decomposition (Sec 3.2.4), Jacobian calculation (Sec 3.2.5, Lemma 3.4, Remark 3.5), and Final form (Sec 3.2.6, Eq 3.3, Remark 3.6).
    - [ ] State (without full derivation, unless instructed otherwise) the GUE JEDF, highlighting the change in the exponent of the Vandermonde determinant ($\beta=2$).
        ```latex
        p(\lambda_1,\ldots,\lambda_n) \propto \prod_{1 \le i < j \le n} (\lambda_i - \lambda_j)^2 \exp\Bigl( -\frac{1}{2}\sum_{k=1}^n \lambda_k^2 \Bigr)
        ```
    - [ ] Mention the invariance properties (referencing Problem 3.6.1).

- [ ] **Section: Orthogonal Polynomials**
    - [ ] **Instruction:** Introduce the connection between JEDFs and orthogonal polynomials, focusing on the GUE case.
    - [ ] Use content from Lecture Notes Section 4.2.3 ("The case $\beta=2$").
    - [ ] State the GUE JEDF again (Prop 4.6, Eq 4.2).
    - [ ] Introduce Hermite polynomials (Remark 4.7, Eq 4.4) and their orthogonality.
    - [ ] Rewrite the GUE JEDF using determinants involving Hermite polynomials (Eq 4.3 and the sketch of proof). Explain the role of the squared Vandermonde.

- [ ] **Section: Tridiagonal Models**
    - [ ] **Instruction:** Introduce the tridiagonal representation for $\beta$-ensembles.
    - [ ] Include the general theorem on tridiagonalization of real symmetric matrices using Householder reflections (Lecture Notes Section 3.4, Thm 3.15, Def 3.16, proof sketch).
    - [ ] Present the Dumitriu-Edelman tridiagonal model for GOE (Lecture Notes Section 3.5.1, Thm 3.18, Remark 3.19 on Chi-square, proof idea).
    - [ ] Generalize to $\beta$-ensembles (Lecture Notes Section 3.5.2), defining the G$\beta$E tridiagonal matrix (Def 4.3), stating its connection to GUE/GSE (Prop 4.4), and stating the general $\beta$ JEDF (Thm 4.5). Mention log-gases.

- [ ] **Section: Other Classical Ensembles**
    - [ ] **Instruction:** Briefly introduce Wishart/Laguerre and Jacobi ensembles.
    - [ ] Use Lecture Notes Section 3.3 ("Other classical ensembles").
    - [ ] Describe the Wishart (Laguerre) ensemble (Sec 3.3.1), its definition via SVD, and its JEDF (Thm 3.7). Mention the connection to multivariate Gamma (Remark 3.8).
    - [ ] Describe the Jacobi (MANOVA/CCA) ensemble (Sec 3.3.2), its setup via projectors (Def 3.9, Example 3.10), and its JEDF (Thm 3.11). Mention multivariate Beta (Remark 3.12).
    - [ ] Summarize the general pattern of $\beta$-ensembles (Sec 3.3.3, Remarks 3.13, 3.14).

- [ ] **Section: [NEW] Applied Perspective**
    - [ ] **Instruction:** Write a short section discussing where Gaussian, Wishart, and Jacobi ensembles appear in applications (e.g., GUE in nuclear physics, Wishart in multivariate statistics/wireless communication, Jacobi in canonical correlation analysis).

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 3.6 (Problems 3.6.1 to 3.6.11). Format them clearly as list items.

### Chapter 4: Determinantal Point Processes and Correlation Kernels

- [ ] **Task:** Write Chapter 4.
- [ ] **Goal:** Introduce DPPs, show GUE eigenvalues form a DPP, derive the kernel, and discuss kernel representations.

- [ ] **Section: Introduction to Determinantal Point Processes (DPPs)**
    - [ ] **Instruction:** Define DPPs and their basic properties.
    - [ ] Use content from Lecture Notes Section 4.5 ("Determinantal point processes (discrete)") and Section 5.2 ("Discrete determinantal point processes").
    - [ ] Define point configurations and random point processes.
    - [ ] Define DPPs via the determinantal property for joint probabilities (Def 4.12 / Def 5.1, Eq 4.13). Define correlation kernel.
    - [ ] Discuss correlation functions $\rho_n$.
    - [ ] State the Gap Probability formula (Prop 5.2).
    - [ ] State the formula for generating functions of multiplicative statistics (Prop 5.4). Mention Fredholm determinants (Remark 5.5).
    - [ ] Use content from Lecture Notes Section 4.6.2 ("Correlation functions and densities") to explain the transition to continuous spaces (Eq 4.15, 4.16). Mention reference measures (Remark 5.6).
    - [ ] Include the Poisson process example (Section 4.6.3) to contrast with DPPs (mentioning lack of repulsion).

- [ ] **Section: GUE Eigenvalues as a DPP**
    - [ ] **Instruction:** Show explicitly that the GUE JEDF corresponds to a DPP.
    - [ ] Use content from Lecture Notes Section 5.3 ("Determinantal structure in the GUE").
    - [ ] Start with the GUE JEDF (Section 5.3.2, Eq 5.1).
    - [ ] Rewrite the squared Vandermonde using determinants of monomials, then orthogonal polynomials (Hermite, $p_j$).
    - [ ] Define auxiliary functions $\phi_j$ (Eq 5.2) and orthonormal functions $\psi_j$ (Eq 5.3).
    - [ ] Rewrite the density using determinants of $\phi_j$.
    - [ ] Define the k-point correlation function $\rho_k$ via integration (Eq 5.4, Remark 5.7).
    - [ ] State and prove the main result (Thm 5.8) that $\rho_k(x_1,\dots,x_k)=\det[K_n(x_i,x_j)]_{i,j=1}^k$ with $K_n(x,y)=\sum_{j=0}^{n-1}\psi_j(x)\psi_j(y)$. Include the proof steps involving expanding the squared determinant, integrating using orthonormality, and applying Cauchy-Binet (Lemma 5.9) and Andreief (Lemma 5.10) identities.

- [ ] **Section: Kernel Representations**
    - [ ] **Instruction:** Present the Christoffel-Darboux formula and integral representations.
    - [ ] State and prove the Christoffel-Darboux formula for the kernel $K_n(x,y)$ (Lecture Notes Section 5.3.3, Thm 5.11, Eq 5.9). Include the proof using the three-term recurrence and telescoping sum (Eq 5.10).
    - [ ] Introduce the double contour integral representation (derived later in Chapter 6, Section 6.2). State the final formula here (Eq 6.5) and mention it will be derived and used for asymptotics later.
        ```latex
        K_n(x,y)=\frac{1}{(2\pi)^2} \oint_C dt\int_{-i\infty}^{i\infty}ds\ssp \frac{\exp\left\{ \frac{s^2}{2}-sy-\frac{t^2}{2}+tx \right\}}{s-t}\left( \frac{s}{t} \right)^n
        ```

- [ ] **Section: [NEW] Modern Applications**
    - [ ] **Instruction:** Write a section discussing modern applications of DPPs beyond RMT, such as in machine learning (diverse subset selection), spatial statistics, and quantum mechanics (fermionic systems).

- [ ] **Section: [NEW] Synthesis Activities**
    - [ ] **Instruction:** Suggest some conceptual exercises or discussion points linking DPPs back to the ensembles and probabilistic concepts from Chapters 1-3. For example: "Discuss how the determinantal structure implies eigenvalue repulsion, contrasting with independent samples (Poisson)." or "Relate the projection property of the kernel (Problem 5.4.6) to the definition of correlation functions."

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 5.4 (Problems 5.4.1 to 5.4.10). Format them clearly as list items.

## Part III: Asymptotic Analysis and Local Universality

### Chapter 5: Analytical Techniques for Asymptotics

- [ ] **Task:** Write Chapter 5.
- [ ] **Goal:** Introduce analytical tools like contour integrals and steepest descent needed for asymptotic analysis of RMT quantities.

- [ ] **Section: Contour Integral Representations**
    - [ ] **Instruction:** Derive and present key contour integral formulas.
    - [ ] Use content from Lecture Notes Section 6.2 ("Double Contour Integral Representation").
    - [ ] Derive the single contour integral for Hermite polynomials $p_n(x)$ using the generating function (Sec 6.2.1, Lemma 6.2, Eq 6.2).
    - [ ] Derive the alternative single contour integral for $p_n(x)$ using Fourier transforms (Sec 6.2.2).
    - [ ] Compute the norm $h_n$ (Sec 6.2.3, Lemma 6.3).
    - [ ] Derive the double contour integral representation for the GUE kernel $K_n(x,y)$ (Sec 6.2.4, Eq 6.3), explaining the summation trick and contour deformation (Fig 6.1). State the final form (Eq 6.4).
    - [ ] Discuss kernel conjugation (Sec 6.2.5, Eq 6.5).
    - [ ] Mention extensions where similar integral representations appear (Sec 6.2.6).

- [ ] **Section: Method of Steepest Descent**
    - [ ] **Instruction:** Explain the method of steepest descent/saddle point method.
    - [ ] Use content from Lecture Notes Section 6.3 ("Steepest descent. Generalities for single integrals").
    - [ ] Set up the general integral $I(\Lambda)$ (Sec 6.3.1, Eq 6.6). Explain the main idea (localization near maxima of $\operatorname{Re} f(z)$).
    - [ ] Define saddle points $f'(z_0)=0$ (Def 6.7) and steepest descent paths $\operatorname{Im} f(z) = \text{const}$ (Def 6.8). Explain the local behavior near a saddle point and the choice of path direction (Eq 6.7). Mention Remarks 6.5, 6.6.
    - [ ] Derive the local asymptotic formula for the integral's contribution near a saddle point (Sec 6.3.3, Eq 6.8, Thm 6.9, Eq 6.9).

- [ ] **Section: Optional: Overview of Riemann-Hilbert Problem approach**
    - [ ] **Instruction:** Write a brief overview of the Riemann-Hilbert Problem (RHP) method for asymptotics in RMT. Explain that it relates orthogonal polynomials (and thus the kernel) to solutions of matrix RHPs. Mention its power in rigorously deriving asymptotics for various ensembles and universality classes, often providing more detailed results (like full asymptotic expansions) than steepest descent. Refer to classic works (e.g., Deift). *Agent does not need to perform RHP calculations.*

- [ ] **Section: [NEW] Visualization Toolkit**
    - [ ] **Instruction:** Write a short section suggesting the use of computational tools (like Mathematica, Python with complex plotting libraries) to visualize the phase function $f(z)$ (its real and imaginary parts) and the steepest descent paths for examples discussed in the text. Include the plots from the lecture notes (Fig 6.2, 7.2, 7.3, 11.1, 11.2) as illustrations.

- [ ] **Section: [NEW] Historical Context**
    - [ ] **Instruction:** Add a brief historical note on the development of steepest descent (Debye, Riemann) and its application to problems in physics and mathematics, leading to its use in RMT (e.g., in Mehta's book). Mention the later development of the RHP method as a more powerful alternative in some contexts.

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 6.5 (Problems 6.5.1 to 6.5.3). Format them clearly as list items.

### Chapter 6: Universality at the Bulk and Edge

- [ ] **Task:** Write Chapter 6.
- [ ] **Goal:** Apply steepest descent to the GUE kernel to derive universal local statistics (Sine and Airy kernels) and introduce the Tracy-Widom distribution.

- [ ] **Section: Bulk Scaling Limit: Sine Kernel**
    - [ ] **Instruction:** Derive the Sine kernel using steepest descent on the GUE kernel integral.
    - [ ] Use content from Lecture Notes Section 6.4 ("Steepest descent for GUE kernel") and Section 7.1 ("Steepest descent for the GUE kernel" - recap).
    - [ ] Start with the scaled kernel integral (Eq 6.11 / 7.2). Define the phase function $S(z)$ (Sec 6.4.2 / 7.1.3).
    - [ ] Analyze the case $|X|<2$ (imaginary critical points, Sec 6.4.3 / 7.1.4). Identify critical points $z_{cr}, \overline{z_{cr}}$ (Eq 6.12 / 7.3).
    - [ ] Explain the contour deformation argument (Fig 6.2 / 7.2), the need to pick up the residue at $w=z$ (Eq 6.13 / 7.4).
    - [ ] Show the double integral vanishes asymptotically.
    - [ ] Evaluate the single integral residue term to get the Sine kernel (Eq 6.14 / 7.5, Def 7.2).
    - [ ] State the convergence result (Prop 7.3). Mention the result holds for any $|X|<2$ up to scaling (Remark 7.4, Problem 7.5.1).

- [ ] **Section: Edge Scaling Limit: Airy Kernel and Tracy-Widom Distribution**
    - [ ] **Instruction:** Derive the Airy kernel and introduce the Tracy-Widom distribution.
    - [ ] Use content from Lecture Notes Section 7.1.6 ("Double critical point: |X|=2, edge").
    - [ ] Analyze the case $|X|=2$. Identify the double critical point $z_{cr}=1$ and the third derivative $S'''(1)=2$.
    - [ ] Introduce the edge scaling for spatial variables ($\xi, \eta \sim n^{-1/6}$) and integration variables ($U, V \sim n^{-1/3}$).
    - [ ] Perform the steepest descent analysis near the cubic critical point, explaining the choice of contours (Fig 7.3).
    - [ ] Define the Airy kernel $K_{\mathrm{Ai}}(\xi,\eta)$ via its double contour integral representation (Def 7.5).
    - [ ] State the convergence result (Prop 7.6).
    - [ ] Introduce the Tracy-Widom GUE distribution $F_2(x)$ as the gap probability for the Airy process (Lecture Notes Section 7.1.7), expressed as a Fredholm determinant (Eq 7.9, 7.10). Explain its connection to the largest eigenvalue fluctuations (Eq 7.7, 7.8). Mention $F_1, F_4$ briefly.

- [ ] **Section: Universality Principles**
    - [ ] **Instruction:** Discuss the concept of universality for local eigenvalue statistics.
    - [ ] Explain that the Sine and Airy kernels (and corresponding Tracy-Widom distributions) appear as limits for a wide variety of matrix ensembles (not just GUE), including Wigner matrices with different entry distributions (refer back to Section 2.5) and certain non-Hermitian ensembles (mention Ginibre briefly if appropriate).
    - [ ] Contrast this local universality with the non-universal nature of the global density of states (e.g., Semicircle vs. Marchenko-Pastur).
    - [ ] Mention that the universality class often depends on symmetries (e.g., $\beta=1, 2, 4$ lead to different edge statistics). Refer to Section 7.1.8 for general $\beta$ remarks.

- [ ] **Section: [NEW] Experimental Evidence**
    - [ ] **Instruction:** Write a short section mentioning physical or real-world systems where Tracy-Widom statistics have been observed or are predicted, e.g., conductance fluctuations in mesoscopic systems, interface growth (KPZ connection), longest increasing subsequences in permutations, possibly large dataset statistics.

- [ ] **Section: [NEW] Cross-Disciplinary Connections**
    - [ ] **Instruction:** Write a brief section emphasizing how the appearance of the same universal distributions (Sine, Airy, TW) in seemingly unrelated fields (RMT, growth models, combinatorics, number theory - ζ function zeros) points to deep mathematical structures.

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 7.5 (Problems 7.5.1 to 7.5.4). Format them clearly as list items.

## Part IV: Dynamics and Related Stochastic Systems

### Chapter 7: Dyson Brownian Motion and Matrix SDEs

- [ ] **Task:** Write Chapter 7.
- [ ] **Goal:** Introduce matrix SDEs and Dyson Brownian Motion (DBM), derive the eigenvalue SDEs, and connect DBM to static ensembles and the HCIZ integral.

- [ ] **Section: Matrix Stochastic Differential Equations**
    - [ ] **Instruction:** Provide motivation for time-dependent models (Lecture Notes Section 10.1). Introduce basic concepts of SDEs.
    - [ ] Use the informal introduction from Lecture Notes Section 10.3.1. Explain drift, diffusion, Itô integral, the general 1D SDE (Eq 10.1), Itô's formula, and extension to multi-dimensions/matrices.

- [ ] **Section: Dyson Brownian Motion (DBM)**
    - [ ] **Instruction:** Define matrix Brownian motion and derive the SDEs for its eigenvalues (Dyson Brownian Motion).
    - [ ] Define matrix BM $\mathcal{M}(t)$ based on underlying Brownian entries $X(t)$ (Lecture Notes Section 10.2.1). State its fixed-time law (Lemma 10.1).
    - [ ] Prove that the eigenvalue process $\lambda(t)$ is Markov (Lecture Notes Section 10.2.2, Thm 10.2, Lemma 10.3, proof).
    - [ ] Provide the heuristic derivation of the eigenvalue SDEs (Lecture Notes Section 10.3.2).
    - [ ] Define Dyson Brownian Motion via the system of SDEs (Def 10.4, Eq 10.2). Emphasize the repulsion term and non-collision property (Remark 10.5).
    - [ ] Discuss the preservation of the G$\beta$E density as the invariant measure (Lecture Notes Section 10.4), mentioning the generator check (Problem 10.7.3).

- [ ] **Section: Universality via DBM**
    - [ ] **Instruction:** Briefly explain how DBM can be used to prove universality results. Mention the idea that starting from an arbitrary Wigner matrix, evolving it under matrix BM for a short time smooths out initial details, allowing connection to the well-understood Gaussian case. State that DBM provides a mechanism for eigenvalues to reach local equilibrium described by universal statistics.

- [ ] **Section: Harish-Chandra-Itzykson-Zuber Integral**
    - [ ] **Instruction:** Define the HCIZ integral and state the formula.
    - [ ] Use content from Lecture Notes Section 10.6.
    - [ ] Define the integral $\mathcal{I}(A,B)$ (Sec 10.6.1). State the HCIZ formula.
    - [ ] Outline the proof: Reduction to diagonal case (Sec 10.6.2, Eq 10.3), Symmetry arguments (Sec 10.6.3, Lemma 10.7), Conclusion involving characters/determinants (Sec 10.6.4), stating the constant $\Phi_N$ (Eq 10.4, Problem 10.7.4).
    - [ ] Include the optional proof via representation theory (Lecture Notes Section 11.2), explaining the steps: Schur expansion (Eq 11.1), character orthogonality (Prop 11.1, Eq 11.2), hook-length formulas.

- [ ] **Section: DBM Transition Density ($\beta=2$)**
    - [ ] **Instruction:** Derive the transition density for $\beta=2$ DBM using the HCIZ integral.
    - [ ] Use content from Lecture Notes Section 11.3.1. State the result (Thm 11.3). Include the proof connecting the matrix evolution density to the HCIZ integral and incorporating the Vandermonde Jacobian.

- [ ] **Section: Determinantal Structure of DBM ($\beta=2$)**
    - [ ] **Instruction:** Show that $\beta=2$ DBM is a determinantal point process.
    - [ ] Use content from Lecture Notes Section 11.3.
    - [ ] State the theorem for the determinantal kernel $K_t(x,y)$ (Thm 11.5).
    - [ ] Outline the proof idea using the density representation involving products of determinants (Lemma 11.6, Eq 11.3) and the Eynard-Mehta theorem / biorthogonal ensembles (referencing Problem 11.5.1).

- [ ] **Section: [NEW] Simulation Framework**
    - [ ] **Instruction:** Write a brief section suggesting how to simulate DBM, e.g., by discretizing the SDEs (Euler-Maruyama scheme) or by simulating the matrix BM and diagonalizing at discrete times. Mention potential numerical challenges like near-collisions. Refer to Appendix A for code.

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 10.7 (Problems 10.7.1 to 10.7.4) and Section 11.5 (Problem 11.5.1). Format them clearly as list items.

### Chapter 8: Fluctuations, Loop Equations, and Spiked Models

- [ ] **Task:** Write Chapter 8.
- [ ] **Goal:** Introduce loop equations, connect eigenvalue fluctuations to the GFF and Burgers' equation, and analyze spiked models exhibiting the BBP transition.

- [ ] **Section: Loop (Schwinger-Dyson) Equations**
    - [ ] **Instruction:** Introduce loop equations, focusing on the corners process context.
    - [ ] Use content from Lecture Notes Chapter 8 ("Cutting corners and loop equations").
    - [ ] Recap the corners process setup: Orbit measure (Sec 7.3.3), polynomial equation relating levels (Sec 7.4.1, Lemma 7.9 / 8.1, Eq 7.11 / 8.1), general $\beta$ extension (Sec 8.1.2), distribution of corners (Thm 8.2, Cor 8.3).
    - [ ] State the dynamical loop equation theorem (Sec 8.2.1, Thm 8.4 / 9.1, Eq 8.4 / 9.2). Explain its meaning (holomorphicity).
    - [ ] Include the proof sketch for $\beta>2$ (Sec 8.2.2).
    - [ ] Specialize to $W=0$ (Sec 8.2.3 / 9.1.2, Cor 8.6).

- [ ] **Section: Connections to Gaussian Free Field and Burgers' Equation**
    - [ ] **Instruction:** Show how loop equations lead to macroscopic evolution (Burgers' eq) and microscopic fluctuations (GFF).
    - [ ] Derive the equation for Stieltjes transforms $G_\lambda(z), G_\mu(z)$ from the $W=0$ loop equation (Sec 8.3.1, Eq 8.7 / 9.3).
    - [ ] Derive the complex Burgers' equation for the limiting Stieltjes transform $G_t(z)$ (Sec 8.3.2 / 9.1.3, Eq 8.8). Check the semicircle law solution (Sec 8.3.3 / 9.1.4, Lemma 8.8 / 9.3).
    - [ ] Introduce the Gaussian Free Field (GFF) (Lecture Notes Section 9.2). Define via Gaussian vectors (Sec 9.2.1), as random distributions (Sec 9.2.2, Eq 9.4), via orthogonal functions (Sec 9.2.3, Eq 9.5-9.7), connection to Brownian bridge (Sec 9.2.4, Eq 9.8, 9.9), and covariance via Green's function (Sec 9.2.5, Eq 9.10-9.14). Mention GFF on upper half-plane (Sec 9.2.6).
    - [ ] Introduce the height function $h(t,x)$ for the corners process (Lecture Notes Section 9.3.1).
    - [ ] State the main results on Gaussian fluctuations (Lecture Notes Section 9.3.2, Thm 9.4, Cor 9.5), explaining that centered Stieltjes transforms / height function fluctuations converge to GFF.
    - [ ] Briefly outline the derivation using deformed ensembles and Wiener-Hopf factorization from loop equations (Lecture Notes Section 9.3.3-9.3.6, Eq 9.15-9.17).

- [ ] **Section: Spiked Models and BBP Transition**
    - [ ] **Instruction:** Analyze the effect of finite-rank perturbations (spikes) on eigenvalues, focusing on the BBP transition.
    - [ ] Use the asymptotic analysis of the DBM kernel with a rank-1 spike (Lecture Notes Section 11.4).
    - [ ] Set up the problem with $A = \text{diag}(a\sqrt{n}, 0, \dots, 0)$ (Sec 11.4.1). Write down the modified kernel integral (Eq 11.4).
    - [ ] Outline the steepest descent approach (Sec 11.4.2).
    - [ ] Analyze the three regimes based on the spike strength $a$:
        - [ ] Subcritical $a<1$: Recover the Airy kernel (Sec 11.4.4, Eq 11.5).
        - [ ] Critical $a=1$: Introduce critical scaling $a=1+An^{-1/3}$ and derive the deformed Airy kernel (BBP kernel) (Sec 11.4.5).
        - [ ] Supercritical $a>1$: Show the outlier eigenvalue separates, find its location $a+1/a$, and derive the Gaussian kernel $K_G$ describing its fluctuations (Sec 11.4.6). Outline the matching to the Gaussian distribution (Sec 11.4.7, Problem 11.5.4).
    - [ ] Include Figure 11.1, 11.2.

- [ ] **Section: [NEW] Applications in Data Science**
    - [ ] **Instruction:** Write a section discussing applications of spiked models and the BBP transition in high-dimensional statistics, particularly Principal Component Analysis (PCA) for detecting signals in noise, and covariance matrix estimation.

- [ ] **Section: [NEW] Bridging Sections**
    - [ ] **Instruction:** Add paragraphs explicitly linking the GFF fluctuations back to the determinantal processes (Chapter 4) and the Burgers' equation to the global semicircle law (Chapter 2). Connect the BBP transition back to the edge universality discussed in Chapter 6.

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 8.4 (Problems 8.4.1 to 8.4.5) and Section 9.4 (Problem 9.4.1). Format them clearly as list items.

## Part V: Applications and Advanced Connections

### Chapter 9: Random Growth Models and the KPZ Universality Class

- [ ] **Task:** Write Chapter 9.
- [ ] **Goal:** Connect RMT (specifically Tracy-Widom, Airy process) to models of random growth in the KPZ universality class, like LPP, PNG, TASEP, via the RSK correspondence.

- [ ] **Section: Key Models: LPP, PNG, TASEP**
    - [ ] **Instruction:** Introduce the KPZ universality class and key models.
    - [ ] Discuss KPZ scaling (1:2:3 exponents) and fluctuation distributions (Lecture Notes Section 12.3.1).
    - [ ] Introduce the KPZ equation (Sec 12.3.2, Eq 12.2) and its interpretation (smoothing, growth, noise). Mention the Cole-Hopf transformation/SHE.
    - [ ] Discuss the first discoveries linking KPZ models (like TASEP) to Tracy-Widom GUE (Sec 12.3.3).
    - [ ] Explain the effect of initial conditions (droplet/curved -> GUE, flat -> GOE, stationary -> Baik-Rains) (Sec 12.3.4).
    - [ ] Define the Polynuclear Growth (PNG) model (Lecture Notes Section 12.4). Describe single-layer PNG dynamics (nucleation, spread) (Sec 12.4.1, Fig 12.2, 12.3). Define multiline PNG (Sec 12.4.2). Discuss how PNG embodies KPZ mechanisms (Sec 12.4.3).
    - [ ] Define Last Passage Percolation (LPP) on $\mathbb{R}^2_{\ge0}$ with Poisson weights (Sec 12.4.4). State the connection between PNG height and LPP time (Prop 12.5).
    - [ ] Briefly define the Totally Asymmetric Simple Exclusion Process (TASEP) and mention its connection to KPZ/TW.

- [ ] **Section: Connections to RMT: Emergence of Tracy-Widom and Airy processes, RSK correspondence**
    - [ ] **Instruction:** Detail the connection between LPP/PNG and RMT, focusing on the RSK correspondence and emergence of universal statistics.
    - [ ] Introduce the exponential LPP model on $\mathbb{Z}^2_{\ge1}$ with rates $\pi_i+\hat\pi_j$ (Lecture Notes Section 13.3). Define $L(t,n)$ (Eq 13.6) and the recursion (Eq 13.7, Fig 13.1). Mention the corner growth/queueing interpretation (Remark 13.6). Define the Markov process $Z(t)$ (Remark 13.7).
    - [ ] Introduce the geometric LPP model (Lecture Notes Section 13.4.1, Eq 13.10).
    - [ ] Explain the RSK correspondence via toggles (Sec 13.4.2, Def 13.10, Prop 13.11, 13.13, Fig 13.2).
    - [ ] State and prove the weight preservation property (Thm 13.15 / 14.2, Eq 13.11 / 14.4).
    - [ ] Show the equivalence between the geometric LPP top row $L(t,n)$ and the RSK top row $R_{t,n}$ (Lecture Notes Section 14.2.1, Lemma 14.3).
    - [ ] State the distribution of the RSK output shape $\lambda$ in terms of Schur polynomials (Sec 14.2.2, Def 14.5, Thm 14.6, Eq 14.5, 14.6, 14.8).
    - [ ] State the conditional law for adding a row (Sec 14.2.3, Thm 14.7, Eq 14.10).
    - [ ] Explain the scaling limit from geometric LPP to exponential LPP (Sec 14.3), using the elementary lemma (Lemma 14.8, Eq 14.13), scaling the environment (Sec 14.3.2), scaling Schur polynomials (Sec 14.3.3), and scaling the transition formula (Sec 14.3.4) to recover the Wishart transition kernel (Thm 13.4 / 14.1).
    - [ ] State the main correspondence theorem: $(L(1,n), \dots, L(t,n)) \stackrel{d}{=} (\lambda_1(1), \dots, \lambda_1(t))$ (Thm 13.8 / 14.9).
    - [ ] Explain the connection to pushTASEP (Lecture Notes Section 14.4, Prop 14.10).
    - [ ] Discuss the emergence of Tracy-Widom distributions (GUE/GOE) as limits of $L(t,n)$ (or $\lambda_1(t)$) depending on initial conditions/parameters ($\pi, \hat\pi$), connecting back to Section 12.3.4.
    - [ ] Mention the Airy line ensemble as the universal limit process for fluctuations near the edge (Lecture Notes Section 12.2).

- [ ] **Section: [NEW] Case Studies**
    - [ ] **Instruction:** Write a section providing 1-2 concrete examples of where LPP or related models are used, e.g., modeling traffic flow on a highway (TASEP), analyzing queues in series (exponential LPP), or interface growth in crystal deposition (PNG).

- [ ] **Section: [NEW] Interdisciplinary Impact**
    - [ ] **Instruction:** Write a brief section summarizing how the study of these models revealed unexpected connections between probability (stochastic processes), combinatorics (RSK, Young tableaux), representation theory (Schur polynomials), mathematical physics (integrable systems, KPZ), and RMT, highlighting the unifying role of universality.

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 12.5 (Problems 12.5.1, 12.5.2), Section 13.5 (Problems 13.5.1 to 13.5.8), and Section 14.5 (Problems 14.5.1 to 14.5.4). Format them clearly as list items.

### Chapter 10: Random Matrix Integrals and Topology

- [ ] **Task:** Write Chapter 10.
- [ ] **Goal:** Connect Gaussian matrix integrals to the enumeration of maps (graphs on surfaces) via Wick's theorem and the Harer-Zagier formula. Introduce genus expansions and multi-matrix models.

- [ ] **Section: Matrix Integrals for Counting Maps**
    - [ ] **Instruction:** Explain how Gaussian matrix integrals count surface gluings/maps.
    - [ ] Introduce the problem of gluing polygons into surfaces (Lecture Notes Section 15.2). Define orientable gluings, genus (Eq 15.1), vertices V. Use the square example (Example 15.2, Fig 15.1, 15.2). State the total number of pairings ((2n-1)!!) and the number of sphere gluings (Catalan, Prop 15.4). Discuss the dual picture (Sec 15.2.3).
    - [ ] Define the generating function $T_n(N)$ (Eq 15.2, 15.3) and list the first few polynomials.
    - [ ] State the Harer-Zagier formula for the exponential generating function $T(N,s)$ (Lecture Notes Section 15.3, Thm 15.6, Eq 15.4, 15.5). Include the verification for low orders. State the corollaries (Cor 15.7, 15.8, Eq 15.6).
    - [ ] Review Gaussian measures and Wick's theorem (Lecture Notes Section 15.4). Define 1D Gaussian measure and moments (Sec 15.4.1). Define multivariate Gaussian measure (Sec 15.4.2, Eq 15.7-15.9). State and sketch proof of Wick's formula (Sec 15.4.3, Thm 15.11, Eq 15.10, 15.11, Remark 15.13).
    - [ ] Connect GUE integrals to gluing polygons (Lecture Notes Section 15.5). Compute $\langle \mathrm{tr}(H^4) \rangle$ using Wick's formula (Sec 15.5.1, Eq 15.12, Lemma 15.14), showing the connection between pairings and gluings ($N^V$ contribution). State the general result $\langle \mathrm{tr}(H^{2n}) \rangle = T_n(N)$ (Prop 15.15) and sketch the proof using the $n=4$ example (Fig 15.3).
    - [ ] Provide the combinatorial proof of the Harer-Zagier formula (Sec 15.5.3), using the eigenvalue integral representation (Sec 15.5.2, Lemma 15.16), the interpretation of $T_n(N)$ via compatible colorings (Lemma 15.17), the relation $T_n(N) = \sum \binom{N}{L} \tilde{T}_n(L)$, identifying $\tilde{t}(N,n)$ as a polynomial with known roots, finding the constant $A_N$, and summing the series.

- [ ] **Section: Genus Expansions and Topological Recursion**
    - [ ] **Instruction:** Introduce the concept of the $1/N$ expansion (genus expansion) for matrix integrals.
    - [ ] Explain that $T_n(N) = \sum_{g=0}^{\lfloor (n+1)/2 \rfloor} \varepsilon_g(n) N^{n+1-2g}$ is an expansion in powers of $N^2$ (up to overall parity factor $N^{n+1 \pmod 2}$), where the power $N^\chi$ corresponds to the Euler characteristic $\chi = V-E+F = V-n+1 = n+1-2g$.
    - [ ] Mention 't Hooft's observation that $\log Z = \sum_{g=0}^\infty N^{2-2g} F_g$, where $Z$ is the partition function (matrix integral) and $F_g$ counts maps of genus $g$. This is the genus expansion.
    - [ ] Briefly introduce the idea of Topological Recursion (Eynard-Orantin) as a method to compute the $F_g$'s (or related quantities like correlation functions) recursively, starting from the spectral curve derived from the $g=0$ (planar) limit. *Agent does not need to detail the TR formulas.*

- [ ] **Section: Multi-matrix Models**
    - [ ] **Instruction:** Discuss integrals involving multiple matrices.
    - [ ] Explain how mixed moments like $\langle \mathrm{tr}(H^{2k_1})\cdots \mathrm{tr}(H^{2k_\ell}) \rangle$ count maps with multiple faces (Lecture Notes Section 15.6.1). Explain the connection to Feynman diagrams and enumeration of graphs with fixed vertex degrees, including the normalization factor $c_\alpha$ and symmetry factor $|\mathrm{Aut}(\Gamma)|$. Include the $N=1$ case remark.
    - [ ] Introduce the two-matrix model with interaction $\exp(2c\,\mathrm{tr}(HG))$ (Lecture Notes Section 15.6.2). Explain the modified covariances and how integrals count maps where vertices have states (H or G), relating it to the Ising model on a dynamical lattice.
    - [ ] Briefly mention other connections (counting curves, meanders) (Remark 15.21).

- [ ] **Section: [NEW] Semicircle Connection**
    - [ ] **Instruction:** Add a paragraph explicitly connecting the $g=0$ term $\varepsilon_0(n) = \mathrm{Cat}_n$ in the $T_n(N)$ expansion back to the Catalan numbers appearing in the moment method proof of the Semicircle Law (Chapter 2). Explain that the planar limit ($N\to\infty$ with $n$ fixed, or other double scaling limits) is often related to free probability and the semicircle distribution.

- [ ] **Section: [NEW] Modern Developments**
    - [ ] **Instruction:** Write a brief section mentioning that matrix models and topological recursion have found applications in diverse areas like enumerative geometry (counting Hurwitz numbers, intersection numbers on moduli spaces), string theory, and knot theory (volume conjecture).

- [ ] **Section: Problems**
    - [ ] **Instruction:** List the problems from Lecture Notes Section 15.7 (Problems 15.7.1 to 15.7.3). Format them clearly as list items.

## Appendices and Resources

- [ ] **Task:** Generate content for Appendices A, B, C.

- [ ] **Appendix A: Code Implementations**
    - [ ] **Instruction:** Provide placeholder sections for:
        - [ ] Code to simulate eigenvalue distributions of GUE/GOE/Wishart and compare with theoretical predictions (Semicircle, Marchenko-Pastur). Use Python with numpy/scipy/matplotlib.
        - [ ] Code to simulate Dyson Brownian Motion (e.g., Euler-Maruyama on the SDEs).
        - [ ] Code to visualize steepest descent paths for a simple example integral.
        - [ ] Code to simulate LPP (geometric or exponential weights) and visualize paths/values.

- [ ] **Appendix B: Open Problems and Research Directions**
    - [ ] **Instruction:** List some general areas of active research mentioned or hinted at in the notes/outline, e.g.,
        - [ ] Universality for non-Hermitian matrices.
        - [ ] Understanding fluctuations in higher-dimensional KPZ models.
        - [ ] Connections between topological recursion and other areas.
        - [ ] Rigorous analysis of loop equations for general $\beta$.
        - [ ] Applications of RMT in deep learning.

- [ ] **Appendix C: Historical Timeline and Key Papers**
    - [ ] **Instruction:** Create a brief timeline mentioning key figures (Wigner, Dyson, Mehta, Marchenko, Pastur, Tracy, Widom, Voiculescu, 't Hooft, Harer, Zagier, Baik, Johansson, Okounkov, etc.) and milestones (nuclear physics origins, semicircle law, free probability, universality classes, topological expansion, KPZ connections). List some of the key papers cited in the lecture notes bibliography as foundational references.

## Special Features Throughout

- [ ] **Task:** Ensure the generated text incorporates the special features mentioned in the outline.
- [ ] **Instruction:** While writing each chapter, consciously include:
    - [ ] Brief introductory "Conceptual Roadmaps" explaining the chapter's goals and connections.
    - [ ] Where alternative proofs exist (e.g., Semicircle Law via moments vs. Stieltjes vs. tridiagonal), present or clearly reference both.
    - [ ] Use highlighted boxes or distinct paragraphs for "Interdisciplinary Connections".
    - [ ] Refer to the "[NEW] Computational Companion" sections and Appendix A for "Numerical Experiments".
    - [ ] (Optional, if feasible for AI) Add short "Research Spotlights" or "Historical Notes" where appropriate.
    - [ ] Mark sections intended for the "Fast Track" (based on the outline's suggestion).

