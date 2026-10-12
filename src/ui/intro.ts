/** First-visit intro: when it shows and how its beats advance (the drawing lives in Intro.svelte). */

export const INTRO_KEY = 'bitarcade:intro-seen';

export interface IntroBeat { id: 'dark' | 'bit' | 'broken' | 'demo' | 'promise' | 'go'; ms: number }

/** How long each beat stays (the first one starts counting only once the lights are on; the last one waits). */
export const INTRO_BEATS: IntroBeat[] = [
  { id: 'dark', ms: 2500 },
  { id: 'bit', ms: 7000 },
  { id: 'broken', ms: 8500 },
  { id: 'demo', ms: 8500 },
  { id: 'promise', ms: 7500 },
  { id: 'go', ms: Infinity },
];

export function shouldShowIntro(hash: string, seen: boolean): boolean {
  if (hash === '#/intro') return true;
  return !seen && (hash === '' || hash === '#' || hash === '#/');
}

export class IntroPlayer {
  private index = 0;
  private elapsed = 0;
  private lights = false;

  get beat(): number { return this.index; }
  get id(): IntroBeat['id'] { return INTRO_BEATS[this.index].id; }
  get lightsOn(): boolean { return this.lights; }
  get atEnd(): boolean { return this.index === INTRO_BEATS.length - 1; }

  tick(ms: number): void {
    if (!this.lights || this.atEnd) return;
    this.elapsed += ms;
    if (this.elapsed >= INTRO_BEATS[this.index].ms) this.next();
  }

  /** A key or a tap: switches the lights on the first time, then hurries to the next beat. */
  press(): void {
    if (!this.lights) {
      this.lights = true;
      return;
    }
    this.next();
  }

  private next(): void {
    if (this.atEnd) return;
    this.index++;
    this.elapsed = 0;
  }
}
