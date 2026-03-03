import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { addScore, formatTime } from '../ui/highScores';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';

interface GameOverData {
  victory: boolean;
  kills: number;
  level: number;
  time: number; // ms
}

export class GameOverScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333344, 0x333344];
  private readonly hoverFills = [0x444488, 0x444466, 0x444466];

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
    this.add.text(width / 2, height * 0.15, titleText,
      monoStyle('48px', titleColor, { fontStyle: 'bold' }),
    ).setOrigin(0.5);

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

    // Play again button
    const play = createButton(this, {
      x: width / 2, y: height * 0.62, width: 220, height: 50,
      label: 'PLAY AGAIN', fontSize: '20px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.playAgain(),
    });

    // High scores button
    const scores = createButton(this, {
      x: width / 2, y: height * 0.74, width: 220, height: 45,
      label: 'HIGH SCORES', fontSize: '16px', textColor: '#ffcc00',
      fillColor: 0x333344, hoverColor: 0x444466,
      onClick: () => this.showHighScores(),
    });

    // Menu button
    const menu = createButton(this, {
      x: width / 2, y: height * 0.85, width: 220, height: 45,
      label: 'MAIN MENU', fontSize: '16px', textColor: '#aaaaaa',
      fillColor: 0x333344, hoverColor: 0x444466,
      onClick: () => this.goToMenu(),
    });

    this.buttons = [play.bg, scores.bg, menu.bg];
    play.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(0));
    scores.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(1));
    menu.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(2));

    // Enter/Space to play again
    this.input.keyboard!.on('keydown-ENTER', () => this.playAgain());

    // Gamepad navigation
    const actions = [
      () => this.playAgain(),
      () => this.showHighScores(),
      () => this.goToMenu(),
    ];
    this.gpNav = new GamepadNav(this, 3, (i) => actions[i]());

    // Cleanup on shutdown
    this.events.once('shutdown', () => {
      this.input.keyboard!.removeAllListeners();
    });
  }

  update(_time: number): void {
    this.gpNav.update(_time);
    const sel = this.gpNav.getSelected();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setFillStyle(i === sel ? this.hoverFills[i] : this.defaultFills[i]);
    }
  }

  private unhighlightBtn(index: number): void {
    this.buttons[index]?.setFillStyle(this.defaultFills[index]);
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
