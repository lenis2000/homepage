#!/usr/bin/env python3
"""
Test script for Schur process growth diagram sampling
Based on arXiv:1407.3764 Section 3
"""

import random

def get_part(partition, i):
    """Get partition part at index i (0-indexed), return 0 if out of bounds."""
    return partition[i] if 0 <= i < len(partition) else 0

def sampleHV(lam, mu, kappa, xi):
    """
    Sample new partition nu given lambda (left), mu (above), kappa (diagonal).

    From paper (Algorithm 3.5):
    def sampleHV(λ, μ, κ, ξ):
        B ~ Bernoulli(ξ/(1+ξ))
        for i = 1 to max(ℓ(λ), ℓ(μ)) + 1:
            if λ_i ≤ μ_i < λ_{i-1}: ν_i = max(λ_i, μ_i) + B
            else: ν_i = max(λ_i, μ_i)
            if μ_{i+1} < λ_i ≤ μ_i: B = min(λ_i, μ_i) - κ_i
        return ν

    Convention: λ_0 = ∞, λ_i = 0 for i > ℓ(λ)
    """
    # Initial Bernoulli sample
    B = 1 if random.random() < xi / (1.0 + xi) else 0

    max_len = max(len(lam), len(mu)) + 2
    nu = []

    # i is 1-indexed in paper
    for i in range(1, max_len + 1):
        # λ_i (1-indexed) -> lam[i-1] (0-indexed)
        lambda_i = get_part(lam, i - 1)
        # λ_{i-1}: for i=1, this is λ_0 = ∞
        lambda_im1 = float('inf') if i == 1 else get_part(lam, i - 2)
        mu_i = get_part(mu, i - 1)
        mu_ip1 = get_part(mu, i)  # μ_{i+1}
        kappa_i = get_part(kappa, i - 1)

        # Condition: λ_i ≤ μ_i < λ_{i-1}
        if lambda_i <= mu_i < lambda_im1:
            nu_i = max(lambda_i, mu_i) + B
        else:
            nu_i = max(lambda_i, mu_i)

        # Update B: condition μ_{i+1} < λ_i ≤ μ_i
        if mu_ip1 < lambda_i <= mu_i:
            B = min(lambda_i, mu_i) - kappa_i

        if nu_i > 0:
            nu.append(nu_i)
        else:
            break

    return nu

def is_horizontal_strip(mu, lam):
    """Check if μ/λ is a horizontal strip (at most one box per column)."""
    # Condition: μ_i ≥ λ_i ≥ μ_{i+1} for all i
    max_len = max(len(mu), len(lam)) + 1
    for i in range(max_len):
        mu_i = get_part(mu, i)
        mu_ip1 = get_part(mu, i + 1)
        lambda_i = get_part(lam, i)
        if not (mu_i >= lambda_i >= mu_ip1):
            return False
    return True

def is_vertical_strip(mu, lam):
    """Check if μ/λ is a vertical strip (at most one box per row)."""
    # Condition: μ_i - λ_i ∈ {0, 1} for all i, and μ ⊇ λ
    max_len = max(len(mu), len(lam))
    for i in range(max_len):
        mu_i = get_part(mu, i)
        lambda_i = get_part(lam, i)
        diff = mu_i - lambda_i
        if diff < 0 or diff > 1:
            return False
    return True

def schur_sample_growth(n, x_params=None, y_params=None):
    """
    Sample from Schur process using growth diagram.

    For Aztec diamond of size n:
    - Staircase shape π = (n, n-1, ..., 1)
    - Fill grid τ[i][j] for j=1..n and i=1..n-j+1
    - Extract boundary partitions
    """
    if x_params is None:
        x_params = [1.0] * n
    if y_params is None:
        y_params = [1.0] * n

    # Grid of partitions τ[i][j]
    # τ[0][j] = τ[i][0] = ∅ (empty)
    tau = [[[] for _ in range(n + 2)] for _ in range(n + 2)]

    # Fill staircase: for each column j, rows 1 to n-j+1
    print(f"Filling staircase grid for n={n}...")
    for j in range(1, n + 1):
        for i in range(1, n - j + 2):
            xi = x_params[i - 1] * y_params[j - 1]
            # λ = tau[i][j-1] (left), μ = tau[i-1][j] (above), κ = tau[i-1][j-1] (diagonal)
            lam = tau[i][j - 1]
            mu = tau[i - 1][j]
            kappa = tau[i - 1][j - 1]

            nu = sampleHV(lam, mu, kappa, xi)
            tau[i][j] = nu

            print(f"  τ[{i}][{j}] = {nu}  (λ={lam}, μ={mu}, κ={kappa}, ξ={xi:.2f})")

    # Extract boundary partitions
    # Trace from (0, n) to (n, 0) along staircase edge
    boundary = []
    boundary.append(tau[0][n])  # Start: τ[0][n] = ∅

    i, j = 0, n
    while i < n or j > 0:
        # The staircase edge: go down if inside, else go left
        if i < n and j <= n - i:
            i += 1
            boundary.append(tau[i][j])
        elif j > 0:
            j -= 1
            boundary.append(tau[i][j])
        else:
            break

    return boundary, tau

def check_interlacing(partitions, path):
    """
    Check interlacing constraints for Schur process based on path direction.

    When moving DOWN (i++): next contains prev as VERTICAL strip
    When moving LEFT (j--): next contains prev as HORIZONTAL strip
    """
    print("\nChecking interlacing constraints...")
    all_valid = True

    for idx in range(1, len(partitions)):
        prev = partitions[idx - 1]
        curr = partitions[idx]
        prev_pos = path[idx - 1]
        curr_pos = path[idx]

        # Determine direction of move
        if curr_pos[0] > prev_pos[0]:
            # Moved DOWN (i increased): vertical strip
            direction = "DOWN"
            is_valid = is_vertical_strip(curr, prev)  # curr contains prev
            strip_type = "vertical"
        else:
            # Moved LEFT (j decreased): horizontal strip
            # When moving LEFT, we go from μ to λ, and μ (prev) contains λ (curr)
            direction = "LEFT"
            is_valid = is_horizontal_strip(prev, curr)  # prev contains curr
            strip_type = "horizontal"

        status = "✓" if is_valid else "✗"
        if not is_valid:
            all_valid = False

        if idx % 2 == 1:
            label = f"μ^{(idx + 1) // 2}"
        else:
            label = f"λ^{idx // 2}"
        prev_label = f"λ^{(idx - 1) // 2}" if (idx - 1) % 2 == 0 else f"μ^{idx // 2}"

        print(f"  {prev_pos}→{curr_pos} ({direction}): {label}/{prev_label} = {curr}/{prev} {strip_type}: {status}")

    return all_valid

def format_partition(p):
    """Format partition for display."""
    if not p:
        return "∅"
    return f"({','.join(map(str, p))})"

def print_grid(tau, n):
    """Print the grid of partitions."""
    print("\n=== Grid τ[i][j] ===")
    print("     ", end="")
    for j in range(n + 1):
        print(f"j={j}".ljust(12), end="")
    print()

    for i in range(n + 1):
        print(f"i={i} ", end="")
        for j in range(n + 1):
            p = tau[i][j]
            s = format_partition(p)
            print(s.ljust(12), end="")
        print()

def run_single_test(n, seed, verbose=True):
    """Run a single test with given parameters."""
    random.seed(seed)

    if verbose:
        print(f"=== Schur Process Growth Diagram Sampling (n={n}, seed={seed}) ===\n")

    boundary, tau = schur_sample_growth(n) if verbose else schur_sample_growth_quiet(n)

    if verbose:
        print_grid(tau, n)
        print(f"\n=== Boundary Traversal ===")
        print(f"The staircase shape is (n, n-1, ..., 1) = {tuple(range(n, 0, -1))}")
        print()

    # Build the boundary path
    i, j = 0, n
    path = [(i, j)]
    while i < n or j > 0:
        if i < n and j <= n - i:
            i += 1
        elif j > 0:
            j -= 1
        else:
            break
        path.append((i, j))

    if verbose:
        print(f"Boundary path: {path}")
        print()
        print(f"=== Boundary Partitions ({len(boundary)} total) ===")
        for idx, p in enumerate(boundary):
            coords = path[idx]
            if idx % 2 == 0:
                label = f"λ^{idx // 2}"
            else:
                label = f"μ^{(idx + 1) // 2}"
            print(f"  {label} = {format_partition(p):12} at τ{coords}")

    all_valid = check_interlacing(boundary, path) if verbose else check_interlacing_quiet(boundary, path)

    return all_valid

def schur_sample_growth_quiet(n, x_params=None, y_params=None):
    """Silent version of schur_sample_growth."""
    if x_params is None:
        x_params = [1.0] * n
    if y_params is None:
        y_params = [1.0] * n

    tau = [[[] for _ in range(n + 2)] for _ in range(n + 2)]

    for j in range(1, n + 1):
        for i in range(1, n - j + 2):
            xi = x_params[i - 1] * y_params[j - 1]
            lam = tau[i][j - 1]
            mu = tau[i - 1][j]
            kappa = tau[i - 1][j - 1]
            nu = sampleHV(lam, mu, kappa, xi)
            tau[i][j] = nu

    boundary = []
    boundary.append(tau[0][n])
    i, j = 0, n
    while i < n or j > 0:
        if i < n and j <= n - i:
            i += 1
            boundary.append(tau[i][j])
        elif j > 0:
            j -= 1
            boundary.append(tau[i][j])
        else:
            break

    return boundary, tau

def check_interlacing_quiet(partitions, path):
    """Silent version of check_interlacing."""
    for idx in range(1, len(partitions)):
        prev = partitions[idx - 1]
        curr = partitions[idx]
        prev_pos = path[idx - 1]
        curr_pos = path[idx]

        if curr_pos[0] > prev_pos[0]:
            is_valid = is_vertical_strip(curr, prev)
        else:
            is_valid = is_horizontal_strip(prev, curr)

        if not is_valid:
            return False
    return True

def main():
    # Run verbose test
    print("=" * 60)
    all_valid = run_single_test(n=4, seed=42, verbose=True)
    print("=" * 60)

    if all_valid:
        print("\n✓ All interlacing constraints satisfied!")
    else:
        print("\n✗ Some interlacing constraints FAILED!")
        return

    # Run batch tests
    print("\n" + "=" * 60)
    print("Running batch tests with different seeds and sizes...")
    print("=" * 60)

    failures = []
    total_tests = 0

    for n in [3, 4, 5, 6, 8, 10]:
        for seed in range(100):
            total_tests += 1
            if not run_single_test(n, seed, verbose=False):
                failures.append((n, seed))

    if failures:
        print(f"\n✗ {len(failures)} failures out of {total_tests} tests:")
        for n, seed in failures[:10]:
            print(f"  n={n}, seed={seed}")
        if len(failures) > 10:
            print(f"  ... and {len(failures) - 10} more")
    else:
        print(f"\n✓ All {total_tests} tests passed!")

if __name__ == "__main__":
    main()
