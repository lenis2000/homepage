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
    Draw the domino tiling *and* label every lattice vertex with a stub
    height‑function value (currently 0).  All vertices, including the
    “mid‑edge” ones on border dominoes, are now covered.
    """
    size = len(x0)

    fig, ax = plt.subplots(figsize=(10, 10))

    vertices = set()          # ← will hold *every* lattice vertex

    for i in range(size):
        for j in range(size):
            if x0[i][j] != 1:
                continue

            # Domino type → colour, width, height, lower‑left corner
            if (i & 1) and (j & 1):            # green horizontal
                colour, w, h = "green", 4, 2
                x = j - i - 2
                y = size + 1 - (i + j) - 1
            elif (i & 1) and not (j & 1):      # blue vertical
                colour, w, h = "blue", 2, 4
                x = j - i - 1
                y = size + 1 - (i + j) - 2
            elif not (i & 1) and not (j & 1):  # red horizontal
                colour, w, h = "red", 4, 2
                x = j - i - 2
                y = size + 1 - (i + j) - 1
            else:                              # yellow vertical
                colour, w, h = "yellow", 2, 4
                x = j - i - 1
                y = size + 1 - (i + j) - 2

            # Draw the domino
            ax.add_patch(
                patches.Rectangle((x, y), w, h, linewidth=0,
                                  edgecolor=None, facecolor=colour)
            )

            # Register *all* lattice vertices touched by this domino:
            # grid spacing is 2, so step through 0,2,…,w (or h)
            for dx in range(0, w + 1, 2):
                for dy in range(0, h + 1, 2):
                    vertices.add((x + dx, y + dy))

    # Label every vertex with a stub 0
    for vx, vy in vertices:
        ax.text(vx, vy, "0", ha="center", va="center",
                fontsize=26, color="black", zorder=5)

    # Aesthetics --------------------------------------------------------------
    ax.set_xlim(-size, size)
    ax.set_ylim(-size + 2, size + 2)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    plt.title(f"Aztec Diamond (n={n}) – vertex height stub (0 everywhere)")
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


n = 4
A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        row.append(1)
    A1a.append(row)


A2a = aztecgen(probs(A1a))
aztec_printer(A2a, n)
