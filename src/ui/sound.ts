/** 8-bit sound effects synthesised with Web Audio: no audio files, no licences. */

export type SoundName = 'click' | 'run' | 'success' | 'star' | 'error' | 'type' | 'hint' | 'next' | 'page';

interface Note {
  freq: number;
  /** Seconds. */
  dur: number;
  /** Start offset in seconds. */
  at?: number;
  type?: OscillatorType;
  vol?: number;
  /** Frequency at the end of the note (pitch slide). */
  slide?: number;
}

const C5 = 523, E5 = 659, G5 = 784, C6 = 1047, D5 = 587, A5 = 880, B5 = 988, E6 = 1319;

export const SOUNDS: Record<SoundName, Note[]> = {
  click: [{ freq: 660, dur: 0.04, type: 'square', vol: 0.12 }],
  run: [{ freq: 440, dur: 0.06, type: 'square' }, { freq: A5, dur: 0.09, at: 0.07, type: 'square' }],
  success: [
    { freq: C5, dur: 0.09, type: 'square' },
    { freq: E5, dur: 0.09, at: 0.09, type: 'square' },
    { freq: G5, dur: 0.09, at: 0.18, type: 'square' },
    { freq: C6, dur: 0.3, at: 0.27, type: 'square' },
  ],
  star: [{ freq: E6, dur: 0.14, type: 'triangle', slide: E6 * 1.33, vol: 0.2 }],
  error: [{ freq: 220, dur: 0.22, type: 'triangle', slide: 150, vol: 0.2 }],
  type: [{ freq: 1200, dur: 0.015, type: 'square', vol: 0.035 }],
  hint: [{ freq: B5, dur: 0.08, type: 'triangle' }, { freq: E6, dur: 0.12, at: 0.08, type: 'triangle' }],
  next: [{ freq: D5, dur: 0.07, type: 'square' }, { freq: A5, dur: 0.11, at: 0.07, type: 'square' }],
  page: [{ freq: G5, dur: 0.03, type: 'triangle', vol: 0.08 }],
};

interface ParamLike {
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
}
interface OscillatorLike {
  type: OscillatorType;
  frequency: ParamLike;
  connect(node: unknown): unknown;
  start(at: number): void;
  stop(at: number): void;
}
interface GainLike { gain: ParamLike; connect(node: unknown): unknown }
export interface AudioLike {
  currentTime: number;
  destination: unknown;
  state?: string;
  resume?(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const MUTED_KEY = 'bitarcade:muted';

export class SoundBoard {
  /** Called with the name of every sound actually played. */
  onPlay: ((name: SoundName) => void) | null = null;
  private ctx: AudioLike | null = null;
  private unlocked = false;
  private isMuted: boolean;

  constructor(private readonly makeContext: () => AudioLike | null, private readonly storage: StorageLike | null) {
    this.isMuted = storage?.getItem(MUTED_KEY) === '1';
  }

  get muted(): boolean { return this.isMuted; }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.storage?.setItem(MUTED_KEY, muted ? '1' : '0');
  }

  toggle(): void { this.setMuted(!this.isMuted); }

  /** Browsers only allow audio after a user gesture: call this from the first click or key press. */
  unlock(): void {
    this.unlocked = true;
    this.ctx ??= this.makeContext();
    if (this.ctx?.state === 'suspended') void this.ctx.resume?.();
  }

  play(name: SoundName, opts: { pitch?: number } = {}): boolean {
    if (this.isMuted || !this.unlocked || !this.ctx) return false;
    const ctx = this.ctx;
    const pitch = opts.pitch ?? 1;
    const t0 = ctx.currentTime + 0.01;
    for (const n of SOUNDS[name]) {
      const start = t0 + (n.at ?? 0);
      const end = start + n.dur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'square';
      osc.frequency.setValueAtTime(n.freq * pitch, start);
      if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide * pitch, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(n.vol ?? 0.15, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
    this.onPlay?.(name);
    return true;
  }
}

export const sounds = new SoundBoard(
  () => (typeof AudioContext === 'function' ? (new AudioContext() as unknown as AudioLike) : null),
  null, // sound is always on: no mute, and an old saved mute is ignored
);
