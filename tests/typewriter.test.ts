import { describe, expect, it } from 'vitest';
import { Typewriter } from '../src/ui/typewriter';
import { burst, stepParticles } from '../src/ui/particles';
import { promptPages } from '../src/lessons/model';

const speed = { charsPerSecond: 10, pauseBaseMs: 1000, pausePerCharMs: 100 };

describe('Typewriter', () => {
  it('types page by page at the given speed', () => {
    const tw = new Typewriter(['Hola!', 'Adeu'], speed);
    expect(tw.text).toBe('');
    tw.tick(250);
    expect(tw.text).toBe('Ho');
    tw.tick(300);
    expect(tw.text).toBe('Hola!');
    expect(tw.pageComplete).toBe(true);
  });

  it('pauses after a page (base + per char) and then moves on', () => {
    const tw = new Typewriter(['Hola!', 'Adeu'], speed);
    tw.tick(500);
    tw.tick(1400);
    expect(tw.page).toBe(0);
    tw.tick(200);
    expect(tw.page).toBe(1);
    expect(tw.text).toBe('');
  });

  it('keeps the last page on screen', () => {
    const tw = new Typewriter(['A', 'Fi'], speed);
    for (let i = 0; i < 100; i++) tw.tick(100);
    expect(tw.page).toBe(1);
    expect(tw.text).toBe('Fi');
    expect(tw.finished).toBe(true);
  });

  it('counts an emoji as one character', () => {
    const tw = new Typewriter(['🤖ok'], speed);
    tw.tick(100);
    expect(tw.text).toBe('🤖');
  });

  it('skip finishes the page first, then jumps without waiting', () => {
    const tw = new Typewriter(['Hola!', 'Adeu'], speed);
    tw.tick(100);
    tw.skip();
    expect(tw.text).toBe('Hola!');
    tw.skip();
    expect(tw.page).toBe(1);
    expect(tw.text).toBe('');
  });

  it('can go back to a page (shown whole) and restart', () => {
    const tw = new Typewriter(['Hola!', 'Adeu'], speed);
    tw.skip(); tw.skip(); tw.skip();
    tw.goTo(0);
    expect([tw.page, tw.text]).toEqual([0, 'Hola!']);
    tw.restart();
    expect([tw.page, tw.text]).toEqual([0, '']);
  });

  it('shows everything at once with an infinite speed (reduced motion)', () => {
    const tw = new Typewriter(['Hola!'], { ...speed, charsPerSecond: Infinity });
    tw.tick(16);
    expect(tw.text).toBe('Hola!');
  });
});

describe('particles', () => {
  const seeded = () => { let s = 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  it('bursts from the origin', () => {
    const ps = burst(50, { x: 100, y: 200 }, seeded());
    expect(ps).toHaveLength(50);
    expect(ps.every((p) => p.x === 100 && p.y === 200 && p.life > 0)).toBe(true);
  });
  it('moves, falls and disappears', () => {
    const [p] = burst(1, { x: 0, y: 0 }, seeded());
    const [q] = stepParticles([p], 100);
    expect(q.x).not.toBe(p.x);
    expect(q.vy).toBeGreaterThan(p.vy);
    expect(stepParticles([p], p.life + 1)).toEqual([]);
  });
});

describe('promptPages', () => {
  it('accepts one string or several pages', () => {
    expect(promptPages({ prompt: 'Hola' })).toEqual(['Hola']);
    expect(promptPages({ prompt: ['A', 'B'] })).toEqual(['A', 'B']);
  });
});
