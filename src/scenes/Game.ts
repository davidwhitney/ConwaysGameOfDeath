import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, GAME_DURATION_MS, ENEMY_MAX_ACTIVE } from '../constants';
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
import { EnemyPool } from '../systems/EnemyPool';
import { GameState } from '../systems/GameState';
import type { HUDScene } from './HUD';
import { applyCRT } from '../ui/crtEffect';
import type { GameSystem } from '../systems/GameSystem';
import { GameEvents } from '../systems/GameEvents';
import { LofiMusicSystem, STYLE_NAMES } from '../systems/audio/LofiMusicSystem';
import { loadSettings, loadPerks, saveSnapshot, clearSnapshot } from '../ui/saveData';
import { DangerOverlaySystem } from '../systems/DangerOverlaySystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { applyDebugProgression } from '../systems/leveling';
import { AchievementSystem } from '../systems/AchievementSystem';
import { buildGameConfig, applyDebugConfig } from '../perks';
import { type GameSnapshot, packMap, unpackMap } from '../systems/snapshot';

interface GameInitData {
  seed: number;
  endless?: boolean;
  debugLevel?: number;
  debugTimeMinutes?: number;
  snapshot?: GameSnapshot;
}

export class GameScene extends Phaser.Scene {
  private damageNumbersUi!: DamageNumbersUiComponent;

  private subsystems: GameSystem[] = [];

  private seed: number = 0;
  private endless: boolean = false;
  private rng!: SeededRandom;
  private state!: GameState;
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
  private pendingSnapshot: GameSnapshot | null = null;

  public constructor() {
    super({ key: 'Game' });
  }

  public init(data: GameInitData): void {
    this.pendingSnapshot = data.snapshot ?? null;
    this.seed = this.pendingSnapshot?.seed ?? data.seed ?? Date.now();
    this.endless = this.pendingSnapshot?.endless ?? data.endless ?? false;
    this.debugLevel = data.debugLevel ?? 0;
    this.debugTimeMinutes = data.debugTimeMinutes ?? 0;
    this.gameOver = false;
    this.reviveCount = 0;
    this.awaitingRevive = false;
  }

  public create(): void {
    applyCRT(this);

    this.rng = new SeededRandom(this.seed);
    const map = generateMap(this.seed);
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    // Build game config from perks
    const perks = loadPerks();
    const gameConfig = buildGameConfig(perks, () => this.rng.next());
    if (this.debugLevel > 0) {
      applyDebugConfig(gameConfig, this.debugLevel);
    }
    const cfg = gameConfig;

    const player = new Player(this, centerX, centerY);
    player.applyConfig(cfg);

    // Starting weapon from config
    player.state.weapons.push({
      type: cfg.startingWeapon,
      level: cfg.startingWeaponLevel,
      cooldownTimer: 0,
    });

    const initialElapsed = this.debugLevel > 1 ? this.debugTimeMinutes * 60 * 1000 : 0;
    if (this.debugLevel > 1) {
      applyDebugProgression(player.state, () => this.rng.next(), this.debugLevel);
    }

    const enemyPool = new EnemyPool(this, map);
    enemyPool.perkHpMult = cfg.enemyHpMult;
    enemyPool.perkDmgMult = cfg.enemyDmgMult;
    enemyPool.perkXpMult = cfg.enemyXpMult;

    this.state = new GameState(player, enemyPool, map, cfg, initialElapsed);

    this.gameWorldSystem = new GameWorldSystem(this, this.rng, this.state);
    const playerPhysics = new PlayerPhysicsSystem(this);
    this.lootSystem = new LootSystem(this, this.state);
    this.achievementSystem = new AchievementSystem(this, this.state);

    this.subsystems = [
      new ParallaxSystem(this),
      playerPhysics,
      this.gameWorldSystem,
      new BossSpawnSystem(this, this.rng),
      new EndgameSystem(this, this.rng, !this.endless),
      new WeaponSystem(this),
      this.lootSystem,
      new LevelUpSystem(this, this.rng, this.state),
      new DangerOverlaySystem(this),
      this.achievementSystem,
    ];

    playerPhysics.setDeathMaskConsumer(() => this.lootSystem.consumeMask());

    if (this.debugLevel > 1) {
      this.state.deathMasksHeld = 1;
    }

    // Apply snapshot if resuming a saved game
    if (this.pendingSnapshot) {
      this.restoreSnapshot(this.pendingSnapshot);
      this.pendingSnapshot = null;
    }

    // Events
    GameEvents.on(this.events, 'damage-dealt', (x, y, amount, color, crit) => this.damageNumbersUi.show(x, y, amount, color, crit));
    GameEvents.on(this.events, 'player-healed', (heal) => {
      this.state.player.state.hp = Math.min(this.state.player.state.maxHp, this.state.player.state.hp + heal);
    });
    GameEvents.on(this.events, 'revive-accepted', () => this.handleReviveAccept());
    GameEvents.on(this.events, 'revive-declined', () => this.handleReviveDecline());
    GameEvents.on(this.events, 'player-extracted', () => this.handleExtraction());

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

    const speedDelta = delta * this.state.config.gameSpeedMult;
    this.state.tick(time, speedDelta);

    for (const system of this.subsystems) {
      system.update(this.state);
    }

    this.damageNumbersUi.update(this.state);

    this.hudScene.updateHUD?.(
      this.state.player.state,
      this.state.time.elapsed,
      this.state.kills,
      this.state.enemyPool.activeCount,
      this.state.deathMasksHeld,
      this.gameWorldSystem.exitGatePos,
    );

    GameEvents.intensity(
      Math.min(1, 0.35 + 0.65 * this.state.enemyPool.activeCount / ENEMY_MAX_ACTIVE),
    );

    this.processDeath(delta);
  }

  /** Overwrite freshly-created game state with a saved snapshot. */
  private restoreSnapshot(snap: GameSnapshot): void {
    this.reviveCount = snap.reviveCount;
    this.rng.setState(snap.rngState);

    this.state.map.set(unpackMap(snap.map));
    this.state.time.elapsed = snap.elapsed;
    this.state.kills = snap.kills;
    this.state.deathMasksHeld = snap.deathMasksHeld;

    this.state.player.restoreState(snap.player, snap.baseMaxHp);
    this.state.enemyPool.restoreActive(snap.enemies);
    this.lootSystem.restoreGems(snap.gems);

    clearSnapshot();
  }

  /** Create a snapshot of the current game state for saving. */
  createSnapshot(): GameSnapshot {
    return {
      version: 1,
      timestamp: Date.now(),
      seed: this.seed,
      endless: this.endless,
      elapsed: this.state.time.elapsed,
      kills: this.state.kills,
      deathMasksHeld: this.state.deathMasksHeld,
      player: { ...this.state.player.state },
      baseMaxHp: this.state.player.getBaseMaxHp(),
      map: packMap(this.state.map),
      enemies: this.state.enemyPool.serializeActive(),
      gems: this.lootSystem.serializeGems(),
      rngState: this.rng.getSeed(),
      reviveCount: this.reviveCount,
    };
  }

  /** Save current game state to localStorage. */
  saveGame(): void {
    if (this.gameOver) return;
    try {
      saveSnapshot(this.createSnapshot());
    } catch {
      // Serialization or storage failure — don't crash
    }
  }

  private processDeath(delta: number): void {
    if (!this.state.player.state.alive && !this.awaitingRevive) {
      this.awaitingRevive = true;
      this.deathDelayMs = 1000;
    }

    if (this.deathDelayMs > 0) {
      this.deathDelayMs -= delta;
      if (this.deathDelayMs <= 0) {
        this.scene.pause();
        this.scene.launch('Revive', {
          gold: this.state.player.state.gold,
          cost: this.reviveCost,
        });
      }
    }
  }

  private get reviveCost(): number {
    return 100 * Math.pow(2, this.reviveCount);
  }

  private handleReviveAccept(): void {
    GameEvents.sfx('revive');
    const ps = this.state.player.state;
    ps.gold -= this.reviveCost;
    ps.hp = Math.ceil(ps.maxHp * 0.75);
    ps.alive = true;
    ps.invincibleUntil = performance.now() + 4000;
    this.reviveCount++;
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.scene.resume();
  }

  private handleReviveDecline(): void {
    GameEvents.sfx('revive-decline');
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.endGame(this.state.time.elapsed >= GAME_DURATION_MS);
  }

  private endGame(victory: boolean, extracted: boolean = false): void {
    this.gameOver = true;
    clearSnapshot();

    // Final achievement evaluation
    this.achievementSystem.evaluate(this.state);
    this.achievementSystem.flushStats(this.state.time.elapsed, victory, extracted);

    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.stop('Revive');
    this.scene.start('GameOver', {
      victory,
      extracted,
      kills: this.state.kills,
      level: this.state.player.state.level,
      time: this.state.time.elapsed,
      seed: this.seed,
    });
  }

  private handleExtraction(): void {
    if (this.gameOver) return;
    GameEvents.emit(this.events, 'achievement-unlocked', 'extracted');
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
    this.events.off('damage-dealt');
    this.events.off('player-healed');
    this.events.off('revive-accepted');
    this.events.off('revive-declined');
    this.events.off('player-extracted');
  }
}
