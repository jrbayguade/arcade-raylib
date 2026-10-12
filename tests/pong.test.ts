import { describe, expect, it } from 'vitest';
import pong from '../content/demo/pong.c?raw';
import { holding } from '../src/runtime/input';
import { KEYS } from '../src/runtime/keys';
import { runHeadless } from '../src/runtime/machine';
import type { DrawCommand } from '../src/runtime/drawList';

const rects = (f: DrawCommand[]) => f.filter((c) => c.op === 'rect') as Extract<DrawCommand, { op: 'rect' }>[];
const texts = (f: DrawCommand[]) => f.filter((c) => c.op === 'text') as Extract<DrawCommand, { op: 'text' }>[];

describe('Pong in mini-C', () => {
  it('compiles and draws the court', () => {
    const r = runHeadless(pong, { frames: 1 });
    expect(r.status).toBe('running');
    expect(r.frames[0].map((c) => c.op)).toEqual(['clear', 'line', 'rect', 'rect', 'circle', 'text', 'text']);
  });

  it('moves the ball every frame', () => {
    const r = runHeadless(pong, { frames: 2 });
    const balls = r.frames.map((f) => f.find((c) => c.op === 'circle') as { x: number; y: number });
    expect(balls).toMatchObject([{ x: 405, y: 228 }, { x: 410, y: 231 }]);
  });

  it('moves the left paddle with W and keeps it on screen', () => {
    const ten = runHeadless(pong, { frames: 10, input: () => holding(KEYS.KEY_W) });
    expect(rects(ten.frames[9])[0].y).toBe(125);
    const many = runHeadless(pong, { frames: 100, input: () => holding(KEYS.KEY_W) });
    expect(rects(many.frames[99])[0].y).toBe(0);
  });

  it('moves the right paddle with the arrow keys', () => {
    const r = runHeadless(pong, { frames: 5, input: () => holding(KEYS.KEY_DOWN) });
    expect(rects(r.frames[4])[1].y).toBe(215);
  });

  it('scores when the ball passes a paddle', () => {
    const r = runHeadless(pong, { frames: 120 });
    expect(texts(r.frames[119]).map((t) => [t.text, t.x])).toEqual([['1', 340], ['0', 440]]);
  });
});
