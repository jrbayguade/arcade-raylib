/** raylib key codes (KeyboardKey enum in raylib.h). */
export const KEYS: Record<string, number> = {
  KEY_SPACE: 32,
  KEY_W: 87,
  KEY_S: 83,
  KEY_ENTER: 257,
  KEY_DOWN: 264,
  KEY_UP: 265,
};

/** KeyboardEvent.code → raylib key code. */
export const BROWSER_KEYS: Record<string, number> = {
  Space: 32,
  KeyW: 87,
  KeyS: 83,
  Enter: 257,
  NumpadEnter: 257,
  ArrowDown: 264,
  ArrowUp: 265,
};
