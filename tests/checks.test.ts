import { describe, expect, it } from 'vitest';
import { argIsVar, assignmentsTo, callsOf, check, circles, declares, evaluate, history, simulate, texts, variable, visibleRects } from '../src/lessons/checks';

const game = (draw: string, setup = '') => `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
${setup}
    while (!WindowShouldClose()) {
        BeginDrawing();
${draw}
        EndDrawing();
    }
    CloseWindow();
    return 0;
}
`;

describe('evaluate', () => {
  it('reports compile errors', () => {
    expect(evaluate(game('DrawRectangle(1, 2, 3, 4, RED)'), [])).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'MISSING_SEMICOLON' } });
  });

  it('reports runtime errors such as endless loops and division by zero', () => {
    expect(evaluate(game('int i = 0;\nwhile (i >= 0) { i = 1; }'), [])).toMatchObject({ kind: 'runtime-error', diagnostic: { code: 'LOOP_TOO_LONG' } });
    expect(evaluate(game('int z = 0;\nint w = 5 / z;'), [])).toMatchObject({ kind: 'runtime-error', diagnostic: { code: 'DIVISION_BY_ZERO' } });
  });

  it('runs the checks on the last frame', () => {
    const src = game('ClearBackground(BLACK);\nDrawRectangle(20, palaY, 10, 80, WHITE);', '    int palaY = 50;');
    const r = evaluate(src, [
      check('up', (ctx) => visibleRects(ctx).some((r) => r.x === 20 && r.y === 50)),
      check('down', (ctx) => visibleRects(ctx).some((r) => r.y === 300)),
      check('var', (ctx) => variable(ctx, 'palaY') === 50),
    ]);
    expect(r).toEqual({ kind: 'checked', passed: false, results: [
      { key: 'up', ok: true }, { key: 'down', ok: false }, { key: 'var', ok: true },
    ] });
  });

  it('counts a check that throws as failed', () => {
    const r = evaluate(game('ClearBackground(BLACK);'), [check('boom', () => { throw new Error('x'); })]);
    expect(r).toMatchObject({ kind: 'checked', passed: false, results: [{ key: 'boom', ok: false }] });
  });

  it('uses the last frame of a program without a game loop', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nBeginDrawing();\nDrawCircle(5, 6, 2, RED);\nEndDrawing();\nreturn 0;\n}\n';
    expect(evaluate(src, [check('c', (ctx) => circles(ctx).length === 1)])).toMatchObject({ passed: true });
  });
});

describe('helpers', () => {
  it('only sees what is drawn after the last clear', () => {
    const r = evaluate(game('DrawRectangle(1, 1, 5, 5, RED);\nClearBackground(BLACK);\nDrawRectangle(2, 2, 5, 5, RED);'), [
      check('visible', (ctx) => visibleRects(ctx).length === 1 && visibleRects(ctx)[0].x === 2),
    ]);
    expect(r).toMatchObject({ passed: true });
  });

  it('inspects declarations and call arguments in the code', () => {
    const src = game('int alcada = 120;\nDrawRectangle(20, 10, 10, alcada, WHITE);\nDrawRectangle(770, 10, 10, 80, WHITE);');
    const r = evaluate(src, [
      check('declares', (ctx) => declares(ctx.program, 'alcada', 'int')),
      check('notFloat', (ctx) => !declares(ctx.program, 'alcada', 'float')),
      check('twoCalls', (ctx) => callsOf(ctx.program, 'DrawRectangle').length === 2),
      check('firstUsesVar', (ctx) => argIsVar(callsOf(ctx.program, 'DrawRectangle')[0], 3, 'alcada')),
      check('secondDoesNot', (ctx) => !argIsVar(callsOf(ctx.program, 'DrawRectangle')[1], 3, 'alcada')),
    ]);
    expect(r).toMatchObject({ passed: true });
  });
});

describe('simulate: the same program in another situation', () => {
  const program = `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    int y = 100;
    while (!WindowShouldClose()) {
        if (IsKeyDown(KEY_W)) { y = y - 2; }
        if (IsKeyDown(KEY_S)) { y = y + 2; }
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(20, y, 10, 80, WHITE);
        EndDrawing();
    }
    return 0;
}
`;
  it('runs the checked program again with other keys and frame counts', () => {
    const seen: number[] = [];
    const r = evaluate(program, [check('both', (ctx) => {
      seen.push(variable(simulate(ctx, { frames: 10, hold: ['KEY_W'] })!, 'y')!);
      seen.push(variable(simulate(ctx, { frames: 10, hold: ['KEY_S'] })!, 'y')!);
      seen.push(variable(simulate(ctx, { frames: 5 })!, 'y')!);
      return true;
    })]);
    expect(r).toMatchObject({ passed: true });
    expect(seen).toEqual([80, 120, 100]);
  });
  it('gives null when the program fails at run time in that situation', () => {
    const crash = program.replace('y = y + 2;', 'y = y / 0;');
    let got: unknown = 'unset';
    evaluate(crash, [check('c', (ctx) => { got = simulate(ctx, { frames: 3, hold: ['KEY_S'] }); return true; })]);
    expect(got).toBeNull();
  });
});

describe('simulate: keys held for a few frames only', () => {
  it('releases the keys after holdFor frames', () => {
    const program = `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    int y = 100;
    while (!WindowShouldClose()) {
        if (IsKeyDown(KEY_W)) { y = y - 2; }
        BeginDrawing();
        EndDrawing();
    }
    return 0;
}
`;
    let y: number | undefined;
    evaluate(program, [check('c', (ctx) => { y = variable(simulate(ctx, { frames: 10, hold: ['KEY_W'], holdFor: 3 })!, 'y'); return true; })]);
    expect(y).toBe(94);
  });
});

describe('history: a variable frame by frame', () => {
  it('gives the value after every frame', () => {
    const program = `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    int x = 0;
    while (!WindowShouldClose()) {
        x = x + 3;
        BeginDrawing();
        EndDrawing();
    }
    return 0;
}
`;
    let xs: number[] = [];
    evaluate(program, [check('c', (ctx) => { xs = history(ctx, { frames: 4 }, 'x'); return true; })]);
    expect(xs).toEqual([3, 6, 9, 12]);
  });
});

describe('helpers for counters and text', () => {
  const program = `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    int punts = 0;
    while (!WindowShouldClose()) {
        if (punts < 3) { punts++; }
        punts += 0;
        BeginDrawing();
        ClearBackground(BLACK);
        DrawText(TextFormat("%d", punts), 440, 20, 40, WHITE);
        EndDrawing();
    }
    return 0;
}
`;
  it('finds every change made to a variable, in any form', () => {
    let ops: string[] = [];
    evaluate(program, [check('c', (ctx) => { ops = assignmentsTo(ctx.program, 'punts').map((s) => s.op); return true; })]);
    expect(ops).toEqual(['++', '+=']);
  });
  it('lists the texts drawn in the last frame', () => {
    let drawn: { text: string; x: number }[] = [];
    evaluate(program, [check('c', (ctx) => { drawn = texts(ctx); return true; })], { frames: 5 });
    expect(drawn).toMatchObject([{ text: '3', x: 440 }]);
  });
});
