// Triangle data-art sonification
// - flying cubes: subtle click per spawn
// - assembly: crystalline shimmer that rises with progress
// - Glauber chaos: drone fades in, high freq + noise
// - monotone order: drone pitch shifts down as entropy drops
// - frozen rotation: quiet resolved chord
(function() {
    'use strict';

    class Sonifier {
        constructor() {
            this.audioCtx = null;
            this.masterGain = null;

            // Drone (chaos → monotone phases)
            this.drone = null;
            this.droneGain = null;
            this.droneFilter = null;
            this.droneStarted = false;
            this.droneStartTime = null;

            // Assembly shimmer
            this.assemblyOscs = null;
            this.assemblyGain = null;
            this.assemblyFilter = null;

            // Rotation chord
            this.rotOscs = null;
            this.rotGain = null;
        }

        init() {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const ctx = this.audioCtx;
            const t = ctx.currentTime;

            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(ctx.destination);

            // ---- DRONE — starts silent, fades in when Glauber begins ----
            this.droneGain = ctx.createGain();
            this.droneGain.gain.setValueAtTime(0, t);

            this.droneFilter = ctx.createBiquadFilter();
            this.droneFilter.type = 'lowpass';
            this.droneFilter.frequency.value = 800;
            this.droneFilter.Q.value = 1;

            const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 110;
            const dg1 = ctx.createGain(); dg1.gain.value = 0.5;
            d1.connect(dg1); dg1.connect(this.droneGain);

            const d2 = ctx.createOscillator(); d2.type = 'sine'; d2.frequency.value = 110; d2.detune.value = 3;
            const dg2 = ctx.createGain(); dg2.gain.value = 0.4;
            d2.connect(dg2); dg2.connect(this.droneGain);

            const d3 = ctx.createOscillator(); d3.type = 'sine'; d3.frequency.value = 220;
            const dg3 = ctx.createGain(); dg3.gain.value = 0.1;
            d3.connect(dg3); dg3.connect(this.droneGain);

            this.droneGain.connect(this.droneFilter);
            this.droneFilter.connect(this.masterGain);

            d1.start(t); d2.start(t); d3.start(t);
            this.drone = [d1, d2, d3];

            // ---- ASSEMBLY SHIMMER — crystalline chord, starts silent ----
            this.assemblyGain = ctx.createGain();
            this.assemblyGain.gain.setValueAtTime(0, t);

            this.assemblyFilter = ctx.createBiquadFilter();
            this.assemblyFilter.type = 'lowpass';
            this.assemblyFilter.frequency.value = 400;
            this.assemblyFilter.Q.value = 0.5;

            this.assemblyGain.connect(this.assemblyFilter);
            this.assemblyFilter.connect(this.masterGain);

            // A major chord: A3 C#4 E4 A4 with slight detuning for shimmer
            const aFreqs   = [220, 277, 330, 440];
            const aLevels  = [0.35, 0.25, 0.25, 0.15];
            const aDetunes = [0, 2, -2, 1];
            const ag = this.assemblyGain;
            this.assemblyOscs = aFreqs.map(function(f, i) {
                const o = ctx.createOscillator();
                o.type = 'sine';
                o.frequency.value = f;
                o.detune.value = aDetunes[i];
                const g = ctx.createGain();
                g.gain.value = aLevels[i];
                o.connect(g); g.connect(ag);
                o.start(t);
                return o;
            });

            // ---- ROTATION CHORD — stable resolved tone, starts silent ----
            this.rotGain = ctx.createGain();
            this.rotGain.gain.setValueAtTime(0, t);
            this.rotGain.connect(this.masterGain);

            // Root + fifth + octave (110, 165, 220 Hz)
            const rFreqs  = [110, 165, 220];
            const rLevels = [0.4, 0.35, 0.25];
            const rg = this.rotGain;
            this.rotOscs = rFreqs.map(function(f, i) {
                const o = ctx.createOscillator();
                o.type = 'sine';
                o.frequency.value = f;
                const g = ctx.createGain();
                g.gain.value = rLevels[i];
                o.connect(g); g.connect(rg);
                o.start(t);
                return o;
            });
        }

        // Physical cube impact click — band-pass noise + sine tap, rate-limited
        cubeClick(intensity) {
            if (!this.audioCtx) return;
            const ctx = this.audioCtx;
            const t = ctx.currentTime;
            // Rate limit: max ~5 clicks/second globally
            if (t - (this._lastClick || 0) < 0.2) return;
            this._lastClick = t;

            const vol = 0.04 + intensity * 0.14;
            const freq = 400 + intensity * 500 + Math.random() * 150;
            const decay = Math.max(0.025, 0.07 - intensity * 0.04);

            // Sine transient
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const env = ctx.createGain();
            env.gain.setValueAtTime(vol, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + decay);
            osc.connect(env); env.connect(this.masterGain);
            osc.start(t); osc.stop(t + decay + 0.005);

            // Band-pass noise burst
            const bufLen = Math.ceil(ctx.sampleRate * 0.04);
            const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (var i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const bpf = ctx.createBiquadFilter();
            bpf.type = 'bandpass';
            bpf.frequency.value = freq * 1.4;
            bpf.Q.value = 4;
            const nEnv = ctx.createGain();
            nEnv.gain.setValueAtTime(vol * 0.6, t);
            nEnv.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
            src.connect(bpf); bpf.connect(nEnv); nEnv.connect(this.masterGain);
            src.start(t); src.stop(t + decay * 0.6 + 0.005);
        }

        // Call once when Glauber chaos begins — slow fade-in of drone
        startDrone() {
            if (!this.audioCtx || this.droneStarted) return;
            this.droneStarted = true;
            this.droneStartTime = this.audioCtx.currentTime;
            // Fade in over ~4s
            this.droneGain.gain.setTargetAtTime(0.7, this.droneStartTime, 3.0);
        }

        // Drive drone freq/filter with entropy [0=order, 1=chaos]
        // Gain only adjusts after the fade-in settles (~4s after startDrone)
        setEntropy(entropy) {
            if (!this.audioCtx || !this.drone) return;
            const t = this.audioCtx.currentTime;

            const freq = 110 + (147 - 110) * entropy;
            this.drone[0].frequency.setTargetAtTime(freq, t, 0.15);
            this.drone[1].frequency.setTargetAtTime(freq, t, 0.15);
            this.drone[2].frequency.setTargetAtTime(freq * 2, t, 0.15);
            this.drone[1].detune.setTargetAtTime(3 + entropy * 12, t, 0.15);

            this.droneFilter.frequency.setTargetAtTime(400 + entropy * 1200, t, 0.1);

            // Only ride the volume after fade-in has had ~4 seconds to settle
            if (this.droneStarted && this.droneStartTime && t - this.droneStartTime > 4.0) {
                this.droneGain.gain.setTargetAtTime(0.6 + entropy * 0.4, t, 0.3);
            }
        }

        // Start assembly shimmer when cubes begin converging
        startAssembly() {
            if (!this.audioCtx) return;
            const t = this.audioCtx.currentTime;
            this.assemblyGain.gain.setTargetAtTime(0.15, t, 0.8);
        }

        // Evolve assembly sound with progress [0→1]: rising pitch + filter opens
        updateAssembly(progress) {
            if (!this.audioCtx || !this.assemblyOscs) return;
            const t = this.audioCtx.currentTime;
            const baseFreqs = [220, 277, 330, 440];
            const factor = 1 + progress * 0.26; // rises ~a major third
            for (var i = 0; i < this.assemblyOscs.length; i++) {
                this.assemblyOscs[i].frequency.setTargetAtTime(baseFreqs[i] * factor, t, 0.5);
            }
            this.assemblyFilter.frequency.setTargetAtTime(400 + progress * 1600, t, 0.3);
        }

        // Fade out assembly shimmer when surface takes over
        stopAssembly() {
            if (!this.assemblyGain || !this.audioCtx) return;
            this.assemblyGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.8);
        }

        // Frozen orbit — quiet resolved chord fades in, drone fades down
        startRotation() {
            if (!this.audioCtx) return;
            const t = this.audioCtx.currentTime;
            this.rotGain.gain.setTargetAtTime(0.12, t, 2.5);
            if (this.droneGain) {
                this.droneGain.gain.setTargetAtTime(0.04, t, 2.0);
            }
        }

        fadeOut(duration) {
            if (!this.masterGain || !this.audioCtx) return;
            duration = duration || 2000;
            const t = this.audioCtx.currentTime;
            this.masterGain.gain.setTargetAtTime(0, t, duration / 3000);
            const stopAt = t + duration / 1000 + 1;
            var all = (this.drone || []).concat(this.assemblyOscs || []).concat(this.rotOscs || []);
            for (var i = 0; i < all.length; i++) {
                try { all[i].stop(stopAt); } catch(e) {}
            }
        }

        destroy() {
            var all = (this.drone || []).concat(this.assemblyOscs || []).concat(this.rotOscs || []);
            for (var i = 0; i < all.length; i++) {
                try { all[i].stop(); } catch(e) {}
            }
            if (this.audioCtx) {
                this.audioCtx.close();
                this.audioCtx = null;
            }
        }
    }

    window.Sonifier = Sonifier;
})();
