export interface Range { from: number; to: number }
export interface Fold extends Range { key: string; lines: number }
export interface LessonSource { code: string; editable: Range; folds: Fold[] }

const FOLD = /^\/\/@fold\s+(\w+)$/;

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
  };
}

export function zoneText(src: LessonSource): string {
  return src.code.slice(src.editable.from, src.editable.to);
}

export function replaceZone(src: LessonSource, text: string): string {
  return src.code.slice(0, src.editable.from) + text + src.code.slice(src.editable.to);
}
