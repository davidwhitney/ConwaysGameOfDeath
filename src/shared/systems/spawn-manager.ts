import { CellularAutomaton } from './cellular-automaton';
import { SeededRandom } from '../utils/seeded-random';
import { CA_SPAWN_WIDTH, CA_SPAWN_HEIGHT, ENEMY_SPAWN_RANGE_MIN, ENEMY_SPAWN_RANGE_MAX } from '../constants';
import { EnemyType, type EnemyDef } from '../types';
import { ENEMY_DEFS } from '../entities/enemies';

/** GoL patterns for seeding the spawn CA */
export const PATTERNS = {
  /** Glider - moves diagonally, creates directional wave of enemies */
  glider: [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ],
  /** Blinker - oscillates, creates burst spawns at fixed location */
  blinker: [
    [1, 1, 1],
  ],
  /** R-pentomino - chaotic growth, creates large unpredictable wave */
  rpentomino: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  /** Lightweight spaceship - moves horizontally */
  lwss: [
    [0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  /** Pulsar - large oscillator, periodic burst spawn */
  pulsarSeed: [
    [1, 1, 1],
  ],
};

export interface SpawnEvent {
  worldX: number;
  worldY: number;
  enemyType: EnemyType;
}

/**
 * Uses a Game of Life CA (B3/S23) to generate emergent spawn patterns.
 * Each alive cell in the CA maps to a potential spawn point around the player.
 */
export class SpawnManager {
  private ca: CellularAutomaton;
  private rng: SeededRandom;
  private gameTimeMs: number = 0;
  private tickAccumulator: number = 0;
  private tickIntervalMs: number = 500;
  private spawnCooldownMs: number = 1800;
  private spawnTimer: number = 0;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
    this.ca = new CellularAutomaton(
      CA_SPAWN_WIDTH,
      CA_SPAWN_HEIGHT,
      [3],        // Conway's GoL birth
      [2, 3],     // Conway's GoL survival
      true,        // Wrapping for spawn CA
    );
    this.seedInitialPatterns();
  }

  private seedInitialPatterns(): void {
    // Place several gliders and oscillators
    this.ca.placePattern(PATTERNS.glider, 5, 5);
    this.ca.placePattern(PATTERNS.glider, 20, 10);
    this.ca.placePattern(PATTERNS.blinker, 30, 30);
    this.ca.placePattern(PATTERNS.rpentomino, 40, 20);
    this.ca.placePattern(PATTERNS.lwss, 10, 40);
  }

  /** Get available enemy types based on elapsed game time */
  getAvailableEnemyTypes(gameTimeMs: number): EnemyDef[] {
    const minute = gameTimeMs / 60000;
    return ENEMY_DEFS.filter(def => minute >= def.minMinute);
  }

  /** Pick enemy type weighted towards stronger enemies as time passes */
  pickEnemyType(gameTimeMs: number): EnemyType {
    const available = this.getAvailableEnemyTypes(gameTimeMs);
    if (available.length === 0) return EnemyType.Bat;

    // Weight stronger enemies more as time progresses
    const minute = gameTimeMs / 60000;
    const weights = available.map(def => {
      const timeSinceUnlock = minute - def.minMinute;
      return Math.max(1, timeSinceUnlock + 1);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = this.rng.next() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return available[i].type;
    }
    return available[available.length - 1].type;
  }

  /**
   * Update the spawn system and return new spawn events.
   * playerX/Y are world coordinates.
   * spawnRangeMin/Max override the default constants when provided (e.g. viewport-based).
   */
  update(deltaMs: number, playerX: number, playerY: number, spawnRangeMin?: number, spawnRangeMax?: number): SpawnEvent[] {
    this.gameTimeMs += deltaMs;
    const events: SpawnEvent[] = [];

    // Step the CA periodically
    this.tickAccumulator += deltaMs;
    while (this.tickAccumulator >= this.tickIntervalMs) {
      this.tickAccumulator -= this.tickIntervalMs;
      this.ca.step();

      // Add new patterns over time to keep things interesting
      if (this.rng.chance(0.05)) {
        const patterns = Object.values(PATTERNS);
        const pattern = this.rng.pick(patterns);
        const px = this.rng.nextInt(0, CA_SPAWN_WIDTH - 5);
        const py = this.rng.nextInt(0, CA_SPAWN_HEIGHT - 5);
        this.ca.placePattern(pattern, px, py);
      }
    }

    // Spawn enemies from alive cells
    this.spawnTimer += deltaMs;
    // Spawn rate increases with game time
    const minute = this.gameTimeMs / 60000;
    const dynamicCooldown = Math.max(150, this.spawnCooldownMs - minute * 60);

    if (this.spawnTimer >= dynamicCooldown) {
      this.spawnTimer -= dynamicCooldown;

      const aliveCells = this.ca.getAliveCells();
      // Start with 2 spawns per tick, ramp hard over time
      const maxSpawns = Math.min(2 + Math.floor(minute * 1.5), 20);
      const spawns = Math.min(aliveCells.length, maxSpawns);

      for (let i = 0; i < spawns; i++) {
        const cell = this.rng.pick(aliveCells);
        // Map CA cell to world position around player
        const angle = (cell.x / CA_SPAWN_WIDTH) * Math.PI * 2;
        const rangeMin = spawnRangeMin ?? ENEMY_SPAWN_RANGE_MIN;
        const rangeMax = spawnRangeMax ?? ENEMY_SPAWN_RANGE_MAX;
        const dist = rangeMin + (cell.y / CA_SPAWN_HEIGHT) * (rangeMax - rangeMin);

        events.push({
          worldX: playerX + Math.cos(angle) * dist,
          worldY: playerY + Math.sin(angle) * dist,
          enemyType: this.pickEnemyType(this.gameTimeMs),
        });
      }
    }

    return events;
  }

  getGameTimeMs(): number {
    return this.gameTimeMs;
  }
}
