import random
import numpy as np
import json


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

def pretty2(m, filename):
    f = open(filename, "w")
    for i in range(len(m)):
        for j in range(len(m)):
            f.write(""+str(m[i][j])+"     ")
        f.write("\n")

def compute_height_function(tiling):
    """
    Compute the height function for a domino tiling.
    The height function is defined on vertices of the grid.
    Starting from h=0 at the origin (0,0), the height changes
    as we move along edges based on the rules shown in the image.
    """
    size = len(tiling)
    heights = np.zeros((size + 1, size + 1), dtype=int)
    visited = np.zeros((size + 1, size + 1), dtype=bool)

    # Start at the bottom-left corner with height 0
    queue = [(0, 0)]
    visited[0, 0] = True

    while queue:
        i, j = queue.pop(0)

        # Check neighbors
        for ni, nj, direction in [(i+1, j, "up"), (i, j+1, "right"), (i-1, j, "down"), (i, j-1, "left")]:
            if 0 <= ni <= size and 0 <= nj <= size and not visited[ni, nj]:
                height_change = 0

                if direction == "right":
                    if (i+j) % 2 == 0:
                        # Default: height increases by 1
                        height_change = 1
                    else:
                        # Default: height decreases by 1
                        height_change = -1

                    # Check if there's a vertical domino crossing this edge
                    if 0 <= i < size and 0 <= j < size:
                        if ((i % 2 == 0 and j % 2 == 1) or (i % 2 == 1 and j % 2 == 0)) and tiling[i][j] == 1:
                            # Crossing a vertical domino edge, invert the height change
                            height_change = -height_change

                elif direction == "up":
                    if (i+j) % 2 == 0:
                        # Default: height decreases by 1
                        height_change = -1
                    else:
                        # Default: height increases by 1
                        height_change = 1

                    # Check if there's a horizontal domino crossing this edge
                    if 0 <= i < size and 0 <= j < size:
                        if ((i % 2 == 0 and j % 2 == 0) or (i % 2 == 1 and j % 2 == 1)) and tiling[i][j] == 1:
                            # Crossing a horizontal domino edge, invert the height change
                            height_change = -height_change

                elif direction == "left":
                    if (i+nj) % 2 == 0:
                        # Default: height increases by 1 (opposite of moving right)
                        height_change = -1
                    else:
                        # Default: height decreases by 1 (opposite of moving right)
                        height_change = 1

                    # Check if there's a vertical domino crossing this edge
                    if 0 <= i < size and 0 <= nj < size:
                        if ((i % 2 == 0 and nj % 2 == 1) or (i % 2 == 1 and nj % 2 == 0)) and tiling[i][nj] == 1:
                            # Crossing a vertical domino edge, invert the height change
                            height_change = -height_change

                elif direction == "down":
                    if (ni+j) % 2 == 0:
                        # Default: height decreases by 1 (opposite of moving up)
                        height_change = 1
                    else:
                        # Default: height increases by 1 (opposite of moving up)
                        height_change = -1

                    # Check if there's a horizontal domino crossing this edge
                    if 0 <= ni < size and 0 <= j < size:
                        if ((ni % 2 == 0 and j % 2 == 0) or (ni % 2 == 1 and j % 2 == 1)) and tiling[ni][j] == 1:
                            # Crossing a horizontal domino edge, invert the height change
                            height_change = -height_change

                heights[ni, nj] = heights[i, j] + height_change
                visited[ni, nj] = True
                queue.append((ni, nj))

    return heights

def aztec_printer_with_height(x0, heights):
    """
    Extended version of aztec_printer that also includes height function values.
    Returns a dictionary with both domino rectangles and height function values.
    """
    size = len(x0)
    result = {"rectangles": [], "heights": []}

    # Visualize dominoes (same as original aztec_printer)
    for i in range(size):
        for j in range(size):
            if x0[i][j] == 1:
                if i % 2 == 1 and j % 2 == 1:  # Green
                    x = j - i - 2
                    y = size + 1 - (i + j) - 1
                    w = 4
                    h = 2
                    color = "green"
                    result["rectangles"].append({"x": x, "y": y, "w": w, "h": h, "color": color})
                elif i % 2 == 1 and j % 2 == 0:  # Blue
                    x = j - i - 1
                    y = size + 1 - (i + j) - 2
                    w = 2
                    h = 4
                    color = "blue"
                    result["rectangles"].append({"x": x, "y": y, "w": w, "h": h, "color": color})
                elif i % 2 == 0 and j % 2 == 0:  # Red
                    x = j - i - 2
                    y = size + 1 - (i + j) - 1
                    w = 4
                    h = 2
                    color = "red"
                    result["rectangles"].append({"x": x, "y": y, "w": w, "h": h, "color": color})
                elif i % 2 == 0 and j % 2 == 1:  # Yellow
                    x = j - i - 1
                    y = size + 1 - (i + j) - 2
                    w = 2
                    h = 4
                    color = "yellow"
                    result["rectangles"].append({"x": x, "y": y, "w": w, "h": h, "color": color})

    # Add height function values at each vertex
    for i in range(size+1):
        for j in range(size+1):
            x = j - i
            y = size + 1 - (i + j)
            result["heights"].append({"x": x, "y": y, "height": int(heights[i][j])})

    return result



n = 12 # ACTUAL_SIM: PARAMETERS

A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        row.append(1)  # Set all edges to 1
    A1a.append(row)

A2a = aztecgen(probs(A1a))
heights = compute_height_function(A2a)
result = aztec_printer_with_height(A2a, heights)
print(json.dumps(result))
