/* ========================================
   AI Dungeon Master - Story Preview Module
   Pre-scripted cinematic intro, no API required
   ======================================== */

(function () {
    const state = {
        runId: 0,
        timers: new Set(),
        heroMaxHp: 0,
        heroHp: 0,
        enemyMaxHp: 26,
        enemyHp: 26
    };

    const PREVIEW_CHECKS = [
        {
            stat: 'WIS',
            label: 'Perception',
            dc: 14,
            roll: 17,
            successText: 'You catch a flicker in the fog before the ambush lands.',
            failText: 'The shadows close in before you can react.'
        },
        {
            stat: 'INT',
            label: 'Arcana',
            dc: 13,
            roll: 12,
            successText: 'You decode the rune lattice and disrupt the trap.',
            failText: 'The glyph bites back, singeing your gauntlet.'
        },
        {
            stat: 'CHA',
            label: 'Resolve',
            dc: 12,
            roll: 18,
            successText: 'Your command shakes the chamber. Even the dead hesitate.',
            failText: 'Doubt echoes in the chamber, and the darkness feeds on it.'
        }
    ];

    const PREVIEW_TURNS = [
        {
            actor: 'enemy',
            text: 'Nightfang Wraith opens with a vicious lunge.',
            target: 'hero',
            damage: 2
        },
        {
            actor: 'hero',
            text: 'You answer with a steel-fast riposte.',
            target: 'enemy',
            damage: 9
        },
        {
            actor: 'enemy',
            text: 'The wraith claws your shoulder and hisses a curse.',
            target: 'hero',
            damage: 2
        },
        {
            actor: 'hero',
            text: 'You ignite ancestral sigils and cleave through spectral armor.',
            target: 'enemy',
            damage: 17
        }
    ];

    function clearTimers() {
        state.timers.forEach((timer) => clearTimeout(timer));
        state.timers.clear();
    }

    function isRunActive(runId) {
        return state.runId === runId;
    }

    function delay(ms, runId) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                state.timers.delete(timer);
                resolve(isRunActive(runId));
            }, ms);
            state.timers.add(timer);
        });
    }

    function resetPreviewUI() {
        const typewriter = document.getElementById('preview-typewriter');
        const log = document.getElementById('preview-log');
        const diceFeed = document.getElementById('preview-dice-feed');
        const diceResult = document.getElementById('preview-dice-result');
        const turnFeed = document.getElementById('preview-turn-feed');
        const enterBtn = document.getElementById('preview-enter-btn');
        const dice = document.getElementById('preview-d20');

        if (typewriter) typewriter.textContent = '';
        if (log) log.innerHTML = '';
        if (diceFeed) diceFeed.innerHTML = '';
        if (turnFeed) turnFeed.innerHTML = '';
        if (diceResult) diceResult.textContent = 'd20 ready';
        if (enterBtn) enterBtn.disabled = true;
        if (dice) dice.classList.remove('rolling');

        setCombatActive('hero', false);
        setCombatActive('enemy', false);
    }

    function getCharacterTitle() {
        if (typeof Character === 'undefined' || !Character.current) {
            return 'Unknown Adventurer';
        }
        return Character.getFullTitle();
    }

    function getCharacterName() {
        if (typeof Character === 'undefined' || !Character.current) {
            return 'Hero';
        }
        return Character.current.name || 'Hero';
    }

    function setupPreviewHeader() {
        const heroName = getCharacterName();
        const fullTitle = getCharacterTitle();
        const subtitle = document.getElementById('preview-subtitle');
        const heroNameEl = document.getElementById('preview-hero-name');

        if (subtitle) {
            subtitle.textContent = `${heroName}, ${fullTitle}, enters Blackthorn Keep.`;
        }
        if (heroNameEl) {
            heroNameEl.textContent = heroName;
        }
    }

    function initCombatTracker() {
        const character = typeof Character !== 'undefined' ? Character.current : null;
        const maxHp = character?.hp?.max || 12;
        state.heroMaxHp = maxHp;
        state.heroHp = maxHp;
        state.enemyMaxHp = 26;
        state.enemyHp = 26;
        renderCombatHP();
    }

    function renderCombatHP() {
        const heroFill = document.getElementById('preview-hero-hp-fill');
        const heroText = document.getElementById('preview-hero-hp-text');
        const enemyFill = document.getElementById('preview-enemy-hp-fill');
        const enemyText = document.getElementById('preview-enemy-hp-text');

        const heroPercent = Math.max(0, Math.min(100, (state.heroHp / state.heroMaxHp) * 100));
        const enemyPercent = Math.max(0, Math.min(100, (state.enemyHp / state.enemyMaxHp) * 100));

        if (heroFill) heroFill.style.width = `${heroPercent}%`;
        if (enemyFill) enemyFill.style.width = `${enemyPercent}%`;
        if (heroText) heroText.textContent = `${state.heroHp} / ${state.heroMaxHp} HP`;
        if (enemyText) enemyText.textContent = `${state.enemyHp} / ${state.enemyMaxHp} HP`;
    }

    function addNarrativeLine(text, emphasis = false) {
        const log = document.getElementById('preview-log');
        if (!log) return;

        const p = document.createElement('p');
        p.textContent = text;
        if (emphasis) {
            p.classList.add('emphasis');
        }

        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }

    async function typeLine(text, runId, speed = 18) {
        const typewriter = document.getElementById('preview-typewriter');
        if (!typewriter) return false;

        typewriter.textContent = '';
        for (let i = 0; i < text.length; i++) {
            if (!isRunActive(runId)) return false;
            typewriter.textContent += text[i];
            // Keep the typewriter cadence readable but brisk.
            // eslint-disable-next-line no-await-in-loop
            const stillActive = await delay(speed, runId);
            if (!stillActive) return false;
        }
        return true;
    }

    function setCombatActive(target, active) {
        const el = document.getElementById(target === 'hero' ? 'preview-hero-card' : 'preview-enemy-card');
        if (!el) return;
        el.classList.toggle('active', active);
    }

    async function runStatCheck(check, runId) {
        const dice = document.getElementById('preview-d20');
        const diceResult = document.getElementById('preview-dice-result');
        const feed = document.getElementById('preview-dice-feed');
        const mod = typeof Character !== 'undefined' && Character.current
            ? Character.getModifier(Character.current.stats[check.stat] || 10)
            : 0;

        if (!feed || !dice || !diceResult) return false;

        dice.classList.add('rolling');
        diceResult.textContent = `${check.label} check...`;
        if (typeof AudioManager !== 'undefined' && typeof audioEnabled !== 'undefined' && audioEnabled) {
            AudioManager.playSFX('dice-roll');
        }

        if (!(await delay(850, runId))) return false;

        dice.classList.remove('rolling');
        const total = check.roll + mod;
        const success = total >= check.dc;
        diceResult.textContent = `${check.label}: ${check.roll} + ${mod} = ${total}`;

        const card = document.createElement('div');
        card.className = `preview-check-item ${success ? 'success' : 'failure'}`;
        card.textContent = `${check.label} DC ${check.dc}: ${success ? 'Success' : 'Failure'} • ${success ? check.successText : check.failText}`;
        feed.appendChild(card);
        feed.scrollTop = feed.scrollHeight;

        if (!(await delay(500, runId))) return false;
        return true;
    }

    async function runCombatTurn(turn, runId) {
        const feed = document.getElementById('preview-turn-feed');
        if (!feed) return false;

        setCombatActive('hero', turn.actor === 'hero');
        setCombatActive('enemy', turn.actor === 'enemy');

        if (turn.target === 'hero') {
            state.heroHp = Math.max(0, state.heroHp - turn.damage);
        } else {
            state.enemyHp = Math.max(0, state.enemyHp - turn.damage);
        }
        renderCombatHP();

        const item = document.createElement('div');
        item.className = `preview-turn-item ${turn.actor}`;
        item.textContent = `${turn.text} (${turn.damage} dmg)`;
        feed.appendChild(item);
        feed.scrollTop = feed.scrollHeight;

        if (typeof AudioManager !== 'undefined' && typeof audioEnabled !== 'undefined' && audioEnabled) {
            AudioManager.playSFX(turn.actor === 'hero' ? 'critical' : 'hit');
        }

        if (!(await delay(820, runId))) return false;
        return true;
    }

    async function runPreviewSequence(runId) {
        const heroName = getCharacterName();
        const heroTitle = getCharacterTitle();
        const lines = [
            `${heroName}, the storm crowns Blackthorn Keep in silver fire as you breach the outer gate.`,
            `A forgotten prophecy names a ${heroTitle} as the only soul who can seal the Ashen Rift.`,
            'The stones hum. Runes awaken. Something ancient turns to face you.'
        ];

        for (let i = 0; i < lines.length; i++) {
            if (!(await typeLine(lines[i], runId))) return;
            addNarrativeLine(lines[i], i === 1);
            if (!(await delay(320, runId))) return;
        }

        for (const check of PREVIEW_CHECKS) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await runStatCheck(check, runId);
            if (!ok) return;
        }

        const combatIntro = 'A Nightfang Wraith erupts from the rift. Steel and shadow collide.';
        if (!(await typeLine(combatIntro, runId, 16))) return;
        addNarrativeLine(combatIntro, true);
        if (!(await delay(450, runId))) return;

        for (const turn of PREVIEW_TURNS) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await runCombatTurn(turn, runId);
            if (!ok) return;
        }

        const finale = `With the wraith shattered, the Ashen Rift bows to your will. The true campaign begins now.`;
        if (!(await typeLine(finale, runId, 17))) return;
        addNarrativeLine(finale, true);

        const enterBtn = document.getElementById('preview-enter-btn');
        if (enterBtn) {
            enterBtn.disabled = false;
        }

        if (typeof showToast === 'function') {
            showToast('Story Preview complete. Enter the live adventure!', 'success');
        }
    }

    function startStoryPreview() {
        if (typeof Character === 'undefined' || !Character.current) return;

        state.runId += 1;
        clearTimers();
        resetPreviewUI();
        setupPreviewHeader();
        initCombatTracker();

        if (typeof showScreen === 'function') {
            showScreen('story-preview-screen');
        }

        const activeRun = state.runId;
        runPreviewSequence(activeRun);
    }

    function stopStoryPreview() {
        state.runId += 1;
        clearTimers();

        const dice = document.getElementById('preview-d20');
        if (dice) dice.classList.remove('rolling');
    }

    function replayStoryPreview() {
        startStoryPreview();
    }

    function enterAdventureFromPreview() {
        stopStoryPreview();
        if (typeof startAdventure === 'function') {
            startAdventure();
        }
    }

    window.startStoryPreview = startStoryPreview;
    window.stopStoryPreview = stopStoryPreview;
    window.replayStoryPreview = replayStoryPreview;
    window.enterAdventureFromPreview = enterAdventureFromPreview;
})();
