import { describe, expect, it } from 'vitest';
import { HALL_HASH, isHall, parseRoute, routeHash } from '../src/app/route';

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
  it('knows the hall: #/sala, and the bare address once the intro was seen', () => {
    expect(isHall('#/sala')).toBe(true);
    expect(isHall('')).toBe(true);
    expect(isHall('#/')).toBe(true);
    expect(isHall('#/pong/0/0')).toBe(false);
    expect(isHall('#/intro')).toBe(false);
    expect(HALL_HASH).toBe('#/sala');
  });
  it('writes the hash', () => {
    expect(routeHash({ lesson: 1, step: 2 })).toBe('#/pong/1/2');
  });
});
