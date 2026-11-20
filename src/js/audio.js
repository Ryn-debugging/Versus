/* ==========================================================================
   AUDIO SINTETIS MEDIEVAL SIEGE (WAR HORNS, PARRY CLANG, BOOMERANG, & BGM)
   ========================================================================== */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.bgmMode = -1;
        this.noiseBuf = null;
    }

    init() {
        try {
            if (!this.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) {
                    this.ctx = new AC();
                    const len = Math.floor(this.ctx.sampleRate * 0.6);
                    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
                    const d = b.getChannelData(0);
                    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                    this.noiseBuf = b;
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        } catch (e) {}
    }

    _tone(type, f0, f1, dur, vol, delay = 0) {
        if (this.muted || !this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(28, f0), t);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(28, f1), t + dur);
        g.gain.setValueAtTime(Math.max(0.001, vol), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.onended = () => {
            try { osc.disconnect(); g.disconnect(); } catch (e) {}
        };
        osc.start(t);
        osc.stop(t + dur + 0.015);
    }

    _noise(dur, vol, freq = 900, delay = 0) {
        if (this.muted || !this.ctx || !this.noiseBuf) return;
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.frequency.setValueAtTime(freq, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(flt);
        flt.connect(g);
        g.connect(this.ctx.destination);
        src.onended = () => {
            try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (e) {}
        };
        src.start(t);
        src.stop(t + dur + 0.015);
    }

    play(name) {
        if (this.muted || !this.ctx) return;
        try {
            switch (name) {
                case 'slash':
                    this._tone('triangle', 420, 115, 0.13, 0.18);
                    this._noise(0.1, 0.14, 1700);
                    break;
                case 'heavy':
                    this._tone('sawtooth', 260, 68, 0.2, 0.24);
                    this._tone('triangle', 580, 160, 0.16, 0.14, 0.02);
                    this._noise(0.16, 0.2, 950);
                    break;
                case 'slam':
                    this._tone('sawtooth', 145, 34, 0.36, 0.28);
                    this._tone('triangle', 320, 72, 0.24, 0.16);
                    this._noise(0.32, 0.26, 360);
                    break;
                case 'hit':
                    this._tone('sawtooth', 175, 56, 0.12, 0.22);
                    this._noise(0.08, 0.16, 600);
                    break;
                case 'crit':
                    this._tone('triangle', 780, 1320, 0.15, 0.22);
                    this._tone('sawtooth', 240, 76, 0.18, 0.22);
                    this._noise(0.1, 0.16, 1300);
                    break;
                case 'block':
                    this._tone('square', 380, 210, 0.11, 0.16);
                    this._tone('triangle', 840, 620, 0.14, 0.14);
                    break;
                case 'parry':
                    // Denting lonceng perisai besi & gema suci!
                    this._tone('triangle', 1046.5, 1568, 0.3, 0.26);
                    this._tone('sine', 1568, 2093, 0.26, 0.2, 0.03);
                    this._tone('square', 440, 220, 0.14, 0.14);
                    break;
                case 'hammer':
                    this._tone('triangle', 520, 260, 0.18, 0.18);
                    this._tone('sine', 820, 440, 0.15, 0.12, 0.03);
                    this._noise(0.12, 0.12, 1200);
                    break;
                case 'arrow':
                    this._tone('triangle', 980, 420, 0.09, 0.09);
                    break;
                case 'explosion':
                    this._tone('sawtooth', 120, 28, 0.44, 0.3);
                    this._noise(0.4, 0.3, 300);
                    break;
                case 'cavalry_horn':
                    // Terompet perang kavaleri abad pertengahan (D4 -> A4 -> D5)!
                    this._tone('sawtooth', 293.66, 293.66, 0.28, 0.2, 0);
                    this._tone('sawtooth', 440.0, 440.0, 0.32, 0.22, 0.18);
                    this._tone('sawtooth', 587.33, 587.33, 0.65, 0.24, 0.36);
                    this._tone('triangle', 293.66, 293.66, 0.65, 0.18, 0.36);
                    this._noise(0.45, 0.16, 480, 0.25);
                    break;
                case 'lightning':
                    this._tone('sawtooth', 1500, 220, 0.2, 0.18);
                    this._noise(0.22, 0.2, 2200);
                    break;
                case 'jump':
                    this._tone('sine', 180, 400, 0.13, 0.14);
                    break;
                case 'coin':
                    this._tone('sine', 987.77, 987.77, 0.07, 0.14);
                    this._tone('sine', 1318.51, 1318.51, 0.14, 0.14, 0.05);
                    break;
                case 'gate_hit':
                    this._tone('sawtooth', 110, 42, 0.22, 0.24);
                    this._noise(0.18, 0.22, 280);
                    break;
                case 'hurt':
                    this._tone('sawtooth', 165, 60, 0.2, 0.24);
                    this._noise(0.14, 0.16, 480);
                    break;
                case 'zombie_die':
                    this._tone('sawtooth', 140, 44, 0.22, 0.16);
                    break;
                case 'boss_roar':
                    this._tone('sawtooth', 108, 42, 0.55, 0.28);
                    this._tone('square', 78, 36, 0.5, 0.18, 0.05);
                    this._noise(0.4, 0.22, 300);
                    break;
                case 'upgrade':
                    this._tone('triangle', 880, 1380, 0.15, 0.19);
                    this._tone('sine', 1320, 1760, 0.2, 0.16, 0.06);
                    break;
                case 'victory': {
                    const n = [293.66, 369.99, 440, 587.33, 739.99];
                    n.forEach((f, i) => this._tone('triangle', f, f, 0.34, 0.18, i * 0.12));
                    break;
                }
                case 'gameover': {
                    const n = [293.66, 261.63, 233.08, 196];
                    n.forEach((f, i) => this._tone('sawtooth', f, f * 0.96, 0.36, 0.16, i * 0.18));
                    break;
                }
                case 'dawn_chord': {
                    const ch = [293.66, 369.99, 440, 587.33, 739.99];
                    ch.forEach((f, i) => this._tone('sine', f, f, 1.4, 0.1, i * 0.12));
                    break;
                }
            }
        } catch (e) {}
    }

    startBGM(mode = 0) {
        if (this.bgmMode === mode && this.bgmTimer) return;
        this.stopBGM();
        this.bgmMode = mode;
        this.bgmStep = 0;

        // 6 Pola Musik Pengepungan Abad Pertengahan (Genderang Perang + Organ + Terompet)
        const tracks = [
            // 0: Dusk Watch (D minor marching drums)
            { tempo: 225, wave: 'triangle', lead: [293.66, 0, 329.63, 349.23, 440, 0, 392, 349.23, 329.63, 293.66, 261.63, 293.66, 349.23, 329.63, 220, 0], bass: [146.83, 146.83, 116.54, 130.81] },
            // 1: Siege Drums (Urgent iron march)
            { tempo: 185, wave: 'sawtooth', lead: [329.63, 329.63, 392, 440, 493.88, 440, 392, 329.63, 349.23, 329.63, 293.66, 246.94, 293.66, 329.63, 392, 0], bass: [164.81, 146.83, 130.81, 123.47] },
            // 2: Storm & Blight (Phrygian gothic organ)
            { tempo: 205, wave: 'triangle', lead: [261.63, 277.18, 329.63, 392, 349.23, 329.63, 277.18, 261.63, 392, 415.3, 392, 329.63, 277.18, 261.63, 196, 0], bass: [130.81, 138.59, 116.54, 98] },
            // 3: Blood Moon Assault (Relentless double-time)
            { tempo: 165, wave: 'sawtooth', lead: [220, 261.63, 329.63, 392, 440, 392, 329.63, 293.66, 220, 329.63, 440, 523.25, 493.88, 440, 392, 329.63], bass: [110, 130.81, 98, 123.47] },
            // 4: Boss Siege Duel (Heavy heroic brass/organ)
            { tempo: 150, wave: 'sawtooth', lead: [293.66, 440, 466.16, 440, 392, 349.23, 329.63, 293.66, 587.33, 523.25, 466.16, 440, 392, 349.23, 329.63, 293.66], bass: [146.83, 116.54, 130.81, 110] },
            // 5: Final Boss — Lich Emperor Azrath
            { tempo: 138, wave: 'square', lead: [440, 466.16, 523.25, 587.33, 659.25, 587.33, 523.25, 466.16, 587.33, 523.25, 466.16, 440, 392, 440, 466.16, 523.25], bass: [110, 116.54, 130.81, 146.83] }
        ];

        const tr = tracks[mode % tracks.length];
        this.bgmTimer = setInterval(() => {
            if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
            const step = this.bgmStep % tr.lead.length;
            const note = tr.lead[step];
            const bass = tr.bass[Math.floor(step / 4) % tr.bass.length];
            if (note > 0) this._tone(tr.wave, note, note, tr.tempo / 1080, 0.032);
            if (step % 4 === 0) this._tone('sine', bass, bass * 0.99, (tr.tempo * 3.1) / 1000, 0.06);
            // Genderang perang (War drum beat pada ketukan 0 & 2)
            if (step % 4 === 0) this._noise(0.08, 0.05, 190);
            else if (step % 4 === 2) this._noise(0.05, 0.03, 520);
            this.bgmStep++;
        }, tr.tempo);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmMode = -1;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}
