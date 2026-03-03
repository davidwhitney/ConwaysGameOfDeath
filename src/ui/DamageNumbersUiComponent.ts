import Phaser from 'phaser';
import type { UpdateContext } from '../systems/UpdateContext';

interface DamageText {
  text: Phaser.GameObjects.Text;
  age: number;
  vy: number;
}

export class DamageNumbersUiComponent {
  private scene: Phaser.Scene;
  private active: DamageText[] = [];
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Pre-allocate
    for (let i = 0; i < 30; i++) {
      const t = scene.add.text(-1000, -1000, '', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });
      t.setDepth(20);
      t.setVisible(false);
      this.pool.push(t);
    }
  }

  show(x: number, y: number, damage: number, color: string = '#ffffff', crit: boolean = false): void {
    let text: Phaser.GameObjects.Text;
    if (this.pool.length > 0) {
      text = this.pool.pop()!;
    } else {
      text = this.scene.add.text(-1000, -1000, '', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });
      text.setDepth(20);
    }

    text.setText(damage.toString());
    text.setColor(color);
    text.setPosition(x - text.width / 2, y);
    text.setVisible(true);
    text.setAlpha(1);
    text.setScale(crit ? 1.8 : (damage > 30 ? 1.3 : 1));

    this.active.push({
      text,
      age: 0,
      vy: -60 - Math.random() * 20,
    });
  }

  update(ctx: UpdateContext): void {
    const dt = ctx.time.delta;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      d.age += dt;
      d.text.y += d.vy * dt;
      d.vy *= 0.95;

      const alpha = Math.max(0, 1 - d.age / 0.8);
      d.text.setAlpha(alpha);

      if (d.age > 0.8) {
        d.text.setVisible(false);
        d.text.setPosition(-1000, -1000);
        this.pool.push(d.text);
        this.active.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const d of this.active) d.text.destroy();
    for (const t of this.pool) t.destroy();
  }
}
