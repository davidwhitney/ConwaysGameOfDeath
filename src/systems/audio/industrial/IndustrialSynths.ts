function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class IndustrialSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private noiseSource: AudioBufferSourceNode | null = null;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 5000;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(output);
  }

  /** Pounding industrial kick — sine body + distorted click. */
  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.35);

    // Distorted transient
    const click = this.ctx.createOscillator();
    const dist = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i * 2) / 256 - 1) * 8);
    dist.curve = curve;
    const cGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 60;
    cGain.gain.setValueAtTime(0.2, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    click.connect(dist).connect(cGain).connect(this.masterFilter);
    click.start(time);
    click.stop(time + 0.04);
  }

  /** Metallic clang snare. */
  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.2);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4000;
    bp.Q.value = 3.0;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.35, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    noise.connect(bp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.2);

    // Metallic ring
    const ring = this.ctx.createOscillator();
    const rGain = this.ctx.createGain();
    ring.type = 'square';
    ring.frequency.value = 340;
    rGain.gain.setValueAtTime(0.2, time);
    rGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    ring.connect(rGain).connect(this.masterFilter);
    ring.start(time);
    ring.stop(time + 0.1);
  }

  /** Closed mechanical hi-hat. */
  hihat(time: number, duration = 0.03): void {
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
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  /** Distorted bass drone. */
  bass(time: number, note: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = mtof(note);

    const dist = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i * 2) / 256 - 1) * 12);
    dist.curve = curve;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    lp.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
    gain.gain.setValueAtTime(0.2, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(dist).connect(lp).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  /** Harsh, grinding synth stab. */
  stab(time: number, note: number, duration: number): void {
    const freq = mtof(note);
    for (const det of [-15, 0, 15]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.detune.value = det;

      const dist = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i * 2) / 256 - 1) * 6);
      dist.curve = curve;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3000, time);
      lp.frequency.exponentialRampToValueAtTime(400, time + duration);
      lp.Q.value = 4.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.setValueAtTime(0.06, time + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(dist).connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  /** Continuous machine noise texture. */
  startNoise(output: AudioNode): void {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() - 0.5) * 0.15;
      if (Math.random() < 0.005) data[i] += (Math.random() - 0.5) * 0.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000;
    bp.Q.value = 0.3;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(bp).connect(gain).connect(output);
    src.start();
    this.noiseSource = src;
  }

  stopNoise(): void {
    this.noiseSource?.stop();
    this.noiseSource = null;
  }

  stopAll(): void {
    this.stopNoise();
    this.masterFilter.disconnect();
  }
}
