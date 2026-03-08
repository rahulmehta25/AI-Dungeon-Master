# AI Dungeon Master

A cinematic AI-powered D&D experience where you speak to characters, shape the world, and the AI drives the narrative as a living Game Director.

![Version](https://img.shields.io/badge/version-2.0-gold)
![License](https://img.shields.io/badge/license-MIT-blue)

## What Makes This Different

The AI doesn't just chat — it **drives the game engine**. Every response from Claude returns both narrative text AND structured state patches (scene changes, quest updates, rewards, visual effects, suggested actions) that are applied to the game in real-time. The model controls the world.

## Features

### AI Game Director
- **Structured AI Output** — Claude returns `<NARRATIVE>` + `<STATE_JSON>` that drives scene transitions, quests, rewards, and visual effects
- **Suggested Action Chips** — AI generates contextual actions the player can click
- **Story Recap** — AI-generated dramatic summary of your adventure so far
- **Memory & Context** — Director module builds recap context so Claude remembers your journey

### Cinematic Scene System
- **Dynamic Backdrops** — CSS gradient-based scenes that change with location (tavern glow, forest fog, ruins wisps)
- **Mood System** — Vignette intensity, color shifts, and particle effects respond to narrative mood
- **Procedural Particles** — Embers, leaves, wisps, dust, and snow per scene
- **One-Shot Effects** — Screen shake, flash, glow-burst, fog-roll triggered by the AI

### Procedural Audio
- **Ambient Soundscapes** — Web Audio API generates tavern crackling, forest wind, eerie ruins drone (no audio files)
- **Sound Effects** — Dice rolls, hits, criticals, heals, level-ups, quest acquired — all procedurally synthesized
- **Crossfade Transitions** — Smooth ambient audio transitions between scenes

### Character Creation
- **6 Races:** Human, Elf, Dwarf, Halfling, Dragonborn, Tiefling
- **6 Classes:** Warrior, Mage, Rogue, Cleric, Ranger, Bard
- **6 Backgrounds:** Noble, Soldier, Scholar, Outlander, Criminal, Acolyte
- Stat rolling with race/class bonuses and equipment assignment

### Gameplay
- **Natural Language Input** — Type or speak your actions
- **d20 Combat System** — Attack rolls, skill checks, saving throws, critical hits
- **Quest Journal** — AI-driven quest tracking with active/completed/failed states
- **Voice I/O** — Speech-to-text input + text-to-speech narration with per-NPC voice variations

### Visual Design
- Glassmorphic message cards with backdrop blur
- Three color themes (Dark Dungeon, Ancient Parchment, Midnight Blue)
- Typewriter text reveal for DM responses
- Responsive design for all devices

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), CSS3 Custom Properties, Web Audio API, Web Speech API
- **Backend:** Express.js + Claude API (Sonnet)
- **Storage:** localStorage with save slots
- **Audio:** 100% procedurally generated — zero audio files

## Quick Start

1. Clone the repo
2. Set up the server:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add your ANTHROPIC_API_KEY to .env
   npm start
   ```
3. Serve the frontend:
   ```bash
   # From project root
   python3 -m http.server 8080
   ```
4. Open `http://localhost:8080`

## Architecture

```
AI-Dungeon-Master/
├── index.html              # Main HTML
├── css/
│   ├── styles.css          # Main styles + themes
│   └── animations.css      # Animations + effects
├── js/
│   ├── app.js              # Main app logic + UI management
│   ├── storage.js           # Save/load system (localStorage)
│   ├── character.js         # Character creation + management
│   ├── combat.js            # Dice rolling + combat mechanics
│   ├── dungeon-master.js    # AI narrative engine + NPC system
│   ├── director.js          # AI structured output parser + state patcher
│   ├── scene-fx.js          # Dynamic backdrops + visual effects
│   ├── audio.js             # Procedural ambient audio + SFX
│   └── voice.js             # Speech recognition + TTS
├── server/
│   ├── server.js            # Express + Claude API proxy
│   └── package.json
└── README.md
```

## How the AI Game Director Works

```
Player Input → DungeonMaster.generateResponse()
                    ↓
              Claude API (with recap context)
                    ↓
              <NARRATIVE> + <STATE_JSON>
                    ↓
              Director.parseResponse()
                    ↓
        ┌───────────┼───────────┐
    Narrative    State Patch   Actions
        ↓           ↓           ↓
    Story UI    SceneFX      Action Chips
                AudioManager
                Quest Journal
                Rewards/XP
```

## License

MIT License

---

*Built for hackathon. Powered by Claude.*
