import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Pause' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.add.text(width / 2, height * 0.3, 'PAUSED', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Resume button
    const resumeBtn = this.add.rectangle(width / 2, height * 0.5, 200, 45, 0x333366)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => resumeBtn.setFillStyle(0x444488))
      .on('pointerout', () => resumeBtn.setFillStyle(0x333366))
      .on('pointerdown', () => this.resume());

    this.add.text(width / 2, height * 0.5, 'RESUME', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Quit button
    const quitBtn = this.add.rectangle(width / 2, height * 0.62, 200, 45, 0x443333)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => quitBtn.setFillStyle(0x664444))
      .on('pointerout', () => quitBtn.setFillStyle(0x443333))
      .on('pointerdown', () => this.quit());

    this.add.text(width / 2, height * 0.62, 'QUIT', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ff8888',
    }).setOrigin(0.5);

    // ESC to resume
    this.input.keyboard!.on('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    this.scene.resume('Game');
    this.scene.stop();
  }

  private quit(): void {
    this.scene.stop('Game');
    this.scene.stop('HUD');
    this.scene.start('MainMenu');
  }
}
