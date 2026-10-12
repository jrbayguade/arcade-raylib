import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export const setErrorLine = StateEffect.define<number | null>();
const errorLine = Decoration.line({ class: 'cm-error-line' });

export const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    if (tr.docChanged) deco = Decoration.none;
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      const n = e.value;
      deco = n !== null && n >= 1 && n <= tr.state.doc.lines
        ? Decoration.set([errorLine.range(tr.state.doc.line(n).from)])
        : Decoration.none;
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
