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

        this.load.on('progress', (value: number) => {
            updateLoadingProgress(value);
        });

        this.load.on('complete', () => {
            this.scene.start('CityScene');
            console.log('Loading complete');
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
