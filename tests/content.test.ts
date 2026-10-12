import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/pong';
import { evaluate } from '../src/lessons/checks';
import { isExercise } from '../src/lessons/model';
import { parseLessonSource } from '../src/lessons/source';

describe.each(LESSONS.map((l) => [l.id, l] as const))('lesson %s', (_id, lesson) => {
  it('has unique step ids and texts for every step', () => {
    const ids = lesson.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of lesson.steps) expect(lesson.texts.steps[s.id]?.prompt, s.id).toBeTruthy();
  });

  for (const step of lesson.steps.filter(isExercise)) {
    describe(`exercise ${step.id}`, () => {
      const start = parseLessonSource(step.source);
      const solution = parseLessonSource(step.solution);

      it('has three hints and a text for every check and fold', () => {
        expect(lesson.texts.steps[step.id].hints).toHaveLength(3);
        for (const c of step.checks) expect(lesson.texts.checks[c.key], c.key).toBeTruthy();
        for (const f of start.folds) expect(lesson.texts.folds[f.key], f.key).toBeTruthy();
      });

      it('only differs from the solution inside the zone', () => {
        expect(solution.code.slice(0, solution.editable.from)).toBe(start.code.slice(0, start.editable.from));
        expect(solution.code.slice(solution.editable.to)).toBe(start.code.slice(start.editable.to));
      });

      it('does not pass with the starting code', () => {
        const r = evaluate(start.code, step.checks, step.run);
        expect(r.kind === 'checked' && r.passed).toBe(false);
      });

      it('passes with the solution', () => {
        expect(evaluate(solution.code, step.checks, step.run)).toMatchObject({ kind: 'checked', passed: true });
      });
    });
  }
});
