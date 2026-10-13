import { describe, expect, it } from 'vitest';
import { H, PAD, W, newMiniPong, stepMiniPong } from '../src/ui/miniPong';

describe('intro mini pong', () => {
  it('the ball always meets a paddle and never leaves the screen', () => {
    const s = newMiniPong(7);
    let hits = 0;
    for (let i = 0; i < 20000; i++) {
      const before = s.vx;
      stepMiniPong(s);
      if (Math.sign(s.vx) !== Math.sign(before)) {
        hits++;
        // The bounce happens on a paddle: the ball's centre is within the paddle's height.
        const pad = s.vx > 0 ? s.left : s.right;
        expect(s.y).toBeGreaterThanOrEqual(pad - PAD.h / 2 - s.r);
        expect(s.y).toBeLessThanOrEqual(pad + PAD.h / 2 + s.r);
      }
      expect(s.x).toBeGreaterThan(PAD.x);
      expect(s.x).toBeLessThan(W - PAD.x);
      expect(s.y).toBeGreaterThanOrEqual(s.r);
      expect(s.y).toBeLessThanOrEqual(H - s.r);
    }
    expect(hits).toBeGreaterThan(50);
  });

  it('the paddles stay on screen', () => {
    const s = newMiniPong(3);
    for (let i = 0; i < 20000; i++) {
      stepMiniPong(s);
      for (const p of [s.left, s.right]) {
        expect(p - PAD.h / 2).toBeGreaterThanOrEqual(0);
        expect(p + PAD.h / 2).toBeLessThanOrEqual(H);
      }
    }
  });

  it('the rally is not always the same line', () => {
    const s = newMiniPong(5);
    const ys = new Set<number>();
    for (let i = 0; i < 5000; i++) { stepMiniPong(s); if (s.x > W / 2 - 1 && s.x < W / 2 + 1) ys.add(Math.round(s.y / 5)); }
    expect(ys.size).toBeGreaterThan(3);
  });
});
