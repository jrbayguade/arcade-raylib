import { check, simulate, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import keyS from './keyS.c?raw';
import keySSolution from './keyS.solution.c?raw';
import keyW from './keyW.c?raw';
import keyWSolution from './keyW.solution.c?raw';
import right from './right.c?raw';
import rightSolution from './right.solution.c?raw';
import space from './space.c?raw';
import spaceSolution from './space.solution.c?raw';

/** Paddle checks run 10 frames with a key held; both paddles start at y = 185. */
const FRAMES = 10;
const left = (ctx: CheckContext | null) => (ctx ? variable(ctx, 'palaY') ?? 185 : NaN);
const rightY = (ctx: CheckContext | null) => (ctx ? variable(ctx, 'palaDretaY') ?? 185 : NaN);
const holding = (ctx: CheckContext, key: string) => simulate(ctx, { frames: FRAMES, hold: [key] });
const still = (ctx: CheckContext) => simulate(ctx, { frames: FRAMES });

export const lesson3: Lesson = {
  id: 'pong-3',
  number: 4,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'keyW', source: keyW, solution: keyWSolution, showVariables: true, run: { frames: FRAMES, hold: ['KEY_W'] }, controls: ['KEY_W'],
      checks: [
        check('movesUp', (ctx) => left(ctx) < 185),
        check('addsEveryFrame', (ctx) => (185 - left(ctx)) % FRAMES === 0),
        check('faster', (ctx) => left(ctx) <= 185 - FRAMES * 4),
        check('notTooFast', (ctx) => left(ctx) >= 185 - FRAMES * 15),
        check('stillWithoutKey', (ctx) => left(still(ctx)) === 185),
      ],
    },
    { kind: 'explain', id: 'ifCard', card: 'if' },
    {
      kind: 'practice', id: 'keyS', source: keyS, solution: keySSolution, showVariables: true, run: { frames: FRAMES, hold: ['KEY_S'] }, controls: ['KEY_W', 'KEY_S'],
      checks: [
        check('sMovesDown', (ctx) => left(ctx) > 185),
        check('wStillUp', (ctx) => left(holding(ctx, 'KEY_W')) < 185),
        check('stillWithoutKey', (ctx) => left(still(ctx)) === 185),
      ],
    },
    {
      kind: 'practice', id: 'right', source: right, solution: rightSolution, showVariables: true, run: { frames: FRAMES, hold: ['KEY_UP'] },
      controls: ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN'],
      checks: [
        check('upMovesRight', (ctx) => rightY(ctx) < 185),
        check('downMovesRight', (ctx) => rightY(holding(ctx, 'KEY_DOWN')) > 185),
        check('keysStayApart', (ctx) => rightY(holding(ctx, 'KEY_W')) === 185 && left(ctx) === 185),
        check('stillWithoutKey', (ctx) => rightY(still(ctx)) === 185),
      ],
    },
    {
      kind: 'apply', id: 'space', source: space, solution: spaceSolution, showVariables: true, run: { frames: 30, hold: ['KEY_SPACE'] },
      controls: ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN', 'KEY_SPACE'],
      checks: [
        check('spaceCentres', (ctx) => variable(ctx, 'pilotaX') === 400),
        check('ballStillMoves', (ctx) => variable(simulate(ctx, { frames: 30 }) ?? ctx, 'pilotaX') === 400 + 30 * 4),
      ],
    },
  ],
};
