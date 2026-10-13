import { assignmentsTo, check, history, simulate, texts, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts_ from './ca.json';
import count from './count.c?raw';
import countSolution from './count.solution.c?raw';
import drawRight from './drawRight.c?raw';
import drawRightSolution from './drawRight.solution.c?raw';
import rightScore from './rightScore.c?raw';
import rightScoreSolution from './rightScore.solution.c?raw';
import winner from './winner.c?raw';
import winnerSolution from './winner.solution.c?raw';

/**
 * Scoring checks hold a key so one paddle hides at the top and misses: the ball (5 px per frame from
 * x = 400) then scores a point about every 80 frames.
 */
const v = (ctx: CheckContext | null, name: string) => (ctx ? variable(ctx, name) ?? NaN : NaN);
const CONTROLS = ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN'];
const isNumber = (s: string) => /^-?\d+$/.test(s);

export const lesson7: Lesson = {
  id: 'pong-7',
  number: 8,
  machine: 'PONG',
  slowMotion: true,
  texts: texts_,
  steps: [
    {
      kind: 'observe', id: 'count', source: count, solution: countSolution, showVariables: true, controls: CONTROLS,
      run: { frames: 400, hold: ['KEY_UP'] },
      checks: [
        check('scores', (ctx) => v(ctx, 'puntsEsquerra') >= 3),
        check('ballBack', (ctx) => history(ctx, { frames: 400, hold: ['KEY_UP'] }, 'pilotaX').every((x) => x <= 810)),
        check('shortForm', (ctx) => assignmentsTo(ctx.program, 'puntsEsquerra').some((s) => s.op === '++' || s.op === '+=')),
      ],
    },
    { kind: 'explain', id: 'counterCard', card: 'counter' },
    {
      kind: 'practice', id: 'rightScore', source: rightScore, solution: rightScoreSolution, showVariables: true, controls: CONTROLS,
      run: { frames: 400, hold: ['KEY_W'] },
      checks: [
        check('leftUntouched', (ctx) => v(ctx, 'puntsEsquerra') === 0),
        check('rightScores', (ctx) => v(ctx, 'puntsDreta') === 4),
        check('ballBackToCentre', (ctx) => history(ctx, { frames: 400, hold: ['KEY_W'] }, 'pilotaX').every((x) => x >= -10)),
      ],
    },
    {
      kind: 'practice', id: 'drawRight', source: drawRight, solution: drawRightSolution, showVariables: true, controls: CONTROLS,
      run: { frames: 200, hold: ['KEY_W'] },
      checks: [
        check('drawsRight', (ctx) => texts(ctx).some((t) => t.x > 400 && t.text === String(v(ctx, 'puntsDreta')))),
        check('leftStillDrawn', (ctx) => texts(ctx).some((t) => t.x < 400)),
      ],
    },
    {
      kind: 'apply', id: 'winner', source: winner, solution: winnerSolution, showVariables: true, controls: CONTROLS,
      run: { frames: 600, hold: ['KEY_UP'] },
      checks: [
        check('showsWinner', (ctx) => texts(ctx).some((t) => !isNumber(t.text))),
        check('notTooSoon', (ctx) => { const early = simulate(ctx, { frames: 390, hold: ['KEY_UP'] }); return early !== null && texts(early).every((t) => isNumber(t.text)); }),
      ],
    },
  ],
};
