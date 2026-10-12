import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import { EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Decoration, EditorView, ViewPlugin, WidgetType, drawSelection, keymap, lineNumbers,
  type DecorationSet, type ViewUpdate,
} from '@codemirror/view';
import { paramNames } from '../i18n/i18n';
import type { LessonSource } from '../lessons/source';
import { RaylibHost } from '../runtime/raylib';
import { buildCompletions, completionSource } from './completions';
import { errorLineField, setErrorLine } from './errorLine';
import { computeParamHints } from './paramHints';
import { editableZone, zoneField } from './zone';

class HintWidget extends WidgetType {
  constructor(readonly label: string) { super(); }
  eq(other: HintWidget) { return other.label === this.label; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-param-hint';
    span.textContent = this.label;
    return span;
  }
  ignoreEvent() { return true; }
}

function hintDecorations(view: EditorView): DecorationSet {
  const hints = computeParamHints(view.state.doc.toString(), paramNames);
  return Decoration.set(hints.map((h) => Decoration.widget({ widget: new HintWidget(h.label), side: -1 }).range(h.pos)), true);
}

const paramHints = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = hintDecorations(view); }
  update(u: ViewUpdate) { if (u.docChanged) this.decorations = hintDecorations(u.view); }
}, { decorations: (v) => v.decorations });

const completions = buildCompletions(new RaylibHost({ seed: 1 }), paramNames);

export function lessonExtensions(source: LessonSource, onChange: (code: string) => void): Extension[] {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    closeBrackets(),
    cpp(),
    oneDark,
    autocompletion({ override: [completionSource(completions)], activateOnTyping: true }),
    keymap.of([...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
    editableZone(source.editable),
    errorLineField,
    paramHints,
    EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
  ];
}

/** Marks the error line and opens any fold that would hide it, so the red line is always visible. */
export function errorLineEffects(state: EditorState, line: number | null): StateEffect<unknown>[] {
  const effects: StateEffect<unknown>[] = [setErrorLine.of(line)];
  if (line === null || line < 1 || line > state.doc.lines) return effects;
  const { from, to } = state.doc.line(line);
  foldedRanges(state).between(0, state.doc.length, (a, b) => {
    if (a <= to && b >= from) effects.push(unfoldEffect.of({ from: a, to: b }));
  });
  return effects;
}

export interface LessonEditor {
  view: EditorView;
  setErrorLine(line: number | null): void;
  replaceZone(text: string): void;
  code(): string;
  destroy(): void;
}

export function createLessonEditor(opts: {
  parent: HTMLElement;
  source: LessonSource;
  foldLabel: (key: string, lines: number) => string;
  onChange: (code: string) => void;
}): LessonEditor {
  const { source } = opts;
  const labels = new Map(source.folds.map((f) => [f.from, opts.foldLabel(f.key, f.lines)]));
  const folding = codeFolding({
    preparePlaceholder: (_state, range) => labels.get(range.from) ?? '…',
    placeholderDOM: (_view, onclick, label: string) => {
      const span = document.createElement('span');
      span.className = 'cm-lesson-fold';
      span.textContent = label;
      span.onclick = onclick;
      return span;
    },
  });
  const view = new EditorView({
    parent: opts.parent,
    state: EditorState.create({ doc: source.code, extensions: [...lessonExtensions(source, opts.onChange), folding] }),
  });
  view.dispatch({ effects: source.folds.map((f) => foldEffect.of({ from: f.from, to: f.to })) });
  view.dispatch({ selection: { anchor: source.editable.to }, scrollIntoView: true });

  return {
    view,
    setErrorLine: (line) => view.dispatch({ effects: errorLineEffects(view.state, line) }),
    replaceZone: (text) => {
      const zone = view.state.field(zoneField);
      view.dispatch({ changes: { from: zone.from, to: zone.to, insert: text } });
    },
    code: () => view.state.doc.toString(),
    destroy: () => view.destroy(),
  };
}
