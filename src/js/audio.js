/* ==========================================================================
   SISTEM AUDIO SINTETIS 100% OFFLINE (GOTHIC MEDIEVAL BGM + KNIGHT/ZOMBIE SFX)
   ========================================================================== */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.bgmPattern = -1;
        this.noiseBuffer = null;
    }

    init() {
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this._buildNoiseBuffer();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        } catch (e) {
            // Audio unavailable in headless or restricted environment
        }
    }

    _buildNoiseBuffer() {
        if (!this.ctx) return;
        const length = Math.floor(this.ctx.sampleRate * 0.45);
        const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        this.noiseBuffer = buf;
    }

    _cleanup(node, gain) {
        node.onended = () => {
            try { node.disconnect(); } catch (e) {}
            try { gain.disconnect(); } catch (e) {}
        };
    }

    _tone(type, f0, f1, dur, vol, delay = 0) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(25, f0), now);
        if (f1 !== f0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(25, f1), now + dur);
        }
        gain.gain.setValueAtTime(Math.max(0.001, vol), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        this._cleanup(osc, gain);
        osc.start(now);
        osc.stop(now + dur + 0.01);
    }

    _noise(dur, vol, filterFreq = 900, delay = 0) {
        if (this.muted || !this.ctx || !this.noiseBuffer) return;
        const now = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.onended = () => {
            try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {}
        };
        src.start(now);
        src.stop(now + dur + 0.01);
    }

    play(type) {
        if (this.muted || !this.ctx) return;
        try {
            switch (type) {
                case 'slash':
                    this._tone('triangle', 460, 120, 0.12, 0.18);
                    this._noise(0.09, 0.12, 1800);
                    break;
                case 'heavy_slash':
                    this._tone('sawtooth', 300, 75, 0.18, 0.22);
                    this._tone('triangle', 620, 180, 0.16, 0.14, 0.02);
                    this._noise(0.14, 0.18, 1100);
                    break;
                case 'hit':
                    this._tone('sawtooth', 180, 58, 0.11, 0.22);
                    this._noise(0.08, 0.15, 650);
                    break;
                case 'crit':
                    this._tone('triangle', 740, 1240, 0.14, 0.2);
                    this._tone('sawtooth', 260, 82, 0.16, 0.22);
                    this._tone('sine', 1480, 1180, 0.18, 0.12, 0.03);
                    break;
                case 'parry':
                    // Denting logam perisai & lonceng suci
                    this._tone('triangle', 1120, 1680, 0.26, 0.24);
                    this._tone('sine', 1680, 2240, 0.22, 0.18, 0.03);
                    this._tone('square', 420, 210, 0.12, 0.12);
                    break;
                case 'shield_bash':
                    this._tone('sawtooth', 220, 68, 0.18, 0.24);
                    this._tone('triangle', 540, 280, 0.14, 0.14);
                    this._noise(0.12, 0.14, 700);
                    break;
                case 'javelin':
                    this._tone('triangle', 880, 310, 0.16, 0.16);
                    this._tone('sine', 1320, 660, 0.12, 0.1);
                    break;
                case 'jump':
                    this._tone('sine', 190, 420, 0.13, 0.15);
                    break;
                case 'double_jump':
                    this._tone('triangle', 320, 680, 0.15, 0.16);
                    break;
                case 'spring':
                    this._tone('triangle', 240, 860, 0.2, 0.2);
                    this._tone('sine', 480, 1040, 0.16, 0.12, 0.03);
                    break;
                case 'coin':
                    this._tone('sine', 987.77, 987.77, 0.07, 0.15);
                    this._tone('sine', 1318.51, 1318.51, 0.16, 0.16, 0.06);
                    break;
                case 'chest':
                    this._tone('triangle', 523.25, 523.25, 0.1, 0.18, 0);
                    this._tone('triangle', 659.25, 659.25, 0.1, 0.18, 0.08);
                    this._tone('triangle', 783.99, 783.99, 0.12, 0.2, 0.16);
                    this._tone('sine', 1046.5, 1046.5, 0.28, 0.22, 0.24);
                    break;
                case 'checkpoint':
                    this._tone('sine', 440, 440, 0.14, 0.16, 0);
                    this._tone('sine', 659.25, 659.25, 0.16, 0.16, 0.09);
                    this._tone('triangle', 880, 880, 0.28, 0.18, 0.18);
                    break;
                case 'hurt':
                    this._tone('sawtooth', 160, 62, 0.22, 0.25);
                    this._noise(0.14, 0.16, 450);
                    break;
                case 'zombie_die':
                    this._tone('sawtooth', 145, 48, 0.24, 0.18);
                    this._tone('triangle', 98, 42, 0.22, 0.14, 0.04);
                    break;
                case 'acid':
                    this._tone('sine', 460, 170, 0.16, 0.13);
                    this._noise(0.12, 0.12, 1500);
                    break;
                case 'bomb':
                    this._tone('sawtooth', 130, 32, 0.34, 0.28);
                    this._noise(0.28, 0.26, 360);
                    break;
                case 'lightning':
                    this._tone('sawtooth', 1480, 260, 0.18, 0.18);
                    this._noise(0.16, 0.18, 2400);
                    break;
                case 'ulti':
                    // Akord terompet suci + gemuruh Penghakiman Fajar
                    this._tone('sawtooth', 293.66, 293.66, 0.55, 0.18, 0);
                    this._tone('triangle', 440, 440, 0.55, 0.18, 0.04);
                    this._tone('triangle', 587.33, 880, 0.5, 0.2, 0.08);
                    this._tone('sine', 1174.66, 1760, 0.45, 0.16, 0.12);
                    this._noise(0.32, 0.22, 520, 0.04);
                    break;
                case 'upgrade':
                    // Dentingan palu pandai besi
                    this._tone('triangle', 920, 1460, 0.16, 0.2);
                    this._tone('sine', 1380, 1840, 0.22, 0.16, 0.07);
                    break;
                case 'boss_roar':
                    this._tone('sawtooth', 115, 46, 0.48, 0.26);
                    this._tone('square', 82, 38, 0.45, 0.18, 0.06);
                    this._noise(0.36, 0.2, 320);
                    break;
                case 'victory': {
                    const notes = [392, 493.88, 587.33, 783.99, 987.77];
                    notes.forEach((n, i) => this._tone('triangle', n, n, 0.28, 0.17, i * 0.11));
                    break;
                }
                case 'gameover': {
                    const notes = [293.66, 261.63, 233.08, 196];
                    notes.forEach((n, i) => this._tone('sawtooth', n, n * 0.96, 0.34, 0.16, i * 0.18));
                    break;
                }
                case 'dawn_chord': {
                    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
                    chord.forEach((n, i) => this._tone('sine', n, n, 1.3, 0.1, i * 0.12));
                    break;
                }
            }
        } catch (e) {}
    }

    startBGM(patternIdx = 0) {
        if (this.bgmPattern === patternIdx && this.bgmTimer) return;
        this.stopBGM();
        this.bgmPattern = patternIdx;
        this.bgmStep = 0;

        // 14 Pola Musik Gothic Medieval & Perang Salib (D minor / E phrygian / C minor / Boss themes)
        const patterns = [
            // 0: Pemakaman Berkabut (D minor somber march)
            { tempo: 240, wave: 'triangle', lead: [293.66, 0, 349.23, 329.63, 293.66, 0, 261.63, 293.66, 440, 0, 392, 349.23, 329.63, 293.66, 220, 0], bass: [146.83, 146.83, 116.54, 130.81] },
            // 1: Desa Terbakar (Urgent crusade rhythm)
            { tempo: 205, wave: 'sawtooth', lead: [329.63, 329.63, 392, 440, 392, 329.63, 293.66, 0, 329.63, 440, 493.88, 440, 392, 329.63, 246.94, 0], bass: [164.81, 130.81, 146.83, 123.47] },
            // 2: Boss I & II — Duel Katedral (Heavy brass/organ)
            { tempo: 170, wave: 'sawtooth', lead: [293.66, 311.13, 293.66, 440, 415.3, 392, 349.23, 311.13, 293.66, 440, 523.25, 493.88, 440, 392, 349.23, 329.63], bass: [146.83, 155.56, 130.81, 110] },
            // 3: Katakomba (Echoing crypt organ)
            { tempo: 250, wave: 'triangle', lead: [261.63, 311.13, 392, 311.13, 246.94, 311.13, 392, 0, 293.66, 349.23, 440, 392, 311.13, 293.66, 261.63, 0], bass: [130.81, 123.47, 116.54, 98] },
            // 4: Rawa Wabah (Eerie chromatic pulse)
            { tempo: 225, wave: 'triangle', lead: [220, 233.08, 293.66, 0, 233.08, 220, 196, 220, 329.63, 311.13, 293.66, 233.08, 220, 0, 164.81, 0], bass: [110, 116.54, 98, 110] },
            // 5: Jembatan Bulan Darah (Driving gothic stride)
            { tempo: 190, wave: 'sawtooth', lead: [392, 0, 440, 466.16, 440, 392, 349.23, 392, 523.25, 466.16, 440, 392, 349.23, 329.63, 293.66, 0], bass: [196, 174.61, 155.56, 146.83] },
            // 6: Boss III–V — Nekromansi & Raksasa (Fast dark arpeggio)
            { tempo: 155, wave: 'square', lead: [220, 261.63, 329.63, 440, 392, 329.63, 261.63, 246.94, 220, 329.63, 493.88, 523.25, 440, 392, 329.63, 261.63], bass: [110, 130.81, 98, 123.47] },
            // 7: Hutan Terkutuk & Biara
            { tempo: 235, wave: 'triangle', lead: [349.23, 329.63, 293.66, 261.63, 293.66, 349.23, 440, 0, 392, 349.23, 329.63, 293.66, 261.63, 220, 293.66, 0], bass: [174.61, 146.83, 130.81, 110] },
            // 8: Tambang Belerang & Tebing Angin
            { tempo: 200, wave: 'sawtooth', lead: [246.94, 293.66, 329.63, 369.99, 329.63, 293.66, 246.94, 0, 369.99, 392, 440, 369.99, 329.63, 293.66, 246.94, 220], bass: [123.47, 110, 98, 123.47] },
            // 9: Makam Beku & Salju Merah (Crystalline bell)
            { tempo: 230, wave: 'sine', lead: [523.25, 0, 622.25, 587.33, 523.25, 466.16, 392, 0, 523.25, 622.25, 698.46, 622.25, 587.33, 523.25, 466.16, 0], bass: [130.81, 155.56, 116.54, 98] },
            // 10: Pabrik Alkimia & Benteng Besi
            { tempo: 185, wave: 'square', lead: [196, 196, 233.08, 261.63, 293.66, 261.63, 233.08, 196, 311.13, 293.66, 261.63, 233.08, 196, 174.61, 196, 0], bass: [98, 116.54, 130.81, 98] },
            // 11: Menara Petir & Kawah Neraka
            { tempo: 175, wave: 'sawtooth', lead: [329.63, 392, 493.88, 440, 392, 329.63, 293.66, 329.63, 587.33, 523.25, 493.88, 440, 392, 349.23, 329.63, 0], bass: [164.81, 146.83, 130.81, 123.47] },
            // 12: Boss VI–VIII — Penguasa Kegelapan
            { tempo: 148, wave: 'sawtooth', lead: [293.66, 440, 466.16, 440, 392, 349.23, 329.63, 293.66, 587.33, 523.25, 466.16, 440, 466.16, 440, 392, 329.63], bass: [146.83, 116.54, 130.81, 110] },
            // 13: True Final Boss — Raja Lich Agung Azrath
            { tempo: 138, wave: 'sawtooth', lead: [440, 466.16, 523.25, 587.33, 523.25, 466.16, 440, 392, 659.25, 587.33, 523.25, 466.16, 587.33, 523.25, 440, 349.23], bass: [110, 116.54, 130.81, 146.83] }
        ];

        const pat = patterns[patternIdx % patterns.length];
        this.bgmTimer = setInterval(() => {
            if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
            const step = this.bgmStep % pat.lead.length;
            const note = pat.lead[step];
            const bassNote = pat.bass[Math.floor(step / 4) % pat.bass.length];

            if (note > 0) {
                this._tone(pat.wave, note, note, pat.tempo / 1050, 0.036);
            }
            if (step % 4 === 0 && bassNote > 0) {
                this._tone('sine', bassNote, bassNote * 0.99, (pat.tempo * 3.2) / 1000, 0.055);
            }
            if (step % 4 === 2 && pat.tempo <= 200) {
                this._noise(0.05, 0.025, 420);
            }
            this.bgmStep++;
        }, pat.tempo);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmPattern = -1;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}
