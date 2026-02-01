/* ========================================
   AI Dungeon Master - DM Module
   Narrative generation and game logic
   ======================================== */

const DungeonMaster = {
    // Current scene/context
    currentScene: 'intro',
    mood: 'neutral',
    
    // NPC tracking
    activeNPCs: [],
    
    // AI Backend Configuration
    apiEndpoint: 'http://localhost:3001/api',
    useAI: true, // Toggle for AI-powered responses
    
    // Conversation context (last 10 messages)
    conversationHistory: [],
    maxHistoryLength: 10,
    
    // Narrative templates
    scenes: {
        intro: {
            name: 'The Weary Wanderer Tavern',
            description: 'tavern',
            npcs: ['innkeeper', 'mysterious_stranger'],
            exits: ['town_square', 'upstairs', 'back_alley']
        },
        town_square: {
            name: 'Millbrook Town Square',
            description: 'town',
            npcs: ['merchant', 'guard'],
            exits: ['tavern', 'blacksmith', 'temple', 'forest_path']
        },
        forest_path: {
            name: 'The Darkwood Path',
            description: 'forest',
            npcs: [],
            exits: ['town_square', 'ancient_ruins', 'goblin_camp'],
            dangerous: true
        },
        ancient_ruins: {
            name: 'Ruins of Valdris',
            description: 'ruins',
            npcs: ['ghost_scholar'],
            exits: ['forest_path', 'underground_tomb'],
            dangerous: true
        },
        goblin_camp: {
            name: 'Goblin Encampment',
            description: 'camp',
            npcs: ['goblin_chief'],
            exits: ['forest_path'],
            hostile: true
        }
    },

    npcs: {
        innkeeper: {
            name: 'Greta Thornbrew',
            role: 'Innkeeper',
            personality: 'Warm and gossipy, knows everyone\'s business',
            greeting: 'Welcome, traveler! What can I get for you? A warm meal? A cold ale? Or perhaps... information?',
            topics: ['rumors', 'rooms', 'food', 'local_news']
        },
        mysterious_stranger: {
            name: 'The Hooded Figure',
            role: 'Quest Giver',
            personality: 'Cryptic and secretive, speaks in riddles',
            greeting: '*A hooded figure in the corner beckons you closer* "You have the look of one seeking purpose... or perhaps purpose seeks you."',
            topics: ['quest', 'ancient_evil', 'reward']
        },
        merchant: {
            name: 'Bertram Goldworth',
            role: 'Traveling Merchant',
            personality: 'Jovial but shrewd businessman',
            greeting: 'Ah, a customer! Come, come! I have wares from across the realm - potions, scrolls, trinkets of wonder!',
            topics: ['buy', 'sell', 'trade', 'rumors']
        },
        guard: {
            name: 'Captain Helena Ironfist',
            role: 'Town Guard Captain',
            personality: 'Stern but fair, protective of the town',
            greeting: 'Halt, stranger. State your business in Millbrook. We\'ve had... trouble lately.',
            topics: ['trouble', 'town_law', 'bounties', 'missing_people']
        },
        ghost_scholar: {
            name: 'Archmage Valdris',
            role: 'Ancient Ghost',
            personality: 'Melancholic, seeks redemption for past mistakes',
            greeting: '*A translucent figure materializes before you, ancient robes flowing in an ethereal wind* "Another seeker of knowledge... or power? Tell me, mortal, what brings you to my tomb?"',
            topics: ['history', 'magic', 'curse', 'treasure']
        }
    },

    // ========================================
    // AI Backend Integration
    // ========================================
    
    // Add message to conversation history
    addToConversationHistory(role, content) {
        this.conversationHistory.push({ role, content });
        
        // Keep only last N messages
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    },
    
    // Clear conversation history (e.g., on new game)
    clearConversationHistory() {
        this.conversationHistory = [];
    },
    
    // Call AI backend for dynamic response
    async callAI(playerInput) {
        try {
            const response = await fetch(`${this.apiEndpoint}/dm/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerInput,
                    context: {
                        history: this.conversationHistory,
                        currentScene: this.currentScene,
                        mood: this.mood,
                        currentEnemy: Combat.currentEnemy
                    },
                    character: Character.current,
                    gameState: Storage.getGameState()
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.response) {
                return { success: true, response: data.response };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.warn('AI backend unavailable:', error.message);
            return { success: false, error: error.message };
        }
    },
    
    // Call AI for combat narration
    async callAICombat(combatData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/dm/combat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(combatData)
            });
            
            const data = await response.json();
            
            if (data.success && data.narration) {
                return data.narration;
            }
            return null;
        } catch (error) {
            console.warn('AI combat narration unavailable:', error.message);
            return null;
        }
    },
    
    // Check if AI backend is available
    async checkAIHealth() {
        try {
            const response = await fetch(`${this.apiEndpoint}/health`);
            const data = await response.json();
            return data.status === 'ok' && data.hasApiKey;
        } catch (error) {
            return false;
        }
    },

    // ========================================
    // Narrative Generation
    // ========================================
    async generateResponse(playerInput) {
        const input = playerInput.toLowerCase().trim();
        const character = Character.current;
        const gameState = Storage.getGameState();

        // Add player input to conversation history
        this.addToConversationHistory('user', playerInput);

        // Parse intent for special handlers (inventory, dice rolls, etc.)
        const intent = this.parseIntent(input);
        
        // Some actions should use local handlers for game mechanics
        let response;
        let useLocalHandler = false;
        
        switch (intent.type) {
            case 'inventory':
                // Always use local - just displays data
                response = this.showInventory();
                useLocalHandler = true;
                break;
            case 'roll':
                // Always use local - dice mechanics
                response = await this.handleDiceRoll(intent.target);
                useLocalHandler = true;
                break;
            case 'move':
                // Use local for game state, but can enhance with AI
                response = this.handleMovement(intent.target);
                useLocalHandler = true;
                break;
            case 'attack':
                // Combat uses local mechanics but AI narration
                response = await this.handleCombat(intent.target);
                useLocalHandler = true;
                break;
            case 'use':
                // Item mechanics are local
                response = this.handleUseItem(intent.target);
                useLocalHandler = true;
                break;
        }
        
        // For narrative actions, try AI first
        if (!useLocalHandler && this.useAI) {
            const aiResult = await this.callAI(playerInput);
            
            if (aiResult.success) {
                response = aiResult.response;
            } else {
                // Fall back to local handlers
                response = await this.handleWithLocalFallback(intent, input);
            }
        } else if (!useLocalHandler) {
            response = await this.handleWithLocalFallback(intent, input);
        }
        
        // Add DM response to conversation history
        this.addToConversationHistory('assistant', response);

        // Save to story history
        Storage.addToStoryHistory({
            type: 'dm',
            text: response
        });

        return response;
    },
    
    // Handle with local fallback methods
    async handleWithLocalFallback(intent, input) {
        switch (intent.type) {
            case 'look':
                return this.describeSurroundings();
            case 'talk':
                return this.handleDialogue(intent.target, input);
            case 'rest':
                return this.handleRest();
            case 'search':
                return await this.handleSearch();
            default:
                return this.handleFreeformAction(input);
        }
    },

    parseIntent(input) {
        // Look/examine
        if (/^(look|examine|inspect|observe|see|check out|describe|what do i see|where am i)/i.test(input)) {
            const target = input.replace(/^(look at|examine|inspect|look|check out)\s*/i, '').trim();
            return { type: 'look', target };
        }

        // Talk/speak
        if (/^(talk|speak|say|ask|tell|greet|approach|chat|converse)/i.test(input)) {
            const target = input.replace(/^(talk to|speak to|speak with|talk with|say to|ask|tell|greet|approach|chat with)\s*/i, '').trim();
            return { type: 'talk', target };
        }

        // Movement
        if (/^(go|walk|move|travel|head|enter|leave|exit|run|proceed)/i.test(input)) {
            const target = input.replace(/^(go to|walk to|move to|travel to|head to|enter|leave|exit|go|walk|run to|proceed to)\s*/i, '').trim();
            return { type: 'move', target };
        }

        // Combat
        if (/^(attack|fight|strike|hit|slash|stab|shoot|cast|smite)/i.test(input)) {
            const target = input.replace(/^(attack|fight|strike|hit|slash|stab|shoot at|cast at|smite)\s*/i, '').trim();
            return { type: 'attack', target };
        }

        // Inventory
        if (/^(inventory|items|bag|backpack|what do i have|check inventory|my stuff)/i.test(input)) {
            return { type: 'inventory' };
        }

        // Rest
        if (/^(rest|sleep|camp|heal|take a break|sit down|meditate)/i.test(input)) {
            return { type: 'rest' };
        }

        // Search
        if (/^(search|loot|scavenge|look for|find|investigate)/i.test(input)) {
            const target = input.replace(/^(search|loot|scavenge|look for|find|investigate)\s*/i, '').trim();
            return { type: 'search', target };
        }

        // Use item
        if (/^(use|drink|eat|equip|activate|read)/i.test(input)) {
            const target = input.replace(/^(use|drink|eat|equip|activate|read)\s*/i, '').trim();
            return { type: 'use', target };
        }

        // Dice roll
        if (/^(roll|dice|d20|d6|d8|d10|d12|d4|d100)/i.test(input)) {
            const match = input.match(/d(\d+)/i);
            return { type: 'roll', target: match ? parseInt(match[1]) : 20 };
        }

        return { type: 'freeform', target: input };
    },

    // ========================================
    // Action Handlers
    // ========================================
    describeSurroundings() {
        const scene = this.scenes[this.currentScene];
        const descriptions = this.getSceneDescriptions();
        
        let text = `**${scene.name}**\n\n`;
        text += descriptions[scene.description] || descriptions.generic;
        
        // Add NPCs
        if (scene.npcs && scene.npcs.length > 0) {
            text += '\n\n**People here:**\n';
            scene.npcs.forEach(npcId => {
                const npc = this.npcs[npcId];
                if (npc) {
                    text += `• ${npc.name} (${npc.role})\n`;
                }
            });
        }

        // Add exits
        if (scene.exits && scene.exits.length > 0) {
            text += '\n**Exits:**\n';
            scene.exits.forEach(exit => {
                const exitScene = this.scenes[exit];
                text += `• ${exitScene?.name || this.formatExitName(exit)}\n`;
            });
        }

        return text;
    },

    getSceneDescriptions() {
        return {
            tavern: `The Weary Wanderer is everything a roadside tavern should be. Warm firelight flickers across weathered wooden beams, casting dancing shadows on walls adorned with hunting trophies and faded maps. The air is thick with the smell of roasting meat, spilled ale, and pipe smoke.

A handful of patrons nurse their drinks at scattered tables. In one corner, a group of farmers argue about crop prices. Near the fire, a bard tunes her lute. And in the darkest corner... a hooded figure sits alone, watching.

The bar itself is tended by a stout woman with kind eyes and flour-dusted apron.`,

            town: `Millbrook's town square bustles with daily life. Merchants hawk their wares from colorful stalls, children chase each other around the central fountain (a weathered statue of the town's founder), and the smell of fresh bread wafts from a nearby bakery.

To the north, the temple's bell tower rises above the rooftops. The blacksmith's rhythmic hammering echoes from the east. Guards patrol the cobblestone streets, their expressions unusually tense.

Something feels... off. The smiles don't quite reach people's eyes, and conversations stop when strangers draw near.`,

            forest: `The path into the Darkwood grows narrow and treacherous. Ancient oaks tower overhead, their gnarled branches intertwining to form a canopy so thick that only scattered beams of sunlight pierce through.

The air grows cold and still. No birds sing here. The undergrowth rustles with unseen movement, and strange symbols are carved into the bark of the oldest trees.

Your instincts scream that you are not alone. That something is watching from the shadows.`,

            ruins: `The Ruins of Valdris rise before you like broken teeth against the gray sky. Once a grand academy of magic, now only crumbling walls and shattered towers remain.

The ground is littered with ancient stones covered in faded runes. Ethereal wisps drift between the columns, remnants of magical experiments gone wrong centuries ago.

At the heart of the ruins, a stone staircase descends into darkness. Cold air rises from below, carrying whispers in a language long forgotten.`,

            camp: `Crude tents and ramshackle structures surround a central bonfire. The stench of unwashed bodies and rotting meat fills the air. Goblins—dozens of them—move about the camp, sharpening weapons, arguing over scraps of food, or sleeping in piles.

In the largest tent, you can make out a massive figure: the Goblin Chief, seated on a throne of bones and rusted weapons.

They haven't noticed you... yet.`,

            generic: `You take in your surroundings carefully, alert for any danger or opportunity.`
        };
    },

    formatExitName(exit) {
        return exit.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },

    handleDialogue(target, fullInput) {
        // Find matching NPC
        const scene = this.scenes[this.currentScene];
        let npc = null;
        let npcId = null;

        for (const id of (scene.npcs || [])) {
            const n = this.npcs[id];
            if (n && (
                n.name.toLowerCase().includes(target.toLowerCase()) ||
                n.role.toLowerCase().includes(target.toLowerCase()) ||
                id.includes(target.toLowerCase())
            )) {
                npc = n;
                npcId = id;
                break;
            }
        }

        if (!npc) {
            return this.generateNoTargetResponse('talk to');
        }

        // Generate dialogue based on context
        const dialogue = this.generateNPCDialogue(npc, npcId, fullInput);
        return dialogue;
    },

    generateNPCDialogue(npc, npcId, playerInput) {
        const character = Character.current;
        
        // Check if this is first interaction
        const gameState = Storage.getGameState();
        const hasMetBefore = gameState.npcsEncountered?.includes(npcId);

        let response = '';

        if (!hasMetBefore) {
            // First meeting
            response = `*You approach ${npc.name}.*\n\n`;
            response += `**${npc.name}:** "${npc.greeting}"`;
            
            // Mark as encountered
            if (!gameState.npcsEncountered) gameState.npcsEncountered = [];
            gameState.npcsEncountered.push(npcId);
            Storage.saveGameState(gameState);
        } else {
            response = `**${npc.name}:** `;
            response += this.generateContextualDialogue(npc, npcId, playerInput);
        }

        return response;
    },

    generateContextualDialogue(npc, npcId, input) {
        // Topic-based responses
        const dialogues = {
            innkeeper: {
                default: [
                    '"Another ale, dear? Or perhaps you\'d like to hear what news has come through?"',
                    '"The fire\'s warm and the company\'s good. Stay as long as you like."',
                    '"You look tired, traveler. We have rooms upstairs if you need rest."'
                ],
                rumors: '"*She leans in conspiratorially* Word is, folk have been going missing in the woods. Three this month alone. The guard says it\'s bandits, but I\'ve heard stranger tales..."',
                rooms: '"Five gold for the night, includes breakfast. Clean sheets, I promise you that."',
                quest: '"*She glances at the hooded figure* That one\'s been asking about adventurers. Might be worth your while to speak with them."'
            },
            mysterious_stranger: {
                default: [
                    '"Patience... all will be revealed in time."',
                    '"*The figure\'s eyes gleam beneath the hood* The threads of fate are tangled, adventurer."',
                    '"Are you prepared to walk the path of shadows?"'
                ],
                quest: '"Deep in the Darkwood lies an ancient evil. It stirs once more, drawing the innocent to their doom. I seek one brave enough—or foolish enough—to end this threat. The reward? More gold than you can carry... and answers to questions you haven\'t yet thought to ask."',
                reward: '"*A leather pouch appears in the figure\'s hand* Two hundred gold pieces now. Another three hundred when the deed is done. Plus whatever treasures you find along the way."',
                ancient_evil: '"It has many names. The Hunger. The Whispering Dark. Long ago, the mage Valdris thought to bind it, use its power. He failed. Now it wakes, and it is hungry."'
            },
            guard: {
                default: [
                    '"Keep your weapons sheathed and your nose clean, and we\'ll have no trouble."',
                    '"*She eyes you warily* Something I can help you with?"',
                    '"Move along. Nothing to see here."'
                ],
                trouble: '"*Her expression darkens* People have been disappearing. Good folk. We found one... what was left of one... at the forest\'s edge. This isn\'t bandit work. This is something else."',
                bounties: '"Aye, there\'s bounties. Goblins in the eastern woods—five gold per ear. And there\'s a standing reward for information about the disappearances. Fifty gold."',
                missing_people: '"Farmer Giles. Miller\'s daughter. Old Tom the woodcutter. All vanished within a fortnight. All last seen heading toward or near the old ruins."'
            },
            ghost_scholar: {
                default: [
                    '"*The ghost\'s form flickers* Time... I have too much of it now."',
                    '"The living always seek the same things. Power. Knowledge. Immortality. I sought them all, and look what I became."',
                    '"Ask your questions, mortal. I tire of this eternal silence."'
                ],
                history: '"I was Valdris, Archmage of the Silver Circle. A thousand years ago, this was my academy. My students filled these halls with laughter and light. Then came my great folly..."',
                curse: '"I sought to bind the Whispering Dark, to use its power to unlock the secrets of immortality. I succeeded... in a way. Now I am bound here, unable to move on, unable to die, while the evil I unleashed grows stronger."',
                treasure: '"*The ghost gestures to the stairs leading down* Below lies my vault. Within it, the Amulet of Valdris—my last creation, imbued with the power to banish the Whispering Dark forever. But the creature guards it jealously. Many have tried to claim it. Their bones decorate its lair."'
            }
        };

        const npcDialogues = dialogues[npcId];
        if (!npcDialogues) {
            return `"I have nothing more to say on that matter."`;
        }

        // Check for topic keywords
        for (const topic of (this.npcs[npcId]?.topics || [])) {
            if (input.toLowerCase().includes(topic)) {
                if (npcDialogues[topic]) {
                    return npcDialogues[topic];
                }
            }
        }

        // Default response
        const defaults = npcDialogues.default || ['"I have nothing more to say."'];
        return defaults[Math.floor(Math.random() * defaults.length)];
    },

    handleMovement(target) {
        const scene = this.scenes[this.currentScene];
        const exits = scene.exits || [];

        // Find matching exit
        let destination = null;
        for (const exit of exits) {
            const exitScene = this.scenes[exit];
            if (
                exit.toLowerCase().includes(target.toLowerCase()) ||
                (exitScene?.name || '').toLowerCase().includes(target.toLowerCase())
            ) {
                destination = exit;
                break;
            }
        }

        if (!destination) {
            return `You can't go that way. Available exits are: ${exits.map(e => this.scenes[e]?.name || this.formatExitName(e)).join(', ')}.`;
        }

        // Move to new scene
        this.currentScene = destination;
        const newScene = this.scenes[destination];

        // Update game state
        const gameState = Storage.getGameState();
        if (!gameState.locationsVisited) gameState.locationsVisited = [];
        if (!gameState.locationsVisited.includes(destination)) {
            gameState.locationsVisited.push(destination);
        }
        gameState.currentScene = destination;
        Storage.saveGameState(gameState);

        // Generate movement narrative
        let response = this.getMovementNarrative(destination);
        response += '\n\n---\n\n';
        response += this.describeSurroundings();

        // Random encounter in dangerous areas
        if (newScene.dangerous && Math.random() < 0.3) {
            response += '\n\n⚠️ *You sense danger nearby...*';
        }

        return response;
    },

    getMovementNarrative(destination) {
        const narratives = {
            tavern: 'You push open the heavy oak door and step into the warmth of the tavern.',
            town_square: 'You emerge into the bustling town square, blinking in the daylight.',
            forest_path: 'You leave the safety of the town behind, the trees closing in around you as you venture into the Darkwood.',
            ancient_ruins: 'The forest gives way to crumbling stone. The air grows heavy with ancient magic.',
            goblin_camp: 'You creep through the underbrush until the goblin camp comes into view.',
            underground_tomb: 'You descend the ancient stairs, each step taking you deeper into darkness.',
            blacksmith: 'The ring of hammer on steel grows louder as you approach the smithy.',
            temple: 'The temple doors swing open silently, revealing a peaceful sanctuary.',
            back_alley: 'You slip into the narrow alley behind the tavern, where shadows pool and secrets are traded.',
            upstairs: 'The wooden stairs creak under your weight as you climb to the inn\'s upper floor.'
        };

        return narratives[destination] || `You make your way to ${this.formatExitName(destination)}.`;
    },

    async handleCombat(target) {
        // Check if there's an active enemy
        if (!Combat.currentEnemy) {
            // Try to spawn one based on context
            const scene = this.scenes[this.currentScene];
            if (scene.hostile || scene.dangerous) {
                Combat.spawnEnemy();
            } else {
                return 'There\'s nothing here to fight. Perhaps you should explore more dangerous areas.';
            }
        }

        const enemy = Combat.currentEnemy;
        let response = '';

        // Player attack
        const attack = Combat.attack(enemy.ac);
        
        // Show dice roll visually
        await Combat.showDiceRoll(20, attack.attackRoll);

        response += `**Combat: ${Character.current.name} vs ${enemy.name}**\n\n`;
        response += `*You attack the ${enemy.name}!*\n`;
        response += `Attack roll: 🎲 ${attack.attackRoll} + ${attack.modifier} = ${attack.totalAttack} vs AC ${attack.targetAC}\n\n`;

        if (attack.critical) {
            response += `💥 **CRITICAL HIT!** `;
        }

        response += `${attack.description}\n`;

        if (attack.hit) {
            const result = Combat.damageEnemy(attack.damage.total);
            
            if (result.defeated) {
                response += `\n🏆 **Victory!** The ${enemy.name} falls!\n`;
                response += `You gain ${result.xp} XP!`;
                Character.addExperience(result.xp);
                
                // Update UI
                updateGameUI();
            } else {
                response += `\n*The ${enemy.name} has ${result.remainingHp}/${enemy.maxHp} HP remaining.*\n\n`;
                
                // Enemy counterattack
                const counterattack = Combat.enemyAttack();
                response += `**${enemy.name} attacks!**\n`;
                response += `Attack roll: 🎲 ${counterattack.attackRoll} + ${enemy.attack} = ${counterattack.totalAttack} vs your AC ${counterattack.playerAC}\n\n`;

                if (counterattack.hit) {
                    response += `💢 ${counterattack.damage} damage!`;
                    Character.takeDamage(counterattack.damage);
                    updateGameUI();
                    
                    if (Character.current.hp.current <= 0) {
                        response += '\n\n☠️ **You have fallen in battle!**';
                    }
                } else {
                    response += 'The attack misses!';
                }
            }
        }

        return response;
    },

    showInventory() {
        const character = Character.current;
        if (!character) return 'No character loaded.';

        let response = `**${character.name}'s Inventory**\n\n`;
        response += `💰 Gold: ${character.gold}\n\n`;
        response += `**Items:**\n`;
        
        if (character.inventory.length === 0) {
            response += '*Your pack is empty.*';
        } else {
            character.inventory.forEach(item => {
                response += `• ${item}\n`;
            });
        }

        return response;
    },

    handleRest() {
        const character = Character.current;
        const scene = this.scenes[this.currentScene];

        if (scene.hostile || scene.dangerous) {
            const check = Combat.skillCheck('WIS', 15);
            if (!check.success) {
                // Interrupted rest - spawn enemy
                Combat.spawnEnemy();
                return `*You attempt to rest, but sense danger approaching...*\n\n⚔️ A ${Combat.currentEnemy.name} appears!`;
            }
        }

        // Heal
        const healAmount = Math.floor(character.hp.max * 0.5);
        Character.heal(healAmount);
        updateGameUI();

        const restNarratives = [
            `You find a quiet spot and rest for a while. The tension eases from your muscles as you recover ${healAmount} HP.`,
            `You take a moment to catch your breath and tend to your wounds. You recover ${healAmount} HP.`,
            `A short rest restores your energy. You feel refreshed and ready to continue. (+${healAmount} HP)`
        ];

        return restNarratives[Math.floor(Math.random() * restNarratives.length)];
    },

    async handleSearch() {
        const check = Combat.skillCheck('INT', 12);
        
        await Combat.showDiceRoll(20, check.rolls[0]);

        let response = `*You search the area carefully...*\n`;
        response += `Investigation: 🎲 ${check.rolls[0]} + ${check.modifier} = ${check.total} (DC 12)\n\n`;

        if (check.criticalSuccess) {
            response += '✨ **Critical Success!** ';
            const treasure = this.generateTreasure('rare');
            response += `You discover ${treasure}!`;
        } else if (check.success) {
            if (Math.random() < 0.6) {
                const treasure = this.generateTreasure('common');
                response += `You find ${treasure}!`;
            } else {
                response += 'You find nothing of value, but notice some interesting details about your surroundings.';
            }
        } else if (check.criticalFail) {
            response += '💀 **Critical Failure!** Your search disturbs something dangerous...';
            Combat.spawnEnemy();
            response += ` A ${Combat.currentEnemy.name} appears!`;
        } else {
            response += 'Your search yields nothing useful.';
        }

        return response;
    },

    generateTreasure(rarity) {
        const treasures = {
            common: [
                { item: '10 gold coins', gold: 10 },
                { item: 'a small healing potion', addItem: 'Potion of Healing' },
                { item: 'a rusty dagger', addItem: 'Rusty Dagger' },
                { item: '15 gold coins', gold: 15 }
            ],
            rare: [
                { item: '50 gold coins', gold: 50 },
                { item: 'a glowing potion of greater healing', addItem: 'Potion of Greater Healing' },
                { item: 'a magical scroll', addItem: 'Scroll of Fireball' },
                { item: 'a finely crafted weapon', addItem: 'Masterwork Longsword' }
            ]
        };

        const pool = treasures[rarity] || treasures.common;
        const found = pool[Math.floor(Math.random() * pool.length)];

        if (found.gold) {
            Character.current.gold += found.gold;
            Storage.saveCharacter(Character.current);
        }
        if (found.addItem) {
            Character.addItem(found.addItem);
        }

        return found.item;
    },

    handleUseItem(itemName) {
        const character = Character.current;
        const inventory = character.inventory.map(i => i.toLowerCase());
        
        const index = inventory.findIndex(i => i.includes(itemName.toLowerCase()));
        if (index === -1) {
            return `You don't have a "${itemName}" in your inventory.`;
        }

        const item = character.inventory[index];
        let response = '';

        // Handle different item types
        if (item.toLowerCase().includes('potion') && item.toLowerCase().includes('healing')) {
            const healAmount = item.toLowerCase().includes('greater') ? 20 : 10;
            Character.heal(healAmount);
            Character.removeItem(item);
            updateGameUI();
            response = `*You drink the ${item}.*\n\nWarmth spreads through your body as you recover ${healAmount} HP!`;
        } else if (item.toLowerCase().includes('scroll')) {
            response = `*You unfurl the ${item} and speak the arcane words...*\n\nMagical energy crackles around you!`;
            Character.removeItem(item);
        } else {
            response = `You examine the ${item}, but you're not sure how to use it right now.`;
        }

        return response;
    },

    async handleDiceRoll(sides) {
        const roll = Combat.roll(sides);
        await Combat.showDiceRoll(sides, roll.total);
        
        return `🎲 Rolling d${sides}... **${roll.total}**`;
    },

    handleFreeformAction(input) {
        // Generate a narrative response for freeform input
        const responses = [
            `*You ${input}.*\n\nThe Dungeon Master nods approvingly. "An interesting choice. Let's see what happens..."`,
            `*${Character.current.name} attempts to ${input}.*\n\nThe world responds to your action in unexpected ways...`,
            `You decide to ${input}.\n\n*The story continues to unfold around you.*`
        ];

        // Sometimes require a skill check
        if (Math.random() < 0.3) {
            const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
            const stat = stats[Math.floor(Math.random() * stats.length)];
            const check = Combat.skillCheck(stat, 12);
            
            let response = `*You attempt to ${input}.*\n\n`;
            response += `**${stat} Check:** 🎲 ${check.rolls[0]} + ${check.modifier} = ${check.total} (DC 12)\n\n`;
            response += check.success ? 'Success! ' : 'Failure. ';
            response += check.description;
            
            return response;
        }

        return responses[Math.floor(Math.random() * responses.length)];
    },

    generateNoTargetResponse(action) {
        return `Who or what do you want to ${action}? Look around to see what's available.`;
    },

    // ========================================
    // Intro Narrative
    // ========================================
    getIntroNarrative() {
        const character = Character.current;
        const classInfo = Character.classes[character.class];
        const bgInfo = Character.backgrounds[character.background];
        const raceInfo = Character.races[character.race];

        return `# The Adventure Begins

*The rain falls in sheets as you push through the door of The Weary Wanderer, the only tavern in the small town of Millbrook. Water drips from your cloak as you survey the room.*

You are **${character.name}**, a ${raceInfo.name} ${classInfo.name}. ${bgInfo.description}

Your journey has brought you to this remote village on the edge of the Darkwood, following whispers of adventure and gold. The townsfolk eye you with a mixture of hope and suspicion—strangers are rare here, and rarely bring good news.

But something tells you this is where you need to be. Perhaps it's fate. Perhaps it's the mysterious letter you found tucked into your pack three days ago, bearing only the words: *"Millbrook. The Weary Wanderer. Come alone."*

The fire crackles invitingly. The innkeeper waves you over with a warm smile. And in the darkest corner of the room, a hooded figure watches your every move...

---

*What do you do?*

**Tip:** Try commands like "look around", "talk to the innkeeper", or "go to the town square". Or just describe what you want to do!`;
    }
};
