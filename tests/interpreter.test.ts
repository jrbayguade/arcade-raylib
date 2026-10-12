import { describe, expect, it } from 'vitest';
import { compile } from '../src/lang/compile';
import { LangError } from '../src/lang/diagnostics';
import { NativeError, type HostEnv, type Value } from '../src/lang/host';
import { Interpreter, type ExecEvent } from '../src/lang/interpreter';

function makeHost() {
  const out: Value[] = [];
  let frameRequested = false;
  const host: HostEnv = {
    functions: {
      printInt: { params: ['int'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      printFloat: { params: ['float'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      printBool: { params: ['bool'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      EndDrawing: { params: [], returns: 'void', call: () => { frameRequested = true; return undefined; } },
      Crash: { params: [], returns: 'void', call: () => { throw new NativeError('NO_WINDOW', { name: 'Crash' }); } },
    },
    constants: { TEN: { type: 'int', value: 10 } },
    takeFrameYield: () => { const f = frameRequested; frameRequested = false; return f; },
  };
  return { host, out };
}

const main = (body: string) => `int main(void) {\n${body}\n}`;

function start(body: string) {
  const { host, out } = makeHost();
  const compiled = compile(main(body), host);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostic));
  const events: ExecEvent[] = [];
  const interpreter = new Interpreter(compiled.program, host, (e) => events.push(e));
  return { interpreter, out, events };
}

function run(body: string) {
  const s = start(body);
  for (const _ of s.interpreter.run()) { /* run to the end */ }
  return s;
}

function runError(body: string) {
  try { run(body); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('C semantics', () => {
  it('does integer and float arithmetic like C', () => {
    const { out } = run([
      'printInt(7 / 2);', 'printInt(-7 / 2);', 'printInt(-7 % 3);', 'printFloat(7.0 / 2);',
      'printInt(2147483647 + 1);', 'printInt(TEN * 3);',
    ].join('\n'));
    expect(out).toEqual([3, -3, -1, 3.5, -2147483648, 30]);
  });

  it('converts on assignment like C', () => {
    const { out } = run('int x = 5;\nx += 2.6;\nprintInt(x);\nfloat f = 1;\nf /= 4;\nprintFloat(f);\nbool b = 7;\nprintBool(b);\nint y = 2.9;\nprintInt(y);');
    expect(out).toEqual([7, 0.25, true, 2]);
  });

  it('evaluates logic with short-circuit', () => {
    const { out } = run('printBool(3 < 5 && !(2 > 1));\nprintBool(1 == 1 || TEN / 0 > 1);');
    expect(out).toEqual([false, true]);
  });

  it('runs ++ and --', () => {
    const { out } = run('int i = 1;\ni++;\ni++;\ni--;\nprintInt(i);');
    expect(out).toEqual([2]);
  });
});

describe('control flow', () => {
  it('takes the right branch and reports it', () => {
    const { out, events } = run('int x = 5;\nif (x > 10) { printInt(1); } else if (x > 3) { printInt(2); } else { printInt(3); }');
    expect(out).toEqual([2]);
    expect(events.filter((e) => e.type === 'branch').map((e) => (e as { taken: boolean }).taken)).toEqual([false, true]);
  });

  it('runs while and for loops and reports iterations', () => {
    const { out, events } = run('int n = 0;\nwhile (n < 3) { n++; }\nfor (int i = 0; i < 2; i++) { printInt(i); }\nprintInt(n);');
    expect(out).toEqual([0, 1, 3]);
    expect(events.filter((e) => e.type === 'loop')).toHaveLength(5);
  });

  it('stops at return', () => {
    const { out } = run('printInt(1);\nreturn 0;\nprintInt(2);');
    expect(out).toEqual([1]);
  });
});

describe('frames and steps', () => {
  it('yields a frame at each EndDrawing', () => {
    const { interpreter } = start('int i = 0;\nwhile (1) { i++; EndDrawing(); }');
    const gen = interpreter.run();
    let frames = 0;
    while (frames < 3) if (gen.next().value?.kind === 'frame') frames++;
    expect(interpreter.variables()).toEqual([{ name: 'i', type: 'int', value: 3 }]);
  });

  it('yields a step before each statement and exposes visible variables', () => {
    const { interpreter } = start('int a = 1;\n{\nfloat b = 2.5;\na = 3;\n}');
    const gen = interpreter.run();
    for (;;) {
      const r = gen.next();
      if (r.done) throw new Error('never reached line 5');
      if (r.value.kind === 'step' && r.value.line === 5) break;
    }
    expect(interpreter.variables()).toEqual([
      { name: 'a', type: 'int', value: 1 },
      { name: 'b', type: 'float', value: 2.5 },
    ]);
  });

  it('emits var events', () => {
    const { events } = run('int a = 1;\na = 4;');
    expect(events.filter((e) => e.type === 'var')).toEqual([
      { type: 'var', name: 'a', value: 1 },
      { type: 'var', name: 'a', value: 4 },
    ]);
  });
});

describe('runtime errors and warnings', () => {
  it('stops endless loops and points at the loop', () => {
    expect(runError('int i = 0;\nwhile (i >= 0) {\ni = 1;\n}')).toMatchObject({ code: 'LOOP_TOO_LONG', line: 3 });
  });

  it('blames a truly endless inner loop over the frame loop', () => {
    expect(runError('while (1) {\nint i = 0;\nwhile (i >= 0) {\ni = 1;\n}\nEndDrawing();\n}')).toMatchObject({ code: 'LOOP_TOO_LONG', line: 4 });
  });

  it('resets the budget at each frame', () => {
    const { interpreter } = start('while (1) {\nfor (int i = 0; i < 20000; i++) { }\nEndDrawing();\n}');
    const gen = interpreter.run();
    let frames = 0;
    expect(() => { while (frames < 5) if (gen.next().value?.kind === 'frame') frames++; }).not.toThrow();
  });

  it('reports integer division by zero', () => {
    expect(runError('int z = 0;\nprintInt(5 / z);')).toMatchObject({ code: 'DIVISION_BY_ZERO', line: 3 });
  });

  it('turns native errors into diagnostics at the call', () => {
    expect(runError('Crash();')).toMatchObject({ code: 'NO_WINDOW', line: 2, params: { name: 'Crash' } });
  });

  it('warns once per operation when an int division loses decimals', () => {
    const { events } = run('for (int i = 0; i < 3; i++) { printInt(7 / 2); }\nprintInt(8 / 2);');
    const warnings = events.filter((e) => e.type === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ diagnostic: { code: 'INT_DIVISION_TRUNCATES', severity: 'warning', line: 2, params: { a: 7, b: 2, result: 3, exact: 3.5 } } });
  });
});
