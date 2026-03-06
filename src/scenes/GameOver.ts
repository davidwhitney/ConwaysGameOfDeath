import Phaser from 'phaser';
import { addScore, formatTime } from '../ui/highScores';
import { monoStyle, BTN_PRIMARY, BTN_SECONDARY, BTN_MUTED } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';

interface GameOverData {
  victory: boolean;
  extracted?: boolean;
  kills: number;
  level: number;
  time: number; // ms
  seed: number;
}

export class GameOverScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private initData: GameOverData | null = null;
  private rank = 0;

  constructor() {
    super({ key: 'GameOver' });
  }

  init(data: GameOverData): void {
    // Only save score on fresh scene start, not resize-restart (same ref)
    if (this.initData !== data) {
      this.rank = addScore({
        kills: data.kills,
        level: data.level,
        time: data.time,
        victory: data.victory,
        date: Date.now(),
        seed: data.seed,
      });
      this.initData = data;
    }
  }

  create(): void {
    const data = this.initData!;
    const rank = this.rank;
    const { width, height } = setupMenuScene(this, { initData: this.initData! });

    // Background
    const bgColor = data.extracted ? 0x1a1500 : 0x000000;
    this.add.rectangle(width / 2, height / 2, width, height, bgColor, 0.8);

    // Title
    const titleText = data.extracted ? 'EXTRACTED!' : data.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = data.extracted ? '#ffdd00' : data.victory ? '#ffcc00' : '#ff4444';
    this.add.text(width / 2, height * 0.15, titleText,
      monoStyle('48px', titleColor, { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    if (data.extracted) {
      this.add.text(width / 2, height * 0.22, 'You escaped through the gate',
        monoStyle('14px', '#ccaa44'),
      ).setOrigin(0.5);
    }

    // Stats
    const timeStr = formatTime(data.time);
    const stats = [
      `Time Survived: ${timeStr}`,
      `Level Reached: ${data.level}`,
      `Enemies Killed: ${data.kills}`,
    ];

    stats.forEach((stat, i) => {
      this.add.text(width / 2, height * 0.3 + i * 28, stat,
        monoStyle('18px', '#cccccc'),
      ).setOrigin(0.5);
    });

    // Rank display
    const rankStr = rank > 0 ? `#${rank} High Score!` : '';
    const rankColor = rank === 1 ? '#ffcc00' : rank <= 3 ? '#ccaa44' : '#88aa88';
    if (rankStr) {
      this.add.text(width / 2, height * 0.3 + stats.length * 28 + 10, rankStr,
        monoStyle('20px', rankColor, { fontStyle: 'bold' }),
      ).setOrigin(0.5);
    }

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.62, width: 220, height: 50, label: 'PLAY AGAIN', fontSize: '20px', ...BTN_PRIMARY, action: () => this.playAgain() },
      { x: width / 2, y: height * 0.74, width: 220, height: 45, label: 'HIGH SCORES', fontSize: '16px', ...BTN_SECONDARY, action: () => this.showHighScores() },
      { x: width / 2, y: height * 0.85, width: 220, height: 45, label: 'MAIN MENU', fontSize: '16px', ...BTN_MUTED, action: () => this.goToMenu() },
    ]);

  }

  update(): void {
    this.menuNav.update();
  }

  private playAgain(): void {
    this.scene.stop('HUD');
    this.scene.start('Game', { seed: Date.now() });
  }

  private showHighScores(): void {
    this.scene.stop('HUD');
    this.scene.start('HighScores');
  }

  private goToMenu(): void {
    this.scene.stop('HUD');
    this.scene.start('MainMenu');
  }
}
