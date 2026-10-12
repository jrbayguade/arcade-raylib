# Intèrpret mini-C i demo del Pong — Pla d'implementació

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un intèrpret de mini-C (subconjunt de C amb API raylib) en TypeScript, i una pàgina web on es pot editar i jugar un Pong complet escrit en mini-C.

**Architecture:** Pipeline clàssic `lex → parse → check → interpret`. L'intèrpret recorre l'arbre amb generadors de JavaScript: cedeix a cada instrucció (`step`) i a cada `EndDrawing()` (`frame`), i això permet tant execució a 60 fps com pas a pas. El runtime (`RaylibHost`) implementa les funcions raylib acumulant una llista de dibuix per frame; el renderer la pinta en un `<canvas>`. Tot el mòdul `lang` és independent del navegador i es prova amb Vitest en Node.

**Tech Stack:** TypeScript (strict), Vite, Vitest, Node 24. Sense dependències de runtime. (Svelte i CodeMirror entren al pla següent, amb la pantalla de lliçó; aquí la demo és TypeScript pla amb un `<textarea>`.)

**Spec:** `docs/superpowers/specs/2026-10-12-bit-arcade-design.md` — aquest pla cobreix els passos 1 i 2 de la secció 14 (intèrpret + "veure-ho funcionar") i la publicació (pas 7) a GitHub Pages.

## Global Constraints

- Invariant del llenguatge: **tot programa mini-C vàlid és C vàlid** i compila amb `gcc -std=c99 -Wall -Werror` i `raylib.h` 5.5.
- Tot text visible per l'alumne surt de `src/i18n/ca.json` (català). Cap text en català escrit directament al codi TypeScript.
- Errors: cada error és un `Diagnostic { code, params, line, col, severity }`; el codi pertany a `CODES` (`src/lang/diagnostics.ts`).
- Pressupost d'execució: `OPS_PER_FRAME = 100_000` operacions entre dos `EndDrawing()`.
- Frames lògics fixos a 60 per segon, independentment del refresc de la pantalla.
- `int` = enter de 32 bits amb desbordament circular; `float` = `Math.fround`; divisió entera trunca cap a zero (com C).
- Sense dependències de runtime; només `devDependencies` (typescript, vite, vitest).
- Vite `base: './'` (funciona a GitHub Pages sense conèixer el nom del repo).
- Llicències: MIT per al codi, CC BY-SA 4.0 per a `content/`.
- Identificadors i comentaris del codi TypeScript en anglès; contingut (`content/`) i textos d'i18n en català.

## Review Focus

1. **Noms de variable amb accents** (`int puntuació = 0;`) — un alumne català ho escriurà segur; ha de rebre l'error `ACCENT_IN_NAME` amb el caràcter, no un "caràcter desconegut". Test: Task 3.
2. **Tecles enganxades quan el canvas perd el focus** (es prem W, es fa clic a l'editor, es deixa anar W) — la pala no s'ha de continuar movent. Test: Task 9 (`blur` buida les tecles).
3. **Pantalles de 120/144 Hz** — el joc ha d'anar a la mateixa velocitat que a 60 Hz. Test: Task 9 (`FrameClock`).
4. **L'alumne esborra `EndDrawing()`** del bucle principal — la pestanya no es pot penjar; ha de sortir `LOOP_TOO_LONG` assenyalant la línia del `while`. Test: Task 7.
5. **Prémer ▶ diverses vegades seguides** — no hi pot haver dos bucles d'animació alhora (el joc aniria al doble de velocitat). Test: Task 10 (`Runner`).

---

## Estructura de fitxers

```
bit-arcade/
  package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, LICENSE, README.md
  content/LICENSE                 CC BY-SA 4.0
  content/demo/pong.c             Pong complet en mini-C
  src/lang/diagnostics.ts         codis d'error, Diagnostic, LangError
  src/lang/tokens.ts              tipus Token, paraules clau
  src/lang/lexer.ts               lex(source) → Token[]
  src/lang/ast.ts                 tipus de l'arbre sintàctic
  src/lang/parser.ts              parse(tokens) → Program
  src/lang/host.ts                interfícies Value, NativeFunction, HostEnv, NativeError
  src/lang/suggest.ts             suggeriments "Volies dir...?"
  src/lang/format.ts              parseFormat / formatText (TextFormat)
  src/lang/checker.ts             comprovació de tipus i noms; anota expr.type
  src/lang/compile.ts             compile(source, host) → CompileResult
  src/lang/interpreter.ts         Interpreter (generador), conversions C
  src/i18n/ca.json                textos en català
  src/i18n/i18n.ts                formatDiagnostic, t
  src/runtime/colors.ts           colors raylib
  src/runtime/keys.ts             tecles raylib i correspondència amb el navegador
  src/runtime/input.ts            InputState
  src/runtime/drawList.ts         DrawCommand
  src/runtime/raylib.ts           RaylibHost (funcions natives)
  src/runtime/machine.ts          Machine, runHeadless
  src/runtime/keyboard.ts         KeyboardInput (navegador)
  src/runtime/frameClock.ts       FrameClock (60 fps fixos)
  src/render/canvas.ts            renderFrame
  src/demo/runner.ts              Runner (bucle d'animació)
  src/demo/main.ts, style.css     pàgina de demo
  tests/...                       un fitxer de test per mòdul
  .github/workflows/ci.yml        tests, compatibilitat C, GitHub Pages
```

---

### Task 1: Esquelet del projecte

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `LICENSE`, `content/LICENSE`, `README.md`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: res
- Produces: `npm test` (Vitest, fitxers `tests/**/*.test.ts`), `npm run build` (typecheck + Vite), `npm run dev`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "bit-arcade",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Instal·lar dependències de desenvolupament**

Run: `npm install -D typescript vite vitest`
Expected: es crea `package-lock.json` i `node_modules/`; `devDependencies` queda amb les tres eines.

- [ ] **Step 3: Crear `tsconfig.json`, `vite.config.ts` i `.gitignore`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: { include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:
```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 4: Llicències i README**

`LICENSE`: text estàndard de la llicència MIT amb `Copyright (c) 2026 Jesus Bosch`.

`content/LICENSE`:
```
El contingut d'aquesta carpeta (lliçons, textos i programes d'exemple) es distribueix
sota la llicència Creative Commons Reconeixement-CompartirIgual 4.0 Internacional
(CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/deed.ca
```

`README.md`:
```markdown
# Bit Arcade

Aprèn a programar en C arreglant les màquines d'una sala recreativa.

## Desenvolupament

    npm install
    npm run dev      # servidor local
    npm test         # tests
    npm run build    # versió per publicar (carpeta dist/)

Disseny: `docs/superpowers/specs/`. Codi sota llicència MIT; contingut de `content/` sota CC BY-SA 4.0.
```

- [ ] **Step 5: Test de fum**

`tests/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: esquelet del projecte (Vite + Vitest + TypeScript)"
```

---

### Task 2: Diagnòstics i i18n

**Files:**
- Create: `src/lang/diagnostics.ts`, `src/i18n/ca.json`, `src/i18n/i18n.ts`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Consumes: res
- Produces:
  - `CODES` (array `as const`), `type Code`, `FEATURES` (array `as const`), `type Feature`
  - `type DiagParams = Record<string, string | number>`
  - `interface Diagnostic { code: Code; params: DiagParams; line: number; col: number; severity: 'error' | 'warning' }`
  - `class LangError extends Error { readonly diagnostic: Diagnostic }`
  - `error(code: Code, line: number, col: number, params?: DiagParams): LangError`
  - `formatDiagnostic(d: Diagnostic): string`, `t(key: string, params?: DiagParams): string`, `setLanguage(lang: string): void`
  - Convenció de paràmetres: els que acaben en `Type` (`expectedType`, `foundType`, `leftType`, `rightType`) es tradueixen amb la taula `types`; `feature` es tradueix amb la taula `features`; si hi ha `suggestion` s'hi afegeix "Volies dir «…»?".

- [ ] **Step 1: Escriure el test que falla**

`tests/i18n.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CODES, FEATURES, type Diagnostic } from '../src/lang/diagnostics';
import { formatDiagnostic, t } from '../src/i18n/i18n';
import ca from '../src/i18n/ca.json';

const d = (code: Diagnostic['code'], params: Diagnostic['params'] = {}, line = 1): Diagnostic => ({
  code, params, line, col: 1, severity: 'error',
});

describe('formatDiagnostic', () => {
  it('uses the diagnostic line', () => {
    expect(formatDiagnostic(d('MISSING_SEMICOLON', {}, 3))).toBe('Falta un ; al final de la línia 3.');
  });
  it('appends a suggestion', () => {
    expect(formatDiagnostic(d('UNDECLARED_VAR', { name: 'pilotax', suggestion: 'pilotaX' })))
      .toBe('La variable «pilotax» no existeix. Volies dir «pilotaX»?');
  });
  it('translates type parameters', () => {
    expect(formatDiagnostic(d('ARG_TYPE', { name: 'DrawRectangle', index: 5, expectedType: 'Color', foundType: 'int' })))
      .toBe('El valor número 5 de «DrawRectangle» hauria de ser un Color, però és un enter (int).');
  });
  it('translates unsupported features', () => {
    expect(formatDiagnostic(d('UNSUPPORTED', { feature: 'switch' })))
      .toBe('switch encara no l\'hem après. Fes servir if / else if.');
  });
  it('falls back to the code when there is no message', () => {
    expect(formatDiagnostic({ ...d('NO_MAIN'), code: 'NOPE' as Diagnostic['code'] })).toBe('NOPE');
  });
});

describe('catalog completeness', () => {
  it('has a Catalan message for every code', () => {
    for (const code of CODES) expect(ca.errors, code).toHaveProperty(code);
  });
  it('has a Catalan message for every unsupported feature', () => {
    for (const f of FEATURES) expect(ca.features, f).toHaveProperty(f);
  });
});

describe('t', () => {
  it('returns UI strings', () => {
    expect(t('run')).toBe('▶ Executa');
    expect(t('lineLabel', { line: 7 })).toBe('Línia 7: ');
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/i18n.test.ts`
Expected: FAIL — no es pot resoldre `../src/lang/diagnostics`.

- [ ] **Step 3: Implementar `src/lang/diagnostics.ts`**

```ts
export const CODES = [
  // lexer
  'UNKNOWN_CHAR', 'ACCENT_IN_NAME', 'UNTERMINATED_STRING', 'UNTERMINATED_COMMENT',
  'UNSUPPORTED_INCLUDE', 'UNSUPPORTED_DIRECTIVE',
  // parser
  'MISSING_SEMICOLON', 'EXPECTED_TOKEN', 'EXPECTED_NAME', 'UNEXPECTED_TOKEN', 'UNEXPECTED_EOF',
  'MISSING_BRACES', 'ASSIGN_IN_CONDITION', 'EXPECTED_ASSIGNMENT', 'EXPECTED_EXPRESSION',
  'INCDEC_IN_EXPRESSION', 'UNSUPPORTED', 'UNSUPPORTED_TYPE', 'DECL_NEEDS_INIT', 'NO_MAIN',
  'UNSUPPORTED_GLOBAL',
  // checker
  'ALREADY_DECLARED', 'RESERVED_NAME', 'UNDECLARED_VAR', 'NOT_A_VARIABLE', 'UNKNOWN_FUNCTION',
  'WRONG_ARG_COUNT', 'ARG_TYPE', 'TYPE_MISMATCH', 'UNARY_TYPE', 'ASSIGN_TYPE', 'ASSIGN_TO_CONST',
  'CONDITION_TYPE', 'MOD_NEEDS_INT', 'VOID_VALUE', 'STRING_NOT_ALLOWED',
  'TEXTFORMAT_ONLY_IN_DRAWTEXT', 'TEXTFORMAT_NEEDS_LITERAL', 'TEXTFORMAT_FORMAT',
  'TEXTFORMAT_ARG_COUNT', 'TEXTFORMAT_ARG_TYPE',
  // runtime
  'DIVISION_BY_ZERO', 'LOOP_TOO_LONG', 'NO_WINDOW',
  // warnings
  'INT_DIVISION_TRUNCATES',
] as const;
export type Code = (typeof CODES)[number];

export const FEATURES = [
  'char_literal', 'pointer', 'array', 'struct', 'function_def', 'switch', 'do', 'break',
  'continue', 'goto', 'typedef', 'enum', 'sizeof', 'static', 'const', 'ternary', 'bitwise',
  'cast', 'multi_decl',
] as const;
export type Feature = (typeof FEATURES)[number];

export type DiagParams = Record<string, string | number>;

export interface Diagnostic {
  code: Code;
  params: DiagParams;
  line: number;
  col: number;
  severity: 'error' | 'warning';
}

export class LangError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(`${diagnostic.code} at ${diagnostic.line}:${diagnostic.col}`);
  }
}

export function error(code: Code, line: number, col: number, params: DiagParams = {}): LangError {
  return new LangError({ code, params, line, col, severity: 'error' });
}
```

- [ ] **Step 4: Crear `src/i18n/ca.json`**

```json
{
  "errors": {
    "UNKNOWN_CHAR": "No entenc el caràcter «{char}».",
    "ACCENT_IN_NAME": "Els noms no poden tenir accents, ç ni altres lletres especials («{char}»). Escriu-lo sense: per exemple «puntuacio» en lloc de «puntuació».",
    "UNTERMINATED_STRING": "Has obert unes cometes \" però no les has tancat a la mateixa línia.",
    "UNTERMINATED_COMMENT": "Has obert un comentari amb /* però no l'has tancat amb */.",
    "UNSUPPORTED_INCLUDE": "Aquí només es pot fer #include \"raylib.h\" (has posat «{file}»).",
    "UNSUPPORTED_DIRECTIVE": "Les instruccions que comencen amb # (com «{directive}») encara no les fem servir.",
    "MISSING_SEMICOLON": "Falta un ; al final de la línia {line}.",
    "EXPECTED_TOKEN": "Esperava «{expected}» però he trobat «{found}».",
    "EXPECTED_NAME": "Aquí esperava el nom d'una variable, però he trobat «{found}».",
    "UNEXPECTED_TOKEN": "No esperava trobar «{found}» aquí.",
    "UNEXPECTED_EOF": "El codi s'acaba abans d'hora. Potser falta tancar una clau } o un parèntesi )?",
    "MISSING_BRACES": "Després de «{keyword}» posa les instruccions entre claus { }.",
    "ASSIGN_IN_CONDITION": "Has posat = (guardar un valor) on calia == (comparar).",
    "EXPECTED_ASSIGNMENT": "Aquí esperava una assignació (per exemple «{name} = 5;») o una crida a una funció.",
    "EXPECTED_EXPRESSION": "Aquí esperava un valor (un número, una variable...) però he trobat «{found}».",
    "INCDEC_IN_EXPRESSION": "Fes servir ++ i -- en una línia a part, per exemple «x++;».",
    "UNSUPPORTED": "{feature}",
    "UNSUPPORTED_TYPE": "El tipus «{type}» no el fem servir. Fes servir «{use}».",
    "DECL_NEEDS_INIT": "Dona un valor inicial a «{name}». Per exemple: {decl} {name} = 0;",
    "NO_MAIN": "Falta la funció principal: int main(void) { ... }",
    "UNSUPPORTED_GLOBAL": "Declara les variables a dins de main, no a fora.",
    "ALREADY_DECLARED": "Ja hi ha una variable que es diu «{name}» (línia {prevLine}). Per canviar-ne el valor, no hi tornis a posar el tipus.",
    "RESERVED_NAME": "«{name}» ja és un nom de raylib. Tria un altre nom per a la teva variable.",
    "UNDECLARED_VAR": "La variable «{name}» no existeix.",
    "NOT_A_VARIABLE": "«{name}» és una funció, no una variable. Per cridar-la posa parèntesis: {name}(...)",
    "UNKNOWN_FUNCTION": "La funció «{name}» no existeix.",
    "WRONG_ARG_COUNT": "«{name}» necessita {expected} valors i n'hi has posat {found}.",
    "ARG_TYPE": "El valor número {index} de «{name}» hauria de ser {expectedType}, però és {foundType}.",
    "TYPE_MISMATCH": "No es pot fer «{op}» amb {leftType} i {rightType}.",
    "UNARY_TYPE": "No es pot fer «{op}» amb {foundType}.",
    "ASSIGN_TYPE": "No pots guardar {foundType} dins de «{name}», que és {expectedType}.",
    "ASSIGN_TO_CONST": "«{name}» és una constant de raylib i no es pot canviar.",
    "CONDITION_TYPE": "La condició ha de ser un número o un bool, no {foundType}.",
    "MOD_NEEDS_INT": "L'operador % només funciona amb nombres enters (int).",
    "VOID_VALUE": "«{name}» no retorna cap valor, així que no el pots fer servir dins d'una operació.",
    "STRING_NOT_ALLOWED": "Els textos entre cometes només es poden posar dins de funcions com DrawText.",
    "TEXTFORMAT_ONLY_IN_DRAWTEXT": "TextFormat només es pot fer servir dins de DrawText.",
    "TEXTFORMAT_NEEDS_LITERAL": "El primer valor de TextFormat ha de ser un text entre cometes, per exemple \"%d\".",
    "TEXTFORMAT_FORMAT": "TextFormat només entén %d (enters) i %.1f, %.2f... (decimals). «{spec}» no el coneix.",
    "TEXTFORMAT_ARG_COUNT": "El text de TextFormat té {expected} forats (%) però hi has posat {found} valors.",
    "TEXTFORMAT_ARG_TYPE": "El forat {index} («{spec}») necessita {expectedType}, però li has posat {foundType}.",
    "DIVISION_BY_ZERO": "Divisió per zero! Un enter no es pot dividir entre 0.",
    "LOOP_TOO_LONG": "El bucle de la línia {line} ha donat massa voltes sense acabar el frame. Potser no s'acaba mai, o falta EndDrawing()?",
    "NO_WINDOW": "Abans de {name} has de cridar InitWindow per crear la finestra.",
    "INT_DIVISION_TRUNCATES": "Compte: {a} / {b} dona {result} i no {exact}, perquè amb enters (int) es perden els decimals."
  },
  "features": {
    "char_literal": "Els caràcters entre cometes simples ('a') encara no els fem servir. Per a textos fes servir cometes dobles \"...\".",
    "pointer": "Els punters (* i &) encara no els hem après.",
    "array": "Les llistes (arrays, amb [ ]) encara no les hem après.",
    "struct": "Les estructures (struct i el punt .) encara no les hem après.",
    "function_def": "Crear funcions pròpies encara no ho hem après. Posa tot el codi dins de main.",
    "switch": "switch encara no l'hem après. Fes servir if / else if.",
    "do": "do-while encara no l'hem après. Fes servir while.",
    "break": "break encara no l'hem après. Fes servir la condició del bucle.",
    "continue": "continue encara no l'hem après.",
    "goto": "goto no el farem servir mai 🙂.",
    "typedef": "typedef encara no l'hem après.",
    "enum": "enum encara no l'hem après.",
    "sizeof": "sizeof encara no l'hem après.",
    "static": "static encara no l'hem après.",
    "const": "const encara no l'hem après. Fes servir una variable normal.",
    "ternary": "L'operador ? : encara no l'hem après. Fes servir if / else.",
    "bitwise": "Els operadors &, |, ^, ~, << i >> no els fem servir. Potser volies dir && (i) o || (o)?",
    "cast": "Les conversions de tipus amb parèntesis, com (int), encara no les hem après.",
    "multi_decl": "Declara cada variable en una línia diferent."
  },
  "types": {
    "int": "un enter (int)",
    "float": "un decimal (float)",
    "bool": "un bool (cert/fals)",
    "Color": "un Color",
    "string": "un text",
    "void": "res"
  },
  "suggestion": "Volies dir «{suggestion}»?",
  "ui": {
    "title": "Bit Arcade — demo de l'intèrpret",
    "run": "▶ Executa",
    "stop": "⏹ Atura",
    "restore": "↺ Restaura",
    "running": "En marxa! Fes clic al joc i fes servir W/S i ↑/↓.",
    "stopped": "Aturat.",
    "finished": "El programa ha acabat.",
    "lineLabel": "Línia {line}: ",
    "warningLabel": "Avís — "
  }
}
```

- [ ] **Step 5: Implementar `src/i18n/i18n.ts`**

```ts
import ca from './ca.json';
import type { DiagParams, Diagnostic } from '../lang/diagnostics';

interface Catalog {
  errors: Record<string, string>;
  features: Record<string, string>;
  types: Record<string, string>;
  suggestion: string;
  ui: Record<string, string>;
}

const catalogs: Record<string, Catalog> = { ca };
let current = 'ca';

export function setLanguage(lang: string): void {
  if (Object.hasOwn(catalogs, lang)) current = lang;
}

type Section = 'errors' | 'features' | 'types' | 'ui';

function lookup(section: Section, key: string): string | undefined {
  const own = catalogs[current][section];
  if (Object.hasOwn(own, key)) return own[key];
  return Object.hasOwn(catalogs.ca[section], key) ? catalogs.ca[section][key] : undefined;
}

export function fill(template: string, params: DiagParams): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(params, k) ? String(params[k]) : m));
}

export function t(key: string, params: DiagParams = {}): string {
  return fill(lookup('ui', key) ?? key, params);
}

export function formatDiagnostic(d: Diagnostic): string {
  const params: DiagParams = { line: d.line, ...d.params };
  for (const [k, v] of Object.entries(params)) {
    if (k.endsWith('Type') && typeof v === 'string') params[k] = lookup('types', v) ?? v;
  }
  if (typeof params.feature === 'string') params.feature = lookup('features', params.feature) ?? params.feature;
  let msg = fill(lookup('errors', d.code) ?? d.code, params);
  if (params.suggestion !== undefined) msg += ' ' + fill(catalogs[current].suggestion, params);
  return msg;
}
```

- [ ] **Step 6: Executar els tests**

Run: `npx vitest run tests/i18n.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lang/diagnostics.ts src/i18n tests/i18n.test.ts
git commit -m "feat(lang): diagnòstics amb codis i missatges en català"
```

---

### Task 3: Lexer

**Files:**
- Create: `src/lang/tokens.ts`, `src/lang/lexer.ts`
- Test: `tests/lexer.test.ts`

**Interfaces:**
- Consumes: `error`, `LangError` (Task 2)
- Produces:
  - `type TokenKind = 'ident' | 'keyword' | 'int' | 'float' | 'string' | 'sym' | 'eof'`
  - `interface Token { kind: TokenKind; text: string; value?: number | string; line: number; col: number }` (`value` = número per a `int`/`float`, text descodificat per a `string`)
  - `KEYWORDS: Set<string>`
  - `lex(source: string): Token[]` — llença `LangError` al primer error; l'últim token sempre és `eof`. `#include "raylib.h"` (o `<raylib.h>`) s'ignora.

- [ ] **Step 1: Escriure el test que falla**

`tests/lexer.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lex } from '../src/lang/lexer';
import { LangError } from '../src/lang/diagnostics';

function lexError(src: string) {
  try { lex(src); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('lex', () => {
  it('tokenizes a declaration', () => {
    const toks = lex('int x = 5;');
    expect(toks.map((t) => [t.kind, t.text])).toEqual([
      ['keyword', 'int'], ['ident', 'x'], ['sym', '='], ['int', '5'], ['sym', ';'], ['eof', ''],
    ]);
    expect(toks[3].value).toBe(5);
  });

  it('reads floats with and without suffix', () => {
    const [a, b] = lex('2.5f 3.');
    expect([a.kind, a.value, a.text]).toEqual(['float', 2.5, '2.5f']);
    expect([b.kind, b.value]).toEqual(['float', 3]);
  });

  it('decodes strings', () => {
    expect(lex('"hola\\n\\"tu\\""')[0].value).toBe('hola\n"tu"');
  });

  it('prefers the longest symbol', () => {
    expect(lex('a += 1; b == c && d').filter((t) => t.kind === 'sym').map((t) => t.text))
      .toEqual(['+=', ';', '==', '&&']);
  });

  it('skips comments and tracks positions', () => {
    const toks = lex('// a\n/* b\n c */ x');
    expect(toks[0]).toMatchObject({ text: 'x', line: 3, col: 7 });
  });

  it('ignores #include "raylib.h"', () => {
    expect(lex('#include "raylib.h"\nint').map((t) => t.text)).toEqual(['int', '']);
    expect(lex('#include <raylib.h> // comentari\nint').map((t) => t.text)).toEqual(['int', '']);
  });

  it('rejects other includes and directives', () => {
    expect(lexError('#include <stdio.h>')).toMatchObject({ code: 'UNSUPPORTED_INCLUDE', params: { file: 'stdio.h' } });
    expect(lexError('#define X 3')).toMatchObject({ code: 'UNSUPPORTED_DIRECTIVE', params: { directive: '#define' } });
  });

  it('explains accents in names', () => {
    expect(lexError('int puntuació = 0;')).toMatchObject({ code: 'ACCENT_IN_NAME', params: { char: 'ó' }, line: 1, col: 13 });
    expect(lexError('int ç = 0;')).toMatchObject({ code: 'ACCENT_IN_NAME', params: { char: 'ç' } });
  });

  it('reports unterminated strings and comments', () => {
    expect(lexError('x = "hola\n";')).toMatchObject({ code: 'UNTERMINATED_STRING', line: 1, col: 5 });
    expect(lexError('/* x')).toMatchObject({ code: 'UNTERMINATED_COMMENT', line: 1, col: 1 });
  });

  it('reports unknown characters and char literals', () => {
    expect(lexError('x @ y')).toMatchObject({ code: 'UNKNOWN_CHAR', params: { char: '@' }, col: 3 });
    expect(lexError("c = 'a';")).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'char_literal' } });
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/lexer.test.ts`
Expected: FAIL — no es pot resoldre `../src/lang/lexer`.

- [ ] **Step 3: Implementar `src/lang/tokens.ts`**

```ts
export type TokenKind = 'ident' | 'keyword' | 'int' | 'float' | 'string' | 'sym' | 'eof';

export interface Token {
  kind: TokenKind;
  text: string;
  value?: number | string;
  line: number;
  col: number;
}

export const KEYWORDS = new Set([
  'int', 'float', 'bool', 'void', 'if', 'else', 'while', 'for', 'return', 'true', 'false',
  // C keywords we recognise only to give a friendly "not supported" error
  'double', 'char', 'long', 'short', 'unsigned', 'signed', 'const', 'switch', 'case', 'default',
  'do', 'break', 'continue', 'goto', 'struct', 'typedef', 'static', 'enum', 'sizeof',
]);
```

- [ ] **Step 4: Implementar `src/lang/lexer.ts`**

```ts
import { error } from './diagnostics';
import { KEYWORDS, type Token } from './tokens';

const SYMBOLS = [
  '<<=', '>>=', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
  '->', '<<', '>>', '+', '-', '*', '/', '%', '<', '>', '=', '!', '&', '|', '^', '~', '?', ':',
  '.', '(', ')', '{', '}', '[', ']', ';', ',',
];
const LETTER = /\p{L}/u;

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let atLineStart = true;
  const peek = (o = 0) => source[i + o] ?? '';
  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (source[i] === '\n') { line++; col = 1; } else { col++; }
      i++;
    }
  };

  while (i < source.length) {
    const c = peek();
    if (c === '\n') { advance(); atLineStart = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { advance(); continue; }
    if (c === '/' && peek(1) === '/') { while (i < source.length && peek() !== '\n') advance(); continue; }
    if (c === '/' && peek(1) === '*') {
      const sl = line, sc = col;
      advance(2);
      while (i < source.length && !(peek() === '*' && peek(1) === '/')) advance();
      if (i >= source.length) throw error('UNTERMINATED_COMMENT', sl, sc);
      advance(2);
      continue;
    }

    const startLine = line, startCol = col;
    if (c === '#') {
      if (!atLineStart) throw error('UNKNOWN_CHAR', line, col, { char: '#' });
      let text = '';
      while (i < source.length && peek() !== '\n') { text += peek(); advance(); }
      handleDirective(text.replace(/\/\/.*$/, '').trim(), startLine, startCol);
      continue;
    }
    atLineStart = false;

    if (/[0-9]/.test(c)) {
      let text = '';
      while (/[0-9]/.test(peek())) { text += peek(); advance(); }
      let isFloat = false;
      if (peek() === '.') {
        isFloat = true;
        text += '.'; advance();
        while (/[0-9]/.test(peek())) { text += peek(); advance(); }
      }
      let full = text;
      if (isFloat && (peek() === 'f' || peek() === 'F')) { full += peek(); advance(); }
      tokens.push({
        kind: isFloat ? 'float' : 'int', text: full,
        value: isFloat ? parseFloat(text) : parseInt(text, 10), line: startLine, col: startCol,
      });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let text = '';
      while (/[A-Za-z0-9_]/.test(peek())) { text += peek(); advance(); }
      if (LETTER.test(peek())) throw error('ACCENT_IN_NAME', line, col, { char: peek() });
      tokens.push({ kind: KEYWORDS.has(text) ? 'keyword' : 'ident', text, line: startLine, col: startCol });
      continue;
    }

    if (c === '"') {
      let raw = '"';
      let value = '';
      advance();
      for (;;) {
        const ch = peek();
        if (ch === '' || ch === '\n') throw error('UNTERMINATED_STRING', startLine, startCol);
        if (ch === '"') { raw += ch; advance(); break; }
        if (ch === '\\') {
          const next = peek(1);
          raw += ch + next;
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          advance(2);
          continue;
        }
        raw += ch; value += ch; advance();
      }
      tokens.push({ kind: 'string', text: raw, value, line: startLine, col: startCol });
      continue;
    }

    if (c === "'") throw error('UNSUPPORTED', line, col, { feature: 'char_literal' });

    const sym = SYMBOLS.find((s) => source.startsWith(s, i));
    if (sym) {
      tokens.push({ kind: 'sym', text: sym, line: startLine, col: startCol });
      advance(sym.length);
      continue;
    }

    if (LETTER.test(c)) throw error('ACCENT_IN_NAME', line, col, { char: c });
    throw error('UNKNOWN_CHAR', line, col, { char: c });
  }

  tokens.push({ kind: 'eof', text: '', line, col });
  return tokens;
}

function handleDirective(text: string, line: number, col: number): void {
  const inc = /^#\s*include\s*[<"]([^>"]*)[>"]\s*$/.exec(text);
  if (inc) {
    if (inc[1].trim() === 'raylib.h') return;
    throw error('UNSUPPORTED_INCLUDE', line, col, { file: inc[1].trim() });
  }
  if (/^#\s*include\b/.test(text)) {
    throw error('UNSUPPORTED_INCLUDE', line, col, { file: text.replace(/^#\s*include\s*/, '') });
  }
  throw error('UNSUPPORTED_DIRECTIVE', line, col, { directive: text.split(/\s+/)[0] });
}
```

- [ ] **Step 5: Executar els tests**

Run: `npx vitest run tests/lexer.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lang/tokens.ts src/lang/lexer.ts tests/lexer.test.ts
git commit -m "feat(lang): lexer amb errors amigables (accents, includes, cadenes)"
```

---

### Task 4: AST i parser

**Files:**
- Create: `src/lang/ast.ts`, `src/lang/parser.ts`
- Test: `tests/parser.test.ts`

**Interfaces:**
- Consumes: `Token` (Task 3), `error` (Task 2)
- Produces: tots els tipus de `ast.ts` (vegeu el codi) i `parse(tokens: Token[]): Program`. Cada node té `id` únic, `line`, `col`. Les expressions tenen `type?: ValueType` (l'omple el checker). `Assign`/`IncDec` tenen `targetType?` (l'omple el checker). El parser llença `LangError` al primer error.

- [ ] **Step 1: Escriure el test que falla**

`tests/parser.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lex } from '../src/lang/lexer';
import { parse } from '../src/lang/parser';
import { LangError } from '../src/lang/diagnostics';
import type { Binary, If, VarDecl } from '../src/lang/ast';

const p = (src: string) => parse(lex(src));
const main = (body: string) => `int main(void) {\n${body}\n}`; // body starts on line 2
function parseError(src: string) {
  try { p(src); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('parse: valid programs', () => {
  it('parses an empty main (with or without void)', () => {
    expect(p('int main(void) { }').main.body).toEqual([]);
    expect(p('int main() { return 0; }').main.body[0].kind).toBe('Return');
  });

  it('respects operator precedence', () => {
    const decl = p(main('int x = 1 + 2 * 3;')).main.body[0] as VarDecl;
    const plus = decl.init as Binary;
    expect(plus.op).toBe('+');
    expect((plus.right as Binary).op).toBe('*');
  });

  it('parses comparisons and logic', () => {
    const decl = p(main('bool b = a < 3 && !c || d == 2;')).main.body[0] as VarDecl;
    expect((decl.init as Binary).op).toBe('||');
    expect(((decl.init as Binary).left as Binary).op).toBe('&&');
  });

  it('parses else-if chains', () => {
    const s = p(main('if (x > 1) { x = 1; } else if (x > 0) { x = 2; } else { x = 3; }')).main.body[0] as If;
    expect(s.otherwise?.kind).toBe('If');
    expect((s.otherwise as If).otherwise?.kind).toBe('Block');
  });

  it('parses for, while, calls, compound assignment and ++', () => {
    const body = p(main([
      'for (int i = 0; i < 10; i++) { x += i; }',
      'while (!WindowShouldClose()) { DrawText("hola", 1, 2, 20, RED); }',
      'x--;',
      '++x;',
    ].join('\n'))).main.body;
    expect(body.map((s) => s.kind)).toEqual(['For', 'While', 'IncDec', 'IncDec']);
  });

  it('records positions', () => {
    const s = p(main('    int x = 5;')).main.body[0];
    expect([s.line, s.col]).toEqual([2, 5]);
  });

  it('gives every node a different id', () => {
    const prog = p(main('int x = 1 + 2;\nx = x * 3;'));
    const decl = prog.main.body[0] as VarDecl;
    const ids = [prog.main.id, decl.id, decl.init.id, (decl.init as Binary).left.id, prog.main.body[1].id];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parse: errors', () => {
  it('reports a missing semicolon on the line where it is missing', () => {
    expect(parseError(main('int x = 5\nx = 6;'))).toMatchObject({ code: 'MISSING_SEMICOLON', line: 2 });
  });
  it('requires braces', () => {
    expect(parseError(main('if (x > 1) x = 2;'))).toMatchObject({ code: 'MISSING_BRACES', params: { keyword: 'if' } });
    expect(parseError(main('while (1) x = 2;'))).toMatchObject({ code: 'MISSING_BRACES', params: { keyword: 'while' } });
  });
  it('explains = inside a condition', () => {
    expect(parseError(main('if (x = 5) { }'))).toMatchObject({ code: 'ASSIGN_IN_CONDITION', line: 2, col: 7 });
  });
  it('requires an initial value', () => {
    expect(parseError(main('int x;'))).toMatchObject({ code: 'DECL_NEEDS_INIT', params: { name: 'x', decl: 'int' } });
  });
  it('rejects unsupported constructs with a feature name', () => {
    expect(parseError(main('switch (x) { }'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'switch' } });
    expect(parseError(main('int a[3] = 0;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'array' } });
    expect(parseError(main('x = (int)y;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'cast' } });
    expect(parseError(main('x = a & b;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'bitwise' } });
    expect(parseError(main('int a = 1, b = 2;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'multi_decl' } });
    expect(parseError(main('break;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'break' } });
  });
  it('rejects ++ inside expressions', () => {
    expect(parseError(main('x = y++;'))).toMatchObject({ code: 'INCDEC_IN_EXPRESSION' });
  });
  it('suggests float instead of double', () => {
    expect(parseError(main('double d = 1.0;'))).toMatchObject({ code: 'UNSUPPORTED_TYPE', params: { type: 'double', use: 'float' } });
  });
  it('rejects statements that do nothing', () => {
    expect(parseError(main('x == 5;'))).toMatchObject({ code: 'EXPECTED_ASSIGNMENT', params: { name: 'x' } });
  });
  it('checks the program structure', () => {
    expect(parseError('')).toMatchObject({ code: 'NO_MAIN' });
    expect(parseError('int x = 5;\nint main(void) { }')).toMatchObject({ code: 'UNSUPPORTED_GLOBAL' });
    expect(parseError('int f(void) { return 1; }')).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'function_def' } });
    expect(parseError('int main(void) {\nint x = 1;')).toMatchObject({ code: 'UNEXPECTED_EOF' });
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — no es pot resoldre `../src/lang/parser`.

- [ ] **Step 3: Implementar `src/lang/ast.ts`**

```ts
export type ValueType = 'int' | 'float' | 'bool' | 'Color' | 'string' | 'void';
export type DeclType = 'int' | 'float' | 'bool' | 'Color';
export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '&&' | '||';
export type AssignOp = '=' | '+=' | '-=' | '*=' | '/=';

export interface Node { id: number; line: number; col: number }
interface ExprBase extends Node { type?: ValueType }

export interface IntLit extends ExprBase { kind: 'IntLit'; value: number }
export interface FloatLit extends ExprBase { kind: 'FloatLit'; value: number }
export interface BoolLit extends ExprBase { kind: 'BoolLit'; value: boolean }
export interface StringLit extends ExprBase { kind: 'StringLit'; value: string }
export interface VarRef extends ExprBase { kind: 'Var'; name: string }
export interface Unary extends ExprBase { kind: 'Unary'; op: '-' | '!'; operand: Expr }
export interface Binary extends ExprBase { kind: 'Binary'; op: BinaryOp; left: Expr; right: Expr }
export interface Call extends ExprBase { kind: 'Call'; callee: string; args: Expr[] }
export type Expr = IntLit | FloatLit | BoolLit | StringLit | VarRef | Unary | Binary | Call;

export interface VarDecl extends Node { kind: 'VarDecl'; varType: DeclType; name: string; init: Expr }
export interface Assign extends Node { kind: 'Assign'; target: string; op: AssignOp; value: Expr; targetType?: DeclType }
export interface IncDec extends Node { kind: 'IncDec'; target: string; op: '++' | '--'; targetType?: DeclType }
export interface ExprStmt extends Node { kind: 'ExprStmt'; expr: Call }
export interface Block extends Node { kind: 'Block'; body: Stmt[] }
export interface If extends Node { kind: 'If'; cond: Expr; then: Block; otherwise: Block | If | null }
export interface While extends Node { kind: 'While'; cond: Expr; body: Block }
export interface For extends Node {
  kind: 'For'; init: VarDecl | Assign | IncDec | null; cond: Expr | null; update: Assign | IncDec | null; body: Block;
}
export interface Return extends Node { kind: 'Return'; value: Expr | null }
export type Stmt = VarDecl | Assign | IncDec | ExprStmt | Block | If | While | For | Return;

export interface Program { kind: 'Program'; main: Block }
```

- [ ] **Step 4: Implementar `src/lang/parser.ts`**

```ts
import type * as A from './ast';
import { error, type Code, type DiagParams, type Feature } from './diagnostics';
import type { Token } from './tokens';

const DECL_TYPES = new Set(['int', 'float', 'bool', 'Color']);
const OTHER_C_TYPES: Record<string, string> = {
  double: 'float', char: 'int', long: 'int', short: 'int', unsigned: 'int', signed: 'int',
};
const UNSUPPORTED_KEYWORDS: Record<string, Feature> = {
  switch: 'switch', case: 'switch', default: 'switch', do: 'do', break: 'break', continue: 'continue',
  goto: 'goto', struct: 'struct', typedef: 'typedef', enum: 'enum', sizeof: 'sizeof', static: 'static',
  const: 'const',
};
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=']);
const BITWISE = new Set(['&', '|', '^', '~', '<<', '>>', '<<=', '>>=', '%=']);

export function parse(tokens: Token[]): A.Program {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private pos = 0;
  private nextId = 1;

  constructor(private readonly tokens: Token[]) {}

  private get tok(): Token { return this.tokens[this.pos]; }
  private peekTok(offset: number): Token { return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]; }
  private prev(): Token { return this.tokens[Math.max(this.pos - 1, 0)]; }
  private is(text: string): boolean {
    const t = this.tok;
    return (t.kind === 'sym' || t.kind === 'keyword') && t.text === text;
  }
  private advance(): Token {
    const t = this.tok;
    if (t.kind !== 'eof') this.pos++;
    return t;
  }
  private node(t: Token): A.Node { return { id: this.nextId++, line: t.line, col: t.col }; }
  private fail(t: Token, code: Code, params: DiagParams = {}): never {
    if (t.kind === 'eof') throw error('UNEXPECTED_EOF', t.line, t.col);
    throw error(code, t.line, t.col, params);
  }
  private expect(text: string): Token {
    if (this.is(text)) return this.advance();
    return this.fail(this.tok, 'EXPECTED_TOKEN', { expected: text, found: this.tok.text });
  }
  private expectSemicolon(): void {
    if (this.is(';')) { this.advance(); return; }
    const p = this.prev();
    throw error('MISSING_SEMICOLON', p.line, p.col + p.text.length);
  }
  private isTypeStart(): boolean {
    const t = this.tok;
    if (t.kind === 'keyword') return DECL_TYPES.has(t.text) || Object.hasOwn(OTHER_C_TYPES, t.text);
    return t.kind === 'ident' && t.text === 'Color' && this.peekTok(1).kind === 'ident';
  }

  parseProgram(): A.Program {
    const t = this.tok;
    if (t.kind === 'eof') throw error('NO_MAIN', t.line, t.col);
    if (!this.isTypeStart() && !this.is('void')) this.fail(t, 'NO_MAIN');
    const name = this.peekTok(1);
    if (name.kind === 'ident' && name.text !== 'main') {
      if (this.peekTok(2).text === '(') this.fail(t, 'UNSUPPORTED', { feature: 'function_def' });
      this.fail(t, 'UNSUPPORTED_GLOBAL');
    }
    this.expect('int');
    if (!(this.tok.kind === 'ident' && this.tok.text === 'main')) this.fail(this.tok, 'NO_MAIN');
    this.advance();
    this.expect('(');
    if (this.is('void')) this.advance();
    this.expect(')');
    const main = this.parseBlock();
    if (this.tok.kind !== 'eof') {
      if (this.isTypeStart() && this.peekTok(2).text === '(') this.fail(this.tok, 'UNSUPPORTED', { feature: 'function_def' });
      this.fail(this.tok, 'UNEXPECTED_TOKEN', { found: this.tok.text });
    }
    return { kind: 'Program', main };
  }

  private parseBlock(): A.Block {
    const open = this.expect('{');
    const body: A.Stmt[] = [];
    while (!this.is('}')) {
      if (this.tok.kind === 'eof') throw error('UNEXPECTED_EOF', this.tok.line, this.tok.col);
      const s = this.parseStatement();
      if (s) body.push(s);
    }
    this.advance();
    return { kind: 'Block', body, ...this.node(open) };
  }

  private parseBody(keyword: string): A.Block {
    if (!this.is('{')) this.fail(this.tok, 'MISSING_BRACES', { keyword });
    return this.parseBlock();
  }

  private parseStatement(): A.Stmt | null {
    const t = this.tok;
    if (this.is(';')) { this.advance(); return null; }
    if (this.is('{')) return this.parseBlock();
    if (t.kind === 'keyword') {
      if (t.text === 'if') return this.parseIf();
      if (t.text === 'while') return this.parseWhile();
      if (t.text === 'for') return this.parseFor();
      if (t.text === 'return') {
        this.advance();
        const value = this.is(';') ? null : this.parseExpression();
        this.expectSemicolon();
        return { kind: 'Return', value, ...this.node(t) };
      }
      if (Object.hasOwn(UNSUPPORTED_KEYWORDS, t.text)) this.fail(t, 'UNSUPPORTED', { feature: UNSUPPORTED_KEYWORDS[t.text] });
    }
    if (this.isTypeStart()) {
      const decl = this.parseVarDecl();
      this.expectSemicolon();
      return decl;
    }
    const simple = this.parseSimple();
    this.expectSemicolon();
    return simple;
  }

  private parseVarDecl(): A.VarDecl {
    const t = this.advance();
    if (Object.hasOwn(OTHER_C_TYPES, t.text)) this.fail(t, 'UNSUPPORTED_TYPE', { type: t.text, use: OTHER_C_TYPES[t.text] });
    if (this.is('*')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'pointer' });
    const name = this.tok;
    if (name.kind !== 'ident') this.fail(name, 'EXPECTED_NAME', { found: name.text });
    this.advance();
    if (this.is('(')) this.fail(name, 'UNSUPPORTED', { feature: 'function_def' });
    if (this.is('[')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'array' });
    if (this.is(',')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'multi_decl' });
    if (this.is(';')) this.fail(name, 'DECL_NEEDS_INIT', { name: name.text, decl: t.text });
    this.expect('=');
    const init = this.parseExpression();
    if (this.is(',')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'multi_decl' });
    return { kind: 'VarDecl', varType: t.text as A.DeclType, name: name.text, init, ...this.node(t) };
  }

  /** Assignment, ++/-- or a function call (without the trailing semicolon). */
  private parseSimple(): A.Assign | A.IncDec | A.ExprStmt {
    const t = this.tok;
    if (this.is('++') || this.is('--')) {
      this.advance();
      const name = this.tok;
      if (name.kind !== 'ident') this.fail(name, 'EXPECTED_NAME', { found: name.text });
      this.advance();
      return { kind: 'IncDec', target: name.text, op: t.text as '++' | '--', ...this.node(t) };
    }
    if (this.is('*') || this.is('&')) this.fail(t, 'UNSUPPORTED', { feature: 'pointer' });
    if (t.kind !== 'ident') this.fail(t, 'UNEXPECTED_TOKEN', { found: t.text });
    if (this.peekTok(1).kind === 'sym' && this.peekTok(1).text === '(') {
      const call = this.parseCall();
      return { kind: 'ExprStmt', expr: call, ...this.node(t) };
    }
    this.advance();
    if (this.is('++') || this.is('--')) {
      const op = this.advance().text as '++' | '--';
      return { kind: 'IncDec', target: t.text, op, ...this.node(t) };
    }
    if (this.tok.kind === 'sym' && ASSIGN_OPS.has(this.tok.text)) {
      const op = this.advance().text as A.AssignOp;
      const value = this.parseExpression();
      return { kind: 'Assign', target: t.text, op, value, ...this.node(t) };
    }
    if (this.is('[')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'array' });
    if (this.is('.') || this.is('->')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'struct' });
    if (this.tok.kind === 'sym' && BITWISE.has(this.tok.text)) this.fail(this.tok, 'UNSUPPORTED', { feature: 'bitwise' });
    return this.fail(t, 'EXPECTED_ASSIGNMENT', { name: t.text });
  }

  private parseIf(): A.If {
    const t = this.advance();
    this.expect('(');
    const cond = this.parseExpression();
    this.expect(')');
    const then = this.parseBody('if');
    let otherwise: A.Block | A.If | null = null;
    if (this.is('else')) {
      this.advance();
      otherwise = this.is('if') ? this.parseIf() : this.parseBody('else');
    }
    return { kind: 'If', cond, then, otherwise, ...this.node(t) };
  }

  private parseWhile(): A.While {
    const t = this.advance();
    this.expect('(');
    const cond = this.parseExpression();
    this.expect(')');
    const body = this.parseBody('while');
    return { kind: 'While', cond, body, ...this.node(t) };
  }

  private parseFor(): A.For {
    const t = this.advance();
    this.expect('(');
    let init: A.For['init'] = null;
    if (!this.is(';')) {
      const s = this.isTypeStart() ? this.parseVarDecl() : this.parseSimple();
      if (s.kind === 'ExprStmt') this.fail(t, 'EXPECTED_ASSIGNMENT', { name: s.expr.callee });
      init = s;
    }
    this.expect(';');
    const cond = this.is(';') ? null : this.parseExpression();
    this.expect(';');
    let update: A.For['update'] = null;
    if (!this.is(')')) {
      const s = this.parseSimple();
      if (s.kind === 'ExprStmt') this.fail(t, 'EXPECTED_ASSIGNMENT', { name: s.expr.callee });
      update = s;
    }
    this.expect(')');
    const body = this.parseBody('for');
    return { kind: 'For', init, cond, update, body, ...this.node(t) };
  }

  parseExpression(): A.Expr {
    const e = this.parseOr();
    const t = this.tok;
    if (t.kind === 'sym') {
      if (ASSIGN_OPS.has(t.text)) this.fail(t, 'ASSIGN_IN_CONDITION');
      if (t.text === '?') this.fail(t, 'UNSUPPORTED', { feature: 'ternary' });
    }
    return e;
  }

  private binaryLevel(ops: string[], next: () => A.Expr): A.Expr {
    let left = next();
    while (this.tok.kind === 'sym' && ops.includes(this.tok.text)) {
      const opTok = this.advance();
      const right = next();
      left = { kind: 'Binary', op: opTok.text as A.BinaryOp, left, right, ...this.node(opTok) };
    }
    return left;
  }
  private parseOr = (): A.Expr => this.binaryLevel(['||'], this.parseAnd);
  private parseAnd = (): A.Expr => this.binaryLevel(['&&'], this.parseEquality);
  private parseEquality = (): A.Expr => this.binaryLevel(['==', '!='], this.parseRelational);
  private parseRelational = (): A.Expr => this.binaryLevel(['<', '>', '<=', '>='], this.parseAdditive);
  private parseAdditive = (): A.Expr => this.binaryLevel(['+', '-'], this.parseMultiplicative);
  private parseMultiplicative = (): A.Expr => this.binaryLevel(['*', '/', '%'], this.parseUnary);

  private parseUnary = (): A.Expr => {
    const t = this.tok;
    if (this.is('-') || this.is('!')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'Unary', op: t.text as '-' | '!', operand, ...this.node(t) };
    }
    if (this.is('+')) { this.advance(); return this.parseUnary(); }
    if (this.is('++') || this.is('--')) this.fail(t, 'INCDEC_IN_EXPRESSION');
    if (this.is('&') || this.is('*')) this.fail(t, 'UNSUPPORTED', { feature: 'pointer' });
    if (this.is('~')) this.fail(t, 'UNSUPPORTED', { feature: 'bitwise' });
    return this.parsePostfix();
  };

  private parsePostfix(): A.Expr {
    const e = this.parsePrimary();
    const t = this.tok;
    if (t.kind === 'sym') {
      if (t.text === '++' || t.text === '--') this.fail(t, 'INCDEC_IN_EXPRESSION');
      if (t.text === '[') this.fail(t, 'UNSUPPORTED', { feature: 'array' });
      if (t.text === '.' || t.text === '->') this.fail(t, 'UNSUPPORTED', { feature: 'struct' });
      if (BITWISE.has(t.text)) this.fail(t, 'UNSUPPORTED', { feature: 'bitwise' });
    }
    return e;
  }

  private parsePrimary(): A.Expr {
    const t = this.tok;
    switch (t.kind) {
      case 'int':
        this.advance();
        return { kind: 'IntLit', value: t.value as number, ...this.node(t) };
      case 'float':
        this.advance();
        return { kind: 'FloatLit', value: t.value as number, ...this.node(t) };
      case 'string':
        this.advance();
        return { kind: 'StringLit', value: t.value as string, ...this.node(t) };
      case 'keyword':
        if (t.text === 'true' || t.text === 'false') {
          this.advance();
          return { kind: 'BoolLit', value: t.text === 'true', ...this.node(t) };
        }
        if (t.text === 'sizeof') this.fail(t, 'UNSUPPORTED', { feature: 'sizeof' });
        break;
      case 'ident':
        if (this.peekTok(1).kind === 'sym' && this.peekTok(1).text === '(') return this.parseCall();
        this.advance();
        return { kind: 'Var', name: t.text, ...this.node(t) };
      case 'sym':
        if (t.text === '(') {
          const next = this.peekTok(1);
          const isCast = (next.kind === 'keyword' && (DECL_TYPES.has(next.text) || Object.hasOwn(OTHER_C_TYPES, next.text)))
            || (next.kind === 'ident' && next.text === 'Color' && this.peekTok(2).text === ')');
          if (isCast) this.fail(t, 'UNSUPPORTED', { feature: 'cast' });
          this.advance();
          const e = this.parseExpression();
          this.expect(')');
          return e;
        }
        break;
      case 'eof':
        break;
    }
    return this.fail(t, 'EXPECTED_EXPRESSION', { found: t.text });
  }

  private parseCall(): A.Call {
    const name = this.advance();
    this.expect('(');
    const args: A.Expr[] = [];
    if (!this.is(')')) {
      args.push(this.parseExpression());
      while (this.is(',')) {
        this.advance();
        args.push(this.parseExpression());
      }
    }
    this.expect(')');
    return { kind: 'Call', callee: name.text, args, ...this.node(name) };
  }
}
```

- [ ] **Step 5: Executar els tests**

Run: `npx vitest run tests/parser.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lang/ast.ts src/lang/parser.ts tests/parser.test.ts
git commit -m "feat(lang): parser del mini-C amb errors específics"
```

---

### Task 5: Checker de tipus i `compile()`

**Files:**
- Create: `src/lang/host.ts`, `src/lang/suggest.ts`, `src/lang/format.ts`, `src/lang/checker.ts`, `src/lang/compile.ts`
- Test: `tests/checker.test.ts`, `tests/format.test.ts`

**Interfaces:**
- Consumes: AST (Task 4), `lex`, `parse`, `error`, `LangError`, `Diagnostic`
- Produces:
  - `host.ts`: `ColorValue { r; g; b; a }`, `type Value = number | boolean | string | ColorValue`, `NativeSignature { params: ValueType[]; returns: ValueType; variadic?: boolean }`, `NativeFunction extends NativeSignature { call(args: Value[]): Value | undefined }`, `ConstantDef { type: ValueType; value: Value }`, `HostSignature { functions: Record<string, NativeSignature>; constants: Record<string, { type: ValueType }> }`, `HostEnv extends HostSignature { functions: Record<string, NativeFunction>; constants: Record<string, ConstantDef>; takeFrameYield(): boolean }`, `class NativeError extends Error { code: Code; params: DiagParams }`
  - `suggest(name: string, candidates: string[]): string | undefined`
  - `format.ts`: `FormatSpec { text; kind: 'int' | 'float'; precision }`, `FormatPart = string | FormatSpec`, `parseFormat(fmt: string): FormatPart[] | { bad: string }`, `formatText(parts: FormatPart[], values: Value[]): string`
  - `check(program: Program, host: HostSignature): void` — llença `LangError`; omple `expr.type` a totes les expressions i `targetType` a `Assign`/`IncDec`.
  - `compile(source: string, host: HostSignature): CompileResult` amb `CompileResult = { ok: true; program: Program } | { ok: false; diagnostic: Diagnostic }`
  - Regla: `TextFormat` (nom fix) només s'accepta com a argument d'un paràmetre de tipus `string`.

- [ ] **Step 1: Escriure els tests que fallen**

`tests/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatText, parseFormat } from '../src/lang/format';

describe('TextFormat formatting', () => {
  it('parses %d and %.Nf', () => {
    const parts = parseFormat('Punts: %d (%.1f%%)');
    expect(parts).toEqual(['Punts: ', { text: '%d', kind: 'int', precision: 0 }, ' (',
      { text: '%.1f', kind: 'float', precision: 1 }, '%)']);
  });
  it('rejects unknown specifiers', () => {
    expect(parseFormat('%s')).toEqual({ bad: '%s' });
    expect(parseFormat('100%')).toEqual({ bad: '%' });
  });
  it('formats values', () => {
    const parts = parseFormat('%d - %.2f');
    if (!Array.isArray(parts)) throw new Error('bad format');
    expect(formatText(parts, [7, 3.14159])).toBe('7 - 3.14');
    expect(formatText(parts, [true, 1])).toBe('1 - 1.00');
  });
});
```

`tests/checker.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { compile } from '../src/lang/compile';
import type { HostSignature } from '../src/lang/host';
import type { Binary, VarDecl } from '../src/lang/ast';

const host: HostSignature = {
  functions: {
    DrawRectangle: { params: ['int', 'int', 'int', 'int', 'Color'], returns: 'void' },
    DrawText: { params: ['string', 'int', 'int', 'int', 'Color'], returns: 'void' },
    IsKeyDown: { params: ['int'], returns: 'bool' },
    EndDrawing: { params: [], returns: 'void' },
    TextFormat: { params: ['string'], returns: 'string', variadic: true },
  },
  constants: { RED: { type: 'Color' }, KEY_W: { type: 'int' } },
};
const main = (body: string) => `int main(void) {\n${body}\n}`;
function ok(body: string) {
  const r = compile(main(body), host);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostic));
  return r.program;
}
function fails(body: string) {
  const r = compile(main(body), host);
  if (r.ok) throw new Error('expected an error');
  return r.diagnostic;
}

describe('check: valid code', () => {
  it('annotates expression types with C promotion rules', () => {
    const prog = ok('float f = 1 + 2.5;\nint i = 7 / 2;\nbool b = i > 3;');
    const [f, i, b] = prog.main.body as VarDecl[];
    expect(f.init.type).toBe('float');
    expect((i.init as Binary).type).toBe('int');
    expect(b.init.type).toBe('bool');
  });
  it('accepts constants, calls and TextFormat inside DrawText', () => {
    ok('int x = 0;\nif (IsKeyDown(KEY_W)) { x = x + 1; }\nDrawRectangle(x, 0, 10, 10, RED);\nDrawText(TextFormat("%d", x), 1, 2, 20, RED);');
  });
  it('allows implicit int/float conversions like C', () => {
    ok('int x = 2.7;\nfloat f = x;\nx += 1.5;\nbool b = x;');
  });
  it('allows shadowing in an inner block and scopes for-variables', () => {
    ok('int x = 1;\n{ int x = 2; }\nfor (int i = 0; i < 3; i++) { x += i; }\nint i = 9;');
  });
});

describe('check: errors', () => {
  it('suggests names for undeclared variables', () => {
    expect(fails('int pilotaX = 0;\npilotax = 3;')).toMatchObject({ code: 'UNDECLARED_VAR', line: 3, params: { name: 'pilotax', suggestion: 'pilotaX' } });
  });
  it('reports duplicate declarations with the first line', () => {
    expect(fails('int x = 0;\nint x = 1;')).toMatchObject({ code: 'ALREADY_DECLARED', line: 3, params: { name: 'x', prevLine: 2 } });
  });
  it('protects raylib names', () => {
    expect(fails('int RED = 1;')).toMatchObject({ code: 'RESERVED_NAME' });
    expect(fails('RED = 1;')).toMatchObject({ code: 'ASSIGN_TO_CONST', params: { name: 'RED' } });
    expect(fails('int x = IsKeyDown;')).toMatchObject({ code: 'NOT_A_VARIABLE' });
  });
  it('checks assignment and operator types', () => {
    expect(fails('int x = RED;')).toMatchObject({ code: 'ASSIGN_TYPE', params: { name: 'x', foundType: 'Color', expectedType: 'int' } });
    expect(fails('int x = RED + 1;')).toMatchObject({ code: 'TYPE_MISMATCH', params: { op: '+', leftType: 'Color', rightType: 'int' } });
    expect(fails('int x = -RED;')).toMatchObject({ code: 'UNARY_TYPE', params: { op: '-', foundType: 'Color' } });
    expect(fails('float f = 5.5 % 2;')).toMatchObject({ code: 'MOD_NEEDS_INT' });
    expect(fails('if (RED) { }')).toMatchObject({ code: 'CONDITION_TYPE', params: { foundType: 'Color' } });
  });
  it('checks calls', () => {
    expect(fails('DrawRectangel(1, 2, 3, 4, RED);')).toMatchObject({ code: 'UNKNOWN_FUNCTION', params: { name: 'DrawRectangel', suggestion: 'DrawRectangle' } });
    expect(fails('DrawRectangle(1, 2, 3, RED);')).toMatchObject({ code: 'WRONG_ARG_COUNT', params: { name: 'DrawRectangle', expected: 5, found: 4 } });
    expect(fails('DrawRectangle(1, 2, 3, 4, 5);')).toMatchObject({ code: 'ARG_TYPE', params: { index: 5, expectedType: 'Color', foundType: 'int' } });
    expect(fails('DrawText(5, 1, 2, 20, RED);')).toMatchObject({ code: 'ARG_TYPE', params: { index: 1, expectedType: 'string', foundType: 'int' } });
    expect(fails('int x = EndDrawing();')).toMatchObject({ code: 'VOID_VALUE', params: { name: 'EndDrawing' } });
  });
  it('restricts strings and TextFormat', () => {
    expect(fails('int x = "hola";')).toMatchObject({ code: 'STRING_NOT_ALLOWED' });
    expect(fails('int x = TextFormat("%d", 1);')).toMatchObject({ code: 'TEXTFORMAT_ONLY_IN_DRAWTEXT' });
    expect(fails('DrawText(TextFormat("%s", 1), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_FORMAT', params: { spec: '%s' } });
    expect(fails('DrawText(TextFormat("%d %d", 1), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_ARG_COUNT', params: { expected: 2, found: 1 } });
    expect(fails('DrawText(TextFormat("%d", 1.5), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_ARG_TYPE', params: { index: 1, spec: '%d', expectedType: 'int', foundType: 'float' } });
    expect(fails('int f = 1;\nDrawText(TextFormat(f), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_NEEDS_LITERAL' });
  });
  it('does not leak for-loop variables', () => {
    expect(fails('for (int i = 0; i < 3; i++) { }\ni = 2;')).toMatchObject({ code: 'UNDECLARED_VAR', params: { name: 'i' } });
  });
  it('passes through parse errors', () => {
    expect(fails('int x = 5')).toMatchObject({ code: 'MISSING_SEMICOLON' });
  });
});
```

- [ ] **Step 2: Executar els tests i veure que fallen**

Run: `npx vitest run tests/checker.test.ts tests/format.test.ts`
Expected: FAIL — no es poden resoldre `../src/lang/compile` i `../src/lang/format`.

- [ ] **Step 3: Implementar `src/lang/host.ts`**

```ts
import type { ValueType } from './ast';
import type { Code, DiagParams } from './diagnostics';

export interface ColorValue { r: number; g: number; b: number; a: number }
export type Value = number | boolean | string | ColorValue;

export interface NativeSignature { params: ValueType[]; returns: ValueType; variadic?: boolean }
export interface NativeFunction extends NativeSignature { call(args: Value[]): Value | undefined }
export interface ConstantDef { type: ValueType; value: Value }

export interface HostSignature {
  functions: Record<string, NativeSignature>;
  constants: Record<string, { type: ValueType }>;
}

export interface HostEnv extends HostSignature {
  functions: Record<string, NativeFunction>;
  constants: Record<string, ConstantDef>;
  /** True once after a native function (EndDrawing) asked the interpreter to end the frame. */
  takeFrameYield(): boolean;
}

/** Thrown by native functions; the interpreter converts it into a LangError at the call site. */
export class NativeError extends Error {
  constructor(readonly code: Code, readonly params: DiagParams = {}) {
    super(code);
  }
}
```

- [ ] **Step 4: Implementar `src/lang/suggest.ts`**

```ts
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
```

- [ ] **Step 5: Implementar `src/lang/format.ts`**

```ts
import type { Value } from './host';

export interface FormatSpec { text: string; kind: 'int' | 'float'; precision: number }
export type FormatPart = string | FormatSpec;

export function parseFormat(fmt: string): FormatPart[] | { bad: string } {
  const parts: FormatPart[] = [];
  let literal = '';
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] !== '%') { literal += fmt[i]; continue; }
    const m = /^%(?:\.(\d+))?([a-zA-Z%])/.exec(fmt.slice(i));
    if (!m) return { bad: fmt.slice(i, i + 2) };
    i += m[0].length - 1;
    if (m[2] === '%' && m[1] === undefined) { literal += '%'; continue; }
    if (literal) { parts.push(literal); literal = ''; }
    if ((m[2] === 'd' || m[2] === 'i') && m[1] === undefined) parts.push({ text: m[0], kind: 'int', precision: 0 });
    else if (m[2] === 'f') parts.push({ text: m[0], kind: 'float', precision: m[1] === undefined ? 6 : Number(m[1]) });
    else return { bad: m[0] };
  }
  if (literal) parts.push(literal);
  return parts;
}

export function formatText(parts: FormatPart[], values: Value[]): string {
  let next = 0;
  return parts.map((p) => {
    if (typeof p === 'string') return p;
    const v = Number(values[next++]);
    return p.kind === 'int' ? String(Math.trunc(v)) : v.toFixed(p.precision);
  }).join('');
}
```

- [ ] **Step 6: Implementar `src/lang/checker.ts`**

```ts
import type * as A from './ast';
import { error, type LangError } from './diagnostics';
import { parseFormat, type FormatSpec } from './format';
import type { HostSignature } from './host';
import { suggest } from './suggest';

const NUMERIC = new Set<A.ValueType>(['int', 'float', 'bool']);
const isNumeric = (t: A.ValueType) => NUMERIC.has(t);

interface VarInfo { type: A.DeclType; line: number }

export function check(program: A.Program, host: HostSignature): void {
  new Checker(host).block(program.main);
}

class Checker {
  private scopes: Map<string, VarInfo>[] = [];

  constructor(private readonly host: HostSignature) {}

  block(b: A.Block): void {
    this.scopes.push(new Map());
    try {
      for (const s of b.body) this.stmt(s);
    } finally {
      this.scopes.pop();
    }
  }

  private lookup(name: string): VarInfo | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const v = this.scopes[i].get(name);
      if (v) return v;
    }
    return undefined;
  }
  private isConstant(name: string) { return Object.hasOwn(this.host.constants, name); }
  private isFunction(name: string) { return Object.hasOwn(this.host.functions, name); }

  private undeclared(name: string, at: A.Node): LangError {
    const names = [...new Set(this.scopes.flatMap((s) => [...s.keys()]))];
    const s = suggest(name, [...names, ...Object.keys(this.host.constants)]);
    return error('UNDECLARED_VAR', at.line, at.col, s ? { name, suggestion: s } : { name });
  }

  private targetVar(name: string, at: A.Node): VarInfo {
    const v = this.lookup(name);
    if (v) return v;
    if (this.isConstant(name)) throw error('ASSIGN_TO_CONST', at.line, at.col, { name });
    if (this.isFunction(name)) throw error('NOT_A_VARIABLE', at.line, at.col, { name });
    throw this.undeclared(name, at);
  }

  private requireAssignable(from: A.ValueType, to: A.ValueType, name: string, at: A.Node): void {
    if (from === to || (isNumeric(from) && isNumeric(to))) return;
    throw error('ASSIGN_TYPE', at.line, at.col, { name, foundType: from, expectedType: to });
  }

  private cond(e: A.Expr): void {
    const t = this.expr(e);
    if (!isNumeric(t)) throw error('CONDITION_TYPE', e.line, e.col, { foundType: t });
  }

  private stmt(s: A.Stmt): void {
    switch (s.kind) {
      case 'Block':
        return this.block(s);
      case 'VarDecl': {
        if (this.isConstant(s.name) || this.isFunction(s.name)) throw error('RESERVED_NAME', s.line, s.col, { name: s.name });
        const scope = this.scopes[this.scopes.length - 1];
        const prev = scope.get(s.name);
        if (prev) throw error('ALREADY_DECLARED', s.line, s.col, { name: s.name, prevLine: prev.line });
        this.requireAssignable(this.expr(s.init), s.varType, s.name, s.init);
        scope.set(s.name, { type: s.varType, line: s.line });
        return;
      }
      case 'Assign': {
        const target = this.targetVar(s.target, s);
        const valueType = this.expr(s.value);
        if (s.op === '=') this.requireAssignable(valueType, target.type, s.target, s.value);
        else if (!isNumeric(target.type) || !isNumeric(valueType)) {
          throw error('TYPE_MISMATCH', s.line, s.col, { op: s.op, leftType: target.type, rightType: valueType });
        }
        s.targetType = target.type;
        return;
      }
      case 'IncDec': {
        const target = this.targetVar(s.target, s);
        if (!isNumeric(target.type)) throw error('UNARY_TYPE', s.line, s.col, { op: s.op, foundType: target.type });
        s.targetType = target.type;
        return;
      }
      case 'ExprStmt':
        this.call(s.expr, false);
        return;
      case 'If':
        this.cond(s.cond);
        this.block(s.then);
        if (s.otherwise) this.stmt(s.otherwise);
        return;
      case 'While':
        this.cond(s.cond);
        this.block(s.body);
        return;
      case 'For':
        this.scopes.push(new Map());
        try {
          if (s.init) this.stmt(s.init);
          if (s.cond) this.cond(s.cond);
          if (s.update) this.stmt(s.update);
          this.block(s.body);
        } finally {
          this.scopes.pop();
        }
        return;
      case 'Return':
        if (s.value) this.requireAssignable(this.expr(s.value), 'int', 'main', s.value);
        return;
    }
  }

  private expr(e: A.Expr): A.ValueType {
    const t = this.exprType(e);
    e.type = t;
    return t;
  }

  private exprType(e: A.Expr): A.ValueType {
    switch (e.kind) {
      case 'IntLit': return 'int';
      case 'FloatLit': return 'float';
      case 'BoolLit': return 'bool';
      case 'StringLit': throw error('STRING_NOT_ALLOWED', e.line, e.col);
      case 'Var': {
        const v = this.lookup(e.name);
        if (v) return v.type;
        if (this.isConstant(e.name)) return this.host.constants[e.name].type;
        if (this.isFunction(e.name)) throw error('NOT_A_VARIABLE', e.line, e.col, { name: e.name });
        throw this.undeclared(e.name, e);
      }
      case 'Unary': {
        const t = this.expr(e.operand);
        if (!isNumeric(t)) throw error('UNARY_TYPE', e.line, e.col, { op: e.op, foundType: t });
        if (e.op === '!') return 'bool';
        return t === 'float' ? 'float' : 'int';
      }
      case 'Binary': {
        const l = this.expr(e.left);
        const r = this.expr(e.right);
        if (!isNumeric(l) || !isNumeric(r)) throw error('TYPE_MISMATCH', e.line, e.col, { op: e.op, leftType: l, rightType: r });
        switch (e.op) {
          case '+': case '-': case '*': case '/':
            return l === 'float' || r === 'float' ? 'float' : 'int';
          case '%':
            if (l === 'float' || r === 'float') throw error('MOD_NEEDS_INT', e.line, e.col);
            return 'int';
          default:
            return 'bool';
        }
      }
      case 'Call':
        return this.call(e, true);
    }
  }

  private call(c: A.Call, asValue: boolean): A.ValueType {
    if (c.callee === 'TextFormat') throw error('TEXTFORMAT_ONLY_IN_DRAWTEXT', c.line, c.col);
    if (!this.isFunction(c.callee)) {
      const s = suggest(c.callee, Object.keys(this.host.functions));
      throw error('UNKNOWN_FUNCTION', c.line, c.col, s ? { name: c.callee, suggestion: s } : { name: c.callee });
    }
    const fn = this.host.functions[c.callee];
    if (c.args.length !== fn.params.length) {
      throw error('WRONG_ARG_COUNT', c.line, c.col, { name: c.callee, expected: fn.params.length, found: c.args.length });
    }
    c.args.forEach((arg, i) => {
      const expected = fn.params[i];
      let found: A.ValueType;
      if (arg.kind === 'StringLit') { arg.type = 'string'; found = 'string'; }
      else if (expected === 'string' && arg.kind === 'Call' && arg.callee === 'TextFormat') found = this.textFormat(arg);
      else found = this.expr(arg);
      if (!(found === expected || (isNumeric(found) && isNumeric(expected)))) {
        throw error('ARG_TYPE', arg.line, arg.col, { name: c.callee, index: i + 1, expectedType: expected, foundType: found });
      }
    });
    if (asValue && fn.returns === 'void') throw error('VOID_VALUE', c.line, c.col, { name: c.callee });
    c.type = fn.returns;
    return fn.returns;
  }

  private textFormat(c: A.Call): A.ValueType {
    const [fmt, ...rest] = c.args;
    if (!fmt || fmt.kind !== 'StringLit') throw error('TEXTFORMAT_NEEDS_LITERAL', c.line, c.col);
    fmt.type = 'string';
    const parts = parseFormat(fmt.value);
    if (!Array.isArray(parts)) throw error('TEXTFORMAT_FORMAT', fmt.line, fmt.col, { spec: parts.bad });
    const holes = parts.filter((p): p is FormatSpec => typeof p !== 'string');
    if (holes.length !== rest.length) throw error('TEXTFORMAT_ARG_COUNT', c.line, c.col, { expected: holes.length, found: rest.length });
    rest.forEach((arg, i) => {
      const t = this.expr(arg);
      const want = holes[i].kind;
      const fits = want === 'int' ? t === 'int' || t === 'bool' : t === 'float';
      if (!fits) {
        throw error('TEXTFORMAT_ARG_TYPE', arg.line, arg.col, { index: i + 1, spec: holes[i].text, expectedType: want, foundType: t });
      }
    });
    c.type = 'string';
    return 'string';
  }
}
```

- [ ] **Step 7: Implementar `src/lang/compile.ts`**

```ts
import type { Program } from './ast';
import { check } from './checker';
import { LangError, type Diagnostic } from './diagnostics';
import type { HostSignature } from './host';
import { lex } from './lexer';
import { parse } from './parser';

export type CompileResult = { ok: true; program: Program } | { ok: false; diagnostic: Diagnostic };

export function compile(source: string, host: HostSignature): CompileResult {
  try {
    const program = parse(lex(source));
    check(program, host);
    return { ok: true, program };
  } catch (e) {
    if (e instanceof LangError) return { ok: false, diagnostic: e.diagnostic };
    throw e;
  }
}
```

- [ ] **Step 8: Executar els tests**

Run: `npx vitest run tests/checker.test.ts tests/format.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lang/host.ts src/lang/suggest.ts src/lang/format.ts src/lang/checker.ts src/lang/compile.ts tests/checker.test.ts tests/format.test.ts
git commit -m "feat(lang): comprovació de tipus, suggeriments i TextFormat"
```

---

### Task 6: Intèrpret

**Files:**
- Create: `src/lang/interpreter.ts`
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `Program` i nodes (Task 4) amb `type`/`targetType` omplerts pel checker (Task 5), `HostEnv`, `Value`, `NativeError` (Task 5), `error`, `Diagnostic` (Task 2), `compile` (Task 5, als tests)
- Produces:
  - `OPS_PER_FRAME = 100_000`
  - `type Yielded = { kind: 'step'; line: number } | { kind: 'frame' }`
  - `type ExecEvent = { type: 'line'; line } | { type: 'var'; name; value: Value } | { type: 'branch'; id; line; taken: boolean } | { type: 'loop'; id; line; iteration } | { type: 'warning'; diagnostic: Diagnostic }`
  - `interface VariableView { name: string; type: DeclType; value: Value }`
  - `class Interpreter { constructor(program, host: HostEnv, onEvent?: (e: ExecEvent) => void); run(): Generator<Yielded, void, void>; variables(): VariableView[] }` — els errors d'execució es llencen com a `LangError` des de `next()`.
  - `toInt(v)`, `toFloat(v)`, `truthy(v)`, `convert(v, type)`

- [ ] **Step 1: Escriure el test que falla**

`tests/interpreter.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { compile } from '../src/lang/compile';
import { LangError } from '../src/lang/diagnostics';
import { NativeError, type HostEnv, type Value } from '../src/lang/host';
import { Interpreter, type ExecEvent } from '../src/lang/interpreter';

function makeHost() {
  const out: Value[] = [];
  let frameRequested = false;
  const host: HostEnv = {
    functions: {
      printInt: { params: ['int'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      printFloat: { params: ['float'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      printBool: { params: ['bool'], returns: 'void', call: ([v]) => { out.push(v); return undefined; } },
      EndDrawing: { params: [], returns: 'void', call: () => { frameRequested = true; return undefined; } },
      Crash: { params: [], returns: 'void', call: () => { throw new NativeError('NO_WINDOW', { name: 'Crash' }); } },
    },
    constants: { TEN: { type: 'int', value: 10 } },
    takeFrameYield: () => { const f = frameRequested; frameRequested = false; return f; },
  };
  return { host, out };
}

const main = (body: string) => `int main(void) {\n${body}\n}`;

function start(body: string) {
  const { host, out } = makeHost();
  const compiled = compile(main(body), host);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostic));
  const events: ExecEvent[] = [];
  const interpreter = new Interpreter(compiled.program, host, (e) => events.push(e));
  return { interpreter, out, events };
}

function run(body: string) {
  const s = start(body);
  for (const _ of s.interpreter.run()) { /* run to the end */ }
  return s;
}

function runError(body: string) {
  try { run(body); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('C semantics', () => {
  it('does integer and float arithmetic like C', () => {
    const { out } = run([
      'printInt(7 / 2);', 'printInt(-7 / 2);', 'printInt(-7 % 3);', 'printFloat(7.0 / 2);',
      'printInt(2147483647 + 1);', 'printInt(TEN * 3);',
    ].join('\n'));
    expect(out).toEqual([3, -3, -1, 3.5, -2147483648, 30]);
  });

  it('converts on assignment like C', () => {
    const { out } = run('int x = 5;\nx += 2.6;\nprintInt(x);\nfloat f = 1;\nf /= 4;\nprintFloat(f);\nbool b = 7;\nprintBool(b);\nint y = 2.9;\nprintInt(y);');
    expect(out).toEqual([7, 0.25, true, 2]);
  });

  it('evaluates logic with short-circuit', () => {
    const { out } = run('printBool(3 < 5 && !(2 > 1));\nprintBool(1 == 1 || TEN / 0 > 1);');
    expect(out).toEqual([false, true]);
  });

  it('runs ++ and --', () => {
    const { out } = run('int i = 1;\ni++;\ni++;\ni--;\nprintInt(i);');
    expect(out).toEqual([2]);
  });
});

describe('control flow', () => {
  it('takes the right branch and reports it', () => {
    const { out, events } = run('int x = 5;\nif (x > 10) { printInt(1); } else if (x > 3) { printInt(2); } else { printInt(3); }');
    expect(out).toEqual([2]);
    expect(events.filter((e) => e.type === 'branch').map((e) => (e as { taken: boolean }).taken)).toEqual([false, true]);
  });

  it('runs while and for loops and reports iterations', () => {
    const { out, events } = run('int n = 0;\nwhile (n < 3) { n++; }\nfor (int i = 0; i < 2; i++) { printInt(i); }\nprintInt(n);');
    expect(out).toEqual([0, 1, 3]);
    expect(events.filter((e) => e.type === 'loop')).toHaveLength(5);
  });

  it('stops at return', () => {
    const { out } = run('printInt(1);\nreturn 0;\nprintInt(2);');
    expect(out).toEqual([1]);
  });
});

describe('frames and steps', () => {
  it('yields a frame at each EndDrawing', () => {
    const { interpreter } = start('int i = 0;\nwhile (1) { i++; EndDrawing(); }');
    const gen = interpreter.run();
    let frames = 0;
    while (frames < 3) if (gen.next().value?.kind === 'frame') frames++;
    expect(interpreter.variables()).toEqual([{ name: 'i', type: 'int', value: 3 }]);
  });

  it('yields a step before each statement and exposes visible variables', () => {
    const { interpreter } = start('int a = 1;\n{\nfloat b = 2.5;\na = 3;\n}');
    const gen = interpreter.run();
    for (;;) {
      const r = gen.next();
      if (r.done) throw new Error('never reached line 5');
      if (r.value.kind === 'step' && r.value.line === 5) break;
    }
    expect(interpreter.variables()).toEqual([
      { name: 'a', type: 'int', value: 1 },
      { name: 'b', type: 'float', value: 2.5 },
    ]);
  });

  it('emits var events', () => {
    const { events } = run('int a = 1;\na = 4;');
    expect(events.filter((e) => e.type === 'var')).toEqual([
      { type: 'var', name: 'a', value: 1 },
      { type: 'var', name: 'a', value: 4 },
    ]);
  });
});

describe('runtime errors and warnings', () => {
  it('stops endless loops and points at the loop', () => {
    expect(runError('int i = 0;\nwhile (i >= 0) {\ni = 1;\n}')).toMatchObject({ code: 'LOOP_TOO_LONG', line: 3 });
  });

  it('resets the budget at each frame', () => {
    const { interpreter } = start('while (1) {\nfor (int i = 0; i < 20000; i++) { }\nEndDrawing();\n}');
    const gen = interpreter.run();
    let frames = 0;
    expect(() => { while (frames < 5) if (gen.next().value?.kind === 'frame') frames++; }).not.toThrow();
  });

  it('reports integer division by zero', () => {
    expect(runError('int z = 0;\nprintInt(5 / z);')).toMatchObject({ code: 'DIVISION_BY_ZERO', line: 3 });
  });

  it('turns native errors into diagnostics at the call', () => {
    expect(runError('Crash();')).toMatchObject({ code: 'NO_WINDOW', line: 2, params: { name: 'Crash' } });
  });

  it('warns once per operation when an int division loses decimals', () => {
    const { events } = run('for (int i = 0; i < 3; i++) { printInt(7 / 2); }\nprintInt(8 / 2);');
    const warnings = events.filter((e) => e.type === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ diagnostic: { code: 'INT_DIVISION_TRUNCATES', severity: 'warning', line: 2, params: { a: 7, b: 2, result: 3, exact: 3.5 } } });
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/interpreter.test.ts`
Expected: FAIL — no es pot resoldre `../src/lang/interpreter`.

- [ ] **Step 3: Implementar `src/lang/interpreter.ts`**

```ts
import type * as A from './ast';
import { error, type Diagnostic } from './diagnostics';
import { NativeError, type HostEnv, type Value } from './host';

export const OPS_PER_FRAME = 100_000;

export type Yielded = { kind: 'step'; line: number } | { kind: 'frame' };
export type ExecEvent =
  | { type: 'line'; line: number }
  | { type: 'var'; name: string; value: Value }
  | { type: 'branch'; id: number; line: number; taken: boolean }
  | { type: 'loop'; id: number; line: number; iteration: number }
  | { type: 'warning'; diagnostic: Diagnostic };
export interface VariableView { name: string; type: A.DeclType; value: Value }

interface Slot { type: A.DeclType; value: Value }
type Signal = 'return' | undefined;
type Exec = Generator<Yielded, Signal, void>;
type ArithOp = '+' | '-' | '*' | '/' | '%';

export function toInt(v: Value): number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Math.trunc(v as number) | 0;
}
export function toFloat(v: Value): number {
  return Math.fround(typeof v === 'boolean' ? (v ? 1 : 0) : (v as number));
}
export function truthy(v: Value): boolean {
  return typeof v === 'boolean' ? v : (v as number) !== 0;
}
export function convert(v: Value, to: A.ValueType): Value {
  switch (to) {
    case 'int': return toInt(v);
    case 'float': return toFloat(v);
    case 'bool': return truthy(v);
    default: return v;
  }
}

export class Interpreter {
  private scopes: Map<string, Slot>[] = [];
  private ops = 0;
  private loopLines: number[] = [];
  private warned = new Set<number>();

  constructor(
    private readonly program: A.Program,
    private readonly host: HostEnv,
    private readonly onEvent: (e: ExecEvent) => void = () => {},
  ) {}

  *run(): Generator<Yielded, void, void> {
    yield* this.block(this.program.main);
  }

  variables(): VariableView[] {
    const visible = new Map<string, VariableView>();
    for (const scope of this.scopes) {
      for (const [name, slot] of scope) {
        visible.delete(name);
        visible.set(name, { name, type: slot.type, value: slot.value });
      }
    }
    return [...visible.values()];
  }

  private count(line: number): void {
    if (++this.ops > OPS_PER_FRAME) {
      throw error('LOOP_TOO_LONG', this.loopLines[this.loopLines.length - 1] ?? line, 1);
    }
  }

  private *block(b: A.Block): Exec {
    this.scopes.push(new Map());
    try {
      for (const s of b.body) {
        const signal = yield* this.stmt(s);
        if (signal) return signal;
      }
      return undefined;
    } finally {
      this.scopes.pop();
    }
  }

  private *stmt(s: A.Stmt): Exec {
    if (s.kind === 'Block') return yield* this.block(s);
    this.count(s.line);
    this.onEvent({ type: 'line', line: s.line });
    yield { kind: 'step', line: s.line };

    switch (s.kind) {
      case 'VarDecl': {
        const value = convert(this.eval(s.init), s.varType);
        this.scopes[this.scopes.length - 1].set(s.name, { type: s.varType, value });
        this.onEvent({ type: 'var', name: s.name, value });
        return undefined;
      }
      case 'Assign': {
        const slot = this.slot(s.target);
        const rhs = this.eval(s.value);
        if (s.op === '=') {
          slot.value = convert(rhs, slot.type);
        } else {
          const kind = slot.type === 'float' || s.value.type === 'float' ? 'float' : 'int';
          slot.value = convert(this.arith(s.op[0] as ArithOp, slot.value, rhs, kind, s), slot.type);
        }
        this.onEvent({ type: 'var', name: s.target, value: slot.value });
        return undefined;
      }
      case 'IncDec': {
        const slot = this.slot(s.target);
        const kind = slot.type === 'float' ? 'float' : 'int';
        slot.value = convert(this.arith(s.op === '++' ? '+' : '-', slot.value, 1, kind, s), slot.type);
        this.onEvent({ type: 'var', name: s.target, value: slot.value });
        return undefined;
      }
      case 'ExprStmt':
        this.evalCall(s.expr);
        if (this.host.takeFrameYield()) {
          this.ops = 0;
          yield { kind: 'frame' };
        }
        return undefined;
      case 'If': {
        const taken = truthy(this.eval(s.cond));
        this.onEvent({ type: 'branch', id: s.id, line: s.line, taken });
        if (taken) return yield* this.block(s.then);
        if (s.otherwise) return yield* this.stmt(s.otherwise);
        return undefined;
      }
      case 'While':
        return yield* this.loop(s, s.cond, null, s.body);
      case 'For': {
        this.scopes.push(new Map());
        try {
          if (s.init) yield* this.stmt(s.init);
          return yield* this.loop(s, s.cond, s.update, s.body);
        } finally {
          this.scopes.pop();
        }
      }
      case 'Return':
        if (s.value) this.eval(s.value);
        return 'return';
    }
  }

  private *loop(node: A.While | A.For, cond: A.Expr | null, update: A.Stmt | null, body: A.Block): Exec {
    this.loopLines.push(node.line);
    try {
      let iteration = 0;
      while (cond === null || truthy(this.eval(cond))) {
        this.count(node.line);
        this.onEvent({ type: 'loop', id: node.id, line: node.line, iteration: ++iteration });
        const signal = yield* this.block(body);
        if (signal) return signal;
        if (update) yield* this.stmt(update);
      }
      return undefined;
    } finally {
      this.loopLines.pop();
    }
  }

  private find(name: string): Slot | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const slot = this.scopes[i].get(name);
      if (slot) return slot;
    }
    return undefined;
  }

  private slot(name: string): Slot {
    const slot = this.find(name);
    if (!slot) throw new Error(`internal: variable ${name} not found`);
    return slot;
  }

  private eval(e: A.Expr): Value {
    switch (e.kind) {
      case 'IntLit': case 'BoolLit': case 'StringLit':
        return e.value;
      case 'FloatLit':
        return Math.fround(e.value);
      case 'Var':
        return this.find(e.name)?.value ?? this.host.constants[e.name].value;
      case 'Unary': {
        const v = this.eval(e.operand);
        if (e.op === '!') return !truthy(v);
        return e.type === 'float' ? Math.fround(-toFloat(v)) : (-toInt(v)) | 0;
      }
      case 'Binary':
        return this.binary(e);
      case 'Call': {
        const v = this.evalCall(e);
        if (v === undefined) throw new Error(`internal: ${e.callee} returned no value`);
        return v;
      }
    }
  }

  private binary(e: A.Binary): Value {
    if (e.op === '&&') return truthy(this.eval(e.left)) && truthy(this.eval(e.right));
    if (e.op === '||') return truthy(this.eval(e.left)) || truthy(this.eval(e.right));
    const l = this.eval(e.left);
    const r = this.eval(e.right);
    switch (e.op) {
      case '+': case '-': case '*': case '/': case '%':
        return this.arith(e.op, l, r, e.type === 'float' ? 'float' : 'int', e);
    }
    const asFloat = e.left.type === 'float' || e.right.type === 'float';
    const a = asFloat ? toFloat(l) : toInt(l);
    const b = asFloat ? toFloat(r) : toInt(r);
    switch (e.op) {
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      case '==': return a === b;
      case '!=': return a !== b;
    }
    throw new Error(`internal: unknown operator ${e.op}`);
  }

  private arith(op: ArithOp, l: Value, r: Value, kind: 'int' | 'float', at: A.Node): number {
    if (kind === 'float') {
      const a = toFloat(l), b = toFloat(r);
      switch (op) {
        case '+': return Math.fround(a + b);
        case '-': return Math.fround(a - b);
        case '*': return Math.fround(a * b);
        case '/': return Math.fround(a / b);
        case '%': throw new Error('internal: % on floats');
      }
    }
    const a = toInt(l), b = toInt(r);
    switch (op) {
      case '+': return (a + b) | 0;
      case '-': return (a - b) | 0;
      case '*': return Math.imul(a, b);
      case '/':
      case '%': {
        if (b === 0) throw error('DIVISION_BY_ZERO', at.line, at.col);
        if (op === '%') return (a % b) | 0;
        const q = Math.trunc(a / b) | 0;
        if (a % b !== 0 && !this.warned.has(at.id)) {
          this.warned.add(at.id);
          this.onEvent({
            type: 'warning',
            diagnostic: {
              code: 'INT_DIVISION_TRUNCATES', severity: 'warning', line: at.line, col: at.col,
              params: { a, b, result: q, exact: Number((a / b).toFixed(2)) },
            },
          });
        }
        return q;
      }
    }
  }

  private evalCall(c: A.Call): Value | undefined {
    const fn = this.host.functions[c.callee];
    const args = c.args.map((arg, i) => {
      const v = this.eval(arg);
      const param = fn.params[i];
      return param === undefined ? v : convert(v, param);
    });
    try {
      const result = fn.call(args);
      return result === undefined ? undefined : convert(result, fn.returns);
    } catch (err) {
      if (err instanceof NativeError) throw error(err.code, c.line, c.col, err.params);
      throw err;
    }
  }
}
```

Nota: `variables()` fa `delete` abans de `set` perquè una variable interior que amaga una d'exterior quedi al final de la llista (ordre de declaració visible).

- [ ] **Step 4: Executar els tests**

Run: `npx vitest run tests/interpreter.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Executar tota la suite i el typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: tots els tests PASS; `tsc` sense errors.

- [ ] **Step 6: Commit**

```bash
git add src/lang/interpreter.ts tests/interpreter.test.ts
git commit -m "feat(lang): intèrpret amb generadors, frames, pressupost i esdeveniments"
```

---

### Task 7: Runtime raylib i `Machine`

**Files:**
- Create: `src/runtime/colors.ts`, `src/runtime/keys.ts`, `src/runtime/input.ts`, `src/runtime/drawList.ts`, `src/runtime/raylib.ts`, `src/runtime/machine.ts`
- Test: `tests/machine.test.ts`

**Interfaces:**
- Consumes: `HostEnv`, `NativeFunction`, `ConstantDef`, `NativeError`, `ColorValue`, `Value` (Task 5); `Interpreter`, `ExecEvent`, `VariableView`, `Yielded` (Task 6); `compile` (Task 5); `parseFormat`, `formatText` (Task 5); `LangError`, `Diagnostic` (Task 2)
- Produces:
  - `COLORS: Record<string, ColorValue>`; `KEYS: Record<string, number>`; `BROWSER_KEYS: Record<string, number>`
  - `interface InputState { down: ReadonlySet<number>; pressed: ReadonlySet<number> }`, `NO_INPUT`, `holding(...codes: number[]): InputState`, `pressing(...codes: number[]): InputState`
  - `type DrawCommand = { op: 'clear'; color } | { op: 'rect'; x; y; w; h; color } | { op: 'circle'; x; y; r; color } | { op: 'line'; x1; y1; x2; y2; color } | { op: 'text'; text; x; y; size; color }`
  - `class RaylibHost implements HostEnv { width; height; title; closeRequested; lastFrame: DrawCommand[]; constructor(opts?: { seed?: number }); setInput(input: InputState): void }`
  - `type FrameResult = { status: 'frame'; drawList: DrawCommand[] } | { status: 'finished' } | { status: 'error'; diagnostic: Diagnostic }`
  - `class Machine { constructor(program, host: RaylibHost, onEvent?); readonly host; get done(): boolean; runFrame(input?: InputState): FrameResult; requestClose(): void; variables(): VariableView[] }`
  - `runHeadless(source: string, opts: { frames: number; input?: (frame: number) => InputState; seed?: number }): { frames: DrawCommand[][]; status: 'running' | 'finished' | 'error'; diagnostic?: Diagnostic; machine?: Machine }`

- [ ] **Step 1: Escriure el test que falla**

`tests/machine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/runtime/colors';
import { KEYS } from '../src/runtime/keys';
import { holding, pressing } from '../src/runtime/input';
import { runHeadless } from '../src/runtime/machine';

const GAME = `#include "raylib.h"
int main(void) {
    InitWindow(320, 200, "Prova");
    int x = 10;
    while (!WindowShouldClose()) {
        if (IsKeyDown(KEY_W)) { x = x + 1; }
        if (IsKeyPressed(KEY_SPACE)) { x = 100; }
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(x, 20, 30, 40, RED);
        EndDrawing();
    }
    CloseWindow();
    return 0;
}`;

describe('Machine', () => {
  it('produces one draw list per frame', () => {
    const r = runHeadless(GAME, { frames: 2 });
    expect(r.status).toBe('running');
    expect(r.frames[0]).toEqual([
      { op: 'clear', color: COLORS.BLACK },
      { op: 'rect', x: 10, y: 20, w: 30, h: 40, color: COLORS.RED },
    ]);
    expect(r.machine?.host.width).toBe(320);
    expect(r.machine?.host.height).toBe(200);
  });

  it('reads held and pressed keys', () => {
    const held = runHeadless(GAME, { frames: 3, input: () => holding(KEYS.KEY_W) });
    expect(held.frames.map((f) => (f[1] as { x: number }).x)).toEqual([11, 12, 13]);
    const pressed = runHeadless(GAME, { frames: 2, input: (i) => (i === 0 ? pressing(KEYS.KEY_SPACE) : holding()) });
    expect(pressed.frames.map((f) => (f[1] as { x: number }).x)).toEqual([100, 100]);
  });

  it('finishes when the window is asked to close', () => {
    const r = runHeadless(GAME, { frames: 1 });
    r.machine!.requestClose();
    expect(r.machine!.runFrame()).toEqual({ status: 'finished' });
    expect(r.machine!.done).toBe(true);
  });

  it('finishes programs without a game loop', () => {
    expect(runHeadless('int main(void) { return 0; }', { frames: 1 }).status).toBe('finished');
  });

  it('requires InitWindow before drawing', () => {
    const r = runHeadless('int main(void) {\nBeginDrawing();\nreturn 0;\n}', { frames: 1 });
    expect(r).toMatchObject({ status: 'error', diagnostic: { code: 'NO_WINDOW', line: 2, params: { name: 'BeginDrawing' } } });
  });

  it('points at the game loop when EndDrawing is missing', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nwhile (!WindowShouldClose()) {\nBeginDrawing();\n}\nreturn 0;\n}';
    expect(runHeadless(src, { frames: 1 })).toMatchObject({ status: 'error', diagnostic: { code: 'LOOP_TOO_LONG', line: 3 } });
  });

  it('formats text and draws it', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nBeginDrawing();\nDrawText(TextFormat("Punts: %d - %.1f", 7, 3.14159), 5, 6, 20, GOLD);\nEndDrawing();\nreturn 0;\n}';
    const r = runHeadless(src, { frames: 1 });
    expect(r.frames[0]).toEqual([{ op: 'text', text: 'Punts: 7 - 3.1', x: 5, y: 6, size: 20, color: COLORS.GOLD }]);
  });

  it('gives deterministic random values within range for a seed', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nwhile (!WindowShouldClose()) {\nBeginDrawing();\nDrawCircle(GetRandomValue(1, 6), 0, 1.5, RED);\nEndDrawing();\n}\nreturn 0;\n}';
    const xs = (seed: number) => runHeadless(src, { frames: 50, seed }).frames.map((f) => (f[0] as { x: number }).x);
    expect(xs(42)).toEqual(xs(42));
    expect(xs(42).every((x) => x >= 1 && x <= 6)).toBe(true);
    expect(new Set(xs(42)).size).toBeGreaterThan(3);
  });

  it('returns compile errors', () => {
    expect(runHeadless('int main(void) { int x = 5 }', { frames: 1 })).toMatchObject({ status: 'error', diagnostic: { code: 'MISSING_SEMICOLON' } });
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/machine.test.ts`
Expected: FAIL — no es pot resoldre `../src/runtime/colors`.

- [ ] **Step 3: Implementar colors, tecles, entrada i llista de dibuix**

`src/runtime/colors.ts`:
```ts
import type { ColorValue } from '../lang/host';

const rgb = (r: number, g: number, b: number): ColorValue => ({ r, g, b, a: 255 });

/** Same RGBA values as raylib.h (5.5). */
export const COLORS: Record<string, ColorValue> = {
  LIGHTGRAY: rgb(200, 200, 200),
  GRAY: rgb(130, 130, 130),
  DARKGRAY: rgb(80, 80, 80),
  YELLOW: rgb(253, 249, 0),
  GOLD: rgb(255, 203, 0),
  ORANGE: rgb(255, 161, 0),
  PINK: rgb(255, 109, 194),
  RED: rgb(230, 41, 55),
  GREEN: rgb(0, 228, 48),
  LIME: rgb(0, 158, 47),
  SKYBLUE: rgb(102, 191, 255),
  BLUE: rgb(0, 121, 241),
  PURPLE: rgb(200, 122, 255),
  WHITE: rgb(255, 255, 255),
  BLACK: rgb(0, 0, 0),
  RAYWHITE: rgb(245, 245, 245),
};
```

`src/runtime/keys.ts`:
```ts
/** raylib key codes (KeyboardKey enum in raylib.h). */
export const KEYS: Record<string, number> = {
  KEY_SPACE: 32,
  KEY_W: 87,
  KEY_S: 83,
  KEY_ENTER: 257,
  KEY_DOWN: 264,
  KEY_UP: 265,
};

/** KeyboardEvent.code → raylib key code. */
export const BROWSER_KEYS: Record<string, number> = {
  Space: 32,
  KeyW: 87,
  KeyS: 83,
  Enter: 257,
  NumpadEnter: 257,
  ArrowDown: 264,
  ArrowUp: 265,
};
```

`src/runtime/input.ts`:
```ts
export interface InputState {
  /** Keys held down during this frame. */
  down: ReadonlySet<number>;
  /** Keys that went down since the previous frame. */
  pressed: ReadonlySet<number>;
}

export const NO_INPUT: InputState = { down: new Set(), pressed: new Set() };

export function holding(...codes: number[]): InputState {
  return { down: new Set(codes), pressed: new Set() };
}

export function pressing(...codes: number[]): InputState {
  return { down: new Set(codes), pressed: new Set(codes) };
}
```

`src/runtime/drawList.ts`:
```ts
import type { ColorValue } from '../lang/host';

export type DrawCommand =
  | { op: 'clear'; color: ColorValue }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color: ColorValue }
  | { op: 'circle'; x: number; y: number; r: number; color: ColorValue }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; color: ColorValue }
  | { op: 'text'; text: string; x: number; y: number; size: number; color: ColorValue };
```

- [ ] **Step 4: Implementar `src/runtime/raylib.ts`**

```ts
import type { ValueType } from '../lang/ast';
import { formatText, parseFormat } from '../lang/format';
import { NativeError, type ColorValue, type ConstantDef, type HostEnv, type NativeFunction, type Value } from '../lang/host';
import { COLORS } from './colors';
import type { DrawCommand } from './drawList';
import { NO_INPUT, type InputState } from './input';
import { KEYS } from './keys';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RaylibHost implements HostEnv {
  width = 800;
  height = 450;
  title = '';
  targetFps = 60;
  closeRequested = false;
  lastFrame: DrawCommand[] = [];
  readonly functions: Record<string, NativeFunction>;
  readonly constants: Record<string, ConstantDef> = {};

  private windowOpen = false;
  private drawing: DrawCommand[] = [];
  private frameDone = false;
  private input: InputState = NO_INPUT;
  private readonly random: () => number;

  constructor(opts: { seed?: number } = {}) {
    this.random = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 32));
    for (const [name, value] of Object.entries(COLORS)) this.constants[name] = { type: 'Color', value };
    for (const [name, value] of Object.entries(KEYS)) this.constants[name] = { type: 'int', value };
    this.functions = this.buildFunctions();
  }

  setInput(input: InputState): void {
    this.input = input;
  }

  takeFrameYield(): boolean {
    const done = this.frameDone;
    this.frameDone = false;
    return done;
  }

  private requireWindow(name: string): void {
    if (!this.windowOpen) throw new NativeError('NO_WINDOW', { name });
  }

  private draw(name: string, cmd: DrawCommand): undefined {
    this.requireWindow(name);
    this.drawing.push(cmd);
    return undefined;
  }

  private buildFunctions(): Record<string, NativeFunction> {
    const fn = (params: ValueType[], returns: ValueType, call: (a: Value[]) => Value | undefined, variadic = false): NativeFunction =>
      ({ params, returns, call, variadic });
    const n = (v: Value) => v as number;
    const c = (v: Value) => v as ColorValue;
    return {
      InitWindow: fn(['int', 'int', 'string'], 'void', ([w, h, title]) => {
        this.width = n(w);
        this.height = n(h);
        this.title = title as string;
        this.windowOpen = true;
        return undefined;
      }),
      SetTargetFPS: fn(['int'], 'void', ([fps]) => { this.targetFps = n(fps); return undefined; }),
      WindowShouldClose: fn([], 'bool', () => this.closeRequested),
      CloseWindow: fn([], 'void', () => { this.windowOpen = false; return undefined; }),
      GetScreenWidth: fn([], 'int', () => this.width),
      GetScreenHeight: fn([], 'int', () => this.height),
      BeginDrawing: fn([], 'void', () => {
        this.requireWindow('BeginDrawing');
        this.drawing = [];
        return undefined;
      }),
      EndDrawing: fn([], 'void', () => {
        this.requireWindow('EndDrawing');
        this.lastFrame = this.drawing;
        this.drawing = [];
        this.frameDone = true;
        return undefined;
      }),
      ClearBackground: fn(['Color'], 'void', ([color]) => this.draw('ClearBackground', { op: 'clear', color: c(color) })),
      DrawRectangle: fn(['int', 'int', 'int', 'int', 'Color'], 'void', ([x, y, w, h, color]) =>
        this.draw('DrawRectangle', { op: 'rect', x: n(x), y: n(y), w: n(w), h: n(h), color: c(color) })),
      DrawCircle: fn(['int', 'int', 'float', 'Color'], 'void', ([x, y, r, color]) =>
        this.draw('DrawCircle', { op: 'circle', x: n(x), y: n(y), r: n(r), color: c(color) })),
      DrawLine: fn(['int', 'int', 'int', 'int', 'Color'], 'void', ([x1, y1, x2, y2, color]) =>
        this.draw('DrawLine', { op: 'line', x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), color: c(color) })),
      DrawText: fn(['string', 'int', 'int', 'int', 'Color'], 'void', ([text, x, y, size, color]) =>
        this.draw('DrawText', { op: 'text', text: text as string, x: n(x), y: n(y), size: n(size), color: c(color) })),
      IsKeyDown: fn(['int'], 'bool', ([key]) => this.input.down.has(n(key))),
      IsKeyPressed: fn(['int'], 'bool', ([key]) => this.input.pressed.has(n(key))),
      GetRandomValue: fn(['int', 'int'], 'int', ([a, b]) => {
        let lo = n(a), hi = n(b);
        if (lo > hi) [lo, hi] = [hi, lo];
        return lo + Math.floor(this.random() * (hi - lo + 1));
      }),
      TextFormat: fn(['string'], 'string', ([fmt, ...values]) => {
        const parts = parseFormat(fmt as string);
        return Array.isArray(parts) ? formatText(parts, values) : (fmt as string);
      }, true),
    };
  }
}
```

- [ ] **Step 5: Implementar `src/runtime/machine.ts`**

```ts
import type { Program } from '../lang/ast';
import { compile } from '../lang/compile';
import { LangError, type Diagnostic } from '../lang/diagnostics';
import { Interpreter, type ExecEvent, type VariableView, type Yielded } from '../lang/interpreter';
import type { DrawCommand } from './drawList';
import { NO_INPUT, type InputState } from './input';
import { RaylibHost } from './raylib';

export type FrameResult =
  | { status: 'frame'; drawList: DrawCommand[] }
  | { status: 'finished' }
  | { status: 'error'; diagnostic: Diagnostic };

export class Machine {
  private readonly interpreter: Interpreter;
  private readonly steps: Generator<Yielded, void, void>;
  private finished = false;

  constructor(program: Program, readonly host: RaylibHost, onEvent?: (e: ExecEvent) => void) {
    this.interpreter = new Interpreter(program, host, onEvent);
    this.steps = this.interpreter.run();
  }

  get done(): boolean {
    return this.finished;
  }

  /** Runs the program until the next EndDrawing() (or until it ends or fails). */
  runFrame(input: InputState = NO_INPUT): FrameResult {
    if (this.finished) return { status: 'finished' };
    this.host.setInput(input);
    try {
      for (;;) {
        const r = this.steps.next();
        if (r.done) {
          this.finished = true;
          return { status: 'finished' };
        }
        if (r.value.kind === 'frame') return { status: 'frame', drawList: this.host.lastFrame };
      }
    } catch (e) {
      this.finished = true;
      if (e instanceof LangError) return { status: 'error', diagnostic: e.diagnostic };
      throw e;
    }
  }

  /** Makes WindowShouldClose() return true from now on. */
  requestClose(): void {
    this.host.closeRequested = true;
  }

  variables(): VariableView[] {
    return this.interpreter.variables();
  }
}

export interface HeadlessOptions {
  frames: number;
  input?: (frame: number) => InputState;
  seed?: number;
}

export interface HeadlessResult {
  frames: DrawCommand[][];
  status: 'running' | 'finished' | 'error';
  diagnostic?: Diagnostic;
  machine?: Machine;
}

export function runHeadless(source: string, opts: HeadlessOptions): HeadlessResult {
  const host = new RaylibHost({ seed: opts.seed ?? 1 });
  const compiled = compile(source, host);
  if (!compiled.ok) return { frames: [], status: 'error', diagnostic: compiled.diagnostic };
  const machine = new Machine(compiled.program, host);
  const frames: DrawCommand[][] = [];
  for (let i = 0; i < opts.frames; i++) {
    const r = machine.runFrame(opts.input?.(i) ?? NO_INPUT);
    if (r.status === 'frame') { frames.push(r.drawList); continue; }
    if (r.status === 'error') return { frames, status: 'error', diagnostic: r.diagnostic, machine };
    return { frames, status: 'finished', machine };
  }
  return { frames, status: 'running', machine };
}
```

- [ ] **Step 6: Executar els tests**

Run: `npx vitest run tests/machine.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 7: Commit**

```bash
git add src/runtime tests/machine.test.ts
git commit -m "feat(runtime): funcions raylib, llista de dibuix i Machine sense pantalla"
```

---

### Task 8: El Pong en mini-C

**Files:**
- Create: `content/demo/pong.c`
- Test: `tests/pong.test.ts`

**Interfaces:**
- Consumes: `runHeadless`, `holding` (Task 7), `KEYS` (Task 7)
- Produces: `content/demo/pong.c` — programa complet que la demo (Task 10) carrega amb `import pongSource from '../../content/demo/pong.c?raw'`. Pala esquerra a x=20 (W/S), pala dreta a x=770 (↑/↓), alçada 80, velocitat 6, pilota a (400,225) amb velocitat (5,3), marcador a x=340 (esquerra) i x=440 (dreta).

- [ ] **Step 1: Escriure el test que falla**

`tests/pong.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import pong from '../content/demo/pong.c?raw';
import { holding } from '../src/runtime/input';
import { KEYS } from '../src/runtime/keys';
import { runHeadless } from '../src/runtime/machine';
import type { DrawCommand } from '../src/runtime/drawList';

const rects = (f: DrawCommand[]) => f.filter((c) => c.op === 'rect') as Extract<DrawCommand, { op: 'rect' }>[];
const texts = (f: DrawCommand[]) => f.filter((c) => c.op === 'text') as Extract<DrawCommand, { op: 'text' }>[];

describe('Pong in mini-C', () => {
  it('compiles and draws the court', () => {
    const r = runHeadless(pong, { frames: 1 });
    expect(r.status).toBe('running');
    expect(r.frames[0].map((c) => c.op)).toEqual(['clear', 'line', 'rect', 'rect', 'circle', 'text', 'text']);
  });

  it('moves the ball every frame', () => {
    const r = runHeadless(pong, { frames: 2 });
    const balls = r.frames.map((f) => f.find((c) => c.op === 'circle') as { x: number; y: number });
    expect(balls).toMatchObject([{ x: 405, y: 228 }, { x: 410, y: 231 }]);
  });

  it('moves the left paddle with W and keeps it on screen', () => {
    const ten = runHeadless(pong, { frames: 10, input: () => holding(KEYS.KEY_W) });
    expect(rects(ten.frames[9])[0].y).toBe(125);
    const many = runHeadless(pong, { frames: 100, input: () => holding(KEYS.KEY_W) });
    expect(rects(many.frames[99])[0].y).toBe(0);
  });

  it('moves the right paddle with the arrow keys', () => {
    const r = runHeadless(pong, { frames: 5, input: () => holding(KEYS.KEY_DOWN) });
    expect(rects(r.frames[4])[1].y).toBe(215);
  });

  it('scores when the ball passes a paddle', () => {
    const r = runHeadless(pong, { frames: 120 });
    expect(texts(r.frames[119]).map((t) => [t.text, t.x])).toEqual([['1', 340], ['0', 440]]);
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/pong.test.ts`
Expected: FAIL — no es pot resoldre `../content/demo/pong.c?raw`.

- [ ] **Step 3: Escriure `content/demo/pong.c`**

```c
#include "raylib.h"

int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);

    // Les pales
    int palaAmplada = 10;
    int palaAlcada = 80;
    int palaVelocitat = 6;
    int palaEsquerraY = 185;
    int palaDretaY = 185;

    // La pilota
    int pilotaX = 400;
    int pilotaY = 225;
    int pilotaRadi = 8;
    int velX = 5;
    int velY = 3;

    // El marcador
    int puntsEsquerra = 0;
    int puntsDreta = 0;

    while (!WindowShouldClose())
    {
        // Moure les pales amb el teclat
        if (IsKeyDown(KEY_W)) { palaEsquerraY = palaEsquerraY - palaVelocitat; }
        if (IsKeyDown(KEY_S)) { palaEsquerraY = palaEsquerraY + palaVelocitat; }
        if (IsKeyDown(KEY_UP)) { palaDretaY = palaDretaY - palaVelocitat; }
        if (IsKeyDown(KEY_DOWN)) { palaDretaY = palaDretaY + palaVelocitat; }

        // Que les pales no surtin de la pantalla
        if (palaEsquerraY < 0) { palaEsquerraY = 0; }
        if (palaEsquerraY > 450 - palaAlcada) { palaEsquerraY = 450 - palaAlcada; }
        if (palaDretaY < 0) { palaDretaY = 0; }
        if (palaDretaY > 450 - palaAlcada) { palaDretaY = 450 - palaAlcada; }

        // Moure la pilota
        pilotaX = pilotaX + velX;
        pilotaY = pilotaY + velY;

        // Rebotar a dalt i a baix
        if (pilotaY < pilotaRadi)
        {
            pilotaY = pilotaRadi;
            velY = -velY;
        }
        if (pilotaY > 450 - pilotaRadi)
        {
            pilotaY = 450 - pilotaRadi;
            velY = -velY;
        }

        // Rebotar a les pales
        if (velX < 0 && pilotaX - pilotaRadi < 30 && pilotaX > 20 && pilotaY > palaEsquerraY && pilotaY < palaEsquerraY + palaAlcada)
        {
            velX = -velX;
        }
        if (velX > 0 && pilotaX + pilotaRadi > 770 && pilotaX < 780 && pilotaY > palaDretaY && pilotaY < palaDretaY + palaAlcada)
        {
            velX = -velX;
        }

        // Punts: la pilota ha sortit per un costat
        if (pilotaX < 0)
        {
            puntsDreta += 1;
            pilotaX = 400;
            pilotaY = 225;
            velX = 5;
        }
        if (pilotaX > 800)
        {
            puntsEsquerra += 1;
            pilotaX = 400;
            pilotaY = 225;
            velX = -5;
        }

        // Dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawLine(400, 0, 400, 450, DARKGRAY);
        DrawRectangle(20, palaEsquerraY, palaAmplada, palaAlcada, WHITE);
        DrawRectangle(770, palaDretaY, palaAmplada, palaAlcada, WHITE);
        DrawCircle(pilotaX, pilotaY, pilotaRadi, YELLOW);
        DrawText(TextFormat("%d", puntsEsquerra), 340, 20, 40, WHITE);
        DrawText(TextFormat("%d", puntsDreta), 440, 20, 40, WHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
```

- [ ] **Step 4: Executar els tests**

Run: `npx vitest run tests/pong.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Comprovar que també és C real (invariant del llenguatge)**

Run (Windows, MSYS2 UCRT64 instal·lat a la màquina de desenvolupament):
`C:/msys64/ucrt64/bin/gcc.exe -std=c99 -Wall -Werror -fsyntax-only content/demo/pong.c`
Expected: cap sortida i codi de sortida 0. (Si `gcc` no hi és, saltar aquest pas: la CI de la Task 11 fa la mateixa comprovació.)

- [ ] **Step 6: Commit**

```bash
git add content/demo/pong.c tests/pong.test.ts
git commit -m "feat(content): Pong complet en mini-C"
```

---

### Task 9: Renderer, teclat i rellotge de frames

**Files:**
- Create: `src/render/canvas.ts`, `src/runtime/keyboard.ts`, `src/runtime/frameClock.ts`
- Test: `tests/render.test.ts`, `tests/keyboard.test.ts`, `tests/frameClock.test.ts`

**Interfaces:**
- Consumes: `DrawCommand` (Task 7), `ColorValue` (Task 5), `InputState`, `BROWSER_KEYS` (Task 7)
- Produces:
  - `cssColor(c: ColorValue): string`, `renderFrame(ctx: CanvasRenderingContext2D, cmds: readonly DrawCommand[]): void`
  - `class KeyboardInput { attach(target: EventTarget): () => void; snapshot(): InputState }` — `snapshot()` buida les tecles "premudes" després de llegir-les; `blur` allibera totes les tecles.
  - `FRAME_MS = 1000 / 60`, `MAX_FRAMES_PER_TICK = 4`, `class FrameClock { tick(now: number): number }` — retorna quants frames lògics toca executar (el primer `tick` sempre 1).

- [ ] **Step 1: Escriure els tests que fallen**

`tests/render.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { cssColor, renderFrame } from '../src/render/canvas';
import { COLORS } from '../src/runtime/colors';

function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    canvas: { width: 800, height: 450 },
    set fillStyle(v: string) { calls.push(`fill=${v}`); },
    set strokeStyle(v: string) { calls.push(`stroke=${v}`); },
    set lineWidth(v: number) { calls.push(`lineWidth=${v}`); },
    set font(v: string) { calls.push(`font=${v}`); },
    set textBaseline(v: string) { calls.push(`baseline=${v}`); },
    fillRect: (...a: number[]) => calls.push(`fillRect(${a.join(',')})`),
    beginPath: () => calls.push('beginPath'),
    arc: (...a: number[]) => calls.push(`arc(${a.slice(0, 3).join(',')})`),
    fill: () => calls.push('fill'),
    moveTo: (...a: number[]) => calls.push(`moveTo(${a.join(',')})`),
    lineTo: (...a: number[]) => calls.push(`lineTo(${a.join(',')})`),
    stroke: () => calls.push('stroke'),
    fillText: (t: string, x: number, y: number) => calls.push(`fillText(${t},${x},${y})`),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('renderFrame', () => {
  it('converts colors to CSS', () => {
    expect(cssColor({ r: 1, g: 2, b: 3, a: 255 })).toBe('rgba(1, 2, 3, 1)');
  });

  it('paints every command type', () => {
    const { ctx, calls } = fakeContext();
    renderFrame(ctx, [
      { op: 'clear', color: COLORS.BLACK },
      { op: 'rect', x: 1, y: 2, w: 3, h: 4, color: COLORS.WHITE },
      { op: 'circle', x: 10, y: 20, r: 5, color: COLORS.RED },
      { op: 'line', x1: 0, y1: 0, x2: 10, y2: 0, color: COLORS.GRAY },
      { op: 'text', text: 'hola', x: 7, y: 8, size: 20, color: COLORS.GOLD },
    ]);
    expect(calls).toEqual([
      'fill=rgba(0, 0, 0, 1)', 'fillRect(0,0,800,450)',
      'fill=rgba(255, 255, 255, 1)', 'fillRect(1,2,3,4)',
      'fill=rgba(230, 41, 55, 1)', 'beginPath', 'arc(10,20,5)', 'fill',
      'stroke=rgba(130, 130, 130, 1)', 'lineWidth=1', 'beginPath', 'moveTo(0.5,0.5)', 'lineTo(10.5,0.5)', 'stroke',
      'fill=rgba(255, 203, 0, 1)', 'font=20px monospace', 'baseline=top', 'fillText(hola,7,8)',
    ]);
  });
});
```

`tests/keyboard.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../src/runtime/keyboard';
import { KEYS } from '../src/runtime/keys';

function key(type: 'keydown' | 'keyup', code: string, repeat = false) {
  return Object.assign(new Event(type, { cancelable: true }), { code, repeat });
}

describe('KeyboardInput', () => {
  it('tracks held keys and reports a press only once', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'KeyW'));
    target.dispatchEvent(key('keydown', 'KeyW', true));
    const first = kb.snapshot();
    expect([...first.down]).toEqual([KEYS.KEY_W]);
    expect([...first.pressed]).toEqual([KEYS.KEY_W]);
    const second = kb.snapshot();
    expect([...second.down]).toEqual([KEYS.KEY_W]);
    expect([...second.pressed]).toEqual([]);
    target.dispatchEvent(key('keyup', 'KeyW'));
    expect([...kb.snapshot().down]).toEqual([]);
  });

  it('keeps quick taps between frames', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'Space'));
    target.dispatchEvent(key('keyup', 'Space'));
    expect([...kb.snapshot().pressed]).toEqual([KEYS.KEY_SPACE]);
  });

  it('releases every key when focus is lost', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    kb.attach(target);
    target.dispatchEvent(key('keydown', 'ArrowUp'));
    target.dispatchEvent(new Event('blur'));
    expect([...kb.snapshot().down]).toEqual([]);
  });

  it('prevents the browser default only for game keys', () => {
    const target = new EventTarget();
    new KeyboardInput().attach(target);
    const arrow = key('keydown', 'ArrowDown');
    const letter = key('keydown', 'KeyQ');
    target.dispatchEvent(arrow);
    target.dispatchEvent(letter);
    expect(arrow.defaultPrevented).toBe(true);
    expect(letter.defaultPrevented).toBe(false);
  });

  it('can be detached', () => {
    const target = new EventTarget();
    const kb = new KeyboardInput();
    const detach = kb.attach(target);
    detach();
    target.dispatchEvent(key('keydown', 'KeyS'));
    expect([...kb.snapshot().down]).toEqual([]);
  });
});
```

`tests/frameClock.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FrameClock, MAX_FRAMES_PER_TICK } from '../src/runtime/frameClock';

function framesInOneSecond(hz: number): number {
  const clock = new FrameClock();
  let total = 0;
  for (let i = 0; i <= hz; i++) total += clock.tick((i * 1000) / hz);
  return total;
}

describe('FrameClock', () => {
  it('runs one frame immediately', () => {
    expect(new FrameClock().tick(1234)).toBe(1);
  });

  it('runs about 60 logic frames per second at any refresh rate', () => {
    for (const hz of [30, 60, 75, 120, 144]) {
      const n = framesInOneSecond(hz);
      expect(n, `${hz} Hz`).toBeGreaterThanOrEqual(59);
      expect(n, `${hz} Hz`).toBeLessThanOrEqual(62);
    }
  });

  it('does not try to catch up after a long pause', () => {
    const clock = new FrameClock();
    clock.tick(0);
    expect(clock.tick(5000)).toBe(MAX_FRAMES_PER_TICK);
  });
});
```

- [ ] **Step 2: Executar els tests i veure que fallen**

Run: `npx vitest run tests/render.test.ts tests/keyboard.test.ts tests/frameClock.test.ts`
Expected: FAIL — no es poden resoldre els mòduls.

- [ ] **Step 3: Implementar `src/render/canvas.ts`**

```ts
import type { ColorValue } from '../lang/host';
import type { DrawCommand } from '../runtime/drawList';

export function cssColor(c: ColorValue): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
}

/** Paints a frame exactly as raylib would (no neon effects: those belong to the arcade frame around the canvas). */
export function renderFrame(ctx: CanvasRenderingContext2D, cmds: readonly DrawCommand[]): void {
  for (const c of cmds) {
    switch (c.op) {
      case 'clear':
        ctx.fillStyle = cssColor(c.color);
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        break;
      case 'rect':
        ctx.fillStyle = cssColor(c.color);
        ctx.fillRect(c.x, c.y, c.w, c.h);
        break;
      case 'circle':
        ctx.fillStyle = cssColor(c.color);
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.strokeStyle = cssColor(c.color);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.x1 + 0.5, c.y1 + 0.5);
        ctx.lineTo(c.x2 + 0.5, c.y2 + 0.5);
        ctx.stroke();
        break;
      case 'text':
        ctx.fillStyle = cssColor(c.color);
        ctx.font = `${c.size}px monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(c.text, c.x, c.y);
        break;
    }
  }
}
```

- [ ] **Step 4: Implementar `src/runtime/keyboard.ts`**

```ts
import type { InputState } from './input';
import { BROWSER_KEYS } from './keys';

function keyCode(e: Event): number | undefined {
  const code = (e as KeyboardEvent).code;
  return Object.hasOwn(BROWSER_KEYS, code) ? BROWSER_KEYS[code] : undefined;
}

export class KeyboardInput {
  private down = new Set<number>();
  private pressed = new Set<number>();

  attach(target: EventTarget): () => void {
    const onDown = (e: Event) => {
      const k = keyCode(e);
      if (k === undefined) return;
      e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    };
    const onUp = (e: Event) => {
      const k = keyCode(e);
      if (k !== undefined) this.down.delete(k);
    };
    const onBlur = () => this.down.clear();
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    };
  }

  /** Current state for one logic frame; "pressed" keys are consumed. */
  snapshot(): InputState {
    const state = { down: new Set(this.down), pressed: this.pressed };
    this.pressed = new Set();
    return state;
  }
}
```

- [ ] **Step 5: Implementar `src/runtime/frameClock.ts`**

```ts
export const FRAME_MS = 1000 / 60;
export const MAX_FRAMES_PER_TICK = 4;
const MAX_ELAPSED_MS = 250;

/** Converts display refreshes (requestAnimationFrame) into fixed 60 fps logic frames. */
export class FrameClock {
  private last: number | null = null;
  private pending = 0;

  tick(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    this.pending += Math.min(Math.max(now - this.last, 0), MAX_ELAPSED_MS);
    this.last = now;
    const frames = Math.floor(this.pending / FRAME_MS + 1e-6);
    this.pending = Math.max(this.pending - frames * FRAME_MS, 0);
    return Math.min(frames, MAX_FRAMES_PER_TICK);
  }
}
```

- [ ] **Step 6: Executar els tests**

Run: `npx vitest run tests/render.test.ts tests/keyboard.test.ts tests/frameClock.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 7: Commit**

```bash
git add src/render src/runtime/keyboard.ts src/runtime/frameClock.ts tests/render.test.ts tests/keyboard.test.ts tests/frameClock.test.ts
git commit -m "feat(runtime): renderer de canvas, teclat i rellotge de 60 fps"
```

---

### Task 10: Runner i pàgina de demo

**Files:**
- Create: `src/demo/runner.ts`, `src/demo/main.ts`, `src/demo/style.css`, `index.html`
- Test: `tests/runner.test.ts`

**Interfaces:**
- Consumes: `compile` (Task 5); `Machine`, `RaylibHost`, `DrawCommand`, `InputState` (Task 7); `ExecEvent` (Task 6); `FrameClock` (Task 9); `KeyboardInput` (Task 9); `renderFrame` (Task 9); `formatDiagnostic`, `t` (Task 2); `content/demo/pong.c` (Task 8)
- Produces:
  - `interface Scheduler { request(cb: (now: number) => void): number; cancel(id: number): void }`
  - `type RunnerStatus = { kind: 'running' } | { kind: 'stopped' } | { kind: 'finished' } | { kind: 'error'; diagnostic: Diagnostic }`
  - `class Runner { constructor(deps: RunnerDeps); start(source: string): void; stop(): void; get running(): boolean }` — `start` sempre atura l'execució anterior.
  - Pàgina `index.html` amb editor, ▶/⏹/↺, canvas i línia d'estat.

- [ ] **Step 1: Escriure el test que falla**

`tests/runner.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import pong from '../content/demo/pong.c?raw';
import { Runner, type RunnerStatus, type Scheduler } from '../src/demo/runner';
import { NO_INPUT } from '../src/runtime/input';
import type { DrawCommand } from '../src/runtime/drawList';

class FakeScheduler implements Scheduler {
  private callbacks = new Map<number, (now: number) => void>();
  private nextId = 1;
  request(cb: (now: number) => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, cb);
    return id;
  }
  cancel(id: number): void {
    this.callbacks.delete(id);
  }
  get pending(): number {
    return this.callbacks.size;
  }
  fire(now: number): void {
    const cbs = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const cb of cbs) cb(now);
  }
}

function setup() {
  const scheduler = new FakeScheduler();
  const statuses: RunnerStatus[] = [];
  const frames: DrawCommand[][] = [];
  const runner = new Runner({
    scheduler,
    input: { snapshot: () => NO_INPUT },
    onFrame: (drawList) => frames.push(drawList),
    onStatus: (s) => statuses.push(s),
    seed: 1,
  });
  return { scheduler, statuses, frames, runner };
}

describe('Runner', () => {
  it('reports compile errors without starting a loop', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) { int x = 5 }');
    expect(statuses).toMatchObject([{ kind: 'error', diagnostic: { code: 'MISSING_SEMICOLON' } }]);
    expect(scheduler.pending).toBe(0);
    expect(runner.running).toBe(false);
  });

  it('draws about 60 frames per second', () => {
    const { runner, scheduler, frames, statuses } = setup();
    runner.start(pong);
    for (let i = 0; i <= 60; i++) scheduler.fire((i * 1000) / 60);
    expect(statuses).toEqual([{ kind: 'running' }]);
    expect(frames.length).toBeGreaterThanOrEqual(59);
    expect(frames.length).toBeLessThanOrEqual(61);
  });

  it('never runs two loops at once when started twice', () => {
    const { runner, scheduler } = setup();
    runner.start(pong);
    runner.start(pong);
    expect(scheduler.pending).toBe(1);
  });

  it('stops', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start(pong);
    runner.stop();
    expect(scheduler.pending).toBe(0);
    expect(runner.running).toBe(false);
    expect(statuses.at(-1)).toEqual({ kind: 'stopped' });
  });

  it('reports when the program ends', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) { return 0; }');
    scheduler.fire(0);
    expect(statuses).toEqual([{ kind: 'running' }, { kind: 'finished' }]);
    expect(scheduler.pending).toBe(0);
  });

  it('reports runtime errors', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) {\nint z = 0;\nint x = 5 / z;\nreturn 0;\n}');
    scheduler.fire(0);
    expect(statuses.at(-1)).toMatchObject({ kind: 'error', diagnostic: { code: 'DIVISION_BY_ZERO', line: 3 } });
  });
});
```

- [ ] **Step 2: Executar el test i veure que falla**

Run: `npx vitest run tests/runner.test.ts`
Expected: FAIL — no es pot resoldre `../src/demo/runner`.

- [ ] **Step 3: Implementar `src/demo/runner.ts`**

```ts
import { compile } from '../lang/compile';
import type { Diagnostic } from '../lang/diagnostics';
import type { ExecEvent } from '../lang/interpreter';
import type { DrawCommand } from '../runtime/drawList';
import { FrameClock } from '../runtime/frameClock';
import type { InputState } from '../runtime/input';
import { Machine } from '../runtime/machine';
import { RaylibHost } from '../runtime/raylib';

export interface Scheduler {
  request(cb: (now: number) => void): number;
  cancel(id: number): void;
}

export type RunnerStatus =
  | { kind: 'running' }
  | { kind: 'stopped' }
  | { kind: 'finished' }
  | { kind: 'error'; diagnostic: Diagnostic };

export interface RunnerDeps {
  scheduler: Scheduler;
  input: { snapshot(): InputState };
  onFrame(drawList: DrawCommand[], host: RaylibHost): void;
  onStatus(status: RunnerStatus): void;
  onEvent?(e: ExecEvent): void;
  seed?: number;
}

/** Compiles a program and drives it at 60 logic frames per second. */
export class Runner {
  private machine: Machine | null = null;
  private pending: number | null = null;
  private clock = new FrameClock();

  constructor(private readonly deps: RunnerDeps) {}

  get running(): boolean {
    return this.machine !== null;
  }

  start(source: string): void {
    this.halt();
    const host = new RaylibHost({ seed: this.deps.seed });
    const compiled = compile(source, host);
    if (!compiled.ok) {
      this.deps.onStatus({ kind: 'error', diagnostic: compiled.diagnostic });
      return;
    }
    this.machine = new Machine(compiled.program, host, this.deps.onEvent);
    this.clock = new FrameClock();
    this.deps.onStatus({ kind: 'running' });
    this.schedule();
  }

  stop(): void {
    const wasRunning = this.running;
    this.halt();
    if (wasRunning) this.deps.onStatus({ kind: 'stopped' });
  }

  private halt(): void {
    if (this.pending !== null) this.deps.scheduler.cancel(this.pending);
    this.pending = null;
    this.machine = null;
  }

  private schedule(): void {
    this.pending = this.deps.scheduler.request((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.pending = null;
    const machine = this.machine;
    if (!machine) return;
    const due = this.clock.tick(now);
    let last: DrawCommand[] | null = null;
    for (let i = 0; i < due; i++) {
      const r = machine.runFrame(this.deps.input.snapshot());
      if (r.status === 'frame') { last = r.drawList; continue; }
      if (last) this.deps.onFrame(last, machine.host);
      this.machine = null;
      this.deps.onStatus(r.status === 'error' ? { kind: 'error', diagnostic: r.diagnostic } : { kind: 'finished' });
      return;
    }
    if (last) this.deps.onFrame(last, machine.host);
    this.schedule();
  }
}
```

- [ ] **Step 4: Executar els tests**

Run: `npx vitest run tests/runner.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Crear `index.html`**

```html
<!doctype html>
<html lang="ca">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bit Arcade</title>
  </head>
  <body>
    <header><h1 id="title"></h1></header>
    <main class="layout">
      <section class="code-pane">
        <textarea id="code" spellcheck="false" autocomplete="off"></textarea>
      </section>
      <section class="game-pane">
        <div class="toolbar">
          <button id="run" type="button"></button>
          <button id="stop" type="button"></button>
          <button id="restore" type="button"></button>
        </div>
        <div class="machine">
          <canvas id="screen" width="800" height="450" tabindex="0"></canvas>
        </div>
        <p id="status" role="status"></p>
      </section>
    </main>
    <script type="module" src="/src/demo/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Crear `src/demo/style.css`**

```css
:root {
  --bg: #0b0620;
  --panel: #140c33;
  --cyan: #39f3ff;
  --pink: #ff3ea5;
  --yellow: #ffe14d;
  --text: #e8e6ff;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
header h1 { margin: 0; padding: 12px 20px; font-size: 20px; color: var(--pink); text-shadow: 0 0 8px var(--pink); }
.layout { display: grid; grid-template-columns: minmax(380px, 1fr) auto; gap: 20px; padding: 0 20px 20px; }
#code {
  width: 100%; height: calc(100vh - 90px); resize: none; padding: 12px;
  background: var(--panel); color: var(--text); border: 2px solid #3a3358; border-radius: 8px;
  font: 14px/1.5 ui-monospace, Consolas, monospace; tab-size: 4;
}
.toolbar { display: flex; gap: 8px; margin-bottom: 10px; }
button {
  background: transparent; color: var(--cyan); border: 2px solid var(--cyan); border-radius: 6px;
  padding: 6px 14px; font: inherit; cursor: pointer; box-shadow: 0 0 6px var(--cyan);
}
button:hover { background: rgba(57, 243, 255, 0.12); }
.machine { padding: 14px; border: 3px solid var(--pink); border-radius: 12px; box-shadow: 0 0 14px var(--pink); }
#screen { display: block; background: #000; outline: none; }
#screen:focus { box-shadow: 0 0 0 2px var(--yellow); }
#status { min-height: 3em; max-width: 830px; }
#status.error { color: #ff8a8a; }
#status.warning { color: var(--yellow); }
```

- [ ] **Step 7: Crear `src/demo/main.ts`**

```ts
import './style.css';
import pongSource from '../../content/demo/pong.c?raw';
import { formatDiagnostic, t } from '../i18n/i18n';
import type { Diagnostic } from '../lang/diagnostics';
import { renderFrame } from '../render/canvas';
import { KeyboardInput } from '../runtime/keyboard';
import { Runner } from './runner';

const STORAGE_KEY = 'bitarcade:demo:code';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const code = byId<HTMLTextAreaElement>('code');
const canvas = byId<HTMLCanvasElement>('screen');
const status = byId<HTMLParagraphElement>('status');
const ctx = canvas.getContext('2d')!;

byId('title').textContent = t('title');
byId('run').textContent = t('run');
byId('stop').textContent = t('stop');
byId('restore').textContent = t('restore');

code.value = localStorage.getItem(STORAGE_KEY) ?? pongSource;
code.addEventListener('input', () => localStorage.setItem(STORAGE_KEY, code.value));
code.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  code.setRangeText('    ', code.selectionStart, code.selectionEnd, 'end');
  code.dispatchEvent(new Event('input'));
});

function show(kind: 'info' | 'error' | 'warning', text: string): void {
  status.className = kind;
  status.textContent = text;
}

function selectLine(line: number): void {
  const lines = code.value.split('\n');
  const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  code.focus();
  code.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
}

function showDiagnostic(d: Diagnostic): void {
  const prefix = d.severity === 'warning' ? t('warningLabel') : '';
  show(d.severity, prefix + t('lineLabel', { line: d.line }) + formatDiagnostic(d));
  if (d.severity === 'error') selectLine(d.line);
}

const keyboard = new KeyboardInput();
keyboard.attach(canvas);

const runner = new Runner({
  scheduler: { request: (cb) => requestAnimationFrame(cb), cancel: (id) => cancelAnimationFrame(id) },
  input: keyboard,
  onFrame: (drawList, host) => {
    if (canvas.width !== host.width || canvas.height !== host.height) {
      canvas.width = host.width;
      canvas.height = host.height;
    }
    renderFrame(ctx, drawList);
  },
  onStatus: (s) => {
    switch (s.kind) {
      case 'running': show('info', t('running')); canvas.focus(); break;
      case 'stopped': show('info', t('stopped')); break;
      case 'finished': show('info', t('finished')); break;
      case 'error': showDiagnostic(s.diagnostic); break;
    }
  },
  onEvent: (e) => {
    if (e.type === 'warning') showDiagnostic(e.diagnostic);
  },
});

byId('run').addEventListener('click', () => runner.start(code.value));
byId('stop').addEventListener('click', () => runner.stop());
byId('restore').addEventListener('click', () => {
  runner.stop();
  code.value = pongSource;
  localStorage.removeItem(STORAGE_KEY);
});
```

- [ ] **Step 8: Typecheck, tests i build**

Run: `npm test && npm run build`
Expected: tots els tests PASS; `tsc` sense errors; `vite build` genera `dist/index.html` i `dist/assets/*.js`.

- [ ] **Step 9: Verificació manual al navegador**

Run: `npm run dev` i obrir l'URL que mostra Vite (normalment `http://localhost:5173/`).
Comprovar, un per un:
1. L'editor mostra el Pong; prémer ▶ → el missatge diu "En marxa!..." i la pilota es mou.
2. W/S mouen la pala esquerra i ↑/↓ la dreta; les fletxes **no** fan desplaçar la pàgina.
3. Mantenir W, fer clic a l'editor i deixar anar W → en tornar al joc la pala no es mou sola.
4. Quan la pilota surt per la dreta, el marcador esquerre passa a 1.
5. Prémer ▶ tres vegades seguides → el joc va a la mateixa velocitat (no més ràpid).
6. Esborrar el `;` d'una línia i prémer ▶ → missatge "Línia N: Falta un ; al final de la línia N." i la línia queda seleccionada.
7. Canviar `int pilotaX = 400;` per `int pilotaX = 400 / 3;` i prémer ▶ → avís groc de divisió entera; el joc continua.
8. Esborrar `EndDrawing();` i prémer ▶ → error de bucle que assenyala la línia del `while`, i la pestanya no es penja.
9. ↺ Restaura → torna el Pong original.

- [ ] **Step 10: Commit**

```bash
git add index.html src/demo tests/runner.test.ts
git commit -m "feat(demo): pàgina per editar i jugar el Pong en mini-C"
```

---

### Task 11: CI i publicació a GitHub Pages

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm test`, `npm run build` (Task 1), fitxers `content/**/*.c` (Task 8)
- Produces: a cada push a `main`: tests + build + comprovació gcc/raylib + desplegament a GitHub Pages; a cada pull request: tests + comprovació gcc.

- [ ] **Step 1: Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        if: github.event_name == 'push'
        with:
          path: dist

  c-compat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Descarregar raylib.h 5.5
        run: |
          mkdir -p /tmp/raylib
          curl -fsSL https://raw.githubusercontent.com/raysan5/raylib/5.5/src/raylib.h -o /tmp/raylib/raylib.h
      - name: Tot el mini-C de content/ ha de ser C vàlid
        run: |
          find content -name '*.c' -print0 | while IFS= read -r -d '' f; do
            echo "gcc $f"
            gcc -std=c99 -Wall -Werror -fsyntax-only -I/tmp/raylib "$f"
          done

  deploy:
    if: github.event_name == 'push'
    needs: [test, c-compat]
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Si en executar-ho hi ha versions majors més noves d'aquestes accions, es poden fer servir; l'estructura és la mateixa.)

- [ ] **Step 2: Validar localment el que es pot**

Run: `npm ci && npm test && npm run build`
Expected: PASS i `dist/` generat (és exactament el que farà el job `test`).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: tests, compatibilitat amb C real i publicació a GitHub Pages"
```

- [ ] **Step 4: Nota per a l'usuari (no automatitzable)**

Quan es creï el repositori públic a GitHub i s'hi faci push: anar a *Settings → Pages → Build and deployment → Source* i triar **GitHub Actions**. La web quedarà a `https://<usuari>.github.io/<repo>/`.
