/**
 * Dark trip-hop synthesis — deep sub-bass, cavernous drums, ominous pads.
 */

function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class TripHopSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private crackleSource: AudioBufferSourceNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 1800;
    this.masterFilter.Q.value = 1.0;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.25);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000;
    bp.Q.value = 0.8;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.2, time);
    nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    noise.connect(bp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.35);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(160, time);
    body.frequency.exponentialRampToValueAtTime(60, time + 0.08);
    bGain.gain.setValueAtTime(0.35, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.15);
  }

  hihat(time: number, duration = 0.06): void {
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 9000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(lp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  pad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const freq = mtof(note);
      for (const detune of [-10, 0, 10]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 800;
        lp.Q.value = 2.0;

        const gain = this.ctx.createGain();
        const attack = Math.min(0.8, duration * 0.3);
        const release = Math.min(0.6, duration * 0.2);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.025, time + attack);
        gain.gain.setValueAtTime(0.025, time + duration - release);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(lp).connect(gain).connect(this.masterFilter);
        osc.start(time);
        osc.stop(time + duration + 0.01);
      }
    }
  }

  bass(time: number, note: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = mtof(note);

    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
    }
    shaper.curve = curve;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.04);
    gain.gain.setValueAtTime(0.35, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(shaper).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  startDrone(note: number, output: AudioNode): void {
    this.stopDrone();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = mtof(note) / 2;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    lp.Q.value = 1.0;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.06;
    osc.connect(lp).connect(gain).connect(output);
    osc.start();
    this.droneOsc = osc;
  }

  stopDrone(): void {
    this.droneOsc?.stop();
    this.droneOsc = null;
  }

  startCrackle(output: AudioNode): void {
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() < 0.001
        ? (Math.random() - 0.5) * 0.6
        : (Math.random() - 0.5) * 0.02;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.3;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.12;
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
    this.stopDrone();
    this.masterFilter.disconnect();
  }
}
