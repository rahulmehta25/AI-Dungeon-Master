/* ========================================
   AI Dungeon Master - Combat Module
   Dice rolling and combat mechanics
   ======================================== */

const Combat = {
    // Current combat state
    active: false,
    currentEnemy: null,
    turnOrder: [],
    currentTurn: 0,

    // ========================================
    // Dice Rolling
    // ========================================
    roll(sides, count = 1, modifier = 0) {
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;
        
        return {
            rolls,
            modifier,
            total,
            sides,
            count,
            isCritical: sides === 20 && rolls.includes(20),
            isFumble: sides === 20 && rolls.includes(1) && rolls.length === 1,
            toString() {
                let str = `${count}d${sides}`;
                if (modifier > 0) str += ` + ${modifier}`;
                if (modifier < 0) str += ` - ${Math.abs(modifier)}`;
                str += ` = [${rolls.join(', ')}]`;
                if (modifier !== 0) str += ` + ${modifier}`;
                str += ` = ${total}`;
                return str;
            }
        };
    },

    d4(count = 1, mod = 0) { return this.roll(4, count, mod); },
    d6(count = 1, mod = 0) { return this.roll(6, count, mod); },
    d8(count = 1, mod = 0) { return this.roll(8, count, mod); },
    d10(count = 1, mod = 0) { return this.roll(10, count, mod); },
    d12(count = 1, mod = 0) { return this.roll(12, count, mod); },
    d20(count = 1, mod = 0) { return this.roll(20, count, mod); },
    d100(count = 1, mod = 0) { return this.roll(100, count, mod); },

    // ========================================
    // Skill Checks
    // ========================================
    skillCheck(stat, dc, advantage = false, disadvantage = false) {
        const character = Character.current;
        if (!character) return null;

        const modifier = Character.getModifier(character.stats[stat] || 10);
        
        let rollResult;
        if (advantage && !disadvantage) {
            const roll1 = this.d20();
            const roll2 = this.d20();
            rollResult = roll1.total > roll2.total ? roll1 : roll2;
            rollResult.advantage = true;
            rollResult.bothRolls = [roll1.rolls[0], roll2.rolls[0]];
        } else if (disadvantage && !advantage) {
            const roll1 = this.d20();
            const roll2 = this.d20();
            rollResult = roll1.total < roll2.total ? roll1 : roll2;
            rollResult.disadvantage = true;
            rollResult.bothRolls = [roll1.rolls[0], roll2.rolls[0]];
        } else {
            rollResult = this.d20(1, modifier);
        }

        const total = rollResult.rolls[0] + modifier;
        const success = total >= dc;
        const criticalSuccess = rollResult.rolls[0] === 20;
        const criticalFail = rollResult.rolls[0] === 1;

        return {
            ...rollResult,
            stat,
            modifier,
            dc,
            total,
            success,
            criticalSuccess,
            criticalFail,
            margin: total - dc,
            description: this.getCheckDescription(stat, success, criticalSuccess, criticalFail)
        };
    },

    getCheckDescription(stat, success, crit, fumble) {
        const statNames = {
            STR: 'Strength',
            DEX: 'Dexterity', 
            CON: 'Constitution',
            INT: 'Intelligence',
            WIS: 'Wisdom',
            CHA: 'Charisma'
        };

        if (crit) return `Critical Success! Your ${statNames[stat]} check exceeds all expectations!`;
        if (fumble) return `Critical Failure! Your ${statNames[stat]} check goes terribly wrong!`;
        if (success) return `Success! Your ${statNames[stat]} check passes.`;
        return `Failure. Your ${statNames[stat]} check falls short.`;
    },

    // ========================================
    // Combat Actions
    // ========================================
    attack(targetAC, advantage = false) {
        const character = Character.current;
        if (!character) return null;

        // Get attack modifier based on class
        const classInfo = Character.classes[character.class];
        const primaryStat = classInfo?.primaryStat || 'STR';
        const attackMod = Character.getModifier(character.stats[primaryStat]);
        const profBonus = Math.ceil(character.level / 4) + 1; // Simplified proficiency

        // Roll to hit
        let attackRoll;
        if (advantage) {
            const r1 = this.d20();
            const r2 = this.d20();
            attackRoll = r1.rolls[0] > r2.rolls[0] ? r1 : r2;
        } else {
            attackRoll = this.d20();
        }

        const totalAttack = attackRoll.rolls[0] + attackMod + profBonus;
        const hit = totalAttack >= targetAC || attackRoll.rolls[0] === 20;
        const critical = attackRoll.rolls[0] === 20;
        const fumble = attackRoll.rolls[0] === 1;

        // Roll damage if hit
        let damage = null;
        if (hit && !fumble) {
            damage = this.rollDamage(character.class, critical);
        }

        return {
            attackRoll: attackRoll.rolls[0],
            modifier: attackMod + profBonus,
            totalAttack,
            targetAC,
            hit,
            critical,
            fumble,
            damage,
            description: this.getAttackDescription(hit, critical, fumble, damage)
        };
    },

    rollDamage(charClass, critical = false) {
        const damageByClass = {
            warrior: { dice: 8, count: 1, mod: 'STR' },
            mage: { dice: 6, count: 1, mod: 'INT' },
            rogue: { dice: 6, count: 1, mod: 'DEX', sneakAttack: true },
            cleric: { dice: 6, count: 1, mod: 'WIS' },
            ranger: { dice: 8, count: 1, mod: 'DEX' },
            bard: { dice: 6, count: 1, mod: 'CHA' }
        };

        const damageInfo = damageByClass[charClass] || damageByClass.warrior;
        const statMod = Character.getModifier(Character.current.stats[damageInfo.mod]);
        
        let diceCount = damageInfo.count;
        if (critical) diceCount *= 2;
        
        // Rogue sneak attack (simplified)
        if (damageInfo.sneakAttack && Character.current.level >= 1) {
            diceCount += Math.ceil(Character.current.level / 2);
        }

        const roll = this.roll(damageInfo.dice, diceCount, statMod);
        
        return {
            ...roll,
            critical,
            type: this.getDamageType(charClass)
        };
    },

    getDamageType(charClass) {
        const types = {
            warrior: 'slashing',
            mage: 'force',
            rogue: 'piercing',
            cleric: 'radiant',
            ranger: 'piercing',
            bard: 'psychic'
        };
        return types[charClass] || 'bludgeoning';
    },

    getAttackDescription(hit, critical, fumble, damage) {
        if (fumble) {
            const fumbles = [
                'Your weapon slips from your grasp!',
                'You stumble and nearly fall!',
                'Your attack goes wildly off-target!',
                'You hit yourself in confusion!'
            ];
            return fumbles[Math.floor(Math.random() * fumbles.length)];
        }
        
        if (critical) {
            return `CRITICAL HIT! You deal ${damage.total} ${damage.type} damage!`;
        }
        
        if (hit) {
            return `You hit for ${damage.total} ${damage.type} damage!`;
        }
        
        return 'Your attack misses!';
    },

    // ========================================
    // Saving Throws
    // ========================================
    savingThrow(stat, dc) {
        const character = Character.current;
        if (!character) return null;

        const modifier = Character.getModifier(character.stats[stat]);
        const classInfo = Character.classes[character.class];
        
        // Check if proficient in this save
        const proficient = classInfo?.savingThrows?.includes(stat);
        const profBonus = proficient ? Math.ceil(character.level / 4) + 1 : 0;

        const roll = this.d20();
        const total = roll.rolls[0] + modifier + profBonus;
        const success = total >= dc || roll.rolls[0] === 20;
        const autoFail = roll.rolls[0] === 1;

        return {
            ...roll,
            stat,
            modifier: modifier + profBonus,
            proficient,
            dc,
            total,
            success: success && !autoFail,
            autoSuccess: roll.rolls[0] === 20,
            autoFail
        };
    },

    // ========================================
    // Enemy Generation
    // ========================================
    enemies: {
        goblin: {
            name: 'Goblin',
            hp: 7,
            ac: 15,
            attack: 4,
            damage: '1d6+2',
            xp: 50,
            description: 'A small, green-skinned creature with sharp teeth and cunning eyes.'
        },
        skeleton: {
            name: 'Skeleton',
            hp: 13,
            ac: 13,
            attack: 4,
            damage: '1d6+2',
            xp: 50,
            description: 'Animated bones held together by dark magic, armed with a rusty sword.'
        },
        orc: {
            name: 'Orc',
            hp: 15,
            ac: 13,
            attack: 5,
            damage: '1d12+3',
            xp: 100,
            description: 'A brutish humanoid with gray-green skin and tusked lower jaw.'
        },
        wolf: {
            name: 'Dire Wolf',
            hp: 11,
            ac: 13,
            attack: 4,
            damage: '2d6+2',
            xp: 50,
            description: 'A massive wolf with glowing red eyes and razor-sharp fangs.'
        },
        bandit: {
            name: 'Bandit',
            hp: 11,
            ac: 12,
            attack: 3,
            damage: '1d6+1',
            xp: 25,
            description: 'A rough-looking human in leather armor, brandishing a shortsword.'
        },
        troll: {
            name: 'Troll',
            hp: 40,
            ac: 15,
            attack: 7,
            damage: '2d6+4',
            xp: 450,
            description: 'A towering creature with rubbery green skin and regenerating flesh.',
            regeneration: 5
        },
        dragon_wyrmling: {
            name: 'Dragon Wyrmling',
            hp: 33,
            ac: 17,
            attack: 5,
            damage: '2d6+2',
            xp: 700,
            description: 'A young dragon, small but deadly, with scales that shimmer like gems.',
            breathWeapon: true
        }
    },

    spawnEnemy(type = null) {
        if (!type) {
            // Random enemy based on character level
            const level = Character.current?.level || 1;
            const enemyTypes = Object.keys(this.enemies);
            
            // Filter appropriate enemies
            const appropriate = enemyTypes.filter(e => {
                const xp = this.enemies[e].xp;
                return xp <= level * 100 + 50;
            });
            
            type = appropriate[Math.floor(Math.random() * appropriate.length)] || 'goblin';
        }

        const template = this.enemies[type];
        this.currentEnemy = {
            ...template,
            type,
            currentHp: template.hp,
            maxHp: template.hp
        };

        return this.currentEnemy;
    },

    enemyAttack() {
        if (!this.currentEnemy) return null;

        const character = Character.current;
        const playerAC = 10 + Character.getModifier(character.stats.DEX);
        
        // Enemy attack roll
        const attackRoll = this.d20();
        const totalAttack = attackRoll.rolls[0] + this.currentEnemy.attack;
        const hit = totalAttack >= playerAC || attackRoll.rolls[0] === 20;
        const critical = attackRoll.rolls[0] === 20;
        const fumble = attackRoll.rolls[0] === 1;

        let damage = 0;
        if (hit && !fumble) {
            // Parse damage string like "1d6+2"
            const damageMatch = this.currentEnemy.damage.match(/(\d+)d(\d+)(?:\+(\d+))?/);
            if (damageMatch) {
                const [, count, sides, mod] = damageMatch;
                const roll = this.roll(parseInt(sides), parseInt(count) * (critical ? 2 : 1), parseInt(mod || 0));
                damage = roll.total;
            }
        }

        return {
            attackRoll: attackRoll.rolls[0],
            totalAttack,
            playerAC,
            hit,
            critical,
            fumble,
            damage,
            enemy: this.currentEnemy.name
        };
    },

    damageEnemy(amount) {
        if (!this.currentEnemy) return null;
        
        this.currentEnemy.currentHp -= amount;
        
        if (this.currentEnemy.currentHp <= 0) {
            const defeatedEnemy = this.currentEnemy;
            this.currentEnemy = null;
            return {
                defeated: true,
                enemy: defeatedEnemy,
                xp: defeatedEnemy.xp
            };
        }

        // Troll regeneration
        if (this.currentEnemy.regeneration) {
            this.currentEnemy.currentHp = Math.min(
                this.currentEnemy.maxHp,
                this.currentEnemy.currentHp + this.currentEnemy.regeneration
            );
        }

        return {
            defeated: false,
            remainingHp: this.currentEnemy.currentHp
        };
    },

    // ========================================
    // Visual Dice Display
    // ========================================
    async showDiceRoll(sides, result) {
        const display = document.getElementById('dice-display');
        const visual = document.getElementById('dice-visual');
        const resultEl = document.getElementById('dice-result');

        if (!display || !visual || !resultEl) return;

        // Show display
        display.classList.remove('hidden');
        visual.classList.add('rolling');
        
        // Dice faces
        const faces = {
            4: '🔺',
            6: '🎲',
            8: '◆',
            10: '⬟',
            12: '⬡',
            20: '🎲',
            100: '💯'
        };

        visual.textContent = faces[sides] || '🎲';
        resultEl.textContent = '';

        // Rolling animation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Show result
        visual.classList.remove('rolling');
        visual.classList.add('landed');
        resultEl.textContent = result;

        // Add critical styling
        if (sides === 20 && result === 20) {
            resultEl.classList.add('critical-text');
            document.querySelector('.game-container')?.classList.add('screen-shake');
        }

        // Hide after delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        display.classList.add('hidden');
        visual.classList.remove('landed');
        resultEl.classList.remove('critical-text');
        document.querySelector('.game-container')?.classList.remove('screen-shake');
    }
};
