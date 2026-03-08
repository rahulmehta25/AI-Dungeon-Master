/* ========================================
   AI Dungeon Master - Scene FX Module
   Dynamic scene backdrops and visual effects
   ======================================== */

const SceneFX = {
    // ========================================
    // Scene Definitions
    // ========================================
    scenes: {
        intro: {
            name: 'The Weary Wanderer Tavern',
            bg1: 'radial-gradient(ellipse at 50% 120%, #3d2812 0%, #1a0f05 60%, #0d0d0f 100%)',
            bg2: 'radial-gradient(ellipse at 30% 80%, rgba(212, 130, 40, 0.15) 0%, transparent 50%)',
            accent: '#d4a853',
            particleColor: '#ffaa33',
            fogOpacity: 0,
            particleType: 'embers',
            glow: { color: 'rgba(212, 130, 40, 0.08)', x: '50%', y: '80%', size: '60%' }
        },
        tavern: {
            name: 'The Weary Wanderer Tavern',
            bg1: 'radial-gradient(ellipse at 50% 120%, #3d2812 0%, #1a0f05 60%, #0d0d0f 100%)',
            bg2: 'radial-gradient(ellipse at 30% 80%, rgba(212, 130, 40, 0.15) 0%, transparent 50%)',
            accent: '#d4a853',
            particleColor: '#ffaa33',
            fogOpacity: 0,
            particleType: 'embers',
            glow: { color: 'rgba(212, 130, 40, 0.08)', x: '50%', y: '80%', size: '60%' }
        },
        town_square: {
            name: 'Millbrook Town Square',
            bg1: 'linear-gradient(180deg, #1a2a3d 0%, #2a3040 40%, #1a1a1f 100%)',
            bg2: 'radial-gradient(ellipse at 50% 0%, rgba(180, 160, 100, 0.12) 0%, transparent 60%)',
            accent: '#c4b078',
            particleColor: '#d4c898',
            fogOpacity: 0,
            particleType: 'dust',
            glow: { color: 'rgba(180, 160, 100, 0.06)', x: '50%', y: '10%', size: '80%' }
        },
        forest_path: {
            name: 'The Darkwood Path',
            bg1: 'linear-gradient(180deg, #0a1a0a 0%, #0d1f0d 30%, #081208 70%, #0d0d0f 100%)',
            bg2: 'radial-gradient(ellipse at 50% 50%, rgba(20, 60, 20, 0.2) 0%, transparent 70%)',
            accent: '#3d8b3d',
            particleColor: '#4a7a3a',
            fogOpacity: 0.35,
            particleType: 'leaves',
            glow: { color: 'rgba(20, 60, 20, 0.06)', x: '50%', y: '50%', size: '90%' }
        },
        ancient_ruins: {
            name: 'Ruins of Valdris',
            bg1: 'linear-gradient(180deg, #150a20 0%, #1a0f28 40%, #0d0a14 100%)',
            bg2: 'radial-gradient(ellipse at 50% 60%, rgba(120, 60, 180, 0.12) 0%, transparent 55%)',
            accent: '#9b6bbd',
            particleColor: '#b088d0',
            fogOpacity: 0.2,
            particleType: 'wisps',
            glow: { color: 'rgba(120, 60, 180, 0.08)', x: '50%', y: '60%', size: '50%' }
        },
        goblin_camp: {
            name: 'Goblin Encampment',
            bg1: 'radial-gradient(ellipse at 50% 100%, #2a1008 0%, #1a0a04 50%, #0d0d0f 100%)',
            bg2: 'radial-gradient(ellipse at 50% 90%, rgba(200, 80, 20, 0.15) 0%, transparent 50%)',
            accent: '#cc5520',
            particleColor: '#ff6633',
            fogOpacity: 0.15,
            particleType: 'embers',
            glow: { color: 'rgba(200, 80, 20, 0.1)', x: '50%', y: '90%', size: '40%' }
        },
        underground_tomb: {
            name: 'The Tomb Below',
            bg1: 'linear-gradient(180deg, #08080c 0%, #0a0c14 40%, #060608 100%)',
            bg2: 'radial-gradient(ellipse at 50% 30%, rgba(60, 100, 160, 0.08) 0%, transparent 50%)',
            accent: '#4a7aaa',
            particleColor: '#6a9aca',
            fogOpacity: 0.1,
            particleType: 'dust',
            glow: { color: 'rgba(60, 100, 160, 0.06)', x: '50%', y: '30%', size: '40%' }
        }
    },

    // ========================================
    // Mood Presets
    // ========================================
    moods: {
        calm:        { vignetteIntensity: 0.3, saturation: 1.0, pulseSpeed: 0 },
        tense:       { vignetteIntensity: 0.6, saturation: 0.85, pulseSpeed: 3 },
        combat:      { vignetteIntensity: 0.75, saturation: 1.2, pulseSpeed: 1.5 },
        mysterious:  { vignetteIntensity: 0.5, saturation: 0.7, pulseSpeed: 5 },
        celebratory: { vignetteIntensity: 0.2, saturation: 1.3, pulseSpeed: 0 }
    },

    // ========================================
    // State
    // ========================================
    _currentScene: null,
    _currentMood: 'calm',
    _activeParticles: [],
    _backdrop: null,
    _glowLayer: null,
    _fogLayer: null,
    _particleContainer: null,
    _flickerRaf: null,

    // ========================================
    // Backdrop Bootstrap
    // ========================================
    _ensureBackdrop() {
        if (this._backdrop) return;

        this._backdrop = document.getElementById('scene-backdrop');
        if (!this._backdrop) {
            this._backdrop = document.createElement('div');
            this._backdrop.id = 'scene-backdrop';
            Object.assign(this._backdrop.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '0',
                pointerEvents: 'none',
                transition: 'opacity 0.8s ease'
            });
            document.body.prepend(this._backdrop);
        }

        this._glowLayer = document.createElement('div');
        this._glowLayer.className = 'scene-glow-layer';
        Object.assign(this._glowLayer.style, {
            position: 'absolute',
            inset: '0',
            transition: 'opacity 1.2s ease, background 1.2s ease',
            pointerEvents: 'none'
        });
        this._backdrop.appendChild(this._glowLayer);

        this._fogLayer = document.createElement('div');
        this._fogLayer.className = 'scene-fog-layer';
        Object.assign(this._fogLayer.style, {
            position: 'absolute',
            inset: '0',
            background: 'linear-gradient(0deg, rgba(200,200,200,0.04) 0%, rgba(200,200,200,0.02) 40%, transparent 100%)',
            opacity: '0',
            transition: 'opacity 1.5s ease',
            pointerEvents: 'none',
            mixBlendMode: 'screen'
        });
        this._backdrop.appendChild(this._fogLayer);

        this._particleContainer = document.createElement('div');
        this._particleContainer.className = 'scene-particles';
        Object.assign(this._particleContainer.style, {
            position: 'absolute',
            inset: '0',
            overflow: 'hidden',
            pointerEvents: 'none'
        });
        this._backdrop.appendChild(this._particleContainer);

        this._injectStyles();
        console.log('🎭 SceneFX backdrop created');
    },

    // ========================================
    // Dynamic Stylesheet
    // ========================================
    _injectStyles() {
        if (document.getElementById('scene-fx-styles')) return;

        const style = document.createElement('style');
        style.id = 'scene-fx-styles';
        style.textContent = `
            @keyframes scene-float-up {
                0%   { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
                10%  { opacity: var(--sfx-p-opacity, 0.8); }
                90%  { opacity: var(--sfx-p-opacity, 0.8); }
                100% { transform: translateY(-10vh) translateX(var(--sfx-drift, 20px)) scale(0.4); opacity: 0; }
            }
            @keyframes scene-drift-down {
                0%   { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
                15%  { opacity: var(--sfx-p-opacity, 0.7); }
                85%  { opacity: var(--sfx-p-opacity, 0.7); }
                100% { transform: translateY(105vh) translateX(var(--sfx-drift, 30px)) rotate(var(--sfx-spin, 360deg)); opacity: 0; }
            }
            @keyframes scene-wisp {
                0%   { transform: translate(0, 0) scale(1); opacity: 0; }
                20%  { opacity: var(--sfx-p-opacity, 0.5); }
                50%  { transform: translate(var(--sfx-drift, 40px), -60px) scale(1.3); opacity: var(--sfx-p-opacity, 0.5); }
                80%  { opacity: var(--sfx-p-opacity, 0.3); }
                100% { transform: translate(calc(var(--sfx-drift, 40px) * -1), -120px) scale(0.6); opacity: 0; }
            }
            @keyframes scene-dust {
                0%   { transform: translate(0, 0); opacity: 0; }
                25%  { opacity: var(--sfx-p-opacity, 0.4); }
                75%  { opacity: var(--sfx-p-opacity, 0.4); }
                100% { transform: translate(var(--sfx-drift, 15px), var(--sfx-fall, 30px)); opacity: 0; }
            }
            @keyframes scene-snow {
                0%   { transform: translateY(-5vh) translateX(0); opacity: 0; }
                10%  { opacity: var(--sfx-p-opacity, 0.7); }
                90%  { opacity: var(--sfx-p-opacity, 0.7); }
                100% { transform: translateY(105vh) translateX(var(--sfx-drift, 25px)); opacity: 0; }
            }
            @keyframes scene-shake {
                0%, 100% { transform: translate(0, 0); }
                10% { transform: translate(-6px, -3px); }
                20% { transform: translate(6px, 2px); }
                30% { transform: translate(-4px, 4px); }
                40% { transform: translate(4px, -2px); }
                50% { transform: translate(-3px, 3px); }
                60% { transform: translate(3px, -1px); }
                70% { transform: translate(-2px, 2px); }
                80% { transform: translate(2px, -1px); }
                90% { transform: translate(-1px, 1px); }
            }
            @keyframes scene-flash {
                0%   { opacity: 0; }
                15%  { opacity: 1; }
                100% { opacity: 0; }
            }
            @keyframes scene-glow-burst {
                0%   { transform: scale(0.5); opacity: 0; }
                30%  { transform: scale(1.2); opacity: 0.6; }
                100% { transform: scale(2); opacity: 0; }
            }
            @keyframes scene-fog-roll {
                0%   { transform: translateX(-100%); opacity: 0; }
                30%  { opacity: 1; }
                70%  { opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            @keyframes scene-campfire-flicker {
                0%, 100% { opacity: 0.85; filter: brightness(1); }
                25%      { opacity: 1; filter: brightness(1.15); }
                50%      { opacity: 0.75; filter: brightness(0.9); }
                75%      { opacity: 0.95; filter: brightness(1.1); }
            }
            @keyframes scene-vignette-pulse {
                0%, 100% { opacity: var(--sfx-vignette-lo, 0.3); }
                50%      { opacity: var(--sfx-vignette-hi, 0.5); }
            }
            .scene-particle {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                will-change: transform, opacity;
            }
            .scene-particle--leaf {
                border-radius: 0;
                width: 6px !important;
                height: 8px !important;
                clip-path: ellipse(50% 45% at 50% 55%);
            }
            .scene-effect-overlay {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 9999;
            }
        `;
        document.head.appendChild(style);
    },

    // ========================================
    // apply(sceneId, mood, intensity)
    // ========================================
    apply(sceneId, mood = 'calm', intensity = 1) {
        this._ensureBackdrop();

        const scene = this.scenes[sceneId];
        if (!scene) {
            console.warn(`🎭 SceneFX: unknown scene "${sceneId}"`);
            return;
        }

        this._currentScene = sceneId;
        document.body.setAttribute('data-scene', sceneId);
        document.body.setAttribute('data-mood', mood);

        const root = document.documentElement;
        root.style.setProperty('--scene-bg-1', scene.bg1);
        root.style.setProperty('--scene-bg-2', scene.bg2);
        root.style.setProperty('--scene-accent', scene.accent);
        root.style.setProperty('--scene-particle-color', scene.particleColor);
        root.style.setProperty('--scene-fog-opacity', String(scene.fogOpacity * intensity));

        this._backdrop.style.background = scene.bg1;

        if (scene.glow) {
            this._glowLayer.style.background = `radial-gradient(ellipse at ${scene.glow.x} ${scene.glow.y}, ${scene.glow.color} 0%, transparent ${scene.glow.size})`;
            this._glowLayer.style.opacity = '1';
        } else {
            this._glowLayer.style.opacity = '0';
        }

        this._fogLayer.style.opacity = String(scene.fogOpacity * intensity);

        this._startFlicker(sceneId, intensity);
        this.createSceneParticles(scene.particleType, intensity);
        this.setMood(mood, intensity);

        console.log(`🎭 SceneFX: applied "${sceneId}" [mood=${mood}, intensity=${intensity}]`);
    },

    // ========================================
    // transition(fromScene, toScene)
    // ========================================
    transition(fromScene, toScene, duration = 1200) {
        this._ensureBackdrop();

        const target = this.scenes[toScene];
        if (!target) {
            console.warn(`🎭 SceneFX: unknown target scene "${toScene}"`);
            return;
        }

        this._backdrop.style.transition = `opacity ${duration / 2}ms ease`;
        this._backdrop.style.opacity = '0';

        setTimeout(() => {
            this.apply(toScene, this._currentMood);
            this._backdrop.style.opacity = '1';
            console.log(`🎭 SceneFX: transitioned ${fromScene} → ${toScene}`);
        }, duration / 2);
    },

    // ========================================
    // setMood(mood, intensity)
    // ========================================
    setMood(mood, intensity = 1) {
        const preset = this.moods[mood];
        if (!preset) {
            console.warn(`🎭 SceneFX: unknown mood "${mood}"`);
            return;
        }

        this._currentMood = mood;
        document.body.setAttribute('data-mood', mood);

        const root = document.documentElement;
        const vi = preset.vignetteIntensity * intensity;
        root.style.setProperty('--scene-vignette-intensity', String(vi));
        root.style.setProperty('--scene-saturation', String(preset.saturation));

        const vignette = document.querySelector('.vignette');
        if (vignette) {
            if (preset.pulseSpeed > 0) {
                vignette.style.setProperty('--sfx-vignette-lo', String(Math.max(0, vi - 0.1)));
                vignette.style.setProperty('--sfx-vignette-hi', String(Math.min(1, vi + 0.1)));
                vignette.style.animation = `scene-vignette-pulse ${preset.pulseSpeed}s ease-in-out infinite`;
            } else {
                vignette.style.animation = 'none';
            }
            vignette.style.opacity = String(vi);
        }

        if (mood === 'combat') {
            root.style.setProperty('--border-glow', 'rgba(196, 75, 75, 0.4)');
        } else if (mood === 'celebratory') {
            root.style.setProperty('--border-glow', 'rgba(212, 168, 83, 0.5)');
        } else {
            root.style.setProperty('--border-glow', 'rgba(212, 168, 83, 0.3)');
        }

        console.log(`🎭 SceneFX: mood set to "${mood}"`);
    },

    // ========================================
    // addEffect(effectName)
    // ========================================
    addEffect(effectName) {
        this._ensureBackdrop();

        const handlers = {
            shake: () => this._effectShake(),
            flash: () => this._effectFlash(),
            'glow-burst': () => this._effectGlowBurst(),
            'fog-roll': () => this._effectFogRoll()
        };

        const handler = handlers[effectName];
        if (!handler) {
            console.warn(`🎭 SceneFX: unknown effect "${effectName}"`);
            return;
        }

        handler();
        console.log(`🎭 SceneFX: effect "${effectName}" triggered`);
    },

    _effectShake() {
        const el = document.querySelector('.game-container') || document.body;
        el.style.animation = 'scene-shake 0.5s ease-out';
        el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
    },

    _effectFlash() {
        const overlay = document.createElement('div');
        overlay.className = 'scene-effect-overlay';
        overlay.style.background = 'rgba(255, 255, 255, 0.85)';
        overlay.style.animation = 'scene-flash 0.4s ease-out forwards';
        document.body.appendChild(overlay);
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    },

    _effectGlowBurst() {
        const scene = this.scenes[this._currentScene] || this.scenes.intro;
        const overlay = document.createElement('div');
        overlay.className = 'scene-effect-overlay';
        overlay.style.background = `radial-gradient(circle at 50% 50%, ${scene.accent}66 0%, transparent 70%)`;
        overlay.style.animation = 'scene-glow-burst 1s ease-out forwards';
        document.body.appendChild(overlay);
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    },

    _effectFogRoll() {
        const overlay = document.createElement('div');
        overlay.className = 'scene-effect-overlay';
        overlay.style.background = 'linear-gradient(90deg, transparent, rgba(200,200,200,0.12), transparent)';
        overlay.style.animation = 'scene-fog-roll 2.5s ease-in-out forwards';
        document.body.appendChild(overlay);
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    },

    // ========================================
    // createSceneParticles(type, intensity)
    // ========================================
    createSceneParticles(type = 'embers', intensity = 1) {
        this._ensureBackdrop();
        this._clearParticles();

        const generators = {
            embers:  () => this._spawnParticles({ count: 18, sizeRange: [2, 5], animation: 'scene-float-up', durationRange: [4, 8], opacity: 0.8, drift: 30 }),
            leaves:  () => this._spawnParticles({ count: 12, sizeRange: [5, 9], animation: 'scene-drift-down', durationRange: [6, 12], opacity: 0.6, drift: 60, spin: 540, className: 'scene-particle--leaf' }),
            snow:    () => this._spawnParticles({ count: 30, sizeRange: [2, 4], animation: 'scene-snow', durationRange: [5, 10], opacity: 0.7, drift: 35 }),
            wisps:   () => this._spawnParticles({ count: 8, sizeRange: [6, 14], animation: 'scene-wisp', durationRange: [5, 9], opacity: 0.35, drift: 50 }),
            dust:    () => this._spawnParticles({ count: 14, sizeRange: [1, 3], animation: 'scene-dust', durationRange: [6, 14], opacity: 0.35, drift: 20, fall: 40 })
        };

        const gen = generators[type];
        if (!gen) {
            console.warn(`🎭 SceneFX: unknown particle type "${type}"`);
            return;
        }

        gen();
        console.log(`🎭 SceneFX: particles "${type}" spawned`);
    },

    _spawnParticles({ count, sizeRange, animation, durationRange, opacity, drift, spin, fall, className }) {
        const scene = this.scenes[this._currentScene] || this.scenes.intro;
        const color = scene.particleColor;

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'scene-particle' + (className ? ` ${className}` : '');

            const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
            const dur = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);
            const delay = Math.random() * dur;
            const left = Math.random() * 100;
            const driftVal = (Math.random() - 0.5) * 2 * drift;

            Object.assign(el.style, {
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: animation === 'scene-float-up' ? 'auto' : '0',
                bottom: animation === 'scene-float-up' ? '0' : 'auto',
                backgroundColor: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                animation: `${animation} ${dur}s ${delay}s ease-in-out infinite`,
                '--sfx-drift': `${driftVal}px`,
                '--sfx-p-opacity': String(opacity)
            });

            if (spin) el.style.setProperty('--sfx-spin', `${(Math.random() - 0.5) * 2 * spin}deg`);
            if (fall) el.style.setProperty('--sfx-fall', `${Math.random() * fall}px`);

            this._particleContainer.appendChild(el);
            this._activeParticles.push(el);
        }
    },

    _clearParticles() {
        this._activeParticles.forEach(el => el.remove());
        this._activeParticles = [];
    },

    // ========================================
    // Campfire / Ambient Flicker
    // ========================================
    _startFlicker(sceneId, intensity) {
        if (this._flickerRaf) {
            cancelAnimationFrame(this._flickerRaf);
            this._flickerRaf = null;
        }

        const flickerScenes = ['intro', 'tavern', 'goblin_camp'];
        if (!flickerScenes.includes(sceneId)) return;

        const scene = this.scenes[sceneId];
        const base = scene.glow;
        if (!base || !this._glowLayer) return;

        const flicker = () => {
            const brightness = 0.85 + Math.random() * 0.3;
            this._glowLayer.style.filter = `brightness(${brightness})`;
            this._flickerRaf = requestAnimationFrame(() => {
                setTimeout(flicker, 80 + Math.random() * 120);
            });
        };

        flicker();
    },

    // ========================================
    // Cleanup
    // ========================================
    destroy() {
        this._clearParticles();
        if (this._flickerRaf) {
            cancelAnimationFrame(this._flickerRaf);
            this._flickerRaf = null;
        }
        if (this._backdrop) {
            this._backdrop.remove();
            this._backdrop = null;
            this._glowLayer = null;
            this._fogLayer = null;
            this._particleContainer = null;
        }
        document.getElementById('scene-fx-styles')?.remove();
        console.log('🎭 SceneFX: destroyed');
    }
};

console.log('🎭 SceneFX module loaded');
