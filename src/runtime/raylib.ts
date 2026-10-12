import type { ValueType } from '../lang/ast';
import { formatText, parseFormat } from '../lang/format';
import { NativeError, type ColorValue, type ConstantDef, type HostEnv, type NativeFunction, type Value } from '../lang/host';
import { COLORS } from './colors';
import type { DrawCommand } from './drawList';
import { NO_INPUT, type InputState } from './input';
import { KEYS } from './keys';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RaylibHost implements HostEnv {
  width = 800;
  height = 450;
  title = '';
  targetFps = 60;
  closeRequested = false;
  lastFrame: DrawCommand[] = [];
  readonly functions: Record<string, NativeFunction>;
  readonly constants: Record<string, ConstantDef> = {};

  private windowOpen = false;
  private drawing: DrawCommand[] = [];
  private frameDone = false;
  private input: InputState = NO_INPUT;
  private readonly random: () => number;

  constructor(opts: { seed?: number } = {}) {
    this.random = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 32));
    for (const [name, value] of Object.entries(COLORS)) this.constants[name] = { type: 'Color', value };
    for (const [name, value] of Object.entries(KEYS)) this.constants[name] = { type: 'int', value };
    this.functions = this.buildFunctions();
  }

  setInput(input: InputState): void {
    this.input = input;
  }

  takeFrameYield(): boolean {
    const done = this.frameDone;
    this.frameDone = false;
    return done;
  }

  private requireWindow(name: string): void {
    if (!this.windowOpen) throw new NativeError('NO_WINDOW', { name });
  }

  private draw(name: string, cmd: DrawCommand): undefined {
    this.requireWindow(name);
    this.drawing.push(cmd);
    return undefined;
  }

  private buildFunctions(): Record<string, NativeFunction> {
    const fn = (params: ValueType[], returns: ValueType, call: (a: Value[]) => Value | undefined, variadic = false): NativeFunction =>
      ({ params, returns, call, variadic });
    const n = (v: Value) => v as number;
    const c = (v: Value) => v as ColorValue;
    return {
      InitWindow: fn(['int', 'int', 'string'], 'void', ([w, h, title]) => {
        this.width = n(w);
        this.height = n(h);
        this.title = title as string;
        this.windowOpen = true;
        return undefined;
      }),
      SetTargetFPS: fn(['int'], 'void', ([fps]) => { this.targetFps = n(fps); return undefined; }),
      WindowShouldClose: fn([], 'bool', () => this.closeRequested),
      CloseWindow: fn([], 'void', () => { this.windowOpen = false; return undefined; }),
      GetScreenWidth: fn([], 'int', () => this.width),
      GetScreenHeight: fn([], 'int', () => this.height),
      BeginDrawing: fn([], 'void', () => {
        this.requireWindow('BeginDrawing');
        this.drawing = [];
        return undefined;
      }),
      EndDrawing: fn([], 'void', () => {
        this.requireWindow('EndDrawing');
        this.lastFrame = this.drawing;
        this.drawing = [];
        this.frameDone = true;
        return undefined;
      }),
      ClearBackground: fn(['Color'], 'void', ([color]) => this.draw('ClearBackground', { op: 'clear', color: c(color) })),
      DrawRectangle: fn(['int', 'int', 'int', 'int', 'Color'], 'void', ([x, y, w, h, color]) =>
        this.draw('DrawRectangle', { op: 'rect', x: n(x), y: n(y), w: n(w), h: n(h), color: c(color) })),
      DrawCircle: fn(['int', 'int', 'float', 'Color'], 'void', ([x, y, r, color]) =>
        this.draw('DrawCircle', { op: 'circle', x: n(x), y: n(y), r: n(r), color: c(color) })),
      DrawLine: fn(['int', 'int', 'int', 'int', 'Color'], 'void', ([x1, y1, x2, y2, color]) =>
        this.draw('DrawLine', { op: 'line', x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), color: c(color) })),
      DrawText: fn(['string', 'int', 'int', 'int', 'Color'], 'void', ([text, x, y, size, color]) =>
        this.draw('DrawText', { op: 'text', text: text as string, x: n(x), y: n(y), size: n(size), color: c(color) })),
      IsKeyDown: fn(['int'], 'bool', ([key]) => this.input.down.has(n(key))),
      IsKeyPressed: fn(['int'], 'bool', ([key]) => this.input.pressed.has(n(key))),
      GetRandomValue: fn(['int', 'int'], 'int', ([a, b]) => {
        let lo = n(a), hi = n(b);
        if (lo > hi) [lo, hi] = [hi, lo];
        return lo + Math.floor(this.random() * (hi - lo + 1));
      }),
      TextFormat: fn(['string'], 'string', ([fmt, ...values]) => {
        const parts = parseFormat(fmt as string);
        return Array.isArray(parts) ? formatText(parts, values) : (fmt as string);
      }, true),
    };
  }
}
