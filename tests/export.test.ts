import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/pong';
import { mainC } from '../src/lessons/export';
import { emptyProgress, recordExercise } from '../src/lessons/progress';
import { parseLessonSource } from '../src/lessons/source';
import type { ExerciseStep } from '../src/lessons/model';

const final = LESSONS[LESSONS.length - 1];
const rival = final.steps.find((s) => s.id === 'rival') as ExerciseStep;

describe('main.c download', () => {
  it('is the kid\'s own final program, with a header and no lesson markers', () => {
    const p = emptyProgress();
    const mine = parseLessonSource(rival.solution).code.replace('palaDretaY - 4', 'palaDretaY - 5');
    recordExercise(p, final, 'rival', { code: mine, stars: 2, hintsShown: 0, done: true });
    const file = mainC(p, LESSONS);
    expect(file).toContain('palaDretaY - 5');
    expect(file).not.toContain('//@');
    expect(file.startsWith('// ')).toBe(true);
    expect(file).toContain('#include "raylib.h"');
  });
  it('falls back to the reference solution when there is no saved code', () => {
    expect(mainC(emptyProgress(), LESSONS)).toContain('palaDretaY = palaDretaY - 4;');
  });
});
