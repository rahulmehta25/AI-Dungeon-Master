/* ========================================
   AI Dungeon Master - Storage Module
   Handles save/load game state via localStorage
   ======================================== */

const Storage = {
    KEYS: {
        GAME_STATE: 'aidm_game_state',
        CHARACTER: 'aidm_character',
        SETTINGS: 'aidm_settings',
        STORY_HISTORY: 'aidm_story_history',
        SAVES: 'aidm_saves'
    },

    // Default settings
    defaultSettings: {
        musicVolume: 50,
        sfxVolume: 70,
        ttsEnabled: false,
        theme: 'dark',
        textSize: 'medium',
        animationsEnabled: true,
        difficulty: 'normal',
        autosaveEnabled: true
    },

    // Initialize storage with defaults
    init() {
        if (!this.getSettings()) {
            this.saveSettings(this.defaultSettings);
        }
        console.log('💾 Storage initialized');
    },

    // ========================================
    // Settings
    // ========================================
    getSettings() {
        try {
            const settings = localStorage.getItem(this.KEYS.SETTINGS);
            return settings ? JSON.parse(settings) : null;
        } catch (e) {
            console.error('Error loading settings:', e);
            return this.defaultSettings;
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    updateSetting(key, value) {
        const settings = this.getSettings() || this.defaultSettings;
        settings[key] = value;
        return this.saveSettings(settings);
    },

    // ========================================
    // Character
    // ========================================
    getCharacter() {
        try {
            const character = localStorage.getItem(this.KEYS.CHARACTER);
            return character ? JSON.parse(character) : null;
        } catch (e) {
            console.error('Error loading character:', e);
            return null;
        }
    },

    saveCharacter(character) {
        try {
            localStorage.setItem(this.KEYS.CHARACTER, JSON.stringify(character));
            return true;
        } catch (e) {
            console.error('Error saving character:', e);
            return false;
        }
    },

    // ========================================
    // Game State
    // ========================================
    getGameState() {
        try {
            const state = localStorage.getItem(this.KEYS.GAME_STATE);
            return state ? JSON.parse(state) : null;
        } catch (e) {
            console.error('Error loading game state:', e);
            return null;
        }
    },

    saveGameState(state) {
        try {
            state.lastSaved = new Date().toISOString();
            localStorage.setItem(this.KEYS.GAME_STATE, JSON.stringify(state));
            return true;
        } catch (e) {
            console.error('Error saving game state:', e);
            return false;
        }
    },

    // ========================================
    // Story History
    // ========================================
    getStoryHistory() {
        try {
            const history = localStorage.getItem(this.KEYS.STORY_HISTORY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('Error loading story history:', e);
            return [];
        }
    },

    saveStoryHistory(history) {
        try {
            // Keep only last 100 messages to prevent storage overflow
            const trimmedHistory = history.slice(-100);
            localStorage.setItem(this.KEYS.STORY_HISTORY, JSON.stringify(trimmedHistory));
            return true;
        } catch (e) {
            console.error('Error saving story history:', e);
            return false;
        }
    },

    addToStoryHistory(message) {
        const history = this.getStoryHistory();
        history.push({
            ...message,
            timestamp: new Date().toISOString()
        });
        return this.saveStoryHistory(history);
    },

    // ========================================
    // Save Slots
    // ========================================
    getSaves() {
        try {
            const saves = localStorage.getItem(this.KEYS.SAVES);
            return saves ? JSON.parse(saves) : [];
        } catch (e) {
            console.error('Error loading saves:', e);
            return [];
        }
    },

    createSave(name = null) {
        const character = this.getCharacter();
        const gameState = this.getGameState();
        const storyHistory = this.getStoryHistory();
        
        if (!character || !gameState) {
            console.error('Cannot create save - no active game');
            return false;
        }

        const saves = this.getSaves();
        const save = {
            id: Date.now().toString(),
            name: name || `${character.name} - ${new Date().toLocaleDateString()}`,
            character,
            gameState,
            storyHistory,
            createdAt: new Date().toISOString()
        };

        saves.unshift(save); // Add to beginning
        
        // Keep only last 10 saves
        if (saves.length > 10) {
            saves.pop();
        }

        try {
            localStorage.setItem(this.KEYS.SAVES, JSON.stringify(saves));
            return save;
        } catch (e) {
            console.error('Error creating save:', e);
            return false;
        }
    },

    loadSave(saveId) {
        const saves = this.getSaves();
        const save = saves.find(s => s.id === saveId);
        
        if (!save) {
            console.error('Save not found:', saveId);
            return false;
        }

        this.saveCharacter(save.character);
        this.saveGameState(save.gameState);
        this.saveStoryHistory(save.storyHistory);
        
        return save;
    },

    deleteSave(saveId) {
        const saves = this.getSaves();
        const filteredSaves = saves.filter(s => s.id !== saveId);
        
        try {
            localStorage.setItem(this.KEYS.SAVES, JSON.stringify(filteredSaves));
            return true;
        } catch (e) {
            console.error('Error deleting save:', e);
            return false;
        }
    },

    // ========================================
    // Utility
    // ========================================
    hasSavedGame() {
        const character = this.getCharacter();
        const gameState = this.getGameState();
        return !!(character && gameState);
    },

    clearCurrentGame() {
        localStorage.removeItem(this.KEYS.CHARACTER);
        localStorage.removeItem(this.KEYS.GAME_STATE);
        localStorage.removeItem(this.KEYS.STORY_HISTORY);
    },

    clearAllData() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('🗑️ All data cleared');
    },

    // Export/Import for backup
    exportData() {
        const data = {};
        Object.entries(this.KEYS).forEach(([name, key]) => {
            const item = localStorage.getItem(key);
            if (item) {
                data[name] = JSON.parse(item);
            }
        });
        return JSON.stringify(data, null, 2);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.entries(data).forEach(([name, value]) => {
                const key = this.KEYS[name];
                if (key) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    },

    // Get storage usage
    getStorageUsage() {
        let total = 0;
        Object.values(this.KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                total += item.length * 2; // UTF-16 = 2 bytes per char
            }
        });
        return {
            bytes: total,
            formatted: this.formatBytes(total)
        };
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Initialize on load
Storage.init();
