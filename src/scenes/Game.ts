import Phaser from 'phaser';
import { WeaponType, type TileMap } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, GAME_DURATION_MS, ENEMY_MAX_ACTIVE, PLAYER_SIZE } from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import { generateMap } from '../systems/map-generator';
import { Player } from '../entities/Player';
import { WeaponSystem } from '../systems/WeaponSystem';
import { DamageNumbersUiComponent } from '../ui/DamageNumbersUiComponent';
import { BossSpawnSystem } from '../systems/BossSpawnSystem';
import { EndgameSystem } from '../systems/EndgameSystem';
import { LootSystem } from '../systems/LootSystem';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { PlayerPhysicsSystem } from '../systems/PlayerPhysicsSystem';
import { GameWorldSystem } from '../systems/GameWorldSystem';
import type { UpdateContext } from '../systems/UpdateContext';
import type { HUDScene } from './HUD';
import { applyCRT } from '../ui/crtEffect';
import type { GameSystem } from '../systems/GameSystem';
import { GameEvents } from '../systems/GameEvents';
import { LofiMusicSystem, STYLE_NAMES } from '../systems/audio/LofiMusicSystem';
import { loadSettings, loadPerks } from '../ui/saveData';
import { DangerOverlaySystem } from '../systems/DangerOverlaySystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { applyDebugProgression } from '../systems/leveling';
import { AchievementSystem } from '../systems/AchievementSystem';
import { buildGameConfig, applyDebugConfig, type GameConfig } from '../perks';

interface GameInitData {
  seed: number;
  endless?: boolean;
  debugLevel?: number;
  debugTimeMinutes?: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private damageNumbersUi!: DamageNumbersUiComponent;

  private subsystems: GameSystem[] = [];

  private seed: number = 0;
  private endless: boolean = false;
  private rng!: SeededRandom;
  private map!: TileMap;
  private gameTimeMs: number = 0;
  private gameOver: boolean = false;
  private hudScene!: HUDScene;
  private visibilityHandler: (() => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private gameWorldSystem!: GameWorldSystem;
  private lootSystem!: LootSystem;
  private achievementSystem!: AchievementSystem;
  private reviveCount: number = 0;
  private awaitingRevive: boolean = false;
  private debugLevel: number = 0;
  private debugTimeMinutes: number = 0;
  private deathDelayMs: number = 0;
  private gameConfig!: GameConfig;
  private exitGatePos: { x: number; y: number } | null = null;
  private exitGateGfx: Phaser.GameObjects.Graphics | null = null;
  private exitGateAngle: number = 0;

  public constructor() {
    super({ key: 'Game' });
  }

  public init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.endless = data.endless ?? false;
    this.debugLevel = data.debugLevel ?? 0;
    this.debugTimeMinutes = data.debugTimeMinutes ?? 0;
    this.gameTimeMs = 0;
    this.gameOver = false;
    this.reviveCount = 0;
    this.awaitingRevive = false;
    this.exitGatePos = null;
  }

  public create(): void {
    applyCRT(this);
    this.rng = new SeededRandom(this.seed);
    this.map = generateMap(this.seed);
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    // Build game config from perks
    const perks = loadPerks();
    this.gameConfig = buildGameConfig(perks, () => this.rng.next());
    if (this.debugLevel > 0) {
      applyDebugConfig(this.gameConfig, this.debugLevel);
    }
    const cfg = this.gameConfig;

    this.player = new Player(this, centerX, centerY);

    // Apply perk config to player
    this.player.state.hp = cfg.startingHp;
    this.player.state.maxHp = cfg.startingHp;
    this.player.state.speed = cfg.startingSpeed * cfg.playerSpeedMult;
    this.player.state.gold = cfg.startingGold;
    this.player.setBaseMaxHp(cfg.startingHp);
    this.player.setPerkRegen(cfg.hpRegen);
    this.player.setPerkArmor(cfg.armor);
    this.player.setPerkWeaponDmgMult(cfg.weaponDmgMult);
    this.player.setPerkXpMult(cfg.xpMult);
    this.player.setPerkGoldMult(cfg.goldMult);
    this.player.setPerkPickupRange(cfg.pickupRange);
    this.player.setPerkCooldownMult(cfg.weaponCooldownMult);

    // Starting weapon from config
    this.player.state.weapons.push({
      type: cfg.startingWeapon,
      level: cfg.startingWeaponLevel,
      cooldownTimer: 0,
    });

    if (this.debugLevel > 1) {
      applyDebugProgression(this.player.state, () => this.rng.next(), this.debugLevel);
      this.gameTimeMs = this.debugTimeMinutes * 60 * 1000;
    }

    this.gameWorldSystem = new GameWorldSystem(this, this.rng, this.map, this.gameTimeMs);
    const enemyPool = this.gameWorldSystem.getEnemyPool();
    enemyPool.perkHpMult = cfg.enemyHpMult;
    enemyPool.perkDmgMult = cfg.enemyDmgMult;
    enemyPool.perkXpMult = cfg.enemyXpMult;
    const playerPhysics = new PlayerPhysicsSystem(this);
    this.lootSystem = new LootSystem(this, this.player, enemyPool);
    this.achievementSystem = new AchievementSystem(this, this.player);

    this.subsystems = [
      new ParallaxSystem(this),
      playerPhysics,
      this.gameWorldSystem,
      new BossSpawnSystem(this, this.rng),
      new EndgameSystem(this, this.rng, !this.endless),
      new WeaponSystem(this, enemyPool, this.lootSystem),
      this.lootSystem,
      new LevelUpSystem(this, this.rng, this.player),
      new DangerOverlaySystem(this),
      this.achievementSystem,
    ];

    playerPhysics.setDeathMaskConsumer(() => this.lootSystem.consumeMask());

    if (this.debugLevel > 1) {
      this.lootSystem.addDeathMasks(1);
    }

    // Events
    GameEvents.on(this.events, 'show-damage', (x, y, amount, color, crit) => this.damageNumbersUi.show(x, y, amount, color, crit));
    GameEvents.on(this.events, 'screen-shake', (duration, intensity) => this.gameWorldSystem.cameraShake(duration, intensity));
    GameEvents.on(this.events, 'blood-aura-heal', (heal) => {
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + heal);
    });
    GameEvents.on(this.events, 'revive-accept', () => this.handleReviveAccept());
    GameEvents.on(this.events, 'revive-decline', () => this.handleReviveDecline());
    GameEvents.on(this.events, 'exit-gate-spawned', (pos) => this.spawnExitGate(pos));
    GameEvents.on(this.events, 'extracted', () => this.handleExtraction());

    // UI Events
    this.visibilityHandler = () => {
      if (!this.gameOver && !this.scene.isPaused()) {
        GameEvents.pauseGame(this.scene, false);
      }
    };
    this.visibilityChangeHandler = () => { if (document.hidden) this.visibilityHandler!(); };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('blur', this.visibilityHandler);
    this.events.once('shutdown', () => this.shutdown());

    // Switch music style for gameplay
    const musicSetting = loadSettings().musicStyle;
    const gameStyle = musicSetting === 'random'
      ? STYLE_NAMES[Math.floor(Math.random() * STYLE_NAMES.length)]
      : musicSetting;
    LofiMusicSystem.instance.setStyle(gameStyle);

    // Start HUD
    this.scene.launch('HUD', { seed: this.seed });
    this.hudScene = this.scene.get('HUD') as HUDScene;
    this.damageNumbersUi = new DamageNumbersUiComponent(this);

    GameEvents.sfx('game-start');
  }

  public update(time: number, delta: number): void {
    if (this.gameOver) {
      return;
    }

    // Apply game speed multiplier to delta
    const speedDelta = delta * this.gameConfig.gameSpeedMult;
    this.gameTimeMs += speedDelta;

    const ctx: UpdateContext = {
      time: { delta: speedDelta / 1000, deltaMs: speedDelta, now: time, elapsed: this.gameTimeMs },
      player: this.player,
      enemyPool: this.gameWorldSystem.getEnemyPool(),
      map: this.map,
      config: this.gameConfig,
    };

    for (const system of this.subsystems) {
      system.update(ctx);
    }

    this.damageNumbersUi.update(ctx);
    this.updateExitGate(speedDelta / 1000);

    this.hudScene.updateHUD?.(
      this.player.state,
      this.gameTimeMs,
      this.lootSystem.getKills(),
      this.gameWorldSystem.getActiveEnemyCount(),
      this.lootSystem.getDeathMasksHeld(),
      this.exitGatePos,
    );

    GameEvents.intensity(
      Math.min(1, 0.35 + 0.65 * this.gameWorldSystem.getActiveEnemyCount() / ENEMY_MAX_ACTIVE),
    );

    this.processDeath(delta);
  }

  private processDeath(delta: number): void {
    if (!this.player.state.alive && !this.awaitingRevive) {
      this.awaitingRevive = true;
      this.deathDelayMs = 1000;
    }

    if (this.deathDelayMs > 0) {
      this.deathDelayMs -= delta;
      if (this.deathDelayMs <= 0) {
        this.scene.pause();
        this.scene.launch('Revive', {
          gold: this.player.state.gold,
          cost: this.getReviveCost(),
        });
      }
    }
  }

  private getReviveCost(): number {
    return 100 * Math.pow(2, this.reviveCount);
  }

  private handleReviveAccept(): void {
    GameEvents.sfx('revive');
    this.player.state.gold -= this.getReviveCost();
    this.player.state.hp = Math.ceil(this.player.state.maxHp * 0.75);
    this.player.state.alive = true;
    this.player.state.invincibleUntil = performance.now() + 4000;
    this.reviveCount++;
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.scene.resume();
  }

  private handleReviveDecline(): void {
    GameEvents.sfx('revive-decline');
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.endGame(this.gameTimeMs >= GAME_DURATION_MS);
  }

  private endGame(victory: boolean, extracted: boolean = false): void {
    this.gameOver = true;

    // Final achievement evaluation before leaving
    const ctx: UpdateContext = {
      time: { delta: 0, deltaMs: 0, now: performance.now(), elapsed: this.gameTimeMs },
      player: this.player,
      enemyPool: this.gameWorldSystem.getEnemyPool(),
      map: this.map,
      config: this.gameConfig,
    };
    this.achievementSystem.evaluate(ctx);
    this.achievementSystem.flushStats(this.gameTimeMs, victory, extracted);

    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.stop('Revive');
    this.scene.start('GameOver', {
      victory,
      extracted,
      kills: this.lootSystem.getKills(),
      level: this.player.state.level,
      time: this.gameTimeMs,
      seed: this.seed,
    });
  }

  private spawnExitGate(pos: { x: number; y: number }): void {
    this.exitGatePos = pos;
    this.exitGateGfx = this.add.graphics().setDepth(20);
    GameEvents.emit(this.events, 'screen-shake', 600, 0.02);
  }

  private updateExitGate(dt: number): void {
    if (!this.exitGatePos || !this.exitGateGfx) return;

    this.exitGateAngle += dt * 2;
    const { x, y } = this.exitGatePos;
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
    const dx = this.player.state.x - x;
    const dy = this.player.state.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius + PLAYER_SIZE / 2) {
      GameEvents.emit(this.events, 'extracted');
    }
  }

  private handleExtraction(): void {
    if (this.gameOver) return;
    GameEvents.emit(this.events, 'achievement', 'extracted');
    GameEvents.sfx('game-start'); // reuse a triumphant sound
    this.endGame(true, true);
  }

  private shutdown(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    if (this.visibilityHandler) {
      window.removeEventListener('blur', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    for (const system of this.subsystems) {
      system.destroy?.();
    }
    this.damageNumbersUi?.destroy();
    this.events.off('show-damage');
    this.events.off('screen-shake');
    this.events.off('blood-aura-heal');
    this.events.off('revive-accept');
    this.events.off('revive-decline');
    this.events.off('exit-gate-spawned');
    this.events.off('extracted');
    this.exitGateGfx?.destroy();
  }
}
