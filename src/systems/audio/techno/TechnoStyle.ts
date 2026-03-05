import type { MusicStyle } from '../MusicStyle';
import { TechnoSynths } from './TechnoSynths';

const BPM = 135;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = STEPS_PER_BEAT * 4;
const LOOK_AHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

const ROOTS = [36, 38, 40, 41, 43];

// Kick patterns: four-on-floor → relentless
const KICK_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                          // four-on-floor
  [[0, 4, 8, 12], [0, 4, 6, 8, 12]],                       // + offbeat ghost
  [[0, 4, 8, 12], [0, 2, 4, 8, 10, 12]],                   // double kicks
  [[0, 4, 8, 12], [0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 12, 14]], // max
];

// Clap: backbeat → syncopated
const CLAP_POOLS: number[][][] = [
  [[4, 12]],                                                // backbeat
  [[4, 12], [4, 10, 12]],                                   // + ghost
  [[4, 12], [4, 10, 12], [4, 10, 14]],                      // syncopated
  [[4, 12], [4, 10, 14], [2, 4, 10, 12]],                   // complex
];

// Hat: quarters → full 16ths with opens
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                          // quarters
  [[0, 2, 4, 8, 10, 12]],                                   // 8ths-ish
  [[0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 12, 14]],            // varied 8ths
  [[0, 2, 4, 6, 8, 10, 12, 14],
   [0, 1, 2, 4, 6, 8, 10, 12, 14, 15]],                    // 16ths
];

// Open hat positions per tier
const OPEN_HAT_POOLS: number[][][] = [
  [[]],                                                      // none
  [[2, 10]],                                                 // offbeats
  [[2, 10], [2, 6, 10]],                                    // more opens
  [[2, 6, 10, 14], [2, 10]],                                // max opens
];

// Acid bass patterns: simple melody → complex sequences. -1 = rest.
const BASS_POOLS: number[][][] = [
  [[0,-1,0,-1, -1,-1,-1,-1, 0,-1,-1,-1, 7,-1,-1,-1],
   [0,-1,-1,-1, -1,-1,7,-1, 0,-1,-1,-1, -1,-1,5,-1]],      // simple melody
  [[0,-1,0,12, -1,0,7,-1, 0,-1,5,-1, 7,-1,0,-1],
   [0,-1,7,-1, 0,-1,5,-1, 0,-1,3,-1, 5,-1,7,-1]],          // melodic acid
  [[0,-1,0,12, -1,0,7,-1, 0,-1,5,-1, 7,-1,0,-1],
   [0,0,-1,0, 12,-1,0,-1, 5,-1,7,0, -1,0,-1,12]],          // full acid
  [[0,0,-1,0, 12,-1,0,-1, 5,-1,7,0, -1,0,-1,12],
   [0,-1,7,-1, 0,-1,5,-1, 0,-1,3,-1, 5,-1,7,-1],
   [0,12,0,-1, 7,0,-1,5, 0,-1,3,5, 7,-1,12,0]],            // maximum acid
];

// Accent patterns per tier
const ACCENT_POOLS: number[][][] = [
  [[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0]],                  // basic
  [[1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,1,0],
   [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,0,0]],                  // syncopated
  [[1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,1,0],
   [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,0,1]],                  // more syncopation
  [[1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0],
   [1,0,1,0, 1,0,0,1, 0,1,0,1, 0,0,1,0],
   [1,0,0,1, 0,1,0,0, 1,0,0,0, 1,0,1,0]],                  // maximum squelch
];

export class TechnoStyle implements MusicStyle {
  private ctx: AudioContext;
  private synths: TechnoSynths;
  private stepDuration: number;
  private intensity = 0;
  private highlightBarsLeft = 0;

  private currentStep = 0;
  private nextStepTime = 0;
  private timerId = 0;
  private running = false;

  private barCount = 0;
  private root: number;
  private kickPattern: number[];
  private clapPattern: number[];
  private hatPattern: number[];
  private openHatPattern: number[];
  private bassPattern: number[];
  private accentPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.stepDuration = 60 / BPM / STEPS_PER_BEAT;
    this.synths = new TechnoSynths(ctx, output);
    this.root = pick(ROOTS);
    this.kickPattern = pick(KICK_POOLS[0]);
    this.clapPattern = pick(CLAP_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.openHatPattern = pick(OPEN_HAT_POOLS[0]);
    this.bassPattern = pick(BASS_POOLS[0]);
    this.accentPattern = pick(ACCENT_POOLS[0]);
  }

  setIntensity(v: number): void { this.intensity = v; }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.clapPattern = pick(CLAP_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.openHatPattern = pick(OPEN_HAT_POOLS[3]);
    this.bassPattern = pick(BASS_POOLS[3]);
    this.accentPattern = pick(ACCENT_POOLS[3]);
  }

  start(): void {
    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.barCount = 0;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timerId);
    this.synths.stopAll();
  }

  private tier(): number {
    return Math.min(3, Math.floor(this.intensity * 4));
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

        const t = this.tier();
        const refreshChance = 0.15 + this.intensity * 0.35;
        if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
          this.kickPattern = pick(KICK_POOLS[t]);
          this.clapPattern = pick(CLAP_POOLS[t]);
          this.hatPattern = pick(HAT_POOLS[t]);
          this.openHatPattern = pick(OPEN_HAT_POOLS[t]);
          this.bassPattern = pick(BASS_POOLS[t]);
          this.accentPattern = pick(ACCENT_POOLS[t]);
        }
        const rootInterval = Math.max(2, 8 - Math.floor(this.intensity * 6));
        if (this.barCount % rootInterval === 0) {
          this.root = pick(ROOTS);
        }
      }
    }
    if (this.running) {
      this.timerId = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
    }
  }

  private playStep(step: number, time: number): void {
    const beatLen = this.stepDuration;
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;

    // --- Kick ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);

    // --- Clap ---
    if (this.clapPattern.includes(step)) this.synths.clap(time);

    // --- Hi-hat ---
    if (this.hatPattern.includes(step)) {
      const isOpen = this.openHatPattern.includes(step);
      this.synths.hihat(time, isOpen);
    }

    // --- Acid bass ---
    const noteOffset = this.bassPattern[step];
    if (noteOffset !== undefined && noteOffset >= 0) {
      const accent = !!this.accentPattern[step];
      this.synths.acidBass(time, this.root + noteOffset, beatLen * 1.8, accent);
    }

    // --- Pad: more frequent at low intensity, rarer at high ---
    const padFreq = int < 0.3 ? 4 : int < 0.6 ? 8 : 16;
    if (step === 0 && this.barCount % padFreq < Math.ceil(padFreq / 2)) {
      this.synths.pad(
        time,
        [this.root + 12, this.root + 15, this.root + 19],
        barDuration * 2,
      );
    }
    // Layer higher octave pad at high intensity
    if (step === 0 && int > 0.6 && this.barCount % 4 === 0) {
      this.synths.pad(
        time,
        [this.root + 24, this.root + 27, this.root + 31],
        barDuration * 2,
      );
    }

    // --- Build-up feel at high intensity: rapid clap roll every 8th bar ---
    if (int > 0.7 && this.barCount % 8 === 7 && step >= 12) {
      this.synths.clap(time);
    }

    // --- Highlight flourish: clap rolls + high pad + extra acid ---
    if (this.highlightBarsLeft > 0) {
      if (step === 0) {
        this.synths.pad(time, [this.root + 24, this.root + 27, this.root + 31], barDuration * 2);
      }
      if (step >= 12) this.synths.clap(time);
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
