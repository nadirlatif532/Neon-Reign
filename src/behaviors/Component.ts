import Phaser from 'phaser';

export abstract class Component {
    protected gameObject: Phaser.GameObjects.GameObject;
    protected scene: Phaser.Scene;

    constructor(gameObject: Phaser.GameObjects.GameObject) {
        this.gameObject = gameObject;
        this.scene = gameObject.scene;

        this.gameObject.on(Phaser.GameObjects.Events.DESTROY, this.destroy, this);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);

        this.start();
    }

    protected start(): void {
        // Override to add initialization logic
    }

    public update(_time: number, _delta: number): void {
        // Override to add update logic
        if (!this.gameObject.active) return;
    }

    public destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        // Clean up other listeners
    }
}
