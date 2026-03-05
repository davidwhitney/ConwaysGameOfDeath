function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Hard-clip waveshaper for heavy distortion. */
function makeDistCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve as Float32Array<ArrayBuffer>;
}

export class DjentSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 4000;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(output);
  }

  /** Tight, punchy kick with click transient. */
  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.25);

    // Click transient
    const click = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 3500;
    cGain.gain.setValueAtTime(0.3, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
    click.connect(cGain).connect(this.masterFilter);
    click.start(time);
    click.stop(time + 0.02);
  }

  /** Tight snare with metallic ring. */
  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.4, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    noise.connect(hp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.12);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.value = 200;
    bGain.gain.setValueAtTime(0.5, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.08);
  }

  /** China/splash cymbal — bright, trashy. */
  hihat(time: number, duration = 0.04): void {
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 8000;
    bp.Q.value = 1.0;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(bp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  /** THE DJENT — heavily distorted, palm-muted power chord stab. */
  djent(time: number, note: number, duration: number): void {
    const freq = mtof(note);
    // Root + fifth (power chord)
    for (const mult of [1, 1.5]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq * mult;

      const dist = this.ctx.createWaveShaper();
      dist.curve = makeDistCurve(20);
      dist.oversample = '4x';

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      lp.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.setValueAtTime(0.12, time + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(dist).connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  /** Clean ambient pad for contrast. */
  cleanPad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = mtof(note + 12);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2000;
      const gain = this.ctx.createGain();
      const attack = Math.min(0.5, duration * 0.3);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + attack);
      gain.gain.setValueAtTime(0.03, time + duration - 0.3);
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
