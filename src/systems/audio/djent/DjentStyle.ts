import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { DjentSynths } from './DjentSynths';

const BPM = 130;
const ROOTS = [35, 36, 38, 40, 43];

// Chug patterns: basic riff → complex polyrhythmic
const CHUG_POOLS: number[][][] = [
  // Tier 0: basic rhythmic chugs
  [[1,0,0,1, 0,0,1,0, 0,0,0,0, 1,0,0,0],
   [1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,0,0]],
  // Tier 1: syncopated
  [[1,0,0,1, 0,0,1,0, 1,0,0,0, 1,0,0,0],
   [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,0,0]],
  // Tier 2: full polyrhythmic
  [[1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
   [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,1,0],
   [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,0,0]],
  // Tier 3: maximum density + breakdown
  [[1,0,0,1, 0,1,0,0, 1,0,0,0, 1,0,1,0],
   [1,0,1,0, 1,0,0,1, 0,1,0,1, 0,0,1,0],
   [1,1,0,0, 1,0,0,1, 1,0,0,0, 1,1,0,0],   // machine-gun
   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]],   // breakdown (half-time)
];

// Kick patterns per tier
const KICK_POOLS: number[][][] = [
  [[0, 8], [0, 8, 14]],                                   // basic + ghost
  [[0, 6, 8], [0, 8, 14]],                                // double kicks
  [[0, 6, 8], [0, 6, 8, 14]],                             // more double kicks
  [[0, 2, 6, 8, 14], [0, 4, 6, 8, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14]], // blast/gallop
];

export class DjentStyle extends BaseMusicStyle {
  private synths: DjentSynths;
  private root: number;
  private chugPattern: number[];
  private kickPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM);
    this.synths = new DjentSynths(ctx, output);
    this.root = pick(ROOTS);
    this.chugPattern = pick(CHUG_POOLS[0]);
    this.kickPattern = pick(KICK_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.chugPattern = pick(CHUG_POOLS[3]);
    this.kickPattern = pick(KICK_POOLS[3]);
  }

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected onBarEnd(): void {
    const t = this.tier();
    const refreshChance = 0.2 + this.intensity * 0.3;
    if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
      this.chugPattern = pick(CHUG_POOLS[t]);
      this.kickPattern = pick(KICK_POOLS[t]);
    }
    // Root changes: slow at low intensity, fast at high
    const rootInterval = Math.max(2, 8 - Math.floor(this.intensity * 6));
    if (this.barCount % rootInterval === 0) {
      this.root = pick(ROOTS);
    }
  }

  protected playStep(step: number, time: number): void {
    const beatLen = this.stepDuration;
    const int = this.intensity;

    // --- Kick ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);

    // --- Snare: always present, fills at high ---
    if (step === 4 || step === 12) this.synths.snare(time);
    // Snare fill at high intensity every 4th bar
    if (int > 0.7 && this.barCount % 4 === 3 && (step === 13 || step === 14 || step === 15)) {
      this.synths.snare(time);
    }

    // --- Hi-hat: quarter notes → busy ---
    if (int < 0.3) {
      if (step % 4 === 2) this.synths.hihat(time, 0.04);
    } else if (int < 0.6) {
      if (step % 4 === 2) this.synths.hihat(time, step === 10 ? 0.08 : 0.04);
    } else {
      if (step % 2 === 0) this.synths.hihat(time, step % 4 === 2 ? 0.08 : 0.04);
    }

    // --- Djent chugs: always use pattern ---
    if (this.chugPattern[step]) {
      this.synths.djent(time, this.root, beatLen * 1.5);
    }

    // --- Clean pad sections ---
    // More frequent at low intensity, rarer at high
    const cleanBarFreq = int < 0.3 ? 2 : int < 0.6 ? 4 : 8;
    if (this.barCount % cleanBarFreq === cleanBarFreq - 1 && step === 0) {
      this.synths.cleanPad(
        time,
        [this.root + 12, this.root + 15, this.root + 19],
        this.stepDuration * STEPS_PER_BAR,
      );
    }

    // --- At high intensity: occasional power chord accents on root changes ---
    if (int > 0.8 && step === 0 && this.barCount % 2 === 0) {
      this.synths.djent(time, this.root + 12, beatLen * 0.5);
    }

    // --- Highlight flourish: octave chugs + snare fills ---
    if (this.highlightBarsLeft > 0) {
      if (step === 0) this.synths.djent(time, this.root + 12, beatLen * 0.5);
      if (step === 13 || step === 14 || step === 15) this.synths.snare(time);
    }
  }
}
