import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROTATE_QUERY, rotateRequired } from '../src/ui/motion';

afterEach(() => vi.unstubAllGlobals());

describe('rotateRequired', () => {
  it('uses the same media query as the rotate overlay', () => {
    expect(ROTATE_QUERY).toBe('(orientation: portrait) and (pointer: coarse)');
  });
  it('is true only while a touch screen is held upright', () => {
    let upright = true;
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === ROTATE_QUERY && upright }));
    expect(rotateRequired()).toBe(true);
    upright = false;
    expect(rotateRequired()).toBe(false);
  });
  it('is false where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(rotateRequired()).toBe(false);
  });
});
