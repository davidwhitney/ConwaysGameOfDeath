import type { MusicStyle } from '../MusicStyle';
import { TripHopSynths } from './TripHopSynths';
import { TripHopTheory } from './TripHopTheory';

const BPM = 63;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = STEPS_PER_BEAT * 4; // 16

const LOOK_AHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

const KICK_PATTERNS = [[0, 10], [0, 8], [0, 6, 10]];
const SNARE_PATTERNS = [[4, 12], [4, 14], [4]];
const HAT_PATTERNS = [[0, 4, 8, 12], [2, 6, 10, 14], [0, 2, 8, 10]];

export class TripHopStyle implements MusicStyle {
  private ctx: AudioContext;
  private synths: TripHopSynths;
  private theory: TripHopTheory;
  private stepDuration: number;

  private currentStep = 0;
  private nextStepTime = 0;
  private timerId = 0;
  private running = false;

  private chordIndex = 0;
  private progression: number[][] = [];
  private barCount = 0;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.stepDuration = 60 / BPM / STEPS_PER_BEAT;
    this.synths = new TripHopSynths(ctx, output);
    this.theory = new TripHopTheory();
    this.progression = this.theory.generateProgression();
    this.kickPattern = pick(KICK_PATTERNS);
    this.snarePattern = pick(SNARE_PATTERNS);
    this.hatPattern = pick(HAT_PATTERNS);
  }

  start(): void {
    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.barCount = 0;
    this.chordIndex = 0;
    this.synths.startCrackle(this.synths.masterFilter);
    this.synths.startDrone(this.progression[0][0], this.synths.masterFilter);
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
        if (this.barCount % 2 === 0 && Math.random() < 0.25) {
          this.kickPattern = pick(KICK_PATTERNS);
          this.snarePattern = pick(SNARE_PATTERNS);
          this.hatPattern = pick(HAT_PATTERNS);
        }
        if (this.barCount % this.progression.length === 0 && Math.random() < 0.35) {
          this.progression = this.theory.generateProgression();
          this.synths.startDrone(this.progression[0][0], this.synths.masterFilter);
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

    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.hatPattern.includes(step)) this.synths.hihat(time, step % 4 === 2 ? 0.12 : 0.06);

    if (step === 0 && this.chordIndex % 2 === 0) {
      this.synths.pad(time, chord, barDuration * 2);
    }
    if (step === 0) {
      this.synths.bass(time, chord[0] - 12, barDuration * 0.9);
    }
    if (step === 10 && Math.random() < 0.4) {
      this.synths.bass(time, chord[0] - 24, this.stepDuration * 2);
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
