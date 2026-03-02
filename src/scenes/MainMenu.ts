import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';

export class MainMenuScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333344];
  private readonly hoverFills = [0x444488, 0x444466];

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
      .on('pointerout', () => this.unhighlightBtn(0))
      .on('pointerdown', () => this.startGame());

    this.add.text(width / 2, height * 0.58, 'PLAY', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // High scores button
    const scoresBtn = this.add.rectangle(width / 2, height * 0.70, 200, 45, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => scoresBtn.setFillStyle(0x444466))
      .on('pointerout', () => this.unhighlightBtn(1))
      .on('pointerdown', () => this.scene.start('HighScores'));

    this.add.text(width / 2, height * 0.70, 'HIGH SCORES', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    this.buttons = [playBtn, scoresBtn];

    // Controls hint
    this.add.text(width / 2, height * 0.88, 'WASD / Arrows / Gamepad to move  |  ESC / Start to pause', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    // Press Enter to start
    this.input.keyboard!.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard!.on('keydown-SPACE', () => this.startGame());

    // Gamepad navigation
    const actions = [
      () => this.startGame(),
      () => this.scene.start('HighScores'),
    ];
    this.gpNav = new GamepadNav(this, 2, (i) => actions[i]());
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

  private startGame(): void {
    this.scene.start('Game', { seed: Date.now() });
  }
}
