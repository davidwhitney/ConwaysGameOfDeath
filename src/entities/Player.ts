import Phaser from 'phaser';
import {
  EffectType,
  type PlayerState, type WeaponInstance, type EffectInstance, type TileMap,
} from '../types';
import {
  PLAYER_BASE_HP, PLAYER_BASE_SPEED, PLAYER_SIZE, PLAYER_INVINCIBLE_MS,
  PLAYER_PICKUP_RANGE, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT,
} from '../constants';
import { EFFECT_DEFS } from './effects';
import { isWalkable } from '../systems/map-generator';
import { clamp } from '../utils/math';
import { GameEvents } from '../systems/GameEvents';

export class Player {
  sprite: Phaser.GameObjects.Sprite;
  state: PlayerState;
  private scene: Phaser.Scene;
  facingX: number = 1;
  facingY: number = 0;
  private baseMaxHp: number = PLAYER_BASE_HP;

  private effectValueCache: Map<EffectType, number> = new Map();
  private effectCacheRef: EffectInstance[] | null = null;
  private effectCacheLength: number = -1;
  private effectCacheDirty: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string = 'local') {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, 'player');
    this.sprite.setDepth(10);

    this.state = {
      id,
      x, y,
      hp: PLAYER_BASE_HP,
      maxHp: PLAYER_BASE_HP,
      speed: PLAYER_BASE_SPEED,
      level: 1,
      xp: 0,
      xpToNext: 5,
      weapons: [],
      effects: [],
      alive: true,
      invincibleUntil: 0,
      gold: 0,
    };
  }

  getEffectValue(type: EffectType): number {
    if (this.effectCacheDirty
      || this.effectCacheRef !== this.state.effects
      || this.effectCacheLength !== this.state.effects.length) {
      this.rebuildEffectCache();
    }
    return this.effectValueCache.get(type) ?? 0;
  }

  invalidateEffectCache(): void {
    this.effectCacheDirty = true;
  }

  private rebuildEffectCache(): void {
    this.effectValueCache.clear();
    for (const eff of this.state.effects) {
      const def = EFFECT_DEFS[eff.type];
      this.effectValueCache.set(eff.type, def.levelValues[eff.level - 1]);
    }
    this.effectCacheDirty = false;
    this.effectCacheRef = this.state.effects;
    this.effectCacheLength = this.state.effects.length;
  }

  getSpeed(): number {
    return this.state.speed * (1 + this.getEffectValue(EffectType.Speed));
  }

  getPickupRange(): number {
    return PLAYER_PICKUP_RANGE * (1 + this.getEffectValue(EffectType.Magnet));
  }

  getCooldownReduction(): number {
    return this.getEffectValue(EffectType.Cooldown);
  }

  getDamageMultiplier(): number {
    let mul = 1 + this.getEffectValue(EffectType.Might);
    // Berserk: bonus damage when below 50% HP
    const berserk = this.getEffectValue(EffectType.Berserk);
    if (berserk > 0 && this.state.hp < this.state.maxHp * 0.5) {
      mul += berserk;
    }
    return mul;
  }

  getArmor(): number {
    return this.getEffectValue(EffectType.Armor);
  }

  getAuraMultiplier(): number {
    return 1 + this.getEffectValue(EffectType.StrongAuras);
  }

  getFuryReduction(): number {
    return this.getEffectValue(EffectType.Fury);
  }

  getFocusedLevel(): number {
    return this.getEffectValue(EffectType.Focused);
  }

  getDurationMultiplier(): number {
    return 1 + this.getEffectValue(EffectType.Duration);
  }

  move(dx: number, dy: number, dt: number, map: TileMap): void {
    if (!this.state.alive) return;

    const speed = this.getSpeed();
    let newX = this.state.x + dx * speed * dt;
    let newY = this.state.y + dy * speed * dt;

    // Update facing
    if (dx !== 0 || dy !== 0) {
      this.facingX = dx;
      this.facingY = dy;
    }

    // Wall collision - check tile at player edges
    const halfSize = PLAYER_SIZE / 2;

    // Check X movement
    const testTx = Math.floor((newX + (dx > 0 ? halfSize : -halfSize)) / TILE_SIZE);
    const testTyTop = Math.floor((this.state.y - halfSize) / TILE_SIZE);
    const testTyBot = Math.floor((this.state.y + halfSize) / TILE_SIZE);
    if (!isWalkable(map, testTx, testTyTop) || !isWalkable(map, testTx, testTyBot)) {
      newX = this.state.x;
    }

    // Check Y movement
    const testTy = Math.floor((newY + (dy > 0 ? halfSize : -halfSize)) / TILE_SIZE);
    const testTxLeft = Math.floor((newX - halfSize) / TILE_SIZE);
    const testTxRight = Math.floor((newX + halfSize) / TILE_SIZE);
    if (!isWalkable(map, testTxLeft, testTy) || !isWalkable(map, testTxRight, testTy)) {
      newY = this.state.y;
    }

    // Clamp to world bounds
    newX = clamp(newX, halfSize, WORLD_WIDTH - halfSize);
    newY = clamp(newY, halfSize, WORLD_HEIGHT - halfSize);

    this.state.x = newX;
    this.state.y = newY;
    this.sprite.setPosition(newX, newY);
  }

  takeDamage(damage: number, now: number): number {
    if (!this.state.alive) return 0;
    if (now < this.state.invincibleUntil) return 0;

    // Dodge check
    const dodgeChance = this.getEffectValue(EffectType.Dodge);
    if (dodgeChance > 0 && Math.random() < dodgeChance) return 0;

    const reduced = Math.max(1, damage - this.getArmor());
    this.state.hp -= reduced;
    this.state.invincibleUntil = now + PLAYER_INVINCIBLE_MS;
    GameEvents.sfx('player-hit');

    // Flash the player sprite to show damage / i-frames
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.state.alive) this.sprite.clearTint();
    });

    if (this.state.hp <= 0) {
      // Check revival
      const revival = this.state.effects.find(e => e.type === EffectType.Revival);
      if (revival) {
        const def = EFFECT_DEFS[EffectType.Revival];
        const reviveHpPct = def.levelValues[revival.level - 1];
        this.state.hp = Math.floor(this.state.maxHp * reviveHpPct);
        // Remove revival after use
        this.state.effects = this.state.effects.filter(e => e.type !== EffectType.Revival);
      } else {
        this.state.hp = 0;
        this.state.alive = false;
        GameEvents.sfx('player-death');
      }
    }

    return reduced;
  }

  addXp(amount: number): boolean {
    const xpMultiplier = 1 + this.getEffectValue(EffectType.XPBoost);
    this.state.xp += Math.floor(amount * xpMultiplier);

    if (this.state.xp >= this.state.xpToNext) {
      return true; // Level up ready
    }
    return false;
  }

  applyRegen(dt: number): void {
    const regen = this.getEffectValue(EffectType.Regen);
    if (regen > 0 && this.state.hp < this.state.maxHp) {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + regen * dt);
    }

    // Growth: slowly increase base max HP over time
    const growth = this.getEffectValue(EffectType.Growth);
    if (growth > 0) {
      this.baseMaxHp += growth * dt;
    }

    // Vitality: multiply max HP
    const vitality = this.getEffectValue(EffectType.Vitality);
    this.state.maxHp = Math.floor(this.baseMaxHp * (1 + vitality));
  }

  /** Flip sprite based on facing direction */
  updateVisuals(): void {
    this.sprite.setFlipX(this.facingX < 0);
    // Flash when invincible
    const now = performance.now();
    if (now < this.state.invincibleUntil) {
      this.sprite.setAlpha(Math.sin(now * 0.02) * 0.3 + 0.7);
    } else {
      this.sprite.setAlpha(1);
    }
  }
}
