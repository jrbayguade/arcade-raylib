import { describe, expect, it } from 'vitest';
import { allBallsOffScreen } from '../src/runtime/drawList';

const circle = (x: number, y: number) => ({ op: 'circle' as const, x, y, r: 8, color: { r: 255, g: 255, b: 0, a: 255 } });
const clear = { op: 'clear' as const, color: { r: 0, g: 0, b: 0, a: 255 } };

describe('allBallsOffScreen', () => {
  it('is false while a ball is visible, even partly', () => {
    expect(allBallsOffScreen([clear, circle(400, 225)], 800, 450)).toBe(false);
    expect(allBallsOffScreen([clear, circle(805, 225)], 800, 450)).toBe(false);
  });
  it('is true when every ball has left the screen', () => {
    expect(allBallsOffScreen([clear, circle(900, 225)], 800, 450)).toBe(true);
    expect(allBallsOffScreen([clear, circle(-20, 225), circle(400, 900)], 800, 450)).toBe(true);
  });
  it('is false when nothing round is drawn', () => {
    expect(allBallsOffScreen([clear], 800, 450)).toBe(false);
  });
  it('only looks at what was drawn after the last clear', () => {
    expect(allBallsOffScreen([circle(400, 225), clear, circle(900, 225)], 800, 450)).toBe(true);
  });
});
