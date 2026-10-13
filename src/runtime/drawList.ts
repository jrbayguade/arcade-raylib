import type { ColorValue } from '../lang/host';

export type DrawCommand =
  | { op: 'clear'; color: ColorValue }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color: ColorValue }
  | { op: 'circle'; x: number; y: number; r: number; color: ColorValue }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; color: ColorValue }
  | { op: 'text'; text: string; x: number; y: number; size: number; color: ColorValue };

/** True when the last frame drew balls and every one of them is completely outside the screen (it "got away"). */
export function allBallsOffScreen(frame: DrawCommand[], width: number, height: number): boolean {
  let start = 0;
  for (let i = frame.length - 1; i >= 0; i--) if (frame[i].op === 'clear') { start = i + 1; break; }
  const balls = frame.slice(start).filter((c) => c.op === 'circle');
  return balls.length > 0 && balls.every((c) => c.x + c.r < 0 || c.x - c.r > width || c.y + c.r < 0 || c.y - c.r > height);
}
