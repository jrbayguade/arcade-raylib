import type { ColorValue } from '../lang/host';
import type { DrawCommand } from '../runtime/drawList';

export function cssColor(c: ColorValue): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
}

/** Paints a frame exactly as raylib would (no neon effects: those belong to the arcade frame around the canvas). */
export function renderFrame(ctx: CanvasRenderingContext2D, cmds: readonly DrawCommand[]): void {
  for (const c of cmds) {
    switch (c.op) {
      case 'clear':
        ctx.fillStyle = cssColor(c.color);
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        break;
      case 'rect':
        ctx.fillStyle = cssColor(c.color);
        ctx.fillRect(c.x, c.y, c.w, c.h);
        break;
      case 'circle':
        ctx.fillStyle = cssColor(c.color);
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.strokeStyle = cssColor(c.color);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.x1 + 0.5, c.y1 + 0.5);
        ctx.lineTo(c.x2 + 0.5, c.y2 + 0.5);
        ctx.stroke();
        break;
      case 'text':
        ctx.fillStyle = cssColor(c.color);
        ctx.font = `${c.size}px monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(c.text, c.x, c.y);
        break;
    }
  }
}
