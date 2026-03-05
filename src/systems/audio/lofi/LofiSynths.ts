function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class LofiSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private crackleSource: AudioBufferSourceNode | null = null;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 2500;
    this.masterFilter.Q.value = 0.7;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.15);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 1.5;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    noise.connect(bp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.15);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(180, time);
    body.frequency.exponentialRampToValueAtTime(80, time + 0.05);
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
    hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  chordPad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      for (const detune of [-6, 6]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1200;
        lp.Q.value = 0.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.15);
        gain.gain.setValueAtTime(0.04, time + duration - 0.2);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(lp).connect(gain).connect(this.masterFilter);
        osc.start(time);
        osc.stop(time + duration + 0.01);
      }
    }
  }

  bass(time: number, note: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = mtof(note);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.setValueAtTime(0.25, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  startCrackle(output: AudioNode): void {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() < 0.002 ? (Math.random() - 0.5) * 0.8 : 0;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;
    src.connect(bp).connect(gain).connect(output);
    src.start();
    this.crackleSource = src;
  }

  stopCrackle(): void {
    this.crackleSource?.stop();
    this.crackleSource = null;
  }

  stopAll(): void {
    this.stopCrackle();
    this.masterFilter.disconnect();
  }
}
