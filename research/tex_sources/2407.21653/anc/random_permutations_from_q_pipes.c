/*
 * random_permutations_from_q_pipes.c
 *
 * This program simulates random permutations based on pipe dreams.
 * It generates random permutations using a q-deformed pipe dream model and
 * computes statistics on the resulting permutations.
 *
 * The output is in Mathematica-readable format, consisting of three arrays:
 * 1. All generated permutations
 * 2. Coarsened matrices for each run
 * 3. Sum of all coarsened matrices
 *
 * Compilation and execution:
 * gcc -march=native -O3 random_permutations_from_q_pipes.c && ./a.out > a.txt
 *
 * Sample Mathematica commands to view results (save in a Mathematica notebook in the same folder as the output file a.txt):
 * SetDirectory[NotebookDirectory[]];
 * M = ReadList["a.txt"][[1]];
 * ListPlot[M[[1]][[1]]]
 * MatrixPlot[M[[3]]]
 *
 * Author: Leonid Petrov (University of Virginia)
 * Date: 2024-07-31
 * Updated: 2025-04-16; fixed error in the q-case
 */

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// Configuration parameters
#define N 1000       // Size of the permutation
#define T_MAX (2 * N - 3)  // Maximum time steps
#define RUNS 2000     // Number of simulation runs
#define COARSE 5    // Coarsening factor for output
#define PROB_P 0.5  // Probability p for pipe crossings
#define PROB_Q 0.7  // Probability q for resolving double crossings

/**
 * Generates a list of possible swap positions for a given time step.
 *
 * @param t The current time step.
 * @param swaps An array to store the swap possibilities (1 for possible, 0 for not).
 */
void generateSwaps(int t, int *swaps) {
    for (int i = 1; i < N; i++) {
        if ((t + i >= N) && (t - i <= N - 2) && ((t - i + N) % 2 == 0)) {
            swaps[i-1] = 1;
        } else {
            swaps[i-1] = 0;
        }
    }
}

/**
 * Applies random swaps to the permutation based on the swap possibilities.
 *
 * @param sigma The current permutation.
 * @param swaps Array indicating possible swap positions.
 */
 void applyRandomSwap(int *sigma, int *swaps) {
     for (int i = 0; i < N - 1; i++) {
         if (swaps[i] == 1) {
             if (sigma[i] < sigma[i + 1] && ((double) rand() / RAND_MAX) < PROB_P) {
                 // Apply swap with probability p if in increasing order
                 int temp = sigma[i];
                 sigma[i] = sigma[i + 1];
                 sigma[i + 1] = temp;
             }
             else if (sigma[i] > sigma[i + 1] && ((double) rand() / RAND_MAX) < PROB_P * PROB_Q) {
                 // Apply swap with probability p*q if in decreasing order
                 int temp = sigma[i];
                 sigma[i] = sigma[i + 1];
                 sigma[i + 1] = temp;
             }
         }
     }
 }

int main() {
    srand(time(NULL)); // Seed the random number generator

    // Allocate memory for the permutation and swap array
    int *sigma = malloc(N * sizeof(int));
    int *swaps = malloc((N - 1) * sizeof(int));

    // Allocate memory for storing all generated permutations
    int **tbl = malloc(RUNS * sizeof(int*));
    for (int i = 0; i < RUNS; i++) {
        tbl[i] = malloc(N * sizeof(int));
    }

    // Main simulation loop
    for (int run_counter = 0; run_counter < RUNS; run_counter++) {
        if (run_counter % 50 == 0) {
            fprintf(stderr, "%d / %d\n", run_counter, RUNS);
        }

        // Initialize permutation to identity
        for (int i = 0; i < N; i++) {
            sigma[i] = i + 1;
        }

        // Apply swaps for each time step
        for (int t = 1; t <= T_MAX; t++) {
            generateSwaps(t, swaps);
            applyRandomSwap(sigma, swaps);
        }

        // Store the resulting permutation
        for (int i = 0; i < N; i++) {
            tbl[run_counter][i] = sigma[i];
        }
    }

    // Output in Mathematica-readable format

    // 1. Output all generated permutations
    printf("{\n  {");  // Start of the entire output and first array
    for (int run_counter = 0; run_counter < RUNS; run_counter++) {
        printf("{");
        for (int i = 0; i < N; i++) {
            printf("%d", tbl[run_counter][i]);
            if (i < N - 1) {
                printf(", ");
            }
        }
        printf("}");
        if (run_counter < RUNS - 1) {
            printf(",\n   ");
        }
    }
    printf("},\n");  // End of first array

    // 2. Compute and output coarsened results for each run
    int nCoarse = N / COARSE;
    printf("  {");  // Start of second array
    for (int run_counter = 0; run_counter < RUNS; run_counter++) {
        int coarseMatrix[nCoarse][nCoarse];
        for (int i = 0; i < nCoarse; i++) {
            for (int j = 0; j < nCoarse; j++) {
                coarseMatrix[i][j] = 0;
            }
        }

        // Count placements in coarsened matrix
        for (int i = 0; i < N; i++) {
            int src = (i / COARSE);
            int dest = ((tbl[run_counter][i] - 1) / COARSE);
            coarseMatrix[src][dest]++;
        }

        // Output coarsened matrix
        printf("{");
        for (int i = 0; i < nCoarse; i++) {
            printf("{");
            for (int j = 0; j < nCoarse; j++) {
                printf("%d", coarseMatrix[i][j]);
                if (j < nCoarse - 1)
                    printf(", ");
            }
            printf("}");
            if (i < nCoarse - 1)
                printf(", ");
        }
        printf("}");
        if (run_counter < RUNS - 1)
            printf(",\n   ");
    }
    printf("},\n");  // End of second array

    // 3. Compute and output the sum of all coarsened matrices
    printf("  {");  // Start of third array
    int sumMatrix[nCoarse][nCoarse];
    for (int i = 0; i < nCoarse; i++) {
        for (int j = 0; j < nCoarse; j++) {
            sumMatrix[i][j] = 0;
        }
    }
    for (int run_counter = 0; run_counter < RUNS; run_counter++) {
        int coarseMatrix[nCoarse][nCoarse];
        for (int i = 0; i < nCoarse; i++) {
            for (int j = 0; j < nCoarse; j++) {
                coarseMatrix[i][j] = 0;
            }
        }

        // Count placements
        for (int i = 0; i < N; i++) {
            int src = (i / COARSE);
            int dest = ((tbl[run_counter][i] - 1) / COARSE);
            coarseMatrix[src][dest]++;
        }

        // Sum up the matrices
        for (int i = 0; i < nCoarse; i++) {
            for (int j = 0; j < nCoarse; j++) {
                sumMatrix[i][j] += coarseMatrix[i][j];
            }
        }
    }

    // Output the sum matrix
    for (int i = 0; i < nCoarse; i++) {
        printf("{");
        for (int j = 0; j < nCoarse; j++) {
            printf("%d", sumMatrix[i][j]);
            if (j < nCoarse - 1)
                printf(", ");
        }
        printf("}");
        if (i < nCoarse - 1)
            printf(",\n   ");
    }
    printf("}\n");  // End of third array
    printf("}\n");  // End of entire output

    // Free allocated memory
    for (int i = 0; i < RUNS; i++) {
        free(tbl[i]);
    }
    free(tbl);
    free(sigma);
    free(swaps);

    return 0;
}
