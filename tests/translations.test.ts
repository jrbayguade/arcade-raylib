import { describe, expect, it } from 'vitest';
import ca from '../src/i18n/ca.json';
import en from '../src/i18n/en.json';
import es from '../src/i18n/es.json';

const lessonFiles = import.meta.glob<Record<string, unknown>>('../content/pong/*/*.json', { eager: true, import: 'default' });
const folders = [...new Set(Object.keys(lessonFiles).map((p) => p.split('/').at(-2)!))];

/** Every leaf path of a JSON value, with array lengths in it (prompt pages and hints must line up). */
function shape(x: unknown, path = ''): string[] {
  if (Array.isArray(x)) return [`${path}[${x.length}]`, ...x.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([k, v]) => shape(v, `${path}.${k}`));
  return [path];
}
/** Text inside backticks: code is never translated (except the generic examples like `int nom = valor;`). */
const code = (x: unknown) => JSON.stringify(x).match(/`[^`]*`/g)?.filter((c) => !/nom|valor|name|value|caixa|caja|box|missatge|mensaje|message/.test(c)) ?? [];

describe.each([['es', es], ['en', en]] as const)('%s translation', (lang, ui) => {
  it('has every interface text Catalan has', () => {
    expect(shape(ui).sort()).toEqual(shape(ca).sort());
  });
  it.each(folders)('lesson %s: same texts, same pages, same code', (folder) => {
    const base = lessonFiles[`../content/pong/${folder}/ca.json`];
    const own = lessonFiles[`../content/pong/${folder}/${lang}.json`];
    expect(own, `${folder}/${lang}.json`).toBeDefined();
    expect(shape(own).sort()).toEqual(shape(base).sort());
    expect(code(own).sort()).toEqual(code(base).sort());
  });
});
