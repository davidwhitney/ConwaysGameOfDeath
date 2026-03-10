import Phaser from 'phaser';
import {
  type EnemyState, type EnemyDef, EnemyType, type Vec2, type TileMap,
} from '../types';
import {
  ENEMY_DESPAWN_RANGE, GAME_DURATION_MS, TILE_SIZE,
  ENEMY_HP_SCALING, ENEMY_DMG_SCALING,
  BOSS_HP_MULTIPLIER, BOSS_SIZE_MULTIPLIER, BOSS_DAMAGE_MULTIPLIER,
  DEATH_TELEPORT_RATIO, DEATH_TELEPORT_MIN_DIST,
} from '../constants';
import { ENEMY_DEFS } from './enemies';
import { isWalkable } from '../systems/map-generator';
import { directionToInto, distSqXY } from '../utils/math';

const ENEMY_TEXTURE_MAP: Record<EnemyType, string> = {
  [EnemyType.Bat]: 'enemy-bat',
  [EnemyType.Skeleton]: 'enemy-skeleton',
  [EnemyType.Zombie]: 'enemy-zombie',
  [EnemyType.Ghost]: 'enemy-ghost',
  [EnemyType.Werewolf]: 'enemy-werewolf',
  [EnemyType.Mummy]: 'enemy-mummy',
  [EnemyType.Vampire]: 'enemy-vampire',
  [EnemyType.Lich]: 'enemy-lich',
  [EnemyType.Dragon]: 'enemy-dragon',
  [EnemyType.Reaper]: 'enemy-reaper',
  [EnemyType.Death]: 'enemy-death',
};

const TINT_FLASH_MS = 50;
const SPAWN_FLASH_MS = 60;

export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  state: EnemyState;
  def: EnemyDef;
  effectiveSize: number = 10;
  private scene: Phaser.Scene;
  private map: TileMap;

  private orbitAngle: number = 0;
  private teleportTimer: number = 0;
  private crossDir: Vec2 = { x: 1, y: 0 };
  private slowFactor: number = 1;
  private slowUntil: number = 0;
  knockbackImmuneUntil: number = 0;

  /** Poison DoT: damage per tick, ticks remaining, tick interval timer */
  private poisonDps: number = 0;
  private poisonUntil: number = 0;
  private poisonTickTimer: number = 0;

  /** Timestamp-based tint clearing (replaces delayedCall) */
  private tintUntil: number = 0;

  /** Reusable direction vector — avoids per-frame allocation */
  private readonly _dir: { x: number; y: number } = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, map: TileMap) {
    this.scene = scene;
    this.map = map;
    this.def = ENEMY_DEFS[0];
    this.sprite = scene.add.sprite(-1000, -1000, 'enemy-bat');
    this.sprite.setDepth(5);
    this.sprite.setVisible(false);

    this.state = {
      id: 0,
      type: EnemyType.Bat,
      x: -1000, y: -1000,
      hp: 1, maxHp: 1,
      speed: 0, damage: 0,
      alive: false, xpValue: 0,
      boss: false,
    };
  }

  /** Activate this pooled enemy with given type and position */
  activate(id: number, type: EnemyType, x: number, y: number, gameTimeMs: number, boss: boolean = false,
    perkHpMult: number = 1, perkDmgMult: number = 1, perkXpMult: number = 1): void {
    this.def = ENEMY_DEFS[type];
    // Scale HP and damage with game progress (0–1, clamped)
    const progress = Math.min(1, gameTimeMs / GAME_DURATION_MS);
    const hpScale = 1 + progress * ENEMY_HP_SCALING;
    const dmgScale = 1 + progress * ENEMY_DMG_SCALING;

    const bossHpMul = boss ? BOSS_HP_MULTIPLIER : 1;
    this.state = {
      id,
      type,
      x, y,
      hp: Math.floor(this.def.baseHp * hpScale * bossHpMul * perkHpMult),
      maxHp: Math.floor(this.def.baseHp * hpScale * bossHpMul * perkHpMult),
      speed: this.def.baseSpeed,
      damage: Math.floor(this.def.baseDamage * dmgScale * (boss ? BOSS_DAMAGE_MULTIPLIER : 1) * perkDmgMult),
      alive: true,
      xpValue: Math.floor(this.def.xpValue * perkXpMult),
      boss,
    };

    this.effectiveSize = this.def.size * (boss ? BOSS_SIZE_MULTIPLIER : 1);
    this.sprite.setTexture(ENEMY_TEXTURE_MAP[type]);
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    this.sprite.setScale(boss ? BOSS_SIZE_MULTIPLIER : 1);

    // Spawn flash — timestamp-based
    this.sprite.setTintFill(0xffffff);
    this.tintUntil = this.scene.time.now + SPAWN_FLASH_MS;

    this.knockbackImmuneUntil = 0;
    this.poisonDps = 0;
    this.poisonUntil = 0;
    this.poisonTickTimer = 0;

    this.orbitAngle = Math.random() * Math.PI * 2;
    this.teleportTimer = 2000 + Math.random() * 3000;

    const angle = Math.random() * Math.PI * 2;
    this.crossDir = { x: Math.cos(angle), y: Math.sin(angle) };
  }

  /** Restore from a plain EnemyState (snapshot). Resets behavior timers to defaults. */
  restoreState(saved: EnemyState): void {
    this.def = ENEMY_DEFS[saved.type];
    Object.assign(this.state, saved);
    this.effectiveSize = this.def.size * (saved.boss ? BOSS_SIZE_MULTIPLIER : 1);

    this.orbitAngle = Math.random() * Math.PI * 2;
    this.teleportTimer = 2000 + Math.random() * 3000;
    const angle = Math.random() * Math.PI * 2;
    this.crossDir = { x: Math.cos(angle), y: Math.sin(angle) };
    this.slowFactor = 1;
    this.slowUntil = 0;
    this.knockbackImmuneUntil = 0;
    this.poisonDps = 0;
    this.poisonUntil = 0;
    this.poisonTickTimer = 0;

    this.sprite.setTexture(ENEMY_TEXTURE_MAP[saved.type]);
    this.sprite.setPosition(saved.x, saved.y);
    this.sprite.setVisible(saved.alive);
    this.sprite.setScale(saved.boss ? BOSS_SIZE_MULTIPLIER : 1);
    this.sprite.setAlpha(1);
    if (saved.alive) this.sprite.clearTint();
  }

  deactivate(): void {
    this.state.alive = false;
    this.sprite.setVisible(false);
    this.sprite.setPosition(-1000, -1000);
  }

  applySlow(factor: number, durationMs: number): void {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowUntil = Math.max(this.slowUntil, this.scene.time.now + durationMs);
  }

  /** Apply a poison DoT. Stacks refresh duration and take the max DPS. */
  applyPoison(dps: number, durationMs: number): void {
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonUntil = Math.max(this.poisonUntil, this.scene.time.now + durationMs);
  }

  /** @param despawnRangeSq squared despawn distance (avoids sqrt) */
  update(dt: number, playerX: number, playerY: number, despawnRangeSq: number, now: number, camView: Phaser.Geom.Rectangle): boolean {
    if (!this.state.alive) return false;

    // Check despawn distance (squared — no sqrt)
    if (distSqXY(this.state.x, this.state.y, playerX, playerY) > despawnRangeSq) {
      this.deactivate();
      return false;
    }

    // Clear tint flash via timestamp
    if (this.tintUntil > 0 && now >= this.tintUntil) {
      this.tintUntil = 0;
      if (this.state.alive) this.sprite.clearTint();
    }

    // Apply slow effect
    if (now >= this.slowUntil) this.slowFactor = 1;
    const effectiveDt = dt * this.slowFactor;

    // Process poison DoT
    if (this.poisonDps > 0 && now < this.poisonUntil) {
      this.poisonTickTimer += dt * 1000;
      if (this.poisonTickTimer >= 250) {
        this.poisonTickTimer -= 250;
        const dmg = Math.max(1, Math.floor(this.poisonDps * 0.25));
        this.state.hp -= dmg;
        this.sprite.setTint(0x88aa22);
        this.tintUntil = now + 100;
        if (this.state.hp <= 0) {
          this.deactivate();
          return false;
        }
      }
    } else if (this.poisonDps > 0) {
      this.poisonDps = 0;
    }

    switch (this.def.behavior) {
      case 'chase':
        this.behaviorChase(effectiveDt, playerX, playerY);
        break;
      case 'cross':
        this.behaviorCross(effectiveDt);
        break;
      case 'orbit':
        this.behaviorOrbit(effectiveDt, playerX, playerY);
        break;
      case 'teleport':
        this.behaviorTeleport(effectiveDt, playerX, playerY);
        break;
      case 'swarm':
        this.behaviorSwarm(effectiveDt, playerX, playerY, now);
        break;
    }

    // Only call Phaser sprite APIs for on-screen enemies
    const pad = 64;
    if (this.state.x >= camView.x - pad && this.state.x <= camView.right + pad &&
        this.state.y >= camView.y - pad && this.state.y <= camView.bottom + pad) {
      this.sprite.setPosition(this.state.x, this.state.y);
      this.sprite.setFlipX(playerX < this.state.x);
      this.sprite.setVisible(true);
    } else {
      this.sprite.setVisible(false);
    }
    return true;
  }

  private behaviorChase(dt: number, px: number, py: number): void {
    directionToInto(this.state.x, this.state.y, px, py, this._dir);
    this.tryMove(this._dir.x * this.state.speed * dt, this._dir.y * this.state.speed * dt);
  }

  private behaviorCross(dt: number): void {
    // Move in a straight line across the screen
    this.tryMove(this.crossDir.x * this.state.speed * dt, this.crossDir.y * this.state.speed * dt);
  }

  private behaviorOrbit(dt: number, px: number, py: number): void {
    // Orbit around the player at a distance
    const orbitDist = 150;
    this.orbitAngle += this.state.speed * dt * 0.005;
    const targetX = px + Math.cos(this.orbitAngle) * orbitDist;
    const targetY = py + Math.sin(this.orbitAngle) * orbitDist;
    directionToInto(this.state.x, this.state.y, targetX, targetY, this._dir);
    this.tryMove(this._dir.x * this.state.speed * dt, this._dir.y * this.state.speed * dt);
  }

  private behaviorTeleport(dt: number, px: number, py: number): void {
    this.teleportTimer -= dt * 1000;
    if (this.teleportTimer <= 0) {
      // Teleport near player
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      this.state.x = px + Math.cos(angle) * dist;
      this.state.y = py + Math.sin(angle) * dist;
      this.teleportTimer = 2000 + Math.random() * 2000;
    } else {
      // Slowly approach
      directionToInto(this.state.x, this.state.y, px, py, this._dir);
      this.tryMove(this._dir.x * this.state.speed * 0.3 * dt, this._dir.y * this.state.speed * 0.3 * dt);
    }
  }

  private behaviorSwarm(dt: number, px: number, py: number, now: number): void {
    // Like chase but with slight weaving — use scene time instead of Date.now()
    directionToInto(this.state.x, this.state.y, px, py, this._dir);
    const wobble = Math.sin(now * 0.003 + this.state.id) * 0.3;
    this.tryMove(
      (this._dir.x + this._dir.y * wobble) * this.state.speed * dt,
      (this._dir.y - this._dir.x * wobble) * this.state.speed * dt,
    );
  }

  /**
   * Try to move by (dx,dy). If blocked by a wall, steer around the obstacle
   * by sliding along the wall and probing perpendicular directions.
   */
  private tryMove(dx: number, dy: number): void {
    // Ghosts and cross-movers ignore walls
    if (this.def.behavior === 'cross' || this.def.type === EnemyType.Ghost || this.def.type === EnemyType.Death) {
      this.state.x += dx;
      this.state.y += dy;
      return;
    }

    const halfSize = this.effectiveSize / 2;

    // Try full move first
    const fullX = this.state.x + dx;
    const fullY = this.state.y + dy;
    if (this.posWalkable(fullX, fullY, halfSize)) {
      this.state.x = fullX;
      this.state.y = fullY;
      return;
    }

    const slideX = this.state.x + dx;
    const xOk = this.posWalkable(slideX, this.state.y, halfSize);
    if (xOk) {
      this.state.x = slideX;
    }

    const slideY = this.state.y + dy;
    const yOk = this.posWalkable(this.state.x, slideY, halfSize);
    if (yOk) {
      this.state.y = slideY;
    }

    // If completely stuck, try perpendicular nudges to steer around corners
    if (!xOk && !yOk) {
      this.tryCornerNudge(dx, dy, halfSize);
    }
  }

  /** When stuck on a corner, nudge perpendicular to the movement direction */
  private tryCornerNudge(dx: number, dy: number, halfSize: number): void {
    const nudge = this.state.speed * 0.016; // ~1-frame nudge
    if (dx !== 0) {
      if (this.posWalkable(this.state.x, this.state.y - nudge, halfSize)) {
        this.state.y -= nudge;
      } else if (this.posWalkable(this.state.x, this.state.y + nudge, halfSize)) {
        this.state.y += nudge;
      }
    }
    if (dy !== 0) {
      if (this.posWalkable(this.state.x - nudge, this.state.y, halfSize)) {
        this.state.x -= nudge;
      } else if (this.posWalkable(this.state.x + nudge, this.state.y, halfSize)) {
        this.state.x += nudge;
      }
    }
  }

  private posWalkable(x: number, y: number, half: number): boolean {
    const t1x = Math.floor((x - half) / TILE_SIZE);
    const t2x = Math.floor((x + half) / TILE_SIZE);
    const t1y = Math.floor((y - half) / TILE_SIZE);
    const t2y = Math.floor((y + half) / TILE_SIZE);
    return (
      isWalkable(this.map, t1x, t1y) &&
      isWalkable(this.map, t2x, t1y) &&
      isWalkable(this.map, t1x, t2y) &&
      isWalkable(this.map, t2x, t2y)
    );
  }

  takeDamage(damage: number, playerX?: number, playerY?: number): boolean {
    if (!this.state.alive) return false;
    this.state.hp -= damage;
    // Flash white briefly — timestamp-based (no heap allocation)
    this.sprite.setTint(0xffffff);
    this.tintUntil = this.scene.time.now + TINT_FLASH_MS;

    // Death teleports toward the player when hit
    if (this.state.type === EnemyType.Death && playerX !== undefined && playerY !== undefined) {
      const dx = playerX - this.state.x;
      const dy = playerY - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > DEATH_TELEPORT_MIN_DIST) {
        this.state.x += dx * DEATH_TELEPORT_RATIO;
        this.state.y += dy * DEATH_TELEPORT_RATIO;
        this.sprite.setPosition(this.state.x, this.state.y);
      }
    }

    if (this.state.hp <= 0) {
      this.deactivate();
      return true; // died
    }
    return false;
  }
}
