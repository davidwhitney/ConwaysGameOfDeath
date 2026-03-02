import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { loadScores, formatTime } from '../ui/highScores';
import { GamepadNav } from '../ui/gamepadNav';

export class HighScoresScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private backBtn!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'HighScores' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, height * 0.08, 'HIGH SCORES', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const scores = loadScores();

    if (scores.length === 0) {
      this.add.text(width / 2, height * 0.45, 'No scores yet.\nGo play!', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#666688',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      // Header
      const headerY = height * 0.17;
      const col = { rank: width * 0.08, kills: width * 0.25, level: width * 0.48, time: width * 0.67, date: width * 0.85 };
      const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#888899',
      };
      this.add.text(col.rank, headerY, '#', headerStyle).setOrigin(0.5);
      this.add.text(col.kills, headerY, 'KILLS', headerStyle).setOrigin(0.5);
      this.add.text(col.level, headerY, 'LEVEL', headerStyle).setOrigin(0.5);
      this.add.text(col.time, headerY, 'TIME', headerStyle).setOrigin(0.5);
      this.add.text(col.date, headerY, 'DATE', headerStyle).setOrigin(0.5);

      // Rows
      const rowStart = height * 0.23;
      const rowGap = Math.min(30, (height * 0.6) / scores.length);
      scores.forEach((s, i) => {
        const y = rowStart + i * rowGap;
        const color = i === 0 ? '#ffcc00' : i < 3 ? '#ccaa44' : '#aaaacc';
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
          fontSize: '14px',
          fontFamily: 'monospace',
          color,
        };
        this.add.text(col.rank, y, `${i + 1}`, style).setOrigin(0.5);
        this.add.text(col.kills, y, `${s.kills}`, style).setOrigin(0.5);
        this.add.text(col.level, y, `${s.level}`, style).setOrigin(0.5);
        this.add.text(col.time, y, formatTime(s.time), style).setOrigin(0.5);
        const d = new Date(s.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        this.add.text(col.date, y, dateStr, style).setOrigin(0.5);
      });
    }

    // Back button
    this.backBtn = this.add.rectangle(width / 2, height * 0.9, 200, 45, 0x333366)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.backBtn.setFillStyle(0x444488))
      .on('pointerout', () => this.backBtn.setFillStyle(0x333366))
      .on('pointerdown', () => this.goBack());

    this.add.text(width / 2, height * 0.9, 'BACK', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown-ESC', () => this.goBack());
    this.input.keyboard!.on('keydown-ENTER', () => this.goBack());

    // Gamepad navigation — A/B/Start all go back
    this.gpNav = new GamepadNav(this, 1, () => this.goBack(), () => this.goBack());
  }

  update(_time: number): void {
    this.gpNav.update(_time);
    // Single button — always highlighted when gamepad is connected
    const pad = this.input.gamepad?.pad1;
    this.backBtn.setFillStyle(pad ? 0x444488 : 0x333366);
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
