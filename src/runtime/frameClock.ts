export const FRAME_MS = 1000 / 60;
export const MAX_FRAMES_PER_TICK = 4;
/** Slow motion: few enough frames per second to watch a variable change one frame at a time. */
export const SLOW_FPS = 3;
const MAX_ELAPSED_MS = 250;

/** Converts display refreshes (requestAnimationFrame) into fixed-rate logic frames (60 per second unless slowed down). */
export class FrameClock {
  private last: number | null = null;
  private pending = 0;
  private frameMs = FRAME_MS;

  setFps(fps: number): void {
    this.frameMs = 1000 / fps;
    this.pending = 0;
  }

  tick(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    this.pending += Math.min(Math.max(now - this.last, 0), MAX_ELAPSED_MS);
    this.last = now;
    const frames = Math.floor(this.pending / this.frameMs + 1e-6);
    this.pending = Math.max(this.pending - frames * this.frameMs, 0);
    return Math.min(frames, MAX_FRAMES_PER_TICK);
  }
}
