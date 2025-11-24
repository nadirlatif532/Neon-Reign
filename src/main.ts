import '@/style.css';
import { GameManager } from '@/core/GameManager';
import { Interface } from '@/ui/Interface';
import { saveManager } from '@/managers/SaveManager';
import { loadGameState } from '@/state/GameStore';
import { audioManager } from '@/managers/AudioManager';

document.addEventListener('DOMContentLoaded', () => {
    // Load saved game state
    const savedState = saveManager.loadGame();
    if (savedState) {
        loadGameState(savedState);
        console.log('[Main] Game state loaded from save');
    }

    // Load and apply settings
    const settings = saveManager.loadSettings();
    if (settings) {
        audioManager.setMusicVolume(settings.musicVolume);
        audioManager.setSfxVolume(settings.sfxVolume);
        audioManager.setMusicEnabled(settings.musicEnabled);
        audioManager.setSfxEnabled(settings.sfxEnabled);
        console.log('[Main] Settings loaded');
    } else {
        // Save default settings
        const defaultSettings = saveManager.getDefaultSettings();
        saveManager.saveSettings(defaultSettings);
        audioManager.setMusicVolume(defaultSettings.musicVolume);
        audioManager.setSfxVolume(defaultSettings.sfxVolume);
    }

    // Initialize game
    const gameManager = GameManager.getInstance();
    gameManager.initialize();

    new Interface();
});
