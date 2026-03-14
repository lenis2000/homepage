"""
Journal name normalization and abbreviation for the arXiv feed.

Maps raw journal names (from Semantic Scholar and arXiv API) to:
  - Canonical full name (for dedup)
  - Short badge name (for display)

Usage:
    from journal_names import normalize_journal_name
    badge, full = normalize_journal_name("The Annals of Probability")
    # badge = "Ann. Probab.", full = "Annals of Probability"
"""

import re

# ── Exact match map: raw_name -> (badge, canonical_full) ──────────────
# Entries are checked case-insensitively.
# If only one string is given, it's used as both badge and full name.

_EXACT = {
    # ── Probability ──
    "Annals of Probability": ("Ann. Probab.", "Ann. Probab."),
    "The Annals of Probability": ("Ann. Probab.", "Ann. Probab."),
    "Annals of Applied Probability": ("Ann. Appl. Probab.", "Ann. Appl. Probab."),
    "The Annals of Applied Probability": ("Ann. Appl. Probab.", "Ann. Appl. Probab."),
    "Probability Theory and Related Fields": ("PTRF", "PTRF"),
    "Electronic Journal of Probability": ("EJP", "EJP"),
    "Electronic Communications in Probability": ("ECP", "ECP"),
    "Stochastic Processes and their Applications": ("Stoch. Proc. Appl.", "Stoch. Proc. Appl."),
    "Journal of Theoretical Probability": ("J. Theoret. Probab.", "J. Theoret. Probab."),
    "Probability and Mathematical Physics": ("Prob. Math. Phys.", "Prob. Math. Phys."),
    "Probability Surveys": ("Probab. Surveys", "Probab. Surveys"),
    "Bernoulli": ("Bernoulli", "Bernoulli"),
    "Journal of Applied Probability": ("J. Appl. Probab.", "J. Appl. Probab."),
    "Advances in Applied Probability": ("Adv. Appl. Probab.", "Adv. Appl. Probab."),
    "Queueing Systems": ("Queueing Syst.", "Queueing Syst."),
    "Random Structures & Algorithms": ("Random Struct. Alg.", "Random Struct. Alg."),
    "Random Matrices: Theory and Applications": ("RMTA", "RMTA"),
    "Random Matrices": ("RMTA", "RMTA"),
    "Combinatorics, Probability and Computing": ("CPC", "CPC"),
    "Latin American Journal of Probability and Mathematical Statistics": ("ALEA", "ALEA"),
    "Statistics & Probability Letters": ("Stat. Probab. Lett.", "Stat. Probab. Lett."),
    "Brazilian Journal of Probability and Statistics": ("Braz. J. Probab. Stat.", "Braz. J. Probab. Stat."),
    "Stochastic Analysis and Applications": ("Stoch. Anal. Appl.", "Stoch. Anal. Appl."),
    "Stochastics": ("Stochastics", "Stochastics"),
    "Stochastics and Stochastic Reports": ("Stochastics", "Stochastics"),
    "Modern Stochastics: Theory and Applications": ("Mod. Stoch.", "Mod. Stoch."),
    "Stochastics and Partial Differential Equations: Analysis and Computations": ("Stoch. PDE", "Stoch. PDE"),
    "Stochastic Partial Differential Equations: Analysis and Computations": ("Stoch. PDE", "Stoch. PDE"),

    # ── Analysis / PDE / Pure Math ──
    "Communications on Pure and Applied Mathematics": ("CPAM", "CPAM"),
    "Communications in Mathematical Physics": ("Comm. Math. Phys.", "Comm. Math. Phys."),
    "Advances in Mathematics": ("Adv. Math.", "Adv. Math."),
    "Inventiones mathematicae": ("Invent. Math.", "Invent. Math."),
    "Acta Mathematica": ("Acta Math.", "Acta Math."),
    "Annals of Mathematics": ("Ann. Math.", "Ann. Math."),
    "Duke Mathematical Journal": ("Duke Math. J.", "Duke Math. J."),
    "Journal of the American Mathematical Society": ("JAMS", "JAMS"),
    "Journal of the European Mathematical Society": ("JEMS", "JEMS"),
    "Journal of Functional Analysis": ("J. Funct. Anal.", "J. Funct. Anal."),
    "Functional Analysis and Its Applications": ("Funct. Anal. Appl.", "Funct. Anal. Appl."),
    "Transactions of the American Mathematical Society": ("Trans. AMS", "Trans. AMS"),
    "Transactions of the American Mathematical Society, Series B": ("Trans. AMS Ser. B", "Trans. AMS Ser. B"),
    "Proceedings of the American Mathematical Society": ("Proc. AMS", "Proc. AMS"),
    "Bulletin of the American Mathematical Society": ("Bull. AMS", "Bull. AMS"),
    "Memoirs of the American Mathematical Society": ("Mem. AMS", "Mem. AMS"),
    "Proceedings of the London Mathematical Society": ("Proc. LMS", "Proc. LMS"),
    "Journal of the London Mathematical Society": ("J. LMS", "J. LMS"),
    "Bulletin of the London Mathematical Society": ("Bull. LMS", "Bull. LMS"),
    "Transactions of the London Mathematical Society": ("Trans. LMS", "Trans. LMS"),
    "International Mathematics Research Notices": ("IMRN", "IMRN"),
    "Selecta Mathematica": ("Selecta Math.", "Selecta Math."),
    "Compositio Mathematica": ("Compos. Math.", "Compos. Math."),
    "Mathematische Annalen": ("Math. Ann.", "Math. Ann."),
    "Mathematische Zeitschrift": ("Math. Z.", "Math. Z."),
    "Mathematische Nachrichten": ("Math. Nachr.", "Math. Nachr."),
    "Mathematical Research Letters": ("Math. Res. Lett.", "Math. Res. Lett."),
    "Archive for Rational Mechanics and Analysis": ("Arch. Ration. Mech.", "Arch. Ration. Mech."),
    "Geometric and Functional Analysis": ("GAFA", "GAFA"),
    "Geometric & Functional Analysis GAFA": ("GAFA", "GAFA"),
    "Annales scientifiques de l'École Normale Supérieure": ("Ann. ENS", "Ann. ENS"),
    "Annales Scientifiques de l'École Normale Supérieure": ("Ann. ENS", "Ann. ENS"),
    "Publications mathématiques de l'IHÉS": ("Publ. IHES", "Publ. IHES"),
    "Publications Mathématiques de l'Institut des Hautes Études Scientifiques": ("Publ. IHES", "Publ. IHES"),
    "Forum of Mathematics, Sigma": ("Forum Math. Sigma", "Forum Math. Sigma"),
    "Forum of Mathematics, Pi": ("Forum Math. Pi", "Forum Math. Pi"),
    "Forum Mathematicum": ("Forum Math.", "Forum Math."),
    "Letters in Mathematical Physics": ("Lett. Math. Phys.", "Lett. Math. Phys."),
    "Cambridge Journal of Mathematics": ("Cambridge J. Math.", "Cambridge J. Math."),
    "Commentarii Mathematici Helvetici": ("Comment. Math. Helv.", "Comment. Math. Helv."),
    "Documenta Mathematica": ("Doc. Math.", "Doc. Math."),
    "Israel Journal of Mathematics": ("Israel J. Math.", "Israel J. Math."),
    "Canadian Journal of Mathematics": ("Canad. J. Math.", "Canad. J. Math."),
    "Canadian Mathematical Bulletin": ("Canad. Math. Bull.", "Canad. Math. Bull."),
    "American Journal of Mathematics": ("Amer. J. Math.", "Amer. J. Math."),
    "Pacific Journal of Mathematics": ("Pacific J. Math.", "Pacific J. Math."),
    "Nagoya Mathematical Journal": ("Nagoya Math. J.", "Nagoya Math. J."),
    "Rocky Mountain Journal of Mathematics": ("Rocky Mountain J.", "Rocky Mountain J."),
    "Japanese Journal of Mathematics": ("Japan. J. Math.", "Japan. J. Math."),
    "Arkiv för Matematik": ("Ark. Mat.", "Ark. Mat."),
    "Annales de l'Institut Fourier": ("Ann. Inst. Fourier", "Ann. Inst. Fourier"),
    "Aequationes mathematicae": ("Aequat. Math.", "Aequat. Math."),
    "Nonlinearity": ("Nonlinearity", "Nonlinearity"),
    "Journal of Mathematical Analysis and Applications": ("J. Math. Anal. Appl.", "J. Math. Anal. Appl."),
    "Calculus of Variations and Partial Differential Equations": ("Calc. Var. PDE", "Calc. Var. PDE"),
    "Journal of Dynamics and Differential Equations": ("J. Dynam. Diff. Eq.", "J. Dynam. Diff. Eq."),
    "Integral Equations and Operator Theory": ("IEOT", "IEOT"),
    "Complex Analysis and Operator Theory": ("Complex Anal. Oper.", "Complex Anal. Oper."),
    "Journal of Fourier Analysis and Applications": ("J. Fourier Anal.", "J. Fourier Anal."),
    "Linear Algebra and its Applications": ("Linear Algebra Appl.", "Linear Algebra Appl."),
    "Advances in Computational Mathematics": ("Adv. Comput. Math.", "Adv. Comput. Math."),
    "Journal of Computational and Applied Mathematics": ("J. Comput. Appl. Math.", "J. Comput. Appl. Math."),
    "Mathematics of Computation": ("Math. Comp.", "Math. Comp."),
    "Constructive Approximation": ("Constr. Approx.", "Constr. Approx."),
    "Quarterly of Applied Mathematics": ("Quart. Appl. Math.", "Quart. Appl. Math."),
    "Studies in Applied Mathematics": ("Stud. Appl. Math.", "Stud. Appl. Math."),
    "Analysis and Applications": ("Anal. Appl.", "Anal. Appl."),
    "Asymptotic Analysis": ("Asymptot. Anal.", "Asymptot. Anal."),
    "Methods and applications of analysis": ("Methods Appl. Anal.", "Methods Appl. Anal."),
    "Potential Analysis": ("Potential Anal.", "Potential Anal."),
    "Acta Applicandae Mathematica": ("Acta Appl. Math.", "Acta Appl. Math."),
    "The Quarterly Journal Of Mathematics": ("Q. J. Math.", "Q. J. Math."),
    "Periodica Mathematica Hungarica": ("Period. Math. Hungar.", "Period. Math. Hungar."),
    "Fundamenta Mathematicae": ("Fund. Math.", "Fund. Math."),
    "Colloquium Mathematicum": ("Colloq. Math.", "Colloq. Math."),
    "Indagationes Mathematicae": ("Indag. Math.", "Indag. Math."),
    "Revista de la Unión Matemática Argentina": ("Rev. Un. Mat. Argent.", "Rev. Un. Mat. Argent."),
    "European Journal of Mathematics": ("Eur. J. Math.", "Eur. J. Math."),
    "Pure and Applied Mathematics Quarterly": ("Pure Appl. Math. Q.", "Pure Appl. Math. Q."),
    "Surveys in Differential Geometry": ("Surv. Differ. Geom.", "Surv. Differ. Geom."),
    "Annales Henri Lebesgue": ("Ann. Henri Lebesgue", "Ann. Henri Lebesgue"),
    "Annales Fennici Mathematici": ("Ann. Fenn. Math.", "Ann. Fenn. Math."),
    "The Mathematical Intelligencer": ("Math. Intelligencer", "Math. Intelligencer"),
    "Notices of the American Mathematical Society": ("Notices AMS", "Notices AMS"),
    "The American Mathematical Monthly": ("Amer. Math. Monthly", "Amer. Math. Monthly"),
    "Mathematics of Operations Research": ("Math. Oper. Res.", "Math. Oper. Res."),
    "Mathematical Programming": ("Math. Prog.", "Math. Prog."),
    "Communications in Contemporary Mathematics": ("Comm. Contemp. Math.", "Comm. Contemp. Math."),
    "Communications in Number Theory and Physics": ("Comm. Number Theory", "Comm. Number Theory"),
    "Communications in Algebra": ("Comm. Algebra", "Comm. Algebra"),
    "Communications in Mathematical Sciences": ("Comm. Math. Sci.", "Comm. Math. Sci."),
    "Communications of the American Mathematical Society": ("Comm. AMS", "Comm. AMS"),
    "Confluentes Mathematici": ("Confluentes Math.", "Confluentes Math."),
    "Comptes Rendus Mathematique": ("C. R. Math.", "C. R. Math."),
    "Comptes Rendus. Mathématique": ("C. R. Math.", "C. R. Math."),
    "Arnold Mathematical Journal": ("Arnold Math. J.", "Arnold Math. J."),
    "Annales de la Faculté des sciences de Toulouse : Mathématiques": ("Ann. Fac. Sci. Toulouse", "Ann. Fac. Sci. Toulouse"),
    "Annales de la Faculté des Sciences de Toulouse": ("Ann. Fac. Sci. Toulouse", "Ann. Fac. Sci. Toulouse"),
    "Astérisque": ("Astérisque", "Astérisque"),
    "Sbornik: Mathematics": ("Sb. Math.", "Sb. Math."),
    "Russian Mathematical Surveys": ("Russian Math. Surveys", "Russian Math. Surveys"),
    "St Petersburg Mathematical Journal": ("St. Petersburg Math. J.", "St. Petersburg Math. J."),
    "Moscow Mathematical Journal": ("Moscow Math. J.", "Moscow Math. J."),
    "Doklady Mathematics": ("Dokl. Math.", "Dokl. Math."),
    "Theory of Probability and Its Applications": ("Theory Probab. Appl.", "Theory Probab. Appl."),
    "Theory of Probability & Its Applications": ("Theory Probab. Appl.", "Theory Probab. Appl."),
    "Kyoto Journal of Mathematics": ("Kyoto J. Math.", "Kyoto J. Math."),
    "Journal of Mathematics of Kyoto University": ("J. Math. Kyoto Univ.", "J. Math. Kyoto Univ."),
    "Kyushu Journal of Mathematics": ("Kyushu J. Math.", "Kyushu J. Math."),
    "Acta Mathematica Sinica, English Series": ("Acta Math. Sinica", "Acta Math. Sinica"),

    # ── Henri Poincaré family ──
    "Annales de l'Institut Henri Poincaré, Probabilités et Statistiques": ("Ann. IHP", "Ann. IHP"),
    "Annales De L Institut Henri Poincare-probabilites Et Statistiques": ("Ann. IHP", "Ann. IHP"),
    "Annales Henri Poincaré": ("Ann. Henri Poincaré", "Ann. Henri Poincaré"),
    "Annales Henri Poincare": ("Ann. Henri Poincaré", "Ann. Henri Poincaré"),
    "Annales de l'Institut Henri Poincaré D": ("Ann. IHP-D", "Ann. IHP-D"),
    "Annales de l'Institut Henri Poincaré D, Combinatorics, Physics and their Interactions": ("Ann. IHP-D", "Ann. IHP-D"),

    # ── Combinatorics ──
    "Advances in Applied Mathematics": ("Adv. Appl. Math.", "Adv. Appl. Math."),
    "Journal of Algebraic Combinatorics": ("J. Algebraic Combin.", "J. Algebraic Combin."),
    "Journal of Combinatorics": ("J. Combin.", "J. Combin."),
    "Algebraic Combinatorics": ("Alg. Combin.", "Alg. Combin."),
    "Annals of Combinatorics": ("Ann. Combin.", "Ann. Combin."),
    "Combinatorica": ("Combinatorica", "Combinatorica"),
    "Discrete Mathematics & Theoretical Computer Science": ("DMTCS", "DMTCS"),
    "Discrete Mathematics &amp; Theoretical Computer Science": ("DMTCS", "DMTCS"),
    "The Ramanujan Journal": ("Ramanujan J.", "Ramanujan J."),
    "Séminaire Lotharingien de Combinatoire": ("Sém. Lothar. Combin.", "Sém. Lothar. Combin."),
    "Journal of Integer Sequences": ("J. Integer Seq.", "J. Integer Seq."),
    "Enumerative Combinatorics and Applications": ("Enum. Combin. Appl.", "Enum. Combin. Appl."),
    "Discrete & Computational Geometry": ("Discrete Comput. Geom.", "Discrete Comput. Geom."),
    "Online Journal of Analytic Combinatorics": ("Online J. Anal. Combin.", "Online J. Anal. Combin."),
    "Graphs and Combinatorics": ("Graphs Combin.", "Graphs Combin."),
    "Journal of Graph Theory": ("J. Graph Theory", "J. Graph Theory"),

    # ── Algebra / Representation theory ──
    "Journal of Algebra": ("J. Algebra", "J. Algebra"),
    "Journal of Algebra and Its Applications": ("J. Algebra Appl.", "J. Algebra Appl."),
    "Journal of Pure and Applied Algebra": ("J. Pure Appl. Algebra", "J. Pure Appl. Algebra"),
    "Journal of Commutative Algebra": ("J. Commut. Algebra", "J. Commut. Algebra"),
    "Algebras and Representation Theory": ("Algebr. Represent.", "Algebr. Represent."),
    "Transformation Groups": ("Transform. Groups", "Transform. Groups"),
    "Algebra & Number Theory": ("Algebra Number Theory", "Algebra Number Theory"),
    "Journal of Number Theory": ("J. Number Theory", "J. Number Theory"),
    "Algebraic & Geometric Topology": ("Algebr. Geom. Topol.", "Algebr. Geom. Topol."),
    "Journal of Lie Theory": ("J. Lie Theory", "J. Lie Theory"),

    # ── Mathematical Physics ──
    "Journal of Mathematical Physics": ("J. Math. Phys.", "J. Math. Phys."),
    "Journal of Statistical Physics": ("J. Stat. Phys.", "J. Stat. Phys."),
    "Journal of Statistical Mechanics: Theory and Experiment": ("JSTAT", "JSTAT"),
    "Journal of Physics A: Mathematical and Theoretical": ("J. Phys. A", "J. Phys. A"),
    "Journal of Physics A": ("J. Phys. A", "J. Phys. A"),
    "Journal of Physics A: Mathematical and General": ("J. Phys. A", "J. Phys. A"),
    "Journal of Physics: Conference Series": ("J. Phys. Conf. Ser.", "J. Phys. Conf. Ser."),
    "Mathematical Physics, Analysis and Geometry": ("MPAG", "MPAG"),
    "Reviews in Mathematical Physics": ("Rev. Math. Phys.", "Rev. Math. Phys."),
    "Theoretical and Mathematical Physics": ("Theor. Math. Phys.", "Theor. Math. Phys."),
    "Advances in Theoretical and Mathematical Physics": ("Adv. Theor. Math. Phys.", "Adv. Theor. Math. Phys."),
    "Nuclear Physics": ("Nucl. Phys.", "Nucl. Phys."),
    "Nuclear Physics B": ("Nucl. Phys. B", "Nucl. Phys. B"),
    "Journal of Geometry and Physics": ("J. Geom. Phys.", "J. Geom. Phys."),
    "Journal of Nonlinear Mathematical Physics": ("J. Nonlinear Math. Phys.", "J. Nonlinear Math. Phys."),
    "Journal of Nonlinear Science": ("J. Nonlinear Sci.", "J. Nonlinear Sci."),
    "Journal of Spectral Theory": ("J. Spectr. Theory", "J. Spectr. Theory"),
    "Symmetry, Integrability and Geometry: Methods and Applications": ("SIGMA", "SIGMA"),
    "Symmetry Integrability and Geometry-methods and Applications": ("SIGMA", "SIGMA"),
    "Journal of Integrable Systems": ("J. Integrable Syst.", "J. Integrable Syst."),

    # ── Physics ──
    "Physical review letters": ("Phys. Rev. Lett.", "Phys. Rev. Lett."),
    "Physical Review Letters": ("Phys. Rev. Lett.", "Phys. Rev. Lett."),
    "Physical review. E, Statistical, nonlinear, and soft matter physics": ("Phys. Rev. E", "Phys. Rev. E"),
    "Physical review. E, Statistical physics, plasmas, fluids, and related interdisciplinary topics": ("Phys. Rev. E", "Phys. Rev. E"),
    "Physical review. E": ("Phys. Rev. E", "Phys. Rev. E"),
    "Physical Review E": ("Phys. Rev. E", "Phys. Rev. E"),
    "Physical Review A": ("Phys. Rev. A", "Phys. Rev. A"),
    "Physical Review B": ("Phys. Rev. B", "Phys. Rev. B"),
    "Physical review. D, Particles and fields": ("Phys. Rev. D", "Phys. Rev. D"),
    "Physical Review D": ("Phys. Rev. D", "Phys. Rev. D"),
    "Reviews of Modern Physics": ("Rev. Mod. Phys.", "Rev. Mod. Phys."),
    "Physica D: Nonlinear Phenomena": ("Physica D", "Physica D"),
    "Physica A-statistical Mechanics and Its Applications": ("Physica A", "Physica A"),
    "Physica A: Statistical Mechanics and its Applications": ("Physica A", "Physica A"),
    "Physica Scripta": ("Physica Scripta", "Physica Scripta"),
    "Physics Letters A": ("Phys. Lett. A", "Phys. Lett. A"),
    "Physics Letters B": ("Phys. Lett. B", "Phys. Lett. B"),
    "Physics Reports": ("Phys. Rep.", "Phys. Rep."),
    "Physics-Uspekhi": ("Physics-Uspekhi", "Physics-Uspekhi"),
    "Physics of Particles and Nuclei Letters": ("Phys. Part. Nucl. Lett.", "Phys. Part. Nucl. Lett."),
    "Europhysics Letters": ("EPL", "EPL"),
    "EPL (Europhysics Letters)": ("EPL", "EPL"),
    "EPL": ("EPL", "EPL"),
    "New Journal of Physics": ("New J. Phys.", "New J. Phys."),
    "Journal of High Energy Physics": ("JHEP", "JHEP"),
    "Journal of the Physical Society of Japan": ("J. Phys. Soc. Japan", "J. Phys. Soc. Japan"),
    "Condensed Matter Physics": ("Cond. Matter Phys.", "Cond. Matter Phys."),
    "Modern Physics Letters A": ("Mod. Phys. Lett. A", "Mod. Phys. Lett. A"),
    "Modern Physics Letters B": ("Mod. Phys. Lett. B", "Mod. Phys. Lett. B"),
    "International Journal of Modern Physics A": ("Int. J. Mod. Phys. A", "Int. J. Mod. Phys. A"),
    "International Journal of Modern Physics B": ("Int. J. Mod. Phys. B", "Int. J. Mod. Phys. B"),
    "The European Physical Journal Special Topics": ("Eur. Phys. J. ST", "Eur. Phys. J. ST"),
    "The European Physical Journal B - Condensed Matter and Complex Systems": ("Eur. Phys. J. B", "Eur. Phys. J. B"),
    "The European Physical Journal E": ("Eur. Phys. J. E", "Eur. Phys. J. E"),
    "Acta Physica Polonica B": ("Acta Phys. Polon. B", "Acta Phys. Polon. B"),

    # ── SciPost ──
    "SciPost Physics": ("SciPost Phys.", "SciPost Phys."),
    "SciPost Physics Lecture Notes": ("SciPost Phys. Lect.", "SciPost Phys. Lect."),
    "SciPost Physics Core": ("SciPost Phys. Core", "SciPost Phys. Core"),

    # ── PNAS / Science ──
    "Proceedings of the National Academy of Sciences": ("PNAS", "PNAS"),
    "Proceedings of the National Academy of Sciences of the United States of America": ("PNAS", "PNAS"),
    "Science": ("Science", "Science"),
    "Scientific Reports": ("Sci. Rep.", "Sci. Rep."),

    # ── Ergodic theory / Dynamics ──
    "Ergodic Theory and Dynamical Systems": ("Ergodic Theory Dyn.", "Ergodic Theory Dyn."),

    # ── Approximation / Special functions ──
    "Computational Methods and Function Theory": ("Comput. Methods Funct.", "Comput. Methods Funct."),
    "Fractional Calculus and Applied Analysis": ("Fract. Calc. Appl.", "Fract. Calc. Appl."),
    "Integral Transforms and Special Functions": ("Integral Transforms", "Integral Transforms"),
    "Journal of Approximation Theory": ("J. Approx. Theory", "J. Approx. Theory"),

    # ── Applied / Stats ──
    "The Annals of Statistics": ("Ann. Statist.", "Ann. Statist."),
    "Annals of statistics": ("Ann. Statist.", "Ann. Statist."),
    "Bayesian Analysis": ("Bayesian Anal.", "Bayesian Anal."),
    "Methodology and Computing in Applied Probability": ("Meth. Comput. Appl. Prob.", "Meth. Comput. Appl. Prob."),
    "Experimental Mathematics": ("Experiment. Math.", "Experiment. Math."),
    "Journal of Statistical Planning and Inference": ("J. Stat. Plan. Inference", "J. Stat. Plan. Inference"),

    # ── SIAM ──
    "SIAM Rev.": ("SIAM Review", "SIAM Review"),

    # ── Proceedings / Conferences / Books ──
    "Discrete Analysis": ("Discrete Anal.", "Discrete Anal."),
    "Inverse Problems": ("Inverse Problems", "Inverse Problems"),
    "IMA Journal of Applied Mathematics": ("IMA J. Appl. Math.", "IMA J. Appl. Math."),
    "Philosophical Transactions of the Royal Society A: Mathematical, Physical and Engineering Sciences": ("Phil. Trans. R. Soc. A", "Phil. Trans. R. Soc. A"),
    "Proceedings of the Royal Society A: Mathematical, Physical and Engineering Sciences": ("Proc. R. Soc. A", "Proc. R. Soc. A"),
    "Proceedings of the Royal Society A": ("Proc. R. Soc. A", "Proc. R. Soc. A"),
    "Proceedings of the Royal Society of Edinburgh: Section A Mathematics": ("Proc. Roy. Soc. Edinburgh", "Proc. Roy. Soc. Edinburgh"),
    "Proceedings of the Steklov Institute of Mathematics": ("Proc. Steklov Inst.", "Proc. Steklov Inst."),

    # ── CS / Info theory ──
    "Pattern Recognition": ("Pattern Recogn.", "Pattern Recogn."),
    "Journal of Computer and System Sciences": ("J. Comput. System Sci.", "J. Comput. System Sci."),
    "Chaos Solitons & Fractals": ("Chaos Solitons Fractals", "Chaos Solitons Fractals"),

    # ── Other specific journals ──
    "Tunisian Journal of Mathematics": ("Tunisian J. Math.", "Tunisian J. Math."),
    "Journal of Mathematical Sciences": ("J. Math. Sci.", "J. Math. Sci."),
    "Markov Processes and Related Fields": ("Markov Process. Related Fields", "Markov Process. Related Fields"),
    "Journal d'Analyse Mathematique": ("J. Anal. Math.", "J. Anal. Math."),
    "Journal d'Analyse Mathématique": ("J. Anal. Math.", "J. Anal. Math."),
    "Journal de mathématiques pures et appliquées": ("J. Math. Pures Appl.", "J. Math. Pures Appl."),
    "Journal für die reine und angewandte Mathematik (Crelles Journal)": ("J. Reine Angew. Math.", "J. Reine Angew. Math."),
    "Infinite Dimensional Analysis, Quantum Probability and Related Topics": ("Infin. Dimen. Anal.", "Infin. Dimen. Anal."),
    "Random Operators and Stochastic Equations": ("Random Oper. Stoch. Eq.", "Random Oper. Stoch. Eq."),
    "Journal of Mathematical Chemistry": ("J. Math. Chem.", "J. Math. Chem."),
    "Journal of Chemical Physics": ("J. Chem. Phys.", "J. Chem. Phys."),
    "The Journal of Combinatorics": ("J. Combin.", "J. Combin."),
    "Journal of Multivariate Analysis": ("J. Multivar. Anal.", "J. Multivar. Anal."),
    "The New York Journal of Mathematics": ("New York J. Math.", "New York J. Math."),
    "Journal of the Institute of Mathematics of Jussieu": ("J. Inst. Math. Jussieu", "J. Inst. Math. Jussieu"),
    "Publications of The Research Institute for Mathematical Sciences": ("Publ. RIMS", "Publ. RIMS"),
    "ESAIM: Probability and Statistics": ("ESAIM Probab. Stat.", "ESAIM Probab. Stat."),
    "Diffusion Fundamentals": ("Diffusion Fund.", "Diffusion Fund."),
    "Symmetry": ("Symmetry", "Symmetry"),
    "International Journal of Theoretical Physics": ("Int. J. Theor. Phys.", "Int. J. Theor. Phys."),
    "Quantum Information Processing": ("Quantum Inf. Process.", "Quantum Inf. Process."),
    "Journal of the Royal Statistical Society: Series B (Statistical Methodology)": ("J. R. Stat. Soc. B", "J. R. Stat. Soc. B"),
    "Contemporary mathematics": ("Contemp. Math.", "Contemp. Math."),
    "Springer Proceedings in Mathematics & Statistics": ("Springer Proc. Math.", "Springer Proc. Math."),
    "Lecture Notes in Mathematics": ("Lect. Notes Math.", "Lect. Notes Math."),
    "Lecture Notes in Physics": ("Lect. Notes Phys.", "Lect. Notes Phys."),
    "Progress in Probability": ("Progr. Probab.", "Progr. Probab."),
    "Journal of Integrable Systems": ("J. Integrable Syst.", "J. Integrable Syst."),
    "Metrika": ("Metrika", "Metrika"),
    "Integers": ("Integers", "Integers"),
    "Combinatorica": ("Combinatorica", "Combinatorica"),
    "Acta Sci. Math. (Szeged)": ("Acta Sci. Math. Szeged", "Acta Sci. Math. Szeged"),
    "Transportation Research Part B-methodological": ("Transp. Res. B", "Transp. Res. B"),
    "Review of Economics and Statistics": ("Rev. Econ. Stat.", "Rev. Econ. Stat."),
    "Brazilian Journal of Physics": ("Braz. J. Phys.", "Braz. J. Phys."),
    "Bulletin of the Polish Academy of Sciences. Mathematics": ("Bull. Polish Acad. Sci.", "Bull. Polish Acad. Sci."),
    "Bulletin of the Malaysian Mathematical Sciences Society": ("Bull. Malaysian Math.", "Bull. Malaysian Math."),
    "Bulletin of the Brazilian Mathematical Society": ("Bull. Braz. Math. Soc.", "Bull. Braz. Math. Soc."),
    "Journal of Difference Equations and Applications": ("J. Difference Equ. Appl.", "J. Difference Equ. Appl."),
    "The ANZIAM Journal": ("ANZIAM J.", "ANZIAM J."),
}

# ── Prefix/regex patterns for variant matching ──────────────────────
# These catch "J. Stat. Mech. (2012) P08013" etc.
# Each entry: (compiled_regex, badge, canonical_full)
_PATTERNS = [
    # Annals of Probability variants
    (r"^Ann\.?\s*Probab", "Ann. Probab.", "Ann. Probab."),
    (r"^Annals of Probability\b", "Ann. Probab.", "Ann. Probab."),
    (r"^The Annals of Probability\b", "Ann. Probab.", "Ann. Probab."),
    # Annals of Applied Probability
    (r"^Ann\.?\s*Appl\.?\s*Probab", "Ann. Appl. Probab.", "Ann. Appl. Probab."),
    (r"^The Annals of Applied Probability\b", "Ann. Appl. Probab.", "Ann. Appl. Probab."),
    # Annals of Mathematics
    (r"^Ann\.?\s*of Math", "Ann. Math.", "Ann. Math."),
    # Ann. IHP (many variants)
    (r"^Ann(ales)?\.?\s*(de l.)?Institut H(enri|\.?)\s*Poincar.{0,5}(Probab|D\b|$)", "Ann. IHP", "Ann. IHP"),
    (r"^Annales de l.IHP", "Ann. IHP", "Ann. IHP"),
    (r"^Ann\.?\s*Inst\.?\s*H\.?\s*Poincar", "Ann. IHP", "Ann. IHP"),
    # Ann. IHP-D
    (r"^Ann(ales)?.*Henri Poincar.{0,3}\s*D\b", "Ann. IHP-D", "Ann. IHP-D"),
    (r"^Ann\.?\s*Inst\.?\s*Henri Poincar.{0,3}\s*(Comb|D\b)", "Ann. IHP-D", "Ann. IHP-D"),
    # Annales Henri Poincaré (physics journal)
    (r"^Annales Henri Poincar", "Ann. Henri Poincaré", "Ann. Henri Poincaré"),
    # Comm. Math. Phys.
    (r"^Comm(un)?\.?\s*Math\.?\s*Phys", "Comm. Math. Phys.", "Comm. Math. Phys."),
    (r"^Communications in Mathematical Physics\b", "Comm. Math. Phys.", "Comm. Math. Phys."),
    # CPAM
    (r"^Comm(un)?\.?\s*Pure\.?\s*(and\s*)?Appl\.?\s*Math", "CPAM", "CPAM"),
    # Duke Math. J.
    (r"^Duke Math", "Duke Math. J.", "Duke Math. J."),
    # Advances in Mathematics
    (r"^Adv(ances)?\.?\s*(in\s*)?Math(ematics)?\.?\b", "Adv. Math.", "Adv. Math."),
    # PTRF
    (r"^Prob(ab)?\.?\s*Theory\.?\s*Rel", "PTRF", "PTRF"),
    # Trans. AMS
    (r"^Trans(actions)?\.?\s*(of the\s*)?Amer(ican)?\.?\s*Math", "Trans. AMS", "Trans. AMS"),
    # IMRN
    (r"^Int(ernational)?\.?\s*Math\.?\s*Res\.?\s*Not", "IMRN", "IMRN"),
    (r"^Int Math Res", "IMRN", "IMRN"),
    # J. Stat. Mech.
    (r"^J\.?\s*Stat\.?\s*Mech", "JSTAT", "JSTAT"),
    # J. Stat. Phys.
    (r"^J\.?\s*Stat\.?\s*Phys", "J. Stat. Phys.", "J. Stat. Phys."),
    (r"^Journal of Statistical Physics\b", "J. Stat. Phys.", "J. Stat. Phys."),
    # J. Math. Phys.
    (r"^J\.?\s*Math(ematical)?\.?\s*Phys", "J. Math. Phys.", "J. Math. Phys."),
    # J. Phys. A
    (r"^J\.?\s*Phys\.?\s*A", "J. Phys. A", "J. Phys. A"),
    # Phys. Rev. Lett.
    (r"^Phys(ical)?\.?\s*Rev(iew)?\.?\s*Lett", "Phys. Rev. Lett.", "Phys. Rev. Lett."),
    # Phys. Rev. E
    (r"^Phys(ical)?\.?\s*[Rr]ev(iew)?\.?\s*E\b", "Phys. Rev. E", "Phys. Rev. E"),
    # Phys. Rev. A/B/D
    (r"^Phys(ical)?\.?\s*Rev(iew)?\.?\s*A\b", "Phys. Rev. A", "Phys. Rev. A"),
    (r"^Phys(ical)?\.?\s*Rev(iew)?\.?\s*B\b", "Phys. Rev. B", "Phys. Rev. B"),
    (r"^Phys(ical)?\.?\s*Rev(iew)?\.?\s*D\b", "Phys. Rev. D", "Phys. Rev. D"),
    # EJP / ECP
    (r"^Electron?\.?\s*J\.?\s*Probab", "EJP", "EJP"),
    (r"^Elec\.?\s*J\.?\s*Probab", "EJP", "EJP"),
    (r"^Electron?\.?\s*C(omm(un)?)?\.?\s*Probab", "ECP", "ECP"),
    (r"^Electr\.?\s*Comm\.?\s*Probab", "ECP", "ECP"),
    # Electron. J. Comb. / Eur. J. Comb.
    (r"^Electron?\.?\s*J\.?\s*Comb", "Electron. J. Combin.", "Electron. J. Combin."),
    (r"^Electronic Journal of Combinatorics\b", "Electron. J. Combin.", "Electron. J. Combin."),
    (r"^Eur(opean)?\.?\s*J\.?\s*Comb", "European J. Combin.", "European J. Combin."),
    # JAMS / JEMS
    (r"^J\.?\s*Amer\.?\s*Math\.?\s*Soc", "JAMS", "JAMS"),
    (r"^J\.?\s*Eur\.?\s*Math\.?\s*Soc", "JEMS", "JEMS"),
    # J. Comb. Theory
    (r"^J\.?\s*Comb(in)?\.?\s*Theory\.?\s*(Ser\.?\s*)?A", "JCTA", "JCTA"),
    (r"^J\.?\s*Comb(in)?\.?\s*Theory\.?\s*(Ser\.?\s*)?B", "JCTB", "JCTB"),
    # SIGMA
    (r"^SIGMA\b", "SIGMA", "SIGMA"),
    # ALEA
    (r"^ALEA\b", "ALEA", "ALEA"),
    # RMTA
    (r"^RMTA\b", "RMTA", "RMTA"),
    (r"^Random Matrices:?\s*Theory", "RMTA", "RMTA"),
    (r"^Random Matrices$", "RMTA", "RMTA"),
    # SciPost
    (r"^SciPost Phys", "SciPost Phys.", "SciPost Phys."),
    # Adv. Appl. Math.
    (r"^Adv(ances)?\.?\s*(in\s*)?Appl(ied)?\.?\s*Math", "Adv. Appl. Math.", "Adv. Appl. Math."),
    # Discret. Math. / Discrete Math.
    (r"^Discret(e)?\.?\s*Math\.?\s*$", "Discrete Math.", "Discrete Math."),
    (r"^Discret(e)?\.?\s*Math\.?\s*Theor", "DMTCS", "DMTCS"),
    (r"^Discret(e)?\.?\s*Appl\.?\s*Math", "Discrete Appl. Math.", "Discrete Appl. Math."),
    # SIAM
    (r"^SIAM J\.?\s*Discret", "SIAM J. Discrete Math.", "SIAM J. Discrete Math."),
    (r"^SIAM J\.?\s*Math\.?\s*Anal", "SIAM J. Math. Anal.", "SIAM J. Math. Anal."),
    (r"^SIAM J\.?\s*Matrix", "SIAM J. Matrix Anal.", "SIAM J. Matrix Anal."),
    (r"^SIAM J\.?\s*Numer", "SIAM J. Numer. Anal.", "SIAM J. Numer. Anal."),
    (r"^SIAM Rev", "SIAM Review", "SIAM Review"),
    (r"^Multiscale Model", "SIAM Multiscale Model.", "SIAM Multiscale Model."),
    # Séminaire Lotharingien
    (r"^S[eé]m(inaire)?\.?\s*Lothar", "Sém. Lothar. Combin.", "Sém. Lothar. Combin."),
    # J. Approx. Theory
    (r"^J\.?\s*Approx\.?\s*Theory", "J. Approx. Theory", "J. Approx. Theory"),
    # Comb. Probab. Comput.
    (r"^Comb(in)?\.?\s*Probab\.?\s*Comput", "CPC", "CPC"),
    # Comb. Theory
    (r"^Comb(in)?\.?\s*Theory$", "Combin. Theory", "Combin. Theory"),
    # Lett. Math. Phys.
    (r"^Lett\.?\s*Math\.?\s*Phys", "Lett. Math. Phys.", "Lett. Math. Phys."),
    # Funct. Anal. Appl.
    (r"^Funct(ional)?\.?\s*Anal(ysis)?\.?\s*(and Its\s*)?Appl", "Funct. Anal. Appl.", "Funct. Anal. Appl."),
    # Moscow Math. J.
    (r"^Moscow Math(ematical)?\.?\s*J(ournal)?", "Moscow Math. J.", "Moscow Math. J."),
    (r"^Mosc\.?\s*Math\.?\s*J", "Moscow Math. J.", "Moscow Math. J."),
    # Markov Processes
    (r"^Markov Process", "Markov Process. Related Fields", "Markov Process. Related Fields"),
    # Proc. ICM
    (r"^Proceedings of the International Congress of Mathematicians", "Proc. ICM", "Proc. ICM"),
    (r"^In:?\s*Proceedings of the International Congress", "Proc. ICM", "Proc. ICM"),
    # J. Symb. Comput.
    (r"^J\.?\s*Symb\.?\s*Comput", "J. Symbolic Comput.", "J. Symbolic Comput."),
    # J. Comput. Appl. Math.
    (r"^J\.?\s*Comput\.?\s*Appl\.?\s*Math", "J. Comput. Appl. Math.", "J. Comput. Appl. Math."),
    # J. Multivar. Anal.
    (r"^J\.?\s*Multivar\.?\s*Anal", "J. Multivar. Anal.", "J. Multivar. Anal."),
    # Math. Comput.
    (r"^Math\.?\s*Comput\.$", "Math. Comp.", "Math. Comp."),
    # Int. J. Bifurc. Chaos
    (r"^Int\.?\s*J\.?\s*Bifurc", "Int. J. Bifurcation Chaos", "Int. J. Bifurcation Chaos"),
    # Int. J. Algebra Comput.
    (r"^Int\.?\s*J\.?\s*Algebra\.?\s*Comput", "Int. J. Algebra Comput.", "Int. J. Algebra Comput."),
    # Theor. Math. Phys.
    (r"^Theor\.?\s*Math\.?\s*Phys", "Theor. Math. Phys.", "Theor. Math. Phys."),
    # Theor. Comput. Sci.
    (r"^Theor(y)?\.?\s*Comput\.?\s*Sci", "Theor. Comput. Sci.", "Theor. Comput. Sci."),
    # Theory Comput.
    (r"^Theory Comput\.$", "Theory Comput.", "Theory Comput."),
    # Bull. Amer. Math. Soc.
    (r"^Bull\.?\s*Amer\.?\s*Math\.?\s*Soc", "Bull. AMS", "Bull. AMS"),
    # Bull. Inst. Math.
    (r"^Bull\.?\s*Inst\.?\s*Math", "Bull. Inst. Math.", "Bull. Inst. Math."),
    # Prob. Math. Phys.
    (r"^Prob(ab)?\.?\s*Math\.?\s*Phys", "Prob. Math. Phys.", "Prob. Math. Phys."),
    # Contemp. Math.
    (r"^Contemp(orary)?\.?\s*Math", "Contemp. Math.", "Contemp. Math."),
    # J. of Phys.: Conf.
    (r"^J\.?\s*of Phys\.?:?\s*Conf", "J. Phys. Conf. Ser.", "J. Phys. Conf. Ser."),
    # Ars Comb.
    (r"^Ars Comb", "Ars Combin.", "Ars Combin."),
    # Found. Trends
    (r"^Found\.?\s*Trends", "Found. Trends", "Found. Trends"),
    # RIMS
    (r"^RIMS", "RIMS", "RIMS"),
    # Discuss. Math.
    (r"^Discuss\.?\s*Math", "Discuss. Math.", "Discuss. Math."),
    # Linear Algebra Appl.
    (r"^Linear Algebra\.?\s*Appl", "Linear Algebra Appl.", "Linear Algebra Appl."),
    # IEEE Trans
    (r"^IEEE Trans", "IEEE Trans.", "IEEE Trans."),
    # LIPIcs
    (r"^LIPIcs\b", "LIPIcs", "LIPIcs"),
    # MSRI
    (r"^MSRI\b", "MSRI Publ.", "MSRI Publ."),
    # RMS
    (r"^RMS-", "RMS Lect. Notes", "RMS Lect. Notes"),
    # Springer Proc.
    (r"^Springer Proc", "Springer Proc.", "Springer Proc."),
    # Geom. Topol. Monogr.
    (r"^Geom\.?\s*Topol\.?\s*Monogr", "Geom. Topol. Monogr.", "Geom. Topol. Monogr."),
    # IMS
    (r"^IMS\b", "IMS", "IMS"),
    # Proceedings of ...ACM
    (r"^Proceedings of the.*ACM", "Proc. ACM", "Proc. ACM"),
    # Annales Henri Lebesgue
    (r"^Annales Henri Lebesgue\b", "Ann. Henri Lebesgue", "Ann. Henri Lebesgue"),
    # Bernoulli
    (r"^Bernoulli\b", "Bernoulli", "Bernoulli"),
    # Nonlinearity
    (r"^Nonlinearity\b", "Nonlinearity", "Nonlinearity"),
    (r"^Nonlinear Anal", "Nonlinear Anal.", "Nonlinear Anal."),
    # Selecta Math.
    (r"^Selecta Math", "Selecta Math.", "Selecta Math."),
    # Inventiones
    (r"^Invent(iones)?\.?\s*[Mm]ath", "Invent. Math.", "Invent. Math."),
    # Acta Math.
    (r"^Acta Math(ematica)?\b", "Acta Math.", "Acta Math."),
    # Probab. Surveys
    (r"^Probab(ility)?\.?\s*Surveys", "Probab. Surveys", "Probab. Surveys"),
    # Rep. Theory / Representation Theory
    (r"^Representation Theory\b", "Represent. Theory", "Represent. Theory"),
    # Algebraic Combinatorics
    (r"^Algebraic Combinatorics\b", "Alg. Combin.", "Alg. Combin."),
    # Nucl. Phys.
    (r"^Nuclear Physics\b", "Nucl. Phys.", "Nucl. Phys."),
    # Comm. Cont. Math
    (r"^Comm\.?\s*Cont\.?\s*Math", "Comm. Contemp. Math.", "Comm. Contemp. Math."),
    # J. Funct. Anal.
    (r"^Journal of Functional Analysis\b", "J. Funct. Anal.", "J. Funct. Anal."),
    # Stochastic Processes
    (r"^Stochastic Processes\b", "Stoch. Proc. Appl.", "Stoch. Proc. Appl."),
    # Transformation Groups
    (r"^Transformation Groups\b", "Transform. Groups", "Transform. Groups"),
    # Advanced Studies Pure Math.
    (r"^Advanced Studies in Pure Math", "Adv. Stud. Pure Math.", "Adv. Stud. Pure Math."),
    # Annals of Combinatorics
    (r"^Annals of Combinatorics\b", "Ann. Combin.", "Ann. Combin."),
    # Random Structures
    (r"^Random Struct", "Random Struct. Alg.", "Random Struct. Alg."),
    # Compositio
    (r"^Compositio\b", "Compos. Math.", "Compos. Math."),
    # Constructive Approx.
    (r"^Constructive Approx", "Constr. Approx.", "Constr. Approx."),
    # J. Algebra
    (r"^Journal of Algebra\b", "J. Algebra", "J. Algebra"),
    # J. Algebraic Combin.
    (r"^Journal of Algebraic Combin", "J. Algebraic Combin.", "J. Algebraic Combin."),
    # The Ramanujan Journal
    (r"^The Ramanujan J", "Ramanujan J.", "Ramanujan J."),
    # ESAIM
    (r"^ESAIM\b", "ESAIM", "ESAIM"),
    # Ensaios
    (r"^Ensaios\b", "Ensaios Mat.", "Ensaios Mat."),
    # Progress in Probability
    (r"^Progress in Prob", "Progr. Probab.", "Progr. Probab."),
    # Studies in Applied Math.
    (r"^Studies in Applied Math", "Stud. Appl. Math.", "Stud. Appl. Math."),
    # Functional Analysis
    (r"^Functional Analysis\b", "Funct. Anal. Appl.", "Funct. Anal. Appl."),
    # Journal of Mathematical Sciences
    (r"^Journal of Mathematical Sciences\b", "J. Math. Sci.", "J. Math. Sci."),
    # J. Integrable Syst.
    (r"^J\.?\s*Integrable Syst", "J. Integrable Syst.", "J. Integrable Syst."),
    (r"^Journal of Integrable Systems\b", "J. Integrable Syst.", "J. Integrable Syst."),
    # Physica
    (r"^Physica A\b", "Physica A", "Physica A"),
    (r"^Physica D\b", "Physica D", "Physica D"),
    # Sugaku
    (r"^Sugaku\b", "Sugaku", "Sugaku"),
    # Wiad. Mat.
    (r"^Wiad\.?\s*Mat", "Wiad. Mat.", "Wiad. Mat."),
    # Tokyo J. Math.
    (r"^Tokyo J\.?\s*Math", "Tokyo J. Math.", "Tokyo J. Math."),
    # Illinois J. Math.
    (r"^Illinois J\.?\s*Math", "Illinois J. Math.", "Illinois J. Math."),
    # Proc. Sympos. Appl. Math.
    (r"^Proc(eedings)?\.?\s*(of\s*)?(Sympos|the\s*Steklov)", "Proc.", "Proc."),
    # Mathematical Research Letters
    (r"^Mathematical Research Letters\b", "Math. Res. Lett.", "Math. Res. Lett."),
    # Interdisciplinary Information Sciences
    (r"^Interdisciplinary\b", "Interdiscip. Inform.", "Interdiscip. Inform."),
    # J. Combin. Number Theory
    (r"^J\.?\s*Combin\.?\s*Number", "J. Combin. Number Theory", "J. Combin. Number Theory"),
    # Rend. Sem. Mat.
    (r"^Rend\.?\s*Sem\.?\s*Mat", "Rend. Sem. Mat. Padova", "Rend. Sem. Mat. Padova"),
    # Trans. Amer. Math. Soc. (abbrev form)
    (r"^Trans\.?\s*Amer\.?\s*Math\.?\s*Soc", "Trans. AMS", "Trans. AMS"),
    # Groups, Geometry, and Dynamics
    (r"^Groups,?\s*Geometry", "Groups Geom. Dyn.", "Groups Geom. Dyn."),
    # "in:" book references — keep short
    (r"^in:?\s", "Book chapter", "Book chapter"),
    (r'^"', "Book chapter", "Book chapter"),
    # Catch-all for "Proceedings of" not yet matched
    (r"^Proceedings of\b", "Proceedings", "Proceedings"),
    # 2017 MATRIX Annals etc.
    (r"^\d{4}\s+MATRIX", "MATRIX Annals", "MATRIX Annals"),
    (r"^XIII Symposium", "Symposium", "Symposium"),
    (r"^SpringerBriefs\b", "SpringerBriefs", "SpringerBriefs"),
    (r"^Universitext\b", "Universitext", "Universitext"),
    # Seminaire de Probabilites
    (r"^S[eé]minaire de Probab", "Sém. Probab.", "Sém. Probab."),
    # What's Next? (Thurston volume etc.)
    (r"^What.s Next", "Book chapter", "Book chapter"),
    # Analytic Trends
    (r"^Analytic Trends", "Book chapter", "Book chapter"),
    # Stochastic Dynamics Out of Equilibrium
    (r"^Stochastic Dynamics", "Springer Proc.", "Springer Proc."),
    # Statistical Mechanics of Classical
    (r"^Statistical Mechanics", "Springer Proc.", "Springer Proc."),
    # Sojourns in Probability
    (r"^Sojourns in Prob", "Springer Proc.", "Springer Proc."),
    # Probability and Analysis
    (r"^Probability and Analysis", "Springer Proc.", "Springer Proc."),
    # Representation Theory, Mathematical Physics
    (r"^Representation Theory,?\s*Mathematical Physics", "Springer Proc.", "Springer Proc."),
    # Lattice Path Combinatorics
    (r"^Lattice Path\b", "Book chapter", "Book chapter"),
    # High Dimensional Probability
    (r"^High Dimensional\b", "IMS", "IMS"),
    # Handbook / Encyclopedia / Monograph
    (r"^Handbook\b", "Handbook", "Handbook"),
    (r"^Encyclopedia\b", "Encyclopedia", "Encyclopedia"),
    (r"^Chapter \d", "Book chapter", "Book chapter"),
    # Mathematical Aspects
    (r"^Mathematical Aspects\b", "Book chapter", "Book chapter"),
    # Notions of Positivity
    (r"^Notions of\b", "Book chapter", "Book chapter"),
    # Polygons, polyominoes
    (r"^Polygons\b", "Book chapter", "Book chapter"),
    # Symmetries and groups
    (r"^Symmetries and\b", "Book chapter", "Book chapter"),
    # Geometric Methods
    (r"^Geometric Methods\b", "Book chapter", "Book chapter"),
    # Algebraic Monoids
    (r"^Algebraic Monoids\b", "Book chapter", "Book chapter"),
    # Algebraic Combinatorics and Applications
    (r"^Algebraic Combinatorics and\b", "Book chapter", "Book chapter"),
    # Published in/as/online
    (r"^Published\b", "Published", "Published"),
    # INSMI
    (r"^INSMI\b", "INSMI", "INSMI"),
    # Publicações
    (r"^Publicações\b", "Publicações", "Publicações"),
    # Representations of algebras
    (r"^Representations of\b", "Book chapter", "Book chapter"),
    # the corner growth model...
    (r"^The corner growth\b", "Book chapter", "Book chapter"),
    # The Oxford Handbook
    (r"^The Oxford Handbook\b", "Handbook", "Handbook"),
    # Analysis and Stochastics
    (r"^Analysis and Stochastics\b", "Book chapter", "Book chapter"),
    # Singular Phenomena
    (r"^In Singular\b", "Book chapter", "Book chapter"),
    # Modern Trends
    (r"^In Modern Trends\b", "Book chapter", "Book chapter"),
    # Advances in Disordered
    (r"^Advances in Disordered\b", "Book chapter", "Book chapter"),
    # Advances in Pure
    (r"^Advances in Pure\b", "Adv. Pure Appl. Math.", "Adv. Pure Appl. Math."),
    # Zeta functions
    (r"^Zeta functions\b", "Book chapter", "Book chapter"),
    # Partition Functions
    (r"^.Partition Functions\b", "Book chapter", "Book chapter"),
    # Large Truncated
    (r"^.Large Truncated\b", "Book chapter", "Book chapter"),
    # Conformal Field Theory
    (r"^.Conformal Field\b", "Book chapter", "Book chapter"),
    # Josai Mathematical Monographs
    (r"^Josai\b", "Josai Math. Monogr.", "Josai Math. Monogr."),
    # XIII Symposium
    (r"^XIII\b", "Proceedings", "Proceedings"),
    # Proc. of the Infinite Analysis
    (r"^Proc\.?\s*of\b", "Proceedings", "Proceedings"),
    # Quantum Information Processing
    (r"^Quantum Information\b", "Quantum Inf. Process.", "Quantum Inf. Process."),
]

# Compile patterns once
_COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE), b, f) for p, b, f in _PATTERNS]

# Build case-insensitive exact lookup
_EXACT_LOWER = {k.lower(): v for k, v in _EXACT.items()}


def normalize_journal_name(raw_name):
    """
    Normalize a raw journal name to (badge_name, canonical_full_name).

    Returns (badge, full) tuple. If no match found, returns (raw_name, raw_name)
    with minor cleanup (strip whitespace, collapse newlines).
    """
    if not raw_name:
        return ("", "")

    # Clean up whitespace/newlines
    name = re.sub(r'\s+', ' ', raw_name).strip()

    # Try exact match (case-insensitive)
    lower = name.lower()
    if lower in _EXACT_LOWER:
        return _EXACT_LOWER[lower]

    # Try regex patterns
    for pattern, badge, full in _COMPILED_PATTERNS:
        if pattern.search(name):
            return (badge, full)

    # No match — return cleaned name (truncate very long names for badge)
    if len(name) > 40:
        # Try to find a natural break point
        short = name[:37].rsplit(',', 1)[0].rsplit(':', 1)[0].rsplit('.', 1)[0]
        if len(short) < 20:
            short = name[:37]
        return (short + "...", name)

    return (name, name)
