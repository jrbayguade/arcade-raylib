import { StateField, type EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { Placeholder } from '../lessons/source';

/** Where the ghost texts are, kept in step with every edit. */
const ghostField = StateField.define<Placeholder[]>({
  create: () => [],
  update(ghosts, tr) {
    if (!tr.docChanged) return ghosts;
    return ghosts.map((g) => ({ ...g, pos: tr.changes.mapPos(g.pos, -1) }));
  },
});

/** Ghosts are only drawn while their line is still empty: the first keystroke there makes them go away. */
export function shownGhosts(state: EditorState): Placeholder[] {
  return state.field(ghostField).filter((g) => state.doc.lineAt(g.pos).text.trim() === '');
}

class GhostWidget extends WidgetType {
  constructor(readonly text: string) { super(); }
  eq(other: GhostWidget) { return other.text === this.text; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-ghost';
    span.textContent = `✏️ ${this.text}`;
    return span;
  }
  ignoreEvent() { return false; }
}

export function ghostText(placeholders: Placeholder[]): Extension {
  return [
    ghostField.init(() => placeholders),
    EditorView.decorations.compute([ghostField, 'doc'], (state) =>
      Decoration.set(shownGhosts(state).map((g) => Decoration.widget({ widget: new GhostWidget(g.text), side: 1 }).range(g.pos)), true)),
  ];
}
