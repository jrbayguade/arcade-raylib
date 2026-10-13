export interface Range { from: number; to: number }
export interface Fold extends Range { key: string; lines: number }
/** Ghost text drawn on an empty line of the zone (not part of the code: it vanishes when the kid types). */
export interface Placeholder { pos: number; text: string }
export interface LessonSource { code: string; editable: Range; folds: Fold[]; placeholders: Placeholder[] }

const FOLD = /^\/\/@fold\s+(\w+)$/;
const PLACEHOLDER = /^\/\/@placeholder\s+(.+)$/;

/** Reads an exercise file: marker comments (`//@edit`, `//@end`, `//@fold key`, `//@endfold`) on their own
 *  lines are removed; the zone and folds are returned as offsets into the remaining code. */
export function parseLessonSource(raw: string): LessonSource {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const out: string[] = [];
  let editOpen: number | null = null;
  let zone: { start: number; end: number } | null = null;
  let foldOpen: { key: string; start: number } | null = null;
  const folds: { key: string; start: number; end: number }[] = [];
  const ghosts: { line: number; indent: number; text: string }[] = [];

  lines.forEach((line, i) => {
    const marker = line.trim();
    const where = `line ${i + 1}`;
    if (marker === '//@edit') {
      if (zone || editOpen !== null) throw new Error(`${where}: only one //@edit zone is allowed`);
      if (foldOpen) throw new Error(`${where}: the //@edit zone is inside a fold`);
      editOpen = out.length;
      return;
    }
    if (marker === '//@end') {
      if (editOpen === null) throw new Error(`${where}: //@end without //@edit`);
      if (out.length === editOpen) throw new Error(`${where}: the //@edit zone is empty`);
      zone = { start: editOpen, end: out.length - 1 };
      editOpen = null;
      return;
    }
    const ghost = PLACEHOLDER.exec(marker);
    if (ghost) {
      if (editOpen === null) throw new Error(`${where}: a placeholder must be inside the //@edit zone`);
      const indent = /^\s*/.exec(out[out.length - 1] ?? '')?.[0] ?? '';
      ghosts.push({ line: out.length, indent: indent.length, text: ghost[1].trim() });
      out.push(indent);
      return;
    }
    const fold = FOLD.exec(marker);
    if (fold) {
      if (foldOpen) throw new Error(`${where}: folds cannot be nested`);
      if (editOpen !== null) throw new Error(`${where}: a fold cannot start inside the //@edit zone`);
      foldOpen = { key: fold[1], start: out.length };
      return;
    }
    if (marker === '//@endfold') {
      if (!foldOpen) throw new Error(`${where}: //@endfold without //@fold`);
      if (out.length === foldOpen.start) throw new Error(`${where}: the fold is empty`);
      folds.push({ ...foldOpen, end: out.length - 1 });
      foldOpen = null;
      return;
    }
    if (marker.startsWith('//@')) throw new Error(`${where}: unknown marker ${marker}`);
    out.push(line);
  });

  if (editOpen !== null) throw new Error('the //@edit zone is not closed');
  if (foldOpen) throw new Error('a fold is not closed');
  if (!zone) throw new Error('there is no //@edit zone');
  const z: { start: number; end: number } = zone;

  const starts: number[] = [];
  let pos = 0;
  for (const l of out) { starts.push(pos); pos += l.length + 1; }
  const lineEnd = (n: number) => starts[n] + out[n].length;

  return {
    code: out.join('\n') + '\n',
    editable: { from: starts[z.start], to: lineEnd(z.end) },
    folds: folds.map((f) => ({ key: f.key, from: starts[f.start], to: lineEnd(f.end), lines: f.end - f.start + 1 })),
    placeholders: ghosts.map((g) => ({ pos: starts[g.line] + g.indent, text: g.text })),
  };
}

export function zoneText(src: LessonSource): string {
  return src.code.slice(src.editable.from, src.editable.to);
}

export function replaceZone(src: LessonSource, text: string): string {
  return src.code.slice(0, src.editable.from) + text + src.code.slice(src.editable.to);
}

/** The same exercise with other text in the zone: what comes after moves, placeholders only stay if nothing changed. */
export function withZone(src: LessonSource, text: string): LessonSource {
  if (text === zoneText(src)) return src;
  const delta = text.length - (src.editable.to - src.editable.from);
  const after = (n: number) => (n >= src.editable.to ? n + delta : n);
  return {
    code: replaceZone(src, text),
    editable: { from: src.editable.from, to: src.editable.to + delta },
    folds: src.folds.map((f) => ({ ...f, from: after(f.from), to: after(f.to) })),
    placeholders: [],
  };
}

/** The zone text of a saved program, or null when the code around the zone is not this exercise's any more. */
export function zoneOf(src: LessonSource, code: string): string | null {
  const before = src.code.slice(0, src.editable.from);
  const after = src.code.slice(src.editable.to);
  if (code.length < before.length + after.length || !code.startsWith(before) || !code.endsWith(after)) return null;
  return code.slice(before.length, code.length - after.length);
}
