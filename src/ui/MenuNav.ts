import Phaser from 'phaser';
import { createButton } from './buttonFactory';
import { GamepadNav } from './gamepadNav';

export interface MenuItemDef {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fontSize: string;
  textColor: string;
  fillColor: number;
  hoverColor: number;
  action: () => void;
}

export class MenuNav {
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private defaultFills: number[] = [];
  private hoverFills: number[] = [];
  private gpNav: GamepadNav;

  constructor(scene: Phaser.Scene, items: MenuItemDef[], onBack?: () => void) {
    for (let i = 0; i < items.length; i++) {
      const def = items[i];
      const idx = i;
      const result = createButton(scene, {
        x: def.x, y: def.y, width: def.width, height: def.height,
        label: def.label, fontSize: def.fontSize, textColor: def.textColor,
        fillColor: def.fillColor, hoverColor: def.hoverColor,
        onClick: def.action,
        onPointerOut: () => { this.buttons[idx]?.setFillStyle(this.defaultFills[idx]); },
      });
      this.buttons.push(result.bg);
      this.texts.push(result.text);
      this.defaultFills.push(def.fillColor);
      this.hoverFills.push(def.hoverColor);
    }

    const actions = items.map(def => def.action);
    this.gpNav = new GamepadNav(
      scene,
      items.length,
      (i) => actions[i](),
      onBack ?? null,
    );
  }

  update(time: number): void {
    this.gpNav.update(time);
    const sel = this.gpNav.getSelected();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setFillStyle(i === sel ? this.hoverFills[i] : this.defaultFills[i]);
    }
  }

  getText(index: number): Phaser.GameObjects.Text {
    return this.texts[index];
  }
}
