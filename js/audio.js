/* ========================================
   AI Dungeon Master - Audio Module
   Procedural ambient soundscapes & SFX
   using Web Audio API (no audio files)
   ======================================== */

const AudioManager = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    _ambientNodes: [],
    _currentAmbient: null,
    _initialized: false,

    init() {
        if (this._initialized) return;
        const settings = typeof Storage !== 'undefined' ? Storage.getSettings() : null;
        this._desiredMusicVol = (settings?.musicVolume ?? 50) / 100;
        this._desiredSFXVol = (settings?.sfxVolume ?? 70) / 100;
        this._initialized = true;
        console.log('🔊 AudioManager initialized (context deferred)');
    },

    ensureContext() {
        if (this.ctx && this.ctx.state !== 'closed') {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return true;
        }
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this._desiredMusicVol ?? 0.5;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this._desiredSFXVol ?? 0.7;
            this.sfxGain.connect(this.masterGain);

            console.log('🔊 AudioContext created');
            return true;
        } catch (e) {
            console.warn('🔊 AudioContext creation failed', e.message);
            return false;
        }
    },

    _createNoise(seconds, type) {
        if (!this.ctx) return null;
        const sr = this.ctx.sampleRate;
        const len = sr * seconds;
        const buf = this.ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        if (type === 'white') {
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        } else {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + w * 0.0555179;
                b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520;
                b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522;
                b5 = -0.7616 * b5 - w * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.06;
                b6 = w * 0.115926;
            }
        }
        return buf;
    },

    // ========================================
    // Ambient Soundscapes
    // ========================================
    _ambientDefs: {
        tavern: { base: 80, filter: 'lowpass', filterFreq: 400, filterQ: 1, noiseType: 'pink', vol: 0.25, crackle: true },
        town: { base: 0, filter: 'bandpass', filterFreq: 600, filterQ: 0.5, noiseType: 'pink', vol: 0.15 },
        forest: { base: 0, filter: 'bandpass', filterFreq: 300, filterQ: 0.8, noiseType: 'pink', vol: 0.2 },
        ruins: { base: 55, filter: 'lowpass', filterFreq: 200, filterQ: 2, noiseType: 'pink', vol: 0.2, drone: true },
        combat: { base: 40, filter: 'lowpass', filterFreq: 150, filterQ: 3, noiseType: 'white', vol: 0.15, pulse: true },
        camp: { base: 0, filter: 'lowpass', filterFreq: 350, filterQ: 1, noiseType: 'pink', vol: 0.2, crackle: true }
    },

    playAmbient(sceneType) {
        if (!this.ensureContext()) return;
        this.stopAmbient();

        const def = this._ambientDefs[sceneType] || this._ambientDefs.tavern;
        const nodes = [];
        const now = this.ctx.currentTime;

        const noiseBuf = this._createNoise(4, def.noiseType);
        if (noiseBuf) {
            const src = this.ctx.createBufferSource();
            src.buffer = noiseBuf;
            src.loop = true;

            const filt = this.ctx.createBiquadFilter();
            filt.type = def.filter;
            filt.frequency.value = def.filterFreq;
            filt.Q.value = def.filterQ;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(def.vol, now + 1.5);

            src.connect(filt);
            filt.connect(gain);
            gain.connect(this.musicGain);
            src.start();
            nodes.push({ src, gain, filt });
        }

        if (def.base > 0) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = def.base;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 2);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start();
            nodes.push({ src: osc, gain });
        }

        if (def.drone) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 55;
            const filt = this.ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = 100;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.03, now + 3);
            osc.connect(filt);
            filt.connect(gain);
            gain.connect(this.musicGain);
            osc.start();
            nodes.push({ src: osc, gain, filt });
        }

        if (def.crackle) {
            this._startCrackle(nodes);
        }

        if (def.pulse) {
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 1.2;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.03;
            lfo.connect(lfoGain);
            if (nodes[0]?.gain) lfoGain.connect(nodes[0].gain.gain);
            lfo.start();
            nodes.push({ src: lfo, gain: lfoGain });
        }

        this._ambientNodes = nodes;
        this._currentAmbient = sceneType;
        console.log('🔊 Ambient: playing "%s"', sceneType);
    },

    _startCrackle(nodes) {
        const schedule = () => {
            if (this._currentAmbient === null) return;
            if (!this.ctx || this.ctx.state === 'closed') return;
            const delay = 100 + Math.random() * 400;
            this._crackleTimeout = setTimeout(() => {
                this._playCrackle();
                schedule();
            }, delay);
        };
        schedule();
    },

    _playCrackle() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const buf = this._createNoise(0.05, 'white');
        if (!buf) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.value = 800 + Math.random() * 2000;
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.02 + Math.random() * 0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(filt);
        filt.connect(gain);
        gain.connect(this.musicGain);
        src.start();
        src.stop(now + 0.06);
    },

    stopAmbient(fadeDuration = 1) {
        if (this._crackleTimeout) {
            clearTimeout(this._crackleTimeout);
            this._crackleTimeout = null;
        }
        if (!this.ctx) {
            this._ambientNodes = [];
            this._currentAmbient = null;
            return;
        }
        const now = this.ctx.currentTime;
        this._ambientNodes.forEach(n => {
            if (n.gain) {
                n.gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
            }
            if (n.src?.stop) {
                try { n.src.stop(now + fadeDuration + 0.1); } catch (e) {}
            }
        });
        this._ambientNodes = [];
        this._currentAmbient = null;
        console.log('🔊 Ambient: stopped');
    },

    crossfadeAmbient(newScene, duration = 1.5) {
        if (this._currentAmbient === newScene) return;
        this.stopAmbient(duration * 0.6);
        setTimeout(() => {
            this.playAmbient(newScene);
        }, duration * 600);
    },

    // ========================================
    // Sound Effects (procedural)
    // ========================================
    playSFX(type) {
        if (!this.ensureContext()) return;

        const handlers = {
            'dice-roll': () => this._sfxDiceRoll(),
            'hit': () => this._sfxHit(),
            'critical': () => this._sfxCritical(),
            'miss': () => this._sfxMiss(),
            'heal': () => this._sfxHeal(),
            'level-up': () => this._sfxLevelUp(),
            'quest-acquired': () => this._sfxQuestAcquired(),
            'save': () => this._sfxSave(),
            'gold': () => this._sfxGold()
        };

        const handler = handlers[type];
        if (handler) {
            handler();
        } else {
            console.warn('🔊 Unknown SFX type:', type);
        }
    },

    _sfxTone(freq, duration, type = 'sine', volume = 0.3) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + duration);
    },

    _sfxDiceRoll() {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const buf = this._createNoise(0.03, 'white');
                if (!buf) return;
                const src = this.ctx.createBufferSource();
                src.buffer = buf;
                const gain = this.ctx.createGain();
                const now = this.ctx.currentTime;
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                const filt = this.ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = 2000 + Math.random() * 3000;
                src.connect(filt);
                filt.connect(gain);
                gain.connect(this.sfxGain);
                src.start();
                src.stop(now + 0.05);
            }, i * 40);
        }
    },

    _sfxHit() {
        this._sfxTone(80, 0.15, 'sine', 0.4);
        this._sfxTone(60, 0.2, 'triangle', 0.2);
        const buf = this._createNoise(0.08, 'white');
        if (!buf) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        src.connect(gain);
        gain.connect(this.sfxGain);
        src.start();
        src.stop(now + 0.12);
    },

    _sfxCritical() {
        this._sfxHit();
        setTimeout(() => {
            this._sfxTone(880, 0.4, 'sine', 0.25);
            this._sfxTone(1320, 0.3, 'sine', 0.15);
        }, 100);
    },

    _sfxMiss() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    },

    _sfxHeal() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._sfxTone(freq, 0.3, 'sine', 0.2), i * 80);
        });
    },

    _sfxLevelUp() {
        const notes = [262, 330, 392, 523, 659, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => this._sfxTone(freq, 0.5 - i * 0.05, 'sine', 0.25), i * 100);
        });
        setTimeout(() => {
            [523, 659, 784].forEach(f => this._sfxTone(f, 0.8, 'sine', 0.15));
        }, 600);
    },

    _sfxQuestAcquired() {
        const notes = [392, 494, 587, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => this._sfxTone(freq, 0.4, 'triangle', 0.2), i * 120);
        });
    },

    _sfxSave() {
        this._sfxTone(440, 0.15, 'sine', 0.15);
        setTimeout(() => this._sfxTone(554, 0.2, 'sine', 0.12), 100);
    },

    _sfxGold() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this._sfxTone(2000 + Math.random() * 2000, 0.08, 'sine', 0.1);
            }, i * 50);
        }
    },

    // ========================================
    // Volume Controls
    // ========================================
    setMasterVolume(val) {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, val));
    },
    setMusicVolume(val) {
        this._desiredMusicVol = Math.max(0, Math.min(1, val));
        if (this.musicGain) this.musicGain.gain.value = this._desiredMusicVol;
    },
    setSFXVolume(val) {
        this._desiredSFXVol = Math.max(0, Math.min(1, val));
        if (this.sfxGain) this.sfxGain.gain.value = this._desiredSFXVol;
    }
};

AudioManager.init();
console.log('🔊 AudioManager module loaded');
