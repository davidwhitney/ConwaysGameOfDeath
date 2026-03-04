import Phaser from 'phaser';
import {
  generateMap,
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  GAME_DURATION_MS, WeaponType,
  SeededRandom, type TileMap,
} from '../shared';
import { Player } from '../entities/Player';
import { WeaponSystem } from '../systems/WeaponSystem';
import { DamageNumbersUiComponent } from '../ui/DamageNumbersUiComponent';
import { BossSpawnSystem } from '../systems/BossSpawnSystem';
import { DeathSpawnSystem } from '../systems/DeathSpawnSystem';
import { LootSystem } from '../systems/LootSystem';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { PlayerPhysicsSystem } from '../systems/PlayerPhysicsSystem';
import { GameWorldSystem } from '../systems/GameWorldSystem';
import type { UpdateContext } from '../systems/UpdateContext';
import type { HUDScene } from './HUD';
import { applyCRT } from '../ui/crtEffect';
import { GameSystem } from '../systems/GameSystem';

interface GameInitData {
  seed: number;
  endless?: boolean;
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

  public constructor() {
    super({ key: 'Game' });
  }

  public init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.endless = data.endless ?? false;
    this.gameTimeMs = 0;
    this.gameOver = false;
  }

  public create(): void {
    applyCRT(this);
    this.rng = new SeededRandom(this.seed);
    this.map = generateMap(this.seed);
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    this.player = new Player(this, centerX, centerY);
    this.player.state.weapons.push({ type: WeaponType.Whip, level: 1, cooldownTimer: 0 });

    const deathSpawnSystem = new DeathSpawnSystem(this, this.rng);
    deathSpawnSystem.setEnabled(!this.endless);

    this.subsystems = [
      new PlayerPhysicsSystem(this),
      new GameWorldSystem(this, this.rng, this.map),
      new BossSpawnSystem(this, this.rng),
      deathSpawnSystem,
      new WeaponSystem(this),
      new LootSystem(this, this.player),
      new LevelUpSystem(this, this.rng, this.player),
    ];

    // Events
    this.events.on('show-damage', (x: number, y: number, amount: number, color?: string, crit?: boolean) => {
      this.damageNumbersUi.show(x, y, amount, color, crit);
    });

    this.events.on('screen-shake', (duration: number, intensity: number) => {
      this.subsystems.filter(s => s instanceof GameWorldSystem)[0].cameraShake(duration, intensity);
    });

    this.events.on('blood-aura-heal', (heal: number) => {
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + heal);
    });

    // UI Events
    this.visibilityHandler = () => {
      if (!this.gameOver && !this.scene.isPaused()) {
        this.scene.pause();
        this.scene.launch('Pause');
      }
    };
    this.visibilityChangeHandler = () => { if (document.hidden) this.visibilityHandler!(); };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('blur', this.visibilityHandler);
    this.events.once('shutdown', () => this.shutdown());

    // Start HUD
    this.scene.launch('HUD', { seed: this.seed });
    this.hudScene = this.scene.get('HUD') as HUDScene;
    this.damageNumbersUi = new DamageNumbersUiComponent(this);
  }

  public update(time: number, delta: number): void {
    if (this.gameOver) {
      return;
    }

    this.gameTimeMs += delta;
    const gameWorldSystem = this.subsystems.filter(s => s instanceof GameWorldSystem)[0] as GameWorldSystem;
    const lootSystem = this.subsystems.filter(s => s instanceof LootSystem)[0] as LootSystem;

    const ctx: UpdateContext = {
      time: { delta: delta / 1000, deltaMs: delta, now: time, elapsed: this.gameTimeMs },
      player: this.player,
      enemyPool: gameWorldSystem.getEnemyPool(),
      map: this.map,
    };

    for (const system of this.subsystems) {
      system.update(ctx);
    }

    this.damageNumbersUi.update(ctx);
    this.hudScene.updateHUD?.(
      this.player.state,
      this.gameTimeMs,
      lootSystem.getKills(),
      gameWorldSystem.getActiveEnemyCount(),
    );

    if (!this.player.state.alive) {
      this.endGame(this.gameTimeMs >= GAME_DURATION_MS);
    }
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.start('GameOver', {
      victory,
      kills: this.subsystems.filter(s => s instanceof LootSystem)[0].getKills(),
      level: this.player.state.level,
      time: this.gameTimeMs,
      seed: this.seed,
    });
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
      system.destroy();
    }
    this.damageNumbersUi?.destroy();
    this.events.off('show-damage');
    this.events.off('screen-shake');
    this.events.off('blood-aura-heal');
  }
}
