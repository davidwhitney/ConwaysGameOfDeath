import Phaser from 'phaser';
import {
  generateMap, iterateMap, ensureWalkable,
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  PLAYER_SIZE, GAME_DURATION_MS, WeaponType, type LevelUpOption,
  SeededRandom, xpForLevel, generateLevelUpOptions, generatePostMaxOptions, applyLevelUpChoice, MAX_LEVEL,
  circlesOverlap, EffectType,
  XP_DROP_BASE_CHANCE, XP_DROP_LUCK_BONUS,
  isWalkable,
} from '../shared';
import { Player } from '../entities/Player';
import { InputManager } from '../systems/InputManager';
import { CameraManager } from '../systems/CameraManager';
import { MapRenderer } from '../systems/MapRenderer';
import { EnemyPool } from '../systems/EnemyPool';
import { SpawnController } from '../systems/SpawnController';
import { WeaponSystem } from '../systems/WeaponSystem';
import { XPGemPool } from '../entities/XPGem';
import { DamageNumberSystem } from '../ui/DamageNumber';
import type { HUDScene } from './HUD';

interface GameInitData {
  seed: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private cameraManager!: CameraManager;
  private mapRenderer!: MapRenderer;

  private enemyPool!: EnemyPool;
  private spawnController!: SpawnController;
  private weaponSystem!: WeaponSystem;
  private xpGemPool!: XPGemPool;
  private damageNumbers!: DamageNumberSystem;

  private seed: number = 0;
  private rng!: SeededRandom;
  private kills: number = 0;
  private gameTimeMs: number = 0;
  private map!: Uint8Array;
  private hudScene!: HUDScene;
  private gameOver: boolean = false;
  private pendingLevelUps: number = 0;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.kills = 0;
    this.gameTimeMs = 0;
    this.gameOver = false;
    this.pendingLevelUps = 0;
  }

  create(): void {
    this.rng = new SeededRandom(this.seed);
    this.map = generateMap(this.seed);
    this.mapRenderer = new MapRenderer(this, this.map);

    // Create player at center of map
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, centerX, centerY, this.map);

    // Give player a starting weapon
    this.player.state.weapons.push({
      type: WeaponType.Whip,
      level: 1,
      cooldownTimer: 0,
    });

    this.inputManager = new InputManager(this);
    this.cameraManager = new CameraManager(this);
    this.cameraManager.follow(this.player.sprite);

    this.enemyPool = new EnemyPool(this, this.map);
    this.spawnController = new SpawnController(this, this.seed + 1, this.enemyPool, this.map);

    this.weaponSystem = new WeaponSystem(this);
    this.xpGemPool = new XPGemPool(this);
    this.damageNumbers = new DamageNumberSystem(this);

    // HUD
    this.scene.launch('HUD');
    this.hudScene = this.scene.get('HUD') as HUDScene;

    // Enemy killed event — XP gem drops based on chance (boosted by Luck)
    this.events.on('enemy-killed', (enemy: { state: { x: number; y: number; xpValue: number }; def: { size: number } }) => {
      this.kills++;
      const luckValue = this.player.getEffectValue(EffectType.Luck);
      const dropChance = Math.min(1, XP_DROP_BASE_CHANCE + luckValue * (XP_DROP_LUCK_BONUS / 0.15));
      if (Math.random() < dropChance) {
        this.xpGemPool.spawn(enemy.state.x, enemy.state.y, enemy.state.xpValue);
      }
    });

    // Level up choice event
    this.events.on('levelup-choice', (index: number) => {
      this.handleLevelUpChoice(index);
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000; // seconds
    this.gameTimeMs += delta;

    if (this.gameTimeMs >= GAME_DURATION_MS) {
      this.endGame(true);
      return;
    }

    const movement = this.inputManager.getMovement();
    this.player.move(movement.x, movement.y, dt);
    this.player.applyRegen(dt);
    this.player.updateVisuals();

    // Pause
    if (this.inputManager.isEscPressed()) {
      this.scene.pause();
      this.scene.launch('Pause');
    }

    this.mapRenderer.update(this.cameraManager.getCamera());
    this.spawnController.update(delta, this.player.state.x, this.player.state.y);
    this.enemyPool.update(dt, this.player.state.x, this.player.state.y);
    this.checkEnemyPlayerCollision(time);
    this.weaponSystem.update(dt, this.player, this.enemyPool, this.damageNumbers);

    // Update XP gems
    const gemResult = this.xpGemPool.update(dt, this.player.state.x, this.player.state.y, this.player.getPickupRange());
    
    if (gemResult.xp > 0) {
      this.player.addXp(gemResult.xp);
    }

    if (gemResult.heals > 0) {
      const healTotal = this.player.state.maxHp * 0.25 * gemResult.heals;
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healTotal);
      this.damageNumbers.show(
        this.player.state.x, this.player.state.y - 30,
        Math.floor(healTotal), '#ffd700',
      );
    }

    // Accumulate all pending level ups (no cap — keeps going past 100)
    while (this.player.state.xp >= this.player.state.xpToNext) {
      this.pendingLevelUps++;
      this.player.state.xp -= this.player.state.xpToNext;
      this.player.state.level++;
      this.player.state.xpToNext = xpForLevel(this.player.state.level + 1);

      // Every 5 levels: scatter golden heal gems around the map
      if (this.player.state.level % 5 === 0) {
        this.scatterGoldenGems();
      }

      // Evolve the map
      if (this.player.state.level % 3 === 0) {
        this.triggerMapEvolution();
      }
    }

    // Open level-up screen (pauses game) after all levels are tallied
    if (this.pendingLevelUps > 0 && !this.scene.isActive('LevelUp')) {
      this.processLevelUp();
    }

    // Damage numbers
    this.damageNumbers.update(dt);

    // HUD
    this.hudScene.updateHUD?.(
      this.player.state,
      this.spawnController.getGameTimeMs(),
      this.kills,
      this.enemyPool.getActiveCount(),
    );

    // Check player death
    if (!this.player.state.alive) {
      this.endGame(false);
    }
  }

  private checkEnemyPlayerCollision(now: number): void {
    const enemies = this.enemyPool.getActive();
    const px = this.player.state.x;
    const py = this.player.state.y;
    const pr = PLAYER_SIZE / 2;

    for (const enemy of enemies) {
      if (!enemy.state.alive) continue;
      if (circlesOverlap(px, py, pr, enemy.state.x, enemy.state.y, enemy.def.size)) {
        const dmg = this.player.takeDamage(enemy.state.damage, now);
        if (dmg > 0) {
          this.damageNumbers.show(px, py - 20, dmg, '#ff4444');
          this.cameraManager.shake(80, 0.003);
        }
      }
    }
  }

  private processLevelUp(): void {
    if (this.pendingLevelUps <= 0) return;
    this.pendingLevelUps--;

    let options: LevelUpOption[];
    if (this.player.state.level > MAX_LEVEL) {
      // Past level 100: offer gold or heal
      options = generatePostMaxOptions(this.player.state.level);
    } else {
      options = generateLevelUpOptions(
        this.player.state.weapons,
        this.player.state.effects,
        () => this.rng.next(),
      );
    }

    if (options.length === 0) return;

    // Store options for the choice handler
    (this as any)._currentLevelUpOptions = options;

    this.scene.pause();
    this.scene.launch('LevelUp', { options });
  }

  private handleLevelUpChoice(index: number): void {
    const options: LevelUpOption[] = (this as any)._currentLevelUpOptions;
    if (!options || index >= options.length) return;

    applyLevelUpChoice(this.player.state, options[index]);

    // Process next pending level up or resume game
    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.scene.resume();
    }
  }

  /** Scatter golden heal gems around the map, offscreen, based on luck */
  private scatterGoldenGems(): void {
    const luckValue = this.player.getEffectValue(EffectType.Luck);
    // Base 3 gems, +2 per luck level, capped at 20
    const count = Math.min(20, 3 + Math.floor(luckValue * (2 / 0.15)));

    const cam = this.cameras.main;
    const viewHalfW = cam.worldView.width / 2;
    const viewHalfH = cam.worldView.height / 2;
    const px = this.player.state.x;
    const py = this.player.state.y;

    for (let i = 0; i < count; i++) {
      // Pick random angle and distance that's offscreen but not too far
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = this.rng.next() * Math.PI * 2;
        const dist = 800 + this.rng.next() * 2000;
        const gx = px + Math.cos(angle) * dist;
        const gy = py + Math.sin(angle) * dist;

        // Must be offscreen
        if (Math.abs(gx - px) < viewHalfW + 32 && Math.abs(gy - py) < viewHalfH + 32) continue;

        // Must be walkable
        const tx = Math.floor(gx / TILE_SIZE);
        const ty = Math.floor(gy / TILE_SIZE);
        if (!isWalkable(this.map, tx, ty)) continue;

        this.xpGemPool.spawnGolden(gx, gy);
        break;
      }
    }
  }

  /** Evolve the map and reset enemies at 25-level milestones */
  private triggerMapEvolution(): void {
    // Evolve the cave map by one CA step
    iterateMap(this.map, this.player.state.x, this.player.state.y);

    // Ensure player isn't stuck in a wall
    const safe = ensureWalkable(this.map, this.player.state.x, this.player.state.y);
    this.player.state.x = safe.x;
    this.player.state.y = safe.y;
    this.player.sprite.setPosition(safe.x, safe.y);

    // Force map re-render
    this.mapRenderer.invalidate();

    // Camera shake to signal the shift
    this.cameraManager.shake(300, 0.01);
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.start('GameOver', {
      victory,
      kills: this.kills,
      level: this.player.state.level,
      time: this.spawnController.getGameTimeMs(),
    });
  }

  shutdown(): void {
    this.weaponSystem?.destroy();
    this.xpGemPool?.destroy();
    this.damageNumbers?.destroy();
    this.mapRenderer?.destroy();
    this.events.removeAllListeners();
  }
}
