import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle } from '../ui/textStyles';
import { BackgroundGameOfLife } from '../ui/BackgroundGameOfLife';
import { applyCRT } from '../ui/crtEffect';
import { BloodDripEffect } from '../ui/BloodDripEffect';
import { MenuNav } from '../ui/MenuNav';
import { loadSettings, saveSettings } from '../ui/preferences';
import { onResizeRestart } from '../ui/resizeHandler';
import { LofiMusicSystem } from '../systems/audio/LofiMusicSystem';

export class MainMenuScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private seedInput!: HTMLInputElement;
  private endlessContainer!: HTMLDivElement;
  private endlessCheckbox!: HTMLInputElement;
  private bloodDrips!: BloodDripEffect;
  private gol!: BackgroundGameOfLife;
  private layoutFracs = { seed: 0.52, play: 0.58, endless: 0.63, scores: 0.72, settings: 0.82, hint: 0.92 };
  private currentSeed = '';

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    applyCRT(this);

    // Compute flow-based layout so elements never overlap on short screens
    this.computeLayout(height);
    const ly = this.layoutFracs;

    // Game of Life background
    this.gol = new BackgroundGameOfLife(this, width, height);

    // Title
    const title = this.add.text(width / 2, height * 0.25, "CONWAY'S GAME\nOF DEATH",
      monoStyle('48px', '#ff4444', { fontStyle: 'bold', align: 'center', lineSpacing: 4 }),
    ).setOrigin(0.5);

    // Blood drip effect
    this.bloodDrips = new BloodDripEffect(this, title, { count: 18, delayRange: 5, fromLine1: true });

    this.add.text(width / 2, height * 0.40, 'Survive the Automaton',
      monoStyle('20px', '#aaaacc'),
    ).setOrigin(0.5);

    // Seed input (HTML element for editable text)
    this.createSeedInput();

    // Endless mode checkbox
    this.createEndlessCheckbox();

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * ly.play, width: 220, height: 50, label: 'PLAY', fontSize: '24px', textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488, action: () => this.startGame() },
      { x: width / 2, y: height * ly.scores, width: 200, height: 45, label: 'HIGH SCORES', fontSize: '16px', textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.scene.start('HighScores') },
      { x: width / 2, y: height * ly.settings, width: 200, height: 45, label: 'SETTINGS', fontSize: '16px', textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.scene.start('Settings', { returnTo: 'MainMenu' }) },
    ]);

    // Controls hint
    this.add.text(width / 2, height * ly.hint, 'WASD / Arrows / Gamepad to move  |  ESC / Start to pause',
      monoStyle('12px', '#666688'),
    ).setOrigin(0.5);

    // Press Enter to start
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });

    // Restart on resize so layout adapts
    onResizeRestart(this);

    // Start music (uses Phaser's AudioContext + unlock mechanism)
    const music = LofiMusicSystem.instance;
    music.init((this.sound as Phaser.Sound.WebAudioSoundManager).context);
    music.start();

    // Ensure seed input is removed on any scene transition
    this.events.once('shutdown', () => this.removeSeedInput());
  }

  private createSeedInput(): void {
    const canvas = this.game.canvas;

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    if (!this.currentSeed) this.currentSeed = String(Date.now());
    this.seedInput.value = this.currentSeed;
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
    // Track seed changes
    this.seedInput.addEventListener('input', () => {
      this.currentSeed = this.seedInput.value;
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
  }

  private positionEndlessCheckbox(): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 60;
    const y = rect.top + rect.height * this.layoutFracs.endless;
    this.endlessContainer.style.left = `${x}px`;
    this.endlessContainer.style.top = `${y}px`;
  }

  private positionSeedInput(): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 80;
    const y = rect.top + rect.height * this.layoutFracs.seed;
    this.seedInput.style.left = `${x}px`;
    this.seedInput.style.top = `${y}px`;
  }

  private computeLayout(height: number): void {
    const startY = height * 0.45;
    const endY = height * 0.97;
    const avail = endY - startY;

    const keys: (keyof typeof this.layoutFracs)[] = ['seed', 'play', 'endless', 'scores', 'settings', 'hint'];
    const heights = [28, 50, 22, 45, 45, 16];

    const totalItemH = heights.reduce((s, h) => s + h, 0);
    const minGap = 4;
    const totalMinGap = minGap * (keys.length - 1);
    const extra = Math.max(0, avail - totalItemH - totalMinGap);
    const gap = minGap + extra / (keys.length - 1);

    let y = startY + heights[0] / 2;
    for (let i = 0; i < keys.length; i++) {
      this.layoutFracs[keys[i]] = y / height;
      if (i < keys.length - 1) {
        y += heights[i] / 2 + gap + heights[i + 1] / 2;
      }
    }
  }

  update(_time: number, delta: number): void {
    this.menuNav.update(_time);
    this.bloodDrips.update(delta / 1000);
    this.gol.update(delta);
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
    this.seedInput?.remove();
    this.endlessContainer?.remove();
  }

  shutdown(): void {
    this.removeSeedInput();
  }
}
