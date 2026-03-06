import Phaser from 'phaser';
import { EnemyType } from '../types';
import {
  GAME_DURATION_MS, BOSS_SPAWN_DISTANCE, DEATH_BASE_HP,
  DEATH_SIZE_MULTIPLIER, DEATH_SPAWN_INTERVAL, DEATH_SPEED_RATIO,
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

    if (ctx.time.elapsed < GAME_DURATION_MS) return;

    this.timer -= ctx.time.deltaMs;
    if (this.timer <= 0) {
      this.timer = DEATH_SPAWN_INTERVAL;
      this.spawnDeath(ctx);
    }
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
  }

}
