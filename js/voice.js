/* ========================================
   AI Dungeon Master - Voice Module
   Web Speech API for voice input/output
   ======================================== */

const Voice = {
    // Speech Recognition
    recognition: null,
    isListening: false,
    
    // Speech Synthesis
    synthesis: window.speechSynthesis,
    currentUtterance: null,
    
    // Settings
    settings: {
        enabled: false,
        voiceIndex: 0,
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0
    },

    // ========================================
    // Initialization
    // ========================================
    init() {
        // Check for Speech Recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.setupRecognitionHandlers();
            console.log('🎤 Voice recognition initialized');
        } else {
            console.warn('🎤 Speech recognition not supported in this browser');
            this.disableVoiceButton();
        }

        // Check for Speech Synthesis support
        if (this.synthesis) {
            // Load voices when they become available
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
            this.loadVoices();
            console.log('🔊 Speech synthesis initialized');
        }

        // Load settings
        const savedSettings = Storage.getSettings();
        if (savedSettings) {
            this.settings.enabled = savedSettings.ttsEnabled || false;
        }
    },

    setupRecognitionHandlers() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceButton(true);
            console.log('🎤 Listening...');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceButton(false);
            console.log('🎤 Stopped listening');
        };

        this.recognition.onresult = (event) => {
            const input = document.getElementById('player-input');
            if (!input) return;

            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show interim results
            if (interimTranscript) {
                input.value = interimTranscript;
                input.classList.add('interim');
            }

            // Process final result
            if (finalTranscript) {
                input.value = finalTranscript;
                input.classList.remove('interim');
                
                // Auto-submit if it looks like a complete command
                if (this.shouldAutoSubmit(finalTranscript)) {
                    setTimeout(() => sendMessage(), 300);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('🎤 Recognition error:', event.error);
            this.isListening = false;
            this.updateVoiceButton(false);

            // Show user-friendly error
            switch (event.error) {
                case 'no-speech':
                    showToast('No speech detected. Try again.', 'info');
                    break;
                case 'audio-capture':
                    showToast('No microphone found.', 'error');
                    break;
                case 'not-allowed':
                    showToast('Microphone access denied.', 'error');
                    break;
                default:
                    showToast('Voice input error. Please try again.', 'error');
            }
        };
    },

    // ========================================
    // Voice Input
    // ========================================
    toggleListening() {
        if (!this.recognition) {
            showToast('Voice input not supported in this browser', 'error');
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },

    startListening() {
        if (!this.recognition || this.isListening) return;

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    },

    stopListening() {
        if (!this.recognition || !this.isListening) return;

        try {
            this.recognition.stop();
        } catch (e) {
            console.error('Failed to stop recognition:', e);
        }
    },

    shouldAutoSubmit(text) {
        // Auto-submit for clear commands
        const autoSubmitPatterns = [
            /^(look|examine|search|rest|inventory|attack|go|talk|roll)/i,
            /^(yes|no|okay|sure)$/i
        ];

        return autoSubmitPatterns.some(pattern => pattern.test(text.trim()));
    },

    updateVoiceButton(listening) {
        const btn = document.getElementById('voice-btn');
        if (!btn) return;

        if (listening) {
            btn.classList.add('listening');
            btn.innerHTML = '🔴';
            btn.title = 'Click to stop';
        } else {
            btn.classList.remove('listening');
            btn.innerHTML = '🎤';
            btn.title = 'Voice Input';
        }
    },

    disableVoiceButton() {
        const btn = document.getElementById('voice-btn');
        if (btn) {
            btn.disabled = true;
            btn.title = 'Voice input not supported';
            btn.style.opacity = '0.5';
        }
    },

    // ========================================
    // Voice Output (Text-to-Speech)
    // ========================================
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        
        // Find a good fantasy-appropriate voice
        const preferredVoices = [
            'Google UK English Male',
            'Microsoft Mark - English (United States)',
            'Daniel',
            'Alex'
        ];

        for (const preferred of preferredVoices) {
            const found = this.voices.find(v => v.name.includes(preferred));
            if (found) {
                this.settings.voiceIndex = this.voices.indexOf(found);
                break;
            }
        }

        console.log(`🔊 Loaded ${this.voices.length} voices`);
    },

    speak(text, options = {}) {
        if (!this.synthesis || !this.settings.enabled) return;

        // Stop any current speech
        this.stopSpeaking();

        // Clean text for TTS
        const cleanText = this.cleanTextForSpeech(text);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Apply settings
        if (this.voices && this.voices.length > 0) {
            utterance.voice = this.voices[options.voiceIndex || this.settings.voiceIndex];
        }
        utterance.rate = options.rate || this.settings.rate;
        utterance.pitch = options.pitch || this.settings.pitch;
        utterance.volume = options.volume || this.settings.volume;

        // Event handlers
        utterance.onstart = () => {
            this.currentUtterance = utterance;
            console.log('🔊 Speaking...');
        };

        utterance.onend = () => {
            this.currentUtterance = null;
            console.log('🔊 Finished speaking');
        };

        utterance.onerror = (event) => {
            console.error('🔊 Speech error:', event.error);
            this.currentUtterance = null;
        };

        // Speak
        this.synthesis.speak(utterance);
    },

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.currentUtterance = null;
        }
    },

    cleanTextForSpeech(text) {
        if (!text) return '';

        return text
            // Remove markdown
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/---/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove emojis (keep for visual, bad for TTS)
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
            // Remove special markers
            .replace(/^[•\-]\s/gm, '')
            // Clean up whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    },

    // ========================================
    // DM Voice (for narrative)
    // ========================================
    speakAsDM(text) {
        if (!this.settings.enabled) return;

        // Use a deeper, more authoritative voice for the DM
        this.speak(text, {
            rate: 0.85,
            pitch: 0.9
        });
    },

    speakAsNPC(text, npcType = 'neutral') {
        if (!this.settings.enabled) return;

        // Vary voice based on NPC type
        const voiceSettings = {
            friendly: { rate: 1.0, pitch: 1.1 },
            mysterious: { rate: 0.8, pitch: 0.85 },
            hostile: { rate: 1.1, pitch: 0.8 },
            elderly: { rate: 0.75, pitch: 0.9 },
            neutral: { rate: 0.9, pitch: 1.0 }
        };

        const settings = voiceSettings[npcType] || voiceSettings.neutral;
        this.speak(text, settings);
    },

    // ========================================
    // Settings
    // ========================================
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        Storage.updateSetting('ttsEnabled', enabled);
        
        if (!enabled) {
            this.stopSpeaking();
        }
    },

    setVolume(volume) {
        this.settings.volume = volume / 100;
    },

    setRate(rate) {
        this.settings.rate = rate;
    },

    setPitch(pitch) {
        this.settings.pitch = pitch;
    },

    // ========================================
    // Utility
    // ========================================
    isSupported() {
        return {
            recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
            synthesis: !!window.speechSynthesis
        };
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    Voice.init();
});
