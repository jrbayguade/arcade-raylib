import { EditorState, StateField, type Extension } from '@codemirror/state';
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
export function editableZone(zone: Zone): Extension {
  return [
    zoneField.init(() => zone),
    EditorState.changeFilter.of((tr) => {
      const z = tr.startState.field(zoneField);
      let inside = true;
      tr.changes.iterChangedRanges((fromA, toA) => {
        if (fromA < z.from || toA > z.to) inside = false;
      });
      return inside;
    }),
    EditorView.decorations.compute([zoneField], zoneDecorations),
  ];
}
