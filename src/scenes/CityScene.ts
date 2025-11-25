import Phaser from 'phaser';
import { LazyAssets } from '@/loaders/AssetManifest';

export class CityScene extends Phaser.Scene {
    private isMobile: boolean = false;
    private bgImage!: Phaser.GameObjects.Image;
    private bgVideo?: Phaser.GameObjects.Video;

    constructor() {
        super('CityScene');
    }

    create() {
        this.isMobile = this.scale.width <= 768;

        // Start with static background image for instant load
        // Fallback to mobile bg if user bg is missing/removed
        const bgKey = 'city_bg_mobile';
        this.bgImage = this.add.image(this.scale.width / 2, this.scale.height / 2, bgKey);

        // Scale to cover screen
        const scaleX = this.scale.width / this.bgImage.width;
        const scaleY = this.scale.height / this.bgImage.height;
        const scale = Math.max(scaleX, scaleY);
        this.bgImage.setScale(scale);

        // Lazy load the video in the background
        this.loadBackgroundVideo();

        // Hit Zones
        this.createHitZones();

        // Event Listeners
        window.addEventListener('mission-complete', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.showMissionReward(customEvent.detail);
        });

        // Camera Shake Effect
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.cameras.main.shake(100, 0.0005);
            },
            loop: true
        });

        // Hide Loading Screen when scene is ready
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            this.time.delayedCall(500, () => {
                loadingScreen.style.transition = 'opacity 0.5s ease-out';
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.remove();
                }, 500);
            });
        }
    }

    private createHitZones() {
        if (this.isMobile) {
            this.createZone(this.scale.width * 0.5, this.scale.height * 0.25, 200, 120, 'AFTERLIFE', 'bar', 0xff003c);
            this.createZone(this.scale.width * 0.5, this.scale.height * 0.5, 200, 150, 'HIDEOUT', 'hideout', 0xfcee0a);
            this.createZone(this.scale.width * 0.5, this.scale.height * 0.75, 200, 120, 'RIPPERDOC', 'ripperdoc', 0x00f0ff);
        } else {
            this.createZone(this.scale.width * 0.65, this.scale.height * 0.40, 120, 100, 'AFTERLIFE', 'bar', 0xff003c);
            this.createZone(this.scale.width * 0.25, this.scale.height * 0.45, 150, 150, 'HIDEOUT', 'hideout', 0xfcee0a);
            this.createZone(this.scale.width * 0.80, this.scale.height * 0.60, 120, 100, 'RIPPERDOC', 'ripperdoc', 0x00f0ff);
        }
    }

    private createZone(x: number, y: number, w: number, h: number, label: string, type: string, tint: number) {
        const container = this.add.container(x, y);

        const zone = this.add.rectangle(0, 0, w, h, tint, 0.3);
        zone.setStrokeStyle(2, tint);
        zone.setInteractive({ useHandCursor: true });

        const text = this.add.text(0, -h / 2 - 20, label, {
            fontFamily: 'Courier New',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([zone, text]);

        // Animations
        this.tweens.add({
            targets: zone,
            alpha: 0.6,
            strokeAlpha: 1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        zone.on('pointerover', () => {
            zone.setFillStyle(tint, 0.7);
            this.tweens.add({
                targets: container,
                scale: 1.1,
                duration: 200,
                ease: 'Back.easeOut'
            });
            // Play hover sound if available (assuming audioManager is global or imported)
            // We need to import audioManager first, let's assume it's available or we'll add the import
            import('@/managers/AudioManager').then(({ audioManager }) => {
                audioManager.playHover();
            });
        });

        zone.on('pointerout', () => {
            zone.setFillStyle(tint, 0.3);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });

        zone.on('pointerdown', () => {
            console.log(`Clicked ${type}`);
            window.dispatchEvent(new CustomEvent('building-click', { detail: { type } }));

            // Click effect
            this.cameras.main.shake(50, 0.0002);
        });
    }

    private loadBackgroundVideo() {
        if (this.isMobile) {
            console.log('[CityScene] Mobile detected, skipping video background');
            return;
        }

        console.log('[CityScene] Lazy loading background video...');

        // Load video asynchronously
        LazyAssets.videos.forEach(asset => {
            this.load.video(asset.key, asset.path);
        });

        this.load.once('complete', () => {
            console.log('[CityScene] Video loaded, transitioning from static to video');

            // Create video object
            this.bgVideo = this.add.video(this.scale.width / 2, this.scale.height / 2, 'city_bg_video');

            // Position video behind the static image
            this.bgVideo.setDepth(-1);
            this.bgImage.setDepth(0);

            // Scale video
            const scaleX = this.scale.width / this.bgVideo.width;
            const scaleY = this.scale.height / this.bgVideo.height;
            const videoScale = Math.min(scaleX, scaleY) * 0.4;
            this.bgVideo.setScale(videoScale);

            // Start the video with 0 alpha
            this.bgVideo.setAlpha(0);
            this.bgVideo.play(true);
            this.bgVideo.setVolume(0);

            // Fade in video while fading out static image
            this.tweens.add({
                targets: this.bgVideo,
                alpha: 1,
                duration: 1500,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: this.bgImage,
                alpha: 0,
                duration: 1500,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    // Destroy static image to save memory
                    this.bgImage.destroy();
                }
            });
        });

        this.load.on('loaderror', (file: { key: string }) => {
            console.warn('[CityScene] Failed to load video:', file.key, '- continuing with static background');
        });

        // Start loading
        this.load.start();
    }

    private showMissionReward(detail: any) {
        const { rewards, leveledUp, injured } = detail;
        const text = this.add.text(
            this.scale.width * 0.5,
            this.scale.height * 0.3,
            `+${rewards.eddies} EDDIES\n+${rewards.xp} XP\n+${rewards.rep} REP${leveledUp ? '\n★ LEVEL UP! ★' : ''}${injured ? '\n⚠ INJURED!' : ''}`,
            {
                fontFamily: 'Courier New',
                fontSize: '24px',
                color: injured ? '#ff003c' : (leveledUp ? '#fcee0a' : '#00f0ff'),
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: this.scale.height * 0.2,
            alpha: 0,
            scale: leveledUp ? 1.5 : 1.2,
            duration: 2000,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });

        if (leveledUp) this.cameras.main.flash(500, 252, 238, 10);
        if (injured) this.cameras.main.flash(300, 255, 0, 60);
    }
}
