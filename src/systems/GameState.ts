import type { TileMap } from '../types';
import type { Player } from '../entities/Player';
import type { EnemyPool } from './EnemyPool';
import type { GameConfig } from '../perks';
import type { GemData } from '../entities/XPGem';

export interface GameTime {
  delta: number;      // seconds (dt) — for movement, physics, animations
  deltaMs: number;    // milliseconds (raw Phaser delta) — for timers
  now: number;        // Phaser absolute time (ms) — for cooldown timestamps
  elapsed: number;    // accumulated game time (ms) — for progression
}

export class GameState {
  readonly time: GameTime;
  readonly player: Player;
  readonly enemyPool: EnemyPool;
  readonly map: TileMap;
  readonly config: GameConfig;
  activeGems: GemData[] = [];
  kills: number = 0;
  deathMasksHeld: number = 0;

  constructor(player: Player, enemyPool: EnemyPool, map: TileMap, config: GameConfig, initialElapsed: number = 0) {
    this.player = player;
    this.enemyPool = enemyPool;
    this.map = map;
    this.config = config;
    this.time = { delta: 0, deltaMs: 0, now: 0, elapsed: initialElapsed };
  }

  tick(now: number, deltaMs: number): void {
    this.time.now = now;
    this.time.deltaMs = deltaMs;
    this.time.delta = deltaMs / 1000;
    this.time.elapsed += deltaMs;
  }
}
