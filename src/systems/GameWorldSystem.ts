import { EffectType } from '../types';
import {
  TILE_SIZE, MAP_EVOLUTION_INTERVAL_MS,
  SCATTER_BASE_COUNT, SCATTER_LUCK_BONUS, SCATTER_MAX_COUNT,
  PLAYER_SIZE,
} from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import { isWalkable, iterateMap, ensureWalkable } from './map-generator';
import type { GameState } from './GameState';
import type { GameSystem } from './GameSystem';
import type { Player } from '../entities/Player';
import Phaser from 'phaser';
import { MapRenderer } from './MapRenderer';
import { SpawnController } from './SpawnController';
import { CameraManager } from './CameraManager';
import { GameEvents } from './GameEvents';

const SCATTER_INTERVAL_MS = 60_000; // scatter heal gems every 60s

export class GameWorldSystem implements GameSystem {
  private scene: Phaser.Scene;
  private rng: SeededRandom;
  private mapRenderer: MapRenderer;
  private spawnController: SpawnController;
  private cameraManager: CameraManager;
  private evolutionTimer: number = 0;
  private scatterTimer: number = SCATTER_INTERVAL_MS;
  private followInitialised: boolean = false;
  private lastShakeTime: number = 0;
  private static readonly SHAKE_DEBOUNCE_MS = 5000;
  private prevPlayerX: number = 0;
  private prevPlayerY: number = 0;
  private _exitGatePos: { x: number; y: number } | null = null;
  private exitGateGfx: Phaser.GameObjects.Graphics | null = null;
  private exitGateAngle: number = 0;

  constructor(scene: Phaser.Scene, rng: SeededRandom, state: GameState) {
    this.scene = scene;
    this.rng = rng;
    this.mapRenderer = new MapRenderer(scene, state.map);
    this.cameraManager = new CameraManager(scene);

    const spawnSeed = this.rng.state + 1;
    this.spawnController = new SpawnController(scene, spawnSeed, state.time.elapsed);

    GameEvents.on(scene.events, 'impact-occurred', (duration, intensity) => this.cameraShake(duration, intensity));
    GameEvents.on(scene.events, 'exit-gate-spawned', (pos) => this.spawnExitGate(pos));
  }

  update(state: GameState): void {
    const { player, enemyPool, map } = state;

    if (!this.followInitialised) {
      this.cameraManager.follow(player.sprite);
      this.followInitialised = true;
    }

    const deltaMs = state.time.deltaMs;
    this.mapRenderer.update(this.cameraManager.camera);
    const dx = player.state.x - this.prevPlayerX;
    const dy = player.state.y - this.prevPlayerY;
    const isMoving = dx * dx + dy * dy > 1;
    this.prevPlayerX = player.state.x;
    this.prevPlayerY = player.state.y;
    this.cameraManager.updateTilt(player.facingX, player.facingY, isMoving);
    this.spawnController.update(deltaMs, player.state.x, player.state.y, enemyPool, map);
    enemyPool.update(state.time.delta, player.state.x, player.state.y);
    this.updateEvolution(state);
    this.updateScatter(state);
    this.updateExitGate(state.time.delta, player);
  }

  get exitGatePos(): { x: number; y: number } | null {
    return this._exitGatePos;
  }

  cameraShake(duration: number, intensity: number): void {
    const now = performance.now();
    if (now - this.lastShakeTime < GameWorldSystem.SHAKE_DEBOUNCE_MS) return;
    this.lastShakeTime = now;
    this.cameraManager.shake(duration, intensity);
  }

  reset(): void {
    this.evolutionTimer = 0;
    this.scatterTimer = SCATTER_INTERVAL_MS;
  }

  destroy(): void {
    GameEvents.off(this.scene.events, 'impact-occurred');
    GameEvents.off(this.scene.events, 'exit-gate-spawned');
    this.exitGateGfx?.destroy();
    this.mapRenderer.destroy();
  }

  private spawnExitGate(pos: { x: number; y: number }): void {
    this._exitGatePos = pos;
    this.exitGateGfx = this.scene.add.graphics().setDepth(20);
    GameEvents.emit(this.scene.events, 'impact-occurred', 600, 0.02);
  }

  private updateExitGate(dt: number, player: Player): void {
    if (!this._exitGatePos || !this.exitGateGfx) return;

    this.exitGateAngle += dt * 2;
    const { x, y } = this._exitGatePos;
    const gfx = this.exitGateGfx;
    gfx.clear();

    // Pulsing golden portal
    const pulse = 0.85 + 0.15 * Math.sin(this.exitGateAngle * 3);
    const radius = 40 * pulse;

    // Outer glow
    gfx.fillStyle(0xffcc00, 0.15);
    gfx.fillCircle(x, y, radius * 2.5);
    // Mid ring
    gfx.fillStyle(0xffdd44, 0.25);
    gfx.fillCircle(x, y, radius * 1.5);
    // Core
    gfx.fillStyle(0xffee88, 0.6);
    gfx.fillCircle(x, y, radius);
    // Bright center
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(x, y, radius * 0.4);

    // Rotating ring particles
    for (let i = 0; i < 8; i++) {
      const a = this.exitGateAngle + (Math.PI * 2 * i) / 8;
      const px = x + Math.cos(a) * radius * 1.8;
      const py = y + Math.sin(a) * radius * 1.8;
      gfx.fillStyle(0xffcc00, 0.5);
      gfx.fillCircle(px, py, 4);
    }

    // Check player collision
    const dx = player.state.x - x;
    const dy = player.state.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius + PLAYER_SIZE / 2) {
      GameEvents.emit(this.scene.events, 'player-extracted');
    }
  }

  private updateEvolution(state: GameState): void {
    const { player, map } = state;
    const evoSpeed = 1 + player.getEffectValue(EffectType.Evolution);
    this.evolutionTimer += state.time.deltaMs * evoSpeed;
    if (this.evolutionTimer >= MAP_EVOLUTION_INTERVAL_MS) {
      this.evolutionTimer -= MAP_EVOLUTION_INTERVAL_MS;
      this.evolve(state, evoSpeed);
    }
  }

  private evolve(state: GameState, evoSpeed: number): void {
    const { player, enemyPool, map } = state;
    iterateMap(map, player.state.x, player.state.y);

    const safe = ensureWalkable(map, player.state.x, player.state.y);
    player.state.x = safe.x;
    player.state.y = safe.y;
    player.sprite.setPosition(safe.x, safe.y);

    this.mapRenderer.invalidate();

    // Skip screen shake when evolution is fast enough to be routine
    if (evoSpeed <= 3) {
      const intensity = evoSpeed <= 1.5 ? 0.01 : 0.01 * (3 - evoSpeed) / 1.5;
      GameEvents.emit(this.scene.events, 'impact-occurred', 300, intensity);
    }

    GameEvents.highlight('map-evolve');

    // Housekeeping: chance to clear enemies on map evolution
    const hkValue = player.getEffectValue(EffectType.Housekeeping);
    if (hkValue > 0 && Math.random() < hkValue) {
      enemyPool.clearNonDeath();

      // Determine gem clearing based on Housekeeping level
      const hkEffect = player.state.effects.find(e => e.type === EffectType.Housekeeping);
      const hkLevel = hkEffect?.level ?? 0;
      let clearGems = true;
      if (hkLevel >= 5) clearGems = Math.random() < 0.50;
      else if (hkLevel >= 4) clearGems = Math.random() < 0.75;

      if (clearGems) {
        GameEvents.emit(this.scene.events, 'gems-cleared');
      }
    }
  }

  private updateScatter(state: GameState): void {
    this.scatterTimer -= state.time.deltaMs;
    if (this.scatterTimer <= 0) {
      this.scatterTimer += SCATTER_INTERVAL_MS;
      this.scatterHealthGems(state);

      // 10% chance to scatter a vortex gem
      if (this.rng.next() < 0.1) {
        this.scatterVortexGem(state);
      }
    }
  }

  private findScatterPosition(
    px: number, py: number, maxDist: number,
    viewHalfW: number, viewHalfH: number,
    map: GameState['map'],
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = this.rng.next() * Math.PI * 2;
      const dist = 200 + this.rng.next() * maxDist;
      const gx = px + Math.cos(angle) * dist;
      const gy = py + Math.sin(angle) * dist;

      if (Math.abs(gx - px) < viewHalfW + 32 && Math.abs(gy - py) < viewHalfH + 32) continue;

      const tx = Math.floor(gx / TILE_SIZE);
      const ty = Math.floor(gy / TILE_SIZE);
      if (!isWalkable(map, tx, ty)) continue;

      return { x: gx, y: gy };
    }
    return null;
  }

  private scatterVortexGem(state: GameState): void {
    const { player, map } = state;
    const cam = this.scene.cameras.main;
    const pos = this.findScatterPosition(
      player.state.x, player.state.y, 2000,
      cam.worldView.width / 2, cam.worldView.height / 2,
      map,
    );
    if (pos) {
      GameEvents.emit(this.scene.events, 'vortex-gem-dropped', pos);
    }
  }

  private scatterHealthGems(state: GameState): void {
    const { player, map } = state;
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
      const pos = this.findScatterPosition(player.state.x, player.state.y, maxDist, viewHalfW, viewHalfH, map);
      if (pos) positions.push(pos);
    }

    if (positions.length > 0) {
      GameEvents.emit(this.scene.events, 'health-gems-dropped', positions);
    }
  }
}
