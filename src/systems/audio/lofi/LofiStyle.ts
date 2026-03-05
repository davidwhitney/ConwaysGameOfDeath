import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { LofiSynths } from './LofiSynths';
import { LofiTheory } from './LofiTheory';

const BPM = 75;

// Kick patterns: sparse → busy
const KICK_POOLS: number[][][] = [
  [[0, 8]],                                             // basic
  [[0, 8], [0, 6, 8]],                                  // + ghost
  [[0, 8], [0, 6, 8], [0, 4, 8, 12]],                   // + four-on-floor
  [[0, 6, 8], [0, 4, 8, 12], [0, 2, 8, 10]],            // shuffle/broken
];
// Snare patterns
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                             // basic backbeat
  [[4, 12], [4, 14]],                                    // + late 4
  [[4, 12], [4, 14], [4, 10, 14]],                       // + ghost
  [[4, 12], [4, 10, 14], [4, 8, 12], [2, 8, 14]],       // syncopated
];
// Hi-hat patterns
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                       // quarter notes
  [[0, 2, 4, 8, 10, 12]],                                // + open offbeats
  [[0, 2, 4, 6, 8, 10, 12, 14]],                         // 8ths
  [[0, 1, 2, 4, 6, 8, 10, 12, 14, 15]],                  // 16th fills
];

export class LofiStyle extends BaseMusicStyle {
  protected declare synths: LofiSynths;
  private theory: LofiTheory;
  private chordIndex = 0;
  private progression: number[][] = [];
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM, new LofiSynths(ctx, output));
    this.theory = new LofiTheory();
    this.progression = this.theory.generateProgression();
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
  }

  protected onStart(): void {
    this.chordIndex = 0;
    this.synths.startCrackle(this.synths.masterFilter);
  }

  protected onBarEnd(): void {
    this.chordIndex = (this.chordIndex + 1) % this.progression.length;

    if (this.shouldRefreshPatterns(0.15, 0.35)) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
    }
    const progChance = 0.15 + this.intensity * 0.3;
    if (this.barCount % this.progression.length === 0 && Math.random() < progChance) {
      this.progression = this.theory.generateProgression();
    }
  }

  protected playStep(step: number, time: number): void {
    const chord = this.progression[this.chordIndex];
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;

    // --- Drums ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.hatPattern.includes(step)) {
      const isOffbeat = step % 4 === 2;
      this.synths.hihat(time, isOffbeat ? 0.1 : 0.05);
    }

    // --- Chord pad ---
    if (step === 0) {
      this.synths.chordPad(time, chord, barDuration);
    }
    // At high intensity, layer a second pad an octave up every other bar
    if (step === 0 && int > 0.6 && this.barCount % 2 === 1) {
      this.synths.chordPad(time, chord.map(n => n + 12), barDuration);
    }

    // --- Bass ---
    if (step === 0 || step === 8) {
      this.synths.bass(time, chord[0] - 12, this.stepDuration * 3);
    }
    // Walking approach on beat 4
    if (step === 12) {
      const nextChord = this.progression[(this.chordIndex + 1) % this.progression.length];
      const walk = nextChord[0] - 12 + (Math.random() < 0.5 ? 2 : -1);
      this.synths.bass(time, walk, this.stepDuration * 2);
    }
    // At mid+ intensity, add chromatic passing tones
    if (int > 0.4 && step === 6 && Math.random() < int * 0.5) {
      const passing = chord[0] - 12 + (Math.random() < 0.5 ? 5 : 3);
      this.synths.bass(time, passing, this.stepDuration * 1.5);
    }

    // --- Melody fragments at high intensity or during highlight ---
    const hl = this.highlightBarsLeft > 0;
    if (hl || (int > 0.5 && this.barCount % 4 >= 2)) {
      const melodySteps = (hl || int > 0.8) ? [0, 3, 6, 10, 13] : [0, 6, 13];
      if (melodySteps.includes(step)) {
        const intervals = [0, 3, 5, 7, 10, 12];
        const note = chord[0] + 12 + pick(intervals);
        this.synths.chordPad(time, [note], this.stepDuration * 2);
      }
    }

    // --- Highlight flourish: octave pad + extra snare fills ---
    if (hl) {
      if (step === 0) {
        this.synths.chordPad(time, chord.map(n => n + 12), barDuration);
      }
      if (step === 14 || step === 15) this.synths.snare(time);
    }
  }
}
