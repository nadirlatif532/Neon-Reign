export class CityScene extends Phaser.Scene {
    constructor() {
        super('CityScene');
    }

    preload() {
        // Check if mobile
        this.isMobile = this.scale.width <= 768;

        if (this.isMobile) {
            this.load.image('city_bg_user', 'assets/City-Mobile.jpg');
        } else {
            this.load.image('city_bg_user', 'assets/city.jpg');
        }
        this.load.image('biker', 'assets/biker.png');
    }

    create() {
        // 1. User City Background
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'city_bg_user');

        // Scale to FIT the screen (Cover mode)
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY); // Use max to cover
        bg.setScale(scale);

        // Animated Background Effects (reduced shake)
        this.cameras.main.setPostPipeline('ChromaticAberration');

        // Subtle camera shake for cyberpunk feel (reduced intensity)
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.cameras.main.shake(100, 0.0005);
            },
            loop: true
        });

        // 2. Hit Zones (Adjusted positions for Mobile vs Desktop)
        if (this.isMobile) {
            // Mobile Layout (Vertical Stack)
            // Bar (Top)
            this.createHitZone(this.scale.width * 0.5, this.scale.height * 0.25, 200, 120, 'AFTERLIFE', 'bar', 0xff003c);

            // HQ (Center)
            this.createHitZone(this.scale.width * 0.5, this.scale.height * 0.5, 200, 150, 'HIDEOUT', 'hideout', 0xfcee0a);

            // Ripperdoc (Bottom)
            this.createHitZone(this.scale.width * 0.5, this.scale.height * 0.75, 200, 120, 'RIPPERDOC', 'ripperdoc', 0x00f0ff);
        } else {
            // Desktop Layout (Horizontal/Scattered)
            // Ripperdoc (Left)
            this.createHitZone(this.scale.width * 0.25, this.scale.height * 0.45, 120, 100, 'RIPPERDOC', 'ripperdoc', 0x00f0ff);

            // HQ (Center)
            this.createHitZone(this.scale.width * 0.5, this.scale.height * 0.55, 150, 150, 'HIDEOUT', 'hideout', 0xfcee0a);

            // Bar (Right)
            this.createHitZone(this.scale.width * 0.75, this.scale.height * 0.70, 120, 100, 'AFTERLIFE', 'bar', 0xff003c);
        }

        // Floating text for mission completion
        window.addEventListener('mission-complete', (e) => this.showMissionReward(e.detail));
    }

    createHitZone(x, y, w, h, label, type, tint) {
        const container = this.add.container(x, y);

        // Hit Zone (Styled as AR Overlay)
        const zone = this.add.rectangle(0, 0, w, h, tint, 0.3);
        zone.setStrokeStyle(2, tint);
        zone.setInteractive({ useHandCursor: true });

        // Label (Floating)
        const text = this.add.text(0, -h / 2 - 20, label, {
            fontFamily: 'Courier New',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([zone, text]);

        // Pulse Animation (Stronger pulse)
        this.tweens.add({
            targets: zone,
            alpha: 0.6,
            strokeAlpha: 1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Hover Effects
        zone.on('pointerover', () => {
            zone.setFillStyle(tint, 0.7);
            this.input.setDefaultCursor('pointer');
        });

        zone.on('pointerout', () => {
            zone.setFillStyle(tint, 0.3);
            this.input.setDefaultCursor('default');
        });

        // Click Handler
        zone.on('pointerdown', () => {
            console.log(`Clicked ${type}`);
            window.dispatchEvent(new CustomEvent('building-click', { detail: { type: type } }));
        });
    }

    spawnBiker() {
        // Spawn at HQ using transparent biker.png
        const biker = this.add.image(this.scale.width * 0.5, this.scale.height * 0.6, 'biker');
        biker.setScale(0.3); // Adjust scale for the new image
        biker.setAngle(-10); // Slight tilt for dynamic look

        // Ensure transparency is rendered correctly
        biker.setBlendMode(Phaser.BlendModes.NORMAL);
        biker.setAlpha(1);

        // Trail effect
        const trail = this.add.graphics();
        trail.fillStyle(0xfcee0a, 0.3);

        // Animate moving to the right
        this.tweens.add({
            targets: biker,
            x: this.scale.width + 100,
            y: this.scale.height * 0.8,
            angle: 10,
            duration: 3000,
            ease: 'Power1',
            onUpdate: () => {
                trail.clear();
                trail.fillCircle(biker.x - 20, biker.y, 10);
            },
            onComplete: () => {
                biker.destroy();
                trail.destroy();
            }
        });
    }

    showMissionReward(detail) {
        const { rewards, leveledUp, injured } = detail;

        // Floating reward text
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

        // Punchy animation
        this.tweens.add({
            targets: text,
            y: this.scale.height * 0.2,
            alpha: 0,
            scale: leveledUp ? 1.5 : 1.2,
            duration: 2000,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });

        // Screen flash for level up
        if (leveledUp) {
            this.cameras.main.flash(500, 252, 238, 10);
        }

        // Red flash for injury
        if (injured) {
            this.cameras.main.flash(300, 255, 0, 60);
        }
    }
}
