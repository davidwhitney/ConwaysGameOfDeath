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

interface MenuButton {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  defaultFill: number;
  hoverFill: number;
}

export class MenuNav {
  private items: MenuButton[] = [];
  private gpNav: GamepadNav;

  constructor(scene: Phaser.Scene, defs: MenuItemDef[], onBack?: () => void) {
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const idx = i;
      const result = createButton(scene, {
        x: def.x, y: def.y, width: def.width, height: def.height,
        label: def.label, fontSize: def.fontSize, textColor: def.textColor,
        fillColor: def.fillColor, hoverColor: def.hoverColor,
        onClick: def.action,
        onPointerOut: () => { this.items[idx]?.bg.setFillStyle(this.items[idx].defaultFill); },
      });
      this.items.push({
        bg: result.bg,
        text: result.text,
        defaultFill: def.fillColor,
        hoverFill: def.hoverColor,
      });
    }

    const actions = defs.map(def => def.action);
    this.gpNav = new GamepadNav(
      scene,
      defs.length,
      (i) => actions[i](),
      onBack ?? null,
    );
  }

  update(): void {
    this.gpNav.update();
    const sel = this.gpNav.getSelected();
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      item.bg.setFillStyle(i === sel ? item.hoverFill : item.defaultFill);
    }
  }

  getText(index: number): Phaser.GameObjects.Text {
    return this.items[index].text;
  }
}
