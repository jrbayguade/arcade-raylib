# Pantalla de lliçó i lliçons 0–1 — Pla d'implementació

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La primera experiència d'alumne: una pantalla de lliçó (Bit + editor CodeMirror amb zona editable i codi plegat + joc i variables) amb les lliçons 0 ("La pantalla és una quadrícula") i 1 ("Variables") del Pong.

**Architecture:** Lògica pura i testejable a `src/lessons/` (format de les fonts amb marques, comprovacions sense pantalla, motor de passos) i a `src/editor/` (càlcul d'etiquetes de paràmetre, autocompletat, zona editable sobre `EditorState`). La interfície és Svelte 5 (`src/ui/`, `src/app/`) i només connecta aquestes peces amb el `Runner` del pla anterior. El contingut (`content/pong/0X-*/`) són fitxers `.c` vàlids amb marques en comentaris, més `lesson.ts` i `ca.json`.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, Svelte 5, CodeMirror 6 (`codemirror`, `@codemirror/lang-cpp`, `@codemirror/theme-one-dark`), `playwright-core` + Edge per a la prova al navegador.

**Spec:** `docs/superpowers/specs/2026-10-12-llico-design.md` (i l'especificació general `docs/superpowers/specs/2026-10-12-bit-arcade-design.md`).

## Global Constraints

- El que es compila és exactament el text de l'editor (plecs inclosos); els números de línia dels errors coincideixen amb els de l'editor.
- Una sola zona editable per exercici; fora de la zona l'editor no accepta cap canvi.
- Les etiquetes de paràmetre són decoracions: mai formen part del text del document.
- Tot text visible per l'alumne surt de `src/i18n/ca.json` o del `ca.json` de la lliçó. Cap text en català escrit al codi TS/Svelte.
- Cada fitxer `.c` de `content/` (inici i solució) és C vàlid amb raylib.h: la CI existent els compila tots.
- Les comprovacions són determinístiques: llavor 1, 2 frames per defecte, sense entrada de teclat real.
- Estrelles: ⭐ si l'exercici passa, ⭐⭐ si passa sense haver vist cap pista. Les estrelles d'un exercici no baixen mai.
- 3 pistes per exercici.
- Sense progrés desat; navegació per hash `#/pong/<lliçó>/<pas>`.
- `index.html` = app de lliçons; `demo.html` = demo anterior sense canvis de comportament.

## Review Focus

1. **Ctrl+A i escriure, o enganxar un bloc que sobresurt de la zona** — el codi bloquejat no s'ha de perdre mai; el canvi sencer es rebutja. Test: Task 8.
2. **L'alumne esborra tot el contingut de la zona i després escriu** — la zona continua acceptant text. Test: Task 8.
3. **El codi de l'alumne té un bucle infinit o divideix per zero** — les comprovacions retornen `runtime-error` amb línia i la interfície no es penja. Test: Task 4.
4. **Demanar pistes després d'haver resolt l'exercici** — les estrelles guanyades no baixen. Test: Task 5.
5. **L'alumne corregeix un error** — el subratllat d'error desapareix en quant edita. Test: Task 8.

---

## Estructura de fitxers

```
index.html                          app de lliçons (nova)
demo.html                           demo anterior (abans index.html)
svelte.config.js
src/env.d.ts                        tipus de svelte i vite
src/app/main.ts, App.svelte, route.ts, app.css
src/runtime/runner.ts               Runner (mogut des de src/demo/) + variables()
src/i18n/ca.json, i18n.ts           + taula de paràmetres i textos de la interfície
src/lessons/source.ts               parseLessonSource, zoneText, replaceZone
src/lessons/checks.ts               evaluate, check, visibleRects, circles, variable, declares, callsOf, argIsVar
src/lessons/model.ts                tipus Lesson/Step
src/lessons/engine.ts               LessonEngine
src/editor/paramHints.ts            computeParamHints
src/editor/completions.ts           buildCompletions, declaredVariables, completionSource
src/editor/zone.ts                  editableZone, zoneField
src/editor/errorLine.ts             setErrorLine, errorLineField
src/editor/editor.ts                createLessonEditor (munta tot)
src/ui/LessonScreen.svelte, BitBubble.svelte, RichText.svelte, CodePane.svelte,
       GamePane.svelte, VariablesPanel.svelte, ExplainCard.svelte, GridCard.svelte, VariableBoxCard.svelte
content/pong/index.ts               LESSONS
content/pong/00-quadricula/         lesson.ts, ca.json, *.c, *.solution.c
content/pong/01-variables/          lesson.ts, ca.json, *.c, *.solution.c
tests/e2e/lessons.mjs               prova al navegador (Edge)
```

---

### Task 1: Svelte, CodeMirror, dues pàgines i Runner compartit

**Files:**
- Create: `svelte.config.js`, `src/env.d.ts`, `src/app/main.ts`, `src/app/App.svelte`, `index.html` (nou), `demo.html`
- Move: `src/demo/runner.ts` → `src/runtime/runner.ts`
- Modify: `vite.config.ts`, `tsconfig.json`, `package.json`, `src/demo/main.ts:7`, `tests/runner.test.ts:3`
- Test: `tests/runner.test.ts`

**Interfaces:**
- Consumes: `Runner`, `RunnerDeps`, `Scheduler`, `RunnerStatus` (pla anterior); `Machine.variables()`
- Produces: `src/runtime/runner.ts` amb el mateix API + `Runner.variables(): VariableView[]` (buit si no s'executa res). `npm run build` genera `dist/index.html` i `dist/demo.html`.

- [ ] **Step 1: Instal·lar dependències**

Run: `npm install svelte codemirror @codemirror/lang-cpp @codemirror/theme-one-dark` i després `npm install -D @sveltejs/vite-plugin-svelte svelte-check playwright-core`
Expected: `package.json` amb `dependencies` (svelte, codemirror, @codemirror/lang-cpp, @codemirror/theme-one-dark) i les noves `devDependencies`.

- [ ] **Step 2: Moure el Runner i escriure el test que falla**

Run: `git mv src/demo/runner.ts src/runtime/runner.ts`

Dins de `src/runtime/runner.ts`, canviar els imports del mateix directori:
```ts
import type { DrawCommand } from './drawList';
import { FrameClock } from './frameClock';
import type { InputState } from './input';
import { Machine } from './machine';
import { RaylibHost } from './raylib';
```
(els imports de `../lang/...` es mantenen igual). A `src/demo/main.ts` la línia `import { Runner } from './runner';` passa a `import { Runner } from '../runtime/runner';`. A `tests/runner.test.ts` la línia 3 passa a `import { Runner, type RunnerStatus, type Scheduler } from '../src/runtime/runner';`.

Afegir al final del `describe('Runner', ...)` de `tests/runner.test.ts`:
```ts
  it('exposes the variables of the running program', () => {
    const { runner, scheduler } = setup();
    expect(runner.variables()).toEqual([]);
    runner.start(pong);
    scheduler.fire(0);
    expect(runner.variables().map((v) => v.name)).toContain('palaEsquerraY');
    runner.stop();
    expect(runner.variables()).toEqual([]);
  });
```

- [ ] **Step 3: Veure'l fallar**

Run: `npx vitest run tests/runner.test.ts`
Expected: FAIL — `runner.variables is not a function`.

- [ ] **Step 4: Implementar `variables()`**

A `src/runtime/runner.ts`, afegir l'import `import type { ExecEvent, VariableView } from '../lang/interpreter';` (substituint l'import existent d'`ExecEvent`) i aquest mètode dins de la classe, després de `get running()`:
```ts
  /** Variables visible right now in the running program (empty when nothing runs). */
  variables(): VariableView[] {
    return this.machine?.variables() ?? [];
  }
```

- [ ] **Step 5: Configurar Svelte i dues pàgines**

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default { preprocess: vitePreprocess() };
```

`vite.config.ts`:
```ts
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { rollupOptions: { input: { main: page('./index.html'), demo: page('./demo.html') } } },
  test: { include: ['tests/**/*.test.ts'] },
});
```

`tsconfig.json`: canviar `"include"` per `["src", "tests", "content", "vite.config.ts"]` i `"types"` per `["vite/client", "svelte"]`.

`src/env.d.ts`:
```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

`package.json`, a `scripts`, afegir: `"check": "svelte-check --tsconfig ./tsconfig.json"` i `"e2e": "node tests/e2e/lessons.mjs"`.

Run: `git mv index.html demo.html`. A `demo.html`, canviar `<title>Bit Arcade</title>` per `<title>Bit Arcade — demo</title>`.

Nou `index.html`:
```html
<!doctype html>
<html lang="ca">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bit Arcade</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/app/main.ts"></script>
  </body>
</html>
```

`src/app/main.ts`:
```ts
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
```

`src/app/App.svelte` (provisional; la Task 10 el substitueix):
```svelte
<script lang="ts">
  import { t } from '../i18n/i18n';
</script>

<h1>{t('title')}</h1>
```

- [ ] **Step 6: Tests, typecheck i build**

Run: `npx vitest run && npx tsc --noEmit && npm run build && ls dist/index.html dist/demo.html`
Expected: tots els tests PASS (103); `tsc` sense errors; els dos HTML existeixen a `dist/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: Svelte i CodeMirror, app de lliçons a index.html i demo a demo.html"
```

---

### Task 2: Textos de la interfície i taula de paràmetres

**Files:**
- Modify: `src/i18n/ca.json`, `src/i18n/i18n.ts`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Consumes: `RaylibHost` (per al test)
- Produces: `paramNames(fn: string): string[] | undefined`; claus `ui` noves (vegeu Step 3) usades per les Tasks 9–10.

- [ ] **Step 1: Escriure el test que falla**

Afegir a `tests/i18n.test.ts`:
```ts
import { paramNames } from '../src/i18n/i18n';
import { RaylibHost } from '../src/runtime/raylib';

describe('paramNames', () => {
  it('names the parameters in Catalan', () => {
    expect(paramNames('DrawRectangle')).toEqual(['x', 'y', 'amplada', 'alçada', 'color']);
    expect(paramNames('NoExisteix')).toBeUndefined();
  });
  it('covers every non-variadic raylib function with the right count', () => {
    const host = new RaylibHost({ seed: 1 });
    for (const [name, fn] of Object.entries(host.functions)) {
      if (fn.variadic) continue;
      expect(paramNames(name), name).toHaveLength(fn.params.length);
    }
  });
});

describe('lesson UI strings', () => {
  it('has the strings the lesson screen uses', () => {
    for (const key of ['lessonTitle', 'stepOf', 'hint', 'hintLabel', 'reset', 'continue', 'nextLesson',
      'lessonDone', 'allDone', 'checksTitle', 'success', 'compileErrorIntro', 'runtimeErrorIntro',
      'mouseCoords', 'variablesTitle', 'foldLines', 'starsLabel']) {
      expect(t(key), key).not.toBe(key);
    }
  });
});
```

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/i18n.test.ts`
Expected: FAIL — `paramNames` no exportat.

- [ ] **Step 3: Implementar**

A `src/i18n/ca.json`, afegir aquesta secció al mateix nivell que `"ui"`:
```json
  "params": {
    "InitWindow": ["amplada", "alçada", "títol"],
    "SetTargetFPS": ["fps"],
    "WindowShouldClose": [],
    "CloseWindow": [],
    "GetScreenWidth": [],
    "GetScreenHeight": [],
    "BeginDrawing": [],
    "EndDrawing": [],
    "ClearBackground": ["color"],
    "DrawRectangle": ["x", "y", "amplada", "alçada", "color"],
    "DrawCircle": ["x", "y", "radi", "color"],
    "DrawLine": ["x1", "y1", "x2", "y2", "color"],
    "DrawText": ["text", "x", "y", "mida", "color"],
    "IsKeyDown": ["tecla"],
    "IsKeyPressed": ["tecla"],
    "GetRandomValue": ["mínim", "màxim"]
  },
```
i, dins de `"ui"`, aquestes claus:
```json
    "lessonTitle": "Lliçó {number} · {title}",
    "stepOf": "Pas {n} de {total}",
    "hint": "💡 Pista",
    "hintLabel": "Pista {n}:",
    "reset": "↺ Torna a començar",
    "continue": "Continua →",
    "nextLesson": "Següent lliçó →",
    "lessonDone": "Has acabat la lliçó! 🎉",
    "allDone": "Has acabat totes les lliçons que hi ha de moment. Aviat n'hi haurà més! 🏆",
    "checksTitle": "He mirat el teu codi i això és el que he vist:",
    "success": "Molt bé! Ho has aconseguit! 🎉",
    "compileErrorIntro": "Uf, a la línia {line} hi ha alguna cosa que no entenc:",
    "runtimeErrorIntro": "El joc s'ha aturat a la línia {line}:",
    "mouseCoords": "x: {x}   y: {y}",
    "variablesTitle": "Les teves variables",
    "foldLines": "▸ {lines} línies: {label}",
    "starsLabel": "Estrelles d'aquest exercici:"
```

A `src/i18n/i18n.ts`, afegir `params: Record<string, string[]>;` a la interfície `Catalog` i aquesta funció:
```ts
export function paramNames(fn: string): string[] | undefined {
  const own = catalogs[current].params;
  if (Object.hasOwn(own, fn)) return own[fn];
  return Object.hasOwn(catalogs.ca.params, fn) ? catalogs.ca.params[fn] : undefined;
}
```

- [ ] **Step 4: Tests**

Run: `npx vitest run tests/i18n.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` net.

- [ ] **Step 5: Commit**

```bash
git add src/i18n tests/i18n.test.ts
git commit -m "feat(i18n): noms de paràmetres i textos de la pantalla de lliçó"
```

---

### Task 3: Fonts de lliçó amb marques

**Files:**
- Create: `src/lessons/source.ts`
- Test: `tests/source.test.ts`

**Interfaces:**
- Consumes: res
- Produces: `interface Range { from: number; to: number }`, `interface Fold extends Range { key: string; lines: number }`, `interface LessonSource { code: string; editable: Range; folds: Fold[] }`, `parseLessonSource(raw: string): LessonSource` (llença `Error` amb missatge per a marques mal formades), `zoneText(src: LessonSource): string`, `replaceZone(src: LessonSource, text: string): string`. Les posicions són en el codi net (`code`), que sempre acaba amb `\n`. `editable.from` = inici de la primera línia de la zona; `editable.to` = final (sense `\n`) de l'última. Els plecs igual.

- [ ] **Step 1: Escriure el test que falla**

`tests/source.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseLessonSource, replaceZone, zoneText } from '../src/lessons/source';

const RAW = [
  '#include "raylib.h"',
  '//@fold preparar',
  'int main(void)',
  '{',
  '//@endfold',
  '//@edit',
  '    int x = 5;',
  '    int y = 6;',
  '//@end',
  '    return 0;',
  '}',
  '',
].join('\n');

describe('parseLessonSource', () => {
  it('removes the markers and locates zone and folds', () => {
    const src = parseLessonSource(RAW);
    expect(src.code).toBe('#include "raylib.h"\nint main(void)\n{\n    int x = 5;\n    int y = 6;\n    return 0;\n}\n');
    expect(zoneText(src)).toBe('    int x = 5;\n    int y = 6;');
    expect(src.folds).toEqual([{ key: 'preparar', from: 20, to: 36, lines: 2 }]);
    expect(src.code.slice(20, 36)).toBe('int main(void)\n{');
  });

  it('accepts Windows line endings', () => {
    expect(parseLessonSource(RAW.replace(/\n/g, '\r\n'))).toEqual(parseLessonSource(RAW));
  });

  it('replaces the zone', () => {
    const src = parseLessonSource(RAW);
    expect(replaceZone(src, '    int z = 1;')).toBe('#include "raylib.h"\nint main(void)\n{\n    int z = 1;\n    return 0;\n}\n');
  });

  it('rejects malformed markers', () => {
    expect(() => parseLessonSource('int a;\n')).toThrow(/no \/\/@edit zone/);
    expect(() => parseLessonSource('//@edit\nint a;\n')).toThrow(/not closed/);
    expect(() => parseLessonSource('//@edit\n//@end\n')).toThrow(/empty/);
    expect(() => parseLessonSource('//@edit\na\n//@end\n//@edit\nb\n//@end\n')).toThrow(/only one/);
    expect(() => parseLessonSource('//@fold x\n//@edit\na\n//@end\n//@endfold\n')).toThrow(/inside a fold/);
    expect(() => parseLessonSource('//@edit\na\n//@end\n//@foo\n')).toThrow(/unknown marker/);
  });
});
```

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/source.test.ts`
Expected: FAIL — no es pot resoldre `../src/lessons/source`.

- [ ] **Step 3: Implementar `src/lessons/source.ts`**

```ts
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
```

- [ ] **Step 4: Tests**

Run: `npx vitest run tests/source.test.ts && npx tsc --noEmit`
Expected: PASS (4 tests); `tsc` net.

- [ ] **Step 5: Commit**

```bash
git add src/lessons/source.ts tests/source.test.ts
git commit -m "feat(lessons): fonts d'exercici amb zona editable i plecs"
```

---

### Task 4: Comprovacions sense pantalla

**Files:**
- Create: `src/lessons/checks.ts`
- Test: `tests/checks.test.ts`

**Interfaces:**
- Consumes: `compile` (`src/lang/compile.ts`), `Machine`, `RaylibHost`, `holding`, `NO_INPUT`, `KEYS`, `DrawCommand`, `VariableView`, `Diagnostic`, AST (`Program`, `Block`, `Stmt`, `Expr`, `Call`, `DeclType`)
- Produces:
  - `interface CheckContext { program: Program; frame: DrawCommand[]; variables: VariableView[] }`
  - `interface Check { key: string; test(ctx: CheckContext): boolean }`, `check(key, test): Check`
  - `interface RunSpec { frames: number; hold?: string[] }`, `DEFAULT_RUN = { frames: 2 }`
  - `type Evaluation = { kind: 'compile-error'; diagnostic } | { kind: 'runtime-error'; diagnostic } | { kind: 'checked'; passed: boolean; results: { key: string; ok: boolean }[] }`
  - `evaluate(source: string, checks: Check[], run?: RunSpec): Evaluation`
  - Ajudes: `visibleRects(ctx)` (rectangles dibuixats després de l'últim `clear` de l'últim frame), `circles(ctx)` (igual, cercles), `variable(ctx, name): number | undefined`, `declares(program, name, type): boolean`, `callsOf(program, fn): Call[]`, `argIsVar(call, index, name): boolean`
  - Una comprovació que llença una excepció compta com a fallada.

- [ ] **Step 1: Escriure el test que falla**

`tests/checks.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { argIsVar, callsOf, check, circles, declares, evaluate, variable, visibleRects } from '../src/lessons/checks';

const game = (draw: string, setup = '') => `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
${setup}
    while (!WindowShouldClose()) {
        BeginDrawing();
${draw}
        EndDrawing();
    }
    CloseWindow();
    return 0;
}
`;

describe('evaluate', () => {
  it('reports compile errors', () => {
    expect(evaluate(game('DrawRectangle(1, 2, 3, 4, RED)'), [])).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'MISSING_SEMICOLON' } });
  });

  it('reports runtime errors such as endless loops and division by zero', () => {
    expect(evaluate(game('int i = 0;\nwhile (i >= 0) { i = 1; }'), [])).toMatchObject({ kind: 'runtime-error', diagnostic: { code: 'LOOP_TOO_LONG' } });
    expect(evaluate(game('int z = 0;\nint w = 5 / z;'), [])).toMatchObject({ kind: 'runtime-error', diagnostic: { code: 'DIVISION_BY_ZERO' } });
  });

  it('runs the checks on the last frame', () => {
    const src = game('ClearBackground(BLACK);\nDrawRectangle(20, palaY, 10, 80, WHITE);', '    int palaY = 50;');
    const r = evaluate(src, [
      check('up', (ctx) => visibleRects(ctx).some((r) => r.x === 20 && r.y === 50)),
      check('down', (ctx) => visibleRects(ctx).some((r) => r.y === 300)),
      check('var', (ctx) => variable(ctx, 'palaY') === 50),
    ]);
    expect(r).toEqual({ kind: 'checked', passed: false, results: [
      { key: 'up', ok: true }, { key: 'down', ok: false }, { key: 'var', ok: true },
    ] });
  });

  it('counts a check that throws as failed', () => {
    const r = evaluate(game('ClearBackground(BLACK);'), [check('boom', () => { throw new Error('x'); })]);
    expect(r).toMatchObject({ kind: 'checked', passed: false, results: [{ key: 'boom', ok: false }] });
  });

  it('uses the last frame of a program without a game loop', () => {
    const src = 'int main(void) {\nInitWindow(100, 100, "x");\nBeginDrawing();\nDrawCircle(5, 6, 2, RED);\nEndDrawing();\nreturn 0;\n}\n';
    expect(evaluate(src, [check('c', (ctx) => circles(ctx).length === 1)])).toMatchObject({ passed: true });
  });
});

describe('helpers', () => {
  it('only sees what is drawn after the last clear', () => {
    const r = evaluate(game('DrawRectangle(1, 1, 5, 5, RED);\nClearBackground(BLACK);\nDrawRectangle(2, 2, 5, 5, RED);'), [
      check('visible', (ctx) => visibleRects(ctx).length === 1 && visibleRects(ctx)[0].x === 2),
    ]);
    expect(r).toMatchObject({ passed: true });
  });

  it('inspects declarations and call arguments in the code', () => {
    const src = game('int alcada = 120;\nDrawRectangle(20, 10, 10, alcada, WHITE);\nDrawRectangle(770, 10, 10, 80, WHITE);');
    const r = evaluate(src, [
      check('declares', (ctx) => declares(ctx.program, 'alcada', 'int')),
      check('notFloat', (ctx) => !declares(ctx.program, 'alcada', 'float')),
      check('twoCalls', (ctx) => callsOf(ctx.program, 'DrawRectangle').length === 2),
      check('firstUsesVar', (ctx) => argIsVar(callsOf(ctx.program, 'DrawRectangle')[0], 3, 'alcada')),
      check('secondDoesNot', (ctx) => !argIsVar(callsOf(ctx.program, 'DrawRectangle')[1], 3, 'alcada')),
    ]);
    expect(r).toMatchObject({ passed: true });
  });
});
```

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/checks.test.ts`
Expected: FAIL — no es pot resoldre `../src/lessons/checks`.

- [ ] **Step 3: Implementar `src/lessons/checks.ts`**

```ts
import type { Block, Call, DeclType, Expr, Program, Stmt } from '../lang/ast';
import { compile } from '../lang/compile';
import type { Diagnostic } from '../lang/diagnostics';
import type { VariableView } from '../lang/interpreter';
import type { DrawCommand } from '../runtime/drawList';
import { holding, NO_INPUT } from '../runtime/input';
import { KEYS } from '../runtime/keys';
import { Machine } from '../runtime/machine';
import { RaylibHost } from '../runtime/raylib';

export interface CheckContext { program: Program; frame: DrawCommand[]; variables: VariableView[] }
export interface Check { key: string; test(ctx: CheckContext): boolean }
export interface RunSpec { frames: number; hold?: string[] }
export interface CheckResult { key: string; ok: boolean }
export type Evaluation =
  | { kind: 'compile-error'; diagnostic: Diagnostic }
  | { kind: 'runtime-error'; diagnostic: Diagnostic }
  | { kind: 'checked'; passed: boolean; results: CheckResult[] };

export const DEFAULT_RUN: RunSpec = { frames: 2 };

export function check(key: string, test: (ctx: CheckContext) => boolean): Check {
  return { key, test };
}

/** Compiles and runs the program without a screen (seed 1, fixed input), then runs the checks on the last frame. */
export function evaluate(source: string, checks: Check[], run: RunSpec = DEFAULT_RUN): Evaluation {
  const host = new RaylibHost({ seed: 1 });
  const compiled = compile(source, host);
  if (!compiled.ok) return { kind: 'compile-error', diagnostic: compiled.diagnostic };
  const machine = new Machine(compiled.program, host);
  const input = run.hold?.length ? holding(...run.hold.map((k) => KEYS[k])) : NO_INPUT;
  let frame: DrawCommand[] = [];
  let variables = machine.variables();
  for (let i = 0; i < run.frames; i++) {
    const r = machine.runFrame(input);
    if (r.status === 'error') return { kind: 'runtime-error', diagnostic: r.diagnostic };
    if (r.status === 'finished') break;
    frame = r.drawList;
    variables = machine.variables();
  }
  const ctx: CheckContext = { program: compiled.program, frame, variables };
  const results = checks.map((c) => ({ key: c.key, ok: safely(() => c.test(ctx)) }));
  return { kind: 'checked', passed: results.every((r) => r.ok), results };
}

function safely(test: () => boolean): boolean {
  try {
    return test() === true;
  } catch {
    return false;
  }
}

type Rect = Extract<DrawCommand, { op: 'rect' }>;
type Circle = Extract<DrawCommand, { op: 'circle' }>;

function afterLastClear(frame: DrawCommand[]): DrawCommand[] {
  for (let i = frame.length - 1; i >= 0; i--) if (frame[i].op === 'clear') return frame.slice(i + 1);
  return frame;
}

export function visibleRects(ctx: CheckContext): Rect[] {
  return afterLastClear(ctx.frame).filter((c): c is Rect => c.op === 'rect');
}

export function circles(ctx: CheckContext): Circle[] {
  return afterLastClear(ctx.frame).filter((c): c is Circle => c.op === 'circle');
}

export function variable(ctx: CheckContext, name: string): number | undefined {
  const v = ctx.variables.find((x) => x.name === name)?.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return undefined;
}

function* statements(block: Block): Generator<Stmt> {
  for (const s of block.body) {
    yield s;
    switch (s.kind) {
      case 'Block': yield* statements(s); break;
      case 'If':
        yield* statements(s.then);
        if (s.otherwise) yield* (s.otherwise.kind === 'Block' ? statements(s.otherwise) : statements({ ...s.otherwise.then, body: [s.otherwise] }));
        break;
      case 'While': yield* statements(s.body); break;
      case 'For':
        if (s.init) yield s.init;
        if (s.update) yield s.update;
        yield* statements(s.body);
        break;
    }
  }
}

function* rootExprs(s: Stmt): Generator<Expr> {
  switch (s.kind) {
    case 'VarDecl': yield s.init; break;
    case 'Assign': yield s.value; break;
    case 'ExprStmt': yield s.expr; break;
    case 'If': case 'While': yield s.cond; break;
    case 'For': if (s.cond) yield s.cond; break;
    case 'Return': if (s.value) yield s.value; break;
  }
}

function* subExprs(e: Expr): Generator<Expr> {
  yield e;
  switch (e.kind) {
    case 'Unary': yield* subExprs(e.operand); break;
    case 'Binary': yield* subExprs(e.left); yield* subExprs(e.right); break;
    case 'Call': for (const a of e.args) yield* subExprs(a); break;
  }
}

export function declares(program: Program, name: string, type: DeclType): boolean {
  for (const s of statements(program.main)) if (s.kind === 'VarDecl' && s.name === name && s.varType === type) return true;
  return false;
}

export function callsOf(program: Program, fn: string): Call[] {
  const calls: Call[] = [];
  for (const s of statements(program.main)) {
    for (const root of rootExprs(s)) for (const e of subExprs(root)) if (e.kind === 'Call' && e.callee === fn) calls.push(e);
  }
  return calls;
}

export function argIsVar(call: Call | undefined, index: number, name: string): boolean {
  const arg = call?.args[index];
  return arg?.kind === 'Var' && arg.name === name;
}
```

Nota: `statements` visita el `If` d'un `else if` passant-lo com un bloc d'un sol element, per no duplicar la lògica.

- [ ] **Step 4: Tests**

Run: `npx vitest run tests/checks.test.ts && npx tsc --noEmit`
Expected: PASS (7 tests); `tsc` net.

- [ ] **Step 5: Commit**

```bash
git add src/lessons/checks.ts tests/checks.test.ts
git commit -m "feat(lessons): comprovacions sense pantalla sobre codi, dibuix i variables"
```

---

### Task 5: Model de lliçó i motor de passos

**Files:**
- Create: `src/lessons/model.ts`, `src/lessons/engine.ts`
- Test: `tests/engine.test.ts`

**Interfaces:**
- Consumes: `Check`, `RunSpec`, `Evaluation`, `evaluate` (Task 4); `parseLessonSource`, `LessonSource` (Task 3)
- Produces:
  - `model.ts`: `ExerciseKind = 'warmup' | 'observe' | 'practice' | 'apply'`; `ExerciseStep { kind: ExerciseKind; id; source: string; solution: string; checks: Check[]; run?: RunSpec; showVariables?: boolean }`; `ExplainStep { kind: 'explain'; id; card: 'grid' | 'variable-box' }`; `Step`; `StepTexts { prompt: string; hints?: string[]; success?: string }`; `LessonTexts { title; steps: Record<string, StepTexts>; checks: Record<string, string>; folds: Record<string, string> }`; `Lesson { id; number; steps: Step[]; texts: LessonTexts }`; `isExercise(step): step is ExerciseStep`
  - `engine.ts`: `ExerciseState { source: LessonSource; code: string; hintsShown: number; stars: 0 | 1 | 2; done: boolean; result: Evaluation | null }`; `class LessonEngine { constructor(lesson, start = 0); stepIndex; step; isLastStep; texts: StepTexts; exercise: ExerciseState | null; setCode(code); run(): Evaluation | null; showHint(): string | null; shownHints(): string[]; hasMoreHints: boolean; reset(); canContinue: boolean; next(): boolean }`

- [ ] **Step 1: Escriure el test que falla**

`tests/engine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { check, visibleRects } from '../src/lessons/checks';
import { LessonEngine } from '../src/lessons/engine';
import type { Lesson } from '../src/lessons/model';

const source = (y: number) => `#include "raylib.h"
int main(void) {
    InitWindow(800, 450, "x");
    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(BLACK);
//@edit
        DrawRectangle(20, ${y}, 10, 80, WHITE);
//@end
        EndDrawing();
    }
    return 0;
}
`;

const lesson: Lesson = {
  id: 'test', number: 0,
  texts: {
    title: 'Prova',
    steps: { move: { prompt: 'Mou-la', hints: ['h1', 'h2', 'h3'] }, card: { prompt: 'Mira' } },
    checks: { moved: 'S’ha mogut' },
    folds: {},
  },
  steps: [
    { kind: 'observe', id: 'move', source: source(185), solution: source(50),
      checks: [check('moved', (ctx) => visibleRects(ctx).some((r) => r.y !== 185))] },
    { kind: 'explain', id: 'card', card: 'grid' },
  ],
};

describe('LessonEngine', () => {
  it('starts at the requested step, clamped', () => {
    expect(new LessonEngine(lesson, 1).stepIndex).toBe(1);
    expect(new LessonEngine(lesson, 99).stepIndex).toBe(1);
    expect(new LessonEngine(lesson, -3).stepIndex).toBe(0);
  });

  it('does not let you continue before the exercise passes', () => {
    const e = new LessonEngine(lesson);
    expect(e.canContinue).toBe(false);
    expect(e.next()).toBe(false);
    expect(e.run()).toMatchObject({ kind: 'checked', passed: false });
    expect(e.canContinue).toBe(false);
  });

  it('gives two stars without hints and lets you continue', () => {
    const e = new LessonEngine(lesson);
    e.setCode(e.exercise!.code.replace('185', '50'));
    expect(e.run()).toMatchObject({ passed: true });
    expect(e.exercise).toMatchObject({ done: true, stars: 2 });
    expect(e.next()).toBe(true);
    expect(e.step.kind).toBe('explain');
    expect(e.exercise).toBeNull();
    expect(e.canContinue).toBe(true);
    expect(e.isLastStep).toBe(true);
    expect(e.next()).toBe(false);
  });

  it('gives one star after a hint, and stars never go down', () => {
    const e = new LessonEngine(lesson);
    expect(e.showHint()).toBe('h1');
    e.setCode(e.exercise!.code.replace('185', '50'));
    e.run();
    expect(e.exercise!.stars).toBe(1);

    const f = new LessonEngine(lesson);
    f.setCode(f.exercise!.code.replace('185', '50'));
    f.run();
    f.showHint();
    f.run();
    expect(f.exercise!.stars).toBe(2);
  });

  it('shows at most three hints', () => {
    const e = new LessonEngine(lesson);
    expect([e.showHint(), e.showHint(), e.showHint(), e.showHint()]).toEqual(['h1', 'h2', 'h3', null]);
    expect(e.shownHints()).toEqual(['h1', 'h2', 'h3']);
    expect(e.hasMoreHints).toBe(false);
  });

  it('resets the code but keeps hints and stars', () => {
    const e = new LessonEngine(lesson);
    e.showHint();
    e.setCode('trencat');
    e.reset();
    expect(e.exercise!.code).toBe(e.exercise!.source.code);
    expect(e.exercise!.result).toBeNull();
    expect(e.shownHints()).toEqual(['h1']);
  });
});
```

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/engine.test.ts`
Expected: FAIL — no es pot resoldre `../src/lessons/engine`.

- [ ] **Step 3: Implementar `src/lessons/model.ts`**

```ts
import type { Check, RunSpec } from './checks';

export type ExerciseKind = 'warmup' | 'observe' | 'practice' | 'apply';

export interface ExerciseStep {
  kind: ExerciseKind;
  id: string;
  /** Exercise file contents, with //@edit and //@fold markers. */
  source: string;
  /** Reference solution, same markers; only the zone may differ from `source`. */
  solution: string;
  checks: Check[];
  run?: RunSpec;
  showVariables?: boolean;
}

export interface ExplainStep { kind: 'explain'; id: string; card: 'grid' | 'variable-box' }

export type Step = ExerciseStep | ExplainStep;

export interface StepTexts { prompt: string; hints?: string[]; success?: string }

export interface LessonTexts {
  title: string;
  steps: Record<string, StepTexts>;
  checks: Record<string, string>;
  folds: Record<string, string>;
}

export interface Lesson { id: string; number: number; steps: Step[]; texts: LessonTexts }

export function isExercise(step: Step): step is ExerciseStep {
  return step.kind !== 'explain';
}
```

- [ ] **Step 4: Implementar `src/lessons/engine.ts`**

```ts
import { evaluate, type Evaluation } from './checks';
import { isExercise, type Lesson, type Step, type StepTexts } from './model';
import { parseLessonSource, type LessonSource } from './source';

export interface ExerciseState {
  source: LessonSource;
  code: string;
  hintsShown: number;
  stars: 0 | 1 | 2;
  done: boolean;
  result: Evaluation | null;
}

/** State of one lesson in progress. Pure logic: the UI reads it and calls its methods. */
export class LessonEngine {
  private index: number;
  private readonly states = new Map<string, ExerciseState>();

  constructor(readonly lesson: Lesson, start = 0) {
    this.index = Math.min(Math.max(Math.trunc(start), 0), lesson.steps.length - 1);
  }

  get stepIndex(): number { return this.index; }
  get step(): Step { return this.lesson.steps[this.index]; }
  get isLastStep(): boolean { return this.index === this.lesson.steps.length - 1; }
  get texts(): StepTexts { return this.lesson.texts.steps[this.step.id] ?? { prompt: this.step.id }; }

  get exercise(): ExerciseState | null {
    const step = this.step;
    if (!isExercise(step)) return null;
    let state = this.states.get(step.id);
    if (!state) {
      const source = parseLessonSource(step.source);
      state = { source, code: source.code, hintsShown: 0, stars: 0, done: false, result: null };
      this.states.set(step.id, state);
    }
    return state;
  }

  setCode(code: string): void {
    const ex = this.exercise;
    if (ex) ex.code = code;
  }

  run(): Evaluation | null {
    const step = this.step;
    const ex = this.exercise;
    if (!ex || !isExercise(step)) return null;
    const result = evaluate(ex.code, step.checks, step.run);
    ex.result = result;
    if (result.kind === 'checked' && result.passed) {
      ex.done = true;
      const earned = ex.hintsShown > 0 ? 1 : 2;
      if (earned > ex.stars) ex.stars = earned;
    }
    return result;
  }

  private hints(): string[] { return this.texts.hints ?? []; }

  get hasMoreHints(): boolean {
    const ex = this.exercise;
    return ex !== null && ex.hintsShown < this.hints().length;
  }

  showHint(): string | null {
    const ex = this.exercise;
    if (!ex || !this.hasMoreHints) return null;
    return this.hints()[ex.hintsShown++];
  }

  shownHints(): string[] {
    const ex = this.exercise;
    return ex ? this.hints().slice(0, ex.hintsShown) : [];
  }

  reset(): void {
    const ex = this.exercise;
    if (!ex) return;
    ex.code = ex.source.code;
    ex.result = null;
  }

  get canContinue(): boolean {
    const ex = this.exercise;
    return ex === null || ex.done;
  }

  next(): boolean {
    if (!this.canContinue || this.isLastStep) return false;
    this.index++;
    return true;
  }
}
```

- [ ] **Step 5: Tests**

Run: `npx vitest run tests/engine.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests); `tsc` net.

- [ ] **Step 6: Commit**

```bash
git add src/lessons/model.ts src/lessons/engine.ts tests/engine.test.ts
git commit -m "feat(lessons): model de lliçó i motor de passos amb pistes i estrelles"
```

---

### Task 6: Contingut de la lliçó 0 i tests de contingut

**Files:**
- Create: `content/pong/00-quadricula/{lesson.ts, ca.json, observe.c, observe.solution.c, floor.c, floor.solution.c, tall.c, tall.solution.c, order.c, order.solution.c, ball.c, ball.solution.c}`, `content/pong/index.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `isExercise` (Task 5); `check`, `visibleRects`, `circles`, `evaluate` (Task 4); `parseLessonSource`, `zoneText` (Task 3)
- Produces: `content/pong/index.ts` exporta `LESSONS: Lesson[]` (la Task 7 hi afegeix la lliçó 1).

- [ ] **Step 1: Escriure el test de contingut (falla)**

`tests/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/pong';
import { evaluate } from '../src/lessons/checks';
import { isExercise } from '../src/lessons/model';
import { parseLessonSource } from '../src/lessons/source';

describe.each(LESSONS.map((l) => [l.id, l] as const))('lesson %s', (_id, lesson) => {
  it('has unique step ids and texts for every step', () => {
    const ids = lesson.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of lesson.steps) expect(lesson.texts.steps[s.id]?.prompt, s.id).toBeTruthy();
  });

  for (const step of lesson.steps.filter(isExercise)) {
    describe(`exercise ${step.id}`, () => {
      const start = parseLessonSource(step.source);
      const solution = parseLessonSource(step.solution);

      it('has three hints and a text for every check and fold', () => {
        expect(lesson.texts.steps[step.id].hints).toHaveLength(3);
        for (const c of step.checks) expect(lesson.texts.checks[c.key], c.key).toBeTruthy();
        for (const f of start.folds) expect(lesson.texts.folds[f.key], f.key).toBeTruthy();
      });

      it('only differs from the solution inside the zone', () => {
        expect(solution.code.slice(0, solution.editable.from)).toBe(start.code.slice(0, start.editable.from));
        expect(solution.code.slice(solution.editable.to)).toBe(start.code.slice(start.editable.to));
      });

      it('does not pass with the starting code', () => {
        expect(evaluate(start.code, step.checks, step.run)).toMatchObject({ kind: 'checked', passed: false });
      });

      it('passes with the solution', () => {
        expect(evaluate(solution.code, step.checks, step.run)).toMatchObject({ kind: 'checked', passed: true });
      });
    });
  }
});
```

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — no es pot resoldre `../content/pong`.

- [ ] **Step 2: Fitxers `.c` de la lliçó 0**

Tots comparteixen aquest esquelet; només canvia el bloc de dibuix marcat amb `[ZONA]`. `content/pong/00-quadricula/observe.c`:
```c
#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);

    while (!WindowShouldClose())
    {
//@endfold
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(770, 185, 10, 80, WHITE);
//@edit
        DrawRectangle(20, 185, 10, 80, WHITE);
//@end
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
```

`observe.solution.c`: idèntic, amb la línia de la zona `        DrawRectangle(20, 50, 10, 80, WHITE);`.

`floor.c`: idèntic a `observe.c`. `floor.solution.c`: zona `        DrawRectangle(20, 370, 10, 80, WHITE);`.

`tall.c`: idèntic a `observe.c`. `tall.solution.c`: zona `        DrawRectangle(20, 185, 10, 160, WHITE);`.

`order.c`: igual que `observe.c` però el bloc entre `BeginDrawing();` i `EndDrawing();` és:
```c
        BeginDrawing();
//@edit
        DrawRectangle(20, 185, 10, 80, WHITE);
        ClearBackground(BLACK);
//@end
        DrawRectangle(770, 185, 10, 80, WHITE);
        EndDrawing();
```
`order.solution.c`: el mateix amb la zona
```c
        ClearBackground(BLACK);
        DrawRectangle(20, 185, 10, 80, WHITE);
```

`ball.c`: igual que `observe.c` però la zona és:
```c
//@edit
        DrawRectangle(20, 185, 10, 80, WHITE);
        // ✏️ Dibuixa la pilota aquí, a sota d'aquesta línia
//@end
```
`ball.solution.c`: zona
```c
        DrawRectangle(20, 185, 10, 80, WHITE);
        // ✏️ Dibuixa la pilota aquí, a sota d'aquesta línia
        DrawCircle(400, 225, 8, YELLOW);
```

- [ ] **Step 3: `content/pong/00-quadricula/ca.json`**

```json
{
  "title": "La pantalla és una quadrícula",
  "folds": {
    "preparar": "preparar el joc",
    "tancar": "tancar el joc"
  },
  "steps": {
    "observe": {
      "prompt": "Hola! Sóc en Bit 🤖. Aquesta màquina està espatllada i l'arreglarem junts. La línia groga dibuixa la pala de l'esquerra. Canvia el número 185 per un 50 i prem ▶ Executa. Què passa?",
      "hints": [
        "Busca el número 185 a la línia groga. És el segon número.",
        "Fes doble clic damunt del 185 per seleccionar-lo i escriu 50.",
        "La línia ha de quedar així: `DrawRectangle(20, 50, 10, 80, WHITE);`"
      ],
      "success": "La pala ha pujat! Acabes de moure el teu primer objecte. 🎉"
    },
    "grid": {
      "prompt": "La pantalla del joc és com un full quadriculat de 800 × 450 punts. Cada punt té dues coordenades: la x diu com de a la dreta és, i la y com d'avall és. Compte: la y creix cap avall! Per això, quan has posat un número més petit, la pala ha pujat. Passa el ratolí per sobre del joc i mira els números."
    },
    "floor": {
      "prompt": "Ara posa la pala tocant a terra, a baix de tot. Pista de detectiu: la pantalla fa 450 d'alt i la pala en fa 80.",
      "hints": [
        "Has de canviar la y, que és el segon número.",
        "Si la pala comença a la y i fa 80 d'alt, s'acaba a y + 80. Ha d'acabar a 450.",
        "450 − 80 = 370. Posa `DrawRectangle(20, 370, 10, 80, WHITE);`"
      ],
      "success": "Perfecte, tocant a terra! Has fet servir les coordenades com un expert."
    },
    "tall": {
      "prompt": "Aquesta pala és massa petita per parar res. Fes-la el doble d'alta.",
      "hints": [
        "Mira les etiquetes grises: quin número diu alçada?",
        "L'alçada ara és 80. El doble de 80 és...",
        "Posa 160 a l'alçada: `DrawRectangle(20, 185, 10, 160, WHITE);`"
      ],
      "success": "Ara sí que és una pala de veritat! 💪"
    },
    "order": {
      "prompt": "Ups! Algú ha desordenat el codi i la pala de l'esquerra ha desaparegut. L'ordinador fa les instruccions d'una en una, de dalt a baix. Per què no es veu la pala? Arregla-ho.",
      "hints": [
        "ClearBackground pinta tota la pantalla de negre.",
        "Si primer dibuixes la pala i després ho pintes tot de negre, què queda?",
        "Posa la línia de `ClearBackground(BLACK);` a sobre de la del `DrawRectangle`."
      ],
      "success": "Exacte: l'ordre importa! Primer s'esborra la pantalla, després es dibuixa."
    },
    "ball": {
      "prompt": "Un Pong sense pilota no és un Pong! Dibuixa una pilota al mig de la pantalla amb `DrawCircle`. Comença a escriure Draw... i et sortiran ajudes.",
      "hints": [
        "El mig de la pantalla és la meitat de 800 i la meitat de 450.",
        "`DrawCircle` necessita x, y, radi i color. Un radi de 8 queda bé.",
        "Escriu a sota del comentari: `DrawCircle(400, 225, 8, YELLOW);`"
      ],
      "success": "Ja tenim pilota! La màquina comença a tenir bona pinta. 🏓"
    }
  },
  "checks": {
    "paddleMoved": "La pala de l'esquerra s'ha mogut",
    "paddleOnFloor": "La pala toca a terra",
    "paddleHeight80": "La pala fa 80 d'alt",
    "paddleTall": "La pala fa 160 d'alt",
    "paddleVisible": "La pala de l'esquerra es veu",
    "ballExists": "Hi ha una pilota",
    "ballCentered": "La pilota és al mig de la pantalla"
  }
}
```

- [ ] **Step 4: `content/pong/00-quadricula/lesson.ts` i `content/pong/index.ts`**

```ts
import { check, circles, visibleRects, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import ball from './ball.c?raw';
import ballSolution from './ball.solution.c?raw';
import floor from './floor.c?raw';
import floorSolution from './floor.solution.c?raw';
import observe from './observe.c?raw';
import observeSolution from './observe.solution.c?raw';
import order from './order.c?raw';
import orderSolution from './order.solution.c?raw';
import tall from './tall.c?raw';
import tallSolution from './tall.solution.c?raw';

const leftPaddle = (ctx: CheckContext) => visibleRects(ctx).find((r) => r.x === 20);

export const lesson0: Lesson = {
  id: 'pong-0',
  number: 0,
  texts,
  steps: [
    {
      kind: 'observe', id: 'observe', source: observe, solution: observeSolution,
      checks: [check('paddleMoved', (ctx) => (leftPaddle(ctx)?.y ?? 185) !== 185)],
    },
    { kind: 'explain', id: 'grid', card: 'grid' },
    {
      kind: 'practice', id: 'floor', source: floor, solution: floorSolution,
      checks: [
        check('paddleOnFloor', (ctx) => { const y = leftPaddle(ctx)?.y ?? -1; return y >= 365 && y <= 370; }),
        check('paddleHeight80', (ctx) => leftPaddle(ctx)?.h === 80),
      ],
    },
    {
      kind: 'practice', id: 'tall', source: tall, solution: tallSolution,
      checks: [check('paddleTall', (ctx) => leftPaddle(ctx)?.h === 160)],
    },
    {
      kind: 'practice', id: 'order', source: order, solution: orderSolution,
      checks: [check('paddleVisible', (ctx) => leftPaddle(ctx) !== undefined)],
    },
    {
      kind: 'apply', id: 'ball', source: ball, solution: ballSolution,
      checks: [
        check('ballExists', (ctx) => circles(ctx).length > 0),
        check('ballCentered', (ctx) => circles(ctx).some((c) => Math.hypot(c.x - 400, c.y - 225) <= 10)),
      ],
    },
  ],
};
```

`content/pong/index.ts`:
```ts
import type { Lesson } from '../../src/lessons/model';
import { lesson0 } from './00-quadricula/lesson';

export const LESSONS: Lesson[] = [lesson0];
```

- [ ] **Step 5: Tests i C real**

Run: `npx vitest run tests/content.test.ts && npx tsc --noEmit`
Expected: PASS (1 + 5×4 = 21 tests); `tsc` net.

Run: `for f in content/pong/00-quadricula/*.c; do /c/msys64/ucrt64/bin/gcc.exe -std=c99 -Wall -Werror -fsyntax-only "$f" || echo "FAIL $f"; done`
Expected: cap línia `FAIL`.

- [ ] **Step 6: Commit**

```bash
git add content/pong tests/content.test.ts
git commit -m "feat(content): lliçó 0 — la pantalla és una quadrícula"
```

---

### Task 7: Contingut de la lliçó 1

**Files:**
- Create: `content/pong/01-variables/{lesson.ts, ca.json, warmup.c, warmup.solution.c, observe.c, observe.solution.c, together.c, together.solution.c, height.c, height.solution.c, ball.c, ball.solution.c}`
- Modify: `content/pong/index.ts`
- Test: `tests/content.test.ts` (ja existent; cobreix la lliçó nova automàticament)

**Interfaces:**
- Consumes: `check`, `visibleRects`, `circles`, `variable`, `declares`, `callsOf`, `argIsVar` (Task 4); `Lesson` (Task 5)
- Produces: `lesson1`; `LESSONS = [lesson0, lesson1]`

- [ ] **Step 1: Afegir la lliçó a l'índex (el test falla)**

`content/pong/index.ts`:
```ts
import type { Lesson } from '../../src/lessons/model';
import { lesson0 } from './00-quadricula/lesson';
import { lesson1 } from './01-variables/lesson';

export const LESSONS: Lesson[] = [lesson0, lesson1];
```

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — no es pot resoldre `./01-variables/lesson`.

- [ ] **Step 2: Fitxers `.c` de la lliçó 1**

`warmup.c` / `warmup.solution.c`: idèntics a `content/pong/00-quadricula/observe.c`; la solució té la zona `        DrawRectangle(20, 100, 10, 80, WHITE);`.

`observe.c`:
```c
#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);
//@endfold

//@edit
    int palaY = 185;
//@end

//@fold bucle
    while (!WindowShouldClose())
    {
        BeginDrawing();
        ClearBackground(BLACK);
//@endfold
        DrawRectangle(20, palaY, 10, 80, WHITE);
        DrawRectangle(770, 185, 10, 80, WHITE);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
```
`observe.solution.c`: zona `    int palaY = 300;`.

`together.c`: igual que `observe.c` però la segona pala també fa servir la variable: `        DrawRectangle(770, palaY, 10, 80, WHITE);`. `together.solution.c`: zona `    int palaY = 60;`.

`height.c`: igual que `together.c` (zona `    int palaY = 185;` sense canvis possibles a l'alçada des de fora), però amb la zona moguda a les dues línies de dibuix:
```c
#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);

    int palaY = 185;

    while (!WindowShouldClose())
    {
        BeginDrawing();
        ClearBackground(BLACK);
//@endfold
//@edit
        DrawRectangle(20, palaY, 10, 80, WHITE);
        DrawRectangle(770, palaY, 10, 80, WHITE);
//@end
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
```
`height.solution.c`: zona
```c
        int alcada = 120;
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaY, 10, alcada, WHITE);
```

`ball.c`: igual que `height.c` però la zona és només la pilota, i les pales queden fora:
```c
//@endfold
        DrawRectangle(20, palaY, 10, 80, WHITE);
        DrawRectangle(770, palaY, 10, 80, WHITE);
//@edit
        DrawCircle(400, 225, 8, YELLOW);
//@end
        EndDrawing();
```
`ball.solution.c`: zona
```c
        int pilotaX = 400;
        int pilotaY = 225;
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
```

- [ ] **Step 3: `content/pong/01-variables/ca.json`**

```json
{
  "title": "Variables",
  "folds": {
    "preparar": "preparar el joc",
    "bucle": "començar a dibuixar cada frame",
    "tancar": "tancar el joc"
  },
  "steps": {
    "warmup": {
      "prompt": "Hola de nou! Per escalfar: posa la pala de l'esquerra a la y = 100.",
      "hints": [
        "La y és el segon número de `DrawRectangle`.",
        "Canvia el 185 per 100.",
        "`DrawRectangle(20, 100, 10, 80, WHITE);`"
      ],
      "success": "Com un rellotge! Ja domines les coordenades."
    },
    "observe": {
      "prompt": "Mira el codi: ara la pala no fa servir un número, fa servir `palaY`. Canvia el 185 de la línia groga per un 300, prem ▶ i mira la caixa palaY a la dreta, a sota del joc.",
      "hints": [
        "Només has de canviar el número de la línia groga.",
        "Fes doble clic al 185 i escriu 300.",
        "La línia ha de quedar `int palaY = 300;`"
      ],
      "success": "La caixa palaY ara guarda un 300, i la pala ha anat on diu la caixa!"
    },
    "box": {
      "prompt": "Una variable és com una caixa amb un nom escrit a fora. A dins hi guardes un valor. Quan el codi diu palaY, l'ordinador obre la caixa i fa servir el que hi ha a dins. La paraula int vol dir que a la caixa només hi caben nombres enters."
    },
    "together": {
      "prompt": "Ara totes dues pales fan servir la mateixa caixa, palaY. Fes que pugin totes dues fins a dalt de tot canviant un sol número.",
      "hints": [
        "Totes dues pales llegeixen la caixa palaY.",
        "Dalt de tot vol dir una y petita. Prova un número entre 0 i 100.",
        "Per exemple: `int palaY = 60;`"
      ],
      "success": "Un sol canvi i s'han mogut totes dues! Aquest és el superpoder de les variables. 🦸"
    },
    "height": {
      "prompt": "Les dues pales fan 80 d'alt i el número està repetit. Crea una variable alcada (sense accent!) amb el valor que vulguis i fes que totes dues pales la facin servir per a l'alçada.",
      "hints": [
        "Una variable es crea així: `int nom = valor;` Posa-la a dalt de la zona groga.",
        "Escriu `int alcada = 120;` i després canvia el 80 de cada pala per alcada.",
        "Ha de quedar: `int alcada = 120;` i dues línies amb `DrawRectangle(..., 10, alcada, WHITE);`"
      ],
      "success": "Ara, si vols pales més altes o més baixes, només canvies un número. Això és programar amb cap! 🧠"
    },
    "ball": {
      "prompt": "Últim repte: fes que la pilota guardi la seva posició en dues variables, pilotaX i pilotaY, i que DrawCircle les faci servir. La pilota s'ha de quedar al mig.",
      "hints": [
        "Necessites dues línies noves abans del `DrawCircle`, una per a cada variable.",
        "`int pilotaX = 400;` i `int pilotaY = 225;`",
        "Després: `DrawCircle(pilotaX, pilotaY, 8, YELLOW);`"
      ],
      "success": "Molt bé! Aviat aquestes variables canviaran soles i la pilota es mourà. Però això és la lliçó següent... 😉"
    }
  },
  "checks": {
    "paddleAt100": "La pala de l'esquerra és a la y = 100",
    "paddleMoved": "La pala de l'esquerra s'ha mogut",
    "bothTogether": "Les dues pales són a la mateixa altura",
    "bothMoved": "Les pales s'han mogut",
    "declaresHeight": "Has creat la variable alcada (int)",
    "bothUseHeight": "Les dues pales fan servir alcada per a l'alçada",
    "declaresBall": "Has creat les variables pilotaX i pilotaY (int)",
    "circleUsesVars": "DrawCircle fa servir pilotaX i pilotaY",
    "ballCentered": "La pilota és al mig de la pantalla"
  }
}
```

Nota: el pas d'explicació té l'id `box` i targeta `variable-box`.

- [ ] **Step 4: `content/pong/01-variables/lesson.ts`**

```ts
import { argIsVar, callsOf, check, circles, declares, visibleRects, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import ball from './ball.c?raw';
import ballSolution from './ball.solution.c?raw';
import height from './height.c?raw';
import heightSolution from './height.solution.c?raw';
import observe from './observe.c?raw';
import observeSolution from './observe.solution.c?raw';
import together from './together.c?raw';
import togetherSolution from './together.solution.c?raw';
import warmup from './warmup.c?raw';
import warmupSolution from './warmup.solution.c?raw';

const paddle = (ctx: CheckContext, x: number) => visibleRects(ctx).find((r) => r.x === x);

export const lesson1: Lesson = {
  id: 'pong-1',
  number: 1,
  texts,
  steps: [
    {
      kind: 'warmup', id: 'warmup', source: warmup, solution: warmupSolution,
      checks: [check('paddleAt100', (ctx) => paddle(ctx, 20)?.y === 100)],
    },
    {
      kind: 'observe', id: 'observe', source: observe, solution: observeSolution, showVariables: true,
      checks: [check('paddleMoved', (ctx) => (paddle(ctx, 20)?.y ?? 185) !== 185)],
    },
    { kind: 'explain', id: 'box', card: 'variable-box' },
    {
      kind: 'practice', id: 'together', source: together, solution: togetherSolution, showVariables: true,
      checks: [
        check('bothTogether', (ctx) => paddle(ctx, 20) !== undefined && paddle(ctx, 20)?.y === paddle(ctx, 770)?.y),
        check('bothMoved', (ctx) => (paddle(ctx, 20)?.y ?? 185) !== 185),
      ],
    },
    {
      kind: 'practice', id: 'height', source: height, solution: heightSolution, showVariables: true,
      checks: [
        check('declaresHeight', (ctx) => declares(ctx.program, 'alcada', 'int')),
        check('bothUseHeight', (ctx) => {
          const calls = callsOf(ctx.program, 'DrawRectangle');
          return calls.length === 2 && calls.every((c) => argIsVar(c, 3, 'alcada'));
        }),
      ],
    },
    {
      kind: 'apply', id: 'ball', source: ball, solution: ballSolution, showVariables: true,
      checks: [
        check('declaresBall', (ctx) => declares(ctx.program, 'pilotaX', 'int') && declares(ctx.program, 'pilotaY', 'int')),
        check('circleUsesVars', (ctx) => {
          const call = callsOf(ctx.program, 'DrawCircle')[0];
          return argIsVar(call, 0, 'pilotaX') && argIsVar(call, 1, 'pilotaY');
        }),
        check('ballCentered', (ctx) => circles(ctx).some((c) => Math.hypot(c.x - 400, c.y - 225) <= 10)),
      ],
    },
  ],
};
```

- [ ] **Step 5: Tests i C real**

Run: `npx vitest run tests/content.test.ts && npx tsc --noEmit`
Expected: PASS (2 + 10×4 = 42 tests); `tsc` net.

Run: `for f in content/pong/*/*.c; do /c/msys64/ucrt64/bin/gcc.exe -std=c99 -Wall -fsyntax-only "$f" || echo "FAIL $f"; done`
Expected: cap línia `FAIL`.

Nota: aquí sense `-Werror`, perquè els codis d'inici poden tenir variables que encara no es fan servir (per exemple, a mig exercici). La CI fa servir `-Werror`; si algun fitxer fallés per un avís, s'ha de corregir el fitxer, no la CI.

- [ ] **Step 6: Commit**

```bash
git add content/pong tests/content.test.ts
git commit -m "feat(content): lliçó 1 — variables"
```

---

### Task 8: Peces de l'editor (lògica sense pantalla)

**Files:**
- Create: `src/editor/paramHints.ts`, `src/editor/completions.ts`, `src/editor/zone.ts`, `src/editor/errorLine.ts`
- Test: `tests/editor.test.ts`

**Interfaces:**
- Consumes: `lex`, `LangError`, `HostSignature`, `paramNames`, `RaylibHost`
- Produces:
  - `computeParamHints(code: string, names: (fn: string) => string[] | undefined): { pos: number; label: string }[]` — etiqueta `"<nom>:"` a l'inici de cada argument; `[]` si el lexer falla.
  - `buildCompletions(host: HostSignature, names): Completion[]`, `declaredVariables(code: string): string[]`, `completionSource(base: Completion[]): (ctx: CompletionContext) => CompletionResult | null`
  - `zoneField: StateField<{ from: number; to: number }>`, `editableZone(zone): Extension` — rebutja qualsevol transacció que canviï text fora de la zona; la zona creix amb insercions als seus extrems.
  - `setErrorLine: StateEffectType<number | null>`, `errorLineField: StateField<DecorationSet>` — s'esborra sol quan canvia el document.

- [ ] **Step 1: Escriure el test que falla**

`tests/editor.test.ts`:
```ts
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { buildCompletions, completionSource, declaredVariables } from '../src/editor/completions';
import { errorLineField, setErrorLine } from '../src/editor/errorLine';
import { computeParamHints } from '../src/editor/paramHints';
import { editableZone, zoneField } from '../src/editor/zone';
import { paramNames } from '../src/i18n/i18n';
import { RaylibHost } from '../src/runtime/raylib';

describe('computeParamHints', () => {
  it('labels every argument of a known function', () => {
    const code = 'DrawRectangle(20, 185, 10, 80, WHITE);';
    const hints = computeParamHints(code, paramNames);
    expect(hints.map((h) => [code.slice(h.pos, h.pos + 2), h.label])).toEqual([
      ['20', 'x:'], ['18', 'y:'], ['10', 'amplada:'], ['80', 'alçada:'], ['WH', 'color:'],
    ]);
  });
  it('handles nested calls and several lines', () => {
    const code = 'int a = 1;\nDrawCircle(GetRandomValue(1, 6), 2, 3.5, RED);';
    expect(computeParamHints(code, paramNames).map((h) => h.label)).toEqual(['x:', 'mínim:', 'màxim:', 'y:', 'radi:', 'color:']);
  });
  it('copes with unfinished code', () => {
    expect(computeParamHints('DrawRectangle(20, ', paramNames).map((h) => h.label)).toEqual(['x:']);
    expect(computeParamHints('DrawText("hola, 1, 2);', paramNames)).toEqual([]);
    expect(computeParamHints('Inventada(1, 2);', paramNames)).toEqual([]);
  });
});

describe('completions', () => {
  const base = buildCompletions(new RaylibHost({ seed: 1 }), paramNames);
  it('offers raylib functions and constants', () => {
    expect(base.find((c) => c.label === 'DrawCircle')).toMatchObject({ type: 'function', detail: '(x, y, radi, color)' });
    expect(base.find((c) => c.label === 'YELLOW')).toMatchObject({ type: 'constant' });
  });
  it('finds declared variables', () => {
    expect(declaredVariables('int palaY = 1;\nfloat v = 2.0;\nColor c = RED;\nint x;')).toEqual(['palaY', 'v', 'c']);
  });
  it('completes the word before the cursor', () => {
    const doc = 'int palaY = 5;\nDraw';
    const state = EditorState.create({ doc });
    const result = completionSource(base)(new CompletionContext(state, doc.length, false));
    expect(result?.from).toBe(doc.length - 4);
    expect(result?.options.map((o) => o.label)).toEqual(expect.arrayContaining(['DrawCircle', 'palaY']));
  });
});

describe('editableZone', () => {
  const doc = 'AAA\nzone\nBBB\n';
  const make = () => EditorState.create({ doc, extensions: editableZone({ from: 4, to: 8 }) });

  it('accepts edits inside the zone', () => {
    const s = make().update({ changes: { from: 5, to: 7, insert: 'XYZ' } }).state;
    expect(s.doc.toString()).toBe('AAA\nzXYZe\nBBB\n');
    expect(s.field(zoneField)).toEqual({ from: 4, to: 9 });
  });

  it('rejects edits outside the zone, including select-all and paste across it', () => {
    expect(make().update({ changes: { from: 0, to: 1, insert: 'Q' } }).state.doc.toString()).toBe(doc);
    expect(make().update({ changes: { from: 0, to: doc.length, insert: 'hola' } }).state.doc.toString()).toBe(doc);
    expect(make().update({ changes: { from: 6, to: 10, insert: '!' } }).state.doc.toString()).toBe(doc);
  });

  it('grows when typing at its edges and survives being emptied', () => {
    let s = make().update({ changes: { from: 8, insert: '\nmore' } }).state;
    expect(s.doc.toString()).toBe('AAA\nzone\nmore\nBBB\n');
    s = s.update({ changes: { from: 4, insert: '>' } }).state;
    expect(s.field(zoneField)).toEqual({ from: 4, to: 14 });
    s = s.update({ changes: { from: 4, to: 14 } }).state;
    expect(s.doc.toString()).toBe('AAA\n\nBBB\n');
    s = s.update({ changes: { from: 4, insert: 'new' } }).state;
    expect(s.doc.toString()).toBe('AAA\nnew\nBBB\n');
  });
});

describe('errorLineField', () => {
  it('marks a line and clears it on the next edit', () => {
    let s = EditorState.create({ doc: 'a\nb\n', extensions: errorLineField });
    s = s.update({ effects: setErrorLine.of(2) }).state;
    expect(s.field(errorLineField).size).toBe(1);
    s = s.update({ changes: { from: 0, insert: 'x' } }).state;
    expect(s.field(errorLineField).size).toBe(0);
  });
});
```

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/editor.test.ts`
Expected: FAIL — no es pot resoldre `../src/editor/completions`.

- [ ] **Step 3: `src/editor/paramHints.ts`**

```ts
import { LangError } from '../lang/diagnostics';
import { lex } from '../lang/lexer';
import type { Token } from '../lang/tokens';

export interface ParamHint { pos: number; label: string }
interface Frame { params?: string[]; arg: number }

/** Where to show "x:", "y:"... inside calls of known functions. Unfinished code is fine; unlexable code gives []. */
export function computeParamHints(code: string, names: (fn: string) => string[] | undefined): ParamHint[] {
  let tokens: Token[];
  try {
    tokens = lex(code);
  } catch (e) {
    if (e instanceof LangError) return [];
    throw e;
  }
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const offset = (t: Token) => lineStarts[t.line - 1] + t.col - 1;

  const hints: ParamHint[] = [];
  const stack: Frame[] = [];
  let awaiting: Frame | null = null;
  tokens.forEach((t, i) => {
    if (t.kind === 'eof') return;
    const isSym = (s: string) => t.kind === 'sym' && t.text === s;
    if (awaiting && !isSym(')')) {
      const label = awaiting.params?.[awaiting.arg];
      if (label !== undefined) hints.push({ pos: offset(t), label: `${label}:` });
    }
    awaiting = null;
    if (isSym('(')) {
      const prev = tokens[i - 1];
      const params = prev?.kind === 'ident' ? names(prev.text) : undefined;
      const frame: Frame = { params, arg: 0 };
      stack.push(frame);
      if (params) awaiting = frame;
    } else if (isSym(')')) {
      stack.pop();
    } else if (isSym(',')) {
      const top = stack[stack.length - 1];
      if (top?.params) { top.arg++; awaiting = top; }
    }
  });
  return hints;
}
```

- [ ] **Step 4: `src/editor/completions.ts`**

```ts
import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { HostSignature } from '../lang/host';

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

export function buildCompletions(host: HostSignature, names: (fn: string) => string[] | undefined): Completion[] {
  const functions = Object.keys(host.functions).flatMap((fn): Completion[] => {
    if (fn === 'TextFormat') {
      return [snippetCompletion('TextFormat("%d", ${valor})', { label: 'TextFormat', type: 'function', detail: '("%d", valor)' })];
    }
    const params = names(fn);
    if (!params) return [];
    const fields = params.map((p) => '${' + plain(p) + '}').join(', ');
    return [snippetCompletion(`${fn}(${fields})`, { label: fn, type: 'function', detail: `(${params.join(', ')})` })];
  });
  const constants = Object.keys(host.constants).map((c): Completion => ({ label: c, type: 'constant' }));
  return [...functions, ...constants];
}

export function declaredVariables(code: string): string[] {
  return [...code.matchAll(/\b(?:int|float|bool|Color)\s+([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
}

export function completionSource(base: Completion[]) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/[A-Za-z_]\w*/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    const variables = declaredVariables(ctx.state.doc.toString()).map((v): Completion => ({ label: v, type: 'variable' }));
    return { from: word.from, options: [...variables, ...base], validFor: /^\w*$/ };
  };
}
```

- [ ] **Step 5: `src/editor/zone.ts` i `src/editor/errorLine.ts`**

`src/editor/zone.ts`:
```ts
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
```

`src/editor/errorLine.ts`:
```ts
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
```

- [ ] **Step 6: Tests**

Run: `npx vitest run tests/editor.test.ts && npx tsc --noEmit`
Expected: PASS (10 tests); `tsc` net.

- [ ] **Step 7: Commit**

```bash
git add src/editor tests/editor.test.ts
git commit -m "feat(editor): zona editable, etiquetes de paràmetre, autocompletat i línia d'error"
```

---

### Task 9: L'editor de lliçó muntat (CodeMirror)

**Files:**
- Create: `src/editor/editor.ts`
- Test: `tests/editor.test.ts` (afegir un test de construcció d'estat)

**Interfaces:**
- Consumes: Task 8 (`editableZone`, `zoneField`, `errorLineField`, `setErrorLine`, `computeParamHints`, `buildCompletions`, `completionSource`); `LessonSource` (Task 3); `paramNames`, `t` (Task 2); `RaylibHost`
- Produces:
  - `lessonExtensions(source: LessonSource, onChange: (code: string) => void): Extension[]` (tot menys els plecs, que necessiten la vista)
  - `interface LessonEditor { view: EditorView; setErrorLine(line: number | null): void; replaceZone(text: string): void; code(): string; destroy(): void }`
  - `createLessonEditor(opts: { parent: HTMLElement; source: LessonSource; foldLabel: (key: string, lines: number) => string; onChange: (code: string) => void }): LessonEditor`

- [ ] **Step 1: Escriure el test que falla**

Afegir a `tests/editor.test.ts`:
```ts
import { lessonExtensions } from '../src/editor/editor';
import { parseLessonSource } from '../src/lessons/source';

describe('lessonExtensions', () => {
  it('builds a state where only the lesson zone is editable and reports changes', () => {
    const source = parseLessonSource('int main(void) {\n//@edit\n    int x = 1;\n//@end\n    return 0;\n}\n');
    const seen: string[] = [];
    const state = EditorState.create({ doc: source.code, extensions: lessonExtensions(source, (c) => seen.push(c)) });
    const zoneStart = source.editable.from;
    expect(state.update({ changes: { from: 0, insert: '//' } }).state.doc.toString()).toBe(source.code);
    expect(state.update({ changes: { from: zoneStart + 12, to: zoneStart + 13, insert: '7' } }).state.doc.toString())
      .toContain('int x = 7;');
  });
});
```

(`onChange` es crida des d'un `updateListener`, que només s'executa amb una vista; aquest test només comprova que les extensions es combinen bé en un `EditorState`.)

- [ ] **Step 2: Veure'l fallar**

Run: `npx vitest run tests/editor.test.ts`
Expected: FAIL — no es pot resoldre `../src/editor/editor`.

- [ ] **Step 3: Implementar `src/editor/editor.ts`**

```ts
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { codeFolding, foldEffect } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
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
    setErrorLine: (line) => view.dispatch({ effects: setErrorLine.of(line) }),
    replaceZone: (text) => {
      const zone = view.state.field(zoneField);
      view.dispatch({ changes: { from: zone.from, to: zone.to, insert: text } });
    },
    code: () => view.state.doc.toString(),
    destroy: () => view.destroy(),
  };
}
```

Si `@codemirror/commands` o `@codemirror/language` no són accessibles com a dependència directa (venen amb `codemirror`), afegir-los amb `npm install @codemirror/commands @codemirror/language @codemirror/autocomplete @codemirror/state @codemirror/view` (mateixes versions que ja hi ha a `node_modules`).

- [ ] **Step 4: Tests**

Run: `npx vitest run tests/editor.test.ts && npx tsc --noEmit`
Expected: PASS (11 tests); `tsc` net.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(editor): editor de lliçó amb CodeMirror (plecs, ajudes i zona)"
```

---

### Task 10: Interfície Svelte

**Files:**
- Create: `src/app/route.ts`, `src/app/app.css`, `src/ui/{LessonScreen,BitBubble,RichText,CodePane,GamePane,VariablesPanel,ExplainCard,GridCard,VariableBoxCard}.svelte`
- Modify: `src/app/App.svelte`, `src/app/main.ts`
- Test: `tests/route.test.ts`

**Interfaces:**
- Consumes: `LESSONS` (Tasks 6–7); `LessonEngine` (Task 5); `isExercise` (Task 5); `parseLessonSource`, `zoneText` (Task 3); `createLessonEditor`, `LessonEditor` (Task 9); `Runner` (Task 1); `KeyboardInput`, `renderFrame` (pla anterior); `t`, `formatDiagnostic` (Task 2)
- Produces: `parseRoute(hash: string, lessonCount: number): { lesson: number; step: number }`, `routeHash(route): string`. En mode desenvolupament, `window.__bitArcade = { solve(): void; code(): string }` per a la prova al navegador (Task 11).

- [ ] **Step 1: Test de rutes (falla)**

`tests/route.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from '../src/app/route';

describe('routes', () => {
  it('reads lesson and step from the hash', () => {
    expect(parseRoute('#/pong/1/3', 2)).toEqual({ lesson: 1, step: 3 });
    expect(parseRoute('#/pong/1', 2)).toEqual({ lesson: 1, step: 0 });
  });
  it('falls back to the first lesson', () => {
    expect(parseRoute('', 2)).toEqual({ lesson: 0, step: 0 });
    expect(parseRoute('#/res', 2)).toEqual({ lesson: 0, step: 0 });
    expect(parseRoute('#/pong/9/1', 2)).toEqual({ lesson: 1, step: 1 });
  });
  it('writes the hash', () => {
    expect(routeHash({ lesson: 1, step: 2 })).toBe('#/pong/1/2');
  });
});
```

Run: `npx vitest run tests/route.test.ts`
Expected: FAIL — no es pot resoldre `../src/app/route`.

- [ ] **Step 2: `src/app/route.ts`**

```ts
export interface Route { lesson: number; step: number }

export function parseRoute(hash: string, lessonCount: number): Route {
  const m = /^#\/pong\/(\d+)(?:\/(\d+))?$/.exec(hash);
  if (!m) return { lesson: 0, step: 0 };
  return { lesson: Math.min(Number(m[1]), lessonCount - 1), step: Number(m[2] ?? 0) };
}

export function routeHash(route: Route): string {
  return `#/pong/${route.lesson}/${route.step}`;
}
```

Run: `npx vitest run tests/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: `src/app/App.svelte` i `src/app/main.ts`**

`src/app/main.ts`:
```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

mount(App, { target: document.getElementById('app')! });
```

`src/app/App.svelte`:
```svelte
<script lang="ts">
  import { LESSONS } from '../../content/pong';
  import LessonScreen from '../ui/LessonScreen.svelte';
  import { parseRoute } from './route';

  let route = $state(parseRoute(location.hash, LESSONS.length));

  $effect(() => {
    const onHash = () => (route = parseRoute(location.hash, LESSONS.length));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });
</script>

{#key `${route.lesson}/${route.step}`}
  <LessonScreen
    lesson={LESSONS[route.lesson]}
    lessonIndex={route.lesson}
    startStep={route.step}
    hasNextLesson={route.lesson < LESSONS.length - 1}
  />
{/key}
```

- [ ] **Step 4: `src/ui/RichText.svelte` i `src/ui/BitBubble.svelte`**

`src/ui/RichText.svelte` (els trossos entre `` ` `` es mostren com a codi):
```svelte
<script lang="ts">
  let { text }: { text: string } = $props();
  const parts = $derived(text.split('`'));
</script>

{#each parts as part, i}{#if i % 2 === 1}<code>{part}</code>{:else}{part}{/if}{/each}
```

`src/ui/BitBubble.svelte`:
```svelte
<script lang="ts">
  import { formatDiagnostic, t } from '../i18n/i18n';
  import type { Evaluation } from '../lessons/checks';
  import RichText from './RichText.svelte';

  let { prompt, hints, result, checkTexts, success }: {
    prompt: string;
    hints: string[];
    result: Evaluation | null;
    checkTexts: Record<string, string>;
    success?: string;
  } = $props();
</script>

<div class="bit">
  <div class="avatar" aria-hidden="true">🤖</div>
  <div class="bubble">
    <p><RichText text={prompt} /></p>
    {#each hints as hint, i}
      <p class="hint"><strong>{t('hintLabel', { n: i + 1 })}</strong> <RichText text={hint} /></p>
    {/each}
    {#if result}
      {#if result.kind === 'compile-error'}
        <p class="error">{t('compileErrorIntro', { line: result.diagnostic.line })} {formatDiagnostic(result.diagnostic)}</p>
      {:else if result.kind === 'runtime-error'}
        <p class="error">{t('runtimeErrorIntro', { line: result.diagnostic.line })} {formatDiagnostic(result.diagnostic)}</p>
      {:else if result.passed}
        <p class="success"><RichText text={success ?? t('success')} /></p>
      {:else}
        <p>{t('checksTitle')}</p>
        <ul class="checks">
          {#each result.results as r (r.key)}
            <li class:ok={r.ok}>{r.ok ? '✔' : '✘'} <RichText text={checkTexts[r.key] ?? r.key} /></li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</div>
```

- [ ] **Step 5: `src/ui/CodePane.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createLessonEditor, type LessonEditor } from '../editor/editor';
  import { t } from '../i18n/i18n';
  import type { LessonSource } from '../lessons/source';

  let { source, foldLabels, errorLine, onChange }: {
    source: LessonSource;
    foldLabels: Record<string, string>;
    errorLine: number | null;
    onChange: (code: string) => void;
  } = $props();

  let parent: HTMLDivElement;
  let editor: LessonEditor | null = null;

  onMount(() => {
    editor = createLessonEditor({
      parent,
      source,
      foldLabel: (key, lines) => t('foldLines', { lines, label: foldLabels[key] ?? key }),
      onChange,
    });
    return () => editor?.destroy();
  });

  $effect(() => {
    editor?.setErrorLine(errorLine);
  });

  export function replaceZone(text: string): void {
    editor?.replaceZone(text);
  }

  export function code(): string {
    return editor?.code() ?? '';
  }
</script>

<div class="code-pane" bind:this={parent}></div>
```

- [ ] **Step 6: `src/ui/GamePane.svelte` i `src/ui/VariablesPanel.svelte`**

`src/ui/GamePane.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/i18n';
  import type { VariableView } from '../lang/interpreter';
  import { renderFrame } from '../render/canvas';
  import { KeyboardInput } from '../runtime/keyboard';
  import { Runner } from '../runtime/runner';

  let { onVariables }: { onVariables: (variables: VariableView[]) => void } = $props();

  let canvas: HTMLCanvasElement;
  let runner: Runner | null = null;
  let mouse = $state<{ x: number; y: number } | null>(null);

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const keyboard = new KeyboardInput();
    const detach = keyboard.attach(canvas);
    runner = new Runner({
      scheduler: { request: (cb) => requestAnimationFrame(cb), cancel: (id) => cancelAnimationFrame(id) },
      input: keyboard,
      onFrame: (drawList, host) => {
        if (canvas.width !== host.width || canvas.height !== host.height) {
          canvas.width = host.width;
          canvas.height = host.height;
        }
        renderFrame(ctx, drawList);
        onVariables(runner?.variables() ?? []);
      },
      onStatus: () => {},
    });
    return () => {
      runner?.stop();
      detach();
    };
  });

  export function start(code: string): void {
    runner?.start(code);
  }

  export function stop(): void {
    runner?.stop();
  }

  function track(e: MouseEvent): void {
    const r = canvas.getBoundingClientRect();
    mouse = {
      x: Math.round(((e.clientX - r.left) * canvas.width) / r.width),
      y: Math.round(((e.clientY - r.top) * canvas.height) / r.height),
    };
  }
</script>

<div class="machine">
  <canvas bind:this={canvas} width="800" height="450" tabindex="0"
    onmousemove={track} onmouseleave={() => (mouse = null)}></canvas>
  {#if mouse}<span class="coords">{t('mouseCoords', mouse)}</span>{/if}
</div>
```

`src/ui/VariablesPanel.svelte`:
```svelte
<script lang="ts">
  import { t } from '../i18n/i18n';
  import type { VariableView } from '../lang/interpreter';

  let { variables }: { variables: VariableView[] } = $props();

  let previous = new Map<string, unknown>();
  let flashing = $state(new Set<string>());

  $effect(() => {
    const changed = new Set<string>();
    for (const v of variables) if (previous.has(v.name) && previous.get(v.name) !== v.value) changed.add(v.name);
    previous = new Map(variables.map((v) => [v.name, v.value]));
    if (changed.size === 0) return;
    flashing = changed;
    const timer = setTimeout(() => (flashing = new Set()), 600);
    return () => clearTimeout(timer);
  });

  const show = (v: VariableView) => (typeof v.value === 'object' ? 'Color' : String(v.value));
</script>

<section class="vars">
  <h3>{t('variablesTitle')}</h3>
  <div class="boxes">
    {#each variables as v (v.name)}
      <div class="box" class:flash={flashing.has(v.name)}>
        <span class="name">{v.name}</span>
        <span class="value">{show(v)}</span>
        <span class="type">{v.type}</span>
      </div>
    {/each}
  </div>
</section>
```

- [ ] **Step 7: Targetes d'explicació**

`src/ui/ExplainCard.svelte`:
```svelte
<script lang="ts">
  import GridCard from './GridCard.svelte';
  import VariableBoxCard from './VariableBoxCard.svelte';

  let { card }: { card: 'grid' | 'variable-box' } = $props();
</script>

<div class="explain">
  {#if card === 'grid'}<GridCard />{:else}<VariableBoxCard />{/if}
</div>
```

`src/ui/GridCard.svelte` (quadrícula 800×450 amb eixos; un punt que va recorrent coordenades i les mostra):
```svelte
<script lang="ts">
  const points = [{ x: 100, y: 80 }, { x: 600, y: 80 }, { x: 600, y: 350 }, { x: 100, y: 350 }];
  let i = $state(0);
  $effect(() => {
    const timer = setInterval(() => (i = (i + 1) % points.length), 1500);
    return () => clearInterval(timer);
  });
  const p = $derived(points[i]);
</script>

<svg viewBox="-40 -30 880 510" class="grid-card" role="img" aria-label="x, y">
  {#each Array.from({ length: 17 }, (_, k) => k * 50) as x}<line x1={x} y1="0" x2={x} y2="450" class="grid" />{/each}
  {#each Array.from({ length: 10 }, (_, k) => k * 50) as y}<line x1="0" y1={y} x2="800" y2={y} class="grid" />{/each}
  <rect x="0" y="0" width="800" height="450" class="frame" />
  <line x1="0" y1="-15" x2="780" y2="-15" class="axis" marker-end="url(#arrow)" />
  <text x="790" y="-10" class="axis-label">x</text>
  <line x1="-15" y1="0" x2="-15" y2="430" class="axis" marker-end="url(#arrow)" />
  <text x="-25" y="455" class="axis-label">y</text>
  <text x="4" y="16" class="origin">(0, 0)</text>
  <line x1={p.x} y1="0" x2={p.x} y2={p.y} class="guide" />
  <line x1="0" y1={p.y} x2={p.x} y2={p.y} class="guide" />
  <circle cx={p.x} cy={p.y} r="10" class="dot" />
  <text x={p.x + 16} y={p.y - 12} class="coord">({p.x}, {p.y})</text>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arrowhead" />
    </marker>
  </defs>
</svg>
```

`src/ui/VariableBoxCard.svelte` (una caixa "palaY" que canvia de valor i la pala que la segueix):
```svelte
<script lang="ts">
  const values = [185, 50, 300, 120];
  let i = $state(0);
  $effect(() => {
    const timer = setInterval(() => (i = (i + 1) % values.length), 1800);
    return () => clearInterval(timer);
  });
  const value = $derived(values[i]);
</script>

<svg viewBox="0 0 800 450" class="box-card" role="img" aria-label="palaY">
  <g transform="translate(120 150)">
    <rect width="220" height="150" rx="14" class="box" />
    <rect x="-10" y="-40" width="240" height="44" rx="8" class="lid" />
    <text x="110" y="-10" class="box-name">palaY</text>
    {#key value}<text x="110" y="95" class="box-value">{value}</text>{/key}
  </g>
  <line x1="350" y1="225" x2="560" y2={value + 40} class="link" />
  <rect x="580" y={value} width="10" height="80" class="paddle" />
  <text x="600" y={value + 45} class="paddle-label">y = {value}</text>
</svg>
```

- [ ] **Step 8: `src/ui/LessonScreen.svelte`**

```svelte
<script lang="ts">
  import { formatDiagnostic, t } from '../i18n/i18n';
  import type { VariableView } from '../lang/interpreter';
  import { LessonEngine } from '../lessons/engine';
  import { isExercise, type Lesson } from '../lessons/model';
  import { parseLessonSource, zoneText } from '../lessons/source';
  import { routeHash } from '../app/route';
  import BitBubble from './BitBubble.svelte';
  import CodePane from './CodePane.svelte';
  import ExplainCard from './ExplainCard.svelte';
  import GamePane from './GamePane.svelte';
  import VariablesPanel from './VariablesPanel.svelte';

  let { lesson, lessonIndex, startStep, hasNextLesson }: {
    lesson: Lesson;
    lessonIndex: number;
    startStep: number;
    hasNextLesson: boolean;
  } = $props();

  const engine = new LessonEngine(lesson, startStep);
  let version = $state(0);
  let resetCount = $state(0);
  let errorLine = $state<number | null>(null);
  let variables = $state<VariableView[]>([]);
  let game: ReturnType<typeof GamePane> | undefined = $state();
  let codePane: ReturnType<typeof CodePane> | undefined = $state();

  const view = $derived.by(() => {
    version;
    return {
      step: engine.step,
      index: engine.stepIndex,
      exercise: engine.exercise,
      texts: engine.texts,
      hints: engine.shownHints(),
      moreHints: engine.hasMoreHints,
      canContinue: engine.canContinue,
      isLast: engine.isLastStep,
    };
  });

  function changed(code: string): void {
    engine.setCode(code);
    errorLine = null;
  }

  function run(): void {
    const result = engine.run();
    version++;
    if (!result) return;
    if (result.kind === 'checked') {
      errorLine = null;
      game?.start(engine.exercise!.code);
    } else {
      errorLine = result.diagnostic.line;
      game?.stop();
    }
  }

  function hint(): void {
    engine.showHint();
    version++;
  }

  function reset(): void {
    engine.reset();
    errorLine = null;
    resetCount++;
    version++;
  }

  function next(): void {
    if (!engine.next()) return;
    game?.stop();
    variables = [];
    errorLine = null;
    history.replaceState(null, '', routeHash({ lesson: lessonIndex, step: engine.stepIndex }));
    version++;
  }

  function nextLesson(): void {
    location.hash = routeHash({ lesson: lessonIndex + 1, step: 0 });
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __bitArcade: unknown }).__bitArcade = {
      solve: () => {
        const step = engine.step;
        if (isExercise(step)) codePane?.replaceZone(zoneText(parseLessonSource(step.solution)));
      },
      code: () => codePane?.code() ?? '',
    };
  }
</script>

<div class="screen">
  <header class="top">
    <h1>{t('lessonTitle', { number: lesson.number, title: lesson.texts.title })}</h1>
    <span class="progress">{t('stepOf', { n: view.index + 1, total: lesson.steps.length })}</span>
  </header>

  <aside class="guide">
    <BitBubble prompt={view.texts.prompt} hints={view.hints} result={view.exercise?.result ?? null}
      checkTexts={lesson.texts.checks} success={view.texts.success} />
    {#if view.exercise}
      <div class="actions">
        <button onclick={hint} disabled={!view.moreHints}>{t('hint')}</button>
        <button onclick={reset}>{t('reset')}</button>
      </div>
      {#if view.exercise.done}
        <p class="stars" aria-label={t('starsLabel')}>{'⭐'.repeat(view.exercise.stars)}</p>
      {/if}
    {/if}
    {#if view.canContinue}
      {#if !view.isLast}
        <button class="primary" onclick={next}>{t('continue')}</button>
      {:else}
        <p class="done">{t('lessonDone')}</p>
        {#if hasNextLesson}
          <button class="primary" onclick={nextLesson}>{t('nextLesson')}</button>
        {:else}
          <p class="done">{t('allDone')}</p>
        {/if}
      {/if}
    {/if}
  </aside>

  <main class="code">
    {#if isExercise(view.step) && view.exercise}
      {#key `${view.step.id}/${resetCount}`}
        <CodePane bind:this={codePane} source={view.exercise.source} foldLabels={lesson.texts.folds}
          {errorLine} onChange={changed} />
      {/key}
      <button class="run" onclick={run}>{t('run')}</button>
    {:else if view.step.kind === 'explain'}
      <ExplainCard card={view.step.card} />
    {/if}
  </main>

  <section class="game">
    <GamePane bind:this={game} onVariables={(v) => (variables = v)} />
    {#if isExercise(view.step) && view.step.showVariables}
      <VariablesPanel {variables} />
    {/if}
  </section>
</div>
```

- [ ] **Step 9: `src/app/app.css`**

```css
:root {
  --bg: #0b0620;
  --panel: #140c33;
  --cyan: #39f3ff;
  --pink: #ff3ea5;
  --yellow: #ffe14d;
  --green: #7dff9a;
  --red: #ff8a8a;
  --text: #e8e6ff;
  --muted: #a9a3d6;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
code { font-family: ui-monospace, Consolas, monospace; background: #1d1446; padding: 0 4px; border-radius: 4px; }
button {
  background: transparent; color: var(--cyan); border: 2px solid var(--cyan); border-radius: 6px;
  padding: 6px 14px; font: inherit; cursor: pointer; box-shadow: 0 0 6px var(--cyan);
}
button:hover:not(:disabled) { background: rgba(57, 243, 255, 0.12); }
button:disabled { opacity: 0.4; cursor: default; box-shadow: none; }
button.primary { color: var(--yellow); border-color: var(--yellow); box-shadow: 0 0 8px var(--yellow); font-weight: 600; }

.screen {
  display: grid; height: 100vh; gap: 16px; padding: 12px 16px;
  grid-template-columns: minmax(260px, 1fr) minmax(420px, 1.6fr) minmax(380px, 1.3fr);
  grid-template-rows: auto 1fr;
  grid-template-areas: 'top top top' 'guide code game';
}
.top { grid-area: top; display: flex; align-items: baseline; gap: 16px; }
.top h1 { margin: 0; font-size: 20px; color: var(--pink); text-shadow: 0 0 8px var(--pink); }
.progress { color: var(--muted); }
.guide { grid-area: guide; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
.code { grid-area: code; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.game { grid-area: game; display: flex; flex-direction: column; gap: 12px; }

.bit { display: flex; gap: 10px; align-items: flex-start; }
.avatar { font-size: 34px; filter: drop-shadow(0 0 6px var(--pink)); }
.bubble { background: #1b1240; border: 2px solid var(--pink); border-radius: 12px; padding: 10px 14px; box-shadow: 0 0 8px var(--pink); line-height: 1.5; }
.bubble p { margin: 6px 0; }
.hint { color: var(--yellow); }
.error { color: var(--red); }
.success { color: var(--green); font-weight: 600; }
.checks { list-style: none; padding: 0; margin: 4px 0; }
.checks li { color: var(--red); }
.checks li.ok { color: var(--green); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.stars { font-size: 26px; margin: 0; }
.done { color: var(--green); font-weight: 600; }

.code-pane { flex: 1; min-height: 0; border: 2px solid #3a3358; border-radius: 8px; overflow: hidden; }
.code-pane .cm-editor { height: 100%; font-size: 15px; }
.code-pane .cm-zone { background: rgba(255, 225, 77, 0.12); }
.code-pane .cm-error-line { background: rgba(255, 80, 80, 0.25); text-decoration: underline wavy var(--red); }
.code-pane .cm-param-hint { color: #7d76a8; font-style: italic; font-size: 0.8em; margin-right: 2px; }
.code-pane .cm-lesson-fold { color: var(--muted); background: #1d1446; border-radius: 4px; padding: 0 8px; cursor: pointer; }
.run { align-self: flex-start; font-size: 18px; padding: 8px 22px; }

.machine { position: relative; padding: 10px; border: 3px solid var(--pink); border-radius: 12px; box-shadow: 0 0 14px var(--pink); }
.machine canvas { display: block; width: 100%; height: auto; background: #000; outline: none; }
.machine canvas:focus { box-shadow: 0 0 0 2px var(--yellow); }
.coords { position: absolute; right: 18px; bottom: 16px; background: rgba(0, 0, 0, 0.7); color: var(--yellow); font-family: ui-monospace, monospace; padding: 2px 8px; border-radius: 4px; pointer-events: none; }

.vars h3 { margin: 0 0 8px; color: var(--cyan); font-size: 16px; }
.boxes { display: flex; flex-wrap: wrap; gap: 10px; }
.box { display: flex; flex-direction: column; align-items: center; min-width: 90px; padding: 6px 12px; border: 2px solid var(--cyan); border-radius: 8px; box-shadow: 0 0 8px var(--cyan); transition: border-color 0.2s, box-shadow 0.2s; }
.box.flash { border-color: var(--yellow); box-shadow: 0 0 16px var(--yellow); }
.box .name { color: var(--muted); font-size: 12px; font-family: ui-monospace, monospace; }
.box .value { font-size: 22px; font-family: ui-monospace, monospace; }
.box .type { color: var(--muted); font-size: 11px; }

.explain { flex: 1; display: flex; align-items: center; justify-content: center; }
.explain svg { width: 100%; max-height: 100%; }
.grid-card .grid { stroke: #2a2056; stroke-width: 1; }
.grid-card .frame { fill: none; stroke: var(--cyan); stroke-width: 2; }
.grid-card .axis { stroke: var(--yellow); stroke-width: 3; }
.grid-card .arrowhead { fill: var(--yellow); }
.grid-card .axis-label { fill: var(--yellow); font-size: 28px; font-weight: 700; }
.grid-card .origin { fill: var(--muted); font-size: 18px; }
.grid-card .guide { stroke: var(--pink); stroke-dasharray: 6 6; transition: all 0.6s; }
.grid-card .dot { fill: var(--pink); transition: all 0.6s; }
.grid-card .coord { fill: var(--text); font-size: 26px; font-family: ui-monospace, monospace; transition: all 0.6s; }
.box-card .box { fill: #1d1446; stroke: var(--cyan); stroke-width: 4; }
.box-card .lid { fill: #2a1d5e; stroke: var(--cyan); stroke-width: 3; }
.box-card .box-name { fill: var(--muted); font-size: 26px; text-anchor: middle; font-family: ui-monospace, monospace; }
.box-card .box-value { fill: var(--yellow); font-size: 64px; text-anchor: middle; font-family: ui-monospace, monospace; animation: pop 0.4s; }
.box-card .link { stroke: var(--pink); stroke-dasharray: 8 8; transition: all 0.6s; }
.box-card .paddle { fill: #fff; transition: y 0.6s; }
.box-card .paddle-label { fill: var(--text); font-size: 22px; font-family: ui-monospace, monospace; transition: y 0.6s; }
@keyframes pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.box-card .box-value { transform-box: fill-box; transform-origin: center; }
```

- [ ] **Step 10: Typecheck, comprovació de Svelte, tests i build**

Run: `npx tsc --noEmit && npm run check && npx vitest run && npm run build`
Expected: `tsc` net; `svelte-check` amb 0 errors (els avisos `state_referenced_locally` per a `lesson`/`startStep` a `LessonScreen` són esperats: el component es recrea amb `{#key}` quan canvien); tots els tests PASS; build correcte.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(ui): pantalla de lliçó amb Bit, editor, joc, variables i targetes"
```

---

### Task 11: Prova al navegador (Edge)

**Files:**
- Create: `tests/e2e/lessons.mjs`

**Interfaces:**
- Consumes: servidor de desenvolupament de Vite (API `createServer`), `window.__bitArcade` (Task 10), Edge instal·lat (`channel: 'msedge'`)
- Produces: `npm run e2e` → surt amb codi 0 si tot passa, 1 si no; llista de PASS/FAIL per consola.

- [ ] **Step 1: Escriure la prova**

`tests/e2e/lessons.mjs`:
```js
// Plays both lessons in Edge against the dev server. Run: npm run e2e
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5181, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const code = () => page.evaluate(() => window.__bitArcade.code());
const button = (text) => page.getByRole('button', { name: text, exact: true });

async function runAndExpectSuccess(label) {
  await button('▶ Executa').click();
  const ok = await page.locator('.bubble .success').isVisible({ timeout: 3000 }).catch(() => false);
  check(`${label}: passes`, ok, ok ? '' : await page.locator('.bubble').innerText());
}

async function playLesson(lesson, steps) {
  for (const [i, kind] of steps.entries()) {
    const label = `lesson ${lesson} step ${i}`;
    if (kind === 'explain') {
      check(`${label}: explain card`, await page.locator('.explain svg').isVisible());
    } else if (kind === 'type185') {
      const before = await code();
      await page.locator('.cm-line').first().click();
      await page.keyboard.type('xx');
      check(`${label}: locked code cannot be edited`, (await code()) === before);
      await page.locator('.cm-zone span', { hasText: /^185$/ }).first().dblclick();
      await page.keyboard.type('50');
      await runAndExpectSuccess(label);
      check(`${label}: two stars without hints`, (await page.locator('.stars').innerText()).includes('⭐⭐'));
    } else {
      if (kind === 'hint') {
        await button('💡 Pista').click();
        check(`${label}: hint shown`, await page.locator('.bubble .hint').first().isVisible());
      }
      await page.evaluate(() => window.__bitArcade.solve());
      await runAndExpectSuccess(label);
      if (kind === 'vars') check(`${label}: variables panel`, await page.locator('.vars .box').first().isVisible());
    }
    const isLast = i === steps.length - 1;
    if (!isLast) await button('Continua →').click();
  }
}

await page.goto('http://localhost:5181/#/pong/0/0');
await page.locator('.cm-editor').waitFor();
check('fold placeholders shown', await page.locator('.cm-lesson-fold').first().isVisible());
check('parameter hints shown', (await page.locator('.cm-param-hint').allInnerTexts()).includes('alçada:'));

await playLesson(0, ['type185', 'explain', 'hint', 'solve', 'solve', 'solve']);
check('lesson 0 done', await page.getByText('Has acabat la lliçó!').isVisible());
await button('Següent lliçó →').click();
await page.locator('.cm-editor').waitFor();
await playLesson(1, ['solve', 'vars', 'explain', 'vars', 'vars', 'vars']);
check('all lessons done', await page.getByText('Has acabat totes les lliçons').isVisible());

// A compile error is explained and marked in the editor
await page.goto('http://localhost:5181/#/pong/0/0');
await page.reload();
await page.locator('.cm-editor').waitFor();
await page.locator('.cm-zone').first().click();
await page.keyboard.press('End');
await page.keyboard.press('Backspace');
await button('▶ Executa').click();
check('compile error explained', (await page.locator('.bubble .error').innerText()).includes('Falta un ;'));
check('error line marked', await page.locator('.cm-error-line').isVisible());

check('no page errors', errors.length === 0, errors.join(' | '));
console.log(results.join('\n'));
await browser.close();
await server.close();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
```

- [ ] **Step 2: Executar-la**

Run: `npm run e2e`
Expected: totes les línies `PASS` i codi de sortida 0. Si alguna falla, depurar la causa a la interfície (no a la prova) amb superpowers:systematic-debugging.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/lessons.mjs
git commit -m "test(e2e): les dues lliçons sencers al navegador amb Edge"
```

---

### Task 12: Publicació

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tot l'anterior; CI existent (`.github/workflows/ci.yml`)
- Produces: web publicada amb la pantalla de lliçó a `https://jrbayguade.github.io/arcade-raylib/` i la demo a `.../demo.html`

- [ ] **Step 1: README**

Substituir la secció `## Desenvolupament` de `README.md` per:
```markdown
## Desenvolupament

    npm install
    npm run dev      # servidor local (lliçons a /, demo del motor a /demo.html)
    npm test         # tests
    npm run check    # comprovació dels components Svelte
    npm run e2e      # les lliçons sencers al navegador (cal Microsoft Edge)
    npm run build    # versió per publicar (carpeta dist/)

Per anar directament a un pas: `#/pong/<lliçó>/<pas>` (per exemple `#/pong/1/3`).
```

- [ ] **Step 2: Verificació final i publicació**

Run: `npm test && npm run check && npm run build && npm run e2e`
Expected: tot correcte.

```bash
git add README.md
git commit -m "docs: com executar les lliçons i les proves"
git push
```

Run: `gh run watch <id de l'última execució> --exit-status`
Expected: `test`, `c-compat` i `deploy` amb `success`; `https://jrbayguade.github.io/arcade-raylib/` respon 200.
