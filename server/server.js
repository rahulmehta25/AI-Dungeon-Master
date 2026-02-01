/* ========================================
   AI Dungeon Master - Backend Server
   Claude API proxy for dynamic storytelling
   ======================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// System prompt for the Dungeon Master
const DM_SYSTEM_PROMPT = `You are an expert Dungeon Master for a fantasy roleplaying game. Your role is to:

1. **Narrate immersively**: Use vivid, atmospheric descriptions. Engage all senses - sights, sounds, smells.
2. **React dynamically**: Respond to player actions logically. If they do something clever, reward it. If reckless, show consequences.
3. **Stay in character**: You ARE the world. Describe what happens, not what you think should happen.
4. **Keep it flowing**: End responses with something that invites action - a question, a tension, a choice.
5. **Remember context**: Reference past events, NPCs they've met, choices they've made.

**Format Guidelines:**
- Use **bold** for important names, items, or dramatic moments
- Use *italics* for descriptions and atmosphere
- Keep responses 2-4 paragraphs max - punchy and engaging
- For combat, include dice results if provided but narrate dramatically
- For dialogue, give NPCs distinct voices and personalities

**World Details:**
- Setting: The town of Millbrook on the edge of the Darkwood forest
- Main locations: The Weary Wanderer tavern, town square, ancient ruins, goblin camp
- Key NPCs: Greta (innkeeper), mysterious hooded figure (quest giver), Captain Helena (guard), Archmage Valdris (ghost)
- Main plot: An ancient evil called "The Whispering Dark" stirs in the ruins

You are NOT an assistant. You are the world itself, responding to the player's actions.`;

// Generate DM response endpoint
app.post('/api/dm/respond', async (req, res) => {
    try {
        const { playerInput, context, character, gameState } = req.body;

        if (!playerInput) {
            return res.status(400).json({ error: 'Player input is required' });
        }

        // Build the conversation messages
        const messages = [];

        // Add conversation history (last 10 messages)
        if (context && context.history && Array.isArray(context.history)) {
            const recentHistory = context.history.slice(-10);
            for (const entry of recentHistory) {
                if (entry.role && entry.content) {
                    messages.push({
                        role: entry.role,
                        content: entry.content
                    });
                }
            }
        }

        // Build context string for the current situation
        let contextInfo = '';
        if (character) {
            contextInfo += `\n[PLAYER CHARACTER: ${character.name}, Level ${character.level} ${character.race} ${character.class}. HP: ${character.hp?.current || '?'}/${character.hp?.max || '?'}]`;
        }
        if (gameState?.currentScene) {
            contextInfo += `\n[CURRENT LOCATION: ${gameState.currentScene}]`;
        }
        if (context?.currentEnemy) {
            contextInfo += `\n[IN COMBAT WITH: ${context.currentEnemy.name}, HP: ${context.currentEnemy.hp}/${context.currentEnemy.maxHp}]`;
        }

        // Add the current player input
        const userMessage = contextInfo 
            ? `${contextInfo}\n\nPlayer action: ${playerInput}`
            : `Player action: ${playerInput}`;

        messages.push({
            role: 'user',
            content: userMessage
        });

        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: DM_SYSTEM_PROMPT,
            messages: messages
        });

        // Extract the response text
        const dmResponse = response.content[0]?.text || 'The Dungeon Master ponders in silence...';

        res.json({
            success: true,
            response: dmResponse,
            usage: {
                inputTokens: response.usage?.input_tokens,
                outputTokens: response.usage?.output_tokens
            }
        });

    } catch (error) {
        console.error('Error generating DM response:', error);
        
        // Return a graceful fallback
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate response',
            fallback: true
        });
    }
});

// Generate combat narration endpoint
app.post('/api/dm/combat', async (req, res) => {
    try {
        const { action, attacker, defender, roll, damage, hit, critical, context } = req.body;

        const combatPrompt = `Narrate this combat moment dramatically in 1-2 sentences:

Attacker: ${attacker}
Defender: ${defender}
Attack Roll: ${roll} ${critical ? '(CRITICAL!)' : ''}
Result: ${hit ? `HIT for ${damage} damage` : 'MISS'}

${context || ''}

Keep it visceral and exciting. No dice numbers in the narration itself.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 256,
            system: 'You are a combat narrator for a fantasy RPG. Be dramatic, visceral, and concise.',
            messages: [{
                role: 'user',
                content: combatPrompt
            }]
        });

        const narration = response.content[0]?.text || 'Steel meets steel!';

        res.json({
            success: true,
            narration: narration
        });

    } catch (error) {
        console.error('Error generating combat narration:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: true
        });
    }
});

// Generate scene description endpoint
app.post('/api/dm/describe', async (req, res) => {
    try {
        const { scene, mood, details } = req.body;

        const describePrompt = `Describe this fantasy scene in 2-3 atmospheric paragraphs:

Location: ${scene}
Mood: ${mood || 'neutral'}
${details ? `Additional details: ${details}` : ''}

Engage all senses. Make it immersive. End with something that hints at possibilities.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 512,
            system: 'You are a fantasy world narrator. Create vivid, atmospheric descriptions.',
            messages: [{
                role: 'user',
                content: describePrompt
            }]
        });

        const description = response.content[0]?.text || 'You survey your surroundings...';

        res.json({
            success: true,
            description: description
        });

    } catch (error) {
        console.error('Error generating description:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: true
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.ANTHROPIC_API_KEY
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎲 AI Dungeon Master server running on port ${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️  Warning: ANTHROPIC_API_KEY not set. API calls will fail.');
    }
});
