import Phaser from 'phaser';
import {
  generateMap,
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  GAME_DURATION_MS, WeaponType,
  SeededRandom,
} from '../shared';
import { Player } from '../entities/Player';
import { InputManager } from '../systems/InputManager';
import { CameraManager } from '../systems/CameraManager';
import { MapRenderer } from '../systems/MapRenderer';
import { WeaponSystem } from '../systems/WeaponSystem';
import { DamageNumberSystem } from '../ui/DamageNumber';
import { BossSpawnSystem } from '../systems/BossSpawnSystem';
import { LootSystem } from '../systems/LootSystem';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { PlayerPhysicsSystem } from '../systems/PlayerPhysicsSystem';
import { GameWorldSystem } from '../systems/GameWorldSystem';
import type { HUDScene } from './HUD';
import { applyCRT } from '../ui/crtEffect';

interface GameInitData {
  seed: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cameraManager!: CameraManager;
  private weaponSystem!: WeaponSystem;
  private damageNumbers!: DamageNumberSystem;

  private playerPhysics!: PlayerPhysicsSystem;
  private gameWorldSystem!: GameWorldSystem;
  private bossSpawnSystem!: BossSpawnSystem;
  private lootSystem!: LootSystem;
  private levelUpSystem!: LevelUpSystem;

  private seed: number = 0;
  private rng!: SeededRandom;
  private gameTimeMs: number = 0;
  private gameOver: boolean = false;
  private hudScene!: HUDScene;
  private visibilityHandler: (() => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.gameTimeMs = 0;
    this.gameOver = false;
  }

  create(): void {
    applyCRT(this);
    this.rng = new SeededRandom(this.seed);
    const map = generateMap(this.seed);
    const mapRenderer = new MapRenderer(this, map);

    // Create player at center of map
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, centerX, centerY, map);

    // Give player a starting weapon
    this.player.state.weapons.push({
      type: WeaponType.Whip,
      level: 1,
      cooldownTimer: 0,
    });

    const inputManager = new InputManager(this);
    this.cameraManager = new CameraManager(this);
    this.cameraManager.follow(this.player.sprite);

    this.weaponSystem = new WeaponSystem(this);
    this.damageNumbers = new DamageNumberSystem(this);

    // Systems
    this.gameWorldSystem = new GameWorldSystem({
      scene: this, player: this.player, rng: this.rng, mapRenderer,
      cameraManager: this.cameraManager, map, spawnSeed: this.seed + 1,
    });

    const enemyPool = this.gameWorldSystem.getEnemyPool();
    const xpGemPool = this.gameWorldSystem.getXPGemPool();

    this.playerPhysics = new PlayerPhysicsSystem({
      scene: this, player: this.player, inputManager, enemyPool,
      cameraManager: this.cameraManager,
    });

    this.bossSpawnSystem = new BossSpawnSystem({
      player: this.player, rng: this.rng,
      enemyPool, cameraManager: this.cameraManager,
    });

    this.lootSystem = new LootSystem({
      scene: this, player: this.player,
      xpGemPool, cameraManager: this.cameraManager,
    });

    this.levelUpSystem = new LevelUpSystem({
      scene: this, player: this.player, rng: this.rng,
    });

    // HUD
    this.scene.launch('HUD', { seed: this.seed });
    this.hudScene = this.scene.get('HUD') as HUDScene;

    // Damage numbers — all systems emit 'show-damage' events
    this.events.on('show-damage', (x: number, y: number, amount: number, color?: string, crit?: boolean) => {
      this.damageNumbers.show(x, y, amount, color, crit);
    });

    // Blood aura heal event
    this.events.on('blood-aura-heal', (heal: number) => {
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + heal);
    });

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

    const dt = delta / 1000;
    this.gameTimeMs += delta;

    this.playerPhysics.update(dt, time);
    this.gameWorldSystem.update(delta);
    this.bossSpawnSystem.update(delta, this.gameTimeMs);
    this.weaponSystem.update(dt, this.player, this.gameWorldSystem.getEnemyPool());
    this.lootSystem.updatePickups(dt);
    this.levelUpSystem.accumulateLevelUps();

    if (this.levelUpSystem.hasPendingLevelUp() && !this.scene.isActive('LevelUp')) {
      this.levelUpSystem.processLevelUp();
    }

    this.damageNumbers.update(dt);
    this.updateHUD();

    if (!this.player.state.alive) {
      this.endGame(this.gameTimeMs >= GAME_DURATION_MS);
    }
  }

  private updateHUD(): void {
    this.hudScene.updateHUD?.(
      this.player.state,
      this.gameWorldSystem.getGameTimeMs(),
      this.lootSystem.getKills(),
      this.gameWorldSystem.getActiveEnemyCount(),
    );
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.start('GameOver', {
      victory,
      kills: this.lootSystem.getKills(),
      level: this.player.state.level,
      time: this.gameWorldSystem.getGameTimeMs(),
      seed: this.seed,
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
    this.damageNumbers?.destroy();
    this.playerPhysics?.destroy();
    this.gameWorldSystem?.destroy();
    this.lootSystem?.destroy();
    this.levelUpSystem?.destroy();
    this.bossSpawnSystem?.destroy();
    this.events.off('show-damage');
    this.events.off('blood-aura-heal');
  }
}
