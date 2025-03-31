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

def pretty2(m, filename):
    f = open(filename, "w")
    for i in range(len(m)):
        for j in range(len(m)):
            f.write(""+str(m[i][j])+"     ")
        f.write("\n")

def compute_height_function(domino_grid):
    size = len(domino_grid)

    # Height function is defined on vertices, so it's one larger in each dimension
    height = [[None for _ in range(size + 1)] for _ in range(size + 1)]

    # Set a reference height (e.g., top-left corner to 0)
    height[0][0] = 0

    # Use BFS to propagate heights across the grid
    from collections import deque
    queue = deque([(0, 0)])
    visited = set([(0, 0)])

    while queue:
        i, j = queue.popleft()

        # Propagate to the right
        if j + 1 <= size and (i, j + 1) not in visited:
            # Check if we're crossing a domino
            if i < size and j < size and domino_grid[i][j] == 1:
                # Determine the type of domino and apply the appropriate height change
                if i % 2 == 0 and j % 2 == 0:  # BLUE (horizontal)
                    height_change = -1
                elif i % 2 == 1 and j % 2 == 1:  # GREEN (horizontal)
                    height_change = 1
                elif i % 2 == 0 and j % 2 == 1:  # RED (vertical)
                    height_change = 1
                elif i % 2 == 1 and j % 2 == 0:  # YELLOW (vertical)
                    height_change = -1
            else:
                # No domino, so no height change
                height_change = 0

            height[i][j + 1] = height[i][j] + height_change
            queue.append((i, j + 1))
            visited.add((i, j + 1))

        # Propagate downward
        if i + 1 <= size and (i + 1, j) not in visited:
            # Check if we're crossing a domino
            if i < size and j < size and domino_grid[i][j] == 1:
                # Determine the type of domino and apply the appropriate height change
                if i % 2 == 0 and j % 2 == 0:  # BLUE (horizontal)
                    height_change = -1
                elif i % 2 == 1 and j % 2 == 1:  # GREEN (horizontal)
                    height_change = 1
                elif i % 2 == 0 and j % 2 == 1:  # RED (vertical)
                    height_change = -1
                elif i % 2 == 1 and j % 2 == 0:  # YELLOW (vertical)
                    height_change = 1
            else:
                # No domino, so no height change
                height_change = 0

            height[i + 1][j] = height[i][j] + height_change
            queue.append((i + 1, j))
            visited.add((i + 1, j))

    return height

def aztec_printer(x0, n):
    size = len(x0)

    # Create Mathematica output - print to stdout
    print("Graphics[{")

    # Track the number of dominoes processed
    domino_count = 0
    total_dominoes = sum(row.count(1) for row in x0)

    for i in range(size):
        for j in range(size):
            if x0[i][j] == 1:
                domino_count += 1
                if i % 2 == 1 and j % 2 == 1:
                    color = "Green"
                    rect = f"Rectangle[{{{j - i - 2}, {size + 1 - (i + j) - 1}}}, {{{j - i - 2 + 4}, {size + 1 - (i + j) - 1 + 2}}}]"
                elif i % 2 == 1 and j % 2 == 0:
                    color = "Yellow"
                    rect = f"Rectangle[{{{j - i - 1}, {size + 1 - (i + j) - 2}}}, {{{j - i - 1 + 2}, {size + 1 - (i + j) - 2 + 4}}}]"
                elif i % 2 == 0 and j % 2 == 0:
                    color = "Blue"
                    rect = f"Rectangle[{{{j - i - 2}, {size + 1 - (i + j) - 1}}}, {{{j - i - 2 + 4}, {size + 1 - (i + j) - 1 + 2}}}]"
                elif i % 2 == 0 and j % 2 == 1:
                    color = "Red"
                    rect = f"Rectangle[{{{j - i - 1}, {size + 1 - (i + j) - 2}}}, {{{j - i - 1 + 2}, {size + 1 - (i + j) - 2 + 4}}}]"

                if domino_count == total_dominoes:
                    print(f"{{EdgeForm[None], {color}, {rect}}}", end="")
                else:
                    print(f"{{EdgeForm[None], {color}, {rect}}},", end="")

    # Close the Graphics list
    print("},ImageSize->1000]")
    print("\n")

# def plot_3d_height_function(height):
#     size = len(height) - 1

#     # Print the Mathematica code for the 3D plot
#     print("ListPlot3D[{", end="")

#     # Print the height values at each vertex
#     for i in range(size + 1):
#         for j in range(size + 1):
#             if height[i][j] is not None:
#                 x = j - i - 1
#                 y = size + 1 - (i + j) - 1
#                 z = height[i][j]
#                 # Check if this is the last valid point to avoid trailing comma
#                 if i == size and j == size:
#                     print(f"{{{x}, {y}, {z}}}", end="")
#                 else:
#                     print(f"{{{x}, {y}, {z}}},", end="")

#     # Close the list
#     print("}]")


n = 4
A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        row.append(1)
    A1a.append(row)


A2a = aztecgen(probs(A1a))
aztec_printer(A2a, n)
plot_3d_height_function(A2a)
