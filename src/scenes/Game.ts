import Phaser from 'phaser';
import {
  generateMap, iterateMap, ensureWalkable,
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  PLAYER_SIZE, GAME_DURATION_MS, WeaponType, type LevelUpOption,
  SeededRandom, xpForLevel, generateLevelUpOptions, generatePostMaxOptions, applyLevelUpChoice, MAX_LEVEL, MAX_WEAPON_LEVEL,
  circlesOverlap, EffectType, EnemyType, ENEMY_DEFS,
  XP_DROP_BASE_CHANCE, XP_DROP_LUCK_BONUS,
  GOLD_DROP_BASE_CHANCE, GOLD_DROP_LUCK_BONUS,
  GOLD_REROLL_BASE_COST, GOLD_REROLL_COST_MULTIPLIER,
  isWalkable,
} from '../shared';
import {
  BOSS_HP_MULTIPLIER, BOSS_KILL_HEAL_PCT, HEAL_GEM_PCT,
  LEVELUP_LUCK_BASE_HEAL_PCT, LEVELUP_LUCK_HEAL_SCALING,
  BOSS_SPAWN_BASE_CHANCE, BOSS_SPAWN_MIN_PROGRESS,
  BOSS_SPAWN_DISTANCE,
  SCATTER_BASE_COUNT, SCATTER_LUCK_BONUS, SCATTER_MAX_COUNT,
} from '../shared/constants';
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
  private rerollCount: number = 0;
  private currentLevelUpOptions: LevelUpOption[] = [];
  private visibilityHandler: (() => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.kills = 0;
    this.gameTimeMs = 0;
    this.gameOver = false;
    this.pendingLevelUps = 0;
    this.rerollCount = 0;
    this.currentLevelUpOptions = [];
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
    this.scene.launch('HUD', { seed: this.seed });
    this.hudScene = this.scene.get('HUD') as HUDScene;

    // Event handlers
    this.events.on('enemy-killed', (e: { state: { x: number; y: number; xpValue: number; boss: boolean } }, w?: WeaponType) => this.handleEnemyKilled(e, w));
    this.events.on('levelup-choice', (index: number) => this.handleLevelUpChoice(index));
    this.events.on('levelup-reroll', () => this.handleReroll());

    // Pause when browser tab loses focus or window blurs
    this.visibilityHandler = () => {
      if (!this.gameOver && !this.scene.isPaused()) {
        this.scene.pause();
        this.scene.launch('Pause');
      }
    };
    this.visibilityChangeHandler = () => {
      if (document.hidden) this.visibilityHandler!();
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('blur', this.visibilityHandler);

    // Cleanup on shutdown
    this.events.once('shutdown', () => this.shutdown());
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000; // seconds
    this.gameTimeMs += delta;

    this.updateMovement(dt);
    this.updateSystems(delta);
    this.checkEnemyPlayerCollision(time);
    this.weaponSystem.update(dt, this.player, this.enemyPool, this.damageNumbers);
    this.updatePickups(dt);
    this.accumulateLevelUps();

    // Open level-up screen (pauses game) after all levels are tallied
    if (this.pendingLevelUps > 0 && !this.scene.isActive('LevelUp')) {
      this.processLevelUp();
    }

    this.damageNumbers.update(dt);
    this.updateHUD();

    // Check player death — surviving past target time counts as victory
    if (!this.player.state.alive) {
      this.endGame(this.gameTimeMs >= GAME_DURATION_MS);
    }
  }

  private updateMovement(dt: number): void {
    const movement = this.inputManager.getMovement();
    this.player.move(movement.x, movement.y, dt);
    this.player.applyRegen(dt);
    this.player.updateVisuals();

    // Pause
    if (this.inputManager.isMenuPressed()) {
      this.scene.pause();
      this.scene.launch('Pause');
    }
  }

  private updateSystems(delta: number): void {
    this.mapRenderer.update(this.cameraManager.getCamera());
    this.spawnController.update(delta, this.player.state.x, this.player.state.y);
    this.enemyPool.update(delta / 1000, this.player.state.x, this.player.state.y);
  }

  private updatePickups(dt: number): void {
    const gemResult = this.xpGemPool.update(dt, this.player.state.x, this.player.state.y, this.player.getPickupRange());

    if (gemResult.xp > 0) {
      this.player.addXp(gemResult.xp);
    }

    if (gemResult.heals > 0) {
      const healTotal = this.player.state.maxHp * HEAL_GEM_PCT * gemResult.heals;
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healTotal);
      this.damageNumbers.show(
        this.player.state.x, this.player.state.y - 30,
        Math.floor(healTotal), '#ff4444',
      );
    }

    if (gemResult.gold > 0) {
      this.player.state.gold += gemResult.gold;
    }
  }

  private accumulateLevelUps(): void {
    while (this.player.state.xp >= this.player.state.xpToNext) {
      this.pendingLevelUps++;
      this.player.state.xp -= this.player.state.xpToNext;
      this.player.state.level++;
      this.player.state.xpToNext = xpForLevel(this.player.state.level + 1);

      // Every 5 levels: scatter heal gems around the map
      if (this.player.state.level % 5 === 0) {
        this.scatterHealthGems();
      }

      // Evolve the map (delayed so the player sees it happen)
      if (this.player.state.level % 3 === 0) {
        this.time.delayedCall(3000, () => this.triggerMapEvolution());
      }

      // Luck-based heal on level up
      const luckVal = this.player.getEffectValue(EffectType.Luck);
      if (luckVal > 0 && Math.random() < luckVal) {
        const healPct = LEVELUP_LUCK_BASE_HEAL_PCT + luckVal * LEVELUP_LUCK_HEAL_SCALING;
        const healAmt = Math.floor(this.player.state.maxHp * healPct);
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healAmt);
        this.damageNumbers.show(this.player.state.x, this.player.state.y - 30, healAmt, '#ff4444');
      }

      // Chance to spawn a boss monster (not before 25% game progress, scales with time)
      const progress = this.gameTimeMs / GAME_DURATION_MS;
      if (progress >= BOSS_SPAWN_MIN_PROGRESS) {
        const bossChance = BOSS_SPAWN_BASE_CHANCE + (progress - BOSS_SPAWN_MIN_PROGRESS) * 0.6;
        if (Math.random() < bossChance) {
          this.spawnBoss(luckVal);
        }
      }
    }
  }

  private updateHUD(): void {
    this.hudScene.updateHUD?.(
      this.player.state,
      this.spawnController.getGameTimeMs(),
      this.kills,
      this.enemyPool.getActiveCount(),
    );
  }

  private handleEnemyKilled(enemy: { state: { x: number; y: number; xpValue: number; boss: boolean } }, weaponType?: WeaponType): void {
    this.kills++;
    const luckValue = this.player.getEffectValue(EffectType.Luck);
    const dropChance = Math.min(1, XP_DROP_BASE_CHANCE + luckValue * (XP_DROP_LUCK_BONUS / 0.15));
    if (Math.random() < dropChance) {
      this.xpGemPool.spawn(enemy.state.x, enemy.state.y, enemy.state.xpValue);
    }

    // Gold drop (scaled with luck)
    const goldChance = Math.min(1, GOLD_DROP_BASE_CHANCE + luckValue * (GOLD_DROP_LUCK_BONUS / 0.15));
    if (Math.random() < goldChance) {
      this.xpGemPool.spawnGold(enemy.state.x, enemy.state.y, 1);
    }

    // Boss kill: level up the weapon that killed it, or heal 50%
    if (enemy.state.boss && weaponType !== undefined) {
      const weapon = this.player.state.weapons.find(w => w.type === weaponType);
      if (weapon && weapon.level < MAX_WEAPON_LEVEL) {
        weapon.level++;
        this.damageNumbers.show(
          this.player.state.x, this.player.state.y - 40,
          weapon.level, '#ffcc00',
        );
      } else {
        const healAmount = Math.floor(this.player.state.maxHp * BOSS_KILL_HEAL_PCT);
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healAmount);
        this.damageNumbers.show(
          this.player.state.x, this.player.state.y - 40,
          healAmount, '#ff4444',
        );
      }
      this.cameraManager.shake(300, 0.015);
    }
  }

  private handleReroll(): void {
    const cost = this.getRerollCost();
    if (this.player.state.gold < cost) return;
    this.player.state.gold -= cost;
    this.rerollCount++;

    let options: LevelUpOption[];
    if (this.player.state.level > MAX_LEVEL) {
      options = generatePostMaxOptions(this.player.state.level);
    } else {
      options = generateLevelUpOptions(
        this.player.state.weapons,
        this.player.state.effects,
        () => this.rng.next(),
      );
    }
    if (options.length === 0) return;
    this.currentLevelUpOptions = options;

    // Restart the LevelUp scene in-place (stop+launch in same frame is unreliable)
    const levelUp = this.scene.get('LevelUp');
    levelUp.scene.restart({
      options,
      gold: this.player.state.gold,
      rerollCost: this.getRerollCost(),
    });
  }

  private checkEnemyPlayerCollision(now: number): void {
    const enemies = this.enemyPool.getActive();
    const px = this.player.state.x;
    const py = this.player.state.y;
    const pr = PLAYER_SIZE / 2;

    for (const enemy of enemies) {
      if (!enemy.state.alive) continue;
      if (circlesOverlap(px, py, pr, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
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
    this.currentLevelUpOptions = options;

    this.scene.pause();
    this.scene.launch('LevelUp', {
      options,
      gold: this.player.state.gold,
      rerollCost: this.getRerollCost(),
    });
  }

  private getRerollCost(): number {
    return Math.floor(GOLD_REROLL_BASE_COST * Math.pow(GOLD_REROLL_COST_MULTIPLIER, this.rerollCount));
  }

  private handleLevelUpChoice(index: number): void {
    const options = this.currentLevelUpOptions;
    if (!options || index >= options.length) return;

    applyLevelUpChoice(this.player.state, options[index]);

    // Process next pending level up or resume game
    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.scene.resume();
    }
  }

  /** Scatter heal gems around the map, offscreen, based on luck */
  private scatterHealthGems(): void {
    const luckValue = this.player.getEffectValue(EffectType.Luck);
    // Base 3 gems, +2 per luck level, capped at 20
    const count = Math.min(SCATTER_MAX_COUNT, SCATTER_BASE_COUNT + Math.floor(luckValue * (SCATTER_LUCK_BONUS / 0.15)));

    const cam = this.cameras.main;
    const viewHalfW = cam.worldView.width / 2;
    const viewHalfH = cam.worldView.height / 2;
    const px = this.player.state.x;
    const py = this.player.state.y;

    for (let i = 0; i < count; i++) {
      // Pick random angle and distance that's offscreen but not too far
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = this.rng.next() * Math.PI * 2;
        const maxDist = 2800 * (1 - luckValue * 0.6);
        const dist = 200 + this.rng.next() * maxDist;
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

  /** Spawn a boss monster (random type, 4x size, 10x HP — luck reduces HP) */
  private spawnBoss(luckValue: number): void {
    const progress = this.gameTimeMs / GAME_DURATION_MS;
    const availableTypes = ENEMY_DEFS.filter(d => progress >= d.unlockAt);
    if (availableTypes.length === 0) return;

    const type = availableTypes[Math.floor(this.rng.next() * availableTypes.length)].type;
    const angle = this.rng.next() * Math.PI * 2;
    const dist = BOSS_SPAWN_DISTANCE;
    const bx = this.player.state.x + Math.cos(angle) * dist;
    const by = this.player.state.y + Math.sin(angle) * dist;

    const boss = this.enemyPool.spawn(type, bx, by, this.gameTimeMs, true);
    if (boss && luckValue > 0) {
      const hpReduction = 1 - luckValue * 0.5;
      boss.state.hp = Math.max(1, Math.floor(boss.state.hp * hpReduction));
      boss.state.maxHp = boss.state.hp;
    }
    this.cameraManager.shake(200, 0.008);
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
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    if (this.visibilityHandler) {
      window.removeEventListener('blur', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.weaponSystem?.destroy();
    this.enemyPool?.destroy();
    this.xpGemPool?.destroy();
    this.damageNumbers?.destroy();
    this.mapRenderer?.destroy();
    this.events.off('enemy-killed');
    this.events.off('levelup-choice');
    this.events.off('levelup-reroll');
  }
}
