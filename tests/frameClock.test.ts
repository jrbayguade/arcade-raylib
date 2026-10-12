import { describe, expect, it } from 'vitest';
import { FrameClock, MAX_FRAMES_PER_TICK } from '../src/runtime/frameClock';

function framesInOneSecond(hz: number): number {
  const clock = new FrameClock();
  let total = 0;
  for (let i = 0; i <= hz; i++) total += clock.tick((i * 1000) / hz);
  return total;
}

describe('FrameClock', () => {
  it('runs one frame immediately', () => {
    expect(new FrameClock().tick(1234)).toBe(1);
  });

  it('runs about 60 logic frames per second at any refresh rate', () => {
    for (const hz of [30, 60, 75, 120, 144]) {
      const n = framesInOneSecond(hz);
      expect(n, `${hz} Hz`).toBeGreaterThanOrEqual(59);
      expect(n, `${hz} Hz`).toBeLessThanOrEqual(62);
    }
  });

  it('does not try to catch up after a long pause', () => {
    const clock = new FrameClock();
    clock.tick(0);
    expect(clock.tick(5000)).toBe(MAX_FRAMES_PER_TICK);
  });
});
