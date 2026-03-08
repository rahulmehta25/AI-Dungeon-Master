/* ========================================
   AI Dungeon Master - Director Module
   Parses structured AI output and applies
   state patches to the game engine
   ======================================== */

const Director = {
    ALLOWED_KEYS: ['scene', 'mood', 'suggestedActions', 'questUpdate', 'rewards', 'npcMood', 'fx', 'musicPreset'],

    CLAMPS: {
        xp:   { min: 0, max: 500 },
        gold: { min: 0, max: 1000 }
    },

    questLog: [],
    npcMoods: {},
    suggestedActions: [],

    // ========================================
    // Parsing
    // ========================================
    parseResponse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            console.log('🎬 Director.parseResponse: empty input');
            return { narrative: '', state: null };
        }

        try {
            const narrativeMatch = rawText.match(/<NARRATIVE>([\s\S]*?)<\/NARRATIVE>/);
            const stateMatch = rawText.match(/<STATE_JSON>([\s\S]*?)<\/STATE_JSON>/);

            const narrative = narrativeMatch ? narrativeMatch[1].trim() : null;
            let state = null;

            if (stateMatch) {
                try {
                    state = JSON.parse(stateMatch[1].trim());
                    console.log('🎬 Director: parsed state patch', Object.keys(state));
                } catch (jsonErr) {
                    console.warn('🎬 Director: STATE_JSON parse failed, ignoring', jsonErr.message);
                    state = null;
                }
            }

            if (narrative !== null) {
                return { narrative, state };
            }

            return { narrative: rawText.trim(), state };
        } catch (err) {
            console.warn('🎬 Director: parseResponse fallback', err.message);
            return { narrative: rawText.trim(), state: null };
        }
    },

    // ========================================
    // State Application
    // ========================================
    applyStatePatch(state) {
        if (!state || typeof state !== 'object') return;

        const sanitized = {};
        for (const key of this.ALLOWED_KEYS) {
            if (state.hasOwnProperty(key)) {
                sanitized[key] = state[key];
            }
        }

        console.log('🎬 Director: applying state patch', Object.keys(sanitized));

        if (sanitized.scene) this._applyScene(sanitized.scene);
        if (sanitized.mood) this._applyMood(sanitized.mood);
        if (sanitized.suggestedActions) this.renderSuggestedActions(sanitized.suggestedActions);
        if (sanitized.questUpdate) this.updateQuest(sanitized.questUpdate);
        if (sanitized.rewards) this._applyRewards(sanitized.rewards);
        if (sanitized.npcMood) this._applyNpcMood(sanitized.npcMood);
        if (sanitized.fx) this._applyFx(sanitized.fx);
        if (sanitized.musicPreset) this._applyMusic(sanitized.musicPreset);
    },

    _applyScene(scene) {
        if (typeof scene !== 'string') return;

        if (typeof DungeonMaster !== 'undefined') {
            DungeonMaster.currentScene = scene;
            console.log('🎬 Director: scene →', scene);
        }

        const gameState = Storage.getGameState();
        if (gameState) {
            gameState.currentScene = scene;
            if (!gameState.locationsVisited) gameState.locationsVisited = [];
            if (!gameState.locationsVisited.includes(scene)) {
                gameState.locationsVisited.push(scene);
            }
            Storage.saveGameState(gameState);
        }

        if (typeof SceneFX !== 'undefined' && typeof SceneFX.apply === 'function') {
            SceneFX.apply(scene);
        }
    },

    _applyMood(mood) {
        if (typeof mood !== 'string') return;

        if (typeof DungeonMaster !== 'undefined') {
            DungeonMaster.mood = mood;
            console.log('🎬 Director: mood →', mood);
        }

        if (typeof SceneFX !== 'undefined' && typeof SceneFX.setMood === 'function') {
            SceneFX.setMood(mood);
        }
    },

    _applyRewards(rewards) {
        if (!rewards || typeof rewards !== 'object') return;

        const character = typeof Character !== 'undefined' ? Character.current : null;
        if (!character) return;

        if (typeof rewards.xp === 'number') {
            const xp = this._clamp(rewards.xp, this.CLAMPS.xp.min, this.CLAMPS.xp.max);
            if (xp > 0) {
                Character.addExperience(xp);
                console.log('🎬 Director: +%d XP', xp);
                if (typeof showToast === 'function') {
                    showToast(`+${xp} XP earned!`, 'success');
                }
            }
        }

        if (typeof rewards.gold === 'number') {
            const gold = this._clamp(rewards.gold, this.CLAMPS.gold.min, this.CLAMPS.gold.max);
            if (gold > 0) {
                character.gold = (character.gold || 0) + gold;
                Storage.saveCharacter(character);
                console.log('🎬 Director: +%d gold', gold);
                if (typeof showToast === 'function') {
                    showToast(`+${gold} gold earned!`, 'success');
                }
            }
        }

        if (Array.isArray(rewards.items)) {
            rewards.items.forEach(item => {
                if (typeof item === 'string' && item.trim()) {
                    Character.addItem(item.trim());
                    console.log('🎬 Director: +item "%s"', item);
                    if (typeof showToast === 'function') {
                        showToast(`Acquired: ${item}`, 'success');
                    }
                }
            });
        }

        if (typeof updateGameUI === 'function') {
            updateGameUI();
        }
    },

    _applyNpcMood(npcMood) {
        if (!npcMood || typeof npcMood !== 'object') return;

        for (const [npc, mood] of Object.entries(npcMood)) {
            if (typeof npc === 'string' && typeof mood === 'string') {
                this.npcMoods[npc] = mood;
            }
        }

        const gameState = Storage.getGameState();
        if (gameState) {
            gameState.npcMoods = this.npcMoods;
            Storage.saveGameState(gameState);
        }

        console.log('🎬 Director: npcMoods updated', this.npcMoods);
    },

    _applyFx(fx) {
        if (!Array.isArray(fx)) return;

        fx.forEach(effect => {
            if (typeof effect === 'string' && typeof SceneFX !== 'undefined' && typeof SceneFX.addEffect === 'function') {
                SceneFX.addEffect(effect);
                console.log('🎬 Director: fx →', effect);
            }
        });
    },

    _applyMusic(preset) {
        if (typeof preset !== 'string') return;

        if (typeof AudioManager !== 'undefined' && typeof AudioManager.crossfadeAmbient === 'function') {
            AudioManager.crossfadeAmbient(preset);
            console.log('🎬 Director: music →', preset);
        }
    },

    _clamp(val, min, max) {
        return Math.max(min, Math.min(max, Math.floor(val)));
    },

    // ========================================
    // Suggested Actions UI
    // ========================================
    renderSuggestedActions(actions) {
        if (!Array.isArray(actions) || actions.length === 0) {
            this.clearSuggestedActions();
            return;
        }

        this.suggestedActions = actions;
        this.clearSuggestedActions();

        const inputArea = document.querySelector('.input-area .input-container');
        if (!inputArea) return;

        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'suggested-actions';
        chipsContainer.id = 'suggested-actions';

        actions.forEach(action => {
            if (typeof action !== 'string' || !action.trim()) return;

            const chip = document.createElement('button');
            chip.className = 'action-chip';
            chip.textContent = action;
            chip.addEventListener('click', () => {
                this._onActionChipClick(action);
            });
            chipsContainer.appendChild(chip);
        });

        inputArea.insertBefore(chipsContainer, inputArea.querySelector('.quick-actions'));
        console.log('🎬 Director: rendered %d action chips', actions.length);
    },

    _onActionChipClick(action) {
        const input = document.getElementById('player-input');
        if (input) {
            input.value = action;
        }
        this.clearSuggestedActions();

        if (typeof sendMessage === 'function') {
            sendMessage();
        }
    },

    clearSuggestedActions() {
        const existing = document.getElementById('suggested-actions');
        if (existing) {
            existing.remove();
        }
        this.suggestedActions = [];
    },

    // ========================================
    // Quest Journal
    // ========================================
    getQuests() {
        return [...this.questLog];
    },

    updateQuest(questData) {
        if (!questData || typeof questData !== 'object' || !questData.id) {
            console.warn('🎬 Director: invalid quest data');
            return;
        }

        const idx = this.questLog.findIndex(q => q.id === questData.id);

        const quest = {
            id: questData.id,
            title: questData.title || 'Unknown Quest',
            objective: questData.objective || '',
            status: questData.status || 'active',
            updatedAt: new Date().toISOString()
        };

        if (idx >= 0) {
            this.questLog[idx] = { ...this.questLog[idx], ...quest };
            console.log('🎬 Director: quest updated →', quest.title);
        } else {
            this.questLog.push(quest);
            console.log('🎬 Director: quest added →', quest.title);
            if (typeof showToast === 'function') {
                showToast(`New Quest: ${quest.title}`, 'success');
            }
        }

        const gameState = Storage.getGameState();
        if (gameState) {
            gameState.questLog = this.questLog;
            Storage.saveGameState(gameState);
        }
    },

    renderQuestJournal() {
        const quests = this.getQuests();

        if (quests.length === 0) {
            return `
                <div class="quest-journal">
                    <div class="sheet-header">
                        <h3>Quest Journal</h3>
                    </div>
                    <div class="quest-journal-content">
                        <p class="quest-empty">No quests yet. Your story awaits...</p>
                    </div>
                </div>
            `;
        }

        const active = quests.filter(q => q.status === 'active');
        const completed = quests.filter(q => q.status === 'completed');
        const failed = quests.filter(q => q.status === 'failed');

        const renderList = (list, label) => {
            if (list.length === 0) return '';
            const items = list.map(q => `
                <div class="quest-entry quest-${q.status}">
                    <h5 class="quest-title">${q.title}</h5>
                    <p class="quest-objective">${q.objective}</p>
                </div>
            `).join('');
            return `<div class="quest-section"><h4>${label}</h4>${items}</div>`;
        };

        return `
            <div class="quest-journal">
                <div class="sheet-header">
                    <h3>Quest Journal</h3>
                </div>
                <div class="quest-journal-content">
                    ${renderList(active, 'Active Quests')}
                    ${renderList(completed, 'Completed')}
                    ${renderList(failed, 'Failed')}
                </div>
            </div>
        `;
    },

    // ========================================
    // Recap / Context Builder
    // ========================================
    generateRecapContext() {
        const parts = [];

        const history = Storage.getStoryHistory();
        if (history.length > 0) {
            const recent = history.slice(-6);
            const recap = recent.map(m => {
                const prefix = m.type === 'player' ? 'PLAYER' : 'DM';
                const text = (m.text || '').substring(0, 300);
                return `[${prefix}] ${text}`;
            }).join('\n');
            parts.push('## Recent History\n' + recap);
        }

        const activeQuests = this.questLog.filter(q => q.status === 'active');
        if (activeQuests.length > 0) {
            const questSummary = activeQuests.map(q => `- ${q.title}: ${q.objective}`).join('\n');
            parts.push('## Active Quests\n' + questSummary);
        }

        if (typeof DungeonMaster !== 'undefined') {
            parts.push(`## Current State\nScene: ${DungeonMaster.currentScene}\nMood: ${DungeonMaster.mood}`);
        }

        const npcEntries = Object.entries(this.npcMoods);
        if (npcEntries.length > 0) {
            const npcSummary = npcEntries.map(([npc, mood]) => `- ${npc}: ${mood}`).join('\n');
            parts.push('## NPC Dispositions\n' + npcSummary);
        }

        const character = typeof Character !== 'undefined' ? Character.current : null;
        if (character) {
            parts.push(`## Character\n${character.name}, Level ${character.level} ${character.race || ''} ${character.class || ''}\nHP: ${character.hp.current}/${character.hp.max} | Gold: ${character.gold} | XP: ${character.experience}`);
        }

        return parts.join('\n\n');
    },

    // ========================================
    // Initialization
    // ========================================
    init() {
        const gameState = Storage.getGameState();
        if (gameState) {
            this.questLog = gameState.questLog || [];
            this.npcMoods = gameState.npcMoods || {};
        }

        this._injectStyles();
        console.log('🎬 Director initialized');
    },

    _injectStyles() {
        if (document.getElementById('director-styles')) return;

        const style = document.createElement('style');
        style.id = 'director-styles';
        style.textContent = `
            .suggested-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 8px 0;
            }

            .action-chip {
                background: linear-gradient(135deg, var(--bg-card, #1e1e24), var(--bg-hover, #252530));
                border: 1px solid var(--accent-gold, #d4a853);
                color: var(--accent-gold-light, #f0d090);
                font-family: 'Crimson Text', serif;
                font-size: 0.95rem;
                padding: 6px 16px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .action-chip:hover {
                background: var(--accent-gold, #d4a853);
                color: var(--bg-primary, #0d0d0f);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(212, 168, 83, 0.3);
            }

            .quest-journal {
                font-family: 'Crimson Text', serif;
            }

            .quest-journal-content {
                padding: 12px;
            }

            .quest-section h4 {
                font-family: 'Cinzel', serif;
                color: var(--accent-gold, #d4a853);
                font-size: 0.9rem;
                margin: 12px 0 6px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .quest-entry {
                padding: 8px 12px;
                margin-bottom: 8px;
                border-left: 3px solid var(--accent-gold, #d4a853);
                background: var(--bg-card, #1e1e24);
                border-radius: 0 6px 6px 0;
            }

            .quest-entry.quest-completed {
                border-left-color: #4caf50;
                opacity: 0.7;
            }

            .quest-entry.quest-failed {
                border-left-color: #e74c3c;
                opacity: 0.7;
            }

            .quest-title {
                margin: 0 0 4px;
                color: var(--text-primary, #e8e4d9);
                font-family: 'Cinzel', serif;
                font-size: 0.95rem;
            }

            .quest-objective {
                margin: 0;
                color: var(--text-secondary, #a09882);
                font-size: 0.9rem;
            }

            .quest-empty {
                color: var(--text-muted, #6b6457);
                font-style: italic;
                text-align: center;
                padding: 20px 0;
            }
        `;
        document.head.appendChild(style);
    }
};

Director.init();
