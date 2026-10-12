export interface TypingSpeed {
  charsPerSecond: number;
  /** Pause after a finished page before the next one starts: base + per character of that page. */
  pauseBaseMs: number;
  pausePerCharMs: number;
}

export const BIT_SPEED: TypingSpeed = { charsPerSecond: 40, pauseBaseMs: 1200, pausePerCharMs: 35 };

/** Types pages one character at a time; finished pages wait, then give way to the next. The last page stays. */
export class Typewriter {
  private readonly pages: string[][];
  private index = 0;
  private shown = 0;
  private typingMs = 0;
  private pausedMs = 0;

  constructor(pages: string[], private readonly speed: TypingSpeed = BIT_SPEED) {
    this.pages = pages.length ? pages.map((p) => Array.from(p)) : [[]];
  }

  get page(): number { return this.index; }
  get pageCount(): number { return this.pages.length; }
  get isLastPage(): boolean { return this.index === this.pages.length - 1; }
  get text(): string { return this.pages[this.index].slice(0, this.shown).join(''); }
  get pageComplete(): boolean { return this.shown >= this.pages[this.index].length; }
  get finished(): boolean { return this.isLastPage && this.pageComplete; }

  tick(ms: number): void {
    if (this.finished) return;
    const chars = this.pages[this.index];
    if (!this.pageComplete) {
      if (!Number.isFinite(this.speed.charsPerSecond)) {
        this.shown = chars.length;
        return;
      }
      const perChar = 1000 / this.speed.charsPerSecond;
      this.typingMs += ms;
      const n = Math.floor(this.typingMs / perChar);
      this.typingMs -= n * perChar;
      this.shown = Math.min(chars.length, this.shown + n);
      return;
    }
    this.pausedMs += ms;
    if (this.pausedMs >= this.speed.pauseBaseMs + this.speed.pausePerCharMs * chars.length) this.next();
  }

  /** A click: finish the page being typed, or go straight to the next one. */
  skip(): void {
    if (!this.pageComplete) {
      this.shown = this.pages[this.index].length;
      this.pausedMs = 0;
    } else {
      this.next();
    }
  }

  goTo(page: number): void {
    this.index = Math.min(Math.max(page, 0), this.pages.length - 1);
    this.shown = this.pages[this.index].length;
    this.typingMs = 0;
    this.pausedMs = 0;
  }

  restart(): void {
    this.index = 0;
    this.shown = 0;
    this.typingMs = 0;
    this.pausedMs = 0;
  }

  private next(): void {
    if (this.isLastPage) return;
    this.index++;
    this.shown = 0;
    this.typingMs = 0;
    this.pausedMs = 0;
  }
}
