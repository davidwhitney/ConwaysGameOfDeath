import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { AmbientSynths } from './AmbientSynths';

const BPM = 72;

// Chord progressions as MIDI note arrays
const PROGRESSIONS: number[][][] = [
  [[60, 64, 67], [58, 62, 65], [55, 59, 62], [57, 60, 64]],   // C-Bb-G-Am
  [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]],   // C-F-Dm-G
  [[64, 68, 71], [60, 64, 67], [57, 60, 64], [59, 62, 66]],   // E-C-Am-B
  [[55, 59, 62], [57, 60, 64], [60, 64, 67], [58, 62, 65]],   // G-Am-C-Bb
];

// Kick: every 2 bars → every bar
const KICK_POOLS: number[][][] = [
  [[]],                                                    // none at lowest
  [[0]],                                                   // every 2 bars (handled in playStep)
  [[0]],                                                   // every bar
  [[0, 8]],                                                // every half-bar
];
// Shaker: none → quarter notes
const SHAKER_POOLS: number[][][] = [
  [[]],                                                    // none
  [[]],                                                    // still none
  [[0, 8]],                                                // sparse
  [[0, 4, 8, 12]],                                         // quarter notes
];
// Bell patterns: MIDI offsets from chord root
const BELL_POOLS: { steps: number[]; offsets: number[] }[][] = [
  [{ steps: [0], offsets: [0] }],                          // 1 per bar
  [{ steps: [0, 8], offsets: [0, 7] }],                   // 2 per bar
  [{ steps: [0, 4, 8], offsets: [0, 4, 7] }],            // arpeggio
  [
    { steps: [0, 2, 4, 8, 10], offsets: [0, 4, 7, 12, 7] },
    { steps: [0, 4, 6, 8, 12], offsets: [0, 7, 4, 12, 0] },
  ],                                                        // melody
];

export class AmbientStyle extends BaseMusicStyle {
  protected declare synths: AmbientSynths;
  private progression: number[][];
  private chordIndex = 0;
  private kickPattern: number[];
  private shakerPattern: number[];
  private bellPattern: { steps: number[]; offsets: number[] };

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM, new AmbientSynths(ctx, output));
    this.progression = pick(PROGRESSIONS);
    this.kickPattern = pick(KICK_POOLS[0]);
    this.shakerPattern = pick(SHAKER_POOLS[0]);
    this.bellPattern = pick(BELL_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.bellPattern = pick(BELL_POOLS[3]);
  }

  protected onBarEnd(): void {
    this.chordIndex = (this.chordIndex + 1) % this.progression.length;

    if (this.shouldRefreshPatterns(0.1, 0.3)) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.shakerPattern = pick(SHAKER_POOLS[t]);
      this.bellPattern = pick(BELL_POOLS[t]);
    }

    // New progression every 2 cycles
    if (this.barCount % (this.progression.length * 2) === 0 && Math.random() < 0.4) {
      this.progression = pick(PROGRESSIONS);
    }
  }

  protected playStep(step: number, time: number): void {
    const chord = this.progression[this.chordIndex];
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;
    const hl = this.highlightBarsLeft > 0;

    // --- Kick: very subtle ---
    if (this.kickPattern.includes(step)) {
      // At tier 1, only play every 2 bars
      const t = this.tier();
      if (t >= 2 || (t === 1 && this.barCount % 2 === 0)) {
        this.synths.kick(time);
      }
    }

    // --- Shaker ---
    if (this.shakerPattern.includes(step)) {
      this.synths.shaker(time);
    }

    // --- Bell ---
    const bellIdx = this.bellPattern.steps.indexOf(step);
    if (bellIdx >= 0) {
      const note = chord[0] + this.bellPattern.offsets[bellIdx];
      const bellDur = int > 0.5 ? 1.5 : 2.5; // Shorter at high intensity for more definition
      this.synths.bell(time, note, bellDur);
    }

    // Highlight: bell cascade — extra bells on odd 8ths
    if (hl && step % 2 === 1 && Math.random() < 0.4) {
      const intervals = [0, 4, 7, 12, 16];
      const note = chord[0] + 12 + pick(intervals);
      this.synths.bell(time, note, 1.2);
    }

    // --- Pad: every bar or every 2 bars ---
    if (step === 0) {
      const padFreq = int > 0.4 ? 1 : 2; // Every bar at higher intensity, every 2 at low
      if (this.barCount % padFreq === 0) {
        this.synths.pad(time, chord, barDuration * padFreq, hl);
      }
    }

    // --- Sub bass ---
    if (step === 0 && int > 0.2) {
      this.synths.sub(time, chord[0] - 12, barDuration * 0.9);
    }

    // --- Highlight: brighter pad + extra sub ---
    if (hl && step === 0) {
      this.synths.pad(time, chord.map(n => n + 12), barDuration, true);
    }
  }
}
