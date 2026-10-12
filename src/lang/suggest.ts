export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return row[b.length];
}

/** The closest candidate (same name with other casing first), or undefined if none is close. */
export function suggest(name: string, candidates: string[]): string | undefined {
  const lower = name.toLowerCase();
  const sameLetters = candidates.find((c) => c !== name && c.toLowerCase() === lower);
  if (sameLetters) return sameLetters;
  const max = Math.max(1, Math.floor(name.length / 3));
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const c of candidates) {
    if (c === name) continue;
    const d = levenshtein(lower, c.toLowerCase());
    if (d <= max && d < bestDistance) { best = c; bestDistance = d; }
  }
  return best;
}
