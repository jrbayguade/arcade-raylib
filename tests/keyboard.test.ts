import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../src/runtime/keyboard';
import { KEYS } from '../src/runtime/keys';

function key(type: 'keydown' | 'keyup', code: string, repeat = false) {
  return Object.assign(new Event(type, { cancelable: true }), { code, repeat });
}

describe('KeyboardInput', () => {
  it('tracks held keys and reports a press only once', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'KeyW'));
    target.dispatchEvent(key('keydown', 'KeyW', true));
    const first = kb.snapshot();
    expect([...first.down]).toEqual([KEYS.KEY_W]);
    expect([...first.pressed]).toEqual([KEYS.KEY_W]);
    const second = kb.snapshot();
    expect([...second.down]).toEqual([KEYS.KEY_W]);
    expect([...second.pressed]).toEqual([]);
    target.dispatchEvent(key('keyup', 'KeyW'));
    expect([...kb.snapshot().down]).toEqual([]);
  });

  it('keeps quick taps between frames', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'Space'));
    target.dispatchEvent(key('keyup', 'Space'));
    expect([...kb.snapshot().pressed]).toEqual([KEYS.KEY_SPACE]);
  });

  it('releases every key when focus is lost', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'ArrowUp'));
    target.dispatchEvent(new Event('blur'));
    expect([...kb.snapshot().down]).toEqual([]);
  });

  it('prevents the browser default only for game keys', () => {
    const target = new EventTarget();
    new KeyboardInput().attach(target);
    const arrow = key('keydown', 'ArrowDown');
    const letter = key('keydown', 'KeyQ');
    target.dispatchEvent(arrow);
    target.dispatchEvent(letter);
    expect(arrow.defaultPrevented).toBe(true);
    expect(letter.defaultPrevented).toBe(false);
  });

  it('can be detached', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    const detach = kb.attach(target);
    detach();
    target.dispatchEvent(key('keydown', 'KeyS'));
    expect([...kb.snapshot().down]).toEqual([]);
  });
});

describe('KeyboardInput on-screen buttons', () => {
  it('a held on-screen button counts as a held key until released', () => {
    const input = new KeyboardInput();
    input.press(87);
    expect(input.snapshot()).toMatchObject({ down: new Set([87]), pressed: new Set([87]) });
    expect(input.snapshot()).toMatchObject({ down: new Set([87]), pressed: new Set() });
    input.release(87);
    expect(input.snapshot().down.size).toBe(0);
  });
});
