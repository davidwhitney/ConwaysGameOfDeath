import type { InputMap } from '../InputMap';
import type { InputSource, InputSourceResult } from './InputSourceResult';

const K_W = 87, K_A = 65, K_S = 83, K_D = 68;
const K_UP = 38, K_DOWN = 40, K_LEFT = 37, K_RIGHT = 39;
const K_ENTER = 13, K_SPACE = 32, K_ESC = 27;
const K_R = 82, K_E = 69;
const K_1 = 49, K_9 = 57;

export class KeyboardSource implements InputSource {
  private keysDown = new Set<number>();
  private keysJustDown = new Set<number>();
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this.keysDown.has(e.keyCode)) {
        this.keysJustDown.add(e.keyCode);
      }
      this.keysDown.add(e.keyCode);
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.keyCode);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  poll(map: InputMap, result: InputSourceResult): void {
    // Movement (held keys)
    let dx = 0, dy = 0;
    if (this.keysDown.has(K_LEFT) || this.keysDown.has(K_A)) dx -= 1;
    if (this.keysDown.has(K_RIGHT) || this.keysDown.has(K_D)) dx += 1;
    if (this.keysDown.has(K_UP) || this.keysDown.has(K_W)) dy -= 1;
    if (this.keysDown.has(K_DOWN) || this.keysDown.has(K_S)) dy += 1;
    result.moveDx = dx;
    result.moveDy = dy;
    // Keyboard movement doubles as nav
    result.navDx = dx;
    result.navDy = dy;

    // Edge-detected actions
    if (this.keysJustDown.has(K_ENTER) || this.keysJustDown.has(K_SPACE)) map.confirm = true;
    if (this.keysJustDown.has(K_ESC)) { map.back = true; map.menu = true; }
    if (this.keysJustDown.has(K_R)) map.reroll = true;
    if (this.keysJustDown.has(K_E)) map.skip = true;

    // Number keys
    for (let k = K_1; k <= K_9; k++) {
      if (this.keysJustDown.has(k)) {
        map.numberPressed = k - K_1 + 1;
        break;
      }
    }

    result.anyJustPressed = this.keysJustDown.size > 0;
    this.keysJustDown.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
