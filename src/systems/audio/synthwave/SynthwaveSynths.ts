function mtof(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class SynthwaveSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private activeNodes: AudioNode[] = [];

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 6000;
    this.masterFilter.Q.value = 0.7;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.15);
    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.18);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3500;
    bp.Q.value = 1.2;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    noise.connect(bp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.18);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(200, time);
    body.frequency.exponentialRampToValueAtTime(90, time + 0.06);
    bGain.gain.setValueAtTime(0.4, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.1);
  }

  hihat(time: number, duration = 0.05): void {
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  arp(time: number, note: number, duration: number): void {
    const freq = mtof(note);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.linearRampToValueAtTime(4000, time + duration * 0.3);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);
    filter.Q.value = 4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.gain.setValueAtTime(0.12, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(filter).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  pad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      for (const detune of [-8, 0, 8]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2000;
        lp.Q.value = 0.5;

        const gain = this.ctx.createGain();
        const attack = Math.min(0.6, duration * 0.25);
        const release = Math.min(0.4, duration * 0.15);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.03, time + attack);
        gain.gain.setValueAtTime(0.03, time + duration - release);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(lp).connect(gain).connect(this.masterFilter);
        osc.start(time);
        osc.stop(time + duration + 0.01);
      }
    }
  }

  bass(time: number, note: number, duration: number): void {
    const freq = mtof(note);

    // Saw oscillator
    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = freq;

    // Sub sine one octave below
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.setValueAtTime(0.25, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0, time);
    subGain.gain.linearRampToValueAtTime(0.2, time + 0.02);
    subGain.gain.setValueAtTime(0.2, time + duration * 0.7);
    subGain.gain.linearRampToValueAtTime(0, time + duration);

    saw.connect(gain).connect(this.masterFilter);
    sub.connect(subGain).connect(this.masterFilter);
    saw.start(time);
    saw.stop(time + duration + 0.01);
    sub.start(time);
    sub.stop(time + duration + 0.01);
  }

  stopAll(): void {
    for (const node of this.activeNodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    this.activeNodes = [];
    this.masterFilter.disconnect();
  }
}
