import Phaser from 'phaser';

export class CityScene extends Phaser.Scene {
    private isMobile: boolean = false;

    constructor() {
        super('CityScene');
    }

    create() {
        this.isMobile = this.scale.width <= 768;

        // Background Video
        const bgVideo = this.add.video(this.scale.width / 2, this.scale.height / 2, 'city_bg_video');

        // Play the video on loop with 15% volume
        bgVideo.play(true); // true = loop
        bgVideo.setVolume(0.15);

        // Scale to fit entire video on screen with zoom out
        const scaleX = this.scale.width / bgVideo.width;
        const scaleY = this.scale.height / bgVideo.height;
        const scale = Math.min(scaleX, scaleY) * 0.4; // 70% scale to zoom out
        bgVideo.setScale(scale);

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
        });

        zone.on('pointerout', () => {
            zone.setFillStyle(tint, 0.3);
        });

        zone.on('pointerdown', () => {
            console.log(`Clicked ${type}`);
            window.dispatchEvent(new CustomEvent('building-click', { detail: { type } }));
        });
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
