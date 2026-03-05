function mtof(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class DnbSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private activeNodes: AudioNode[] = [];

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 7000;
    this.masterFilter.Q.value = 0.7;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  snare(time: number): void {
    // Noise layer
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
    nGain.gain.setValueAtTime(0.35, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    noise.connect(hp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.12);

    // Triangle body
    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(250, time);
    body.frequency.exponentialRampToValueAtTime(100, time + 0.04);
    bGain.gain.setValueAtTime(0.4, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.08);
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
    hp.frequency.value = 9000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  reese(time: number, note: number, duration: number): void {
    const freq = mtof(note);

    // Two detuned saws
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc1.detune.value = -15;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 15;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, time);
    lp.frequency.linearRampToValueAtTime(1200, time + duration * 0.4);
    lp.frequency.exponentialRampToValueAtTime(300, time + duration);
    lp.Q.value = 5;

    // Soft distortion
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.03);
    gain.gain.setValueAtTime(0.2, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(shaper).connect(gain).connect(this.masterFilter);
    osc1.start(time);
    osc1.stop(time + duration + 0.01);
    osc2.start(time);
    osc2.stop(time + duration + 0.01);
  }

  pad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      lp.Q.value = 0.5;

      const gain = this.ctx.createGain();
      const attack = Math.min(0.5, duration * 0.2);
      const release = Math.min(0.3, duration * 0.15);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + attack);
      gain.gain.setValueAtTime(0.03, time + duration - release);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  stab(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  stopAll(): void {
    for (const node of this.activeNodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    this.activeNodes = [];
    this.masterFilter.disconnect();
  }
}
