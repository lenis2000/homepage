// Draw Aztec Diamond Tiling from text file
// Compile: clang++ -std=c++17 -O3 -o draw_tiling draw_tiling.cpp
// Usage: ./draw_tiling aztec_ab_gamma_n200_a0.2_b0.25.txt

#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <algorithm>
#include <cstdint>
#include <cstdio>

using namespace std;

struct MatrixInt {
    int n;
    vector<int> data;
    MatrixInt(int size) : n(size), data(size * size, 0) {}
    int& at(int i, int j) { return data[i * n + j]; }
    const int& at(int i, int j) const { return data[i * n + j]; }
    int size() const { return n; }
};

struct Domino {
    double x, y, w, h;
    uint8_t r, g, b;
};

MatrixInt readTilingFile(const string& filename) {
    ifstream file(filename);
    if (!file.is_open()) {
        cerr << "Error: Cannot open file " << filename << endl;
        exit(1);
    }

    vector<vector<int>> rows;
    string line;

    while (getline(file, line)) {
        vector<int> row;
        istringstream iss(line);
        int val;
        while (iss >> val) {
            row.push_back(val);
        }
        if (!row.empty()) {
            rows.push_back(row);
        }
    }
    file.close();

    if (rows.empty()) {
        cerr << "Error: Empty file" << endl;
        exit(1);
    }

    int n = rows.size();
    cout << "Read " << n << "x" << rows[0].size() << " matrix" << endl;

    MatrixInt config(n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < (int)rows[i].size() && j < n; j++) {
            config.at(i, j) = rows[i][j];
        }
    }

    return config;
}

vector<Domino> configToDominoes(const MatrixInt& config) {
    vector<Domino> dominoes;
    int size = config.size();
    double scale = 2.0;

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (config.at(i, j) == 1) {
                double x, y, w, h;
                uint8_t r, g, b;
                bool oddI = (i & 1), oddJ = (j & 1);

                if (oddI && oddJ) { // Blue
                    r = 0; g = 100; b = 255;
                    x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                } else if (oddI && !oddJ) { // Yellow
                    r = 255; g = 255; b = 0;
                    x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                } else if (!oddI && !oddJ) { // Red
                    r = 255; g = 0; b = 0;
                    x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                } else if (!oddI && oddJ) { // Green
                    r = 0; g = 180; b = 30;
                    x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                } else {
                    continue;
                }

                x *= scale; y *= scale; w *= scale; h *= scale;
                dominoes.push_back({x, y, w, h, r, g, b});
            }
        }
    }
    return dominoes;
}

void drawDominoesToPNG(const vector<Domino>& dominoes, const string& filename, int img_width = 2000) {
    if (dominoes.empty()) {
        cerr << "No dominoes to draw!" << endl;
        return;
    }

    // Find bounds
    double min_x = dominoes[0].x, max_x = dominoes[0].x + dominoes[0].w;
    double min_y = dominoes[0].y, max_y = dominoes[0].y + dominoes[0].h;

    for (const auto& d : dominoes) {
        min_x = min(min_x, d.x);
        max_x = max(max_x, d.x + d.w);
        min_y = min(min_y, d.y);
        max_y = max(max_y, d.y + d.h);
    }

    double width = max_x - min_x;
    double height = max_y - min_y;
    double scale = img_width / width;
    int img_height = (int)(height * scale);

    cout << "Image size: " << img_width << "x" << img_height << endl;

    // Create image buffer (white background)
    vector<uint8_t> image(img_width * img_height * 3, 255);

    // Draw dominoes
    for (const auto& d : dominoes) {
        int x1 = (int)((d.x - min_x) * scale);
        int y1 = (int)((d.y - min_y) * scale);
        int x2 = (int)((d.x + d.w - min_x) * scale);
        int y2 = (int)((d.y + d.h - min_y) * scale);

        x1 = max(0, min(img_width - 1, x1));
        x2 = max(0, min(img_width - 1, x2));
        y1 = max(0, min(img_height - 1, y1));
        y2 = max(0, min(img_height - 1, y2));

        for (int y = y1; y < y2; y++) {
            for (int x = x1; x < x2; x++) {
                int idx = (y * img_width + x) * 3;
                image[idx] = d.r;
                image[idx + 1] = d.g;
                image[idx + 2] = d.b;
            }
        }
    }

    // Write PPM format
    FILE* f = fopen(filename.c_str(), "wb");
    if (!f) {
        cerr << "Error: Cannot write to " << filename << endl;
        return;
    }
    fprintf(f, "P6\n%d %d\n255\n", img_width, img_height);
    fwrite(image.data(), 1, image.size(), f);
    fclose(f);

    cout << "Saved: " << filename << endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "Usage: " << argv[0] << " <tiling_file.txt> [output.ppm] [width]" << endl;
        return 1;
    }

    string input_file = argv[1];
    string output_file = (argc > 2) ? argv[2] : "output.ppm";
    int img_width = (argc > 3) ? stoi(argv[3]) : 2000;

    cout << "Reading tiling from: " << input_file << endl;
    MatrixInt config = readTilingFile(input_file);

    cout << "Converting to dominoes..." << endl;
    vector<Domino> dominoes = configToDominoes(config);
    cout << "Found " << dominoes.size() << " dominoes" << endl;

    cout << "Drawing..." << endl;
    drawDominoesToPNG(dominoes, output_file, img_width);

    cout << "Done! Convert to PNG with: magick " << output_file << " "
         << output_file.substr(0, output_file.find_last_of('.')) << ".png" << endl;

    return 0;
}
