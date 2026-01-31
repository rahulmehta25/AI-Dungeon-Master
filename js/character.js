/* ========================================
   AI Dungeon Master - Character Module
   Character creation and management
   ======================================== */

const Character = {
    // Current character being created/edited
    current: null,
    
    // Creation step tracking
    creationStep: 1,
    maxSteps: 5,

    // ========================================
    // Race Definitions
    // ========================================
    races: {
        human: {
            name: 'Human',
            icon: '👤',
            description: 'Versatile and ambitious, humans adapt to any challenge.',
            statBonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
            traits: ['Adaptable', 'Ambitious'],
            languages: ['Common', 'One of choice']
        },
        elf: {
            name: 'Elf',
            icon: '🧝',
            description: 'Graceful and wise, with keen senses and ancient knowledge.',
            statBonuses: { DEX: 2, WIS: 1 },
            traits: ['Darkvision', 'Fey Ancestry', 'Trance'],
            languages: ['Common', 'Elvish']
        },
        dwarf: {
            name: 'Dwarf',
            icon: '⛏️',
            description: 'Sturdy and resilient, masters of stone and steel.',
            statBonuses: { CON: 2, STR: 1 },
            traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
            languages: ['Common', 'Dwarvish']
        },
        halfling: {
            name: 'Halfling',
            icon: '🍀',
            description: 'Small but brave, blessed with uncanny luck.',
            statBonuses: { DEX: 2, CHA: 1 },
            traits: ['Lucky', 'Brave', 'Nimble'],
            languages: ['Common', 'Halfling']
        },
        dragonborn: {
            name: 'Dragonborn',
            icon: '🐉',
            description: 'Proud dragon-kin with breath weapon and scales.',
            statBonuses: { STR: 2, CHA: 1 },
            traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
            languages: ['Common', 'Draconic']
        },
        tiefling: {
            name: 'Tiefling',
            icon: '😈',
            description: 'Infernal heritage grants dark powers and charm.',
            statBonuses: { CHA: 2, INT: 1 },
            traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
            languages: ['Common', 'Infernal']
        }
    },

    // ========================================
    // Class Definitions
    // ========================================
    classes: {
        warrior: {
            name: 'Warrior',
            icon: '⚔️',
            description: 'Master of martial combat and weapons.',
            hitDie: 10,
            primaryStat: 'STR',
            savingThrows: ['STR', 'CON'],
            startingHP: 12,
            abilities: [
                { name: 'Second Wind', description: 'Recover 1d10+level HP once per rest' },
                { name: 'Fighting Style', description: 'Specialized combat technique' }
            ],
            equipment: ['Longsword', 'Shield', 'Chain Mail', 'Adventurer\'s Pack']
        },
        mage: {
            name: 'Mage',
            icon: '🔮',
            description: 'Wielder of arcane magic and ancient spells.',
            hitDie: 6,
            primaryStat: 'INT',
            savingThrows: ['INT', 'WIS'],
            startingHP: 8,
            abilities: [
                { name: 'Spellcasting', description: 'Cast arcane spells using intelligence' },
                { name: 'Arcane Recovery', description: 'Recover spell slots during short rest' }
            ],
            equipment: ['Staff', 'Spellbook', 'Robes', 'Component Pouch']
        },
        rogue: {
            name: 'Rogue',
            icon: '🗡️',
            description: 'Stealthy assassin skilled in deception.',
            hitDie: 8,
            primaryStat: 'DEX',
            savingThrows: ['DEX', 'INT'],
            startingHP: 10,
            abilities: [
                { name: 'Sneak Attack', description: 'Extra damage when you have advantage' },
                { name: 'Cunning Action', description: 'Dash, Disengage, or Hide as bonus action' }
            ],
            equipment: ['Daggers (2)', 'Shortbow', 'Leather Armor', 'Thieves\' Tools']
        },
        cleric: {
            name: 'Cleric',
            icon: '✨',
            description: 'Divine champion blessed with healing power.',
            hitDie: 8,
            primaryStat: 'WIS',
            savingThrows: ['WIS', 'CHA'],
            startingHP: 10,
            abilities: [
                { name: 'Spellcasting', description: 'Cast divine spells using wisdom' },
                { name: 'Channel Divinity', description: 'Invoke divine power for special effects' }
            ],
            equipment: ['Mace', 'Holy Symbol', 'Scale Mail', 'Shield']
        },
        ranger: {
            name: 'Ranger',
            icon: '🏹',
            description: 'Wilderness expert and deadly archer.',
            hitDie: 10,
            primaryStat: 'DEX',
            savingThrows: ['STR', 'DEX'],
            startingHP: 12,
            abilities: [
                { name: 'Favored Enemy', description: 'Advantage against certain creature types' },
                { name: 'Natural Explorer', description: 'Expert at navigating wilderness' }
            ],
            equipment: ['Longbow', 'Shortsword', 'Leather Armor', 'Explorer\'s Pack']
        },
        bard: {
            name: 'Bard',
            icon: '🎵',
            description: 'Charismatic performer with magical music.',
            hitDie: 8,
            primaryStat: 'CHA',
            savingThrows: ['DEX', 'CHA'],
            startingHP: 10,
            abilities: [
                { name: 'Spellcasting', description: 'Cast spells through performance' },
                { name: 'Bardic Inspiration', description: 'Inspire allies with bonus dice' }
            ],
            equipment: ['Rapier', 'Lute', 'Leather Armor', 'Entertainer\'s Pack']
        }
    },

    // ========================================
    // Background Definitions
    // ========================================
    backgrounds: {
        noble: {
            name: 'Noble',
            icon: '👑',
            description: 'Born to privilege, you seek adventure beyond castle walls.',
            skills: ['History', 'Persuasion'],
            equipment: ['Fine Clothes', 'Signet Ring', '25 gold'],
            feature: 'Position of Privilege'
        },
        soldier: {
            name: 'Soldier',
            icon: '🛡️',
            description: 'War forged your skills. Peace left you restless.',
            skills: ['Athletics', 'Intimidation'],
            equipment: ['Rank Insignia', 'Trophy', '10 gold'],
            feature: 'Military Rank'
        },
        scholar: {
            name: 'Scholar',
            icon: '📚',
            description: 'Knowledge is power. You seek forbidden truths.',
            skills: ['Arcana', 'History'],
            equipment: ['Ink & Quill', 'Parchment', '10 gold'],
            feature: 'Researcher'
        },
        outlander: {
            name: 'Outlander',
            icon: '🌲',
            description: 'Raised in the wilds, civilization is your new frontier.',
            skills: ['Athletics', 'Survival'],
            equipment: ['Staff', 'Hunting Trap', '10 gold'],
            feature: 'Wanderer'
        },
        criminal: {
            name: 'Criminal',
            icon: '🎭',
            description: 'Your past is shadowy. Your future is yours to write.',
            skills: ['Deception', 'Stealth'],
            equipment: ['Crowbar', 'Dark Clothes', '15 gold'],
            feature: 'Criminal Contact'
        },
        acolyte: {
            name: 'Acolyte',
            icon: '🙏',
            description: 'Devoted to the divine, you carry faith as your shield.',
            skills: ['Insight', 'Religion'],
            equipment: ['Holy Symbol', 'Prayer Book', '15 gold'],
            feature: 'Shelter of the Faithful'
        }
    },

    // ========================================
    // Character Creation
    // ========================================
    startCreation() {
        this.current = {
            name: '',
            race: null,
            class: null,
            background: null,
            level: 1,
            experience: 0,
            stats: {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            },
            hp: { current: 10, max: 10 },
            inventory: [],
            abilities: [],
            gold: 50,
            createdAt: new Date().toISOString()
        };
        this.creationStep = 1;
        this.updateCreationUI();
    },

    nextStep() {
        console.log('🎭 Character.nextStep() - current step:', this.creationStep);
        // Validate current step
        if (!this.validateStep()) {
            console.log('🎭 Validation failed');
            return false;
        }

        if (this.creationStep < this.maxSteps) {
            this.creationStep++;
            console.log('🎭 Moving to step:', this.creationStep);
            this.updateCreationUI();
            return true;
        } else {
            // Final step - complete creation
            console.log('🎭 Final step - completing creation');
            this.completeCreation();
            return true;
        }
    },

    prevStep() {
        if (this.creationStep > 1) {
            this.creationStep--;
            this.updateCreationUI();
            return true;
        }
        return false;
    },

    validateStep() {
        switch (this.creationStep) {
            case 1: // Name
                const name = document.getElementById('char-name')?.value?.trim();
                if (!name || name.length < 2) {
                    showToast('Please enter a name (at least 2 characters)', 'error');
                    return false;
                }
                this.current.name = name;
                return true;

            case 2: // Race
                if (!this.current.race) {
                    showToast('Please select a race', 'error');
                    return false;
                }
                return true;

            case 3: // Class
                if (!this.current.class) {
                    showToast('Please select a class', 'error');
                    return false;
                }
                return true;

            case 4: // Background
                if (!this.current.background) {
                    showToast('Please select a background', 'error');
                    return false;
                }
                return true;

            case 5: // Summary - always valid
                return true;

            default:
                return true;
        }
    },

    selectRace(raceKey) {
        this.current.race = raceKey;
        this.updateRaceSelection();
        this.calculateStats();
    },

    selectClass(classKey) {
        this.current.class = classKey;
        this.updateClassSelection();
        this.calculateStats();
    },

    selectBackground(bgKey) {
        this.current.background = bgKey;
        this.updateBackgroundSelection();
    },

    calculateStats() {
        // Start with base stats (standard array)
        const baseStats = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
        
        // Roll for stats (4d6 drop lowest simulation - simplified)
        Object.keys(baseStats).forEach(stat => {
            baseStats[stat] = Math.floor(Math.random() * 6) + 8; // 8-13 base
        });

        // Apply class primary stat bonus
        if (this.current.class) {
            const classInfo = this.classes[this.current.class];
            if (classInfo.primaryStat) {
                baseStats[classInfo.primaryStat] += 2;
            }
        }

        // Apply race bonuses
        if (this.current.race) {
            const raceInfo = this.races[this.current.race];
            Object.entries(raceInfo.statBonuses).forEach(([stat, bonus]) => {
                baseStats[stat] = (baseStats[stat] || 10) + bonus;
            });
        }

        this.current.stats = baseStats;

        // Calculate HP
        if (this.current.class) {
            const classInfo = this.classes[this.current.class];
            const conMod = this.getModifier(baseStats.CON);
            this.current.hp = {
                current: classInfo.startingHP + conMod,
                max: classInfo.startingHP + conMod
            };
        }

        this.updateStatsDisplay();
    },

    getModifier(stat) {
        return Math.floor((stat - 10) / 2);
    },

    completeCreation() {
        // Finalize character
        const classInfo = this.classes[this.current.class];
        const bgInfo = this.backgrounds[this.current.background];

        // Add starting equipment
        this.current.inventory = [
            ...classInfo.equipment,
            ...bgInfo.equipment
        ];

        // Add abilities
        this.current.abilities = [...classInfo.abilities];

        // Add gold
        this.current.gold = 50;

        // Save character
        Storage.saveCharacter(this.current);

        // Initialize game state
        const gameState = {
            currentScene: 'intro',
            questLog: [],
            npcsEncountered: [],
            locationsVisited: ['tavern'],
            combatActive: false,
            turnNumber: 0
        };
        Storage.saveGameState(gameState);

        console.log('✅ Character created:', this.current.name);
        
        // Start the game!
        if (typeof startAdventure === 'function') {
            startAdventure();
        } else if (typeof initGameScreen === 'function') {
            initGameScreen();
        }
        
        return this.current;
    },

    // ========================================
    // UI Updates
    // ========================================
    updateCreationUI() {
        // Hide all steps
        document.querySelectorAll('.creation-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        const stepNames = ['name', 'race', 'class', 'background', 'summary'];
        const currentStepEl = document.getElementById(`step-${stepNames[this.creationStep - 1]}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }

        // Update step indicators
        document.querySelectorAll('.step-dot').forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index + 1 === this.creationStep) {
                dot.classList.add('active');
            } else if (index + 1 < this.creationStep) {
                dot.classList.add('completed');
            }
        });

        // Update nav buttons
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        
        if (prevBtn) prevBtn.disabled = this.creationStep === 1;
        if (nextBtn) {
            nextBtn.textContent = this.creationStep === this.maxSteps ? 'Begin Adventure →' : 'Next →';
        }

        // Update summary if on last step
        if (this.creationStep === this.maxSteps) {
            this.updateSummary();
        }
    },

    updateRaceSelection() {
        document.querySelectorAll('#race-options .option-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.value === this.current.race);
        });
    },

    updateClassSelection() {
        document.querySelectorAll('#class-options .option-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.value === this.current.class);
        });
    },

    updateBackgroundSelection() {
        document.querySelectorAll('#background-options .background-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.value === this.current.background);
        });
    },

    updateStatsDisplay() {
        const statsContainer = document.getElementById('summary-stats');
        if (!statsContainer || !this.current.stats) return;

        statsContainer.innerHTML = Object.entries(this.current.stats).map(([stat, value]) => `
            <div class="stat-block">
                <div class="stat-name">${stat}</div>
                <div class="stat-value">${value}</div>
            </div>
        `).join('');
    },

    updateSummary() {
        if (!this.current) return;

        const raceInfo = this.races[this.current.race];
        const classInfo = this.classes[this.current.class];
        const bgInfo = this.backgrounds[this.current.background];

        document.getElementById('summary-icon').textContent = classInfo?.icon || '⚔️';
        document.getElementById('summary-name').textContent = this.current.name || 'Unknown Hero';
        document.getElementById('summary-info').textContent = 
            `${raceInfo?.name || 'Unknown'} ${classInfo?.name || 'Adventurer'}`;
        document.getElementById('summary-background').textContent = bgInfo?.name || 'Wanderer';

        this.updateStatsDisplay();
    },

    // ========================================
    // Game Integration
    // ========================================
    getIcon() {
        if (!this.current?.class) return '⚔️';
        return this.classes[this.current.class]?.icon || '⚔️';
    },

    getFullTitle() {
        if (!this.current) return 'Unknown Adventurer';
        const raceInfo = this.races[this.current.race];
        const classInfo = this.classes[this.current.class];
        return `${raceInfo?.name || ''} ${classInfo?.name || 'Adventurer'}`.trim();
    },

    takeDamage(amount) {
        if (!this.current) return;
        this.current.hp.current = Math.max(0, this.current.hp.current - amount);
        Storage.saveCharacter(this.current);
        return this.current.hp.current;
    },

    heal(amount) {
        if (!this.current) return;
        this.current.hp.current = Math.min(this.current.hp.max, this.current.hp.current + amount);
        Storage.saveCharacter(this.current);
        return this.current.hp.current;
    },

    addExperience(amount) {
        if (!this.current) return;
        this.current.experience += amount;
        
        // Check for level up (simple: 100 XP per level)
        const xpNeeded = this.current.level * 100;
        if (this.current.experience >= xpNeeded) {
            this.levelUp();
        }
        
        Storage.saveCharacter(this.current);
        return this.current.experience;
    },

    levelUp() {
        if (!this.current) return;
        
        this.current.level++;
        this.current.experience = 0;
        
        // Increase HP
        const classInfo = this.classes[this.current.class];
        const hpGain = Math.floor(classInfo.hitDie / 2) + 1 + this.getModifier(this.current.stats.CON);
        this.current.hp.max += hpGain;
        this.current.hp.current = this.current.hp.max;
        
        Storage.saveCharacter(this.current);
        showToast(`🎉 Level Up! You are now level ${this.current.level}!`, 'success');
        
        return this.current.level;
    },

    addItem(item) {
        if (!this.current) return;
        this.current.inventory.push(item);
        Storage.saveCharacter(this.current);
    },

    removeItem(itemName) {
        if (!this.current) return;
        const index = this.current.inventory.indexOf(itemName);
        if (index > -1) {
            this.current.inventory.splice(index, 1);
            Storage.saveCharacter(this.current);
            return true;
        }
        return false;
    },

    // Load existing character
    load() {
        const saved = Storage.getCharacter();
        if (saved) {
            this.current = saved;
            return true;
        }
        return false;
    }
};
