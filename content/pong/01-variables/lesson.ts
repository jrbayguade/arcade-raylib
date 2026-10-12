import { check, declares, variable, visibleRects, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import ball from './ball.c?raw';
import ballSolution from './ball.solution.c?raw';
import height from './height.c?raw';
import heightSolution from './height.solution.c?raw';
import observe from './observe.c?raw';
import observeSolution from './observe.solution.c?raw';
import together from './together.c?raw';
import togetherSolution from './together.solution.c?raw';
import warmup from './warmup.c?raw';
import warmupSolution from './warmup.solution.c?raw';

const paddle = (ctx: CheckContext, x: number) => visibleRects(ctx).find((r) => r.x === x);

export const lesson1: Lesson = {
  id: 'pong-1',
  number: 1,
  texts,
  steps: [
    {
      kind: 'warmup', id: 'warmup', source: warmup, solution: warmupSolution,
      checks: [check('paddleAt100', (ctx) => paddle(ctx, 20)?.y === 100)],
    },
    {
      kind: 'observe', id: 'observe', source: observe, solution: observeSolution, showVariables: true,
      checks: [check('paddleMoved', (ctx) => (paddle(ctx, 20)?.y ?? 185) !== 185)],
    },
    { kind: 'explain', id: 'box', card: 'variable-box' },
    {
      kind: 'practice', id: 'together', source: together, solution: togetherSolution, showVariables: true,
      checks: [
        check('bothTogether', (ctx) => paddle(ctx, 20) !== undefined && paddle(ctx, 20)?.y === paddle(ctx, 770)?.y),
        check('bothUp', (ctx) => (paddle(ctx, 20)?.y ?? 999) <= 100),
      ],
    },
    {
      kind: 'practice', id: 'height', source: height, solution: heightSolution, showVariables: true,
      checks: [
        check('declaresHeight', (ctx) => declares(ctx.program, 'alcada', 'int')),
        check('heightUsed', (ctx) => {
          const h = variable(ctx, 'alcada') ?? 0;
          return h > 0 && paddle(ctx, 20)?.h === h && paddle(ctx, 770)?.h === h;
        }),
      ],
    },
    {
      kind: 'apply', id: 'ball', source: ball, solution: ballSolution, showVariables: true,
      checks: [
        check('declaresBall', (ctx) => declares(ctx.program, 'pilotaX', 'int') && declares(ctx.program, 'pilotaY', 'int')),
        check('ballCentered', (ctx) =>
          Math.hypot((variable(ctx, 'pilotaX') ?? -99) - 400, (variable(ctx, 'pilotaY') ?? -99) - 225) <= 10),
      ],
    },
  ],
};
