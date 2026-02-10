/**
 * From Paths to 3D: Asymmetric hexagon a×12×9 with WASM CFTP sampling
 * Two simulations: 3D hexagon (Three.js) + Snowflake (2D Canvas)
 */

// ===== Hexagon 3D Simulation =====
function init2to3dHexagonSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('bridge-3d-canvas');
        const descEl = document.getElementById('bridge-description');
        if (!canvas) return;

        // Wait for LozengeModule to be available
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create our own WASM instance (isolated from other slides)
        const wasm = await LozengeModule();

        // WASM interface
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);

        // Parameters: a x B x C hexagon (a varies 1-9)
        const B = 12, C = 9;
        let currentA = 1;
        let currentDimers = [];

        // Colors (UVA scheme)
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        // Triangle geometry helpers
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getRightTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }
        function getLeftTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        function pointInPolygon(x, y, polygon) {
            if (polygon.length < 3) return false;
            let inside = false;
            for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[pj].x, yj = polygon[pj].y;
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        }

        // Generate triangles for a×b×c hexagon and pass to WASM
        function generateHexagonTriangles(a, b, c) {
            const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
            const sideLengths = [a, b, c, a, b, c];
            const boundary = [];
            let bn = 0, bj = 0;
            for (let dir = 0; dir < 6; dir++) {
                for (let step = 0; step < sideLengths[dir]; step++) {
                    boundary.push(getVertex(bn, bj));
                    bn += directions[dir][0];
                    bj += directions[dir][1];
                }
            }

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const v of boundary) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
            const searchMinN = Math.floor(minX) - 2;
            const searchMaxN = Math.ceil(maxX) + 2;
            const nRange = searchMaxN - searchMinN;
            const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
            const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

            const triangleArr = [];
            for (let n = searchMinN; n <= searchMaxN; n++) {
                for (let j = searchMinJ; j <= searchMaxJ; j++) {
                    const rc = getRightTriangleCentroid(n, j);
                    if (pointInPolygon(rc.x, rc.y, boundary)) {
                        triangleArr.push(n, j, 1);
                    }
                    const lc = getLeftTriangleCentroid(n, j);
                    if (pointInPolygon(lc.x, lc.y, boundary)) {
                        triangleArr.push(n, j, 2);
                    }
                }
            }
            return triangleArr;
        }

        // Initialize WASM with hexagon and run CFTP
        function sampleHexagon(a, b, c) {
            const triangleArr = generateHexagonTriangles(a, b, c);

            const dataPtr = wasm._malloc(triangleArr.length * 4);
            for (let i = 0; i < triangleArr.length; i++) {
                wasm.setValue(dataPtr + i * 4, triangleArr[i], 'i32');
            }

            const initPtr = initFromTriangles(dataPtr, triangleArr.length);
            freeString(initPtr);
            wasm._free(dataPtr);

            const cftpPtr = runCFTP();
            freeString(cftpPtr);

            const dimersPtr = exportDimersWasm();
            const dimersJson = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);

            const parsed = JSON.parse(dimersJson);
            currentDimers = parsed.dimers || [];
        }

        // ===== THREE.JS RENDERING (LAZY LOADED) =====
        let scene = null;
        let renderer = null;
        let camera = null;
        let controls = null;
        let meshGroup = null;
        let needsCenterCamera = true;
        const frustumSize = 30;
        let aspect = 1;

        function initThreeJS() {
            if (renderer) return;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);

            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            aspect = canvas.clientWidth / canvas.clientHeight || 1;
            camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2, frustumSize * aspect / 2,
                frustumSize / 2, -frustumSize / 2,
                0.1, 1000
            );

            camera.up.set(0, 0, 1);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.8;
            controls.panSpeed = 0.8;
            controls.zoomSpeed = 1.2;
            controls.enablePan = true;
            controls.enableZoom = true;

            // Lighting (matches ultimate lozenge standard preset)
            scene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            hemi.position.set(0, 20, 0);
            scene.add(hemi);
            const directional = new THREE.DirectionalLight(0xffffff, 0.6);
            directional.position.set(10, 10, 15);
            scene.add(directional);
            const fill = new THREE.DirectionalLight(0xffffff, 0.25);
            fill.position.set(-10, -5, -10);
            scene.add(fill);

            meshGroup = new THREE.Group();
            scene.add(meshGroup);

            controls.addEventListener('change', () => {
                if (!isRunning && renderer) renderer.render(scene, camera);
            });

            resize();
        }

        function disposeThreeJS() {
            if (!renderer) return;

            stopAutoRotate();
            if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
            isRunning = false;

            if (meshGroup) {
                while (meshGroup.children.length > 0) {
                    const child = meshGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                        else child.material.dispose();
                    }
                    meshGroup.remove(child);
                }
            }

            if (controls) controls.dispose();
            renderer.dispose();
            renderer = null;
            scene = null;
            camera = null;
            controls = null;
            meshGroup = null;
            needsCenterCamera = true;
        }

        function resize() {
            if (!renderer || !camera) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h, false);
            aspect = w / h;
            camera.left = -frustumSize * aspect / 2;
            camera.right = frustumSize * aspect / 2;
            camera.top = frustumSize / 2;
            camera.bottom = -frustumSize / 2;
            camera.updateProjectionMatrix();
        }
        window.addEventListener('resize', resize);

        function getVertexKeys(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        }

        function getHeightPattern(t) {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        }

        function to3D(n, j, h) {
            return { x: h, y: -n - h, z: j - h };
        }

        function centerCamera(heights) {
            if (!camera || !controls) return;
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            for (const [key, h] of heights) {
                const [n, j] = key.split(',').map(Number);
                const p = to3D(n, j, h);
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
            }
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
            const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;
            controls.target.set(cx, cy, cz);
            camera.position.set(cx - size * 3.0, cy + size * 1.5, cz + size * 1.5);
            camera.lookAt(cx, cy, cz);
            controls.update();
        }

        function clearFog() {
            if (scene) { scene.background = new THREE.Color(0xffffff); scene.fog = null; }
        }

        function buildGeometry() {
            if (!meshGroup) return;
            clearFog();

            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                    else child.material.dispose();
                }
                meshGroup.remove(child);
            }

            if (currentDimers.length === 0) return;

            const vertexToDimers = new Map();
            for (const dimer of currentDimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            const heights = new Map();
            const firstVerts = getVertexKeys(currentDimers[0]);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            const visited = new Set();

            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);
                    const myIdx = verts.findIndex(([vn, vj]) => vn === cn && vj === cj);
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vkey = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vkey)) {
                                heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }

            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];

            function addQuad(v1, v2, v3, v4, color) {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
                const clr = new THREE.Color(color);
                for (let i = 0; i < 4; i++) vertexColors.push(clr.r, clr.g, clr.b);
                indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            }

            for (const dimer of currentDimers) {
                const verts = getVertexKeys(dimer);
                const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);

            currentMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true, side: THREE.DoubleSide, flatShading: true,
                roughness: 0.5, metalness: 0.15
            });
            meshGroup.add(new THREE.Mesh(geometry, currentMaterial));

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
            meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.5, transparent: true })));

            if (needsCenterCamera) {
                camera.position.set(-38.2, 9.9, 21.3);
                camera.zoom = 1.968;
                camera.updateProjectionMatrix();
                controls.target.set(-2.2, -8.1, 3.3);
                controls.update();
                needsCenterCamera = false;
            }
        }

        // Helper: clear meshGroup with proper material array disposal
        function clearMeshGroup() {
            if (!meshGroup) return;
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                    else child.material.dispose();
                }
                meshGroup.remove(child);
            }
        }

        // ===== LEGO brick rendering =====
        function buildLegoGeometry() {
            if (!meshGroup) return;
            clearMeshGroup();
            clearFog();
            if (currentDimers.length === 0) return;

            // BFS height computation
            const vertexToDimers = new Map();
            for (const dimer of currentDimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }
            const heights = new Map();
            const firstVerts = getVertexKeys(currentDimers[0]);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);
            const queue = [startKey];
            const visited = new Set();
            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);
                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);
                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);
                    const myIdx = verts.findIndex(([vn, vj]) => vn === cn && vj === cj);
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vkey = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vkey)) {
                                heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }

            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];
            const shrink = 0.97;

            function addQuad(v1, v2, v3, v4, color) {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
                const clr = new THREE.Color(color);
                for (let i = 0; i < 4; i++) vertexColors.push(clr.r, clr.g, clr.b);
                indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            }

            // Pre-compute tile positions
            const tileData = [];
            for (const dimer of currentDimers) {
                const verts = getVertexKeys(dimer);
                const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`);
                if (h0 === undefined) { tileData.push(null); continue; }
                const pattern = getHeightPattern(dimer.t);
                const baseH = h0 - pattern[0];
                const v3d = verts.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));
                tileData.push({ dimer, verts, v3d });
            }

            // Build edge adjacency for brick merging
            const edgeToTiles = new Map();
            const tileEdgeKeys = [];
            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) { tileEdgeKeys.push(null); continue; }
                const { verts } = tileData[di];
                const keys = [];
                for (let e = 0; e < 4; e++) {
                    const [n1, j1] = verts[e];
                    const [n2, j2] = verts[(e + 1) % 4];
                    const key = (n1 < n2 || (n1 === n2 && j1 < j2))
                        ? `${n1},${j1}-${n2},${j2}` : `${n2},${j2}-${n1},${j1}`;
                    keys.push(key);
                    if (!edgeToTiles.has(key)) edgeToTiles.set(key, []);
                    edgeToTiles.get(key).push(di);
                }
                tileEdgeKeys.push(keys);
            }

            // Brick merging: 50% chance to merge adjacent wall tiles along vertical edges
            const mergedEdges = new Set();
            for (const [key, tiles] of edgeToTiles) {
                if (tiles.length === 2) {
                    const d0 = tileData[tiles[0]], d1 = tileData[tiles[1]];
                    if (d0 && d1 && d0.dimer.t === d1.dimer.t && d0.dimer.t !== 2) {
                        const edgeIdx = tileEdgeKeys[tiles[0]].indexOf(key);
                        const pattern = getHeightPattern(d0.dimer.t);
                        const nextIdx = (edgeIdx + 1) % 4;
                        if (d0.verts[edgeIdx][1] - pattern[edgeIdx] !== d0.verts[nextIdx][1] - pattern[nextIdx]) {
                            if (Math.random() < 0.5) mergedEdges.add(key);
                        }
                    }
                }
            }
            // Propagate wall merges to Type 2 (top face) tiles above
            for (const key of [...mergedEdges]) {
                const tiles = edgeToTiles.get(key);
                if (!tiles || tiles.length !== 2) continue;
                const d0 = tileData[tiles[0]], d1 = tileData[tiles[1]];
                if (!d0 || !d1 || d0.dimer.t === 2) continue;
                const ek0 = tileEdgeKeys[tiles[0]], ek1 = tileEdgeKeys[tiles[1]];
                if (!ek0 || !ek1) continue;
                const tt0 = edgeToTiles.get(ek0[0]), tt1 = edgeToTiles.get(ek1[0]);
                if (!tt0 || !tt1) continue;
                let t2a = -1, t2b = -1;
                for (const ti of tt0) if (tileData[ti] && tileData[ti].dimer.t === 2) { t2a = ti; break; }
                for (const ti of tt1) if (tileData[ti] && tileData[ti].dimer.t === 2) { t2b = ti; break; }
                if (t2a >= 0 && t2b >= 0 && t2a !== t2b) {
                    const ka = tileEdgeKeys[t2a], kb = new Set(tileEdgeKeys[t2b]);
                    if (ka) for (const k of ka) { if (kb.has(k)) { mergedEdges.add(k); break; } }
                }
            }

            // Render with selective per-edge gaps (gaps only at non-merged edges)
            const gap = 1 - shrink;
            const linePositions = [];
            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) continue;
                const { dimer, v3d } = tileData[di];
                const edgeKeys = tileEdgeKeys[di];

                const shrunk = v3d.map((v, i) => {
                    const prev = (i + 3) % 4;
                    const next = (i + 1) % 4;
                    let dx = 0, dy = 0, dz = 0;
                    if (!mergedEdges.has(edgeKeys[i])) {
                        dx += gap * (v3d[prev].x - v.x) / 2;
                        dy += gap * (v3d[prev].y - v.y) / 2;
                        dz += gap * (v3d[prev].z - v.z) / 2;
                    }
                    if (!mergedEdges.has(edgeKeys[prev])) {
                        dx += gap * (v3d[next].x - v.x) / 2;
                        dy += gap * (v3d[next].y - v.y) / 2;
                        dz += gap * (v3d[next].z - v.z) / 2;
                    }
                    return { x: v.x + dx, y: v.y + dy, z: v.z + dz };
                });

                addQuad(shrunk[0], shrunk[1], shrunk[2], shrunk[3], '#FFD700');

                for (let e = 0; e < 4; e++) {
                    if (!mergedEdges.has(edgeKeys[e])) {
                        linePositions.push(
                            shrunk[e].x, shrunk[e].y, shrunk[e].z,
                            shrunk[(e+1)%4].x, shrunk[(e+1)%4].y, shrunk[(e+1)%4].z
                        );
                    }
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            geometry.computeBoundingSphere();

            // Plastic material
            currentMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true, side: THREE.DoubleSide, flatShading: true,
                roughness: 0.35, metalness: 0.0,
                polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
            });
            meshGroup.add(new THREE.Mesh(geometry, currentMaterial));

            // Brick edge lines (only at non-merged boundaries)
            const lineGeom = new THREE.BufferGeometry();
            lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
            meshGroup.add(new THREE.LineSegments(lineGeom, edgesMaterial));

            // Studs on type 2 (top) faces: 4 cylindrical bumps per tile
            const type2Verts = [];
            let type2Normal = null;
            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) continue;
                const { dimer, v3d } = tileData[di];
                if (dimer.t === 2) {
                    type2Verts.push(v3d);
                    if (!type2Normal) {
                        const e1 = { x: v3d[1].x - v3d[0].x, y: v3d[1].y - v3d[0].y, z: v3d[1].z - v3d[0].z };
                        const e2 = { x: v3d[3].x - v3d[0].x, y: v3d[3].y - v3d[0].y, z: v3d[3].z - v3d[0].z };
                        const nx = e1.y * e2.z - e1.z * e2.y;
                        const ny = e1.z * e2.x - e1.x * e2.z;
                        const nz = e1.x * e2.y - e1.y * e2.x;
                        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                        type2Normal = new THREE.Vector3(nx/len, ny/len, nz/len);
                    }
                }
            }

            if (type2Verts.length > 0 && type2Normal) {
                const segments = 16;
                const studR = 0.13, studH = 0.10;
                const studGeom = new THREE.CylinderGeometry(studR, studR, studH, segments);
                const yAxis = new THREE.Vector3(0, 1, 0);
                const studMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color('#FFD700'),
                    roughness: 0.25, metalness: 0.0, flatShading: true, side: THREE.DoubleSide
                });

                const totalStuds = type2Verts.length * 4;
                const instancedMesh = new THREE.InstancedMesh(studGeom, studMat, totalStuds);
                const flipped = type2Normal.clone().negate();
                const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, flipped);
                const dummy = new THREE.Matrix4();
                const nOffset = flipped.clone().multiplyScalar(0.08);

                // Precompute rotated circle for stud rim outlines
                const circleTop = [], circleBot = [];
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const cos = Math.cos(angle) * studR, sin = Math.sin(angle) * studR;
                    circleTop.push(new THREE.Vector3(cos, studH/2, sin).applyQuaternion(quaternion));
                    circleBot.push(new THREE.Vector3(cos, -studH/2, sin).applyQuaternion(quaternion));
                }

                const studLinePos = [];
                let idx = 0;
                for (const v3d of type2Verts) {
                    const a = { x: v3d[1].x - v3d[0].x, y: v3d[1].y - v3d[0].y, z: v3d[1].z - v3d[0].z };
                    const b = { x: v3d[3].x - v3d[0].x, y: v3d[3].y - v3d[0].y, z: v3d[3].z - v3d[0].z };
                    for (const [s, t] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
                        const cx = v3d[0].x + s * a.x + t * b.x + nOffset.x;
                        const cy = v3d[0].y + s * a.y + t * b.y + nOffset.y;
                        const cz = v3d[0].z + s * a.z + t * b.z + nOffset.z;
                        dummy.compose(new THREE.Vector3(cx, cy, cz), quaternion, new THREE.Vector3(1, 1, 1));
                        instancedMesh.setMatrixAt(idx++, dummy);
                        for (let i = 0; i < segments; i++) {
                            studLinePos.push(
                                cx + circleTop[i].x, cy + circleTop[i].y, cz + circleTop[i].z,
                                cx + circleTop[i+1].x, cy + circleTop[i+1].y, cz + circleTop[i+1].z,
                                cx + circleBot[i].x, cy + circleBot[i].y, cz + circleBot[i].z,
                                cx + circleBot[i+1].x, cy + circleBot[i+1].y, cz + circleBot[i+1].z
                            );
                        }
                    }
                }

                instancedMesh.instanceMatrix.needsUpdate = true;
                meshGroup.add(instancedMesh);

                if (studLinePos.length > 0) {
                    const studLineGeom = new THREE.BufferGeometry();
                    studLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(studLinePos, 3));
                    meshGroup.add(new THREE.LineSegments(studLineGeom, edgesMaterial));
                }
            }

            if (needsCenterCamera) {
                camera.position.set(-38.2, 9.9, 21.3);
                camera.zoom = 1.968;
                camera.updateProjectionMatrix();
                controls.target.set(-2.2, -8.1, 3.3);
                controls.update();
                needsCenterCamera = false;
            }
            if (renderer) renderer.render(scene, camera);
        }

        // ===== Minecraft procedural texture generation =====
        function generateMinecraftTexture(type) {
            const S = 16;
            const texCanvas = document.createElement('canvas');
            texCanvas.width = S; texCanvas.height = S;
            const tctx = texCanvas.getContext('2d');

            const noise = () => {
                const g = [];
                for (let i = 0; i < 25; i++) g.push(Math.random());
                return (x, y) => {
                    const gx = x / S * 4, gy = y / S * 4;
                    const ix = Math.floor(gx), iy = Math.floor(gy);
                    const fx = gx - ix, fy = gy - iy;
                    const v = (r, c) => g[r * 5 + c];
                    return v(iy,ix)*(1-fx)*(1-fy) + v(iy,ix+1)*fx*(1-fy) +
                           v(iy+1,ix)*(1-fx)*fy + v(iy+1,ix+1)*fx*fy;
                };
            };

            const fill = (palette, n) => {
                for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
                    const t = n(x, y) * 0.4 + Math.random() * 0.6;
                    const idx = Math.min(palette.length - 1, (t * palette.length) | 0);
                    tctx.fillStyle = palette[idx];
                    tctx.fillRect(x, y, 1, 1);
                }
            };

            if (type === 'stone') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                for (let i = 0; i < 10; i++) { tctx.fillStyle = '#4A4A4A'; tctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1); }
            } else if (type === 'dirt') {
                fill(['#5A4020','#654A2A','#6B4E30','#7A5C3A','#836442','#8B6B4A','#96785A','#9C7C5A','#A8896A'], noise());
                for (let i = 0; i < 8; i++) { tctx.fillStyle = '#4E3618'; tctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1); }
            } else if (type === 'grass') {
                fill(['#2E5510','#3A6818','#3D6B1E','#4A7A28','#52842E','#5B8C32','#68A038','#6EA03E','#7AB848','#88CC50'], noise());
                for (let i = 0; i < 8; i++) {
                    tctx.fillStyle = Math.random() < 0.5 ? '#8AD048' : '#305A12';
                    tctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1);
                }
            } else if (type === 'magma') {
                fill(['#120808','#1A0E0E','#221414','#2A1A1A','#2A1A1A','#332020','#3A2222','#442828'], noise());
                for (let i = 0; i < 5; i++) {
                    let mcx = (Math.random()*S)|0, mcy = (Math.random()*S)|0;
                    for (let s = 0; s < 3 + ((Math.random()*4)|0); s++) {
                        const mc = ['#CC4400','#FF6600','#FF9900','#FFCC00','#FFE040'];
                        tctx.fillStyle = mc[(Math.random()*mc.length)|0];
                        tctx.fillRect(mcx, mcy, 1, 1);
                        mcx += [-1,0,1][(Math.random()*3)|0];
                        mcy += [-1,0,1][(Math.random()*3)|0];
                    }
                }
            } else if (type === 'diamond') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                const ox = 3 + ((Math.random()*10)|0), oy = 3 + ((Math.random()*10)|0);
                const spots = [[0,0],[1,0],[0,1]];
                if (Math.random() < 0.7) spots.push([1,1]);
                if (Math.random() < 0.5) spots.push([-1,0]);
                if (Math.random() < 0.4) spots.push([0,-1]);
                if (Math.random() < 0.3) spots.push([2,0]);
                for (const [dx, dy] of spots) {
                    tctx.fillStyle = ['#3DCEBE','#50DED0','#6EEEDE','#88FFF0'][(Math.random()*4)|0];
                    tctx.fillRect(ox + dx, oy + dy, 1, 1);
                }
            } else if (type === 'emerald') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                const ox = 3 + ((Math.random()*10)|0), oy = 3 + ((Math.random()*10)|0);
                const spots = [[0,0],[1,0],[0,1]];
                if (Math.random() < 0.7) spots.push([1,1]);
                if (Math.random() < 0.5) spots.push([-1,0]);
                if (Math.random() < 0.4) spots.push([0,-1]);
                if (Math.random() < 0.3) spots.push([2,0],[0,2]);
                for (const [dx, dy] of spots) {
                    tctx.fillStyle = ['#1B8C1B','#2DA82D','#40C040','#55DD55'][(Math.random()*4)|0];
                    tctx.fillRect(ox + dx, oy + dy, 1, 1);
                }
            }

            const tex = new THREE.CanvasTexture(texCanvas);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        // ===== Minecraft block rendering =====
        function buildMinecraftGeometry() {
            if (!meshGroup) return;
            clearMeshGroup();
            if (currentDimers.length === 0) return;

            // Keep white background, no fog
            if (scene) {
                scene.background = new THREE.Color(0xffffff);
                scene.fog = null;
            }

            // BFS heights
            const vertexToDimers = new Map();
            for (const dimer of currentDimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }
            const heights = new Map();
            const fv = getVertexKeys(currentDimers[0]);
            const startKey = `${fv[0][0]},${fv[0][1]}`;
            heights.set(startKey, 0);
            const queue = [startKey];
            const visited = new Set();
            while (queue.length > 0) {
                const ck = queue.shift();
                if (visited.has(ck)) continue;
                visited.add(ck);
                const ch = heights.get(ck);
                const [cn, cj] = ck.split(',').map(Number);
                for (const dimer of vertexToDimers.get(ck) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);
                    let myIdx = -1;
                    for (let i = 0; i < 4; i++) {
                        if (verts[i][0] === cn && verts[i][1] === cj) { myIdx = i; break; }
                    }
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vkey = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vkey)) {
                                heights.set(vkey, ch + (pattern[i] - pattern[myIdx]));
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }

            // Compute 3D verts per tile
            const dimerV3D = [];
            for (const dimer of currentDimers) {
                const vk = getVertexKeys(dimer);
                const h0 = heights.get(`${vk[0][0]},${vk[0][1]}`);
                if (h0 === undefined) { dimerV3D.push(null); continue; }
                const pattern = getHeightPattern(dimer.t);
                const baseH = h0 - pattern[0];
                dimerV3D.push(vk.map(([n, j], i) => to3D(n, j, baseH + pattern[i])));
            }

            // Texture types and spatial hash
            const MC_TYPES = ['stone','dirt','grass','magma','diamond','emerald'];
            const hashInts = (a, b, c) => {
                let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
                h = ((h >> 16) ^ h) * 0x45d9f3b;
                h = ((h >> 16) ^ h) * 0x45d9f3b;
                return (h ^ (h >> 16)) & 0x7fffffff;
            };
            const texFromHash = (h) => {
                const r = (h % 1000) / 1000;
                if (r < 0.01) return 5;      // emerald (1%)
                if (r < 0.05) return 4;      // diamond (4%)
                if (r < 0.10) return 3;      // magma (5%)
                if (r < 0.55) return 1;      // dirt (45%)
                return 0;                    // stone (45%)
            };

            // Union-find: group tiles sharing cross-type 3D edges
            const ufP = new Int32Array(currentDimers.length);
            for (let i = 0; i < currentDimers.length; i++) ufP[i] = i;
            const ufF = (x) => { while (ufP[x] !== x) { ufP[x] = ufP[ufP[x]]; x = ufP[x]; } return x; };
            const ufU = (a, b) => { a = ufF(a); b = ufF(b); if (a !== b) ufP[a] = b; };

            const edgeToTiles = new Map();
            for (let di = 0; di < currentDimers.length; di++) {
                const v = dimerV3D[di]; if (!v) continue;
                for (let e = 0; e < 4; e++) {
                    const a = v[e], b = v[(e+1)%4];
                    const k1 = `${a.x},${a.y},${a.z}`, k2 = `${b.x},${b.y},${b.z}`;
                    const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
                    if (!edgeToTiles.has(ek)) edgeToTiles.set(ek, []);
                    edgeToTiles.get(ek).push(di);
                }
            }
            for (const [, tiles] of edgeToTiles) {
                if (tiles.length === 2 && currentDimers[tiles[0]].t !== currentDimers[tiles[1]].t) {
                    ufU(tiles[0], tiles[1]);
                }
            }

            // Assign texture per group via spatial hash of representative centroid
            const tileTexture = new Uint8Array(currentDimers.length);
            for (let di = 0; di < currentDimers.length; di++) {
                const v = dimerV3D[di]; if (!v) continue;
                const rep = ufF(di);
                const rv = dimerV3D[rep];
                const cx = Math.round((rv[0].x + rv[1].x + rv[2].x + rv[3].x) * 4);
                const cy = Math.round((rv[0].y + rv[1].y + rv[2].y + rv[3].y) * 4);
                const cz = Math.round((rv[0].z + rv[1].z + rv[2].z + rv[3].z) * 4);
                let tex = texFromHash(hashInts(cx, cy, cz));
                if (tex === 1 && currentDimers[di].t === 2) tex = 2; // grass on top of dirt
                tileTexture[di] = tex;
            }

            // Build multi-material geometry
            const geometry = new THREE.BufferGeometry();
            const verts = [], norms = [], uvs = [];
            const groupIdx = MC_TYPES.map(() => []);
            const linePositions = [];
            const gap = 0.03;

            const addQuad = (v1, v2, v3, v4, grp, uvOff) => {
                const base = verts.length / 3;
                verts.push(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z, v4.x,v4.y,v4.z);
                const e1x=v2.x-v1.x,e1y=v2.y-v1.y,e1z=v2.z-v1.z;
                const e2x=v4.x-v1.x,e2y=v4.y-v1.y,e2z=v4.z-v1.z;
                const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
                const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
                for(let i=0;i<4;i++) norms.push(nx/len,ny/len,nz/len);
                uvs.push(uvOff,uvOff, uvOff+1,uvOff, uvOff+1,uvOff+1, uvOff,uvOff+1);
                groupIdx[grp].push(base,base+1,base+2, base,base+2,base+3);
            };

            for (let di = 0; di < currentDimers.length; di++) {
                const v3d = dimerV3D[di];
                if (!v3d) continue;
                const grp = tileTexture[di];
                const uvOff = (di * 0.37) % 1;

                // Shrink toward centroid for gap
                const cx = (v3d[0].x+v3d[1].x+v3d[2].x+v3d[3].x)/4;
                const cy = (v3d[0].y+v3d[1].y+v3d[2].y+v3d[3].y)/4;
                const cz = (v3d[0].z+v3d[1].z+v3d[2].z+v3d[3].z)/4;
                const s = v3d.map(v => ({
                    x: v.x + (cx-v.x)*gap, y: v.y + (cy-v.y)*gap, z: v.z + (cz-v.z)*gap
                }));

                addQuad(s[0], s[1], s[2], s[3], grp, uvOff);

                for (let e = 0; e < 4; e++) {
                    const a = s[e], b = s[(e+1)%4];
                    linePositions.push(a.x,a.y,a.z, b.x,b.y,b.z);
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            const allIdx = [];
            const materials = [];
            for (let g = 0; g < MC_TYPES.length; g++) {
                const start = allIdx.length;
                for (const idx of groupIdx[g]) allIdx.push(idx);
                if (groupIdx[g].length > 0) {
                    geometry.addGroup(start, groupIdx[g].length, materials.length);
                    materials.push(new THREE.MeshLambertMaterial({
                        map: generateMinecraftTexture(MC_TYPES[g]),
                        side: THREE.DoubleSide,
                        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
                    }));
                }
            }
            geometry.setIndex(allIdx);
            geometry.computeBoundingSphere();
            currentMaterial = null;
            meshGroup.add(new THREE.Mesh(geometry, materials));

            // Dark grid edge lines
            const lineGeom = new THREE.BufferGeometry();
            lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            meshGroup.add(new THREE.LineSegments(lineGeom,
                new THREE.LineBasicMaterial({ color: 0x1a1a1a, linewidth: 2 })));

            if (needsCenterCamera) {
                camera.position.set(-38.2, 9.9, 21.3);
                camera.zoom = 1.968;
                camera.updateProjectionMatrix();
                controls.target.set(-2.2, -8.1, 3.3);
                controls.update();
                needsCenterCamera = false;
            }
            if (renderer) renderer.render(scene, camera);
        }

        let isRunning = false;
        let animationId = null;
        let autoRotate = false;
        const rotateSpeed = 0.012;
        let currentMaterial = null;
        let renderMode = 'standard';

        function regenerate() {
            sampleHexagon(currentA, B, C);
            if (renderMode === 'lego') buildLegoGeometry();
            else if (renderMode === 'minecraft') buildMinecraftGeometry();
            else buildGeometry();
            if (currentA === 1) {
                descEl.innerHTML = `surface in <span id="bridge-box-size">1 × 12 × 9</span> box = 2D path in 12 × 9 rectangle`;
            } else {
                descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">${currentA} × 12 × 9</span> box`;
            }
            if (renderer) renderer.render(scene, camera);
        }

        function animate() {
            if (!isRunning || !renderer || !camera || !controls) return;

            if (autoRotate) {
                const axis = camera.up.clone().normalize();
                const offset = camera.position.clone().sub(controls.target);
                offset.applyAxisAngle(axis, rotateSpeed);
                camera.position.copy(controls.target).add(offset);
                camera.lookAt(controls.target);
            }

            controls.update();
            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        }

        function start() {
            if (isRunning) return;
            isRunning = true;
            animate();
        }

        function pause() {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        function startAutoRotate() {
            autoRotate = true;
            if (!isRunning) start();
        }

        function stopAutoRotate() {
            autoRotate = false;
        }

        function setLayerCount(a) {
            currentA = Math.max(1, Math.min(9, a));
            regenerate();
        }

        // Register with slide engine
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('2to3d', {
                    start,
                    pause,
                    steps: 14,
                    onSlideEnter() {
                        initThreeJS();
                        renderMode = 'standard';
                        needsCenterCamera = true;
                        stopAutoRotate();

                        setTimeout(() => {
                            resize();
                            regenerate();
                            if (renderer) renderer.render(scene, camera);
                            if (window.bridgeSnowflake) {
                                window.bridgeSnowflake.resize();
                                window.bridgeSnowflake.render();
                            }
                        }, 50);
                        start();
                    },
                    onSlideLeave() {
                        stopAutoRotate();
                        pause();
                        disposeThreeJS();
                    },
                    reset() {
                        stopAutoRotate();
                        renderMode = 'standard';
                        currentA = 1;
                        needsCenterCamera = true;
                        const macmahonEl = document.getElementById('macmahon-text');
                        const macmahonExEl = document.getElementById('macmahon-example');
                        const snowflakeTitleEl = document.getElementById('snowflake-title');
                        const snowflakeDescEl = document.getElementById('snowflake-description');
                        if (macmahonEl) macmahonEl.style.opacity = '0';
                        if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                        if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                        if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                    },
                    // Step flow: 0=layer1, 1=LEGO(1), 2-9=LEGO(2-9), 10=MC(9), 11=rotate, 12=MacMahon, 13=snowflake, 14=sample
                    onStep(step) {
                        const macmahonEl = document.getElementById('macmahon-text');
                        const macmahonExEl = document.getElementById('macmahon-example');
                        if (step === 0) {
                            stopAutoRotate();
                            renderMode = 'standard';
                            setLayerCount(1);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step === 1) {
                            // Switch to LEGO (layer 1)
                            stopAutoRotate();
                            renderMode = 'lego';
                            if (currentA !== 1 || currentDimers.length === 0) {
                                currentA = 1;
                                sampleHexagon(1, B, C);
                            }
                            buildLegoGeometry();
                            descEl.innerHTML = `surface in <span id="bridge-box-size">1 × 12 × 9</span> box = 2D path in 12 × 9 rectangle`;
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step >= 2 && step <= 9) {
                            // Layers 2-9 (LEGO skin)
                            stopAutoRotate();
                            renderMode = 'lego';
                            setLayerCount(step);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step === 10) {
                            // Minecraft mode (layer 9)
                            stopAutoRotate();
                            renderMode = 'minecraft';
                            if (currentA !== 9 || currentDimers.length === 0) {
                                currentA = 9;
                                sampleHexagon(9, B, C);
                            }
                            buildMinecraftGeometry();
                            descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">9 × 12 × 9</span> box`;
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step === 11) {
                            // Standard + auto-rotate
                            renderMode = 'standard';
                            // Reset camera up for predictable rotation axis
                            if (camera) camera.up.set(0, 0, 1);
                            if (currentA !== 9 || currentDimers.length === 0) {
                                currentA = 9;
                                sampleHexagon(9, B, C);
                            }
                            buildGeometry();
                            descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">9 × 12 × 9</span> box`;
                            startAutoRotate();
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step === 12) {
                            stopAutoRotate();
                            if (macmahonEl) macmahonEl.style.opacity = '1';
                            if (macmahonExEl) macmahonExEl.style.opacity = '1';
                            if (window.MathJax) MathJax.typeset();
                        } else if (step === 13 && window.bridgeSnowflake) {
                            stopAutoRotate();
                            document.getElementById('snowflake-title').style.opacity = '1';
                            window.bridgeSnowflake.showRegion();
                        } else if (step === 14 && window.bridgeSnowflake) {
                            const descEl = document.getElementById('snowflake-description');
                            if (descEl) descEl.textContent = 'picking one uniformly at random...';
                            setTimeout(() => {
                                window.bridgeSnowflake.regenerate();
                                if (descEl) descEl.textContent = 'picking one uniformly at random... done';
                            }, 50);
                        }
                    },
                    onStepBack(step) {
                        const macmahonEl = document.getElementById('macmahon-text');
                        const macmahonExEl = document.getElementById('macmahon-example');
                        const snowflakeTitleEl = document.getElementById('snowflake-title');
                        const snowflakeDescEl = document.getElementById('snowflake-description');
                        if (step === 0) {
                            stopAutoRotate();
                            renderMode = 'standard';
                            setLayerCount(1);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 1) {
                            // LEGO (layer 1)
                            stopAutoRotate();
                            renderMode = 'lego';
                            if (currentA !== 1 || currentDimers.length === 0) {
                                currentA = 1;
                                sampleHexagon(1, B, C);
                            }
                            buildLegoGeometry();
                            descEl.innerHTML = `surface in <span id="bridge-box-size">1 × 12 × 9</span> box = 2D path in 12 × 9 rectangle`;
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step >= 2 && step <= 9) {
                            // Layers 2-9 (LEGO skin)
                            stopAutoRotate();
                            renderMode = 'lego';
                            setLayerCount(step);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 10) {
                            // Minecraft mode (layer 9)
                            stopAutoRotate();
                            renderMode = 'minecraft';
                            if (currentA !== 9 || currentDimers.length === 0) {
                                currentA = 9;
                                sampleHexagon(9, B, C);
                            }
                            buildMinecraftGeometry();
                            descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">9 × 12 × 9</span> box`;
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 11) {
                            // Standard + auto-rotate
                            renderMode = 'standard';
                            // Reset camera up for predictable rotation axis
                            if (camera) camera.up.set(0, 0, 1);
                            if (currentA !== 9 || currentDimers.length === 0) {
                                currentA = 9;
                                sampleHexagon(9, B, C);
                            }
                            buildGeometry();
                            descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">9 × 12 × 9</span> box`;
                            startAutoRotate();
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 12) {
                            if (macmahonEl) macmahonEl.style.opacity = '1';
                            if (macmahonExEl) macmahonExEl.style.opacity = '1';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 13 && window.bridgeSnowflake) {
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '1';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            window.bridgeSnowflake.showRegion();
                        }
                    }
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

// ===== Snowflake Visualization (2D Canvas) =====
function init2to3dSnowflakeSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('bridge-snowflake-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Wait for LozengeModule
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create separate WASM instance for snowflake
        const wasm = await LozengeModule();
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);

        // Load snowflake triangles
        let snowflakeTriangles = null;
        try {
            const resp = await fetch('/letters/big_snoflake.json');
            const data = await resp.json();
            snowflakeTriangles = data.triangles;
        } catch (e) {
            return;
        }

        let currentDimers = [];
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);
        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getLozengeVerts(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [getVertex(bn, bj), getVertex(bn+1, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            } else if (t === 1) {
                return [getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn+1, bj-2), getVertex(bn, bj-1)];
            } else {
                return [getVertex(bn-1, bj), getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            }
        }

        function toCanvas(x, y, centerX, centerY, scale) {
            return [centerX + x * scale, centerY - y * scale];
        }

        function computeBounds() {
            if (currentDimers.length === 0) return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const d of currentDimers) {
                const verts = getLozengeVerts(d);
                for (const v of verts) {
                    if (v.x < minX) minX = v.x;
                    if (v.x > maxX) maxX = v.x;
                    if (v.y < minY) minY = v.y;
                    if (v.y > maxY) maxY = v.y;
                }
            }
            return { minX, maxX, minY, maxY };
        }

        function resize() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', () => { resize(); draw(); });

        function draw() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            if (currentDimers.length === 0) return;

            const bounds = computeBounds();
            const worldW = bounds.maxX - bounds.minX;
            const worldH = bounds.maxY - bounds.minY;
            const padding = 0.1;
            const scale = Math.min(w / (worldW * (1 + padding)), h / (worldH * (1 + padding)));
            const centerX = w / 2 - (bounds.minX + bounds.maxX) / 2 * scale;
            const centerY = h / 2 + (bounds.minY + bounds.maxY) / 2 * scale;

            for (const d of currentDimers) {
                const verts = getLozengeVerts(d);
                const canvasVerts = verts.map(v => toCanvas(v.x, v.y, centerX, centerY, scale));

                ctx.fillStyle = colors[d.t];
                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                for (let i = 1; i < canvasVerts.length; i++) {
                    ctx.lineTo(canvasVerts[i][0], canvasVerts[i][1]);
                }
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#222222';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        function getMinimalTiling() {
            if (!snowflakeTriangles) {
                currentDimers = [];
                return;
            }

            const triArr = [];
            for (const tri of snowflakeTriangles) {
                triArr.push(tri.n, tri.j, tri.type);
            }

            const ptr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) {
                wasm.setValue(ptr + i * 4, triArr[i], 'i32');
            }

            initFromTriangles(ptr, triArr.length);
            wasm._free(ptr);

            const strPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(strPtr);
            freeString(strPtr);

            try {
                const parsed = JSON.parse(jsonStr);
                currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
            } catch (e) {
                currentDimers = [];
            }
        }

        function sampleSnowflake() {
            if (!snowflakeTriangles) {
                currentDimers = [];
                return;
            }

            runCFTP();

            const strPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(strPtr);
            freeString(strPtr);

            try {
                const parsed = JSON.parse(jsonStr);
                currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
            } catch (e) {
                currentDimers = [];
            }
        }

        let hasSampled = false;

        function showRegion() {
            getMinimalTiling();
            draw();
        }

        function regenerate() {
            sampleSnowflake();
            draw();
            hasSampled = true;
        }

        function clear() {
            currentDimers = [];
            hasSampled = false;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
        }

        // Expose for step control
        window.bridgeSnowflake = {
            showRegion,
            regenerate,
            resize,
            clear,
            render: draw,
            hasSampled: () => hasSampled
        };
    })();
}

// Initialize when WASM is loaded
if (typeof LozengeModule !== 'undefined') {
    init2to3dHexagonSim();
    init2to3dSnowflakeSim();
} else {
    window.addEventListener('wasm-loaded', () => {
        init2to3dHexagonSim();
        init2to3dSnowflakeSim();
    }, { once: true });
}
