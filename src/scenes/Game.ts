import Phaser from 'phaser';
import { WeaponType, type TileMap } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, GAME_DURATION_MS, ENEMY_MAX_ACTIVE } from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import { generateMap } from '../systems/map-generator';
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
import { LofiMusicSystem, STYLE_NAMES } from '../systems/audio/LofiMusicSystem';
import { loadSettings } from '../ui/saveData';
import { DangerOverlaySystem } from '../systems/DangerOverlaySystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';

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
      new ParallaxSystem(this),
      new PlayerPhysicsSystem(this),
      new GameWorldSystem(this, this.rng, this.map),
      new BossSpawnSystem(this, this.rng),
      new DeathSpawnSystem(this, this.rng, !this.endless),
      new WeaponSystem(this),
      new LootSystem(this, this.player),
      new LevelUpSystem(this, this.rng, this.player),
      new DangerOverlaySystem(this),
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

    GameEvents.intensity(
      Math.min(1, 0.35 + 0.65 * this.gameWorldSystem.getActiveEnemyCount() / ENEMY_MAX_ACTIVE),
    );

    if (!this.player.state.alive && !this.awaitingRevive) {
      this.awaitingRevive = true;
      this.scene.pause();
      this.scene.launch('Revive', {
        gold: this.player.state.gold,
        cost: this.getReviveCost(),
      });
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
      system.destroy?.();
    }
    this.damageNumbersUi?.destroy();
    this.events.off('show-damage');
    this.events.off('screen-shake');
    this.events.off('blood-aura-heal');
    this.events.off('revive-accept');
    this.events.off('revive-decline');
  }
}
