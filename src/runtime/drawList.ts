import type { ColorValue } from '../lang/host';

export type DrawCommand =
  | { op: 'clear'; color: ColorValue }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color: ColorValue }
  | { op: 'circle'; x: number; y: number; r: number; color: ColorValue }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; color: ColorValue }
  | { op: 'text'; text: string; x: number; y: number; size: number; color: ColorValue };
