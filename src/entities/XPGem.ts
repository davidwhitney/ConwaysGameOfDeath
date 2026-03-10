import Phaser from 'phaser';
import { distSqXY } from '../utils/math';
import { Colors } from '../colors';
import { drawGlowCircle } from '../systems/weapons/GfxPool';
import type { SerializedGem } from '../systems/snapshot';

/** Time in seconds before a gem can be collected (scatter animation window) */
const SPAWN_DELAY = 0.4;
/** Speed gems scatter outward during spawn delay */
const SCATTER_SPEED = 120;
/** Max active gems before culling the furthest */
const MAX_GEMS = 1000;
/** Merge radius — gems within this distance merge on spawn */
const MERGE_RADIUS_SQ = 40 * 40;
/** Number of overlapping gems required to trigger a merge */
const MERGE_THRESHOLD = 3;

export type GemKind = 'xp' | 'heal' | 'gold' | 'vortex' | 'death-mask';

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
  'death-mask': 'death-mask-gem',
};

const GEM_TRAIL_COLORS: Record<GemKind, number> = {
  xp: Colors.gems.xp.trail,
  heal: Colors.gems.heal.trail,
  gold: Colors.gems.gold.trail,
  vortex: Colors.gems.vortex.trail,
  'death-mask': Colors.gems.deathMask.trail,
};

export class XPGemPool {
  private pool: Phaser.GameObjects.Sprite[] = [];
  private _active: GemData[] = [];
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

  spawnDeathMask(x: number, y: number): void {
    this.spawnGem(x, y, 0, 'death-mask');
  }

  private spawnGem(x: number, y: number, value: number, kind: GemKind): void {
    // Try to merge with nearby same-kind gems (skip for special gems)
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

    this._active.push({
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
    for (let i = 0; i < this._active.length; i++) {
      const gem = this._active[i];
      if (!gem.alive || gem.kind !== kind) continue;
      const dx = gem.x - x;
      const dy = gem.y - y;
      if (dx * dx + dy * dy < MERGE_RADIUS_SQ) {
        nearby.push(i);
      }
    }

    if (nearby.length < MERGE_THRESHOLD - 1) return false;

    // Merge: absorb all nearby gems into the first one
    const target = this._active[nearby[0]];
    let totalValue = value;
    // Absorb from end to start to keep indices valid
    for (let j = nearby.length - 1; j >= 1; j--) {
      const gem = this._active[nearby[j]];
      totalValue += gem.value;
      this.recycleGem(gem);
      this._active[nearby[j]] = this._active[this._active.length - 1];
      this._active.pop();
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
    if (kind === 'death-mask') return 2.0;
    if (kind === 'vortex') return 1.8;
    if (kind === 'xp') return Math.min(2, 0.8 + value * 0.1);
    return 1.4;
  }

  private applyMergeTint(gem: GemData): void {
    const boost = Math.min(gem.mergeBoost, Colors.mergeTints.length - 1);
    gem.sprite.setTint(Colors.mergeTints[boost]);
  }

  private recycleGem(gem: GemData): void {
    gem.alive = false;
    gem.sprite.setVisible(false);
    gem.sprite.setPosition(-1000, -1000);
    gem.sprite.setTint(0xffffff);
    this.pool.push(gem.sprite);
  }

  update(dt: number, playerX: number, playerY: number, pickupRange: number, enemyPressure: number = 0): { xp: number; heals: number; gold: number; vortex: number; deathMasks: number } {
    const result = { xp: 0, heals: 0, gold: 0, vortex: 0, deathMasks: 0 };
    const magnetRangeSq = (pickupRange * 3) ** 2;
    const pickupRangeSq = pickupRange * pickupRange;

    const view = this.scene.cameras.main.worldView;
    const pad = 60;
    this.trailGfx.clear();
    const skipTrails = enemyPressure > 0.5;

    if (this._active.length > MAX_GEMS) {
      this.cullFurthest(playerX, playerY);
    }

    for (let i = this._active.length - 1; i >= 0; i--) {
      const gem = this._active[i];
      if (!gem.alive) continue;

      gem.age += dt;

      const onScreen = gem.x >= view.x - pad && gem.x <= view.right + pad &&
                       gem.y >= view.y - pad && gem.y <= view.bottom + pad;
      gem.sprite.setVisible(onScreen);

      if (gem.age < SPAWN_DELAY) {
        this.updateScatter(gem, dt);
        continue;
      }

      const dSq = distSqXY(playerX, playerY, gem.x, gem.y);

      if (dSq < magnetRangeSq) gem.magnetized = true;

      if (gem.magnetized) {
        this.applyMagnetism(gem, playerX, playerY, dSq, dt, onScreen && !skipTrails);
      }

      if (dSq < pickupRangeSq) {
        this.collectGem(gem, result);
        this._active[i] = this._active[this._active.length - 1];
        this._active.pop();
      }
    }

    return result;
  }

  private updateScatter(gem: GemData, dt: number): void {
    const t = gem.age / SPAWN_DELAY;
    const speed = SCATTER_SPEED * (1 - t);
    gem.x += gem.scatterDx * speed * dt;
    gem.y += gem.scatterDy * speed * dt;
    gem.sprite.setPosition(gem.x, gem.y);
    gem.sprite.setScale(this.getBaseScale(gem.kind, gem.value) * (0.6 + 0.4 * t));
  }

  private applyMagnetism(gem: GemData, playerX: number, playerY: number, dSq: number, dt: number, drawTrail: boolean): void {
    const speed = gem.vortexed ? 1200 : 400;
    const len = Math.sqrt(dSq);
    if (len === 0) return;
    const dx = playerX - gem.x;
    const dy = playerY - gem.y;
    gem.x += (dx / len) * speed * dt;
    gem.y += (dy / len) * speed * dt;
    gem.sprite.setPosition(gem.x, gem.y);

    if (drawTrail) {
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

  private collectGem(gem: GemData, result: { xp: number; heals: number; gold: number; vortex: number; deathMasks: number }): void {
    switch (gem.kind) {
      case 'death-mask': result.deathMasks++; break;
      case 'vortex': result.vortex++; this.triggerVortex(); break;
      case 'heal': result.heals++; break;
      case 'gold': result.gold += gem.value; break;
      default: result.xp += gem.value; break;
    }
    this.recycleGem(gem);
  }

  /** Remove xp gems furthest from the player until under the cap */
  private cullFurthest(playerX: number, playerY: number): void {
    // Collect indices of xp gems (only cull xp, not heal/gold/vortex/death-mask)
    const xpIndices: { idx: number; distSq: number }[] = [];
    for (let i = 0; i < this._active.length; i++) {
      const gem = this._active[i];
      if (!gem.alive || gem.kind !== 'xp') continue;
      const dx = gem.x - playerX;
      const dy = gem.y - playerY;
      xpIndices.push({ idx: i, distSq: dx * dx + dy * dy });
    }

    // Sort by distance descending (furthest first)
    xpIndices.sort((a, b) => b.distSq - a.distSq);

    let toRemove = this._active.length - MAX_GEMS;
    // Remove from end of active array first (sort removal indices descending)
    const removeIndices: number[] = [];
    for (let i = 0; i < xpIndices.length && toRemove > 0; i++) {
      removeIndices.push(xpIndices[i].idx);
      toRemove--;
    }
    removeIndices.sort((a, b) => b - a);

    for (const idx of removeIndices) {
      this.recycleGem(this._active[idx]);
      this._active[idx] = this._active[this._active.length - 1];
      this._active.pop();
    }
  }

  /** Magnetize all active gems and rush them to the player */
  private triggerVortex(): void {
    for (const gem of this._active) {
      if (!gem.alive || gem.kind === 'vortex') continue;
      gem.magnetized = true;
      gem.vortexed = true;
      gem.age = Math.max(gem.age, SPAWN_DELAY);
    }
  }

  /** Remove all active gems (for Housekeeping effect) */
  clearAll(): void {
    for (const gem of this._active) {
      this.recycleGem(gem);
    }
    this._active.length = 0;
  }

  serializeGems(): SerializedGem[] {
    return this._active.filter(g => g.alive).map(g => ({
      x: g.x, y: g.y, value: g.value, kind: g.kind,
    }));
  }

  restoreGems(gems: SerializedGem[]): void {
    this.clearAll();

    for (const g of gems) {
      const texKey = TEX_MAP[g.kind];
      let sprite: Phaser.GameObjects.Sprite;
      if (this.pool.length > 0) {
        sprite = this.pool.pop()!;
        sprite.setTexture(texKey);
      } else {
        sprite = this.scene.add.sprite(-1000, -1000, texKey);
        this.container.add(sprite);
      }

      sprite.setPosition(g.x, g.y);
      sprite.setVisible(true);
      sprite.setScale(this.getBaseScale(g.kind, g.value));

      this._active.push({
        sprite, x: g.x, y: g.y, value: g.value,
        alive: true, magnetized: false, age: 1,
        scatterDx: 0, scatterDy: 0,
        kind: g.kind, vortexed: false, mergeBoost: 0,
      });
    }
  }

  get active(): GemData[] {
    return this._active;
  }

  destroy(): void {
    this.trailGfx.destroy();
    this.container.destroy(true);
  }
}
