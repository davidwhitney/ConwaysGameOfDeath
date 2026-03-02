import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    // Title
    this.add.text(width / 2, height * 0.25, "CONWAY'S GAME\nOF DEATH", {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40, 'Survive the Automaton', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Play button
    const playBtn = this.add.rectangle(width / 2, height * 0.58, 220, 50, 0x333366)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playBtn.setFillStyle(0x444488))
      .on('pointerout', () => playBtn.setFillStyle(0x333366))
      .on('pointerdown', () => this.startGame());

    this.add.text(width / 2, height * 0.58, 'PLAY', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Controls hint
    this.add.text(width / 2, height * 0.88, 'WASD / Arrows to move  |  ESC to pause', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    // Press Enter to start
    this.input.keyboard!.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard!.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start('Game', { seed: Date.now() });
  }
}
