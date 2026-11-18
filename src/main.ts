import { Game } from './game/Game';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const root = document.querySelector<HTMLDivElement>('#interface');

if (!canvas || !root) {
  throw new Error('The RED game canvas or interface root is missing.');
}

const game = new Game(canvas, root);
void game.start().catch((error: unknown) => {
  console.error('RED failed to start.', error);
  root.innerHTML = '<div class="fatal-error"><h1>The valley is unavailable</h1><p>Refresh the page to try again.</p></div>';
});
