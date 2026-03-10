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
    // Slab scale targets per type: flatten along face normal
    // Type 0: normal (1,0,0) → thin in x
    // Type 1: normal (0,-1,0) → thin in y
    // Type 2: normal (0,0,-1) → thin in z
    var SLAB_THIN = 0.05;
    var SLAB_SCALES = [
        [SLAB_THIN, 1, 1],  // type 0
        [1, SLAB_THIN, 1],  // type 1
        [1, 1, SLAB_THIN]   // type 2
    ];

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
            this.cubeTypes = null;
            this.cubeScales = null;
            this.camRight = null;
            this.camUp = null;
            this.camForward = null;
            this.cubeHalfW = 0;
            this.cubeHalfH = 0;
            this.spawnHalfW = 0;
            this.spawnHalfH = 0;
            this.cubeEntryTime = null;
            this.depthRange = 0;
            this.collisionCallback = null;
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
            this.spawnHalfW = visW * 0.52;
            this.spawnHalfH = visH * 0.52;
            this.depthRange = visW * 0.08;

            this.cubePos2D = new Float32Array(numCubes * 2);
            this.cubeVel2D = new Float32Array(numCubes * 2);
            this.cubeDepth = new Float32Array(numCubes);
            this.cubePositions = new Float32Array(numCubes * 3);
            this.cubeRotations = new Float32Array(numCubes * 3);
            this.cubeAngVel = new Float32Array(numCubes * 3);
            this.cubeFlying = new Uint8Array(numCubes);
            this.cubeTypes = new Uint8Array(numCubes);
            this.cubeScales = new Float32Array(numCubes * 3);
            this.cubeEntryTime = new Float32Array(numCubes);

            // Store types and init scales to (1,1,1); assign staggered entry times
            for (var i = 0; i < numCubes; i++) {
                this.cubeTypes[i] = dimers[i].t;
                this.cubeScales[i * 3] = 1;
                this.cubeScales[i * 3 + 1] = 1;
                this.cubeScales[i * 3 + 2] = 1;
                this.cubeEntryTime[i] = Math.random() * TC.FLYING_DURATION * 0.6;
            }

            this._computeTargets2D(controls);

            // All start hidden; positions/velocities set on entry
            // Pre-assign rotations and angular velocities
            for (var i = 0; i < numCubes; i++) {
                this.cubeFlying[i] = 0;
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
                roughness: 0.3,
                metalness: 0.35,
                flatShading: true
            });
            this.cubesMesh = new THREE.InstancedMesh(geo, mat, numCubes);
            this._colorObjs3D = colorObjs3D;

            for (var i = 0; i < numCubes; i++) {
                this.cubesMesh.setColorAt(i, colorObjs3D[dimers[i].t]);
            }
            this.cubesMesh.instanceColor.needsUpdate = true;

            this._updateMatrices();
            meshGroup.add(this.cubesMesh);
        }

        _spawnFromEdge(i) {
            this.cubeFlying[i] = 1;
            var edge = Math.floor(Math.random() * 4);
            var px, py;
            if (edge === 0) { px = -this.spawnHalfW; py = (Math.random() * 2 - 1) * this.spawnHalfH; }
            else if (edge === 1) { px = this.spawnHalfW;  py = (Math.random() * 2 - 1) * this.spawnHalfH; }
            else if (edge === 2) { px = (Math.random() * 2 - 1) * this.spawnHalfW; py = this.spawnHalfH; }
            else                 { px = (Math.random() * 2 - 1) * this.spawnHalfW; py = -this.spawnHalfH; }
            this.cubePos2D[i * 2]     = px;
            this.cubePos2D[i * 2 + 1] = py;
            var angle = Math.atan2(-py, -px) + (Math.random() - 0.5) * 1.2;
            var speed = 0.8 + Math.random() * 1.5;
            this.cubeVel2D[i * 2]     = speed * Math.cos(angle);
            this.cubeVel2D[i * 2 + 1] = speed * Math.sin(angle);
            this.cubeDepth[i] = (Math.random() - 0.5) * this.depthRange;
        }

        refreshTargets(dimers, targets, controls) {
            this.setTargets(targets);
            this._computeTargets2D(controls);
            // Update types and colors to match post-CFTP dimer assignment
            var n = Math.min(dimers.length, this.cubesMesh.count);
            for (var i = 0; i < n; i++) {
                this.cubeTypes[i] = dimers[i].t;
                this.cubesMesh.setColorAt(i, this._colorObjs3D[dimers[i].t]);
            }
            this.cubesMesh.instanceColor.needsUpdate = true;
        }

        activateAll() {
            var n = this.cubePos2D.length / 2;
            for (var i = 0; i < n; i++) {
                if (this.cubeFlying[i] === 0) this._spawnFromEdge(i);
            }
        }

        hasCubeAtCenter() {
            if (!this.cubePos2D) return false;
            var n = this.cubePos2D.length / 2;
            var threshold = TC.CUBE_SIZE * 1.5;
            for (var i = 0; i < n; i++) {
                if (this.cubeFlying[i] !== 1) continue;
                var x = this.cubePos2D[i * 2];
                var y = this.cubePos2D[i * 2 + 1];
                if (x * x + y * y < threshold * threshold) return true;
            }
            return false;
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
                    if (this.cubeScales) {
                        dummy.scale.set(
                            this.cubeScales[i * 3],
                            this.cubeScales[i * 3 + 1],
                            this.cubeScales[i * 3 + 2]
                        );
                    } else {
                        dummy.scale.set(1, 1, 1);
                    }
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

        updateFlyingPhysics(dt, controls, elapsed) {
            if (!this.cubePos2D || !this.cubesMesh) return;
            var n = this.cubesMesh.count;
            var pos = this.cubePos2D;
            var vel = this.cubeVel2D;

            // Staggered entry from screen edges
            if (this.cubeEntryTime) {
                for (var i = 0; i < n; i++) {
                    if (this.cubeFlying[i] === 0 && elapsed >= this.cubeEntryTime[i]) {
                        this._spawnFromEdge(i);
                    }
                }
            }

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
                var bounced = false;
                if (pos[i * 2] < -this.cubeHalfW) { pos[i * 2] = -this.cubeHalfW; var spd = Math.abs(vel[i * 2]); vel[i * 2] = spd; if (spd > 0.5) bounced = true; }
                if (pos[i * 2] > this.cubeHalfW)  { pos[i * 2] = this.cubeHalfW;  var spd = Math.abs(vel[i * 2]); vel[i * 2] = -spd; if (spd > 0.5) bounced = true; }
                if (pos[i * 2 + 1] < -this.cubeHalfH) { pos[i * 2 + 1] = -this.cubeHalfH; var spd = Math.abs(vel[i * 2 + 1]); vel[i * 2 + 1] = spd; if (spd > 0.5) bounced = true; }
                if (pos[i * 2 + 1] > this.cubeHalfH)  { pos[i * 2 + 1] = this.cubeHalfH;  var spd = Math.abs(vel[i * 2 + 1]); vel[i * 2 + 1] = -spd; if (spd > 0.5) bounced = true; }
                if (bounced && this.collisionCallback) this.collisionCallback(Math.min(1, spd / 8));
            }

            // 2D soft spring repulsion — works even on initial overlap, gives gentle bounce
            var COLL_DIST = TC.CUBE_SIZE * 1.5;
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

                    if (dist < COLL_DIST && dist > 0.001) {
                        var overlap = COLL_DIST - dist;
                        var nx = dx / dist, ny = dy / dist;
                        // Click on approach (not separation)
                        if (this.collisionCallback) {
                            var vRelX = vel[b * 2] - vel[a * 2];
                            var vRelY = vel[b * 2 + 1] - vel[a * 2 + 1];
                            var vApproach = -(vRelX * nx + vRelY * ny);
                            if (vApproach > 1.0) this.collisionCallback(Math.min(1, vApproach / 8));
                        }
                        // Spring force — pushes apart regardless of approach direction
                        var force = overlap * 20 * dt;
                        vel[a * 2]     -= force * nx;
                        vel[a * 2 + 1] -= force * ny;
                        vel[b * 2]     += force * nx;
                        vel[b * 2 + 1] += force * ny;
                        // Positional nudge to prevent deep penetration
                        var correction = overlap * 0.15;
                        pos[a * 2]     -= correction * nx;
                        pos[a * 2 + 1] -= correction * ny;
                        pos[b * 2]     += correction * nx;
                        pos[b * 2 + 1] += correction * ny;
                    }
                }
            }

            // Gentle central gravity — prevents void in the middle
            var GRAVITY_STRENGTH = 0.3;
            for (var i = 0; i < n; i++) {
                if (!this.cubeFlying || !this.cubeFlying[i]) continue;
                var cx = pos[i * 2], cy = pos[i * 2 + 1];
                var r = Math.sqrt(cx * cx + cy * cy);
                if (r > 0.01) {
                    vel[i * 2]     -= (cx / r) * GRAVITY_STRENGTH * dt;
                    vel[i * 2 + 1] -= (cy / r) * GRAVITY_STRENGTH * dt;
                }
            }

            // Gentle damping to keep energy bounded
            for (var i = 0; i < n; i++) {
                if (!this.cubeFlying || !this.cubeFlying[i]) continue;
                vel[i * 2]     *= 0.995;
                vel[i * 2 + 1] *= 0.995;
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
            var damping = 1 + p3 * 30;
            var angDamp = 3 + progress * 25;

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

            // Interpolate scales from (1,1,1) toward slab targets in final 50%
            if (progress > 0.5) {
                var t = (progress - 0.5) / 0.5;  // 0→1 over last 50%
                var t2 = t * t;                    // ease-in
                for (var i = 0; i < n; i++) {
                    if (this.cubeFlying[i] !== 1) continue;
                    var ss = SLAB_SCALES[this.cubeTypes[i]];
                    this.cubeScales[i * 3]     = 1 + (ss[0] - 1) * t2;
                    this.cubeScales[i * 3 + 1] = 1 + (ss[1] - 1) * t2;
                    this.cubeScales[i * 3 + 2] = 1 + (ss[2] - 1) * t2;
                }
            }

            this._updatePos2Dto3D(controls);
            this._updateMatrices();
        }

        snapToTargets(controls) {
            if (!this.cubePos2D || !this.cubeTargets2D) return;
            var n = this.cubePos2D.length / 2;
            for (var i = 0; i < n; i++) {
                this.cubePos2D[i * 2] = this.cubeTargets2D[i * 2];
                this.cubePos2D[i * 2 + 1] = this.cubeTargets2D[i * 2 + 1];
                this.cubeDepth[i] = this.cubeTargetDepth[i];
                this.cubeVel2D[i * 2] = 0;
                this.cubeVel2D[i * 2 + 1] = 0;
                this.cubeRotations[i * 3] = 0;
                this.cubeRotations[i * 3 + 1] = 0;
                this.cubeRotations[i * 3 + 2] = 0;
                this.cubeAngVel[i * 3] = 0;
                this.cubeAngVel[i * 3 + 1] = 0;
                this.cubeAngVel[i * 3 + 2] = 0;
                // Flatten to slab based on type
                var ss = SLAB_SCALES[this.cubeTypes[i]];
                this.cubeScales[i * 3] = ss[0];
                this.cubeScales[i * 3 + 1] = ss[1];
                this.cubeScales[i * 3 + 2] = ss[2];
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
            this.cubeTypes = null;
            this.cubeScales = null;
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
            { type: 'comment', text: '// exact draw from the uniform measure' },
            { type: 'comment', text: '//' },
            { type: 'comment', text: '// phase 1: chaos — random Glauber at q = 1' },
            { type: 'code', text: '<span class="fn">glauber</span>(tiling, { q: <span class="number">1</span>, steps: <span class="fn">random</span> });' },
            { type: 'comment', text: '//' },
            { type: 'comment', text: '// phase 2: order — monotone deletions only' },
            { type: 'code', text: '<span class="keyword">while</span> (!tiling.<span class="fn">isMinimal</span>()) {' },
            { type: 'code', text: '  tiling.<span class="fn">remove</span>(<span class="fn">random</span>.lozenge()); <span class="comment">// dir = −1</span>' },
            { type: 'code', text: '}' },
            { type: 'comment', text: '//' },
            { type: 'comment', text: '// <span class="string">Leonid Petrov · 2026</span>' },
            { type: 'comment', text: '// <span class="string">lpetrov.cc/data-art-2026/</span>' },
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

        // QR code after all lines
        var qrImg = document.createElement('img');
        qrImg.src = '/data-art/triangle/img/qr.svg';
        qrImg.className = 'qr-code';
        qrImg.alt = 'QR code: lpetrov.cc/data-art-2026/';
        qrImg.style.opacity = '0';
        qrImg.style.transition = 'opacity 1s ease-in ' + (lines.length * 0.25 + 0.5) + 's';
        codeBlock.appendChild(qrImg);
    }

    window.TrianglePhases = {
        FlyingCubesManager: FlyingCubesManager,
        setFrozenRotation: setFrozenRotation,
        getFrozenAction: getFrozenAction,
        populateTextScreen: populateTextScreen
    };
})();
