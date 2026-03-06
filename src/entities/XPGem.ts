import Phaser from 'phaser';
import { distanceSq } from '../utils/math';
import { Colors } from '../colors';
import { drawGlowCircle } from '../systems/weapons/GfxPool';

/** Time in seconds before a gem can be collected (scatter animation window) */
const SPAWN_DELAY = 0.4;
/** Speed gems scatter outward during spawn delay */
const SCATTER_SPEED = 120;
/** Max active gems before culling the furthest */
const MAX_GEMS = 1000;
/** Merge radius — gems within this distance merge on spawn */
const MERGE_RADIUS_SQ = 20 * 20;
/** Number of overlapping gems required to trigger a merge */
const MERGE_THRESHOLD = 5;

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
  /** Merged gem brightness boost (0 = normal, higher = brighter) */
  mergeBoost: number;
}

const TEX_MAP: Record<GemKind, string> = {
  xp: 'xp-gem',
  heal: 'healing-gem',
  gold: 'gold-gem',
  vortex: 'vortex-gem',
};

const GEM_TRAIL_COLORS: Record<GemKind, number> = {
  xp: Colors.gems.xp.trail,
  heal: Colors.gems.heal.trail,
  gold: Colors.gems.gold.trail,
  vortex: Colors.gems.vortex.trail,
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
    // Try to merge with nearby same-kind gems
    if (kind === 'xp' || kind === 'gold') {
      const merged = this.tryMergeNearby(x, y, value, kind);
      if (merged) return;
    }

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
    sprite.setTint(0xffffff);
    const scale = this.getBaseScale(kind, value);
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
      mergeBoost: 0,
    });
  }

  /** Try to merge with nearby same-kind gems. Returns true if merged. */
  private tryMergeNearby(x: number, y: number, value: number, kind: GemKind): boolean {
    // Find same-kind gems near the spawn point
    const nearby: number[] = [];
    for (let i = 0; i < this.active.length; i++) {
      const gem = this.active[i];
      if (!gem.alive || gem.kind !== kind) continue;
      const dx = gem.x - x;
      const dy = gem.y - y;
      if (dx * dx + dy * dy < MERGE_RADIUS_SQ) {
        nearby.push(i);
      }
    }

    if (nearby.length < MERGE_THRESHOLD - 1) return false;

    // Merge: absorb all nearby gems into the first one
    const target = this.active[nearby[0]];
    let totalValue = value;
    // Absorb from end to start to keep indices valid
    for (let j = nearby.length - 1; j >= 1; j--) {
      const gem = this.active[nearby[j]];
      totalValue += gem.value;
      this.recycleGem(gem);
      this.active.splice(nearby[j], 1);
    }
    target.value += totalValue;
    target.mergeBoost = Math.min(target.mergeBoost + 1, 4);

    // Update visuals — bigger and brighter
    const scale = this.getBaseScale(kind, target.value);
    target.sprite.setScale(scale);
    this.applyMergeTint(target);

    return true;
  }

  private getBaseScale(kind: GemKind, value: number): number {
    if (kind === 'vortex') return 1.8;
    if (kind === 'xp') return Math.min(2, 0.8 + value * 0.1);
    return 1.4;
  }

  private applyMergeTint(gem: GemData): void {
    if (gem.mergeBoost <= 0) {
      gem.sprite.setTint(0xffffff);
      return;
    }
    // Progressively brighter tint: white → bright white-yellow
    const boost = Math.min(gem.mergeBoost, 4);
    const tints = [0xffffff, 0xffffcc, 0xffffaa, 0xffff88, 0xffff66];
    gem.sprite.setTint(tints[boost]);
  }

  private recycleGem(gem: GemData): void {
    gem.alive = false;
    gem.sprite.setVisible(false);
    gem.sprite.setPosition(-1000, -1000);
    gem.sprite.setTint(0xffffff);
    this.pool.push(gem.sprite);
  }

  update(dt: number, playerX: number, playerY: number, pickupRange: number): { xp: number; heals: number; gold: number; vortex: number } {
    let totalXp = 0;
    let heals = 0;
    let gold = 0;
    let vortex = 0;
    const magnetRange = pickupRange * 3;
    const magnetRangeSq = magnetRange * magnetRange;
    const pickupRangeSq = pickupRange * pickupRange;

    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const pad = 60;
    this.trailGfx.clear();

    // Cap: cull furthest xp gems when over limit
    if (this.active.length > MAX_GEMS) {
      this.cullFurthest(playerX, playerY);
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const gem = this.active[i];
      if (!gem.alive) continue;

      gem.age += dt;

      // Hide off-screen gem sprites (still process logic)
      const onScreen = gem.x >= view.x - pad && gem.x <= view.right + pad &&
                       gem.y >= view.y - pad && gem.y <= view.bottom + pad;
      gem.sprite.setVisible(onScreen);

      // During spawn delay the gem scatters outward and cannot be collected
      if (gem.age < SPAWN_DELAY) {
        const t = gem.age / SPAWN_DELAY;          // 0→1
        const speed = SCATTER_SPEED * (1 - t);    // decelerating
        gem.x += gem.scatterDx * speed * dt;
        gem.y += gem.scatterDy * speed * dt;
        gem.sprite.setPosition(gem.x, gem.y);
        const baseScale = this.getBaseScale(gem.kind, gem.value);
        gem.sprite.setScale(baseScale * (0.6 + 0.4 * t));
        continue;
      }

      const dx = playerX - gem.x;
      const dy = playerY - gem.y;
      const dSq = dx * dx + dy * dy;

      // Magnetize nearby gems
      if (dSq < magnetRangeSq) {
        gem.magnetized = true;
      }

      // Move magnetized gems toward player
      if (gem.magnetized) {
        const speed = gem.vortexed ? 1200 : 400;
        const len = Math.sqrt(dSq);
        if (len > 0) {
          gem.x += (dx / len) * speed * dt;
          gem.y += (dy / len) * speed * dt;
          gem.sprite.setPosition(gem.x, gem.y);

          // Magnetism trail streak (skip if off-screen)
          if (onScreen) {
            const trailColor = GEM_TRAIL_COLORS[gem.kind];
            const nx = -dx / len;
            const ny = -dy / len;
            for (let ti = 1; ti <= 3; ti++) {
              const tt = ti / 3;
              drawGlowCircle(
                this.trailGfx,
                gem.x + nx * ti * 6, gem.y + ny * ti * 6,
                3 * (1 - tt * 0.5), trailColor, (1 - tt) * 0.35,
                2.0, 0.3, false,
              );
            }
          }
        }
      }

      // Pickup
      if (dSq < pickupRangeSq) {
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
        this.recycleGem(gem);
        this.active.splice(i, 1);
      }
    }

    return { xp: totalXp, heals, gold, vortex };
  }

  /** Remove xp gems furthest from the player until under the cap */
  private cullFurthest(playerX: number, playerY: number): void {
    // Collect indices of xp gems (only cull xp, not heal/gold/vortex)
    const xpIndices: { idx: number; distSq: number }[] = [];
    for (let i = 0; i < this.active.length; i++) {
      const gem = this.active[i];
      if (!gem.alive || gem.kind !== 'xp') continue;
      const dx = gem.x - playerX;
      const dy = gem.y - playerY;
      xpIndices.push({ idx: i, distSq: dx * dx + dy * dy });
    }

    // Sort by distance descending (furthest first)
    xpIndices.sort((a, b) => b.distSq - a.distSq);

    let toRemove = this.active.length - MAX_GEMS;
    // Remove from end of active array first (sort removal indices descending)
    const removeIndices: number[] = [];
    for (let i = 0; i < xpIndices.length && toRemove > 0; i++) {
      removeIndices.push(xpIndices[i].idx);
      toRemove--;
    }
    removeIndices.sort((a, b) => b - a);

    for (const idx of removeIndices) {
      this.recycleGem(this.active[idx]);
      this.active.splice(idx, 1);
    }
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
      this.recycleGem(gem);
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
