export const FRAME_MS = 1000 / 60;
export const MAX_FRAMES_PER_TICK = 4;
const MAX_ELAPSED_MS = 250;

/** Converts display refreshes (requestAnimationFrame) into fixed 60 fps logic frames. */
export class FrameClock {
  private last: number | null = null;
  private pending = 0;

  tick(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    this.pending += Math.min(Math.max(now - this.last, 0), MAX_ELAPSED_MS);
    this.last = now;
    const frames = Math.floor(this.pending / FRAME_MS + 1e-6);
    this.pending = Math.max(this.pending - frames * FRAME_MS, 0);
    return Math.min(frames, MAX_FRAMES_PER_TICK);
  }
}
