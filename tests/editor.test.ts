import { CompletionContext } from '@codemirror/autocomplete';
import { history, redo, undo } from '@codemirror/commands';
import { EditorState, type Transaction } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { buildCompletions, completionSource, declaredVariables } from '../src/editor/completions';
import { errorLineField, setErrorLine } from '../src/editor/errorLine';
import { computeParamHints } from '../src/editor/paramHints';
import { editableZone, zoneField } from '../src/editor/zone';
import { paramNames } from '../src/i18n/i18n';
import { RaylibHost } from '../src/runtime/raylib';

describe('computeParamHints', () => {
  it('labels every argument of a known function', () => {
    const code = 'DrawRectangle(20, 185, 10, 80, WHITE);';
    const hints = computeParamHints(code, paramNames);
    expect(hints.map((h) => [code.slice(h.pos, h.pos + 2), h.label])).toEqual([
      ['20', 'x:'], ['18', 'y:'], ['10', 'amplada:'], ['80', 'alçada:'], ['WH', 'color:'],
    ]);
  });
  it('handles nested calls and several lines', () => {
    const code = 'int a = 1;\nDrawCircle(GetRandomValue(1, 6), 2, 3.5, RED);';
    expect(computeParamHints(code, paramNames).map((h) => h.label)).toEqual(['x:', 'mínim:', 'màxim:', 'y:', 'radi:', 'color:']);
  });
  it('copes with unfinished code', () => {
    expect(computeParamHints('DrawRectangle(20, ', paramNames).map((h) => h.label)).toEqual(['x:']);
    expect(computeParamHints('DrawText("hola, 1, 2);', paramNames)).toEqual([]);
    expect(computeParamHints('Inventada(1, 2);', paramNames)).toEqual([]);
  });
});

describe('completions', () => {
  const base = buildCompletions(new RaylibHost({ seed: 1 }), paramNames);
  it('offers raylib functions and constants', () => {
    expect(base.find((c) => c.label === 'DrawCircle')).toMatchObject({ type: 'function', detail: '(x, y, radi, color)' });
    expect(base.find((c) => c.label === 'YELLOW')).toMatchObject({ type: 'constant' });
  });
  it('finds declared variables', () => {
    expect(declaredVariables('int palaY = 1;\nfloat v = 2.0;\nColor c = RED;\nint x;')).toEqual(['palaY', 'v', 'c']);
  });
  it('completes the word before the cursor', () => {
    const doc = 'int palaY = 5;\nDraw';
    const state = EditorState.create({ doc });
    const result = completionSource(base)(new CompletionContext(state, doc.length, false));
    expect(result?.from).toBe(doc.length - 4);
    expect(result?.options.map((o) => o.label)).toEqual(expect.arrayContaining(['DrawCircle', 'palaY']));
  });
});

describe('editableZone', () => {
  const doc = 'AAA\nzone\nBBB\n';
  const make = () => EditorState.create({ doc, extensions: editableZone({ from: 4, to: 8 }) });

  it('accepts edits inside the zone', () => {
    const s = make().update({ changes: { from: 5, to: 7, insert: 'XYZ' } }).state;
    expect(s.doc.toString()).toBe('AAA\nzXYZe\nBBB\n');
    expect(s.field(zoneField)).toEqual({ from: 4, to: 9 });
  });

  it('rejects edits outside the zone, including select-all and paste across it', () => {
    expect(make().update({ changes: { from: 0, to: 1, insert: 'Q' } }).state.doc.toString()).toBe(doc);
    expect(make().update({ changes: { from: 0, to: doc.length, insert: 'hola' } }).state.doc.toString()).toBe(doc);
    expect(make().update({ changes: { from: 6, to: 10, insert: '!' } }).state.doc.toString()).toBe(doc);
  });

  it('grows when typing at its edges and survives being emptied', () => {
    let s = make().update({ changes: { from: 8, insert: '\nmore' } }).state;
    expect(s.doc.toString()).toBe('AAA\nzone\nmore\nBBB\n');
    s = s.update({ changes: { from: 4, insert: '>' } }).state;
    expect(s.field(zoneField)).toEqual({ from: 4, to: 14 });
    s = s.update({ changes: { from: 4, to: 14 } }).state;
    expect(s.doc.toString()).toBe('AAA\n\nBBB\n');
    s = s.update({ changes: { from: 4, insert: 'new' } }).state;
    expect(s.doc.toString()).toBe('AAA\nnew\nBBB\n');
  });

  it('keeps the locked text and the zone through undo and redo', () => {
    const run = (st: EditorState, cmd: typeof undo) => {
      let next = st;
      cmd({ state: st, dispatch: (tr: Transaction) => { next = tr.state; } });
      return next;
    };
    let s = EditorState.create({ doc, extensions: [editableZone({ from: 4, to: 8 }), history()] });
    s = s.update({ changes: { from: 4, to: 8, insert: 'ZONA!' } }).state;
    s = run(s, undo);
    expect(s.doc.toString()).toBe(doc);
    expect(s.field(zoneField)).toEqual({ from: 4, to: 8 });
    s = run(s, redo);
    expect(s.doc.toString()).toBe('AAA\nZONA!\nBBB\n');
    expect(s.field(zoneField)).toEqual({ from: 4, to: 9 });
  });
});

describe('errorLineField', () => {
  it('marks a line and clears it on the next edit', () => {
    let s = EditorState.create({ doc: 'a\nb\n', extensions: errorLineField });
    s = s.update({ effects: setErrorLine.of(2) }).state;
    expect(s.field(errorLineField).size).toBe(1);
    s = s.update({ changes: { from: 0, insert: 'x' } }).state;
    expect(s.field(errorLineField).size).toBe(0);
  });
});
