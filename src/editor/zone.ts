import { EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export interface Zone { from: number; to: number }

export const zoneField = StateField.define<Zone>({
  create: () => ({ from: 0, to: 0 }),
  update(zone, tr) {
    if (!tr.docChanged) return zone;
    return { from: tr.changes.mapPos(zone.from, -1), to: tr.changes.mapPos(zone.to, 1) };
  },
});

const zoneLine = Decoration.line({ class: 'cm-zone' });

function zoneDecorations(state: EditorState): DecorationSet {
  const { from, to } = state.field(zoneField);
  const ranges = [];
  for (let pos = from; ; ) {
    const line = state.doc.lineAt(pos);
    ranges.push(zoneLine.range(line.from));
    if (line.to >= to || line.to + 1 > state.doc.length) break;
    pos = line.to + 1;
  }
  return Decoration.set(ranges);
}

/** Only text inside the zone can change; a transaction touching anything else is rejected whole. */
/** `onBlocked` hears about edits the kid tried outside the zone, so the UI can say why nothing happened. */
export function editableZone(zone: Zone, onBlocked?: () => void): Extension {
  return [
    zoneField.init(() => zone),
    EditorState.changeFilter.of((tr) => {
      const z = tr.startState.field(zoneField);
      const doc = tr.startState.doc;
      let inside = true;
      let touchesNewlineAfterZone = false;
      tr.changes.iterChangedRanges((fromA, toA) => {
        if (fromA < z.from) inside = false;
        else if (toA === z.to + 1 && doc.sliceString(z.to, z.to + 1) === '\n') touchesNewlineAfterZone = true;
        else if (toA > z.to) inside = false;
      });
      if (!inside) {
        const byKid = ['input', 'delete', 'move'].some((e) => tr.isUserEvent(e));
        if (byKid && onBlocked) queueMicrotask(onBlocked);
        return false;
      }
      // Triple-click, or Ctrl+X with no selection, takes the zone's last line *with* its newline: keep only the newline.
      return touchesNewlineAfterZone ? [z.to, z.to + 1] : true;
    }),
    // A selection that starts in the zone never reaches past it (triple-click takes the line *and* its newline;
    // in the browser, typing over that would be rejected whole and the text would land after the old line).
    EditorState.transactionFilter.of((tr) => {
      if (!tr.selection || tr.docChanged) return tr;
      const z = tr.startState.field(zoneField);
      let clamped = false;
      const ranges = tr.selection.ranges.map((r) => {
        if (r.from < z.from || r.from > z.to || r.to <= z.to) return r;
        clamped = true;
        return r.anchor <= r.head ? EditorSelection.range(r.anchor, z.to) : EditorSelection.range(z.to, r.head);
      });
      return clamped ? [tr, { selection: EditorSelection.create(ranges, tr.selection.mainIndex) }] : tr;
    }),
    EditorView.decorations.compute([zoneField], zoneDecorations),
  ];
}
