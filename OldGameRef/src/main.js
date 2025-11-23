import { CityScene } from './game/CityScene.js';
import { GameManager } from './managers/GameManager.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './managers/AudioManager.js';

// Initialize Managers
const gameManager = new GameManager();
const audioManager = new AudioManager();
const uiManager = new UIManager(gameManager, audioManager);

// Start background music after user interaction
document.addEventListener('click', () => {
    audioManager.startBackgroundMusic();
}, { once: true });

// Phaser Config
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#1a1a1a',
    scene: [CityScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Start Game
const game = new Phaser.Game(config);

// Expose to global for debugging
window.game = game;
window.gm = gameManager;
window.ui = uiManager;
window.audio = audioManager;

console.log("NEON REIGN INITIALIZED");
