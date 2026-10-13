import { describe, expect, it } from 'vitest';
import { lesson4 } from '../content/pong/04-limits/lesson';
import { evaluate } from '../src/lessons/checks';
import type { ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson4.steps.find((s) => s.id === id) as ExerciseStep;
const tryZone = (id: string, zone: string) => {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
};
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);
const TOP = '        if (palaY < 20) { palaY = 20; }';

describe('lesson 5: inside the screen', () => {
  it('is lesson 5 with a compare card', () => {
    expect(lesson4.number).toBe(5);
    expect(lesson4.steps[1]).toMatchObject({ kind: 'explain', card: 'compare' });
  });
  it('top: changing only one of the two numbers is explained', () => {
    expect(firstFailing(tryZone('top', '        if (palaY < 20) { palaY = 0; }'))).toBe('stopsAt20');
    expect(firstFailing(tryZone('top', '        if (palaY < 0) { palaY = 20; }'))).toBe('stopsAt20');
  });
  it('top: a single = in the question is a compile error with its own message', () => {
    expect(tryZone('top', '        if (palaY = 20) { palaY = 20; }')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'ASSIGN_IN_CONDITION' } });
  });
  it('bottom: the wrong comparison or a limit too high are caught', () => {
    expect(firstFailing(tryZone('bottom', TOP + '\n        if (palaY < 350) { palaY = 350; }'))).not.toBeUndefined();
    expect(firstFailing(tryZone('bottom', TOP + '\n        if (palaY > 450) { palaY = 450; }'))).toBe('staysAboveBottom');
    expect(tryZone('bottom', TOP + '\n        if (palaY >= 350) { palaY = 350; }')).toMatchObject({ passed: true });
  });
  it('rightLimits: using palaY instead of palaDretaY is explained', () => {
    const wrong = '        if (palaY < 20) { palaDretaY = 20; }\n        if (palaDretaY > 350) { palaDretaY = 350; }';
    expect(firstFailing(tryZone('rightLimits', wrong))).toBe('rightTop');
  });
  it('wrap: both kinds of wrap pass, a stop does not', () => {
    expect(tryZone('wrap', '        if (pilotaX >= 800) { pilotaX = 0; }')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('wrap', '        if (pilotaX > 800) { pilotaX = 800; }'))).toBe('comesBackLeft');
  });
});
