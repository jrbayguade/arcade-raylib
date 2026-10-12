export interface InputState {
  /** Keys held down during this frame. */
  down: ReadonlySet<number>;
  /** Keys that went down since the previous frame. */
  pressed: ReadonlySet<number>;
}

export const NO_INPUT: InputState = { down: new Set(), pressed: new Set() };

export function holding(...codes: number[]): InputState {
  return { down: new Set(codes), pressed: new Set() };
}

export function pressing(...codes: number[]): InputState {
  return { down: new Set(codes), pressed: new Set(codes) };
}
