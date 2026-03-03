import Phaser from 'phaser';
import {
  SeededRandom, EffectType, ENEMY_DEFS, GAME_DURATION_MS,
} from '../shared';
import {
  BOSS_SPAWN_MIN_PROGRESS, BOSS_SPAWN_DISTANCE,
  BOSS_SPAWN_INTERVAL_START, BOSS_SPAWN_INTERVAL_END,
} from '../shared/constants';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';

export interface BossSpawnDeps {
  scene: Phaser.Scene;
  rng: SeededRandom;
}

export class BossSpawnSystem implements GameSystem {
  private scene: Phaser.Scene;
  private rng: SeededRandom;
  private timer: number = 0;

  constructor(deps: BossSpawnDeps) {
    this.scene = deps.scene;
    this.rng = deps.rng;
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
    const availableTypes = ENEMY_DEFS.filter(d => progress >= d.unlockAt);
    if (availableTypes.length === 0) return;

    const type = availableTypes[Math.floor(this.rng.next() * availableTypes.length)].type;
    const angle = this.rng.next() * Math.PI * 2;
    const bx = player.state.x + Math.cos(angle) * BOSS_SPAWN_DISTANCE;
    const by = player.state.y + Math.sin(angle) * BOSS_SPAWN_DISTANCE;

    const boss = enemyPool.spawn(type, bx, by, gameTimeMs, true);
    if (boss && luckValue > 0) {
      const hpReduction = Math.max(0.7, 1 - luckValue * 0.1);
      boss.state.hp = Math.max(1, Math.floor(boss.state.hp * hpReduction));
      boss.state.maxHp = boss.state.hp;
    }
    this.scene.events.emit('screen-shake', 200, 0.008);
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {
    // No listeners to clean up
  }
}
