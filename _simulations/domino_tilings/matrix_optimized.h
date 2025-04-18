#pragma once

#include <vector>
#include <cmath>

struct Cell {
    double value;
    int flag;
};

// Memory-efficient flat matrix implementations

class Matrix {
private:
    std::vector<Cell> data;
    int rows_, cols_;

public:
    Matrix() : rows_(0), cols_(0) {}

    Matrix(int rows, int cols)
        : data(rows * cols, Cell{0.0, 0}), rows_(rows), cols_(cols) {}

    Cell& at(int i, int j) {
        return data[i * cols_ + j];
    }

    const Cell& at(int i, int j) const {
        return data[i * cols_ + j];
    }

    int size() const { return rows_; }
};

class MatrixDouble {
private:
    std::vector<double> data;
    int rows_, cols_;

public:
    MatrixDouble() : rows_(0), cols_(0) {}

    MatrixDouble(int rows, int cols, double val = 0.0)
        : data(rows * cols, val), rows_(rows), cols_(cols) {}

    double& at(int i, int j) {
        return data[i * cols_ + j];
    }

    const double& at(int i, int j) const {
        return data[i * cols_ + j];
    }

    int size() const { return rows_; }
};

class MatrixInt {
private:
    std::vector<int> data;
    int rows_, cols_;

public:
    MatrixInt() : rows_(0), cols_(0) {}

    MatrixInt(int rows, int cols, int val = 0)
        : data(rows * cols, val), rows_(rows), cols_(cols) {}

    int& at(int i, int j) {
        return data[i * cols_ + j];
    }

    const int& at(int i, int j) const {
        return data[i * cols_ + j];
    }

    int size() const { return rows_; }
};