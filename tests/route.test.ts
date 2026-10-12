import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from '../src/app/route';

describe('routes', () => {
  it('reads lesson and step from the hash', () => {
    expect(parseRoute('#/pong/1/3', 2)).toEqual({ lesson: 1, step: 3 });
    expect(parseRoute('#/pong/1', 2)).toEqual({ lesson: 1, step: 0 });
  });
  it('falls back to the first lesson', () => {
    expect(parseRoute('', 2)).toEqual({ lesson: 0, step: 0 });
    expect(parseRoute('#/res', 2)).toEqual({ lesson: 0, step: 0 });
    expect(parseRoute('#/pong/9/1', 2)).toEqual({ lesson: 1, step: 1 });
  });
  it('writes the hash', () => {
    expect(routeHash({ lesson: 1, step: 2 })).toBe('#/pong/1/2');
  });
});
