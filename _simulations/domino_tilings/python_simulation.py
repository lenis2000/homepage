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

def aztec_printer(x0, n):
    size = len(x0)

    # Create Mathematica output - print to stdout
    print("Graphics[{")

    for i in range(size):
        for j in range(size):
            if x0[i][j] == 1:
                if i % 2 == 1 and j % 2 == 1:  # Green
                    color = "Green"
                    rect = f"Rectangle[{{{j - i - 2}, {size + 1 - (i + j) - 1}}}, {{{j - i - 2 + 4}, {size + 1 - (i + j) - 1 + 2}}}]"
                elif i % 2 == 1 and j % 2 == 0:  # Blue
                    color = "Blue"
                    rect = f"Rectangle[{{{j - i - 1}, {size + 1 - (i + j) - 2}}}, {{{j - i - 1 + 2}, {size + 1 - (i + j) - 2 + 4}}}]"
                elif i % 2 == 0 and j % 2 == 0:  # Red
                    color = "Red"
                    rect = f"Rectangle[{{{j - i - 2}, {size + 1 - (i + j) - 1}}}, {{{j - i - 2 + 4}, {size + 1 - (i + j) - 1 + 2}}}]"
                elif i % 2 == 0 and j % 2 == 1:  # Yellow
                    color = "Yellow"
                    rect = f"Rectangle[{{{j - i - 1}, {size + 1 - (i + j) - 2}}}, {{{j - i - 1 + 2}, {size + 1 - (i + j) - 2 + 4}}}]"

                print(f"{{EdgeForm[None], {color}, {rect}}},")

    # Close the Graphics list
    print("},ImageSize->800]")

def aztec_printer3d(x0, n):
    size = len(x0)

    # Create Mathematica output - print to stdout
    print("Graphics3D[{")

    h = 0  # Base height

    for i in range(size):
        for j in range(size):
            if x0[i][j] == 1:
                x_coord = j - i
                y_coord = size + 1 - (i + j)

                if i % 2 == 1 and j % 2 == 1:  # Green (horizontal)
                    color = "Green"
                    # Define vertices of the 3D surface with the specified heights
                    points = [
                        f"{{{x_coord-2}, {y_coord+1}, {h+1}}}",  # top-left
                        f"{{{x_coord+2}, {y_coord+1}, {h+1}}}",  # top-right
                        f"{{{x_coord+2}, {y_coord-1}, {h+2}}}",  # bottom-right
                        f"{{{x_coord-2}, {y_coord-1}, {h+2}}}",  # bottom-left
                        f"{{{x_coord}, {y_coord+1}, {h}}}",      # top-middle
                        f"{{{x_coord}, {y_coord-1}, {h+3}}}"     # bottom-middle
                    ]
# !!! HERE IS GOOD
                elif i % 2 == 1 and j % 2 == 0:  # Blue (horizontal)
                    color = "Blue"
                    # Define vertices of the 3D surface with the specified heights
                    points = [
                        f"{{{x_coord-1}, {y_coord-2}, {h-1}}}",  # top-left
                        f"{{{x_coord+1}, {y_coord-2}, {h-1}}}",  # top-right
                        f"{{{x_coord+1}, {y_coord+2}, {h-2}}}",  # bottom-right
                        f"{{{x_coord-1}, {y_coord+2}, {h-2}}}",  # bottom-left
                        f"{{{x_coord}, {y_coord-2}, {h}}}",      # top-middle
                        f"{{{x_coord}, {y_coord+2}, {h-3}}}"     # bottom-middle
                    ]

                elif i % 2 == 0 and j % 2 == 0:  # Red (vertical)
                    color = "Red"
                    # Define vertices of the 3D surface with the specified heights
                    points = [
                        f"{{{x_coord-2}, {y_coord-1}, {h+2}}}",  # top-left
                        f"{{{x_coord}, {y_coord-1}, {h+1}}}",    # top-right
                        f"{{{x_coord}, {y_coord+1}, {h+2}}}",    # bottom-right
                        f"{{{x_coord-2}, {y_coord+1}, {h+3}}}",  # bottom-left
                        f"{{{x_coord-2}, {y_coord}, {h+2}}}",    # middle-left
                        f"{{{x_coord}, {y_coord}, {h}}}"         # middle-right
                    ]

                elif i % 2 == 0 and j % 2 == 1:  # Yellow (vertical)
                    color = "Yellow"
                    # Define vertices of the 3D surface with the specified heights
                    points = [
                        f"{{{x_coord-1}, {y_coord-2}, {h-2}}}",  # top-left
                        f"{{{x_coord+1}, {y_coord-2}, {h-1}}}",  # top-right
                        f"{{{x_coord+1}, {y_coord}, {h-2}}}",    # bottom-right
                        f"{{{x_coord-1}, {y_coord}, {h-3}}}",    # bottom-left
                        f"{{{x_coord-1}, {y_coord+2}, {h-2}}}",  # far-bottom-left
                        f"{{{x_coord+1}, {y_coord+2}, {h-1}}}"   # far-bottom-right
                    ]

                # Create a 3D surface using the points
                print(f"{{EdgeForm[Black], {color}, Polygon[{{{points[0]}, {points[1]}, {points[2]}, {points[3]}}}]}},")
                print(f"{{EdgeForm[Black], {color}, Polygon[{{{points[0]}, {points[4]}, {points[1]}}}]}},")
                print(f"{{EdgeForm[Black], {color}, Polygon[{{{points[3]}, {points[5]}, {points[2]}}}]}},")

    # Close the Graphics3D list
    print("},Boxed->False,ImageSize->800]")



n = 4
A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        row.append(1)
    A1a.append(row)


A2a = aztecgen(probs(A1a))
aztec_printer3d(A2a, n)
