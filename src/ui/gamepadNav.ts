import Phaser from 'phaser';

export class GamepadNav {
  private scene: Phaser.Scene;
  private itemCount: number;
  private onSelect: (index: number) => void;
  private onBack: (() => void) | null;
  private direction: 'vertical' | 'horizontal';
  private selectedIndex = 0;

  // Edge-detection state for dpad/buttons
  private prevAxis = 0;
  private repeatTimer = 0;
  private readonly REPEAT_DELAY = 200;

  private prevA: boolean;
  private prevB: boolean;
  private prevStart: boolean;

  constructor(
    scene: Phaser.Scene,
    itemCount: number,
    onSelect: (index: number) => void,
    onBack: (() => void) | null = null,
    direction: 'vertical' | 'horizontal' = 'vertical',
  ) {
    this.scene = scene;
    this.itemCount = itemCount;
    this.onSelect = onSelect;
    this.onBack = onBack;
    this.direction = direction;

    // Snapshot current button state so held buttons don't fire on the first frame
    const pad = scene.input.gamepad?.pad1;
    this.prevA = pad?.buttons[0]?.pressed ?? false;
    this.prevB = pad?.buttons[1]?.pressed ?? false;
    this.prevStart = pad?.buttons[9]?.pressed ?? false;
  }

  getSelected(): number {
    return this.selectedIndex;
  }

  setItemCount(count: number): void {
    this.itemCount = count;
    if (this.selectedIndex >= count) this.selectedIndex = Math.max(0, count - 1);
  }

  update(time: number): void {
    const pad = this.scene.input.gamepad?.pad1;
    if (!pad) return;

    // Navigation axis: up/down for vertical, left/right for horizontal
    let axis: number;
    if (this.direction === 'vertical') {
      axis = pad.down ? 1 : pad.up ? -1 : 0;
      if (axis === 0 && Math.abs(pad.leftStick.y) > 0.5) {
        axis = pad.leftStick.y > 0 ? 1 : -1;
      }
    } else {
      axis = pad.right ? 1 : pad.left ? -1 : 0;
      if (axis === 0 && Math.abs(pad.leftStick.x) > 0.5) {
        axis = pad.leftStick.x > 0 ? 1 : -1;
      }
    }

    if (axis !== 0) {
      if (this.prevAxis !== axis || time > this.repeatTimer) {
        this.selectedIndex += axis;
        // Wrap around
        if (this.selectedIndex < 0) this.selectedIndex = this.itemCount - 1;
        if (this.selectedIndex >= this.itemCount) this.selectedIndex = 0;
        this.repeatTimer = time + this.REPEAT_DELAY;
      }
    }
    this.prevAxis = axis;

    // A button (index 0) — confirm
    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this.prevA) {
      this.onSelect(this.selectedIndex);
    }
    this.prevA = aDown;

    // B button (index 1) — back
    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this.prevB && this.onBack) {
      this.onBack();
    }
    this.prevB = bDown;

    // Start button (index 9) — back
    const startDown = pad.buttons[9]?.pressed ?? false;
    if (startDown && !this.prevStart && this.onBack) {
      this.onBack();
    }
    this.prevStart = startDown;
  }
}
