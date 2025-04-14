###
# SVG to TikZ Converter for Domino Tilings and Nonintersecting Paths
#
# USAGE:
# 1. Generate an SVG file containing domino tilings (rectangles) and/or
#    nonintersecting paths (lines) using the webpage
#    at https://lpetrov.cc/simulations/2025-02-02-aztec-uniform/
#    or https://lpetrov.cc/simulations/2025-02-03-aztec-periodic/
# 2. Copy the generated SVG content to a file named 'tiling_SVG.txt'
# 3. Run this script to convert the SVG to TikZ code
#
# The script will process both domino tilings (represented as rectangles)
# and nonintersecting paths (represented as lines) from the SVG.
###

import re
import sys

def svg_to_tikz(svg_content):
    # Extract rectangles
    rectangles = []
    rect_pattern = r'<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)" stroke="([^"]+)" stroke-width="([^"]+)"></rect>'
    for match in re.finditer(rect_pattern, svg_content):
        x, y, width, height, fill, stroke, stroke_width = match.groups()
        rectangles.append({
            'x': float(x) / 10,
            'y': float(y) / 10,
            'width': float(width) / 10,
            'height': float(height) / 10,
            'fill': fill,
            'stroke': stroke,
            'stroke_width': float(stroke_width) / 10
        })

    # Extract lines
    lines = []
    line_pattern = r'<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="([^"]+)" stroke-width="([^"]+)"></line>'
    for match in re.finditer(line_pattern, svg_content):
        x1, y1, x2, y2, stroke, stroke_width = match.groups()
        lines.append({
            'x1': float(x1) / 10,
            'y1': float(y1) / 10,
            'x2': float(x2) / 10,
            'y2': float(y2) / 10,
            'stroke': stroke,
            'stroke_width': float(stroke_width) / 10
        })

    if not rectangles and not lines:
        print("Warning: No rectangles or lines found in the SVG content")
        return ""

    # Find the bounds of the drawing
    min_x = min(min(rect['x'] for rect in rectangles) if rectangles else float('inf'),
                min(min(line['x1'], line['x2']) for line in lines) if lines else float('inf'))
    max_x = max(max(rect['x'] + rect['width'] for rect in rectangles) if rectangles else float('-inf'),
                max(max(line['x1'], line['x2']) for line in lines) if lines else float('-inf'))
    min_y = min(min(rect['y'] for rect in rectangles) if rectangles else float('inf'),
                min(min(line['y1'], line['y2']) for line in lines) if lines else float('inf'))
    max_y = max(max(rect['y'] + rect['height'] for rect in rectangles) if rectangles else float('-inf'),
                max(max(line['y1'], line['y2']) for line in lines) if lines else float('-inf'))

    # Calculate a good scale factor
    width = max_x - min_x
    height = max_y - min_y
    max_dimension = max(width, height)
    scale_factor = 15.0 / max_dimension  # Adjust as needed for desired size

    # Generate TikZ code
    tikz_code = r"""
\documentclass{standalone}
\usepackage{tikz}
\usepackage{xcolor}

% Define colors to match SVG
\definecolor{svggreen}{RGB}{0, 128, 0}
\definecolor{svgred}{RGB}{255, 0, 0}
\definecolor{svgyellow}{RGB}{255, 255, 0}
\definecolor{svgblue}{RGB}{0, 0, 255}

\begin{document}
\begin{tikzpicture}[scale=""" + f"{scale_factor:.6f}" + r"""]  % Calculated scale

% Dominoes (rectangles)
"""

    # Add rectangles to TikZ code
    for rect in rectangles:
        # Map SVG colors to TikZ colors
        fill_color = rect['fill']
        if fill_color == 'green':
            fill_color = 'svggreen'
        elif fill_color == 'red':
            fill_color = 'svgred'
        elif fill_color == 'yellow':
            fill_color = 'svgyellow'
        elif fill_color == 'blue':
            fill_color = 'svgblue'

        # Shift coordinates to keep everything positive
        x1 = rect['x'] - min_x
        y1 = max_y - rect['y'] - rect['height']  # Invert y and adjust for height
        x2 = rect['x'] - min_x + rect['width']
        y2 = max_y - rect['y']

        tikz_code += f"\\filldraw[fill={fill_color}, draw=black, line width={rect['stroke_width']}pt] "
        tikz_code += f"({x1:.2f}, {y1:.2f}) rectangle ({x2:.2f}, {y2:.2f});\n"

    tikz_code += "\n% Paths (lines)\n"

    # Add lines to TikZ code
    for line in lines:
        # Shift and invert coordinates
        x1 = line['x1'] - min_x
        y1 = max_y - line['y1']
        x2 = line['x2'] - min_x
        y2 = max_y - line['y2']

        tikz_code += f"\\draw[black, line width={line['stroke_width']}pt] ({x1:.2f}, {y1:.2f}) -- ({x2:.2f}, {y2:.2f});\n"

    tikz_code += r"""
\end{tikzpicture}
\end{document}
"""

    return tikz_code

# Read the SVG content from the file
with open('tiling_SVG.txt', 'r') as f:
    svg_content = f.read()

# Convert to TikZ
tikz_code = svg_to_tikz(svg_content)

# Save the TikZ code to a file
with open('dominoes.tex', 'w') as f:
    f.write(tikz_code)

print("Conversion complete! TikZ code saved to 'dominoes.tex'")
