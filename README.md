# 🐉 AI Dungeon Master

A web-based D&D-style game where you talk TO characters, not control them with voice commands. Experience an immersive fantasy adventure with an AI Dungeon Master.

![Version](https://img.shields.io/badge/version-1.0-gold)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🎭 Character Creation
- **6 Races:** Human, Elf, Dwarf, Halfling, Dragonborn, Tiefling
- **6 Classes:** Warrior, Mage, Rogue, Cleric, Ranger, Bard
- **6 Backgrounds:** Noble, Soldier, Scholar, Outlander, Criminal, Acolyte
- Stat rolling and equipment assignment

### 🎲 Gameplay
- **Natural Language Input:** Type or speak your actions
- **Dice Rolling:** Visual d20 system with skill checks
- **Combat System:** Attack, defend, and use abilities
- **Exploration:** Multiple locations to discover
- **NPCs:** Dynamic conversations with memorable characters

### 🗺️ Locations
- The Weary Wanderer Tavern
- Millbrook Town Square
- The Darkwood Path
- Ruins of Valdris
- And more to discover...

### 💾 Save System
- Auto-save feature
- Multiple save slots
- Export/Import functionality

### 🎨 Visual Design
- Dark fantasy theme with gold accents
- Three color themes (Dark Dungeon, Ancient Parchment, Midnight Blue)
- Atmospheric particle effects
- Animated dice rolls
- Responsive design for all devices

### 🔊 Audio Features
- Voice input via Web Speech API
- Text-to-Speech for narrative (optional)
- Adjustable volume controls

## 🚀 Quick Start

1. **Clone or download** this repository
2. **Open a terminal** in the project folder
3. **Start a local server:**
   ```bash
   python3 -m http.server 8080
   ```
4. **Open your browser** to `http://localhost:8080`
5. **Start your adventure!**

## 🎮 How to Play

### Basic Commands
- `look around` - Describe your surroundings
- `talk to [NPC]` - Start a conversation
- `go to [location]` - Travel somewhere
- `attack [target]` - Enter combat
- `search` - Look for items or secrets
- `rest` - Recover health
- `inventory` - Check your items

### Quick Actions
Use the quick action buttons for common commands:
- 👁️ **Look** - Examine surroundings
- 🎒 **Inventory** - Check your items
- 🎲 **Roll d20** - Make a dice roll

### Combat
Combat uses the classic d20 system:
- Roll to hit vs. enemy AC
- Natural 20 = Critical Hit!
- Natural 1 = Critical Fail!
- Defeat enemies to gain XP and level up

### Voice Input
Click the 🎤 button or press and hold to speak your commands.

## ⚙️ Settings

Access settings from the main menu or in-game:
- **Music/SFX Volume** - Audio levels
- **Text-to-Speech** - Hear the DM narrate
- **Theme** - Choose your visual style
- **Text Size** - Accessibility options
- **Animations** - Toggle visual effects
- **Difficulty** - Story Mode, Normal, Hardcore
- **Auto-Save** - Save automatically

## 🛠️ Technical Details

### Tech Stack
- Vanilla JavaScript (ES6+)
- CSS3 with Custom Properties
- Web Speech API
- localStorage for saves

### File Structure
```
AI-Dungeon-Master/
├── index.html          # Main HTML
├── css/
│   ├── styles.css      # Main styles
│   └── animations.css  # Animations
├── js/
│   ├── app.js          # Main app logic
│   ├── storage.js      # Save/load system
│   ├── character.js    # Character management
│   ├── combat.js       # Combat & dice
│   ├── dungeon-master.js # AI narrative
│   └── voice.js        # Speech API
├── README.md
└── ACTIVITY_LOG.md     # Development log
```

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

Voice input requires browser support for Web Speech API.

## 🎯 Debug Commands

Open the browser console and use:
```javascript
DEBUG.character()     // View character data
DEBUG.gameState()     // View game state
DEBUG.giveXP(100)     // Add experience
DEBUG.heal()          // Full heal
DEBUG.spawnEnemy('goblin')  // Spawn enemy
DEBUG.teleport('forest_path') // Change location
```

## 📝 Development

See `ACTIVITY_LOG.md` for the full development history.

### Future Ideas
- [ ] Music and sound effects
- [ ] More locations and quests
- [ ] Party system
- [ ] Multiplayer support
- [ ] Custom character portraits
- [ ] Item crafting
- [ ] Spell system for mages

## 📜 License

MIT License - Feel free to use, modify, and distribute!

---

*Crafted with magic and code* ✨
