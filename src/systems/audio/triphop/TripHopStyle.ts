import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { TripHopSynths } from './TripHopSynths';
import { TripHopTheory } from './TripHopTheory';

const BPM = 63;

// Kick: simple groove → breakbeat
const KICK_POOLS: number[][][] = [
  [[0, 10], [0, 8]],                                       // basic groove
  [[0, 8], [0, 6, 10]],                                    // syncopated
  [[0, 6, 10], [0, 4, 10], [0, 8, 14]],                   // complex
  [[0, 6, 10], [0, 4, 8, 12], [0, 2, 6, 10, 14]],        // breakbeat
];
// Snare: basic → breakbeat
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                               // standard backbeat
  [[4, 12], [4, 14]],                                      // + late snare
  [[4, 12], [4, 14], [4, 10, 14]],                         // ghost notes
  [[4, 12], [4, 14], [2, 8, 14], [4, 10, 12]],            // breakbeat
];
// Hat: quarters → busy
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                         // quarter notes
  [[0, 4, 8, 12], [0, 2, 8, 10]],                          // + offbeats
  [[0, 4, 8, 12], [2, 6, 10, 14]],                         // offbeat patterns
  [[0, 2, 4, 8, 10, 12], [0, 2, 6, 8, 10, 14], [0, 2, 4, 6, 8, 10, 12, 14]],
];

export class TripHopStyle extends BaseMusicStyle {
  private synths: TripHopSynths;
  private theory: TripHopTheory;
  private chordIndex = 0;
  private progression: number[][] = [];
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM);
    this.synths = new TripHopSynths(ctx, output);
    this.theory = new TripHopTheory();
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
    this.synths.startDrone(this.progression[0][0], this.synths.masterFilter);
  }

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected onBarEnd(): void {
    this.chordIndex = (this.chordIndex + 1) % this.progression.length;

    const refreshChance = 0.1 + this.intensity * 0.3;
    if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
    }
    const progChance = 0.2 + this.intensity * 0.3;
    if (this.barCount % this.progression.length === 0 && Math.random() < progChance) {
      this.progression = this.theory.generateProgression();
      this.synths.startDrone(this.progression[0][0], this.synths.masterFilter);
    }
  }

  protected playStep(step: number, time: number): void {
    const chord = this.progression[this.chordIndex];
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;

    // --- Drums (intensity-gated) ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.hatPattern.includes(step)) {
      this.synths.hihat(time, step % 4 === 2 ? 0.12 : 0.06);
    }

    // --- Pad: every bar at low intensity, every beat at high ---
    if (step === 0 && this.chordIndex % 2 === 0) {
      this.synths.pad(time, chord, barDuration * 2);
    }
    // Layer higher octave pad at mid+ intensity
    if (step === 0 && int > 0.5 && this.barCount % 2 === 0) {
      this.synths.pad(time, chord.map(n => n + 12), barDuration * 2);
    }

    // --- Bass ---
    if (step === 0) {
      this.synths.bass(time, chord[0] - 12, barDuration * 0.9);
    }
    // Extra bass hits at higher intensity
    if (int > 0.3 && step === 10 && Math.random() < 0.3 + int * 0.3) {
      this.synths.bass(time, chord[0] - 24, this.stepDuration * 2);
    }
    // Melodic bass movement at high intensity
    if (int > 0.6 && step === 6 && Math.random() < 0.4) {
      const passing = chord[0] - 12 + (Math.random() < 0.5 ? 5 : 7);
      this.synths.bass(time, passing, this.stepDuration * 2.5);
    }

    // --- Stab accents at high intensity ---
    if (int > 0.7 && step === 4 && this.barCount % 4 === 3) {
      this.synths.pad(time, [chord[2], chord[3]].filter(Boolean), this.stepDuration * 3);
    }

    // --- Highlight flourish: layered pad + extra bass + snare fills ---
    if (this.highlightBarsLeft > 0) {
      if (step === 0) {
        this.synths.pad(time, chord.map(n => n + 12), barDuration * 2);
      }
      if (step === 6 && Math.random() < 0.6) {
        const passing = chord[0] - 12 + (Math.random() < 0.5 ? 5 : 7);
        this.synths.bass(time, passing, this.stepDuration * 2.5);
      }
      if (step === 14 || step === 15) this.synths.snare(time);
    }
  }
}
