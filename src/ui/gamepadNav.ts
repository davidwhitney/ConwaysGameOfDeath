import { InputSystem } from '../systems/InputSystem';
import { GameEvents } from '../systems/GameEvents';

export class GamepadNav {
  private itemCount: number;
  private onSelect: (index: number) => void;
  private onBack: (() => void) | null;
  private direction: 'vertical' | 'horizontal';
  private selectedIndex = 0;

  // Guard: suppress input until all action buttons are released after scene start
  private waitForRelease = true;

  constructor(
    _scene: Phaser.Scene,
    itemCount: number,
    onSelect: (index: number) => void,
    onBack: (() => void) | null = null,
    direction: 'vertical' | 'horizontal' = 'vertical',
  ) {
    this.itemCount = itemCount;
    this.onSelect = onSelect;
    this.onBack = onBack;
    this.direction = direction;
  }

  getSelected(): number {
    return this.selectedIndex;
  }

  setItemCount(count: number): void {
    this.itemCount = count;
    if (this.selectedIndex >= count) this.selectedIndex = Math.max(0, count - 1);
  }

  update(): void {
    const input = InputSystem.current;

    // Don't process menu input while an HTML input has focus
    if (input.htmlInputFocused) return;

    // Wait until confirm/back are released before accepting input
    if (this.waitForRelease) {
      if (input.confirm || input.back || input.menu) return;
      this.waitForRelease = false;
      return;
    }

    // Navigation
    const axis = this.direction === 'vertical' ? input.nav.y : input.nav.x;
    if (axis !== 0) {
      this.selectedIndex += axis;
      if (this.selectedIndex < 0) this.selectedIndex = this.itemCount - 1;
      if (this.selectedIndex >= this.itemCount) this.selectedIndex = 0;
      GameEvents.sfx('menu-nav');
    }

    // Confirm
    if (input.confirm) {
      GameEvents.sfx('menu-click');
      this.onSelect(this.selectedIndex);
    }

    // Back
    if (input.back && this.onBack) {
      this.onBack();
    }
  }
}
