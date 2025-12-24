# Domino Tilings Project Guide

## T-Graph Structure

For a T-embedding at level k, the T_k graph has the following structure:

### T_k Vertices
- **4 external corners**: (±(k+1), 0), (0, ±(k+1))
- **4 alpha vertices**: (±k, 0), (0, ±k) — at |i|+|j| = k, on axis
- **Beta vertices**: |i|+|j| = k, off-axis (i≠0 AND j≠0)
- **Interior**: |i|+|j| ≤ k-1

### T_k Edges
1. **External corners** connect to their corresponding alpha: (k+1,0) ↔ (k,0), and to each other forming the outer rhombus
2. **Beta vertices** connect to each other and to alpha correspondingly, forming diagonals i+j=k
3. **Interior** (|i|+|j| ≤ k-1) connects like a lattice: 4 neighbors (i±1, j), (i, j±1)

### XX Cross-Ratio Property
For interior face (j, k) with |j|+|k| < n, the cross-ratio satisfies:
```
XX(R, T, L, B, z) + gamma = 0
```
where R, T, L, B are the 4 neighbors and gamma is the face weight.

Note: For boundary-adjacent faces (|j|+|k| = n-1), some neighbors are alpha/beta vertices.

## Project Structure
- Source files are stored in: `/Users/leo/Homepage/_simulations/domino_tilings/`
- Compiled JS files are moved to: `/Users/leo/Homepage/js/`
- Each simulation has both `.cpp` and `.md` files with matching names
- File naming convention: `YYYY-MM-DD-simulation-description.cpp/md`

## Quick Commands

### Standard Commands
The following commands can always be executed without asking for permission:
- Compilation commands (emcc)
- Moving files to the js directory
- Reading code/files
- Updating code/MD files for simulations

### Single File Compilation
```bash
# Compile and move a single simulation:
emcc YYYY-MM-DD-name.cpp -o YYYY-MM-DD-name.js \
 -s WASM=1 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec', '_performGlauberStep', '_performGlauberSteps', '_simulateAztecGlauber', '_freeString', '_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math

# Move to js directory:
mv YYYY-MM-DD-name.js ../../js/
```


## Creating a New Simulation

### 1. Choose Base Simulation
Choose an existing simulation that's most similar to what you want to create.

### 2. Create New Files
Copy and rename existing files:
```bash
cp YYYY-MM-DD-existing.md YYYY-MM-DD-new.md
cp YYYY-MM-DD-existing.cpp YYYY-MM-DD-new.cpp
```

### 3. Update References
In both `.md` and `.cpp` files:
- Update all filename references
- Update GitHub source links in code section
- Update JS script import: `<script src="/js/YYYY-MM-DD-new.js"></script>`
- Update compilation command in comments

### 4. Compile and Deploy
```bash
# Compile specific file
emcc YYYY-MM-DD-new.cpp -o YYYY-MM-DD-new.js [compilation flags]

# Move to js directory
mv YYYY-MM-DD-new.js ../../js/
```


## Common Simulation Categories

The project contains various simulation types, including:
- Aztec diamond tilings (uniform and weighted)
- Periodic weight patterns (2×2, 3×3, etc.)
- Dynamics simulations (Glauber, etc.)
- Visualizations (2D, 3D, height functions)
- Special embeddings (T-embeddings, etc.)
- Other statistical physics models (6-vertex, etc.)

Choose the closest existing simulation as your starting point when creating a new one.

## Exported Functions

Different simulation types require different exported functions:

### Common Export Sets

```javascript
// Basic simulations
'_simulateAztec', '_freeString', '_getProgress'

// Glauber dynamics
'_simulateAztec', '_performGlauberStep', '_performGlauberSteps', '_simulateAztecGlauber', '_freeString', '_getProgress'

// T-embeddings
'_doTembJSONwithA', '_freeString', '_getProgress', '_resetProgress'
```

Always check the base simulation's exports when creating a new simulation.