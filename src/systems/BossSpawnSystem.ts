import Phaser from 'phaser';
import {
  SeededRandom, EffectType, ENEMY_DEFS, GAME_DURATION_MS,
} from '../shared';
import {
  BOSS_SPAWN_MIN_PROGRESS, BOSS_SPAWN_DISTANCE,
  BOSS_SPAWN_INTERVAL_START, BOSS_SPAWN_INTERVAL_END,
} from '../shared/constants';
import type { Player } from '../entities/Player';
import type { EnemyPool } from './EnemyPool';
import type { CameraManager } from './CameraManager';

export interface BossSpawnDeps {
  player: Player;
  rng: SeededRandom;
  enemyPool: EnemyPool;
  cameraManager: CameraManager;
}

export class BossSpawnSystem {
  private player: Player;
  private rng: SeededRandom;
  private enemyPool: EnemyPool;
  private cameraManager: CameraManager;
  private timer: number = 0;

  constructor(deps: BossSpawnDeps) {
    this.player = deps.player;
    this.rng = deps.rng;
    this.enemyPool = deps.enemyPool;
    this.cameraManager = deps.cameraManager;
  }

  update(deltaMs: number, gameTimeMs: number): void {
    const progress = gameTimeMs / GAME_DURATION_MS;
    if (progress < BOSS_SPAWN_MIN_PROGRESS) return;

    this.timer -= deltaMs;
    if (this.timer <= 0) {
      const t = Math.min(1, (progress - BOSS_SPAWN_MIN_PROGRESS) / (1 - BOSS_SPAWN_MIN_PROGRESS));
      const interval = BOSS_SPAWN_INTERVAL_START + (BOSS_SPAWN_INTERVAL_END - BOSS_SPAWN_INTERVAL_START) * t;
      this.timer = interval;
      const luckVal = this.player.getEffectValue(EffectType.Luck);
      this.spawnBoss(luckVal, gameTimeMs);
    }
  }

  spawnBoss(luckValue: number, gameTimeMs: number): void {
    const progress = gameTimeMs / GAME_DURATION_MS;
    const availableTypes = ENEMY_DEFS.filter(d => progress >= d.unlockAt);
    if (availableTypes.length === 0) return;

    const type = availableTypes[Math.floor(this.rng.next() * availableTypes.length)].type;
    const angle = this.rng.next() * Math.PI * 2;
    const bx = this.player.state.x + Math.cos(angle) * BOSS_SPAWN_DISTANCE;
    const by = this.player.state.y + Math.sin(angle) * BOSS_SPAWN_DISTANCE;

    const boss = this.enemyPool.spawn(type, bx, by, gameTimeMs, true);
    if (boss && luckValue > 0) {
      const hpReduction = Math.max(0.7, 1 - luckValue * 0.1);
      boss.state.hp = Math.max(1, Math.floor(boss.state.hp * hpReduction));
      boss.state.maxHp = boss.state.hp;
    }
    this.cameraManager.shake(200, 0.008);
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {
    // No listeners to clean up
  }
}
