import random
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as patches
import datetime
import string


def d3p(x1):
    n = len(x1)
    A = np.zeros((n, n, 2))
    for i in range(n):
        for j in range(n):
            if x1[i][j] == 0.0:
                A[i, j] = [1.0, 1]
            else:
                A[i, j] = [x1[i][j], 0]
    AA = [A]

    for k in range(int(n/2)-1):
        nk = n - 2*k - 2  # Adjusted size for the new matrix
        C = np.zeros((nk, nk, 2))
        for i in range(nk):
            for j in range(nk):
                ii = i+2*(i % 2)
                jj = j+2*(j % 2)
                current = AA[k][ii, jj]
                diag = AA[k][i+1, j+1]
                right = AA[k][ii, j+1]
                down = AA[k][i+1, jj]
                if current[1] + diag[1] == right[1] + down[1]:
                    a2 = current[0]*diag[0] + right[0] * down[0]
                    a2_second = current[1] + diag[1]
                elif current[1] + diag[1] < right[1] + down[1]:
                    a2 = current[0]*diag[0]
                    a2_second = current[1] + diag[1]
                else:
                    a2 = right[0]*down[0]
                    a2_second = right[1] + down[1]
                C[i, j] = [current[0] / a2, current[1] - a2_second]
        AA.append(C)
    return AA

def probs(x1):
    a0 = d3p(x1)
    n = len(a0)
    A = []

    for k in range(n):
        nk = a0[n-k-1].shape[0]
        C = np.zeros((nk//2, nk//2))

        for i in range(nk//2):
            for j in range(nk//2):
                cond_matrix = a0[n-k-1][2*i:2*(i+1), 2*j:2*(j+1), 1]
                val_matrix = a0[n-k-1][2*i:2*(i+1), 2*j:2*(j+1), 0]

                # Apply the conditions
                cond_sum = np.sum(cond_matrix)
                if cond_matrix[0, 0] + cond_matrix[1, 1] > cond_matrix[1, 0] + cond_matrix[0, 1]:
                    C[i, j] = 0
                elif cond_matrix[0, 0] + cond_matrix[1, 1] < cond_matrix[1, 0] + cond_matrix[0, 1]:
                    C[i, j] = 1
                else:
                    C[i, j] = val_matrix[1, 1]*val_matrix[0, 0]/(val_matrix[1, 1]*val_matrix[0, 0] + val_matrix[1, 0]*val_matrix[0, 1])

        A.append(C)

    return A

def probs(x1):
    a0 = d3p(x1)
    n = len(a0)
    A = []
    B = []
    for k in range(n):
        C = []
        for i in range(k+1):
            row = []
            for j in range(k+1):
                if a0[n-k-1][2*i][2*j][1]+a0[n-k-1][2*i+1][2*j+1][1] > a0[n-k-1][2*i+1][2*j][1]+a0[n-k-1][2*i][2*j+1][1]:
                    row.append(0)
                elif a0[n-k-1][2*i][2*j][1]+a0[n-k-1][2*i+1][2*j+1][1] < a0[n-k-1][2*i+1][2*j][1]+a0[n-k-1][2*i][2*j+1][1]:
                    row.append(1)
                else:
                    row.append(a0[n-k-1][2*i+1][2*j+1][0]*a0[n-k-1][2*i][2*j][0]/(a0[n-k-1][2*i+1][2*j+1]
                                                                                  [0]*a0[n-k-1][2*i][2*j][0]+a0[n-k-1][2*i+1][2*j][0]*a0[n-k-1][2*i][2*j+1][0]))
            C.append(row)
        A.append(C)
    return A

def delslide(x1):
    n = len(x1)
    a0 = []
    for i in range(n+2):
        row = []
        for j in range(n+2):
            if i == 0 or i == n+1 or j == 0 or j == n+1:
                row.append(0)
            else:
                row.append(x1[i-1][j-1])
        a0.append(row)
    for i in range(int(n/2)):
        for j in range(int(n/2)):
            if a0[2*i][2*j] == 1 and a0[2*i+1][2*j+1] == 1:
                a0[2*i][2*j] = 0
                a0[2*i+1][2*j+1] = 0
            elif a0[2*i][2*j+1] == 1 and a0[2*i+1][2*j] == 1:
                a0[2*i+1][2*j] = 0
                a0[2*i][2*j+1] = 0
    for i in range(int(n/2)+1):
        for j in range(int(n/2)+1):
            if a0[2*i+1][2*j+1] == 1:
                a0[2*i][2*j] = 1
                a0[2*i+1][2*j+1] = 0
            elif a0[2*i][2*j] == 1:
                a0[2*i][2*j] = 0
                a0[2*i+1][2*j+1] = 1
            elif a0[2*i+1][2*j] == 1:
                a0[2*i][2*j+1] = 1
                a0[2*i+1][2*j] = 0
            elif a0[2*i][2*j+1] == 1:
                a0[2*i+1][2*j] = 1
                a0[2*i][2*j+1] = 0
    return a0

def create(x0, p):
    n = len(x0)
    for i in range(int(n/2)):
        for j in range(int(n/2)):
            if x0[2*i][2*j] == 0 and x0[2*i+1][2*j] == 0 and x0[2*i][2*j+1] == 0 and x0[2*i+1][2*j+1] == 0:
                if j > 0:
                    a1 = (x0[2*i][2*j-1] == 0) and (x0[2*i+1][2*j-1] == 0)
                else:
                    a1 = True
                if j < n/2-1:
                    a2 = (x0[2*i][2*j+2] == 0) and (x0[2*i+1][2*j+2] == 0)
                else:
                    a2 = True
                if i > 0:
                    a3 = (x0[2*i-1][2*j] == 0) and (x0[2*i-1][2*j+1] == 0)
                else:
                    a3 = True
                if i < n/2-1:
                    a4 = (x0[2*i+2][2*j] == 0) and (x0[2*i+2][2*j+1] == 0)
                else:
                    a4 = True
                if a1 == True and a2 == True and a3 == True and a4 == True:
                    if random.random() < p[i][j]:
                        x0[2*i][2*j] = 1
                        x0[2*i+1][2*j+1] = 1
                    else:
                        x0[2*i+1][2*j] = 1
                        x0[2*i][2*j+1] = 1
    return x0

def aztecgen(x0):
    n = len(x0)
    if random.random() < x0[0][0][0]:
        a1 = [[1, 0], [0, 1]]
    else:
        a1 = [[0, 1], [1, 0]]
    for i in range(n-1):
        a1 = delslide(a1)
        a1 = create(a1, x0[i+1])
    return a1

def aztec_printer(x0, n):
    """
    Draw the domino tiling *and* compute / display the Kenyon height
    function on every lattice vertex.

    `x0` is the occupancy matrix returned by `aztecgen`.
    The height is unique up to an additive constant; we set the
    lexicographically‑smallest vertex to 0.
    """
    # ------------------------------------------------------------------
    # 1.  Build the list of dominoes with orientation & “sign” ---------
    #     sign = +1  →  blue (hor.) or red (vert.)   (“counter‑clockwise”)
    #           −1  →  green (hor.) or yellow (vert.)
    # ------------------------------------------------------------------
    size = len(x0)
    dominoes = []             # (orient, sign, x, y)
                              # orient 0 = horizontal, 1 = vertical
    for i in range(size):
        for j in range(size):
            if x0[i][j] != 1:
                continue
            if (i & 1) == (j & 1):                      # horizontal
                orient = 0
                sign   = -1 if (i & 1) else 1           # green←−1, blue←+1
                x      = j - i - 2                      # bottom‑left corner
                y      = size + 1 - (i + j) - 1
            else:                                       # vertical
                orient = 1
                sign   = -1 if (i & 1) else 1           # yellow←−1, red←+1
                x      = j - i - 1
                y      = size + 1 - (i + j) - 2
            dominoes.append((orient, sign, x, y))

    # ------------------------------------------------------------------
    # 2.  Convert domino list → graph of vertices with prescribed
    #     height differences, then BFS to obtain absolute heights.
    # ------------------------------------------------------------------
    from collections import defaultdict, deque

    adj = defaultdict(list)   # v → [(w, Δh = h_w − h_v), …]

    def add_edge(v1, v2, dh):
        adj[v1].append((v2, dh))
        adj[v2].append((v1, -dh))

    for orient, s, x, y in dominoes:
        if orient == 0:                               # horizontal (w=4,h=2)
            TL, TM, TR = (x, y+2), (x+2, y+2), (x+4, y+2)
            BL, BM, BR = (x, y),   (x+2, y),   (x+4, y)
            add_edge(TL, TM,  s);   add_edge(TM, TR, -s)
            add_edge(BL, BM, -s);   add_edge(BM, BR,  s)
            add_edge(TL, BL, -s);   add_edge(TM, BM, -3*s)
            add_edge(TR, BR, -s)
        else:                                         # vertical   (w=2,h=4)
            TL, TR = (x, y+4), (x+2, y+4)
            ML, MR = (x, y+2), (x+2, y+2)
            BL, BR = (x, y),   (x+2, y)
            add_edge(TL, TR, -s);  add_edge(ML, MR, -3*s); add_edge(BL, BR, -s)
            add_edge(TL, ML,  s);  add_edge(ML, BL,  -s)
            add_edge(TR, MR, -s);  add_edge(MR, BR,   s)

    # Breadth‑first integration of heights
    vertices = list(adj.keys())
    root = min(vertices, key=lambda v: (v[1], v[0]))   # “bottom‑left” vertex
    heights = {root: 0}
    Q = deque([root])
    while Q:
        v = Q.popleft()
        for w, dh in adj[v]:
            if w not in heights:
                heights[w] = heights[v] + dh
                Q.append(w)
            elif heights[w] != heights[v] + dh:
                raise ValueError("Inconsistent height assignment detected")

    # ------------------------------------------------------------------
    # 3.  Plot the dominoes and label every vertex with its height -----
    # ------------------------------------------------------------------
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches

    fig, ax = plt.subplots(figsize=(10, 10))

    colour_map = {  # keyed by (orient, sign)
        (0,  1): "blue",     # horizontal, +1
        (0, -1): "green",    # horizontal, -1
        (1,  1): "red",      # vertical,   +1
        (1, -1): "yellow"    # vertical,   -1
    }

    for orient, s, x, y in dominoes:
        if orient == 0:           # horizontal
            w, h = 4, 2
        else:                     # vertical
            w, h = 2, 4
        ax.add_patch(
            patches.Rectangle((x, y), w, h, linewidth=0,
                              edgecolor=None, facecolor=colour_map[(orient, s)])
        )

    for (vx, vy), h in heights.items():
        ax.text(vx, vy, f"{h}", ha="center", va="center",
                fontsize=6, color="black", zorder=5)

    ax.set_xlim(-size, size)
    ax.set_ylim(-size + 2, size + 2)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    plt.title(f"Aztec Diamond (n={n}) – vertex height function")
    plt.tight_layout()
    plt.show()




def aztec_edge_printer(x0, n):
    import matplotlib.pyplot as plt
    import numpy as np

    size = len(x0)
    fig, ax = plt.subplots(figsize=(10, 10))

    # Draw the Aztec diamond grid vertices and edges
    for i in range(-n, n+1):
        for j in range(-n, n+1):
            if abs(i) + abs(j) <= n+1 and i+j<=n and i-j<n and -j-i<n+1:
                # Draw vertex
                ax.plot(i, j, 'ko', markersize=3)

    # Draw horizontal edges
    for i in range(-n, n+1):
        for j in range(-n, n+1):
            if abs(i) + abs(j) <= n+1 and i+j<=n and i-j<n and -j-i<n+1:
                # Draw horizontal edge to the right
                if abs(i+1) + abs(j) <= n+1 and (i+1)+j<=n and (i+1)-j<n and -j-(i+1)<n+1:
                    ax.plot([i, i+1], [j, j], 'k-', linewidth=0.5, alpha=0.3)

                # Draw vertical edge up
                if abs(i) + abs(j+1) <= n+1 and i+(j+1)<=n and i-(j+1)<n and -(j+1)-i<n+1:
                    ax.plot([i, i], [j, j+1], 'k-', linewidth=0.5, alpha=0.3)

    # Place dimers based on the tiling in x0
    for i in range(size):
        for j in range(size):
            if x0[i][j] == 1:
                # Convert matrix coordinates to Aztec diamond coordinates
                # These mapping calculations align with the vertex grid defined above
                if i % 2 == 1 and j % 2 == 1:  # Green horizontal
                    # Calculate vertex coords of the domino's endpoints
                    x1 = (j - i) // 2 - 1
                    y1 = (size - i - j) // 2
                    x2 = x1 + 1
                    y2 = y1
                    ax.plot([x1, x2], [y1, y2], 'green', linewidth=4)

                elif i % 2 == 1 and j % 2 == 0:  # Blue vertical
                    x1 = (j - i) // 2
                    y1 = (size - i - j) // 2
                    x2 = x1
                    y2 = y1 + 1
                    ax.plot([x1, x2], [y1, y2], 'blue', linewidth=4)

                elif i % 2 == 0 and j % 2 == 0:  # Red horizontal
                    x1 = (j - i) // 2 - 1
                    y1 = (size - i - j) // 2
                    x2 = x1 + 1
                    y2 = y1
                    ax.plot([x1, x2], [y1, y2], 'red', linewidth=4)
                elif i % 2 == 0 and j % 2 == 1:  # Yellow vertical
                    x1 = (j - i) // 2
                    y1 = (size - i - j) // 2
                    x2 = x1
                    y2 = y1 + 1
                    ax.plot([x1, x2], [y1, y2], 'yellow', linewidth=4)
    # Set aspect ratio to be equal and remove axes
    ax.set_aspect('equal')
    ax.set_axis_off()

    # Set plot limits with some padding
    ax.set_xlim(-n-1, n+1)
    ax.set_ylim(-n-1, n+1)

    # Display the plot
    plt.title(f'Aztec Diamond Edge Representation (n={n})')
    plt.tight_layout()
    plt.show()


n = 20
A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        row.append(1)
    A1a.append(row)


A2a = aztecgen(probs(A1a))
aztec_printer(A2a, n)
