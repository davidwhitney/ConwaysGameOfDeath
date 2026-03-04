import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';
import { BackgroundGameOfLife } from '../ui/BackgroundGameOfLife';
import { applyCRT } from '../ui/crtEffect';
import { loadSettings, saveSettings } from '../ui/preferences';

interface BloodDrip {
  x: number;
  y: number;
  startY: number;
  speed: number;
  length: number;
  alpha: number;
  delay: number;
  maxDist: number;
}

export class MainMenuScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333344, 0x333344];
  private readonly hoverFills = [0x444488, 0x444466, 0x444466];
  private seedInput!: HTMLInputElement;
  private endlessContainer!: HTMLDivElement;
  private endlessCheckbox!: HTMLInputElement;
  private drips: BloodDrip[] = [];
  private dripGfx!: Phaser.GameObjects.Graphics;
  private gol!: BackgroundGameOfLife;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    applyCRT(this);

    // Game of Life background
    this.gol = new BackgroundGameOfLife(this, width, height);

    // Title
    const title = this.add.text(width / 2, height * 0.25, "CONWAY'S GAME\nOF DEATH",
      monoStyle('48px', '#ff4444', { fontStyle: 'bold', align: 'center', lineSpacing: 4 }),
    ).setOrigin(0.5);

    // Blood drip effect
    this.dripGfx = this.add.graphics().setDepth(title.depth - 1);
    this.initBloodDrips(title);

    this.add.text(width / 2, height * 0.40, 'Survive the Automaton',
      monoStyle('20px', '#aaaacc'),
    ).setOrigin(0.5);

    // Play button
    const play = createButton(this, {
      x: width / 2, y: height * 0.58, width: 220, height: 50,
      label: 'PLAY', fontSize: '24px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.startGame(),
    });

    // Seed input (HTML element for editable text)
    this.createSeedInput();

    // Endless mode checkbox
    this.createEndlessCheckbox();

    // High scores button
    const scores = createButton(this, {
      x: width / 2, y: height * 0.72, width: 200, height: 45,
      label: 'HIGH SCORES', fontSize: '16px', textColor: '#ffcc00',
      fillColor: 0x333344, hoverColor: 0x444466,
      onClick: () => this.scene.start('HighScores'),
    });

    // Settings button
    const settings = createButton(this, {
      x: width / 2, y: height * 0.82, width: 200, height: 45,
      label: 'SETTINGS', fontSize: '16px', textColor: '#ffcc00',
      fillColor: 0x333344, hoverColor: 0x444466,
      onClick: () => this.scene.start('Settings', { returnTo: 'MainMenu' }),
    });

    this.buttons = [play.bg, scores.bg, settings.bg];

    // Restore unhighlight behavior (buttonFactory sets pointerout to fillColor, but
    // gamepad nav also changes fills, so we override pointerout here)
    play.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(0));
    scores.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(1));
    settings.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(2));

    // Controls hint
    this.add.text(width / 2, height * 0.92, 'WASD / Arrows / Gamepad to move  |  ESC / Start to pause',
      monoStyle('12px', '#666688'),
    ).setOrigin(0.5);

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
      () => this.scene.start('Settings', { returnTo: 'MainMenu' }),
    ];
    this.gpNav = new GamepadNav(this, 3, (i) => actions[i]());

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

  private createEndlessCheckbox(): void {
    const canvas = this.game.canvas;
    const settings = loadSettings();

    this.endlessContainer = document.createElement('div');
    Object.assign(this.endlessContainer.style, {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      zIndex: '10',
      cursor: 'pointer',
    });

    this.endlessCheckbox = document.createElement('input');
    this.endlessCheckbox.type = 'checkbox';
    this.endlessCheckbox.checked = settings.endlessMode;
    Object.assign(this.endlessCheckbox.style, {
      cursor: 'pointer',
      accentColor: '#666688',
    });

    const label = document.createElement('label');
    label.textContent = 'Endless Mode';
    Object.assign(label.style, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
      cursor: 'pointer',
    });
    label.addEventListener('click', () => {
      this.endlessCheckbox.checked = !this.endlessCheckbox.checked;
      this.endlessCheckbox.dispatchEvent(new Event('change'));
    });

    this.endlessCheckbox.addEventListener('change', () => {
      const s = loadSettings();
      s.endlessMode = this.endlessCheckbox.checked;
      saveSettings(s);
    });

    this.endlessContainer.appendChild(this.endlessCheckbox);
    this.endlessContainer.appendChild(label);
    canvas.parentElement!.appendChild(this.endlessContainer);
    this.positionEndlessCheckbox();
    this.scale.on('resize', () => this.positionEndlessCheckbox());
  }

  private positionEndlessCheckbox(): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 60;
    const y = rect.top + rect.height * 0.63;
    this.endlessContainer.style.left = `${x}px`;
    this.endlessContainer.style.top = `${y}px`;
  }

  private positionSeedInput(): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    // Place above play button at ~52% height
    const x = rect.left + rect.width / 2 - 80;
    const y = rect.top + rect.height * 0.52;
    this.seedInput.style.left = `${x}px`;
    this.seedInput.style.top = `${y}px`;
  }

  update(_time: number, delta: number): void {
    this.gpNav.update(_time);
    const sel = this.gpNav.getSelected();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setFillStyle(i === sel ? this.hoverFills[i] : this.defaultFills[i]);
    }
    this.updateBloodDrips(delta / 1000);
    this.gol.update(delta);
  }

  private initBloodDrips(title: Phaser.GameObjects.Text): void {
    this.drips = [];
    const bounds = title.getBounds();
    // Bottom of line 1 ("CONWAY'S GAME") sits roughly at the midpoint
    const line1Bottom = bounds.top + bounds.height * 0.48;
    const line2Bottom = bounds.bottom;
    const dripCount = 18;

    for (let i = 0; i < dripCount; i++) {
      const fromLine1 = Math.random() < 0.4;
      const startY = fromLine1 ? line1Bottom : line2Bottom;
      const x = bounds.left + Math.random() * bounds.width;
      this.drips.push({
        x,
        y: startY,
        startY,
        speed: 10 + Math.random() * 20,
        length: 4 + Math.random() * 14,
        alpha: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 5,
        maxDist: 25 + Math.random() * 55,
      });
    }
  }

  private updateBloodDrips(dt: number): void {
    this.dripGfx.clear();

    for (const drip of this.drips) {
      if (drip.delay > 0) {
        drip.delay -= dt;
        continue;
      }

      drip.y += drip.speed * dt;
      const dist = drip.y - drip.startY;
      const progress = dist / drip.maxDist;
      const fadeAlpha = drip.alpha * Math.max(0, 1 - progress);

      // Drip trail from text bottom
      const trailTop = Math.max(drip.startY, drip.y - drip.length);
      const w = 2;
      this.dripGfx.fillStyle(0xcc0000, fadeAlpha * 0.7);
      this.dripGfx.fillRect(drip.x - w / 2, trailTop, w, drip.y - trailTop);

      // Rounded drop at tip
      this.dripGfx.fillStyle(0xaa0000, fadeAlpha);
      this.dripGfx.fillCircle(drip.x, drip.y, 1.5);

      // Reset when fully fallen
      if (dist >= drip.maxDist) {
        drip.y = drip.startY;
        drip.delay = 2 + Math.random() * 6;
        drip.speed = 10 + Math.random() * 20;
        drip.length = 4 + Math.random() * 14;
        drip.alpha = 0.5 + Math.random() * 0.5;
        drip.maxDist = 25 + Math.random() * 55;
      }
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
    const settings = loadSettings();
    this.removeSeedInput();
    this.scene.start('Game', { seed, endless: settings.endlessMode });
  }

  private removeSeedInput(): void {
    this.scale.off('resize');
    this.seedInput?.remove();
    this.endlessContainer?.remove();
  }

  shutdown(): void {
    this.removeSeedInput();
  }
}
