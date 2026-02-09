#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
#
# Copyright (c) 2025 Leonid Petrov
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
# ---------------------------------------------------------------------------
# Imaginary q-Racah Hexagonal Tiling Generator
#
#     Original Fortran code: Vadim Gorin  <vadicgor@gmail.com>
#     Python port: Leonid Petrov  <petrov@virginia.edu>
#     Version: 1.0.0   (2025-07-21)
#
#     Citation:
#       Petrov, L. (2025) *Imaginary q-Racah Hexagonal Tiling Generator*
#       Software (to be posted on arXiv)
#
# ---------------------------------------------------------------------------
"""
Imaginary q-Racah Hexagonal Tiling Generator

This script is a port of Gorin's tiling program specifically adapted for the
imaginary q-Racah case. It generates random rhombus tilings of a hexagon using
the imaginary q-Racah orthogonal polynomial measure. It is a focused,
single-file version of the original multi-file generator.

Original algorithm by Vadim Gorin
Porting to Python by Leonid Petrov

For more information on the underlying theory and Gorin's original work, see:
- Research page: https://www.stat.berkeley.edu/~vadicgor/research.html
- Paper: https://arxiv.org/abs/0905.0679

Usage:
    python python_tilings.py [options]

Example:
    python python_tilings.py --N 40 --T 80 --S 40 --q 0.5 --kappasq 9 -o tiling.png

Tested with Python 3.13, NumPy 2.3, Matplotlib 3.10 on macOS 15.0.
"""

import argparse
import sys
import random
import math
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import Optional, Tuple

__version__ = '1.0.0'


# ############################################################################
# ## Tiling Visualizer
# ############################################################################

class TilingVisualizer:
    """
    Visualizer for hexagonal rhombus tilings.

    Converts particle path data into a hexagonal tiling representation
    using rhombi with different colors for upward and horizontal steps.
    """

    def __init__(self, N: int, T: int, S: int):
        """
        Initializes the visualizer with tiling parameters.

        Args:
            N: Number of particles
            T: Time duration
            S: Height offset parameter
        """
        self.N = N
        self.T = T
        self.S = S

        self.colors = {
            'background': '#FFFFFF',
            'boundary': '#000000',
            'horizontal': '#E57200',  # Orange (for square/horizontal steps)
            'upward': '#232D4B',      # Blue (for up-pointing rhombus/upward steps)
            'horizontal_lozenge': '#F4A460',  # Light orange for horizontal lozenge
            'hexagon': '#DDB0B0'      # Red tint for boundary fill
        }

    def _calculate_hexagon_vertices(self) -> np.ndarray:
        """Calculates the vertices of the overall hexagonal boundary."""
        sqrt3 = math.sqrt(3.0)
        vertices = np.array([
            [0, 0],
            [0, self.N],
            [self.S * 0.5 * sqrt3, self.N + self.S * 0.5],
            [self.T * 0.5 * sqrt3, self.N + (2 * self.S - self.T) * 0.5],
            [self.T * 0.5 * sqrt3, (2 * self.S - self.T) * 0.5],
            [(self.T - self.S) * 0.5 * sqrt3, -(self.T - self.S) * 0.5]
        ])

        # Apply affine transformation: x -> x, y -> y + x/sqrt(3)
        for i in range(len(vertices)):
            vertices[i, 1] += vertices[i, 0] / sqrt3

        return vertices

    def _calculate_rhombus_vertices(self, i: int, j: int, paths: np.ndarray) -> Tuple[np.ndarray, str]:
        """Calculates vertices for a single rhombus."""
        sqrt3 = math.sqrt(3.0)
        vert1_wx = i * 0.5 * sqrt3
        vert1_wy = paths[j, i] - i * 0.5
        vert2_wx = vert1_wx
        vert2_wy = paths[j, i] + 1 - i * 0.5
        vert3_wx = vert1_wx + 0.5 * sqrt3
        vert4_wx = vert2_wx + 0.5 * sqrt3

        if paths[j, i + 1] == paths[j, i]:  # Horizontal step
            vert3_wy = vert2_wy - 0.5
            vert4_wy = vert1_wy - 0.5
            color_type = 'horizontal'
        else:  # Upward step
            vert3_wy = vert2_wy + 0.5
            vert4_wy = vert1_wy + 0.5
            color_type = 'upward'

        vertices = np.array([
            [vert1_wx, vert1_wy], [vert2_wx, vert2_wy],
            [vert3_wx, vert3_wy], [vert4_wx, vert4_wy]
        ])

        # Apply affine transformation: x -> x, y -> y + x/sqrt(3)
        for k in range(len(vertices)):
            vertices[k, 1] += vertices[k, 0] / sqrt3

        return vertices, color_type

    def draw_tiling(self, paths: np.ndarray, filename: Optional[str] = None,
                    figsize: Tuple[float, float] = (12, 10), dpi: int = 150,
                    show_boundary: bool = True, draw_barcode: bool = False):
        """Draws the complete hexagonal tiling."""
        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        ax.set_aspect('equal')
        ax.set_facecolor(self.colors['background'])

        # Disable anti-aliasing for the entire axes
        ax.set_rasterized(True)

        # Draw rhombi
        for i in range(self.T):
            for j in range(self.N):
                vertices, color_type = self._calculate_rhombus_vertices(i, j, paths)
                rhombus = patches.Polygon(
                    vertices,
                    closed=True,
                    facecolor=self.colors[color_type],
                    edgecolor=self.colors[color_type],
                    linewidth=0.1,
                    antialiased=False  # Disable anti-aliasing
                )
                ax.add_patch(rhombus)

        # Draw barcode line (middle path)
        if draw_barcode:
            sqrt3 = math.sqrt(3.0)
            middle_idx = self.N // 2
            barcode_x = []
            barcode_y = []
            
            for i in range(self.T + 1):
                x = i * 0.5 * sqrt3
                y = paths[middle_idx, i] - i * 0.5
                # Apply affine transformation
                y += x / sqrt3
                barcode_x.append(x)
                barcode_y.append(y)
            
            # Draw the barcode line with a distinctive style
            ax.plot(barcode_x, barcode_y, color='#000000', linewidth=5, 
                   linestyle='-', zorder=10, label='Barcode process')

        # Draw boundary
        if show_boundary:
            hex_vertices = self._calculate_hexagon_vertices()
            ax.add_patch(patches.Polygon(
                hex_vertices, closed=True,
                facecolor='none', edgecolor=self.colors['boundary'], linewidth=2
            ))

        # Clean up and display/save
        ax.autoscale_view()
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)
        plt.tight_layout()

        if filename:
            plt.savefig(filename, dpi=dpi, bbox_inches='tight', facecolor=self.colors['background'])
            return None
        return fig


# ############################################################################
# ## Tiling Generator
# ############################################################################

class TilingGenerator:
    """
    Generates random tilings using the imaginary q-Racah measure.
    """
    def __init__(self, N: int = 40, T: int = 80, S: int = 0,
                 q: float = 0.5, kappasq: float = 9.0):
        self.N = N
        self.T = T
        self.S = S
        self.q_user = q
        self.kappasq = kappasq
        self._validate_parameters()

        self.q = self.q_user
        self.paths = self._init_paths()

    def _validate_parameters(self) -> None:
        if not (self.N > 0 and self.T > 0):
            raise ValueError("N and T must be positive integers.")
        if not (0 <= self.S <= self.T):
            raise ValueError("S must be between 0 and T.")
        if self.q_user <= 0 or self.q_user > 1:
            raise ValueError("Parameter q must be in the range (0, 1].")
        if self.kappasq < 0:
            print("Warning: Imaginary q-Racah model typically uses (-kappa^2) >= 0.")

    def _init_paths(self) -> np.ndarray:
        """Initializes paths for a given S value."""
        paths = np.zeros((self.N, self.T + 1), dtype=int)
        for j in range(self.N):
            for i in range(self.T - self.S + 1):
                paths[j, i] = j
            for i in range(self.T - self.S + 1, self.T + 1):
                paths[j, i] = j + (i - (self.T - self.S))
        return paths

    def get_paths(self) -> np.ndarray:
        return self.paths.copy()

    def _get_s_plus_term(self, x: float, tc: int) -> float:
        """Calculates a single probability ratio term for the S->S+1 operator.

        See Borodin-Gorin (2009), arXiv:0905.0679 for theoretical background.
        """
        if self.q < 1:
            term = self.q * (1 - self.q**(self.T - tc - self.S + x)) / (1 - self.q**(x + 1))
        else: # q > 1
            term = (1 - self.q**(-(self.T - tc - self.S + x))) / (1 - self.q**(-x - 1))
            if self.kappasq == 0:
                 term *= self.q**(self.T - tc - self.S)

        if self.kappasq != 0:
            # First kappa-dependent factor
            if (-x + self.T - 1) > 0:
                num = (1 + self.kappasq * self.q**(-x + self.S + tc))
                den = (1 + self.kappasq * self.q**(-x + self.T - 1))
            else:
                num = (self.q**(x - self.T + 1) + self.kappasq * self.q**(self.S + tc - self.T + 1))
                den = (self.q**(x - self.T + 1) + self.kappasq)
            term *= num / den if abs(den) > 1e-100 else float('inf')

            # Second kappa-dependent factor
            if (-2 * x + tc + self.S - 2) > 0:
                num = (1 + self.kappasq * self.q**(-2 * x + tc + self.S - 2))
                den = (1 + self.kappasq * self.q**(-2 * x + tc + self.S))
            else:
                num = (self.q**(2 * x - tc - self.S + 2) + self.kappasq)
                den = (self.q**(2 * x - tc - self.S + 2) + self.kappasq * self.q * self.q)
            term *= num / den if abs(den) > 1e-100 else float('inf')

        return term

    def _calculate_probabilities(self, k: int, j: int, tc: int, paths: np.ndarray) -> np.ndarray:
        """Calculates probabilities for a group of interacting particles."""
        group_size = j - k + 2
        p = np.zeros(group_size)

        try:
            # Determine stable recurrence direction for S+ operator
            if (self.T - tc - self.S) < 1:
                # Forward recurrence (stable from left)
                p[0] = 1.0
                for i in range(1, group_size):
                    x = float(paths[k + i - 1, tc])
                    p[i] = p[i - 1] * self._get_s_plus_term(x, tc)
            elif self.q > 1:
                # Backward recurrence (stable from right)
                p[group_size - 1] = 1.0
                for i in range(group_size - 2, -1, -1):
                    x = float(paths[k + i, tc])
                    term = self._get_s_plus_term(x, tc)
                    p[i] = p[i + 1] / term if abs(term) > 1e-12 else p[i + 1] * 1e12
            else: # q < 1
                # Recurrence from a stable middle point
                i0 = j + 1 # For q-Racah, start from the right
                start_idx = i0 - k
                if not (0 <= start_idx < group_size):
                    start_idx = group_size - 1

                p[start_idx] = 1.0
                # Recurse left
                for i in range(start_idx - 1, -1, -1):
                    x = float(paths[k + i, tc])
                    term = self._get_s_plus_term(x, tc)
                    p[i] = p[i + 1] / term if abs(term) > 1e-12 else p[i + 1] * 1e12
                # Recurse right (should not happen with i0=j+1)
                for i in range(start_idx + 1, group_size):
                    x = float(paths[k + i - 1, tc])
                    p[i] = p[i - 1] * self._get_s_plus_term(x, tc)

            if not np.all(np.isfinite(p)) or np.any(p < 0):
                return np.ones(group_size)
            return p
        except (ValueError, ZeroDivisionError, OverflowError):
            return np.ones(group_size)

    def s_plus_operator(self) -> None:
        """Applies the S->S+1 forward evolution operator to self.paths."""
        if self.S >= self.T: return

        paths_in = self.paths
        paths_out = np.zeros_like(paths_in)
        paths_out[:, 0] = paths_in[:, 0]

        for tc in range(1, self.T + 1):
            k = 0
            while k < self.N:
                if paths_in[k, tc] == paths_out[k, tc - 1] + 1:
                    paths_out[k, tc] = paths_in[k, tc]
                    k += 1
                elif paths_in[k, tc] == paths_out[k, tc - 1] - 1:
                    paths_out[k, tc] = paths_out[k, tc - 1]
                    k += 1
                else: # Interaction group
                    j = k
                    while (j < self.N - 1 and
                           paths_out[j + 1, tc - 1] == paths_in[j + 1, tc] and
                           paths_out[j + 1, tc - 1] == paths_out[j, tc - 1] + 1):
                        j += 1

                    probs = self._calculate_probabilities(k, j, tc, paths_in)

                    # Choose a split point based on calculated probabilities
                    prob_sum = np.sum(probs)
                    if prob_sum > 1e-100:
                        normalized_probs = np.maximum(probs, 0)
                        norm_sum = np.sum(normalized_probs)
                        if norm_sum > 1e-100:
                            normalized_probs /= norm_sum
                            split_idx = np.random.choice(len(probs), p=normalized_probs)
                        else:
                            split_idx = np.random.randint(0, len(probs))
                    else:
                        split_idx = np.random.randint(0, len(probs))

                    # Apply the split
                    for l_idx in range(k, k + split_idx):
                        if l_idx <= j: paths_out[l_idx, tc] = paths_in[l_idx, tc]
                    for l_idx in range(k + split_idx, j + 1):
                        paths_out[l_idx, tc] = paths_in[l_idx, tc] + 1

                    k = j + 1

        self.paths = paths_out
        self.S += 1

    def apply_s_plus(self, num_steps: int = 1, verbose: bool = False):
        """Applies the S+ operator a specified number of times."""
        for step in range(num_steps):
            if self.S < self.T:
                if verbose:
                    print(f"Applying S->S+1 step {step+1}/{num_steps}: S={self.S} -> S={self.S+1}")
                self.s_plus_operator()


# ############################################################################
# ## Path Analysis
# ############################################################################

def extract_middle_path_steps(paths: np.ndarray, N: int, T: int) -> str:
    """
    Extract the up/down steps sequence from the middle path (N//2-th path).

    Args:
        paths: Path array from TilingGenerator
        N: Number of particles
        T: Time duration

    Returns:
        String in format "{1,0,0,1,...}" where 1=up, 0=down
    """
    middle_idx = N // 2
    middle_path = paths[middle_idx, :]

    steps = []
    for t in range(T):
        # Compare height at time t+1 vs time t
        if middle_path[t + 1] > middle_path[t]:
            steps.append(0)  # up step (swapped)
        else:
            steps.append(1)  # down step (swapped)

    # Format as requested: {1,0,0,1,...}
    steps_str = "{" + ",".join(map(str, steps)) + "}"
    return steps_str


# ############################################################################
# ## Main Execution
# ############################################################################

def main():
    parser = argparse.ArgumentParser(
        description="Generate random hexagonal tilings using the imaginary q-Racah model.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
This script simulates non-intersecting paths (particles) whose configuration
is governed by the imaginary q-Racah orthogonal polynomial measure. The final
arrangement of paths is visualized as a rhombus tiling of a hexagon.

Original algorithm by Vadim Gorin. Porting to Python by Leonid Petrov.

For more information:
- Research: https://www.stat.berkeley.edu/~vadicgor/research.html
- Paper: https://arxiv.org/abs/0905.0679
"""
    )

    # Version info
    parser.add_argument('--version', action='version', version=f'%(prog)s {__version__}')

    # Core parameters
    parser.add_argument('--N', type=int, default=40, help='Number of particles (default: 40)')
    parser.add_argument('--T', type=int, default=80, help='Time duration (default: 80)')
    parser.add_argument('--S', type=int, default=40, help='Target S value (evolution steps, default: 40)')
    parser.add_argument('--q', type=float, default=0.5, help='Weight parameter (must be in range (0,1], default: 0.5)')
    parser.add_argument('--kappasq', type=float, default=9.0, help='Deformation parameter (-kappa^2) (default: 9.0)')

    # Output options
    parser.add_argument('--output', '-o', type=str, default=None, help='Output image filename')
    parser.add_argument('--no-boundary', action='store_true', help='Hide the outer hexagonal boundary')
    parser.add_argument('--no-draw', action='store_true', help='Skip visualization (only generate paths)')
    parser.add_argument('--draw-barcode', action='store_true', dest='draw_barcode', help='Draw the barcode process line (middle path) on the tiling')


    # Other options
    parser.add_argument('--seed', type=int, help='Random seed for reproducible results')
    parser.add_argument('--figsize', type=str, default='12,10', help="Figure size 'width,height' (default: 12,10)")
    parser.add_argument('--dpi', type=int, default=150, help='Image resolution in DPI (default: 150)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')
    parser.add_argument('--path-output', type=str, help='Also save path sequence(s) to file (paths always print to stdout)')
    parser.add_argument('--batch', type=int, help='Batch mode: generate N path sequences (auto enables --no-draw, outputs {{...},{...},...})')

    args = parser.parse_args()

    # Handle batch mode settings
    if args.batch:
        args.no_draw = True  # Automatically disable drawing in batch mode

    # Set random seed
    if args.seed is not None:
        random.seed(args.seed)
        np.random.seed(args.seed)
        if args.verbose:
            print(f"Random seed set to {args.seed}")

    # Parse figure size
    try:
        figsize = tuple(map(float, args.figsize.split(',')))
        if len(figsize) != 2: raise ValueError
    except ValueError:
        print("Error: --figsize must be in the format 'width,height'")
        sys.exit(1)

    # Generate default filename if not specified
    if args.output is None and not args.no_draw:
        args.output = f"q_racah_tiling_T{args.T}_S{args.S}_N{args.N}_q{args.q}_kappasq{args.kappasq}.png"
    
    if args.verbose:
        if args.batch:
            print(f"Generating {args.batch} tilings with imaginary q-Racah model:")
        else:
            print("Generating tiling with imaginary q-Racah model:")
        print(f"  N={args.N}, T={args.T}, Target S={args.S}")
        print(f"  q={args.q}, (-kappa^2)={args.kappasq}")
        if not args.no_draw:
            print(f"  Output: {args.output}")

    # Batch mode implementation
    if args.batch:
        all_sequences = []
        
        # Progress bar setup for batch mode
        bar_width = 50
        total_steps = args.batch * max(args.S, 1)  # Total operations including S steps
        current_step = 0
        
        for i in range(args.batch):
            # Create generator for each iteration
            try:
                generator = TilingGenerator(
                    N=args.N, T=args.T, S=0,
                    q=args.q, kappasq=args.kappasq
                )
            except Exception as e:
                print(f"\nError creating generator: {e}", file=sys.stderr)
                sys.exit(1)

            # Apply S->S+1 evolution with progress updates
            if args.S > 0:
                for s_step in range(args.S):
                    # Update progress bar
                    current_step += 1
                    if sys.stderr.isatty():  # Only show progress bar if stderr is a terminal
                        progress = current_step / total_steps
                        filled = int(bar_width * progress)
                        bar = '█' * filled + '░' * (bar_width - filled)
                        percent = int(100 * progress)
                        print(f'\r[{bar}] {percent}% (batch {i+1}/{args.batch}, S {s_step+1}/{args.S})', end='', file=sys.stderr)
                        sys.stderr.flush()
                    
                    # Apply one S step
                    generator.s_plus_operator()
            else:
                # If S=0, still update progress for batch
                current_step += 1
                if sys.stderr.isatty():
                    progress = current_step / total_steps
                    filled = int(bar_width * progress)
                    bar = '█' * filled + '░' * (bar_width - filled)
                    percent = int(100 * progress)
                    print(f'\r[{bar}] {percent}% (batch {i+1}/{args.batch})', end='', file=sys.stderr)
                    sys.stderr.flush()

            # Extract middle path
            paths = generator.get_paths()
            path_sequence = extract_middle_path_steps(paths, args.N, args.T)
            all_sequences.append(path_sequence)
        
        # Clear progress bar line
        if sys.stderr.isatty():
            print(file=sys.stderr)  # New line after progress bar
        
        # Output all sequences in Mathematica format
        mathematica_output = "barcode:=" + "{" + ",".join(all_sequences) + "}"
        print(mathematica_output)  # Always output to stdout
        
        # Also write to file if requested
        if args.path_output:
            try:
                with open(args.path_output, 'w') as f:
                    f.write(mathematica_output + '\n')
                if args.verbose:
                    print(f"Batch sequences also saved to {args.path_output}", file=sys.stderr)
            except Exception as e:
                print(f"Error saving batch sequences to file: {e}", file=sys.stderr)
                sys.exit(1)
    
    else:
        # Single generation mode (original code)
        try:
            generator = TilingGenerator(
                N=args.N, T=args.T, S=0,
                q=args.q, kappasq=args.kappasq
            )
        except Exception as e:
            print(f"Error creating generator: {e}")
            sys.exit(1)

        # Apply S->S+1 evolution to reach the target S state
        if args.S > 0:
            if args.verbose:
                print(f"Applying {args.S} steps of S->S+1 evolution...")
            generator.apply_s_plus(num_steps=args.S, verbose=args.verbose)
            if args.verbose:
                print(f"Evolution complete. Final S = {generator.S}")

        # Create visualization
        paths = generator.get_paths()
        
        if not args.no_draw:
            try:
                visualizer = TilingVisualizer(args.N, args.T, generator.S)

                visualizer.draw_tiling(
                    paths,
                    filename=args.output,
                    figsize=figsize,
                    dpi=args.dpi,
                    show_boundary=not args.no_boundary,
                    draw_barcode=args.draw_barcode
                )
                if args.verbose:
                    print(f"Hexagonal tiling saved to {args.output}")

            except Exception as e:
                print(f"Error creating visualization: {e}")
                sys.exit(1)
        else:
            if args.verbose:
                print("Skipping visualization (--no-draw option used)")

        # Always output middle path sequence
        path_sequence = extract_middle_path_steps(paths, args.N, args.T)
        print(path_sequence)  # Always output to stdout
        
        # Also write to file if requested
        if args.path_output:
            try:
                with open(args.path_output, 'w') as f:
                    f.write(path_sequence + '\n')
                if args.verbose:
                    print(f"Middle path sequence also saved to {args.path_output}", file=sys.stderr)
            except Exception as e:
                print(f"Error saving path sequence to file: {e}", file=sys.stderr)
                sys.exit(1)

    if args.verbose:
        print("Generation completed successfully! ✨")


if __name__ == "__main__":
    main()
