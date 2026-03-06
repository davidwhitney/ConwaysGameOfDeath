import { EffectType, type TileMap } from '../types';
import {
  TILE_SIZE, MAP_EVOLUTION_INTERVAL_MS,
  SCATTER_BASE_COUNT, SCATTER_LUCK_BONUS, SCATTER_MAX_COUNT,
} from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import { isWalkable, iterateMap, ensureWalkable } from './map-generator';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import type { Player } from '../entities/Player';
import Phaser from 'phaser';
import { MapRenderer } from './MapRenderer';
import { SpawnController } from './SpawnController';
import { EnemyPool } from './EnemyPool';
import { CameraManager } from './CameraManager';
import { GameEvents } from './GameEvents';

const SCATTER_INTERVAL_MS = 60_000; // scatter heal gems every 60s

export class GameWorldSystem implements GameSystem {
  private scene: Phaser.Scene;
  private rng: SeededRandom;
  private mapRenderer: MapRenderer;
  private spawnController: SpawnController;
  private enemyPool: EnemyPool;
  private cameraManager: CameraManager;
  private map: TileMap;
  private evolutionTimer: number = 0;
  private scatterTimer: number = SCATTER_INTERVAL_MS;
  private followInitialised: boolean = false;
  private prevPlayerX: number = 0;
  private prevPlayerY: number = 0;

  constructor(scene: Phaser.Scene, rng: SeededRandom, map: TileMap, initialTimeMs: number = 0) {
    this.scene = scene;
    this.rng = rng;
    this.mapRenderer = new MapRenderer(scene, map);
    this.cameraManager = new CameraManager(scene);
    this.map = map;
    this.enemyPool = new EnemyPool(scene, map);

    const spawnSeed = this.rng.state + 1;
    this.spawnController = new SpawnController(scene, spawnSeed, this.enemyPool, map, initialTimeMs);
  }

  update(ctx: UpdateContext): void {
    const { player } = ctx;

    if (!this.followInitialised) {
      this.cameraManager.follow(player.sprite);
      this.followInitialised = true;
    }

    const deltaMs = ctx.time.deltaMs;
    this.mapRenderer.update(this.cameraManager.getCamera());
    const dx = player.state.x - this.prevPlayerX;
    const dy = player.state.y - this.prevPlayerY;
    const isMoving = dx * dx + dy * dy > 1;
    this.prevPlayerX = player.state.x;
    this.prevPlayerY = player.state.y;
    this.cameraManager.updateTilt(player.facingX, player.facingY, isMoving);
    this.spawnController.update(deltaMs, player.state.x, player.state.y);
    this.enemyPool.update(ctx.time.delta, player.state.x, player.state.y);
    this.updateEvolution(ctx);
    this.updateScatter(ctx);
  }

  getEnemyPool(): EnemyPool {
    return this.enemyPool;
  }

  getActiveEnemyCount(): number {
    return this.enemyPool.getActiveCount();
  }

  cameraShake(duration: number, intensity: number): void {
    this.cameraManager.shake(duration, intensity);
  }

  reset(): void {
    this.evolutionTimer = 0;
    this.scatterTimer = SCATTER_INTERVAL_MS;
  }

  destroy(): void {
    this.enemyPool.destroy();
    this.mapRenderer.destroy();
  }

  private updateEvolution(ctx: UpdateContext): void {
    const evoSpeed = 1 + ctx.player.getEffectValue(EffectType.Evolution);
    this.evolutionTimer += ctx.time.deltaMs * evoSpeed;
    if (this.evolutionTimer >= MAP_EVOLUTION_INTERVAL_MS) {
      this.evolutionTimer -= MAP_EVOLUTION_INTERVAL_MS;
      this.evolve(ctx.player);
    }
  }

  private evolve(player: Player): void {
    iterateMap(this.map, player.state.x, player.state.y);

    const safe = ensureWalkable(this.map, player.state.x, player.state.y);
    player.state.x = safe.x;
    player.state.y = safe.y;
    player.sprite.setPosition(safe.x, safe.y);

    this.mapRenderer.invalidate();
    GameEvents.emit(this.scene.events, 'screen-shake', 300, 0.01);
    GameEvents.highlight('map-evolve');

    // Housekeeping: chance to clear enemies on map evolution
    const hkValue = player.getEffectValue(EffectType.Housekeeping);
    if (hkValue > 0 && Math.random() < hkValue) {
      this.enemyPool.clearNonDeath();

      // Determine gem clearing based on Housekeeping level
      const hkEffect = player.state.effects.find(e => e.type === EffectType.Housekeeping);
      const hkLevel = hkEffect?.level ?? 0;
      let clearGems = true;
      if (hkLevel >= 5) clearGems = Math.random() < 0.50;
      else if (hkLevel >= 4) clearGems = Math.random() < 0.75;

      if (clearGems) {
        GameEvents.emit(this.scene.events, 'clear-gems');
      }
    }
  }

  private updateScatter(ctx: UpdateContext): void {
    this.scatterTimer -= ctx.time.deltaMs;
    if (this.scatterTimer <= 0) {
      this.scatterTimer += SCATTER_INTERVAL_MS;
      this.scatterHealthGems(ctx.player);

      // 10% chance to scatter a vortex gem
      if (this.rng.next() < 0.1) {
        this.scatterVortexGem(ctx.player);
      }
    }
  }

  private findScatterPosition(
    px: number, py: number, maxDist: number,
    viewHalfW: number, viewHalfH: number,
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = this.rng.next() * Math.PI * 2;
      const dist = 200 + this.rng.next() * maxDist;
      const gx = px + Math.cos(angle) * dist;
      const gy = py + Math.sin(angle) * dist;

      if (Math.abs(gx - px) < viewHalfW + 32 && Math.abs(gy - py) < viewHalfH + 32) continue;

      const tx = Math.floor(gx / TILE_SIZE);
      const ty = Math.floor(gy / TILE_SIZE);
      if (!isWalkable(this.map, tx, ty)) continue;

      return { x: gx, y: gy };
    }
    return null;
  }

  private scatterVortexGem(player: Player): void {
    const cam = this.scene.cameras.main;
    const pos = this.findScatterPosition(
      player.state.x, player.state.y, 2000,
      cam.worldView.width / 2, cam.worldView.height / 2,
    );
    if (pos) {
      GameEvents.emit(this.scene.events, 'scatter-vortex-gem', pos);
    }
  }

  private scatterHealthGems(player: Player): void {
    const luckValue = player.getEffectValue(EffectType.Luck);
    const count = Math.min(
      SCATTER_MAX_COUNT,
      SCATTER_BASE_COUNT + Math.floor(luckValue * (SCATTER_LUCK_BONUS / 0.15)),
    );

    const cam = this.scene.cameras.main;
    const viewHalfW = cam.worldView.width / 2;
    const viewHalfH = cam.worldView.height / 2;
    const maxDist = 2800 * (1 - luckValue * 0.6);

    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const pos = this.findScatterPosition(player.state.x, player.state.y, maxDist, viewHalfW, viewHalfH);
      if (pos) positions.push(pos);
    }

    if (positions.length > 0) {
      GameEvents.emit(this.scene.events, 'scatter-health-gems', positions);
    }
  }
}
