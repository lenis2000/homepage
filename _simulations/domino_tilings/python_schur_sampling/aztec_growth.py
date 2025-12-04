"""
Aztec Diamond Growth Diagram Sampler

Implements the RSK-type growth diagram algorithm to sample uniformly random
domino tilings of the Aztec diamond of size n. The algorithm takes n(n+1)/2
Bernoulli bits as input and outputs a sequence of 2n+1 integer partitions.
"""

import random
from typing import List, Tuple, Optional

Partition = Tuple[int, ...]


def sample_vh(lam: Partition, mu: Partition, kappa: Partition, bit: int) -> Partition:
    """
    VH bijection for the Aztec diamond growth diagram.

    This is sampleHV with lambda and mu swapped.

    Interlacing conditions on input:
    - kappa ≺ lam (horizontal strip: lam/kappa has at most 1 box per column)
    - kappa ≺' mu (vertical strip: mu/kappa has at most 1 box per row)

    Interlacing conditions on output:
    - lam ≺' nu (vertical strip)
    - mu ≺ nu (horizontal strip)

    Conservation: |lam| + |mu| + bit = |kappa| + |nu|

    Args:
        lam: partition at position (i-1, j) — horizontal strip above kappa
        mu: partition at position (i, j-1) — vertical strip above kappa
        kappa: partition at position (i-1, j-1)
        bit: a Bernoulli(1/2) random bit in {0, 1}

    Returns:
        nu: partition at position (i, j)
    """
    def get_part(partition: Partition, i: int) -> int:
        """Get i-th part (0-indexed), returning 0 if out of range."""
        return partition[i] if i < len(partition) else 0

    # We need indices up to max(len(lam), len(mu)) + 1
    max_len = max(len(lam), len(mu)) + 2

    nu_parts = []
    B = bit

    # Process parts from index 0 upward
    for i in range(max_len):
        lam_i = get_part(lam, i)
        mu_i = get_part(mu, i)
        lam_i_minus_1 = get_part(lam, i - 1) if i > 0 else float('inf')
        mu_i_minus_1 = get_part(mu, i - 1) if i > 0 else float('inf')
        mu_i_plus_1 = get_part(mu, i + 1)
        lam_i_plus_1 = get_part(lam, i + 1)
        kappa_i = get_part(kappa, i)

        # Determine nu_i
        # Output block condition (for VH):
        # if mu_i <= lam_i < mu_{i-1}
        if mu_i <= lam_i < mu_i_minus_1:
            nu_i = max(lam_i, mu_i) + B
        else:
            nu_i = max(lam_i, mu_i)

        nu_parts.append(nu_i)

        # Extract new bit from kappa if at input block
        # VH version: if lam_{i+1} < mu_i <= lam_i
        if lam_i_plus_1 < mu_i <= lam_i:
            B = min(lam_i, mu_i) - kappa_i

    # Trim trailing zeros and convert to tuple
    while nu_parts and nu_parts[-1] == 0:
        nu_parts.pop()

    return tuple(nu_parts)


def aztec_diamond_sample(n: int, bits: Optional[List[int]] = None) -> List[Partition]:
    """
    Sample a sequence of partitions corresponding to a uniform random
    domino tiling of the Aztec diamond of size n.

    Args:
        n: Size of the Aztec diamond
        bits: Optional list of n*(n+1)//2 bits. If None, sample uniformly.

    Returns:
        List of 2n+1 partitions forming the interlacing sequence.
    """
    if n == 0:
        return [()]

    num_boxes = n * (n + 1) // 2

    if bits is None:
        bits = [random.randint(0, 1) for _ in range(num_boxes)]
    else:
        assert len(bits) == num_boxes, f"Expected {num_boxes} bits, got {len(bits)}"

    # The staircase shape: row i (1-indexed) has n+1-i boxes
    # In 0-indexed: row i has n-i boxes, for i = 0, 1, ..., n-1
    # staircase = (n, n-1, ..., 1)

    # Initialize growth diagram
    # tau[i][j] = partition at position (i, j)
    # i ranges from 0 to n, j ranges from 0 to n
    # tau[0][j] = tau[i][0] = empty partition (boundary conditions)

    # Use dictionary for sparse storage
    tau = {}

    # Boundary conditions
    for j in range(n + 1):
        tau[(0, j)] = ()
    for i in range(n + 1):
        tau[(i, 0)] = ()

    # Fill in the staircase, row by row, left to right
    # Row i (1-indexed) has n+1-i boxes
    bit_index = 0
    for i in range(1, n + 1):
        row_length = n + 1 - i
        for j in range(1, row_length + 1):
            lam = tau[(i - 1, j)]
            mu = tau[(i, j - 1)]
            kappa = tau[(i - 1, j - 1)]
            bit = bits[bit_index]
            bit_index += 1

            tau[(i, j)] = sample_vh(lam, mu, kappa, bit)

    # Extract the output sequence from the boundary
    # Path goes from (0, n) to (n, 0) along the staircase boundary
    #
    # For staircase (n, n-1, ..., 1):
    # Row 1 has columns 1..n
    # Row 2 has columns 1..n-1
    # ...
    # Row n has column 1
    #
    # The boundary path traces the "steps" of the staircase

    output_path = []

    i, j = 0, n
    output_path.append((i, j))

    while (i, j) != (n, 0):
        # Check if we can go down (increase i)
        # Position (i+1, j) is valid if j <= n - i (columns in row i+1)
        # Row i+1 (1-indexed) has n+1-(i+1) = n-i columns
        if j <= n - i and i < n:
            i += 1
        else:
            j -= 1
        output_path.append((i, j))

    # Extract partitions along the path
    output_sequence = [tau[pos] for pos in output_path]

    return output_sequence


def test_aztec_diamond():
    """Test basic properties of the sampler."""

    print("Testing Aztec diamond sampler...")
    print()

    # Test n=1: should have 3 partitions, 1 bit
    print("n=1 tests:")
    for bit in [0, 1]:
        seq = aztec_diamond_sample(1, [bit])
        assert len(seq) == 3, f"n=1 should give 3 partitions, got {len(seq)}"
        assert seq[0] == (), "First partition should be empty"
        assert seq[-1] == (), "Last partition should be empty"
        print(f"  bit={bit}: {seq}")
    print()

    # Test n=2: should have 5 partitions, 3 bits
    print("n=2 tests:")
    for bits in [[0, 0, 0], [1, 1, 1], [0, 1, 0], [1, 0, 1]]:
        seq = aztec_diamond_sample(2, bits)
        assert len(seq) == 5, f"n=2 should give 5 partitions, got {len(seq)}"
        assert seq[0] == (), "First partition should be empty"
        assert seq[-1] == (), "Last partition should be empty"
        print(f"  bits={bits}: {seq}")
    print()

    # Test various sizes with random bits
    print("Random sampling tests:")
    for n in range(1, 6):
        seq = aztec_diamond_sample(n)
        sizes = [sum(p) for p in seq]
        print(f"  n={n}: {len(seq)} partitions, sizes = {sizes}")
    print()

    print("All tests passed!")


if __name__ == "__main__":
    test_aztec_diamond()
