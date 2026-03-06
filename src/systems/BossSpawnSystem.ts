import Phaser from 'phaser';
import { EffectType } from '../types';
import { GAME_DURATION_MS } from '../constants';
import { ENEMY_DEFS } from '../entities/enemies';
import { SeededRandom } from '../utils/seeded-random';
import {
  BOSS_SPAWN_MIN_PROGRESS, BOSS_SPAWN_DISTANCE,
  BOSS_SPAWN_INTERVAL_START, BOSS_SPAWN_INTERVAL_END,
} from '../constants';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';
import { randomPositionAtDistance } from './spawnUtils';

export class BossSpawnSystem implements GameSystem {
  private scene: Phaser.Scene;
  private rng: SeededRandom;
  private timer: number = 0;
  private cachedProgress: number = -1;
  private cachedAvailableTypes: typeof ENEMY_DEFS = [];

  constructor(scene: Phaser.Scene, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
  }

  update(ctx: UpdateContext): void {
    const { deltaMs, elapsed: gameTimeMs } = ctx.time;
    const progress = gameTimeMs / GAME_DURATION_MS;
    if (progress < BOSS_SPAWN_MIN_PROGRESS) return;

    this.timer -= deltaMs;
    if (this.timer <= 0) {
      const t = Math.min(1, (progress - BOSS_SPAWN_MIN_PROGRESS) / (1 - BOSS_SPAWN_MIN_PROGRESS));
      const interval = BOSS_SPAWN_INTERVAL_START + (BOSS_SPAWN_INTERVAL_END - BOSS_SPAWN_INTERVAL_START) * t;
      this.timer = interval;
      const luckVal = ctx.player.getEffectValue(EffectType.Luck);
      this.spawnBoss(ctx, luckVal, gameTimeMs);
    }
  }

  private spawnBoss(ctx: UpdateContext, luckValue: number, gameTimeMs: number): void {
    const { player, enemyPool } = ctx;
    const progress = gameTimeMs / GAME_DURATION_MS;

    if (progress !== this.cachedProgress) {
      this.cachedAvailableTypes = ENEMY_DEFS.filter(d => d.spawnable !== false && progress >= d.unlockAt);
      this.cachedProgress = progress;
    }

    if (this.cachedAvailableTypes.length === 0) return;

    const type = this.cachedAvailableTypes[Math.floor(this.rng.next() * this.cachedAvailableTypes.length)].type;
    const { x: bx, y: by } = randomPositionAtDistance(this.rng, player.state.x, player.state.y, BOSS_SPAWN_DISTANCE);

    const boss = enemyPool.spawn(type, bx, by, gameTimeMs, true);
    if (boss && luckValue > 0) {
      const hpReduction = Math.max(0.7, 1 - luckValue * 0.1);
      boss.state.hp = Math.max(1, Math.floor(boss.state.hp * hpReduction));
      boss.state.maxHp = boss.state.hp;
    }
    GameEvents.emit(this.scene.events, 'screen-shake', 200, 0.008);
    GameEvents.sfx('boss-spawn');
  }

  reset(): void {
    this.timer = 0;
  }

}
