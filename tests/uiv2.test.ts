import { describe, expect, it } from 'vitest';
import { feedbackFor } from '../src/lessons/feedback';
import { hintsInRange } from '../src/editor/paramHints';
import { INTRO_BEATS, IntroPlayer, shouldShowIntro } from '../src/ui/intro';
import type { Evaluation } from '../src/lessons/checks';

describe('feedbackFor', () => {
  it('says nothing before a run', () => {
    expect(feedbackFor(null)).toBeNull();
  });
  it('celebrates a pass', () => {
    expect(feedbackFor({ kind: 'checked', passed: true, results: [{ key: 'a', ok: true }] })).toEqual({ kind: 'success' });
  });
  it('names only the first failing check', () => {
    const r: Evaluation = { kind: 'checked', passed: false, results: [{ key: 'a', ok: true }, { key: 'b', ok: false }, { key: 'c', ok: false }] };
    expect(feedbackFor(r)).toEqual({ kind: 'almost', key: 'b' });
  });
  it('passes errors through', () => {
    const diagnostic = { code: 'MISSING_SEMICOLON', params: {}, line: 3, col: 1, severity: 'error' } as const;
    expect(feedbackFor({ kind: 'compile-error', diagnostic })).toEqual({ kind: 'compile-error', diagnostic });
  });
});

describe('hintsInRange', () => {
  it('keeps only the hints inside the editable zone', () => {
    const hints = [{ pos: 5, label: 'x:' }, { pos: 20, label: 'y:' }, { pos: 40, label: 'z:' }];
    expect(hintsInRange(hints, 10, 30)).toEqual([{ pos: 20, label: 'y:' }]);
    expect(hintsInRange(hints, 5, 40)).toHaveLength(3);
  });
});

describe('intro', () => {
  it('shows on a first visit to the front page, or when asked', () => {
    expect(shouldShowIntro('', false)).toBe(true);
    expect(shouldShowIntro('#/', false)).toBe(true);
    expect(shouldShowIntro('', true)).toBe(false);
    expect(shouldShowIntro('#/pong/0/0', false)).toBe(false);
    expect(shouldShowIntro('#/intro', true)).toBe(true);
  });

  it('waits for a key on the first beat, then plays the rest on its own', () => {
    const p = new IntroPlayer();
    expect(p.beat).toBe(0);
    p.tick(60_000);
    expect(p.beat).toBe(0);
    expect(p.lightsOn).toBe(false);
    p.press();
    expect(p.lightsOn).toBe(true);
    p.tick(INTRO_BEATS[0].ms);
    expect(p.beat).toBe(1);
    for (let i = 1; i < INTRO_BEATS.length - 1; i++) p.tick(INTRO_BEATS[i].ms);
    expect(p.beat).toBe(INTRO_BEATS.length - 1);
    p.tick(60_000);
    expect(p.beat).toBe(INTRO_BEATS.length - 1);
    expect(p.atEnd).toBe(true);
  });

  it('a press later on jumps to the next beat, but not right after a beat starts', () => {
    const p = new IntroPlayer();
    p.press();
    p.press();
    expect(p.beat).toBe(1);
    p.press();
    expect(p.beat).toBe(1);
    p.tick(1300);
    p.press();
    expect(p.beat).toBe(2);
  });
});
