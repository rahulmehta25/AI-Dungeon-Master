/* ========================================
   AI Dungeon Master - Main Application
   Core app logic and UI management
   ======================================== */

// ========================================
// Global State
// ========================================
let currentScreen = 'main-menu';
let previousScreen = 'main-menu';
let isProcessing = false;
let audioEnabled = false;

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🐉 AI Dungeon Master initializing...');
    
    // Initialize modules
    Storage.init();
    
    // Apply saved settings
    applySettings();
    
    // Create ambient particles
    createParticles();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing save
    if (Storage.hasSavedGame()) {
        document.getElementById('continue-btn').disabled = false;
    } else {
        document.getElementById('continue-btn').disabled = true;
    }

    syncAudioToggleUI();
    
    console.log('✅ AI Dungeon Master ready!');
});

// ========================================
// Screen Management
// ========================================
function showScreen(screenId) {
    previousScreen = currentScreen;
    currentScreen = screenId;
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    console.log(`📺 Screen: ${screenId}`);
}

function showLoading(message = 'Loading...') {
    document.getElementById('loading-text').textContent = message;
    showScreen('loading-screen');
}

function goBack() {
    showScreen(previousScreen);
}

// ========================================
// Main Menu Actions
// ========================================
function startNewGame() {
    if (typeof stopStoryPreview === 'function') {
        stopStoryPreview();
    }
    showScreen('character-creation');
    Character.startCreation();
}

function loadGame() {
    if (!Storage.hasSavedGame()) {
        showToast('No saved game found', 'error');
        return;
    }
    
    showLoading('Loading your adventure...');
    
    setTimeout(() => {
        // Load character
        if (Character.load()) {
            // Load game state
            const gameState = Storage.getGameState();
            if (gameState) {
                DungeonMaster.currentScene = gameState.currentScene || 'intro';
            }
            
            // Load story history
            const history = Storage.getStoryHistory();
            
            initGameScreen();
            restoreStoryHistory(history);
            
            if (typeof SceneFX !== 'undefined') {
                SceneFX.apply(DungeonMaster.currentScene || 'intro', 'calm');
            }
            
            showScreen('game-screen');
            showToast('Adventure resumed!', 'success');
        } else {
            showScreen('main-menu');
            showToast('Failed to load game', 'error');
        }
    }, 1000);
}

function showSettings() {
    showScreen('settings-screen');
    loadSettingsUI();
}

// ========================================
// Character Creation
// ========================================
function nextCreationStep() {
    const wasLastStep = Character.creationStep === Character.maxSteps;
    const result = Character.nextStep();
    if (result && wasLastStep) {
        if (typeof startStoryPreview === 'function') {
            startStoryPreview();
        } else {
            startAdventure();
        }
    }
}

function prevCreationStep() {
    Character.prevStep();
}

function startAdventure() {
    if (typeof stopStoryPreview === 'function') {
        stopStoryPreview();
    }

    const container = document.getElementById('story-content');
    if (container) {
        container.innerHTML = '';
    }

    showLoading('Summoning the Dungeon Master...');
    
    setTimeout(() => {
        initGameScreen();
        
        const intro = DungeonMaster.getIntroNarrative();
        addStoryMessage('dm', intro);
        
        if (typeof SceneFX !== 'undefined') {
            SceneFX.apply('intro', 'calm');
        }
        
        showScreen('game-screen');
        showToast('Your adventure begins!', 'success');
        
        saveGame(true);
    }, 1500);
}

// ========================================
// Game Screen
// ========================================
function initGameScreen() {
    const character = Character.current;
    if (!character) return;
    
    // Update header
    document.getElementById('game-char-name').textContent = character.name;
    document.getElementById('game-char-class').textContent = Character.getFullTitle();
    document.getElementById('game-portrait').textContent = Character.getIcon();
    
    // Update resources
    updateGameUI();
    
    // Setup input handling
    const input = document.getElementById('player-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        });
    }
}

function updateGameUI() {
    const character = Character.current;
    if (!character) return;
    
    // HP Bar
    const hpPercent = (character.hp.current / character.hp.max) * 100;
    const hpFill = document.getElementById('hp-fill');
    const hpValue = document.getElementById('hp-value');
    if (hpFill) hpFill.style.width = `${hpPercent}%`;
    if (hpValue) hpValue.textContent = `${character.hp.current}/${character.hp.max}`;
    
    // XP Bar
    const xpNeeded = character.level * 100;
    const xpPercent = (character.experience / xpNeeded) * 100;
    const xpFill = document.getElementById('xp-fill');
    const xpValue = document.getElementById('xp-value');
    if (xpFill) xpFill.style.width = `${xpPercent}%`;
    if (xpValue) xpValue.textContent = `${character.experience}/${xpNeeded}`;
    
    // Update character sheet if open
    updateCharacterSheet();
}

function updateCharacterSheet() {
    const character = Character.current;
    if (!character) return;
    
    document.getElementById('sheet-icon').textContent = Character.getIcon();
    document.getElementById('sheet-name').textContent = character.name;
    document.getElementById('sheet-title').textContent = Character.getFullTitle();
    
    // Stats
    const statsContainer = document.getElementById('sheet-stats');
    if (statsContainer) {
        statsContainer.innerHTML = Object.entries(character.stats).map(([stat, value]) => `
            <div class="stat-block">
                <div class="stat-name">${stat}</div>
                <div class="stat-value">${value}</div>
            </div>
        `).join('');
    }
    
    // Inventory
    const inventoryList = document.getElementById('inventory-list');
    if (inventoryList) {
        inventoryList.innerHTML = character.inventory.map(item => `
            <li>${item}</li>
        `).join('') || '<li>Empty</li>';
        
        // Add gold
        const goldItem = document.createElement('li');
        goldItem.innerHTML = `💰 ${character.gold} Gold`;
        goldItem.style.color = 'var(--accent-gold)';
        inventoryList.prepend(goldItem);
    }
    
    // Abilities
    const abilitiesList = document.getElementById('abilities-list');
    if (abilitiesList) {
        abilitiesList.innerHTML = character.abilities.map(ability => `
            <div class="ability-item">
                <h6>${ability.name}</h6>
                <p>${ability.description}</p>
            </div>
        `).join('') || '<p>No abilities yet</p>';
    }
}

// ========================================
// Story/Chat Functions
// ========================================
async function sendMessage() {
    const input = document.getElementById('player-input');
    const message = input.value.trim();
    
    if (!message || isProcessing) return;
    
    isProcessing = true;
    input.value = '';
    input.style.height = 'auto';
    
    if (typeof Director !== 'undefined') {
        Director.clearSuggestedActions();
    }
    
    addStoryMessage('player', message);
    Storage.addToStoryHistory({ type: 'player', text: message });
    
    const typingId = addTypingIndicator();
    
    try {
        const rawResponse = await DungeonMaster.generateResponse(message);
        removeTypingIndicator(typingId);
        
        let narrative = rawResponse;
        if (typeof Director !== 'undefined') {
            const parsed = Director.parseResponse(rawResponse);
            narrative = parsed.narrative;
            if (parsed.state) {
                Director.applyStatePatch(parsed.state);
            }
        }
        
        await addStoryMessageAnimated('dm', narrative);
        
        if (audioEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSFX('save');
        }
        
        if (Voice.settings.enabled) {
            Voice.speakAsDM(narrative);
        }
        
        const settings = Storage.getSettings();
        if (settings.autosaveEnabled) {
            saveGame(true);
        }
        
    } catch (error) {
        console.error('Error generating response:', error);
        removeTypingIndicator(typingId);
        addStoryMessage('system', 'The Dungeon Master seems distracted... Please try again.');
    }
    
    isProcessing = false;
}

function addStoryMessage(type, text) {
    const container = document.getElementById('story-content');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `story-message ${type}`;
    
    if (type === 'dm') {
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="dm-icon">🐉</span>
                <span class="dm-label">Dungeon Master</span>
            </div>
            <div class="message-text">${formatMarkdown(text)}</div>
        `;
    } else if (type === 'player') {
        messageEl.innerHTML = `
            <div class="message-content">${escapeHtml(text)}</div>
        `;
    } else if (type === 'system') {
        messageEl.innerHTML = `<em>${escapeHtml(text)}</em>`;
    } else if (type === 'roll') {
        messageEl.innerHTML = text;
    }
    
    container.appendChild(messageEl);
    scrollToBottom();
}

async function addStoryMessageAnimated(type, text) {
    const settings = Storage.getSettings();
    
    if (!settings.animationsEnabled) {
        addStoryMessage(type, text);
        return;
    }
    
    const container = document.getElementById('story-content');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `story-message ${type}`;
    
    if (type === 'dm') {
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="dm-icon">🐉</span>
                <span class="dm-label">Dungeon Master</span>
            </div>
            <div class="message-text"></div>
        `;
        container.appendChild(messageEl);
        
        const textEl = messageEl.querySelector('.message-text');
        await typeText(textEl, text);
    } else {
        addStoryMessage(type, text);
    }
    
    scrollToBottom();
}

async function typeText(element, text, speed = 10) {
    const formatted = formatMarkdown(text);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formatted;
    
    // For simplicity, just fade in the full text
    element.innerHTML = formatted;
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.5s';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    element.style.opacity = '1';
    
    await new Promise(resolve => setTimeout(resolve, 500));
}

function addTypingIndicator() {
    const container = document.getElementById('story-content');
    if (!container) return null;
    
    const id = 'typing-' + Date.now();
    const indicator = document.createElement('div');
    indicator.id = id;
    indicator.className = 'story-message dm typing-indicator';
    indicator.innerHTML = `
        <div class="message-header">
            <span class="dm-icon">🐉</span>
            <span class="dm-label">Dungeon Master</span>
        </div>
        <div class="message-text">
            <span class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </div>
    `;
    
    container.appendChild(indicator);
    scrollToBottom();
    
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    const scroll = document.getElementById('story-scroll');
    if (scroll) {
        scroll.scrollTop = scroll.scrollHeight;
    }
}

function restoreStoryHistory(history) {
    const container = document.getElementById('story-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    history.forEach(message => {
        addStoryMessage(message.type, message.text);
    });
    
    scrollToBottom();
}

// ========================================
// Quick Actions
// ========================================
function quickAction(action) {
    const input = document.getElementById('player-input');
    if (input) {
        input.value = action;
        sendMessage();
    }
}

async function rollDice(sides = 20) {
    if (audioEnabled && typeof AudioManager !== 'undefined') AudioManager.playSFX('dice-roll');
    const roll = Combat.roll(sides);
    await Combat.showDiceRoll(sides, roll.total);
    addStoryMessage('roll', `
        <span class="roll-dice">🎲</span>
        <span class="roll-result">${roll.total}</span>
        <span class="roll-description">d${sides} roll</span>
    `);
}

// ========================================
// Character Sheet
// ========================================
function toggleCharacterSheet() {
    const sheet = document.getElementById('character-sheet');
    if (sheet) {
        sheet.classList.toggle('hidden');
        sheet.classList.toggle('visible');
        updateCharacterSheet();
    }
}

// ========================================
// Quest Journal
// ========================================
function toggleQuestJournal() {
    const sidebar = document.getElementById('quest-journal-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('visible');

    if (sidebar.classList.contains('visible') && typeof Director !== 'undefined') {
        const content = document.getElementById('quest-journal-content');
        if (content) {
            const quests = Director.getQuests();
            if (quests.length === 0) {
                content.innerHTML = '<p class="quest-empty">No quests yet. Your story awaits...</p>';
            } else {
                content.innerHTML = Director.renderQuestJournal();
            }
        }
    }
}

// ========================================
// Story Recap
// ========================================
async function showRecap() {
    hideGameMenu();

    const typingId = addTypingIndicator();

    try {
        const response = await fetch(`${DungeonMaster.apiEndpoint}/dm/recap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: DungeonMaster.conversationHistory,
                character: Character.current,
                gameState: Storage.getGameState()
            })
        });

        removeTypingIndicator(typingId);

        const data = await response.json();
        if (data.success && data.recap) {
            addStoryMessage('dm', `# Story Recap\n\n${data.recap}`);
        } else {
            addStoryMessage('system', 'The chronicler is unavailable...');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addStoryMessage('system', 'Could not reach the chronicler.');
    }
}

// ========================================
// Audio Toggle
// ========================================
function toggleAudio() {
    audioEnabled = !audioEnabled;
    syncAudioToggleUI();

    if (audioEnabled && typeof AudioManager !== 'undefined') {
        AudioManager.ensureContext();
        const scene = DungeonMaster.currentScene || 'intro';
        const sceneToPreset = {
            intro: 'tavern', tavern: 'tavern',
            town_square: 'town', forest_path: 'forest',
            ancient_ruins: 'ruins', goblin_camp: 'camp',
            underground_tomb: 'ruins'
        };
        AudioManager.playAmbient(sceneToPreset[scene] || 'tavern');
    } else if (typeof AudioManager !== 'undefined') {
        AudioManager.stopAmbient();
    }
}

function syncAudioToggleUI() {
    const headerBtn = document.getElementById('audio-toggle-btn');
    if (headerBtn) {
        headerBtn.textContent = audioEnabled ? '🔊' : '🔇';
    }

    const menuIcon = document.getElementById('menu-audio-icon');
    const menuLabel = document.getElementById('menu-audio-label');
    if (menuIcon) {
        menuIcon.textContent = audioEnabled ? '🔊' : '🔇';
    }
    if (menuLabel) {
        menuLabel.textContent = audioEnabled ? 'Ambient Audio On' : 'Ambient Audio Off';
    }
}

// ========================================
// Game Menu
// ========================================
function showGameMenu() {
    const modal = document.getElementById('game-menu-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideGameMenu() {
    const modal = document.getElementById('game-menu-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function quitToMenu() {
    hideGameMenu();
    
    // Ask confirmation
    if (confirm('Are you sure you want to quit? Make sure to save your game first!')) {
        showScreen('main-menu');
        
        // Clear story content
        const container = document.getElementById('story-content');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// ========================================
// Save/Load
// ========================================
function saveGame(silent = false) {
    const save = Storage.createSave();
    
    if (save) {
        if (!silent) {
            showToast('Game saved!', 'success');
            if (audioEnabled && typeof AudioManager !== 'undefined') AudioManager.playSFX('save');
        }
        console.log('💾 Game saved:', save.name);
    } else {
        if (!silent) {
            showToast('Failed to save game', 'error');
        }
    }
}

// ========================================
// Settings
// ========================================
function loadSettingsUI() {
    const settings = Storage.getSettings();
    
    // Audio
    document.getElementById('music-volume').value = settings.musicVolume || 50;
    document.getElementById('sfx-volume').value = settings.sfxVolume || 70;
    document.getElementById('tts-enabled').checked = settings.ttsEnabled || false;
    
    // Display
    document.getElementById('theme-select').value = settings.theme || 'dark';
    document.getElementById('text-size').value = settings.textSize || 'medium';
    document.getElementById('animations-enabled').checked = settings.animationsEnabled !== false;
    
    // Gameplay
    document.getElementById('difficulty').value = settings.difficulty || 'normal';
    document.getElementById('autosave-enabled').checked = settings.autosaveEnabled !== false;
}

function applySettings() {
    const settings = Storage.getSettings();
    if (!settings) return;
    
    // Apply theme
    document.body.dataset.theme = settings.theme || 'dark';
    
    // Apply text size
    document.body.classList.remove('text-small', 'text-medium', 'text-large');
    document.body.classList.add(`text-${settings.textSize || 'medium'}`);
    
    // Apply animations
    if (!settings.animationsEnabled) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
    
    // Apply TTS
    if (typeof Voice !== 'undefined') {
        Voice.settings.enabled = settings.ttsEnabled || false;
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to delete ALL save data? This cannot be undone!')) {
        if (confirm('Really? ALL your progress will be lost forever!')) {
            Storage.clearAllData();
            showToast('All data cleared', 'info');
            showScreen('main-menu');
            document.getElementById('continue-btn').disabled = true;
        }
    }
}

// ========================================
// Voice
// ========================================
function toggleVoiceInput() {
    Voice.toggleListening();
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Character creation - race selection
    document.querySelectorAll('#race-options .option-card').forEach(card => {
        card.addEventListener('click', () => {
            Character.selectRace(card.dataset.value);
        });
    });
    
    // Character creation - class selection
    document.querySelectorAll('#class-options .option-card').forEach(card => {
        card.addEventListener('click', () => {
            Character.selectClass(card.dataset.value);
        });
    });
    
    // Character creation - background selection
    document.querySelectorAll('#background-options .background-card').forEach(card => {
        card.addEventListener('click', () => {
            Character.selectBackground(card.dataset.value);
        });
    });
    
    // Settings changes
    document.getElementById('music-volume')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        Storage.updateSetting('musicVolume', val);
        if (typeof AudioManager !== 'undefined') AudioManager.setMusicVolume(val / 100);
    });
    
    document.getElementById('sfx-volume')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        Storage.updateSetting('sfxVolume', val);
        if (typeof AudioManager !== 'undefined') AudioManager.setSFXVolume(val / 100);
    });
    
    document.getElementById('tts-enabled')?.addEventListener('change', (e) => {
        Storage.updateSetting('ttsEnabled', e.target.checked);
        Voice.setEnabled(e.target.checked);
    });
    
    document.getElementById('theme-select')?.addEventListener('change', (e) => {
        Storage.updateSetting('theme', e.target.value);
        applySettings();
    });
    
    document.getElementById('text-size')?.addEventListener('change', (e) => {
        Storage.updateSetting('textSize', e.target.value);
        applySettings();
    });
    
    document.getElementById('animations-enabled')?.addEventListener('change', (e) => {
        Storage.updateSetting('animationsEnabled', e.target.checked);
        applySettings();
    });
    
    document.getElementById('difficulty')?.addEventListener('change', (e) => {
        Storage.updateSetting('difficulty', e.target.value);
    });
    
    document.getElementById('autosave-enabled')?.addEventListener('change', (e) => {
        Storage.updateSetting('autosaveEnabled', e.target.checked);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideGameMenu();
            const sheet = document.getElementById('character-sheet');
            if (sheet && sheet.classList.contains('visible')) {
                toggleCharacterSheet();
            }
            const journal = document.getElementById('quest-journal-sidebar');
            if (journal && journal.classList.contains('visible')) {
                toggleQuestJournal();
            }
        }
        
        // Quick save (Ctrl+S)
        if (e.ctrlKey && e.key === 's' && currentScreen === 'game-screen') {
            e.preventDefault();
            saveGame();
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('game-menu-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'game-menu-modal') {
            hideGameMenu();
        }
    });
}

// ========================================
// Utility Functions
// ========================================
function formatMarkdown(text) {
    return text
        // Headers
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraphs
        .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<h') || match.startsWith('<p>')) return match;
            return `<p>${match}</p>`;
        })
        // Clean up empty paragraphs
        .replace(/<p><\/p>/g, '')
        .replace(/<p><br><\/p>/g, '');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        particle.style.animationDuration = `${6 + Math.random() * 4}s`;
        container.appendChild(particle);
    }
}

// ========================================
// Debug Helpers (remove in production)
// ========================================
window.DEBUG = {
    character: () => console.log(Character.current),
    gameState: () => console.log(Storage.getGameState()),
    storage: () => console.log(Storage.getStorageUsage()),
    giveXP: (amount) => Character.addExperience(amount),
    heal: () => Character.heal(999),
    damage: (amount) => Character.takeDamage(amount),
    spawnEnemy: (type) => Combat.spawnEnemy(type),
    teleport: (scene) => {
        DungeonMaster.currentScene = scene;
        addStoryMessage('dm', DungeonMaster.describeSurroundings());
    }
};

console.log('🎮 Debug commands available via DEBUG object');
