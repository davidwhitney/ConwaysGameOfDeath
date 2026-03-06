import type Phaser from 'phaser';
import type { GameSystem } from './GameSystem';
import type { UpdateContext } from './UpdateContext';
import { GameEvents } from './GameEvents';
import { ACHIEVEMENTS } from '../achievements';
import { getAchievements, unlockAchievement } from '../ui/saveData';

const BANNER_SLIDE_MS = 400;
const BANNER_HOLD_MS = 3000;

export class AchievementSystem implements GameSystem {
  private scene: Phaser.Scene;
  private timer = 0;
  private unlocked: Set<string>;
  private lastLevel = 0;
  private wasAlive = true;
  private static readonly INTERVAL = 10_000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.unlocked = new Set(getAchievements());

    GameEvents.on(scene.events, 'achievement', (id) => this.grant(id));
  }

  update(ctx: UpdateContext): void {
    // Detect level-up
    const currentLevel = ctx.player.state.level;
    if (currentLevel !== this.lastLevel) {
      this.lastLevel = currentLevel;
      this.evaluate(ctx);
    }

    // Detect death
    if (!ctx.player.state.alive && this.wasAlive) {
      this.wasAlive = false;
      this.evaluate(ctx);
    } else if (ctx.player.state.alive) {
      this.wasAlive = true;
    }

    // Periodic check
    this.timer += ctx.time.deltaMs;
    if (this.timer >= AchievementSystem.INTERVAL) {
      this.timer = 0;
      this.evaluate(ctx);
    }
  }

  /** Run all state-based achievement checks. */
  evaluate(ctx: UpdateContext): void {
    for (const def of ACHIEVEMENTS) {
      if (!def.evaluate || this.unlocked.has(def.id)) continue;
      if (def.evaluate(ctx)) this.grant(def.id);
    }
  }

  private grant(id: string): void {
    if (this.unlocked.has(id)) return;
    if (unlockAchievement(id)) {
      this.unlocked.add(id);
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) showAchievementBanner(def.name, def.description);
      GameEvents.sfx('achievement-unlocked');
    }
  }

  destroy(): void {
    GameEvents.off(this.scene.events, 'achievement');
  }
}

function showAchievementBanner(name: string, description: string): void {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 12px 28px;
    background: rgba(17, 17, 51, 0.95);
    border: 2px solid #ffcc00;
    border-top: none;
    border-radius: 0 0 8px 8px;
    font-family: monospace;
    text-align: center;
    transition: transform ${BANNER_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  banner.innerHTML = `
    <div style="font-size: 11px; color: #ffcc00; font-weight: bold; letter-spacing: 1px;">ACHIEVEMENT UNLOCKED</div>
    <div style="font-size: 17px; color: #ffffff; font-weight: bold;">${esc(name)}</div>
    <div style="font-size: 11px; color: #aaaacc;">${esc(description)}</div>
  `;

  document.body.appendChild(banner);

  // Slide in
  requestAnimationFrame(() => {
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Hold, then slide out and remove
  setTimeout(() => {
    banner.style.transition = `transform ${BANNER_SLIDE_MS}ms ease-in`;
    banner.style.transform = 'translateX(-50%) translateY(-100%)';
    setTimeout(() => banner.remove(), BANNER_SLIDE_MS);
  }, BANNER_SLIDE_MS + BANNER_HOLD_MS);
}

function esc(s: string): string {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}
