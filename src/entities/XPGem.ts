import Phaser from 'phaser';
import { distance } from '../utils/math';

/** Time in seconds before a gem can be collected (scatter animation window) */
const SPAWN_DELAY = 0.4;
/** Speed gems scatter outward during spawn delay */
const SCATTER_SPEED = 120;

export type GemKind = 'xp' | 'heal' | 'gold' | 'vortex';

export interface GemData {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  value: number;
  alive: boolean;
  magnetized: boolean;
  /** Seconds since spawn; gem is not collectible until >= SPAWN_DELAY */
  age: number;
  /** Scatter direction chosen at spawn */
  scatterDx: number;
  scatterDy: number;
  kind: GemKind;
  vortexed: boolean;
}

const TEX_MAP: Record<GemKind, string> = {
  xp: 'xp-gem',
  heal: 'golden-gem',
  gold: 'gold-gem',
  vortex: 'vortex-gem',
};

const GEM_TRAIL_COLORS: Record<GemKind, number> = {
  xp: 0x00ff66,
  heal: 0xff2222,
  gold: 0xffcc00,
  vortex: 0x2288ff,
};

export class XPGemPool {
  private pool: Phaser.GameObjects.Sprite[] = [];
  private active: GemData[] = [];
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private trailGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.trailGfx = scene.add.graphics();
    this.trailGfx.setDepth(2);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(3);

    // Pre-allocate
    for (let i = 0; i < 100; i++) {
      const s = scene.add.sprite(-1000, -1000, 'xp-gem');
      s.setVisible(false);
      this.container.add(s);
      this.pool.push(s);
    }
  }

  spawn(x: number, y: number, value: number): void {
    this.spawnGem(x, y, value, 'xp');
  }

  spawnHealth(x: number, y: number): void {
    this.spawnGem(x, y, 0, 'heal');
  }

  spawnGold(x: number, y: number, value: number): void {
    this.spawnGem(x, y, value, 'gold');
  }

  spawnVortex(x: number, y: number): void {
    this.spawnGem(x, y, 0, 'vortex');
  }

  private spawnGem(x: number, y: number, value: number, kind: GemKind): void {
    const texKey = TEX_MAP[kind];
    let sprite: Phaser.GameObjects.Sprite;
    if (this.pool.length > 0) {
      sprite = this.pool.pop()!;
      sprite.setTexture(texKey);
    } else {
      sprite = this.scene.add.sprite(-1000, -1000, texKey);
      this.container.add(sprite);
    }

    sprite.setPosition(x, y);
    sprite.setVisible(true);
    const scale = kind === 'vortex' ? 1.8 : kind === 'xp' ? Math.min(2, 0.8 + value * 0.1) : 1.4;
    sprite.setScale(scale);

    // Random scatter direction so gems pop outward from the kill site
    const angle = Math.random() * Math.PI * 2;

    this.active.push({
      sprite, x, y, value,
      alive: true,
      magnetized: false,
      age: 0,
      scatterDx: Math.cos(angle),
      scatterDy: Math.sin(angle),
      kind,
      vortexed: false,
    });
  }

  update(dt: number, playerX: number, playerY: number, pickupRange: number): { xp: number; heals: number; gold: number; vortex: number } {
    let totalXp = 0;
    let heals = 0;
    let gold = 0;
    let vortex = 0;
    const magnetRange = pickupRange * 3;

    this.trailGfx.clear();

    for (let i = this.active.length - 1; i >= 0; i--) {
      const gem = this.active[i];
      if (!gem.alive) continue;

      gem.age += dt;

      // During spawn delay the gem scatters outward and cannot be collected
      if (gem.age < SPAWN_DELAY) {
        const t = gem.age / SPAWN_DELAY;          // 0→1
        const speed = SCATTER_SPEED * (1 - t);    // decelerating
        gem.x += gem.scatterDx * speed * dt;
        gem.y += gem.scatterDy * speed * dt;
        gem.sprite.setPosition(gem.x, gem.y);
        const baseScale = gem.kind === 'xp' ? Math.min(2, 0.8 + gem.value * 0.1) : 1.4;
        gem.sprite.setScale(baseScale * (0.6 + 0.4 * t));
        continue;
      }

      const dist = distance(gem, { x: playerX, y: playerY });

      // Magnetize nearby gems
      if (dist < magnetRange) {
        gem.magnetized = true;
      }

      // Move magnetized gems toward player
      if (gem.magnetized) {
        const speed = gem.vortexed ? 1200 : 400;
        const dx = playerX - gem.x;
        const dy = playerY - gem.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          gem.x += (dx / len) * speed * dt;
          gem.y += (dy / len) * speed * dt;
          gem.sprite.setPosition(gem.x, gem.y);

          // Magnetism trail streak
          const trailColor = GEM_TRAIL_COLORS[gem.kind];
          const nx = -dx / len;
          const ny = -dy / len;
          for (let ti = 1; ti <= 3; ti++) {
            const tt = ti / 3;
            this.trailGfx.fillStyle(trailColor, (1 - tt) * 0.35);
            this.trailGfx.fillCircle(gem.x + nx * ti * 6, gem.y + ny * ti * 6, 3 * (1 - tt * 0.5));
          }
        }
      }

      // Pickup
      if (dist < pickupRange) {
        if (gem.kind === 'vortex') {
          vortex++;
          this.triggerVortex();
        } else if (gem.kind === 'heal') {
          heals++;
        } else if (gem.kind === 'gold') {
          gold += gem.value;
        } else {
          totalXp += gem.value;
        }
        gem.alive = false;
        gem.sprite.setVisible(false);
        gem.sprite.setPosition(-1000, -1000);
        this.pool.push(gem.sprite);
        this.active.splice(i, 1);
      }
    }

    return { xp: totalXp, heals, gold, vortex };
  }

  /** Magnetize all active gems and rush them to the player */
  private triggerVortex(): void {
    for (const gem of this.active) {
      if (!gem.alive || gem.kind === 'vortex') continue;
      gem.magnetized = true;
      gem.vortexed = true;
      gem.age = Math.max(gem.age, SPAWN_DELAY);
    }
  }

  /** Remove all active gems (for Housekeeping effect) */
  clearAll(): void {
    for (const gem of this.active) {
      gem.alive = false;
      gem.sprite.setVisible(false);
      gem.sprite.setPosition(-1000, -1000);
      this.pool.push(gem.sprite);
    }
    this.active.length = 0;
  }

  getActive(): GemData[] {
    return this.active;
  }

  destroy(): void {
    this.trailGfx.destroy();
    this.container.destroy(true);
  }
}
