import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';

interface GameOverData {
  victory: boolean;
  kills: number;
  level: number;
  time: number; // ms
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: GameOverData): void {
    const { width, height } = applyUIZoom(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Title
    const titleText = data.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = data.victory ? '#ffcc00' : '#ff4444';
    this.add.text(width / 2, height * 0.2, titleText, {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats
    const minutes = Math.floor(data.time / 60000);
    const seconds = Math.floor((data.time % 60000) / 1000);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const stats = [
      `Time Survived: ${timeStr}`,
      `Level Reached: ${data.level}`,
      `Enemies Killed: ${data.kills}`,
    ];

    stats.forEach((stat, i) => {
      this.add.text(width / 2, height * 0.4 + i * 30, stat, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#cccccc',
      }).setOrigin(0.5);
    });

    // Play again button
    const playBtn = this.add.rectangle(width / 2, height * 0.7, 220, 50, 0x333366)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playBtn.setFillStyle(0x444488))
      .on('pointerout', () => playBtn.setFillStyle(0x333366))
      .on('pointerdown', () => {
        this.scene.stop('HUD');
        this.scene.start('Game', { seed: Date.now() });
      });

    this.add.text(width / 2, height * 0.7, 'PLAY AGAIN', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Menu button
    const menuBtn = this.add.rectangle(width / 2, height * 0.82, 220, 45, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => menuBtn.setFillStyle(0x444466))
      .on('pointerout', () => menuBtn.setFillStyle(0x333344))
      .on('pointerdown', () => {
        this.scene.stop('HUD');
        this.scene.start('MainMenu');
      });

    this.add.text(width / 2, height * 0.82, 'MAIN MENU', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Enter/Space to play again
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.stop('HUD');
      this.scene.start('Game', { seed: Date.now() });
    });
  }
}
