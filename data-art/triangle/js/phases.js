// Triangle data-art phases — flying cubes, assembly, frozen orbit, text screen
(function() {
    'use strict';

    var TC = window.TriangleConfig;

    // ========================================================================
    // SPATIAL HASH for 2D collision detection
    // ========================================================================
    class SpatialHash2D {
        constructor(cellSize) {
            this.inv = 1 / cellSize;
            this.grid = new Map();
        }
        clear() { this.grid.clear(); }
        insert(idx, x, y) {
            const k = `${Math.floor(x * this.inv)},${Math.floor(y * this.inv)}`;
            let cell = this.grid.get(k);
            if (!cell) { cell = []; this.grid.set(k, cell); }
            cell.push(idx);
        }
        query(x, y) {
            const cx = Math.floor(x * this.inv);
            const cy = Math.floor(y * this.inv);
            const result = [];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cell = this.grid.get(`${cx + dx},${cy + dy}`);
                    if (cell) for (let i = 0; i < cell.length; i++) result.push(cell[i]);
                }
            }
            return result;
        }
    }

    // ========================================================================
    // FLYING CUBES MANAGER — InstancedMesh in camera view plane
    // ========================================================================
    class FlyingCubesManager {
        constructor() {
            this.cubesMesh = null;
            this.cubePositions = null;
            this.cubePos2D = null;
            this.cubeVel2D = null;
            this.cubeDepth = null;
            this.cubeRotations = null;
            this.cubeAngVel = null;
            this.cubeFlying = null;
            this.cubeTargets = null;
            this.cubeTargets2D = null;
            this.cubeTargetDepth = null;
            this.camRight = null;
            this.camUp = null;
            this.camForward = null;
            this.cubeHalfW = 0;
            this.cubeHalfH = 0;
            this._spatialHash = new SpatialHash2D(TC.CUBE_SIZE * 2);
            this._dummy = new THREE.Object3D();
        }

        setTargets(targets) {
            this.cubeTargets = targets;
        }

        init(dimers, camera, controls, canvas, meshGroup) {
            var numCubes = dimers.length;
            var colorObjs3D = TC.LOZENGE_COLORS_3D.map(function(c) { return new THREE.Color(c); });

            camera.updateMatrixWorld();
            this.camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
            this.camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
            this.camForward = new THREE.Vector3();
            camera.getWorldDirection(this.camForward);

            var aspect = canvas.clientWidth / canvas.clientHeight || 1;
            var visW = TC.frustumSize * aspect / camera.zoom;
            var visH = TC.frustumSize / camera.zoom;
            this.cubeHalfW = visW * 1.2;
            this.cubeHalfH = visH * 1.2;
            var depthRange = visW * 0.08;

            this.cubePos2D = new Float32Array(numCubes * 2);
            this.cubeVel2D = new Float32Array(numCubes * 2);
            this.cubeDepth = new Float32Array(numCubes);
            this.cubePositions = new Float32Array(numCubes * 3);
            this.cubeRotations = new Float32Array(numCubes * 3);
            this.cubeAngVel = new Float32Array(numCubes * 3);
            this.cubeFlying = new Uint8Array(numCubes);

            this._computeTargets2D(controls);

            for (var i = 0; i < numCubes; i++) this.cubeFlying[i] = 1;

            for (var i = 0; i < numCubes; i++) {
                this.cubePos2D[i * 2]     = (Math.random() - 0.5) * visW * 0.9;
                this.cubePos2D[i * 2 + 1] = (Math.random() - 0.5) * visH * 0.9;
                this.cubeDepth[i] = (Math.random() - 0.5) * depthRange;
                var speed = 1.5 + Math.random() * 3;
                var angle = Math.random() * Math.PI * 2;
                this.cubeVel2D[i * 2]     = speed * Math.cos(angle);
                this.cubeVel2D[i * 2 + 1] = speed * Math.sin(angle);
                this.cubeRotations[i * 3]     = Math.random() * Math.PI * 2;
                this.cubeRotations[i * 3 + 1] = Math.random() * Math.PI * 2;
                this.cubeRotations[i * 3 + 2] = Math.random() * Math.PI * 2;
                this.cubeAngVel[i * 3]     = (Math.random() - 0.5) * 0.8;
                this.cubeAngVel[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
                this.cubeAngVel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
            }

            this._updatePos2Dto3D(controls);

            var geo = new THREE.BoxGeometry(TC.CUBE_SIZE, TC.CUBE_SIZE, TC.CUBE_SIZE);
            var mat = new THREE.MeshStandardMaterial({
                roughness: 0.4, metalness: 0.2
            });
            this.cubesMesh = new THREE.InstancedMesh(geo, mat, numCubes);

            for (var i = 0; i < numCubes; i++) {
                this.cubesMesh.setColorAt(i, colorObjs3D[dimers[i].t]);
            }
            this.cubesMesh.instanceColor.needsUpdate = true;

            this._updateMatrices();
            meshGroup.add(this.cubesMesh);
        }

        _computeTargets2D(controls) {
            if (!this.cubeTargets || !this.camRight || !this.camUp || !this.camForward) return;
            var n = this.cubeTargets.length / 3;
            this.cubeTargets2D = new Float32Array(n * 2);
            this.cubeTargetDepth = new Float32Array(n);
            var tx = controls.target.x, ty = controls.target.y, tz = controls.target.z;
            for (var i = 0; i < n; i++) {
                var dx = this.cubeTargets[i * 3] - tx;
                var dy = this.cubeTargets[i * 3 + 1] - ty;
                var dz = this.cubeTargets[i * 3 + 2] - tz;
                this.cubeTargets2D[i * 2]     = dx * this.camRight.x + dy * this.camRight.y + dz * this.camRight.z;
                this.cubeTargets2D[i * 2 + 1] = dx * this.camUp.x + dy * this.camUp.y + dz * this.camUp.z;
                this.cubeTargetDepth[i]       = dx * this.camForward.x + dy * this.camForward.y + dz * this.camForward.z;
            }
        }

        _updatePos2Dto3D(controls) {
            if (!this.cubePos2D || !this.camRight || !this.camUp) return;
            var n = this.cubePos2D.length / 2;
            var tx = controls.target.x, ty = controls.target.y, tz = controls.target.z;
            for (var i = 0; i < n; i++) {
                var u = this.cubePos2D[i * 2];
                var v = this.cubePos2D[i * 2 + 1];
                var w = this.cubeDepth[i];
                this.cubePositions[i * 3]     = tx + u * this.camRight.x + v * this.camUp.x + w * this.camForward.x;
                this.cubePositions[i * 3 + 1] = ty + u * this.camRight.y + v * this.camUp.y + w * this.camForward.y;
                this.cubePositions[i * 3 + 2] = tz + u * this.camRight.z + v * this.camUp.z + w * this.camForward.z;
            }
        }

        _updateMatrices() {
            if (!this.cubesMesh) return;
            var n = this.cubesMesh.count;
            var dummy = this._dummy;
            for (var i = 0; i < n; i++) {
                if (this.cubeFlying && this.cubeFlying[i] === 0) {
                    dummy.scale.set(0, 0, 0);
                    dummy.position.set(0, 0, 0);
                    dummy.rotation.set(0, 0, 0);
                } else {
                    dummy.scale.set(1, 1, 1);
                    dummy.position.set(
                        this.cubePositions[i * 3],
                        this.cubePositions[i * 3 + 1],
                        this.cubePositions[i * 3 + 2]
                    );
                    if (this.cubeRotations) {
                        dummy.rotation.set(
                            this.cubeRotations[i * 3],
                            this.cubeRotations[i * 3 + 1],
                            this.cubeRotations[i * 3 + 2]
                        );
                    } else {
                        dummy.rotation.set(0, 0, 0);
                    }
                }
                dummy.updateMatrix();
                this.cubesMesh.setMatrixAt(i, dummy.matrix);
            }
            this.cubesMesh.instanceMatrix.needsUpdate = true;
        }

        updateFlyingPhysics(dt, controls) {
            if (!this.cubePos2D || !this.cubesMesh) return;
            var n = this.cubesMesh.count;
            var pos = this.cubePos2D;
            var vel = this.cubeVel2D;

            // Integrate 2D positions and rotations (flying cubes only)
            for (var i = 0; i < n; i++) {
                if (!this.cubeFlying || !this.cubeFlying[i]) continue;
                pos[i * 2]     += vel[i * 2] * dt;
                pos[i * 2 + 1] += vel[i * 2 + 1] * dt;
                this.cubeRotations[i * 3]     += this.cubeAngVel[i * 3] * dt;
                this.cubeRotations[i * 3 + 1] += this.cubeAngVel[i * 3 + 1] * dt;
                this.cubeRotations[i * 3 + 2] += this.cubeAngVel[i * 3 + 2] * dt;
            }

            // Wall bounce
            for (var i = 0; i < n; i++) {
                if (!this.cubeFlying || !this.cubeFlying[i]) continue;
                if (pos[i * 2] < -this.cubeHalfW) { pos[i * 2] = -this.cubeHalfW; vel[i * 2] = Math.abs(vel[i * 2]); }
                if (pos[i * 2] > this.cubeHalfW)  { pos[i * 2] = this.cubeHalfW;  vel[i * 2] = -Math.abs(vel[i * 2]); }
                if (pos[i * 2 + 1] < -this.cubeHalfH) { pos[i * 2 + 1] = -this.cubeHalfH; vel[i * 2 + 1] = Math.abs(vel[i * 2 + 1]); }
                if (pos[i * 2 + 1] > this.cubeHalfH)  { pos[i * 2 + 1] = this.cubeHalfH;  vel[i * 2 + 1] = -Math.abs(vel[i * 2 + 1]); }
            }

            // 2D collision detection via spatial hash
            this._spatialHash.clear();
            for (var i = 0; i < n; i++) {
                if (!this.cubeFlying || !this.cubeFlying[i]) continue;
                this._spatialHash.insert(i, pos[i * 2], pos[i * 2 + 1]);
            }

            for (var a = 0; a < n; a++) {
                if (!this.cubeFlying || !this.cubeFlying[a]) continue;
                var neighbors = this._spatialHash.query(pos[a * 2], pos[a * 2 + 1]);
                for (var ni = 0; ni < neighbors.length; ni++) {
                    var b = neighbors[ni];
                    if (b <= a) continue;
                    if (!this.cubeFlying || !this.cubeFlying[b]) continue;
                    var dx = pos[b * 2] - pos[a * 2];
                    var dy = pos[b * 2 + 1] - pos[a * 2 + 1];
                    var dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < TC.CUBE_SIZE && dist > 0.001) {
                        var nx = dx / dist, ny = dy / dist;
                        var dvx = vel[a * 2] - vel[b * 2];
                        var dvy = vel[a * 2 + 1] - vel[b * 2 + 1];
                        var vn = dvx * nx + dvy * ny;

                        if (vn > 0) {
                            vel[a * 2]     -= vn * nx;
                            vel[a * 2 + 1] -= vn * ny;
                            vel[b * 2]     += vn * nx;
                            vel[b * 2 + 1] += vn * ny;
                            var overlap = (TC.CUBE_SIZE - dist) * 0.5;
                            pos[a * 2]     -= overlap * nx;
                            pos[a * 2 + 1] -= overlap * ny;
                            pos[b * 2]     += overlap * nx;
                            pos[b * 2 + 1] += overlap * ny;
                            var kick = vn * 0.3;
                            this.cubeAngVel[a * 3]     += (Math.random() - 0.5) * kick;
                            this.cubeAngVel[a * 3 + 1] += (Math.random() - 0.5) * kick;
                            this.cubeAngVel[b * 3]     += (Math.random() - 0.5) * kick;
                            this.cubeAngVel[b * 3 + 1] += (Math.random() - 0.5) * kick;
                        }
                    }
                }
            }

            this._updatePos2Dto3D(controls);
            this._updateMatrices();
        }

        updateAssemblyPhysics(dt, progress, controls) {
            if (!this.cubePos2D || !this.cubesMesh) return;
            var n = this.cubesMesh.count;
            var pos = this.cubePos2D;
            var vel = this.cubeVel2D;

            var p3 = progress * progress * progress;
            var springK = 3 + p3 * 30;
            var damping = 1 + p3 * 8;
            var angDamp = 3 + progress * 15;

            for (var i = 0; i < n; i++) {
                if (this.cubeFlying[i] !== 1) continue;
                var dxT = this.cubeTargets2D[i * 2] - pos[i * 2];
                var dyT = this.cubeTargets2D[i * 2 + 1] - pos[i * 2 + 1];
                vel[i * 2]     += dxT * springK * dt;
                vel[i * 2 + 1] += dyT * springK * dt;
                vel[i * 2]     *= Math.max(0, 1 - damping * dt);
                vel[i * 2 + 1] *= Math.max(0, 1 - damping * dt);
                this.cubeDepth[i] += (this.cubeTargetDepth[i] - this.cubeDepth[i]) * springK * dt;
            }

            for (var i = 0; i < n; i++) {
                if (this.cubeFlying[i] !== 1) continue;
                pos[i * 2]     += vel[i * 2] * dt;
                pos[i * 2 + 1] += vel[i * 2 + 1] * dt;
                var af = Math.max(0, 1 - angDamp * dt);
                this.cubeAngVel[i * 3]     *= af;
                this.cubeAngVel[i * 3 + 1] *= af;
                this.cubeAngVel[i * 3 + 2] *= af;
                this.cubeRotations[i * 3]     += this.cubeAngVel[i * 3] * dt;
                this.cubeRotations[i * 3 + 1] += this.cubeAngVel[i * 3 + 1] * dt;
                this.cubeRotations[i * 3 + 2] += this.cubeAngVel[i * 3 + 2] * dt;
                var rotPull = Math.min(1, angDamp * 0.5 * dt);
                this.cubeRotations[i * 3]     *= (1 - rotPull);
                this.cubeRotations[i * 3 + 1] *= (1 - rotPull);
                this.cubeRotations[i * 3 + 2] *= (1 - rotPull);
            }

            // Snap rotations to zero in final 10%
            if (progress > 0.9) {
                var snap = (progress - 0.9) / 0.1;
                for (var i = 0; i < n; i++) {
                    if (this.cubeFlying[i] !== 1) continue;
                    this.cubeRotations[i * 3]     *= (1 - snap);
                    this.cubeRotations[i * 3 + 1] *= (1 - snap);
                    this.cubeRotations[i * 3 + 2] *= (1 - snap);
                }
            }

            this._updatePos2Dto3D(controls);
            this._updateMatrices();
        }

        dispose(meshGroup) {
            if (this.cubesMesh) {
                meshGroup.remove(this.cubesMesh);
                this.cubesMesh.geometry.dispose();
                this.cubesMesh.material.dispose();
                this.cubesMesh = null;
            }
            this.cubePositions = null;
            this.cubePos2D = null;
            this.cubeVel2D = null;
            this.cubeDepth = null;
            this.cubeRotations = null;
            this.cubeAngVel = null;
            this.cubeFlying = null;
            this.cubeTargets = null;
            this.cubeTargets2D = null;
            this.cubeTargetDepth = null;
            this.camRight = null;
            this.camUp = null;
            this.camForward = null;
        }
    }

    // ========================================================================
    // FROZEN ORBIT — camera rotation around the surface
    // ========================================================================
    function setFrozenRotation(angle, camera, controls) {
        if (!camera || !controls) return;
        var dist = camera.position.distanceTo(controls.target);
        var baseDir = new THREE.Vector3(1, -1, -1).normalize();
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        var rx = baseDir.x * cosA - baseDir.y * sinA;
        var ry = baseDir.x * sinA + baseDir.y * cosA;
        var rz = baseDir.z;
        camera.position.set(
            controls.target.x + rx * dist,
            controls.target.y + ry * dist,
            controls.target.z + rz * dist
        );
        camera.lookAt(controls.target);
    }

    function getFrozenAction(elapsed) {
        var totalDuration = TC.ROTATION_DURATION + TC.PAUSE_DURATION + TC.ROTATION_DURATION;
        if (elapsed < TC.ROTATION_DURATION) {
            return { action: 'rotating', angle: (elapsed / TC.ROTATION_DURATION) * Math.PI * 2 };
        } else if (elapsed < TC.ROTATION_DURATION + TC.PAUSE_DURATION) {
            return { action: 'pausing', angle: 0 };
        } else if (elapsed < totalDuration) {
            var t = (elapsed - TC.ROTATION_DURATION - TC.PAUSE_DURATION) / TC.ROTATION_DURATION;
            return { action: 'rotating', angle: t * Math.PI * 2 };
        } else {
            return { action: 'done', angle: 0 };
        }
    }

    // ========================================================================
    // TEXT SCREEN — code-styled reveal
    // ========================================================================
    function buildCodeLines() {
        return [
            { type: 'comment', text: '// Can Chaos Hide the Truth?' },
            { type: 'comment', text: '//' },
            { type: 'code', text: '<span class="keyword">const</span> shape = <span class="fn">penroseTriangle</span>();' },
            { type: 'code', text: '<span class="keyword">const</span> surface = <span class="fn">lozenges</span>(shape);' },
            { type: 'comment', text: '// every local patch is valid' },
            { type: 'comment', text: '// but the global surface cannot exist' },
            { type: 'comment', text: '//' },
            { type: 'code', text: 'surface.<span class="fn">monodromy</span>() <span class="comment">// => +8 around the hole</span>' },
            { type: 'comment', text: '//' },
            { type: 'code', text: '<span class="keyword">let</span> tiling = <span class="fn">CFTP</span>.<span class="fn">sample</span>(surface);' },
            { type: 'code', text: '<span class="keyword">for</span> (<span class="keyword">let</span> γ = <span class="number">0</span>; γ &lt; <span class="number">Infinity</span>; γ++) {' },
            { type: 'code', text: '  tiling = <span class="fn">glauber</span>(tiling, <span class="fn">exp</span>(-γ/N));' },
            { type: 'code', text: '  <span class="comment">// chaos → order</span>' },
            { type: 'code', text: '}' },
            { type: 'comment', text: '//' },
            { type: 'comment', text: '// <span class="string">Leonid Petrov · 2026</span>' },
            { type: 'comment', text: '// <span class="string">lpetrov.cc/triangle/</span>' },
        ];
    }

    function populateTextScreen(codeBlock) {
        var lines = buildCodeLines();
        codeBlock.innerHTML = '';

        lines.forEach(function(line, idx) {
            var lineEl = document.createElement('span');
            lineEl.className = 'line';
            lineEl.style.opacity = '0';
            lineEl.style.transition = 'opacity 0.6s ease-in ' + (idx * 0.25) + 's';

            var numSpan = document.createElement('span');
            numSpan.className = 'line-num';
            numSpan.textContent = String(idx + 1).padStart(2, '0');
            lineEl.appendChild(numSpan);

            var contentSpan = document.createElement('span');
            if (line.type === 'comment') {
                contentSpan.className = 'comment';
            }
            contentSpan.innerHTML = line.text;
            lineEl.appendChild(contentSpan);

            codeBlock.appendChild(lineEl);
        });
    }

    window.TrianglePhases = {
        FlyingCubesManager: FlyingCubesManager,
        setFrozenRotation: setFrozenRotation,
        getFrozenAction: getFrozenAction,
        populateTextScreen: populateTextScreen
    };
})();
