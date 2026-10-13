import { describe, expect, it } from 'vitest';
import { lesson7 } from '../content/pong/07-marcador/lesson';
import { evaluate } from '../src/lessons/checks';
import type { ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson7.steps.find((s) => s.id === id) as ExerciseStep;
const tryZone = (id: string, zone: string) => {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
};
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);
const LPT = '        if (pilotaX > 800) { puntsEsquerra++; pilotaX = 400; }';

describe('lesson 8: the scoreboard', () => {
  it('is lesson 8 with a counter card', () => {
    expect(lesson7.number).toBe(8);
    expect(lesson7.steps[1]).toMatchObject({ kind: 'explain', card: 'counter' });
  });
  it('count: += also counts as the short form; forgetting the reset is caught', () => {
    expect(tryZone('count', '        if (pilotaX > 800) { puntsEsquerra += 1; pilotaX = 400; }')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('count', '        if (pilotaX > 800) { puntsEsquerra++; }'))).toBe('ballBack');
  });
  it('rightScore: the point for the wrong player or no reset are caught', () => {
    expect(firstFailing(tryZone('rightScore', `${LPT}\n        if (pilotaX < 0) { puntsEsquerra++; pilotaX = 400; }`))).toBe('leftUntouched');
    expect(firstFailing(tryZone('rightScore', `${LPT}
        if (pilotaX > 0) { puntsDreta++; pilotaX = 400; }`))).toBe('rightScores');
    expect(firstFailing(tryZone('rightScore', `${LPT}\n        if (pilotaX < 0) { puntsDreta++; }`))).not.toBeUndefined();
  });
  it('drawRight: drawing the left score twice is caught', () => {
    expect(firstFailing(tryZone('drawRight', '        DrawText(TextFormat("%d", puntsEsquerra), 440, 20, 40, WHITE);'))).toBe('drawsRight');
  });
  it('winner: a message shown from the start is caught', () => {
    expect(firstFailing(tryZone('winner', '        DrawText("GUANYA!", 200, 200, 40, YELLOW);'))).toBe('notTooSoon');
  });
});
