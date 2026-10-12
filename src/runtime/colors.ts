import type { ColorValue } from '../lang/host';

const rgb = (r: number, g: number, b: number): ColorValue => ({ r, g, b, a: 255 });

/** Same RGBA values as raylib.h (5.5). */
export const COLORS: Record<string, ColorValue> = {
  LIGHTGRAY: rgb(200, 200, 200),
  GRAY: rgb(130, 130, 130),
  DARKGRAY: rgb(80, 80, 80),
  YELLOW: rgb(253, 249, 0),
  GOLD: rgb(255, 203, 0),
  ORANGE: rgb(255, 161, 0),
  PINK: rgb(255, 109, 194),
  RED: rgb(230, 41, 55),
  GREEN: rgb(0, 228, 48),
  LIME: rgb(0, 158, 47),
  SKYBLUE: rgb(102, 191, 255),
  BLUE: rgb(0, 121, 241),
  PURPLE: rgb(200, 122, 255),
  WHITE: rgb(255, 255, 255),
  BLACK: rgb(0, 0, 0),
  RAYWHITE: rgb(245, 245, 245),
};
