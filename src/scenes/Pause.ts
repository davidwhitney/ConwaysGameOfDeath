import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';

export class PauseScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333344, 0x443333];
  private readonly hoverFills = [0x444488, 0x444466, 0x664444];

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

    // Resume button
    const resume = createButton(this, {
      x: width / 2, y: height * 0.5, width: 200, height: 45,
      label: 'RESUME', fontSize: '20px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.resume(),
    });

    // Settings button
    const settings = createButton(this, {
      x: width / 2, y: height * 0.62, width: 200, height: 45,
      label: 'SETTINGS', fontSize: '16px', textColor: '#ffcc00',
      fillColor: 0x333344, hoverColor: 0x444466,
      onClick: () => this.openSettings(),
    });

    // Quit button
    const quit = createButton(this, {
      x: width / 2, y: height * 0.74, width: 200, height: 45,
      label: 'QUIT', fontSize: '20px', textColor: '#ff8888',
      fillColor: 0x443333, hoverColor: 0x664444,
      onClick: () => this.quit(),
    });

    this.buttons = [resume.bg, settings.bg, quit.bg];
    resume.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(0));
    settings.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(1));
    quit.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(2));

    // ESC to resume
    this.input.keyboard!.on('keydown-ESC', () => this.resume());

    // Gamepad navigation — B/Start → resume
    const actions = [() => this.resume(), () => this.openSettings(), () => this.quit()];
    this.gpNav = new GamepadNav(this, 3, (i) => actions[i](), () => this.resume());

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

  private resume(): void {
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.scene.stop();
    } else {
      // No paused game to resume — bail to main menu
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
