#ifndef AZTEC_SAMPLING_H
#define AZTEC_SAMPLING_H

#include <vector>
#include <random>

using MatrixInt    = std::vector<std::vector<int>>;
using MatrixDouble = std::vector<std::vector<double>>;
struct Cell{ double value; int flag; };
using Matrix       = std::vector<std::vector<Cell>>;

// Preprocessing on weight matrix
std::vector<Matrix> d3p(const MatrixDouble &x1);

// Probabilities for creation step
std::vector<MatrixDouble> probs2(const MatrixDouble &x1);

// Deletion/slide
MatrixInt delslide(const MatrixInt &x1);

// Creation
MatrixInt create(MatrixInt x0, const MatrixDouble &p);

// Main generator
MatrixInt aztecgen(const std::vector<MatrixDouble> &prob);

#endif