import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/runtime/colors';
import { KEYS } from '../src/runtime/keys';
import { holding, pressing } from '../src/runtime/input';
import { Machine, runHeadless } from '../src/runtime/machine';
import { RaylibHost } from '../src/runtime/raylib';
import { compile } from '../src/lang/compile';

const GAME = `#include "raylib.h"
int main(void) {
    InitWindow(320, 200, "Prova");
    int x = 10;
    while (!WindowShouldClose()) {
        if (IsKeyDown(KEY_W)) { x = x + 1; }
        if (IsKeyPressed(KEY_SPACE)) { x = 100; }
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(x, 20, 30, 40, RED);
        EndDrawing();
    }
    CloseWindow();
    return 0;
}`;

describe('Machine', () => {
  it('produces one draw list per frame', () => {
    const r = runHeadless(GAME, { frames: 2 });
    expect(r.status).toBe('running');
    expect(r.frames[0]).toEqual([
      { op: 'clear', color: COLORS.BLACK },
      { op: 'rect', x: 10, y: 20, w: 30, h: 40, color: COLORS.RED },
    ]);
    expect(r.machine?.host.width).toBe(320);
    expect(r.machine?.host.height).toBe(200);
  });

  it('reads held and pressed keys', () => {
    const held = runHeadless(GAME, { frames: 3, input: () => holding(KEYS.KEY_W) });
    expect(held.frames.map((f) => (f[1] as { x: number }).x)).toEqual([11, 12, 13]);
    const pressed = runHeadless(GAME, { frames: 2, input: (i) => (i === 0 ? pressing(KEYS.KEY_SPACE) : holding()) });
    expect(pressed.frames.map((f) => (f[1] as { x: number }).x)).toEqual([100, 100]);
  });

  it('finishes when the window is asked to close', () => {
    const r = runHeadless(GAME, { frames: 1 });
    r.machine!.requestClose();
    expect(r.machine!.runFrame()).toEqual({ status: 'finished' });
    expect(r.machine!.done).toBe(true);
  });

  it('finishes programs without a game loop', () => {
    expect(runHeadless('int main(void) { return 0; }', { frames: 1 }).status).toBe('finished');
  });

  it('requires InitWindow before drawing', () => {
    const r = runHeadless('int main(void) {\nBeginDrawing();\nreturn 0;\n}', { frames: 1 });
    expect(r).toMatchObject({ status: 'error', diagnostic: { code: 'NO_WINDOW', line: 2, params: { name: 'BeginDrawing' } } });
  });

  it('points at the game loop when EndDrawing is missing', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nwhile (!WindowShouldClose()) {\nBeginDrawing();\n}\nreturn 0;\n}';
    expect(runHeadless(src, { frames: 1 })).toMatchObject({ status: 'error', diagnostic: { code: 'LOOP_TOO_LONG', line: 3 } });
  });

  it('blames the frame loop, not an inner for, when EndDrawing is missing', () => {
    const src = [
      'int main(void) {',
      'InitWindow(800, 450, "x");',
      'while (!WindowShouldClose())', // line 3
      '{',
      'BeginDrawing();',
      'ClearBackground(BLACK);',
      'for (int y = 0; y < 450; y += 30)',
      '{',
      'DrawRectangle(398, y, 4, 15, WHITE);',
      '}',
      '}',
      'return 0;',
      '}',
    ].join('\n');
    expect(runHeadless(src, { frames: 1 })).toMatchObject({ status: 'error', diagnostic: { code: 'LOOP_TOO_LONG', line: 3 } });
  });

  it('turns internal failures into an error instead of throwing', () => {
    const host = new RaylibHost({ seed: 1 });
    const compiled = compile('int main(void) {\nInitWindow(100, 100, "x");\nBeginDrawing();\nDrawText("hola", 0, 0, 10, RED);\nEndDrawing();\nreturn 0;\n}', host);
    if (!compiled.ok) throw new Error('compile');
    host.functions.DrawText.call = () => { throw new Error('boom'); };
    const machine = new Machine(compiled.program, host);
    expect(machine.runFrame()).toMatchObject({ status: 'error', diagnostic: { code: 'INTERNAL_ERROR', line: 4 } });
    expect(machine.done).toBe(true);
  });

  it('formats text and draws it', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nBeginDrawing();\nDrawText(TextFormat("Punts: %d - %.1f", 7, 3.14159), 5, 6, 20, GOLD);\nEndDrawing();\nreturn 0;\n}';
    const r = runHeadless(src, { frames: 1 });
    expect(r.frames[0]).toEqual([{ op: 'text', text: 'Punts: 7 - 3.1', x: 5, y: 6, size: 20, color: COLORS.GOLD }]);
  });

  it('gives deterministic random values within range for a seed', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nwhile (!WindowShouldClose()) {\nBeginDrawing();\nDrawCircle(GetRandomValue(1, 6), 0, 1.5, RED);\nEndDrawing();\n}\nreturn 0;\n}';
    const xs = (seed: number) => runHeadless(src, { frames: 50, seed }).frames.map((f) => (f[0] as { x: number }).x);
    expect(xs(42)).toEqual(xs(42));
    expect(xs(42).every((x) => x >= 1 && x <= 6)).toBe(true);
    expect(new Set(xs(42)).size).toBeGreaterThan(3);
  });

  it('returns compile errors', () => {
    expect(runHeadless('int main(void) { int x = 5 }', { frames: 1 })).toMatchObject({ status: 'error', diagnostic: { code: 'MISSING_SEMICOLON' } });
  });
});
