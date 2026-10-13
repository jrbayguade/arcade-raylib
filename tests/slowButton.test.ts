import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/pong';

describe('🐢 slow motion button', () => {
  it('only shows from the lesson where things start to move (lesson 3)', () => {
    for (const l of LESSONS) expect([l.number, !!l.slowMotion]).toEqual([l.number, l.final || l.number >= 3]);
  });
});
