import Phaser from 'phaser';
import { EnemyType, EffectType } from '../types';
import {
  GAME_DURATION_MS, BOSS_SPAWN_DISTANCE, DEATH_BASE_HP,
  DEATH_SIZE_MULTIPLIER, DEATH_SPAWN_INTERVAL, DEATH_SPEED_RATIO,
  DEATH_MASK_START_MS, DEATH_MASK_INTERVAL_MS, DEATH_MASK_BASE_DIST,
} from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';
import { randomPositionAtDistance } from './spawnUtils';

export class DeathSpawnSystem implements GameSystem {
  private scene: Phaser.Scene;
  private rng: SeededRandom;
  private timer: number = 0;
  private enabled: boolean = true;
  private maskTimer: number = 0;
  private masksSpawned: number = 0;

  constructor(scene: Phaser.Scene, rng: SeededRandom, enabled: boolean = true) {
    this.scene = scene;
    this.rng = rng;
    this.enabled = enabled;
  }

  setEnabled(val: boolean): void {
    this.enabled = val;
  }

  update(ctx: UpdateContext): void {
    if (!this.enabled) return;

    // Keep all Death enemies at 80% of the player's current speed
    const deathSpeed = ctx.player.getSpeed() * DEATH_SPEED_RATIO;
    for (const enemy of ctx.enemyPool.getActive()) {
      if (enemy.state.type === EnemyType.Death && enemy.state.alive) {
        enemy.state.speed = deathSpeed;
      }
    }

    // Spawn death masks between minutes 20 and 30
    if (ctx.time.elapsed >= DEATH_MASK_START_MS && ctx.time.elapsed < GAME_DURATION_MS && this.masksSpawned < 10) {
      this.maskTimer -= ctx.time.deltaMs;
      if (this.maskTimer <= 0) {
        this.maskTimer = DEATH_MASK_INTERVAL_MS;
        this.masksSpawned++;
        this.spawnMask(ctx);
      }
    }

    if (ctx.time.elapsed < GAME_DURATION_MS) return;

    this.timer -= ctx.time.deltaMs;
    if (this.timer <= 0) {
      this.timer = DEATH_SPAWN_INTERVAL;
      this.spawnDeath(ctx);
    }
  }

  private spawnMask(ctx: UpdateContext): void {
    const { player } = ctx;
    const luckValue = player.getEffectValue(EffectType.Luck);
    const angle = this.rng.next() * Math.PI * 2;
    const dist = 200 + this.rng.next() * DEATH_MASK_BASE_DIST * (1 - luckValue * 0.6);
    const mx = player.state.x + Math.cos(angle) * dist;
    const my = player.state.y + Math.sin(angle) * dist;
    GameEvents.emit(this.scene.events, 'scatter-death-mask', { x: mx, y: my });
    GameEvents.sfx('death-mask-spawn');
  }

  private spawnDeath(ctx: UpdateContext): void {
    const { player, enemyPool } = ctx;
    const { x: bx, y: by } = randomPositionAtDistance(this.rng, player.state.x, player.state.y, BOSS_SPAWN_DISTANCE);

    const death = enemyPool.spawn(EnemyType.Death, bx, by, ctx.time.elapsed, true);
    if (death) {
      death.state.hp = DEATH_BASE_HP * player.state.level;
      death.state.maxHp = death.state.hp;
      death.effectiveSize = death.def.size * DEATH_SIZE_MULTIPLIER;
      death.sprite.setScale(DEATH_SIZE_MULTIPLIER);
      // Spin the black hole continuously
      this.scene.tweens.add({
        targets: death.sprite,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: 'Linear',
      });
    }
    GameEvents.emit(this.scene.events, 'screen-shake', 400, 0.02);
  }

  reset(): void {
    this.timer = 0;
    this.maskTimer = 0;
    this.masksSpawned = 0;
  }

}
