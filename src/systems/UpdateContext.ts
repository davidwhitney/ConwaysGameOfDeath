import type { TileMap } from '../shared';
import type { Player } from '../entities/Player';
import type { EnemyPool } from './EnemyPool';

export interface UpdateContext {
  time: {
    delta: number;      // seconds (dt) — for movement, physics, animations
    deltaMs: number;    // milliseconds (raw Phaser delta) — for timers
    now: number;        // Phaser absolute time (ms) — for cooldown timestamps
    elapsed: number;    // accumulated game time (ms) — for progression
  };
  player: Player;
  enemyPool: EnemyPool;
  map: TileMap;
}
