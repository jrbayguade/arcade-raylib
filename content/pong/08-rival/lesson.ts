import { check, history, variable } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import rival from './rival.c?raw';
import rivalSolution from './rival.solution.c?raw';

/** A long match with nobody at the keys: the left paddle stays still and misses, the right one must never miss. */
const MATCH = { frames: 900 };

export const lessonFinal: Lesson = {
  id: 'pong-final',
  number: 9,
  final: true,
  machine: 'PONG',
  slowMotion: true,
  texts,
  steps: [
    {
      kind: 'apply', id: 'rival', source: rival, solution: rivalSolution, showVariables: true, run: MATCH, controls: ['KEY_W', 'KEY_S'],
      checks: [
        check('moves', (ctx) => new Set(history(ctx, MATCH, 'palaDretaY')).size > 5),
        check('fair', (ctx) => {
          const ys = history(ctx, MATCH, 'palaDretaY');
          return ys.every((y, i) => i === 0 || Math.abs(y - ys[i - 1]) <= 6);
        }),
        check('neverMisses', (ctx) => variable(ctx, 'puntsEsquerra') === 0),
      ],
    },
    { kind: 'explain', id: 'fixed', card: 'fixed' },
  ],
};
