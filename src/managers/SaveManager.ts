import { gameStore, type GameState } from '@/state/GameStore';

export interface SaveData {
    version: number;
    timestamp: number;
    gameState: GameState;
}

export interface SettingsData {
    musicVolume: number;
    sfxVolume: number;
    musicEnabled: boolean;
    sfxEnabled: boolean;
}

const SAVE_KEY = 'bikergang-save-v1';
const SETTINGS_KEY = 'bikergang-settings-v1';
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export class SaveManager {
    private autoSaveTimer: number | null = null;
    private isResetting: boolean = false;

    constructor() {
        this.startAutoSave();
        this.setupEventListeners();
    }

    // ==================== GAME STATE ====================

    /**
     * Save current game state to localStorage
     */
    saveGame(): boolean {
        // Don't save if we're in the middle of a reset
        if (this.isResetting) {
            console.log('[SaveManager] Skipping save during reset');
            return false;
        }

        try {
            const state = gameStore.get();
            const saveData: SaveData = {
                version: SAVE_VERSION,
                timestamp: Date.now(),
                gameState: state
            };

            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            console.log('[SaveManager] Game saved successfully');
            return true;
        } catch (error) {
            console.error('[SaveManager] Failed to save game:', error);
            return false;
        }
    }

    /**
     * Load game state from localStorage
     */
    loadGame(): GameState | null {
        try {
            const savedData = localStorage.getItem(SAVE_KEY);
            if (!savedData) {
                console.log('[SaveManager] No save data found');
                return null;
            }

            const saveData: SaveData = JSON.parse(savedData);

            // Version check
            if (saveData.version !== SAVE_VERSION) {
                console.warn('[SaveManager] Save version mismatch, ignoring save');
                return null;
            }

            console.log('[SaveManager] Game loaded successfully');
            return saveData.gameState;
        } catch (error) {
            console.error('[SaveManager] Failed to load game:', error);
            return null;
        }
    }

    /**
     * Check if save data exists
     */
    hasSaveData(): boolean {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    /**
     * Clear all save data
     */
    clearSaveData(): void {
        localStorage.removeItem(SAVE_KEY);
        console.log('[SaveManager] Save data cleared');
    }

    /**
     * Force reset - clears ALL localStorage and prevents save on unload
     */
    forceReset(): void {
        console.log('[SaveManager] ═══════════════════════════════════');
        console.log('[SaveManager] FORCE RESET INITIATED');
        console.log('[SaveManager] ═══════════════════════════════════');

        // Set flag to prevent any saves during reset
        this.isResetting = true;
        console.log('[SaveManager] isResetting flag set to TRUE');

        // Stop auto-save immediately
        this.stopAutoSave();
        console.log('[SaveManager] Auto-save stopped');

        // Log localStorage BEFORE clearing
        console.log('[SaveManager] localStorage BEFORE clear:', JSON.stringify(localStorage));
        console.log('[SaveManager] Save data exists:', localStorage.getItem(SAVE_KEY) !== null);

        // Clear ALL localStorage (multiple times to be absolutely sure)
        localStorage.clear();
        localStorage.clear(); // Yes, twice for good measure

        // Log localStorage AFTER clearing
        console.log('[SaveManager] localStorage AFTER clear:', JSON.stringify(localStorage));
        console.log('[SaveManager] Save data still exists:', localStorage.getItem(SAVE_KEY) !== null);

        console.log('[SaveManager] Reset complete, reloading page...');
        console.log('[SaveManager] ═══════════════════════════════════');
    }

    /**
     * Prevent any further saves (used during import/reload)
     */
    preventSave(): void {
        this.isResetting = true;
        this.stopAutoSave();
        console.log('[SaveManager] Saving disabled (preventSave called)');
    }

    /**
     * Get save timestamp
     */
    getSaveTimestamp(): number | null {
        try {
            const savedData = localStorage.getItem(SAVE_KEY);
            if (!savedData) return null;

            const saveData: SaveData = JSON.parse(savedData);
            return saveData.timestamp;
        } catch {
            return null;
        }
    }

    // ==================== SETTINGS ====================

    /**
     * Save settings to localStorage
     */
    saveSettings(settings: SettingsData): boolean {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            console.log('[SaveManager] Settings saved');
            return true;
        } catch (error) {
            console.error('[SaveManager] Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings(): SettingsData | null {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (!savedSettings) {
                console.log('[SaveManager] No settings found, using defaults');
                return null;
            }

            const settings: SettingsData = JSON.parse(savedSettings);
            console.log('[SaveManager] Settings loaded');
            return settings;
        } catch (error) {
            console.error('[SaveManager] Failed to load settings:', error);
            return null;
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings(): SettingsData {
        return {
            musicVolume: 15,
            sfxVolume: 40,
            musicEnabled: true,
            sfxEnabled: true
        };
    }

    // ==================== AUTO-SAVE ====================

    /**
     * Start auto-save timer
     */
    private startAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            return; // Already running
        }

        this.autoSaveTimer = window.setInterval(() => {
            this.saveGame();
        }, AUTO_SAVE_INTERVAL);

        console.log('[SaveManager] Auto-save started (every 30s)');
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('[SaveManager] Auto-save stopped');
        }
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Setup event listeners for important game events to trigger saves
     */
    private setupEventListeners(): void {
        // Save on mission complete
        window.addEventListener('mission-complete', () => {
            this.saveGame();
        });

        // Save on territory income
        window.addEventListener('territory-income', () => {
            this.saveGame();
        });

        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });
    }

    // ==================== EXPORT/IMPORT ====================

    /**
     * Export save data as JSON string (for backup)
     */
    exportSaveData(): string | null {
        const savedData = localStorage.getItem(SAVE_KEY);
        return savedData;
    }

    /**
     * Import save data from JSON string
     */
    importSaveData(data: string): boolean {
        try {
            const saveData: SaveData = JSON.parse(data);

            // Validate
            if (!saveData.version || !saveData.gameState) {
                throw new Error('Invalid save data format');
            }

            localStorage.setItem(SAVE_KEY, data);
            console.log('[SaveManager] Save data imported');
            return true;
        } catch (error) {
            console.error('[SaveManager] Failed to import save data:', error);
            return false;
        }
    }
}

// Singleton instance
export const saveManager = new SaveManager();
