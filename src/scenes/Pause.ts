import Phaser from 'phaser';
import { monoStyle, BTN_PRIMARY, BTN_SECONDARY, BTN_WARNING } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';
import { GameEvents } from '../systems/GameEvents';
import { LofiMusicSystem } from '../systems/audio/LofiMusicSystem';
import { clearSnapshot } from '../ui/saveData';
import type { GameScene } from './Game';

export class PauseScene extends Phaser.Scene {
  private menuNav!: MenuNav;

  constructor() {
    super({ key: 'Pause' });
  }

  create(): void {
    const { width, height } = setupMenuScene(this, { bringToTop: true, crt: false });

    LofiMusicSystem.instance.pause();

    // Auto-save on pause
    const gameScene = this.scene.get('Game') as GameScene;
    gameScene.saveGame();

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.add.text(width / 2, height * 0.3, 'PAUSED',
      monoStyle('48px', '#ffffff', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.44, width: 200, height: 45, label: 'RESUME', fontSize: '20px', ...BTN_PRIMARY, action: () => this.resume() },
      { x: width / 2, y: height * 0.55, width: 200, height: 45, label: 'SETTINGS', fontSize: '16px', ...BTN_SECONDARY, action: () => this.openSettings() },
      { x: width / 2, y: height * 0.66, width: 200, height: 45, label: 'SAVE & QUIT', fontSize: '16px', ...BTN_SECONDARY, action: () => this.saveAndQuit() },
      { x: width / 2, y: height * 0.77, width: 200, height: 45, label: 'QUIT', fontSize: '20px', ...BTN_WARNING, action: () => this.quit() },
    ], () => this.resume());

  }

  update(): void {
    this.menuNav.update();
  }

  private resume(): void {
    LofiMusicSystem.instance.unpause();
    if (this.scene.isPaused('Game')) {
      GameEvents.sfx('unpause');
      this.scene.resume('Game');
      this.scene.stop();
    } else {
      this.quit();
    }
  }

  private openSettings(): void {
    this.scene.start('Settings', { returnTo: 'Pause' });
  }

  private saveAndQuit(): void {
    LofiMusicSystem.instance.unpause();
    this.scene.stop('Game');
    this.scene.stop('HUD');
    this.scene.start('MainMenu');
  }

  private quit(): void {
    LofiMusicSystem.instance.unpause();
    clearSnapshot();
    this.scene.stop('Game');
    this.scene.stop('HUD');
    this.scene.start('MainMenu');
  }
}
