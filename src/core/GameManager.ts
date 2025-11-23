import Phaser from 'phaser';
import { Preloader } from '@/scenes/Preloader';
import { CityScene } from '@/scenes/CityScene';
import { VignettePipeline } from '@/pipelines/VignettePipeline';

export class GameManager {
    private static instance: GameManager;
    private game: Phaser.Game | null = null;

    private constructor() { }

    public static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    public initialize(): void {
        if (this.game) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'app',
            backgroundColor: '#000000',
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: import.meta.env.DEV, // Enable debug in dev mode
                },
            },
            render: {
                pixelArt: false,
                roundPixels: true,
            },
            scene: [Preloader, CityScene],
            callbacks: {
                postBoot: (game) => {
                    const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
                    renderer.pipelines.addPostPipeline('Vignette', VignettePipeline);
                }
            }
        };

        this.game = new Phaser.Game(config);

        window.addEventListener('resize', () => {
            this.game?.scale.resize(window.innerWidth, window.innerHeight);
        });
    }
}
