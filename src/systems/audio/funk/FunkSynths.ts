function mtof(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class FunkSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 5000;
    this.masterFilter.Q.value = 0.7;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  snare(time: number, velocity = 1.0): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.1);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28 * velocity, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    noise.connect(hp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.1);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(220, time);
    body.frequency.exponentialRampToValueAtTime(100, time + 0.04);
    bGain.gain.setValueAtTime(0.35 * velocity, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.06);
  }

  hihat(time: number, duration = 0.04): void {
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
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  clav(time: number, note: number, duration: number, wahSpeed = 4): void {
    const freq = mtof(note);

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    // Resonant bandpass sweep — wah effect
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(800, time);
    bp.frequency.linearRampToValueAtTime(3000, time + duration * (0.3 / wahSpeed));
    bp.frequency.linearRampToValueAtTime(600, time + duration * 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.005);
    gain.gain.setValueAtTime(0.12, time + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(bp).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  bass(time: number, note: number, duration: number): void {
    const freq = mtof(note);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Envelope pop for slap-style
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2000, time);
    lp.frequency.exponentialRampToValueAtTime(400, time + 0.08);
    lp.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
    gain.gain.setValueAtTime(0.3, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(lp).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  pad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1000;
      lp.Q.value = 0.5;

      const gain = this.ctx.createGain();
      const attack = Math.min(0.4, duration * 0.2);
      const release = Math.min(0.3, duration * 0.15);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.02, time + attack);
      gain.gain.setValueAtTime(0.02, time + duration - release);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  stopAll(): void {
    this.masterFilter.disconnect();
  }
}
