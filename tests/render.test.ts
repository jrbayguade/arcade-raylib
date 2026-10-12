import { describe, expect, it } from 'vitest';
import { cssColor, renderFrame } from '../src/render/canvas';
import { COLORS } from '../src/runtime/colors';

function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    canvas: { width: 800, height: 450 },
    set fillStyle(v: string) { calls.push(`fill=${v}`); },
    set strokeStyle(v: string) { calls.push(`stroke=${v}`); },
    set lineWidth(v: number) { calls.push(`lineWidth=${v}`); },
    set font(v: string) { calls.push(`font=${v}`); },
    set textBaseline(v: string) { calls.push(`baseline=${v}`); },
    fillRect: (...a: number[]) => calls.push(`fillRect(${a.join(',')})`),
    beginPath: () => calls.push('beginPath'),
    arc: (...a: number[]) => calls.push(`arc(${a.slice(0, 3).join(',')})`),
    fill: () => calls.push('fill'),
    moveTo: (...a: number[]) => calls.push(`moveTo(${a.join(',')})`),
    lineTo: (...a: number[]) => calls.push(`lineTo(${a.join(',')})`),
    stroke: () => calls.push('stroke'),
    fillText: (t: string, x: number, y: number) => calls.push(`fillText(${t},${x},${y})`),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('renderFrame', () => {
  it('converts colors to CSS', () => {
    expect(cssColor({ r: 1, g: 2, b: 3, a: 255 })).toBe('rgba(1, 2, 3, 1)');
  });

  it('paints every command type', () => {
    const { ctx, calls } = fakeContext();
    renderFrame(ctx, [
      { op: 'clear', color: COLORS.BLACK },
      { op: 'rect', x: 1, y: 2, w: 3, h: 4, color: COLORS.WHITE },
      { op: 'circle', x: 10, y: 20, r: 5, color: COLORS.RED },
      { op: 'line', x1: 0, y1: 0, x2: 10, y2: 0, color: COLORS.GRAY },
      { op: 'text', text: 'hola', x: 7, y: 8, size: 20, color: COLORS.GOLD },
    ]);
    expect(calls).toEqual([
      'fill=rgba(0, 0, 0, 1)', 'fillRect(0,0,800,450)',
      'fill=rgba(255, 255, 255, 1)', 'fillRect(1,2,3,4)',
      'fill=rgba(230, 41, 55, 1)', 'beginPath', 'arc(10,20,5)', 'fill',
      'stroke=rgba(130, 130, 130, 1)', 'lineWidth=1', 'beginPath', 'moveTo(0.5,0.5)', 'lineTo(10.5,0.5)', 'stroke',
      'fill=rgba(255, 203, 0, 1)', 'font=20px monospace', 'baseline=top', 'fillText(hola,7,8)',
    ]);
  });
});
