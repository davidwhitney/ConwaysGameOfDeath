import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';

export class MainMenuScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333344];
  private readonly hoverFills = [0x444488, 0x444466];
  private seedInput!: HTMLInputElement;

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

    // Seed input (HTML element for editable text)
    this.createSeedInput();

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
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });

    // Gamepad navigation
    const actions = [
      () => this.startGame(),
      () => this.scene.start('HighScores'),
    ];
    this.gpNav = new GamepadNav(this, 2, (i) => actions[i]());

    // Ensure seed input is removed on any scene transition
    this.events.once('shutdown', () => this.removeSeedInput());
  }

  private createSeedInput(): void {
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    this.seedInput.value = String(Date.now());
    this.seedInput.maxLength = 20;
    this.seedInput.setAttribute('aria-label', 'Game seed');
    Object.assign(this.seedInput.style, {
      position: 'absolute',
      width: '160px',
      textAlign: 'center',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
      backgroundColor: 'transparent',
      border: '1px solid #333355',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
      zIndex: '10',
    });

    // Focus styling
    this.seedInput.addEventListener('focus', () => {
      this.seedInput.style.color = '#aaaacc';
      this.seedInput.style.borderColor = '#555577';
      this.input.keyboard!.enabled = false;
    });
    this.seedInput.addEventListener('blur', () => {
      this.seedInput.style.color = '#666688';
      this.seedInput.style.borderColor = '#333355';
      this.input.keyboard!.enabled = true;
    });
    // Enter while focused → start game
    this.seedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.seedInput.blur();
        this.startGame();
      }
    });

    canvas.parentElement!.appendChild(this.seedInput);
    this.positionSeedInput();

    // Reposition on resize
    this.scale.on('resize', () => this.positionSeedInput());
  }

  private positionSeedInput(): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    // Place below play button at ~64% height
    const x = rect.left + rect.width / 2 - 80;
    const y = rect.top + rect.height * 0.64;
    this.seedInput.style.left = `${x}px`;
    this.seedInput.style.top = `${y}px`;
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

  private getSeed(): number {
    const val = this.seedInput.value.trim();
    const num = parseInt(val, 10);
    return (val && !isNaN(num)) ? num : Date.now();
  }

  private startGame(): void {
    const seed = this.getSeed();
    this.removeSeedInput();
    this.scene.start('Game', { seed });
  }

  private removeSeedInput(): void {
    this.scale.off('resize');
    this.seedInput?.remove();
  }

  shutdown(): void {
    this.removeSeedInput();
  }
}
