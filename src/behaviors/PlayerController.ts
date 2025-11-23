import Phaser from 'phaser';
import { Component } from './Component';

export class PlayerController extends Component {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private speed: number = 200;
    private body: Phaser.Physics.Arcade.Body | null = null;

    protected start(): void {
        if (this.scene.input.keyboard) {
            this.cursors = this.scene.input.keyboard.createCursorKeys();
        }

        // Ensure the game object has a physics body
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.body = this.gameObject.body;
        } else {
            console.warn("PlayerController attached to object without Arcade Physics Body");
        }
    }

    public update(time: number, delta: number): void {
        super.update(time, delta);
        if (!this.body || !this.cursors) return;

        const { left, right, up, down } = this.cursors;
        let velocityX = 0;
        let velocityY = 0;

        if (left.isDown) {
            velocityX = -this.speed;
        } else if (right.isDown) {
            velocityX = this.speed;
        }

        if (up.isDown) {
            velocityY = -this.speed;
        } else if (down.isDown) {
            velocityY = this.speed;
        }

        this.body.setVelocity(velocityX, velocityY);

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            this.body.velocity.normalize().scale(this.speed);
        }
    }
}
