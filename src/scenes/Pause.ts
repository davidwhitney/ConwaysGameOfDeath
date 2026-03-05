import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { onResizeRestart } from '../ui/resizeHandler';

export class PauseScene extends Phaser.Scene {
  private menuNav!: MenuNav;

  constructor() {
    super({ key: 'Pause' });
  }

  create(): void {
    this.scene.bringToTop();
    const { width, height } = applyUIZoom(this);

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.add.text(width / 2, height * 0.3, 'PAUSED',
      monoStyle('48px', '#ffffff', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.5, width: 200, height: 45, label: 'RESUME', fontSize: '20px', textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488, action: () => this.resume() },
      { x: width / 2, y: height * 0.62, width: 200, height: 45, label: 'SETTINGS', fontSize: '16px', textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.openSettings() },
      { x: width / 2, y: height * 0.74, width: 200, height: 45, label: 'QUIT', fontSize: '20px', textColor: '#ff8888', fillColor: 0x443333, hoverColor: 0x664444, action: () => this.quit() },
    ], () => this.resume());

    this.input.keyboard!.on('keydown-ESC', () => this.resume());

    onResizeRestart(this);

    this.events.once('shutdown', () => {
      this.input.keyboard!.removeAllListeners();
    });
  }

  update(_time: number): void {
    this.menuNav.update(_time);
  }

  private resume(): void {
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.scene.stop();
    } else {
      this.quit();
    }
  }

  private openSettings(): void {
    this.scene.start('Settings', { returnTo: 'Pause' });
  }

  private quit(): void {
    this.scene.stop('Game');
    this.scene.stop('HUD');
    this.scene.start('MainMenu');
  }
}
