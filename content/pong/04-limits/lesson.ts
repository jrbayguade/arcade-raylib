import { check, simulate, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import bottom from './bottom.c?raw';
import bottomSolution from './bottom.solution.c?raw';
import rightLimits from './rightLimits.c?raw';
import rightLimitsSolution from './rightLimits.solution.c?raw';
import top from './top.c?raw';
import topSolution from './top.solution.c?raw';
import wrap from './wrap.c?raw';
import wrapSolution from './wrap.solution.c?raw';

/** Holding a key for 60 frames at 6 px per frame would take a paddle 360 px away: far past any edge. */
const LONG = 60;
const left = (ctx: CheckContext | null) => (ctx ? variable(ctx, 'palaY') ?? NaN : NaN);
const rightY = (ctx: CheckContext | null) => (ctx ? variable(ctx, 'palaDretaY') ?? NaN : NaN);
const ballX = (ctx: CheckContext | null) => (ctx ? variable(ctx, 'pilotaX') ?? NaN : NaN);
const hold = (ctx: CheckContext, key: string, frames = LONG) => simulate(ctx, { frames, hold: [key] });
const PADDLE = 80;
const CONTROLS = ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN'];

export const lesson4: Lesson = {
  id: 'pong-4',
  number: 5,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'top', source: top, solution: topSolution, showVariables: true, run: { frames: LONG, hold: ['KEY_W'] }, controls: CONTROLS,
      checks: [
        check('staysOnScreen', (ctx) => left(ctx) >= 0),
        check('stopsAt20', (ctx) => left(ctx) === 20),
        check('stillMoves', (ctx) => left(hold(ctx, 'KEY_W', 10)) === 185 - 60),
      ],
    },
    { kind: 'explain', id: 'compareCard', card: 'compare' },
    {
      kind: 'practice', id: 'bottom', source: bottom, solution: bottomSolution, showVariables: true, run: { frames: LONG, hold: ['KEY_S'] }, controls: CONTROLS,
      checks: [
        check('staysAboveBottom', (ctx) => left(ctx) + PADDLE <= 450),
        check('reachesBottom', (ctx) => left(ctx) >= 450 - PADDLE - 6),
        check('topStillWorks', (ctx) => left(hold(ctx, 'KEY_W')) === 20),
      ],
    },
    {
      kind: 'practice', id: 'rightLimits', source: rightLimits, solution: rightLimitsSolution, showVariables: true, run: { frames: LONG, hold: ['KEY_UP'] },
      controls: CONTROLS,
      checks: [
        check('rightTop', (ctx) => rightY(ctx) >= 0 && rightY(ctx) <= 20),
        check('rightBottom', (ctx) => { const y = rightY(hold(ctx, 'KEY_DOWN')); return y + PADDLE <= 450 && y >= 450 - PADDLE - 6; }),
        check('leftUntouched', (ctx) => left(hold(ctx, 'KEY_W')) === 20 && left(hold(ctx, 'KEY_S')) === 370),
      ],
    },
    {
      kind: 'apply', id: 'wrap', source: wrap, solution: wrapSolution, showVariables: true, run: { frames: 150 }, controls: CONTROLS,
      checks: [
        check('wrapsAround', (ctx) => ballX(ctx) >= 0 && ballX(ctx) <= 800),
        check('comesBackLeft', (ctx) => ballX(ctx) < 400),
        check('movesBeforeEdge', (ctx) => ballX(simulate(ctx, { frames: 50 })) === 400 + 50 * 4),
      ],
    },
  ],
};
