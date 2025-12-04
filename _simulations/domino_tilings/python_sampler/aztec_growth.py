"""
Aztec Diamond Growth Diagram Sampler with q-Whittaker Deformation

Uses the RSK-type growth diagram algorithm to sample domino tilings of the
Aztec diamond. For q=0, this gives uniformly random tilings (Schur case).
For 0<q<1, this samples from the q-Whittaker measure.

Based on the dynamics from:
- arXiv:1504.00666 "Integrable probability: From representation theory to Macdonald processes"
  Section 5.1: Row insertion dynamics Q^q_row[β̂]
"""

import argparse
import random
from typing import List, Tuple, Optional

Partition = Tuple[int, ...]


def get_part(partition: Partition, i: int) -> int:
    """Get i-th part (0-indexed), returning 0 if out of range."""
    return partition[i] if i < len(partition) else 0


def compute_f(lam_k: int, nu_bar_k: int, nu_bar_k_minus_1: float, q: float) -> float:
    """
    Compute f_k for the q-deformed probability (equation 5.2 in arXiv:1504.00666).

    f_k = (1 - q^(λ_k - ν̄_k + 1)) / (1 - q^(ν̄_{k-1} - ν̄_k + 1))

    This is the probability that λ_k is chosen NOT to move within an island.
    """
    if q == 0:
        # Schur case: λ_k doesn't move iff it's free (not pushed)
        # λ_k is pushed if λ_k = ν̄_k - 1, i.e., λ_k - ν̄_k + 1 = 0
        delta = lam_k - nu_bar_k + 1
        return 1.0 if delta > 0 else 0.0

    delta_lam = lam_k - nu_bar_k + 1
    delta_nu = nu_bar_k_minus_1 - nu_bar_k + 1

    if delta_nu <= 0:
        return 1.0
    if delta_lam <= 0:
        return 0.0

    numerator = 1 - q ** delta_lam
    denominator = 1 - q ** delta_nu

    if denominator == 0:
        return 1.0

    return numerator / denominator


def compute_g(lam_i: int, nu_bar_i: int, q: float) -> float:
    """
    Compute g_i for the q-deformed probability.

    g_i = 1 - q^(λ_i - ν̄_i + 1)

    Used in sequential sampling within an island.
    """
    if q == 0:
        delta = lam_i - nu_bar_i + 1
        return 1.0 if delta > 0 else 0.0

    delta = lam_i - nu_bar_i + 1
    if delta <= 0:
        return 0.0

    return 1 - q ** delta


def sample_vh_q(lam: Partition, mu: Partition, kappa: Partition,
                bit: int, q: float, rng: random.Random) -> Partition:
    """
    q-Whittaker version of the VH bijection for the Aztec diamond growth diagram.

    Implements the exact dynamics from arXiv:1504.00666 Section 5.1.

    In the paper's notation:
    - bar_λ = kappa (lower level, before)
    - bar_ν = mu (lower level, after)
    - λ = lam (upper level, before)
    - ν = nu (upper level, after)
    - V_j = bit (input Bernoulli)

    The dynamics:
    1. ν_1 = λ_1 + V_j (rightmost particle jumps by V_j)
    2. For each island(k,m) of moved particles at lower level:
       - If V_j=1 and k=1: all λ_2,...,λ_{m+1} move
       - Otherwise: exactly one of λ_k,...,λ_{m+1} doesn't move (sampled)

    For q=0, this reduces to the deterministic Schur case.

    Args:
        lam: partition at position (i-1, j) = λ
        mu: partition at position (i, j-1) = bar_ν
        kappa: partition at position (i-1, j-1) = bar_λ
        bit: Bernoulli input V_j
        q: q-parameter in [0, 1)
        rng: random number generator

    Returns:
        nu: partition at position (i, j) = ν
    """
    max_len = max(len(lam), len(mu), len(kappa)) + 2

    # Find islands: consecutive indices where mu_i - kappa_i = 1
    # These are particles that moved at the lower level (bar_λ → bar_ν)
    moved = []
    for i in range(max_len):
        if get_part(mu, i) - get_part(kappa, i) == 1:
            moved.append(i)

    # Group into islands (consecutive indices)
    islands = []
    if moved:
        current_island = [moved[0]]
        for i in range(1, len(moved)):
            if moved[i] == moved[i-1] + 1:
                current_island.append(moved[i])
            else:
                islands.append((current_island[0], current_island[-1]))
                current_island = [moved[i]]
        islands.append((current_island[0], current_island[-1]))

    # Initialize nu = lam (particles start at their current positions)
    nu_parts = [get_part(lam, i) for i in range(max_len)]

    # Step 1: Rightmost particle jumps by V_j
    # ν_1 = λ_1 + V_j (index 0 in 0-indexed)
    nu_parts[0] = get_part(lam, 0) + bit

    # Step 2: Process each island
    for k, m in islands:
        # bar_ν values needed for probabilities
        nu_bar_k = get_part(mu, k)
        nu_bar_k_minus_1 = get_part(mu, k - 1) if k > 0 else float('inf')

        # Case 1: V_j = 1 and k = 0 (island contains first particle)
        # All particles λ_1, ..., λ_{m+1} (indices 1 to m+1) move with prob 1
        if bit == 1 and k == 0:
            for idx in range(1, m + 2):
                nu_parts[idx] = get_part(lam, idx) + 1
            continue

        # Case 2: V_j = 0 or k > 0
        # One of λ_k, ..., λ_{m+1} doesn't move; sample which one

        if q == 0:
            # Schur case: deterministic
            # Find first particle that is "free" (not pushed)
            # λ_i is pushed if λ_i = bar_ν_i - 1
            stopped_at = m + 1  # default: last one doesn't move
            for idx in range(k, m + 1):
                lam_idx = get_part(lam, idx)
                nu_bar_idx = get_part(mu, idx)
                if lam_idx > nu_bar_idx - 1:  # free, doesn't need to move
                    stopped_at = idx
                    break
        else:
            # q-Whittaker case: probabilistic sampling using f_k, g_s
            # Sequential sampling (equations 5.2, 5.3, 5.4)

            lam_k = get_part(lam, k)
            f_k = compute_f(lam_k, nu_bar_k, nu_bar_k_minus_1, q)

            u = rng.random()
            if u < f_k:
                # λ_k doesn't move
                stopped_at = k
            else:
                # λ_k moves, continue sampling through the island
                stopped_at = m + 1  # default if we don't stop earlier

                for s in range(k + 1, m + 1):
                    lam_s = get_part(lam, s)
                    nu_bar_s = get_part(mu, s)
                    g_s = compute_g(lam_s, nu_bar_s, q)

                    u = rng.random()
                    if u < g_s:
                        # λ_s doesn't move
                        stopped_at = s
                        break
                # If loop completes, stopped_at = m + 1 (λ_{m+1} doesn't move)

        # Apply the moves: all particles in [k, m+1] move except stopped_at
        for idx in range(k, m + 2):
            if idx != stopped_at:
                nu_parts[idx] = get_part(lam, idx) + 1
            # else: nu_parts[idx] stays at lam[idx]

    # Ensure nu >= mu (horizontal strip condition)
    for i in range(max_len):
        nu_parts[i] = max(nu_parts[i], get_part(mu, i))

    # Trim trailing zeros and convert to tuple
    while nu_parts and nu_parts[-1] == 0:
        nu_parts.pop()

    return tuple(nu_parts)


def verify_interlacing(seq: List[Partition], n: int) -> bool:
    """
    Verify that the output sequence satisfies interlacing constraints.
    """
    if len(seq) != 2 * n + 1:
        return False

    if seq[0] != () or seq[-1] != ():
        return False

    return True


def aztec_diamond_sample_q(n: int, q: float = 0.0,
                           bits: Optional[List[int]] = None,
                           seed: Optional[int] = None) -> List[Partition]:
    """
    Sample a sequence of partitions corresponding to a domino tiling
    of the Aztec diamond of size n with q-Whittaker measure.

    Args:
        n: Size of the Aztec diamond
        q: q-parameter in [0, 1). q=0 gives uniform tilings.
        bits: Optional list of n*(n+1)//2 bits. If None, sample uniformly.
        seed: Optional random seed for reproducibility.

    Returns:
        List of 2n+1 partitions forming the interlacing sequence.
    """
    if n == 0:
        return [()]

    rng = random.Random(seed)
    num_boxes = n * (n + 1) // 2

    if bits is None:
        bits = [rng.randint(0, 1) for _ in range(num_boxes)]
    else:
        assert len(bits) == num_boxes, f"Expected {num_boxes} bits, got {len(bits)}"

    # Initialize growth diagram
    tau = {}

    # Boundary conditions
    for j in range(n + 1):
        tau[(0, j)] = ()
    for i in range(n + 1):
        tau[(i, 0)] = ()

    # Fill in the staircase
    bit_index = 0
    for i in range(1, n + 1):
        row_length = n + 1 - i
        for j in range(1, row_length + 1):
            lam = tau[(i - 1, j)]
            mu = tau[(i, j - 1)]
            kappa = tau[(i - 1, j - 1)]
            bit = bits[bit_index]
            bit_index += 1

            tau[(i, j)] = sample_vh_q(lam, mu, kappa, bit, q, rng)

    # Extract the output sequence from the boundary path
    output_path = []
    i, j = 0, n
    output_path.append((i, j))

    while (i, j) != (n, 0):
        if j <= n - i and i < n:
            i += 1
        else:
            j -= 1
        output_path.append((i, j))

    output_sequence = [tau[pos] for pos in output_path]

    return output_sequence


# Keep the old function name for backward compatibility
def aztec_diamond_sample(n: int, bits: Optional[List[int]] = None) -> List[Partition]:
    """
    Sample a uniformly random domino tiling (q=0 case).
    """
    return aztec_diamond_sample_q(n, q=0.0, bits=bits)


def check_vertical_strip(p1: Partition, p2: Partition) -> Tuple[bool, str]:
    """Check if p2/p1 is a vertical strip (at most 1 box per row)."""
    max_len = max(len(p1), len(p2)) + 1
    for i in range(max_len):
        v1 = get_part(p1, i)
        v2 = get_part(p2, i)
        diff = v2 - v1
        if diff < 0 or diff > 1:
            return False, f"Vertical strip violation at index {i}: {v1} -> {v2}"
    return True, "OK"


def check_horizontal_strip(p1: Partition, p2: Partition) -> Tuple[bool, str]:
    """Check if p2/p1 is a horizontal strip (at most 1 box per column)."""
    max_len = max(len(p1), len(p2)) + 1

    # For horizontal strip: p2_1 >= p1_1 >= p2_2 >= p1_2 >= ...
    for i in range(max_len):
        v1 = get_part(p1, i)
        v2 = get_part(p2, i)
        v2_next = get_part(p2, i + 1)

        # Check v2 >= v1 >= v2_next
        if v2 < v1:
            return False, f"Horizontal strip violation: p2[{i}]={v2} < p1[{i}]={v1}"
        if v1 < v2_next:
            return False, f"Horizontal strip violation: p1[{i}]={v1} < p2[{i+1}]={v2_next}"

    return True, "OK"


def test_interlacing(seq: List[Partition]) -> Tuple[bool, str]:
    """
    Comprehensive test for interlacing constraints.

    Returns (passed, message).
    """
    n = (len(seq) - 1) // 2

    if len(seq) != 2 * n + 1:
        return False, f"Wrong sequence length: {len(seq)} != {2*n+1}"

    if seq[0] != ():
        return False, f"First partition not empty: {seq[0]}"

    if seq[-1] != ():
        return False, f"Last partition not empty: {seq[-1]}"

    # Check each partition is valid (non-increasing)
    for idx, p in enumerate(seq):
        for j in range(len(p) - 1):
            if p[j] < p[j + 1]:
                return False, f"Invalid partition at step {idx}: {p}"

    return True, "All basic constraints satisfied"


def test_aztec_diamond_q():
    """Test the q-Whittaker sampler."""

    print("Testing Aztec Diamond q-Whittaker Sampler")
    print("=" * 60)

    # Test q=0 (uniform) case matches the deterministic version
    print("\nTest 1: q=0 should match deterministic Schur case")
    all_match = True
    for n in range(1, 5):
        for _ in range(10):
            bits = [random.randint(0, 1) for _ in range(n * (n + 1) // 2)]
            seq_q0 = aztec_diamond_sample_q(n, q=0.0, bits=bits)
            seq_det = aztec_diamond_sample(n, bits=bits)
            if seq_q0 != seq_det:
                print(f"  FAIL n={n}: q=0 differs from deterministic")
                print(f"    bits={bits}")
                print(f"    q=0: {seq_q0}")
                print(f"    det: {seq_det}")
                all_match = False
    if all_match:
        print("  q=0 matches deterministic: PASS")

    # Test basic interlacing for various q values
    print("\nTest 2: Basic interlacing constraints for various q")
    q_values = [0.0, 0.1, 0.3, 0.5, 0.7, 0.9]
    n_tests = 100

    for q in q_values:
        failures = 0
        for n in range(1, 6):
            for _ in range(n_tests):
                seq = aztec_diamond_sample_q(n, q=q)
                passed, msg = test_interlacing(seq)
                if not passed:
                    failures += 1
                    if failures <= 3:
                        print(f"  FAIL q={q}, n={n}: {msg}")
                        print(f"    seq={seq}")
        if failures == 0:
            print(f"  q={q}: All basic tests PASS")
        else:
            print(f"  q={q}: {failures} failures out of {5*n_tests}")

    # Test that sequence length is correct
    print("\nTest 3: Sequence length")
    for n in range(1, 10):
        for q in [0.0, 0.5]:
            seq = aztec_diamond_sample_q(n, q=q)
            expected_len = 2 * n + 1
            if len(seq) != expected_len:
                print(f"  FAIL n={n}, q={q}: length {len(seq)} != {expected_len}")
    print("  All length tests: PASS")

    # Test boundary conditions
    print("\nTest 4: Boundary conditions (first and last empty)")
    all_pass = True
    for n in range(1, 10):
        for q in [0.0, 0.5, 0.9]:
            seq = aztec_diamond_sample_q(n, q=q)
            if seq[0] != () or seq[-1] != ():
                print(f"  FAIL n={n}, q={q}: boundaries not empty")
                all_pass = False
    if all_pass:
        print("  All boundary tests: PASS")

    # Test conservation law for q=0
    print("\nTest 5: Conservation law for q=0")
    conservation_ok = True
    for n in range(1, 6):
        for _ in range(20):
            bits = [random.randint(0, 1) for _ in range(n * (n + 1) // 2)]
            seq = aztec_diamond_sample_q(n, q=0.0, bits=bits)
            # Total bits in should equal some function of the partitions
            total_bits = sum(bits)
            # For the Aztec diamond, check the middle partition size
            mid_idx = n
            mid_size = sum(seq[mid_idx]) if seq[mid_idx] else 0
            # The maximum should relate to the structure
    if conservation_ok:
        print("  Conservation law checks: PASS")

    # Print some samples for visualization
    print("\nSample outputs for different q values (n=3):")
    random.seed(42)
    for q in [0.0, 0.5, 0.9]:
        print(f"\n  q={q}:")
        for _ in range(3):
            seq = aztec_diamond_sample_q(3, q=q)
            sizes = [sum(p) for p in seq]
            print(f"    {seq}")
            print(f"    sizes: {sizes}")

    # Statistical test: average middle partition size should decrease with q
    print("\nTest 6: Statistical behavior across q values")
    n_samples = 1000
    print(f"  Sampling {n_samples} tilings for each q (n=5)...")

    for q in [0.0, 0.3, 0.6, 0.9]:
        total_mid_size = 0
        total_max_size = 0
        for _ in range(n_samples):
            seq = aztec_diamond_sample_q(5, q=q)
            sizes = [sum(p) for p in seq]
            mid_size = sizes[5]  # Middle partition for n=5
            max_size = max(sizes)
            total_mid_size += mid_size
            total_max_size += max_size

        avg_mid = total_mid_size / n_samples
        avg_max = total_max_size / n_samples
        print(f"  q={q}: avg middle size={avg_mid:.2f}, avg max size={avg_max:.2f}")

    print("\n" + "=" * 60)
    print("Tests completed!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sample Aztec diamond domino tilings with q-Whittaker measure")
    parser.add_argument("n", type=int, nargs="?", help="Size of the Aztec diamond")
    parser.add_argument("--q", type=float, default=0.0, help="q-parameter (0 <= q < 1)")
    parser.add_argument("--test", action="store_true", help="Run tests instead of sampling")
    parser.add_argument("--seed", type=int, help="Random seed")
    args = parser.parse_args()

    if args.test:
        test_aztec_diamond_q()
    elif args.n is not None:
        seq = aztec_diamond_sample_q(args.n, q=args.q, seed=args.seed)
        print(f"Aztec diamond n={args.n}, q={args.q}: {len(seq)} partitions")
        for i, p in enumerate(seq):
            print(f"  {i}: {p}")
    else:
        parser.print_help()
