import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { addScore, formatTime } from '../ui/highScores';

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

    // Save score
    const rank = addScore({
      kills: data.kills,
      level: data.level,
      time: data.time,
      victory: data.victory,
      date: Date.now(),
    });

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Title
    const titleText = data.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = data.victory ? '#ffcc00' : '#ff4444';
    this.add.text(width / 2, height * 0.15, titleText, {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats
    const timeStr = formatTime(data.time);
    const stats = [
      `Time Survived: ${timeStr}`,
      `Level Reached: ${data.level}`,
      `Enemies Killed: ${data.kills}`,
    ];

    stats.forEach((stat, i) => {
      this.add.text(width / 2, height * 0.3 + i * 28, stat, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#cccccc',
      }).setOrigin(0.5);
    });

    // Rank display
    const rankStr = rank > 0 ? `#${rank} High Score!` : '';
    const rankColor = rank === 1 ? '#ffcc00' : rank <= 3 ? '#ccaa44' : '#88aa88';
    if (rankStr) {
      this.add.text(width / 2, height * 0.3 + stats.length * 28 + 10, rankStr, {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: rankColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Play again button
    const playBtn = this.add.rectangle(width / 2, height * 0.62, 220, 50, 0x333366)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playBtn.setFillStyle(0x444488))
      .on('pointerout', () => playBtn.setFillStyle(0x333366))
      .on('pointerdown', () => {
        this.scene.stop('HUD');
        this.scene.start('Game', { seed: Date.now() });
      });

    this.add.text(width / 2, height * 0.62, 'PLAY AGAIN', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // High scores button
    const scoresBtn = this.add.rectangle(width / 2, height * 0.74, 220, 45, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => scoresBtn.setFillStyle(0x444466))
      .on('pointerout', () => scoresBtn.setFillStyle(0x333344))
      .on('pointerdown', () => {
        this.scene.stop('HUD');
        this.scene.start('HighScores');
      });

    this.add.text(width / 2, height * 0.74, 'HIGH SCORES', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // Menu button
    const menuBtn = this.add.rectangle(width / 2, height * 0.85, 220, 45, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => menuBtn.setFillStyle(0x444466))
      .on('pointerout', () => menuBtn.setFillStyle(0x333344))
      .on('pointerdown', () => {
        this.scene.stop('HUD');
        this.scene.start('MainMenu');
      });

    this.add.text(width / 2, height * 0.85, 'MAIN MENU', {
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
