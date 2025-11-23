import '@/style.css';
import { GameManager } from '@/core/GameManager';
import { Interface } from '@/ui/Interface';

document.addEventListener('DOMContentLoaded', () => {
    const gameManager = GameManager.getInstance();
    gameManager.initialize();

    new Interface();
});
