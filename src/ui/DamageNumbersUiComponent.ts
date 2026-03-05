import Phaser from 'phaser';
import type { UpdateContext } from '../systems/UpdateContext';

const POOL_SIZE = 30;
const DISPLAY_DEPTH = 20;
const FADE_DURATION = 0.8;
const VELOCITY_BASE = -60;
const VELOCITY_RAND = -20;
const VELOCITY_DAMPING = 0.95;
const CRIT_SCALE = 1.8;
const LARGE_DAMAGE_THRESHOLD = 30;
const LARGE_DAMAGE_SCALE = 1.3;

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

    for (let i = 0; i < POOL_SIZE; i++) {
      const t = this.createText();
      this.pool.push(t);
    }
  }

  show(x: number, y: number, damage: number, color: string = '#ffffff', crit: boolean = false): void {
    const text = this.pool.length > 0 ? this.pool.pop()! : this.createText();

    text.setText(damage.toString());
    text.setColor(color);
    text.setPosition(x - text.width / 2, y);
    text.setVisible(true);
    text.setAlpha(1);
    text.setScale(crit ? CRIT_SCALE : (damage > LARGE_DAMAGE_THRESHOLD ? LARGE_DAMAGE_SCALE : 1));

    this.active.push({
      text,
      age: 0,
      vy: VELOCITY_BASE + Math.random() * VELOCITY_RAND,
    });
  }

  update(ctx: UpdateContext): void {
    const dt = ctx.time.delta;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      d.age += dt;
      d.text.y += d.vy * dt;
      d.vy *= VELOCITY_DAMPING;

      const alpha = Math.max(0, 1 - d.age / FADE_DURATION);
      d.text.setAlpha(alpha);

      if (d.age > FADE_DURATION) {
        d.text.setVisible(false);
        d.text.setPosition(-1000, -1000);
        this.pool.push(d.text);
        this.active.splice(i, 1);
      }
    }
  }

  private createText(): Phaser.GameObjects.Text {
    const t = this.scene.add.text(-1000, -1000, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    t.setDepth(DISPLAY_DEPTH);
    t.setVisible(false);
    return t;
  }

  destroy(): void {
    for (const d of this.active) d.text.destroy();
    for (const t of this.pool) t.destroy();
  }
}
