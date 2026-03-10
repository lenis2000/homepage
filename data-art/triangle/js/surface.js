// Triangle data-art surface — Three.js surface mesh building from dimers
(function() {
    'use strict';

    // ========================================================================
    // 3D GEOMETRY HELPERS — dimer-to-3D conversion
    // ========================================================================
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

    function computeHeights(dimers) {
        if (!dimers || dimers.length === 0) return new Map();

        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            for (const [n, j] of getVertexKeys(dimer)) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        const heights = new Map();
        const firstVerts = getVertexKeys(dimers[0]);
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
        return heights;
    }

    // ========================================================================
    // SURFACE BUILDER — manages Three.js mesh state for the lozenge surface
    // ========================================================================
    class SurfaceBuilder {
        constructor() {
            this.surfaceGeo = null;
            this.surfaceMesh = null;
            this.edgeLines = null;
            this.colorObjs3D = window.TriangleConfig.LOZENGE_COLORS_3D.map(c => new THREE.Color(c));
            this.sceneCenter = { x: 0, y: 0, z: 0 };
            this.sceneSize = 10;
        }

        fillSurfaceBuffers(dimers, pos, norm, col) {
            const heights = computeHeights(dimers);
            const numDimers = dimers.length;

            for (let d = 0; d < numDimers; d++) {
                const dimer = dimers[d];
                const verts = getVertexKeys(dimer);
                const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`) || 0;
                const pat = getHeightPattern(dimer.t);
                const baseH = h0 - pat[0];
                const v3d = verts.map(([n, j], idx) => to3D(n, j, baseH + pat[idx]));

                const base = d * 12;
                for (let vi = 0; vi < 4; vi++) {
                    pos[base + vi * 3]     = v3d[vi].x;
                    pos[base + vi * 3 + 1] = v3d[vi].y;
                    pos[base + vi * 3 + 2] = v3d[vi].z;
                }

                const e1x = v3d[1].x - v3d[0].x, e1y = v3d[1].y - v3d[0].y, e1z = v3d[1].z - v3d[0].z;
                const e2x = v3d[3].x - v3d[0].x, e2y = v3d[3].y - v3d[0].y, e2z = v3d[3].z - v3d[0].z;
                let nx = e1y * e2z - e1z * e2y;
                let ny = e1z * e2x - e1x * e2z;
                let nz = e1x * e2y - e1y * e2x;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                nx /= len; ny /= len; nz /= len;
                for (let vi = 0; vi < 4; vi++) {
                    norm[base + vi * 3]     = nx;
                    norm[base + vi * 3 + 1] = ny;
                    norm[base + vi * 3 + 2] = nz;
                }

                const clr = this.colorObjs3D[dimer.t];
                for (let vi = 0; vi < 4; vi++) {
                    col[base + vi * 3]     = clr.r;
                    col[base + vi * 3 + 1] = clr.g;
                    col[base + vi * 3 + 2] = clr.b;
                }
            }
        }

        buildSurfaceMesh(dimers, withEdges, meshGroup, surfaceMaterial, edgeMaterial) {
            const numDimers = dimers.length;
            const positions = new Float32Array(numDimers * 4 * 3);
            const normals = new Float32Array(numDimers * 4 * 3);
            const colors = new Float32Array(numDimers * 4 * 3);

            this.fillSurfaceBuffers(dimers, positions, normals, colors);

            if (!this.surfaceGeo) {
                this.surfaceGeo = new THREE.BufferGeometry();
                this.surfaceGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                this.surfaceGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                this.surfaceGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const indices = new Uint32Array(numDimers * 6);
                for (let d = 0; d < numDimers; d++) {
                    const bi = d * 4;
                    indices[d * 6]     = bi;
                    indices[d * 6 + 1] = bi + 1;
                    indices[d * 6 + 2] = bi + 2;
                    indices[d * 6 + 3] = bi;
                    indices[d * 6 + 4] = bi + 2;
                    indices[d * 6 + 5] = bi + 3;
                }
                this.surfaceGeo.setIndex(new THREE.BufferAttribute(indices, 1));

                this.surfaceMesh = new THREE.Mesh(this.surfaceGeo, surfaceMaterial);
                meshGroup.add(this.surfaceMesh);
            } else {
                this.surfaceGeo.attributes.position.array.set(positions);
                this.surfaceGeo.attributes.position.needsUpdate = true;
                this.surfaceGeo.attributes.normal.array.set(normals);
                this.surfaceGeo.attributes.normal.needsUpdate = true;
                this.surfaceGeo.attributes.color.array.set(colors);
                this.surfaceGeo.attributes.color.needsUpdate = true;
            }

            if (withEdges) {
                if (this.edgeLines) {
                    meshGroup.remove(this.edgeLines);
                    this.edgeLines.geometry.dispose();
                }
                const edgesGeo = new THREE.EdgesGeometry(this.surfaceGeo, 10);
                this.edgeLines = new THREE.LineSegments(edgesGeo, edgeMaterial);
                meshGroup.add(this.edgeLines);
            } else if (this.edgeLines) {
                meshGroup.remove(this.edgeLines);
                this.edgeLines.geometry.dispose();
                this.edgeLines = null;
            }
        }

        updateSurfaceInPlace(dimers) {
            if (!this.surfaceGeo) return;
            this.fillSurfaceBuffers(
                dimers,
                this.surfaceGeo.attributes.position.array,
                this.surfaceGeo.attributes.normal.array,
                this.surfaceGeo.attributes.color.array
            );
            this.surfaceGeo.attributes.position.needsUpdate = true;
            this.surfaceGeo.attributes.normal.needsUpdate = true;
            this.surfaceGeo.attributes.color.needsUpdate = true;
        }

        positionCamera(dimers, camera, controls, canvas) {
            var TC = window.TriangleConfig;
            const heights = computeHeights(dimers);
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

            this.sceneCenter.x = (minX + maxX) / 2;
            this.sceneCenter.y = (minY + maxY) / 2;
            this.sceneCenter.z = (minZ + maxZ) / 2;
            this.sceneSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;

            const d = 1 / Math.sqrt(3);
            camera.position.set(
                this.sceneCenter.x + d * this.sceneSize * 5,
                this.sceneCenter.y - d * this.sceneSize * 5,
                this.sceneCenter.z - d * this.sceneSize * 5
            );
            controls.target.set(this.sceneCenter.x, this.sceneCenter.y, this.sceneCenter.z);
            camera.updateProjectionMatrix();
            controls.update();

            camera.updateMatrixWorld();
            const cRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
            const cUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
            let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
            for (const [key, h] of heights) {
                const [n, j] = key.split(',').map(Number);
                const p = to3D(n, j, h);
                const dx = p.x - this.sceneCenter.x, dy = p.y - this.sceneCenter.y, dz = p.z - this.sceneCenter.z;
                const u = dx * cRight.x + dy * cRight.y + dz * cRight.z;
                const v = dx * cUp.x + dy * cUp.y + dz * cUp.z;
                minU = Math.min(minU, u); maxU = Math.max(maxU, u);
                minV = Math.min(minV, v); maxV = Math.max(maxV, v);
            }

            const aspect = canvas.clientWidth / canvas.clientHeight || 1;
            const projW = maxU - minU;
            const projH = maxV - minV;
            const viewW = TC.frustumSize * aspect;
            const viewH = TC.frustumSize;
            const margin = 1.05;
            camera.zoom = Math.min(viewW / (projW * margin), viewH / (projH * margin));
            camera.updateProjectionMatrix();
            controls.update();
        }

        computeTargets(dimers) {
            const heights = computeHeights(dimers);
            const targets = new Float32Array(dimers.length * 3);
            for (let i = 0; i < dimers.length; i++) {
                const verts = getVertexKeys(dimers[i]);
                const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`) || 0;
                const pattern = getHeightPattern(dimers[i].t);
                const baseH = h0 - pattern[0];
                let cx = 0, cy = 0, cz = 0;
                for (let vi = 0; vi < 4; vi++) {
                    const p = to3D(verts[vi][0], verts[vi][1], baseH + pattern[vi]);
                    cx += p.x; cy += p.y; cz += p.z;
                }
                targets[i * 3] = cx / 4;
                targets[i * 3 + 1] = cy / 4;
                targets[i * 3 + 2] = cz / 4;
            }
            return targets;
        }

        dispose(meshGroup) {
            if (this.edgeLines) {
                meshGroup.remove(this.edgeLines);
                this.edgeLines.geometry.dispose();
                this.edgeLines = null;
            }
            if (this.surfaceMesh) {
                meshGroup.remove(this.surfaceMesh);
                this.surfaceMesh = null;
            }
            if (this.surfaceGeo) {
                this.surfaceGeo.dispose();
                this.surfaceGeo = null;
            }
        }
    }

    window.SurfaceBuilder = SurfaceBuilder;
})();
