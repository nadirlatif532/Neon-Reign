import Phaser from 'phaser';
import { AssetManifest } from '@/loaders/AssetManifest';
import { updateLoadingProgress } from '@/state/GameStore';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Load images
        AssetManifest.images.forEach(asset => {
            this.load.image(asset.key, asset.path);
        });

        // Load atlases
        AssetManifest.atlases.forEach(asset => {
            this.load.atlas(asset.key, asset.texturePath, asset.atlasPath);
        });

        // Load audio
        AssetManifest.audio.forEach(asset => {
            this.load.audio(asset.key, asset.path);
        });

        // NOTE: Videos are lazy-loaded in CityScene to prevent blocking game start
        // Large video files (4+ MB) would otherwise cause very long initial load times

        this.load.on('progress', (value: number) => {
            updateLoadingProgress(value);

            // Update DOM loading bar
            const loadingBar = document.getElementById('loading-bar');
            if (loadingBar) {
                loadingBar.style.width = `${value * 100}%`;
            }
        });

        this.load.on('complete', () => {
            console.log('Loading complete');
            this.scene.start('CityScene');
        });

        this.load.on('loaderror', (file: { key: string; src: string }) => {
            console.error('Error loading asset:', file.key, file.src);
            // Optional: Continue anyway or show error on screen
            this.add.text(10, 10 + (Math.random() * 100), `Error: ${file.key}`, { color: '#ff0000' });
        });
    }

    create() {
        // Temporary: Create a simple text to show loading finished if no GameScene yet
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Ready!', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.cameras.main.setPostPipeline('Vignette');
    }
}
