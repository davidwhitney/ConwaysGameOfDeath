import type { MusicStyle } from '../MusicStyle';
import { LofiSynths } from './LofiSynths';
import { LofiTheory } from './LofiTheory';

const BPM = 75;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = STEPS_PER_BEAT * 4; // 16

const LOOK_AHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

export class LofiStyle implements MusicStyle {
  private ctx: AudioContext;
  private synths: LofiSynths;
  private theory: LofiTheory;
  private stepDuration: number;

  private currentStep = 0;
  private nextStepTime = 0;
  private timerId = 0;
  private running = false;

  private chordIndex = 0;
  private progression: number[][] = [];
  private barCount = 0;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.stepDuration = 60 / BPM / STEPS_PER_BEAT;
    this.synths = new LofiSynths(ctx, output);
    this.theory = new LofiTheory();
    this.progression = this.theory.generateProgression();
  }

  start(): void {
    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.barCount = 0;
    this.chordIndex = 0;
    this.synths.startCrackle(this.synths.masterFilter);
    this.schedule();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timerId);
    this.synths.stopAll();
  }

  private schedule(): void {
    const lookAheadEnd = this.ctx.currentTime + LOOK_AHEAD_S;
    while (this.nextStepTime < lookAheadEnd) {
      this.playStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep++;
      if (this.currentStep >= STEPS_PER_BAR) {
        this.currentStep = 0;
        this.barCount++;
        this.chordIndex = (this.chordIndex + 1) % this.progression.length;
        if (this.barCount % this.progression.length === 0 && Math.random() < 0.3) {
          this.progression = this.theory.generateProgression();
        }
      }
    }
    if (this.running) {
      this.timerId = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
    }
  }

  private playStep(step: number, time: number): void {
    const chord = this.progression[this.chordIndex];
    const barDuration = this.stepDuration * STEPS_PER_BAR;

    // Kick on 1 and 3
    if (step === 0 || step === 8) this.synths.kick(time);
    // Snare on 2 and 4
    if (step === 4 || step === 12) this.synths.snare(time);
    // Hi-hat on 8ths
    if (step % 2 === 0) this.synths.hihat(time, (step === 2 || step === 10) ? 0.1 : 0.05);

    // Chord pad full bar
    if (step === 0) this.synths.chordPad(time, chord, barDuration);

    // Bass on 1 and 3
    if (step === 0 || step === 8) this.synths.bass(time, chord[0] - 12, this.stepDuration * 3);
    // Walking approach on beat 4
    if (step === 12) {
      const nextChord = this.progression[(this.chordIndex + 1) % this.progression.length];
      const walk = nextChord[0] - 12 + (Math.random() < 0.5 ? 2 : -1);
      this.synths.bass(time, walk, this.stepDuration * 2);
    }
  }
}
