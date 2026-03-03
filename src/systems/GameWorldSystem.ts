import {
  SeededRandom, EffectType, TILE_SIZE, isWalkable,
  iterateMap, ensureWalkable, type TileMap,
} from '../shared';
import {
  MAP_EVOLUTION_INTERVAL_MS,
  SCATTER_BASE_COUNT, SCATTER_LUCK_BONUS, SCATTER_MAX_COUNT,
} from '../shared/constants';
import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { MapRenderer } from './MapRenderer';
import { SpawnController } from './SpawnController';
import { EnemyPool } from './EnemyPool';
import { XPGemPool } from '../entities/XPGem';
import type { CameraManager } from './CameraManager';

const SCATTER_INTERVAL_MS = 60_000; // scatter heal gems every 60s

export interface GameWorldDeps {
  scene: Phaser.Scene;
  player: Player;
  rng: SeededRandom;
  mapRenderer: MapRenderer;
  cameraManager: CameraManager;
  map: TileMap;
  spawnSeed: number;
}

export class GameWorldSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private rng: SeededRandom;
  private mapRenderer: MapRenderer;
  private spawnController: SpawnController;
  private enemyPool: EnemyPool;
  private xpGemPool: XPGemPool;
  private cameraManager: CameraManager;
  private map: TileMap;
  private evolutionTimer: number = 0;
  private scatterTimer: number = SCATTER_INTERVAL_MS;

  constructor(deps: GameWorldDeps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.rng = deps.rng;
    this.mapRenderer = deps.mapRenderer;
    this.cameraManager = deps.cameraManager;
    this.map = deps.map;
    this.enemyPool = new EnemyPool(deps.scene, deps.map);
    this.xpGemPool = new XPGemPool(deps.scene);
    this.spawnController = new SpawnController(deps.scene, deps.spawnSeed, this.enemyPool, deps.map);
  }

  update(deltaMs: number): void {
    this.mapRenderer.update(this.cameraManager.getCamera());
    this.spawnController.update(deltaMs, this.player.state.x, this.player.state.y);
    this.enemyPool.update(deltaMs / 1000, this.player.state.x, this.player.state.y);
    this.updateEvolution(deltaMs);
    this.updateScatter(deltaMs);
  }

  getGameTimeMs(): number {
    return this.spawnController.getGameTimeMs();
  }

  getEnemyPool(): EnemyPool {
    return this.enemyPool;
  }

  getXPGemPool(): XPGemPool {
    return this.xpGemPool;
  }

  getActiveEnemyCount(): number {
    return this.enemyPool.getActiveCount();
  }

  reset(): void {
    this.evolutionTimer = 0;
    this.scatterTimer = SCATTER_INTERVAL_MS;
  }

  destroy(): void {
    this.enemyPool.destroy();
    this.xpGemPool.destroy();
    this.mapRenderer.destroy();
  }

  private updateEvolution(deltaMs: number): void {
    const evoSpeed = 1 + this.player.getEffectValue(EffectType.Evolution);
    this.evolutionTimer += deltaMs * evoSpeed;
    if (this.evolutionTimer >= MAP_EVOLUTION_INTERVAL_MS) {
      this.evolutionTimer -= MAP_EVOLUTION_INTERVAL_MS;
      this.evolve();
    }
  }

  private evolve(): void {
    iterateMap(this.map, this.player.state.x, this.player.state.y);

    const safe = ensureWalkable(this.map, this.player.state.x, this.player.state.y);
    this.player.state.x = safe.x;
    this.player.state.y = safe.y;
    this.player.sprite.setPosition(safe.x, safe.y);

    this.mapRenderer.invalidate();
    this.cameraManager.shake(300, 0.01);
  }

  private updateScatter(deltaMs: number): void {
    this.scatterTimer -= deltaMs;
    if (this.scatterTimer <= 0) {
      this.scatterTimer += SCATTER_INTERVAL_MS;
      this.scatterHealthGems();
    }
  }

  private scatterHealthGems(): void {
    const luckValue = this.player.getEffectValue(EffectType.Luck);
    const count = Math.min(
      SCATTER_MAX_COUNT,
      SCATTER_BASE_COUNT + Math.floor(luckValue * (SCATTER_LUCK_BONUS / 0.15)),
    );

    const cam = this.scene.cameras.main;
    const viewHalfW = cam.worldView.width / 2;
    const viewHalfH = cam.worldView.height / 2;
    const px = this.player.state.x;
    const py = this.player.state.y;

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = this.rng.next() * Math.PI * 2;
        const maxDist = 2800 * (1 - luckValue * 0.6);
        const dist = 200 + this.rng.next() * maxDist;
        const gx = px + Math.cos(angle) * dist;
        const gy = py + Math.sin(angle) * dist;

        if (Math.abs(gx - px) < viewHalfW + 32 && Math.abs(gy - py) < viewHalfH + 32) continue;

        const tx = Math.floor(gx / TILE_SIZE);
        const ty = Math.floor(gy / TILE_SIZE);
        if (!isWalkable(this.map, tx, ty)) continue;

        this.xpGemPool.spawnGolden(gx, gy);
        break;
      }
    }
  }
}
