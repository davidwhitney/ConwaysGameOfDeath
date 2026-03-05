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
import { GameEvents } from '../systems/GameEvents';

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
  private gameWorldSystem!: GameWorldSystem;
  private lootSystem!: LootSystem;
  private reviveCount: number = 0;
  private awaitingRevive: boolean = false;

  public constructor() {
    super({ key: 'Game' });
  }

  public init(data: GameInitData): void {
    this.seed = data.seed || Date.now();
    this.endless = data.endless ?? false;
    this.gameTimeMs = 0;
    this.gameOver = false;
    this.reviveCount = 0;
    this.awaitingRevive = false;
  }

  public create(): void {
    applyCRT(this);
    this.rng = new SeededRandom(this.seed);
    this.map = generateMap(this.seed);
    const centerX = Math.floor(MAP_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(MAP_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    this.player = new Player(this, centerX, centerY);
    this.player.state.weapons.push({ type: WeaponType.Whip, level: 1, cooldownTimer: 0 });

    this.subsystems = [
      new PlayerPhysicsSystem(this),
      new GameWorldSystem(this, this.rng, this.map),
      new BossSpawnSystem(this, this.rng),
      new DeathSpawnSystem(this, this.rng, !this.endless),
      new WeaponSystem(this),
      new LootSystem(this, this.player),
      new LevelUpSystem(this, this.rng, this.player),
    ];

    this.gameWorldSystem = this.subsystems.find(s => s instanceof GameWorldSystem) as GameWorldSystem;
    this.lootSystem = this.subsystems.find(s => s instanceof LootSystem) as LootSystem;

    // Events
    GameEvents.on(this.events, 'show-damage', (x, y, amount, color, crit) => this.damageNumbersUi.show(x, y, amount, color, crit));
    GameEvents.on(this.events, 'screen-shake', (duration, intensity) => this.gameWorldSystem.cameraShake(duration, intensity));
    GameEvents.on(this.events, 'blood-aura-heal', (heal) => {
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + heal);
    });
    GameEvents.on(this.events, 'revive-accept', () => this.handleReviveAccept());
    GameEvents.on(this.events, 'revive-decline', () => this.handleReviveDecline());

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

    const ctx: UpdateContext = {
      time: { delta: delta / 1000, deltaMs: delta, now: time, elapsed: this.gameTimeMs },
      player: this.player,
      enemyPool: this.gameWorldSystem.getEnemyPool(),
      map: this.map,
    };

    for (const system of this.subsystems) {
      system.update(ctx);
    }

    this.damageNumbersUi.update(ctx);
    this.hudScene.updateHUD?.(
      this.player.state,
      this.gameTimeMs,
      this.lootSystem.getKills(),
      this.gameWorldSystem.getActiveEnemyCount(),
    );

    if (!this.player.state.alive && !this.awaitingRevive) {
      if (this.gameTimeMs >= GAME_DURATION_MS) {
        this.endGame(true);
      } else {
        this.awaitingRevive = true;
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
    this.player.state.gold -= this.getReviveCost();
    this.player.state.hp = Math.ceil(this.player.state.maxHp * 0.75);
    this.player.state.alive = true;
    this.player.state.invincibleUntil = this.gameTimeMs + 4000;
    this.reviveCount++;
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.scene.resume();
  }

  private handleReviveDecline(): void {
    this.awaitingRevive = false;
    this.scene.stop('Revive');
    this.endGame(false);
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.scene.stop('HUD');
    this.scene.stop('LevelUp');
    this.scene.stop('Pause');
    this.scene.stop('Revive');
    this.scene.start('GameOver', {
      victory,
      kills: this.lootSystem.getKills(),
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
    this.events.off('revive-accept');
    this.events.off('revive-decline');
  }
}
