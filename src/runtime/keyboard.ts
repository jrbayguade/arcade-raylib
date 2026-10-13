import type { InputState } from './input';
import { BROWSER_KEYS } from './keys';

function keyCode(e: Event): number | undefined {
  const code = (e as KeyboardEvent).code;
  return Object.hasOwn(BROWSER_KEYS, code) ? BROWSER_KEYS[code] : undefined;
}

export class KeyboardInput {
  private down = new Set<number>();
  private pressed = new Set<number>();

  attach(target: EventTarget): () => void {
    const onDown = (e: Event) => {
      const k = keyCode(e);
      if (k === undefined) return;
      e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    };
    const onUp = (e: Event) => {
      const k = keyCode(e);
      if (k !== undefined) this.down.delete(k);
    };
    const onBlur = () => this.down.clear();
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    };
  }

  /** On-screen buttons (phones): held like a key until released. */
  press(code: number): void {
    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }

  release(code: number): void {
    this.down.delete(code);
  }

  /** Current state for one logic frame; "pressed" keys are consumed. */
  snapshot(): InputState {
    const state = { down: new Set(this.down), pressed: this.pressed };
    this.pressed = new Set();
    return state;
  }
}
