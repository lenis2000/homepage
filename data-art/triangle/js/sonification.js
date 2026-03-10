// Triangle data-art sonification — ambient drone that shifts with order/chaos
(function() {
    'use strict';

    class Sonifier {
        constructor() {
            this.audioCtx = null;
            this.masterGain = null;
            this.drone = null;
            this.droneGain = null;
            this.droneFilter = null;
        }

        init() {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.connect(this.audioCtx.destination);
            this.masterGain.gain.value = 0.25;

            const t = this.audioCtx.currentTime;

            this.droneGain = this.audioCtx.createGain();
            this.droneGain.gain.setValueAtTime(0, t);

            this.droneFilter = this.audioCtx.createBiquadFilter();
            this.droneFilter.type = 'lowpass';
            this.droneFilter.frequency.value = 800;
            this.droneFilter.Q.value = 1;

            const osc1 = this.audioCtx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.value = 110;
            const g1 = this.audioCtx.createGain();
            g1.gain.value = 0.5;
            osc1.connect(g1);
            g1.connect(this.droneGain);

            const osc2 = this.audioCtx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = 110;
            osc2.detune.value = 3;
            const g2 = this.audioCtx.createGain();
            g2.gain.value = 0.4;
            osc2.connect(g2);
            g2.connect(this.droneGain);

            const osc3 = this.audioCtx.createOscillator();
            osc3.type = 'sine';
            osc3.frequency.value = 220;
            const g3 = this.audioCtx.createGain();
            g3.gain.value = 0.1;
            osc3.connect(g3);
            g3.connect(this.droneGain);

            this.droneGain.connect(this.droneFilter);
            this.droneFilter.connect(this.masterGain);

            osc1.start(t);
            osc2.start(t);
            osc3.start(t);

            this.drone = [osc1, osc2, osc3];
            this.droneGain.gain.setTargetAtTime(1, t, 0.3);
        }

        setEntropy(entropy) {
            if (!this.audioCtx || !this.drone) return;
            const t = this.audioCtx.currentTime;

            const baseFreq = 110;
            const chaosFreq = 147;
            const freq = baseFreq + (chaosFreq - baseFreq) * entropy;

            this.drone[0].frequency.setTargetAtTime(freq, t, 0.15);
            this.drone[1].frequency.setTargetAtTime(freq, t, 0.15);
            this.drone[2].frequency.setTargetAtTime(freq * 2, t, 0.15);

            this.drone[1].detune.setTargetAtTime(3 + entropy * 12, t, 0.15);

            const filterFreq = 400 + entropy * 1200;
            this.droneFilter.frequency.setTargetAtTime(filterFreq, t, 0.1);

            const vol = 0.6 + entropy * 0.4;
            this.droneGain.gain.setTargetAtTime(vol, t, 0.1);
        }

        fadeOut(duration = 2000) {
            if (!this.masterGain || !this.audioCtx) return;
            const t = this.audioCtx.currentTime;
            this.masterGain.gain.setTargetAtTime(0, t, duration / 3000);
            if (this.drone) {
                for (const osc of this.drone) {
                    osc.stop(t + duration / 1000 + 1);
                }
            }
        }

        restartDrone() {
            if (!this.audioCtx || !this.droneGain) return;
            if (this.drone) {
                for (const osc of this.drone) {
                    try { osc.stop(); } catch(e) {}
                }
            }
            const t = this.audioCtx.currentTime;
            this.masterGain.gain.setValueAtTime(0.25, t);

            const osc1 = this.audioCtx.createOscillator();
            osc1.type = 'sine'; osc1.frequency.value = 110;
            const g1 = this.audioCtx.createGain(); g1.gain.value = 0.5;
            osc1.connect(g1); g1.connect(this.droneGain);

            const osc2 = this.audioCtx.createOscillator();
            osc2.type = 'sine'; osc2.frequency.value = 110; osc2.detune.value = 3;
            const g2 = this.audioCtx.createGain(); g2.gain.value = 0.4;
            osc2.connect(g2); g2.connect(this.droneGain);

            const osc3 = this.audioCtx.createOscillator();
            osc3.type = 'sine'; osc3.frequency.value = 220;
            const g3 = this.audioCtx.createGain(); g3.gain.value = 0.1;
            osc3.connect(g3); g3.connect(this.droneGain);

            osc1.start(t); osc2.start(t); osc3.start(t);
            this.drone = [osc1, osc2, osc3];
            this.droneGain.gain.setTargetAtTime(0.6, t, 0.3);
        }

        destroy() {
            if (this.drone) {
                for (const osc of this.drone) {
                    try { osc.stop(); } catch(e) {}
                }
                this.drone = null;
            }
            if (this.audioCtx) {
                this.audioCtx.close();
                this.audioCtx = null;
            }
        }
    }

    window.Sonifier = Sonifier;
})();
