# TODO: Convert Aztec Diamond Domino Tiling Simulation to 3D Height Function Visualization

**Goal:** Modify the existing 2D WebAssembly/JavaScript simulation to render domino tilings of the Aztec diamond as a 3D surface plot based on the height function, similar to the provided reference image.

**Files to Modify:**

1.  `2025-03-31-aztec-uniform-3d.cpp` (C++/WASM backend)
2.  `2025-03-31-aztec-uniform-3d.md` (HTML/JavaScript frontend)

**Constraints:**

* Only modify the two specified files.
* The simulation logic (shuffling algorithm via `delslide`, `create`, `aztecgen`) should remain the same.
* The height function calculation must be correct and result in a continuous surface.
* The final visualization should resemble the provided image (`image_eb3b39.jpg`).
* Use a standard web 3D library like Three.js for rendering.

---

## Task Breakdown:

### Part 1: C++ Backend Modifications (`2025-03-31-aztec-uniform-3d.cpp`)

1.  **Implement Height Function Calculation:**
    * **Define Standard Grid:** Use integer coordinates $(v_i, v_j)$ for the vertices of the grid underlying the Aztec diamond. These vertices exist where $v_i + v_j$ is an even integer. The relevant vertices satisfy the boundary condition $|v_i| + |v_j| \le 2n$.
    * **Checkerboard Squares:** The squares of the grid are centered at coordinates $(s_i, s_j)$ where $s_i = v_i \pm 0.5$ and $s_j = v_j \pm 0.5$. Define a checkerboard coloring for these squares: let a square be "White" if $s_i+s_j$ is an even integer, and "Black" if $s_i+s_j$ is an odd integer.
    * **Height Map Storage:** Create a data structure to store the calculated height $H(v_i, v_j)$ for each vertex $(v_i, v_j)$. A `std::map<std::pair<int, int>, double>` is suitable, mapping vertex coordinates to height. Initialize heights as "uncomputed".
    * **Height Calculation Algorithm (BFS):**
        * **Initialization:** Choose a reference vertex, for example, $v_{start} = (0, -n)$ on the boundary. Set its height $H(v_{start}) = 0$ in the map. Create a queue for the BFS and add $v_{start}$.
        * **Iteration:** While the queue is not empty:
            * Dequeue a vertex $v = (v_i, v_j)$.
            * Identify its valid neighbors $v' = (v'_i, v'_j)$ (vertices reachable by moving $\pm 1$ in $v_i$ and $\pm 1$ in $v_j$, such that $|v'_i| + |v'_j| \le 2n$).
            * For each neighbor $v'$:
                * If the height $H(v')$ has not yet been computed:
                    * **Calculate Height Change:** The height difference is $H(v') - H(v) = \pm 1$. The sign is determined by the checkerboard color of the square whose center lies between $v$ and $v'$. Let the center coordinates of this intermediate square be $s = (\frac{v_i+v'_i}{2}, \frac{v_j+v'_j}{2})$.
                        * If the square at $s$ is White ($s_i+s_j$ is even), then $H(v') = H(v) + 1$.
                        * If the square at $s$ is Black ($s_i+s_j$ is odd), then $H(v') = H(v) - 1$.
                    * Store the computed $H(v')$ in the height map.
                    * Enqueue $v'$.
        * This BFS propagation ensures that the height is calculated consistently across the entire diamond, resulting in a continuous height field.
    * **Relation to Stencils:** The height difference rules ($\pm 1$ depending on checkerboard color) are the fundamental definition of the height function. The stencils provided in the prompt:
        ```
        BLUE (horizontal): h-1, h, h-1 / h-2, h-3, h-2
        GREEN (horizontal): h+1, h, h+1 / h+2, h+3, h+2
        RED (vertical): h+2, h+1 / h+3, h / h+2, h+1
        YELLOW (vertical): h-2, h-1 / h-3, h / h-2, h-1
        ```
        illustrate the *consequences* of these rules. For example, crossing *along* the direction of a domino results in a height change of $\pm 3$ between corresponding vertices (e.g., $h$ vs $h-3$ in the Blue stencil, or $h$ vs $h+3$ in the Green stencil). The BFS based on $\pm 1$ changes automatically enforces these larger differences across dominoes. The BFS method guarantees global consistency.
    * **Integration Point:** This height map calculation function should be called within the `simulateAztec` C++ function *after* the `aztecgen` function has produced the final `dominoConfig`, but *before* the loop that generates the output JSON.

2.  **Identify Domino Vertices:**
    * **Mapping:** Establish a clear mapping from the `dominoConfig[i][j]` representation and the parity-based color determination (currently used for JSON generation) to the specific four vertices $(v1, v2, v3, v4)$ in the standard $(v_i, v_j)$ grid that form the corners of the domino's face in the 3D plot. *This mapping is critical and might require careful analysis of the existing coordinate transformations or deriving it from the `(i,j)` indices and parity.*
    * **Coordinate System:** Ensure the $(v_i, v_j)$ coordinates used for height calculation and output match the standard definition used for height functions. For order `n`, coordinates typically range from `-n` to `+n`.

3.  **Modify `simulateAztec` Output:**
    * **Change Return Structure:** Modify the loop that generates the JSON string. Instead of returning 2D rectangles (`x, y, w, h`), return a JSON array of objects, where each object represents a single domino *face* (a quadrilateral in 3D).
    * **Face Object Format:** Each object should contain:
        * `color`: The domino color ("blue", "green", "red", "yellow").
        * `vertices`: An array of 4 vertices, where each vertex is an array `[v_i, v_j, H(v_i, v_j)]` representing its 3D coordinates in the model space (using the standard grid coordinates and the height retrieved from the pre-calculated `heightMap`). The order of vertices should be consistent (e.g., counter-clockwise) to allow correct face construction in Three.js.
        ```json
        [
          {
            "color": "blue",
            "vertices": [
              [vi1, vj1, H1], // e.g., bottom-left
              [vi2, vj2, H2], // e.g., bottom-right
              [vi3, vj3, H3], // e.g., top-right
              [vi4, vj4, H4]  // e.g., top-left
            ]
          },
          // ... other domino faces
        ]
        ```
    * **Remove Scaling:** Remove the `scale` multiplication within the C++ code; scaling and projection will be handled by the 3D library in JS.

### Part 2: HTML/JavaScript Frontend Modifications (`2025-03-31-aztec-uniform-3d.md`)

1.  **Setup 3D Environment:**
    * **Include Library:** Add a `<script>` tag to include the Three.js library (e.g., from a CDN).
    * **Replace SVG:** Change the `<svg id="aztec-svg">...</svg>` element to a `<div>` or `<canvas>` element (e.g., `<canvas id="aztec-canvas"></canvas>`) where the 3D scene will be rendered.
    * **Adjust CSS:** Update the CSS rules (`#aztec-svg` selectors) to target the new canvas/container element (`#aztec-canvas`) and ensure appropriate sizing and responsiveness.

2.  **Update JavaScript Logic (`<script>` block):**
    * **Remove D3.js:** Delete the D3.js selection (`d3.select("#aztec-svg")`) and all D3.js rendering code (`svg.append`, `group.selectAll`, `.attr`, etc.).
    * **Initialize Three.js:**
        * Create a `THREE.Scene`.
        * Create a `THREE.WebGLRenderer` and attach it to the canvas element. Set its size.
        * Create a `THREE.OrthographicCamera` to achieve the isometric-like view seen in the reference image. Configure its position (e.g., `camera.position.set(n, n, n)` scaled appropriately), zoom level, and make it look at the origin (`camera.lookAt(0, 0, 0)`). Tuning will be required based on `n` and the coordinate range.
        * Add lighting to the scene (e.g., `THREE.AmbientLight` for overall illumination and `THREE.DirectionalLight` for shading and depth).
    * **Modify `updateVisualization(n)` function:**
        * **Get Canvas:** Get the canvas element (`document.getElementById('aztec-canvas')`).
        * **Parse JSON:** Parse the JSON string returned from `simulateAztec`. It now contains the list of face objects.
        * **Clear Scene:** Before adding new objects, remove any previously added domino meshes from the `Scene`. A common way is to group domino meshes under a `THREE.Group` and remove/empty that group.
        * **Create Meshes:** Iterate through the parsed array of face objects:
            * For each face, create a `THREE.BufferGeometry`.
            * Extract the 4 vertex coordinates `[ [x1,y1,z1], [x2,y2,z2], ... ]`. Flatten this into a single array for the buffer attribute.
            * Define the geometry's position attribute: `geometry.setAttribute('position', new THREE.Float32BufferAttribute(flattened_vertices, 3));`.
            * Define the geometry's faces using indices: `geometry.setIndex([0, 1, 2, 0, 2, 3])` (assuming the vertex order `v1, v2, v3, v4` from C++ is counter-clockwise).
            * Create a `THREE.MeshStandardMaterial` (or `MeshBasicMaterial`) using the `color` from the JSON data. Set `side: THREE.DoubleSide`.
            * Create a `THREE.Mesh` from the geometry and material.
            * Add the mesh to the `Scene` (or a dedicated group).
        * **Render:** Call `renderer.render(scene, camera)` to draw the scene.
    * **(Optional) Add Controls:** Include and configure `THREE.OrbitControls` to allow users to rotate, pan, and zoom the 3D view. If controls are added, create an animation loop using `requestAnimationFrame` that calls `controls.update()` and `renderer.render(scene, camera)`.

### Part 3: Verification

1.  **Compile C++:** Ensure the `emcc` compilation command works correctly.
2.  **Test Rendering:** Load the HTML page and verify that a 3D representation is generated.
3.  **Compare Appearance:** Check if the colors, shapes, and overall 3D structure resemble the reference image (`image_eb3b39.jpg`). Adjust camera position, zoom, and lighting in the JS code as needed.
4.  **Check Continuity:** Visually inspect the generated 3D surface to ensure there are no gaps or discontinuities between adjacent domino faces, confirming the height function implementation is correct.
5.  **Test Responsiveness:** Test with different values of `n` (within reasonable limits) to ensure the calculation and rendering work correctly.

---
