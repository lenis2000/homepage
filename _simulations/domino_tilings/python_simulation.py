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
        print(k)
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
        print(k)
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
        print(k)
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
        print(i)
        a1 = delslide(a1)
        a1 = create(a1, x0[i+1])
    return a1

def pretty2(m, filename):
    f = open(filename, "w")
    for i in range(len(m)):
        for j in range(len(m)):
            f.write(""+str(m[i][j])+"     ")
        f.write("\n")

# def aztec_printer(x0):
#     size = len(x0)
#     fig, ax = plt.subplots(figsize=(10, 10))  # Adjusting figure size for better resolution
#     ax.set_aspect('equal')  # Ensuring equal aspect ratio

#     # After analyzing, there seems no explicit error in the logic for different colors & shapes.
#     # However, enhancement for better visualization can include adjusting shapes' sizes & positions if necessary.
#     # The provided positions and sizes for rectangles appear to be an attempt at a creative layout, rather than a standard grid.
#     # Thus, this interpretation will remain as provided unless a specific adjustment is requested.


#     for i in range(size):
#         for j in range(size):
#             x, y = j - i, size + 1 - (i + j)
#             if x0[i][j] == 1:
#                 if i % 2 == 1 and j % 2 == 1:  # Green
#                     color = 'green'
#                     rect = patches.Rectangle((x-2, y-2), 4, 4, linewidth=1, edgecolor='none', facecolor=color)
#                 elif i % 2 == 1 and j % 2 == 0:  # Blue
#                     color = 'blue'
#                     rect = patches.Rectangle((x-1, y-3), 2, 6, linewidth=1, edgecolor='none', facecolor=color)
#                 elif i % 2 == 0 and j % 2 == 0:  # Yellow
#                     color = 'yellow'
#                     rect = patches.Rectangle((x-2, y-2), 4, 4, linewidth=1, edgecolor='none', facecolor=color)
#                 elif i % 2 == 0 and j % 2 == 1:  # Red
#                     color = 'red'
#                     rect = patches.Rectangle((x-1, y-3), 2, 6, linewidth=1, edgecolor='none', facecolor=color)
#                 ax.add_patch(rect)

#     plt.xlim([-size, 2*size])
#     plt.ylim([-size, 2*size])
#     plt.axis('equal')
#     plt.axis('off')  # Ensuring axes are hidden for neat visualization

#     plt.show()

# This assignment creates two-periodic Aztec diamond with gas:
# b = 1
# a = 0.5
# A1a=[]
# for i in range(2*n):
#     row=[]
#     for j in range(2*n):
#         if( (i%4 == 0 or i%4 == 1) and (j%4 == 0 or j%4 == 1)):
#             row.append(b)
#         if( (i%4 == 0 or i%4 == 1) and (j%4 == 2 or j%4 == 3)):
#             row.append(a)
#         if( (i%4 == 2 or i%4 == 3) and (j%4 == 0 or j%4 == 1)):
#             row.append(a)
#         if( (i%4 == 2 or i%4 == 3) and (j%4 == 2 or j%4 == 3)):
#             row.append(b)
#     A1a.append(row)



# This assignment creates Schur process with 1 outlier in the beginning:
# A1a=[]
# for i in range(2*n):
#     row=[]
#     for j in range(2*n):
#         if( (i+j)%2 == 0):
#             row.append(1)
#         if( (i+j)%2 == 1):
#             if(i<=1):
#                 row.append(4)
#             else:
#                 row.append(1)
#     A1a.append(row)

def aztec_printer(x0,n):
    size = len(x0)
    fig, ax = plt.subplots()

    for i in range(size):
        print(i)
        for j in range(size):
            if x0[i][j] == 1:
                if i % 2 == 1 and j % 2 == 1: # Green
                    rect = patches.Rectangle((j - i - 2, size + 1 - (i + j) - 1), 4, 2, edgecolor='none', facecolor='green')
                elif i % 2 == 1 and j % 2 == 0: # Blue
                    rect = patches.Rectangle((j - i - 1, size + 1 - (i + j) - 2), 2, 4, edgecolor='none', facecolor='blue')
                elif i % 2 == 0 and j % 2 == 0: # Red
                    rect = patches.Rectangle((j - i - 2, size + 1 - (i + j) - 1), 4, 2, edgecolor='none', facecolor='red')
                elif i % 2 == 0 and j % 2 == 1: # Yellow
                    rect = patches.Rectangle((j - i - 1, size + 1 - (i + j) - 2), 2, 4, edgecolor='none', facecolor='yellow')
                ax.add_patch(rect)

    ax.set_xlim([min(-size, -2), max(size, 2)])
    ax.set_ylim([min(-size, -2), max(size, 2)+2])
    ax.set_aspect('equal')
    plt.axis('off')

    # Generate current timestamp
    current_time = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    # Generate 4 random symbols
    random_symbols = ''.join(random.choices(string.ascii_letters + string.digits, k=4))
    # Construct the filename
    filename = f"{n}_regime_5_sim_test_{current_time}_{random_symbols}.pdf"
    plt.savefig(filename, bbox_inches='tight') # ACTUAL_SIM: FILE NAME
    plt.close()



n = 12 # ACTUAL_SIM: PARAMETERS

# regime1
# random_variables = [random.choices([1 + 2 / np.sqrt(n), 1 - 1 / np.sqrt(n)], weights=[1/2, 1/2])[0] for _ in range(n)]
# regime2
# random_variables = [random.choices([2, 1], weights=[1/np.sqrt(n), (np.sqrt(n)-1)/np.sqrt(n)])[0] for _ in range(n)]
# regime3
# random_variables = [random.choices([2, 0.5], weights=[1/2, 1/2])[0] for _ in range(n)]
# regime3.5
# random_variables = [random.choices([5, 0.2], weights=[1/2, 1/2])[0] for _ in range(n)]
# regime4
# random_variables = [random.uniform(0, 1) for _ in range(n)]
# regime4.5
# random_variables = [random.uniform(0, 2) for _ in range(n)]

# A1a=[]
# for i in range(2*n): # ACTUAL_SIM: DEFINE ALL WEIGHTS
#     row=[]
#     for j in range(2*n):
#         if( (i+j)%2 == 0):
#             row.append( random_variables[ i // 2 ] )
#         if( (i+j)%2 == 1):
#             row.append(1)
#     A1a.append(row)

# regime5 - absolutely all edges are random uniform on [0,2]
# regime5_5 - Set all edges as independent Bernoulli variables -- with probability 0.5 equal to 0.2, with probability 0.5 equal to 5
A1a = []
for i in range(2*n):
    row = []
    for j in range(2*n):
        # row.append(random.uniform(0, 2))  # Set absolutely all edges as random uniform on [0,2]
        row.append(random.choice([0.2, 5]))  # Set all edges as independent Bernoulli variables -- with probability 0.5 equal to 0.2, with probability 0.5 equal to 5
    A1a.append(row)

# regime6 - doubly periodic Aztec diamond
# This assignment creates two-periodic Aztec diamond with gas:
# b = 1
# a = 0.5
# A1a=[]
# for i in range(2*n):
#     row=[]
#     for j in range(2*n):
#         if( (i%4 == 0 or i%4 == 1) and (j%4 == 0 or j%4 == 1)):
#             row.append(b)
#         if( (i%4 == 0 or i%4 == 1) and (j%4 == 2 or j%4 == 3)):
#             row.append(a)
#         if( (i%4 == 2 or i%4 == 3) and (j%4 == 0 or j%4 == 1)):
#             row.append(a)
#         if( (i%4 == 2 or i%4 == 3) and (j%4 == 2 or j%4 == 3)):
#             row.append(b)
#     A1a.append(row)

# a = 0.5
# A1a = []

# for i in range(2 * n):
#     row = []
#     for j in range(2 * n):
#         # condition for "b" block
#         if ((i % 4 == 0 or i % 4 == 1) and (j % 4 == 0 or j % 4 == 1)) \
#            or ((i % 4 == 2 or i % 4 == 3) and (j % 4 == 2 or j % 4 == 3)):
#             # Instead of a fixed b = 1, choose a random number each time
#             random_b = random.choices([1, 2], weights=[2/3, 1/3])[0]  # Bernoulli with 1 having probability 2/3 and 2 having probability 1/3
#             row.append(random_b)
#         else:
#             # still use a fixed a = 0.5 in the "a" block
#             random_a = random.choices([a, 0.3], weights=[0.5, 0.5])[0]  # Bernoulli with a = 0.5 having probability 0.5 and 0.3 having probability 0.5
#             row.append(random_a)
#     A1a.append(row)



A2a=aztecgen(probs(A1a))
# A3d=pretty2(A2a,'tmp')
aztec_printer(A2a,n)
