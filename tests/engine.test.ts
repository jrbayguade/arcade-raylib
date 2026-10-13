import { describe, expect, it } from 'vitest';
import { check, visibleRects } from '../src/lessons/checks';
import { LessonEngine } from '../src/lessons/engine';
import type { Lesson } from '../src/lessons/model';

const source = (y: number) => `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(BLACK);
//@edit
        DrawRectangle(20, ${y}, 10, 80, WHITE);
//@end
        EndDrawing();
    }
    return 0;
}
`;

const lesson: Lesson = {
  id: 'test', number: 0,
  texts: {
    title: 'Prova',
    steps: { move: { prompt: 'Mou-la', hints: ['h1', 'h2', 'h3'] }, card: { prompt: 'Mira' } },
    checks: { moved: 'S’ha mogut' },
    folds: {},
  },
  steps: [
    { kind: 'observe', id: 'move', source: source(185), solution: source(50),
      checks: [check('moved', (ctx) => visibleRects(ctx).some((r) => r.y !== 185))] },
    { kind: 'explain', id: 'card', card: 'grid' },
  ],
};

describe('LessonEngine', () => {
  it('starts at the requested step, clamped', () => {
    expect(new LessonEngine(lesson, 1).stepIndex).toBe(1);
    expect(new LessonEngine(lesson, 99).stepIndex).toBe(1);
    expect(new LessonEngine(lesson, -3).stepIndex).toBe(0);
  });

  it('does not let you continue before the exercise passes', () => {
    const e = new LessonEngine(lesson);
    expect(e.canContinue).toBe(false);
    expect(e.next()).toBe(false);
    expect(e.run()).toMatchObject({ kind: 'checked', passed: false });
    expect(e.canContinue).toBe(false);
  });

  it('gives two stars without hints and lets you continue', () => {
    const e = new LessonEngine(lesson);
    e.setCode(e.exercise!.code.replace('185', '50'));
    expect(e.run()).toMatchObject({ passed: true });
    expect(e.exercise).toMatchObject({ done: true, stars: 2 });
    expect(e.next()).toBe(true);
    expect(e.step.kind).toBe('explain');
    expect(e.exercise).toBeNull();
    expect(e.canContinue).toBe(true);
    expect(e.isLastStep).toBe(true);
    expect(e.next()).toBe(false);
  });

  it('gives one star after a hint, and stars never go down', () => {
    const e = new LessonEngine(lesson);
    expect(e.showHint()).toBe('h1');
    e.setCode(e.exercise!.code.replace('185', '50'));
    e.run();
    expect(e.exercise!.stars).toBe(1);

    const f = new LessonEngine(lesson);
    f.setCode(f.exercise!.code.replace('185', '50'));
    f.run();
    f.showHint();
    f.run();
    expect(f.exercise!.stars).toBe(2);
  });

  it('shows at most three hints', () => {
    const e = new LessonEngine(lesson);
    expect([e.showHint(), e.showHint(), e.showHint(), e.showHint()]).toEqual(['h1', 'h2', 'h3', null]);
    expect(e.shownHints()).toEqual(['h1', 'h2', 'h3']);
    expect(e.hasMoreHints).toBe(false);
  });

  it('resets the code but keeps hints and stars', () => {
    const e = new LessonEngine(lesson);
    e.showHint();
    e.setCode('trencat');
    e.reset();
    expect(e.exercise!.code).toBe(e.exercise!.source.code);
    expect(e.exercise!.result).toBeNull();
    expect(e.shownHints()).toEqual(['h1']);
  });
});

import { MAX_STARS } from '../src/lessons/engine';

describe('MAX_STARS', () => {
  it('is the most an exercise can give (two today: works, and without hints)', () => {
    expect(MAX_STARS).toBe(2);
    const e = new LessonEngine(lesson);
    e.setCode(e.exercise!.code.replace('185', '50'));
    e.run();
    expect(e.exercise!.stars).toBeLessThanOrEqual(MAX_STARS);
  });
});

describe('starsOf', () => {
  it('reports the stars of any exercise, 0 when not done', () => {
    const e = new LessonEngine(lesson);
    expect(e.starsOf('move')).toBe(0);
    e.setCode(e.exercise!.code.replace('185', '50'));
    e.run();
    e.next();
    expect(e.starsOf('move')).toBe(2);
    expect(e.starsOf('nope')).toBe(0);
  });
});

describe('LessonEngine with saved progress', () => {
  const solved = source(50).replace('//@edit\n', '').replace('//@end\n', '');
  it('reopens a saved exercise with its code, stars and hints', () => {
    const e = new LessonEngine(lesson, 0, { move: { code: solved, stars: 1, hintsShown: 2, done: true } });
    expect(e.exercise).toMatchObject({ code: solved, stars: 1, hintsShown: 2, done: true });
    expect(e.exercise!.shown.code).toBe(solved);
    expect(e.canContinue).toBe(true);
  });
  it('drops saved code that no longer fits the exercise, but keeps the stars', () => {
    const e = new LessonEngine(lesson, 0, { move: { code: 'something else entirely', stars: 2, hintsShown: 0, done: true } });
    expect(e.exercise!.code).toBe(e.exercise!.source.code);
    expect(e.exercise!.stars).toBe(2);
  });
  it('reset goes back to the original starting code', () => {
    const e = new LessonEngine(lesson, 0, { move: { code: solved, stars: 1, hintsShown: 0, done: true } });
    e.reset();
    expect(e.exercise!.shown).toBe(e.exercise!.source);
    expect(e.exercise!.code).toBe(e.exercise!.source.code);
  });
  it('tells what to save', () => {
    const e = new LessonEngine(lesson, 0);
    e.setCode(solved);
    e.run();
    expect(e.saved('move')).toEqual({ code: solved, stars: 2, hintsShown: 0, done: true });
    expect(e.saved('card')).toBeNull();
  });
});
