export class AudioManager {
    private audioContext: AudioContext;
    private musicVolume: number = 0.15;
    private sfxVolume: number = 0.4;
    private musicPlaying: boolean = false;
    private musicEnabled: boolean = true;
    private sfxEnabled: boolean = true;
    private currentSource: AudioBufferSourceNode | null = null;
    private currentGainNode: GainNode | null = null;
    private loadedBuffers: { [url: string]: AudioBuffer } = {};

    private musicTracks: string[] = [
        'assets/White Bat Audio - Casualty LOOP 1.wav',
        'assets/White Bat Audio - Casualty LOOP 2.wav',
        'assets/White Bat Audio - Casualty LOOP 3.wav'
    ];

    constructor() {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
    }

    // Load audio files
    async loadMusicTrack(url: string): Promise<AudioBuffer | null> {
        if (this.loadedBuffers[url]) {
            return this.loadedBuffers[url];
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.loadedBuffers[url] = audioBuffer;
            return audioBuffer;
        } catch (error) {
            console.error('Error loading audio:', url, error);
            return null;
        }
    }

    // Play a random track
    async playRandomTrack() {
        if (!this.musicPlaying) return;

        // Pick a random track
        const randomIndex = Math.floor(Math.random() * this.musicTracks.length);
        const trackUrl = this.musicTracks[randomIndex];

        // Load the track
        const buffer = await this.loadMusicTrack(trackUrl);
        if (!buffer) return;

        // Create source and gain
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        gainNode.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Store references
        this.currentSource = source;
        this.currentGainNode = gainNode;

        // When track ends, play another random track
        source.onended = () => {
            if (this.musicPlaying) {
                this.playRandomTrack();
            }
        };

        source.start(0);
        console.log('Now playing:', trackUrl);
    }

    // Start background music
    async startBackgroundMusic() {
        if (this.musicPlaying) return;

        // Resume context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.musicPlaying = true;
        await this.playRandomTrack();
    }

    stopBackgroundMusic() {
        this.musicPlaying = false;
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
        this.currentGainNode = null;
    }

    // UI Click sound
    playClick() {
        if (!this.sfxEnabled) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Panel open/close sound
    playPanelOpen() {
        if (!this.sfxEnabled) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playPanelClose() {
        if (!this.sfxEnabled) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Mission complete sound
    playMissionComplete() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Arpeggio
        const notes = [440, 554.37, 659.25]; // A4, C#5, E5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);

            gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    // Level up sound
    playLevelUp() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Rising arpeggio
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(this.sfxVolume * 0.4, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.4);
        });
    }

    // Injury sound
    playInjury() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Harsh descending sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

        gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Purchase/Capture sound
    playPurchase() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Two-tone confirmation
        [600, 800].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);

            gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.15);
        });
    }

    // Heal sound
    playHeal() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Ascending healing tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    // Upgrade sound
    playUpgrade() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Power-up sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Error/Insufficient funds sound
    playError() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Buzzer sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }
    // Alert sound for encounters
    playAlert() {
        if (!this.sfxEnabled) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // High pitched ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

        gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // ==================== VOLUME CONTROLS ====================

    /**
     * Set music volume (0-100)
     */
    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(100, volume)) / 100;

        // Update currently playing music volume in real-time
        if (this.currentGainNode) {
            this.currentGainNode.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
        }

        console.log('[AudioManager] Music volume set to:', this.musicVolume);
    }

    /**
     * Set SFX volume (0-100)
     */
    setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(100, volume)) / 100;
        console.log('[AudioManager] SFX volume set to:', this.sfxVolume);
    }

    /**
     * Get music volume (0-100)
     */
    getMusicVolume(): number {
        return Math.round(this.musicVolume * 100);
    }

    /**
     * Get SFX volume (0-100)
     */
    getSfxVolume(): number {
        return Math.round(this.sfxVolume * 100);
    }

    /**
     * Enable or disable music
     */
    setMusicEnabled(enabled: boolean): void {
        this.musicEnabled = enabled;
        if (!enabled && this.musicPlaying) {
            this.stopBackgroundMusic();
        } else if (enabled && !this.musicPlaying) {
            this.startBackgroundMusic();
        }
    }

    /**
     * Enable or disable SFX
     */
    setSfxEnabled(enabled: boolean): void {
        this.sfxEnabled = enabled;
    }

    /**
     * Check if music is enabled
     */
    isMusicEnabled(): boolean {
        return this.musicEnabled;
    }

    /**
     * Check if SFX is enabled
     */
    isSfxEnabled(): boolean {
        return this.sfxEnabled;
    }
}

export const audioManager = new AudioManager();
