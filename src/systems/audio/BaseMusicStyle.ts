import type { MusicStyle } from './MusicStyle';

export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = STEPS_PER_BEAT * 4;
const LOOK_AHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

export interface Synths {
  stopAll(): void;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export abstract class BaseMusicStyle implements MusicStyle {
  protected ctx: AudioContext;
  protected synths: Synths;
  protected intensity = 0;
  protected highlightBarsLeft = 0;
  protected currentStep = 0;
  protected nextStepTime = 0;
  protected barCount = 0;
  protected stepDuration: number;
  private timerId = 0;
  private running = false;

  constructor(ctx: AudioContext, bpm: number, synths: Synths) {
    this.ctx = ctx;
    this.synths = synths;
    this.stepDuration = 60 / bpm / STEPS_PER_BEAT;
  }

  setIntensity(v: number): void { this.intensity = v; }

  protected tier(): number {
    return Math.min(3, Math.floor(this.intensity * 4));
  }

  start(): void {
    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.barCount = 0;
    this.onStart();
    this.schedule();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timerId);
    this.stopSynths();
  }

  private schedule(): void {
    const end = this.ctx.currentTime + LOOK_AHEAD_S;
    while (this.nextStepTime < end) {
      this.playStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep++;
      if (this.currentStep >= STEPS_PER_BAR) {
        this.currentStep = 0;
        this.barCount++;
        if (this.highlightBarsLeft > 0) this.highlightBarsLeft--;
        this.onBarEnd();
      }
    }
    if (this.running) {
      this.timerId = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
    }
  }

  protected shouldRefreshPatterns(baseChance: number, intensityScale: number): boolean {
    return this.highlightBarsLeft <= 0
      && this.barCount % 2 === 0
      && Math.random() < baseChance + this.intensity * intensityScale;
  }

  protected onStart(): void {}

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected abstract playStep(step: number, time: number): void;
  protected abstract onBarEnd(): void;
  abstract highlight(reason: string): void;
}
