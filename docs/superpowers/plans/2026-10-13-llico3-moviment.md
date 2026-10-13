# Lliçó 3 «La pilota es mou» + càmera lenta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pong lesson 3 (assignment + the 60 fps game loop: the ball moves by itself), a 🐢 slow-motion button on the machine, a "frame by frame" explanation card, and two beginner diagnostics.

**Architecture:**
- **Runtime:** the runtime's `FrameClock` gets a configurable rate, and `Runner` exposes `setSlow()` and `frameCount`.
- **Language:** the checker rejects shadowed declarations, and the parser explains `x + 3;`.
- **Content:** lesson 3 follows the existing lesson format (`content/pong/02-moviment/`, `lesson.ts` + `ca.json` + `.c` files with `//@edit`/`//@fold`/`//@placeholder` markers).

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest, playwright-core + Edge e2e (`npm run e2e`), gcc C99 for solutions in CI.

**Spec:** `docs/superpowers/specs/2026-10-13-llico3-moviment-design.md`

## Global Constraints

- **Language:**
  - Catalan UI and lesson text. Code identifiers have no accents or ç (`velX`, `pilotaX`).
  - Bit speaks in short pages; the last page is the mission.
- **Checks:**
  - Headless checks for lesson 3 run `run: { frames: 30 }`, with initial values `pilotaX = 400` and `pilotaY = 225`.
  - Every exercise has exactly 3 hints and a text for every check and fold (enforced by `tests/content.test.ts`).
  - The solution differs from the start file only inside the zone.
- **Solutions:** `*.solution.c` must compile with `gcc -std=c99 -Wall -Werror` (CI job `c-compat`).
- **Slow motion:**
  - Runs at 3 logic frames per second.
  - The state lives in the lesson screen session; it is not persisted.
  - The button must be ≥ 44 px tall on phones (`max-height: 560px`).
- **Commits:** end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Push to `main` deploys.

## Review Focus

1. **Slow motion toggled while nothing runs:** the TV static is shown, or the program has finished. Toggling must not throw. The next ▶ run must honour the current speed.
2. **Shadowing check vs. existing programs:** sibling scopes, e.g. two `for (int i…)` loops one after the other, must stay legal. Only an *outer* live variable counts.
3. **`x == 5;`** must still give `EXPECTED_ASSIGNMENT`; only arithmetic operators give `VALUE_NOT_STORED`.
4. **The frame counter** restarts at 1 on every ▶ run, and it is not shown on top of the TV static.
5. **The e2e lesson walk** ends at lesson 3: "Has acabat totes les lliçons" must only appear after lesson 3.

---

### Task 1: Slow frame clock and frame counter in the runtime

**Files:**
- Modify: `src/runtime/frameClock.ts`
- Modify: `src/runtime/runner.ts`
- Test: `tests/frameClock.test.ts`, `tests/runner.test.ts`

**Interfaces:**
- **Produces:**
  - `export const SLOW_FPS = 3`
  - `FrameClock.setFps(fps: number): void`
  - `Runner.setSlow(on: boolean): void`
  - `Runner.frameCount: number`. This is the count of logic frames run since the last `start()`; it is 0 before the first frame.

- [ ] **Step 1: Write the failing tests**

Append to `tests/frameClock.test.ts`, inside the `describe`:
```ts
  it('can run slowly, a few frames per second', () => {
    const clock = new FrameClock();
    clock.setFps(SLOW_FPS);
    let total = 0;
    for (let i = 0; i <= 60; i++) total += clock.tick((i * 1000) / 60);
    expect(total).toBeGreaterThanOrEqual(SLOW_FPS);
    expect(total).toBeLessThanOrEqual(SLOW_FPS + 1);
  });
```
Change the import to `import { FrameClock, MAX_FRAMES_PER_TICK, SLOW_FPS } from '../src/runtime/frameClock';`.

Append to `tests/runner.test.ts`, inside `describe('Runner'`:
```ts
  it('counts frames from each start', () => {
    const { runner, scheduler } = setup();
    runner.start(pong);
    for (let i = 0; i <= 30; i++) scheduler.fire((i * 1000) / 60);
    expect(runner.frameCount).toBeGreaterThanOrEqual(29);
    runner.start(pong);
    expect(runner.frameCount).toBe(0);
  });

  it('runs slowly when asked, also after a restart', () => {
    const { runner, scheduler, frames } = setup();
    runner.setSlow(true);
    runner.start(pong);
    for (let i = 0; i <= 60; i++) scheduler.fire((i * 1000) / 60);
    expect(frames.length).toBeLessThanOrEqual(4);
    runner.setSlow(false);
    const before = frames.length;
    for (let i = 61; i <= 121; i++) scheduler.fire((i * 1000) / 60);
    expect(frames.length - before).toBeGreaterThanOrEqual(55);
  });

  it('can switch speed while nothing runs', () => {
    const { runner } = setup();
    expect(() => runner.setSlow(true)).not.toThrow();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/frameClock.test.ts tests/runner.test.ts`

Expected: FAIL. `SLOW_FPS` is undefined, and `setSlow` / `frameCount` do not exist.

- [ ] **Step 3: Implement**

`src/runtime/frameClock.ts`:
```ts
export const FRAME_MS = 1000 / 60;
export const MAX_FRAMES_PER_TICK = 4;
/** Slow motion: few enough frames per second to watch a variable change one frame at a time. */
export const SLOW_FPS = 3;
const MAX_ELAPSED_MS = 250;

/** Converts display refreshes (requestAnimationFrame) into fixed-rate logic frames (60 per second unless slowed down). */
export class FrameClock {
  private last: number | null = null;
  private pending = 0;
  private frameMs = FRAME_MS;

  setFps(fps: number): void {
    this.frameMs = 1000 / fps;
    this.pending = 0;
  }

  tick(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    this.pending += Math.min(Math.max(now - this.last, 0), MAX_ELAPSED_MS);
    this.last = now;
    const frames = Math.floor(this.pending / this.frameMs + 1e-6);
    this.pending = Math.max(this.pending - frames * this.frameMs, 0);
    return Math.min(frames, MAX_FRAMES_PER_TICK);
  }
}
```

`src/runtime/runner.ts`:
- import `SLOW_FPS`;
- add the fields `private slow = false;` and `private frames = 0;`;
- add:
```ts
  /** Logic frames run since the last start (the "fotograma N" shown in slow motion). */
  get frameCount(): number {
    return this.frames;
  }

  setSlow(on: boolean): void {
    this.slow = on;
    this.clock.setFps(on ? SLOW_FPS : 60);
  }
```
- in `start()`, replace `this.clock = new FrameClock();` with:
```ts
    this.clock = new FrameClock();
    if (this.slow) this.clock.setFps(SLOW_FPS);
    this.frames = 0;
```
- in `tick()`, after `const r = machine.runFrame(...)`, add `this.frames++;`.
- in `halt()`, do not reset `frames`, so the counter is still readable after a stop.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/frameClock.test.ts tests/runner.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/runtime tests/frameClock.test.ts tests/runner.test.ts
git commit -m "Runtime: slow motion clock and frame counter"
```

### Task 2: Shadowed declarations are rejected

**Files:**
- Modify: `src/lang/checker.ts` (`case 'VarDecl'`)
- Test: `tests/checker.test.ts`

**Interfaces:**
- **Consumes:** the existing code `ALREADY_DECLARED`, with params `{ name, prevLine }`.
- **Produces:** a `VarDecl` whose name is live in *any* enclosing scope fails with `ALREADY_DECLARED`.

This reuses `ALREADY_DECLARED` instead of a new `SHADOWED_VAR`, because its text is already the message the spec asks for: "Ja hi ha una variable que es diu «{name}» (línia {prevLine}). Per canviar-ne el valor, no hi tornis a posar el tipus."

- [ ] **Step 1: Failing test**

In `tests/checker.test.ts`, next to `'reports duplicate declarations with the first line'`:
```ts
  it('rejects a declaration that hides a variable of an outer block', () => {
    expect(fails('int pilotaX = 400;\nwhile (1) { int pilotaX = pilotaX + 3; }')).toMatchObject({
      code: 'ALREADY_DECLARED', params: { name: 'pilotaX', prevLine: 2 },
    });
  });
  it('still allows the same name in sibling blocks', () => {
    expect(fails('for (int i = 0; i < 2; i++) { }\nfor (int i = 0; i < 2; i++) { }')).toBeUndefined();
  });
```
Check how `fails()` reports success in this file. If it returns `null` or throws on success, adapt the second assertion to the file's existing convention, e.g. use the helper the other "accepts …" tests use.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/checker.test.ts`

Expected: the first test FAILS (no error); the second passes.

- [ ] **Step 3: Implement**

In `case 'VarDecl'`, replace:
```ts
        const prev = scope.get(s.name);
```
with:
```ts
        // An outer variable counts too: `int x = x + 3;` inside the loop would make a new box every frame.
        const prev = this.lookup(s.name);
```

- [ ] **Step 4: Run the whole suite** (all lessons and the demo Pong must still compile)

Run: `npx vitest run`

Expected: PASS, with all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/lang/checker.ts tests/checker.test.ts
git commit -m "Checker: a declaration may not hide an outer variable"
```

### Task 3: `pilotaX + 3;` explains that the value was not stored

**Files:**
- Modify: `src/lang/diagnostics.ts` (add `'VALUE_NOT_STORED'` to the codes list, next to `'EXPECTED_ASSIGNMENT'`)
- Modify: `src/lang/parser.ts` (`parseSimple`)
- Modify: `src/i18n/ca.json` (diagnostic text)
- Test: `tests/parser.test.ts`

**Interfaces:**
- **Produces:** the diagnostic `VALUE_NOT_STORED` with params `{ name: string, expr: string }`, where `expr` is the token texts joined by single spaces.

- [ ] **Step 1: Failing test**

In `tests/parser.test.ts`, next to `'rejects statements that do nothing'`:
```ts
  it('explains a calculation that is not stored', () => {
    expect(parseError(main('pilotaX + 3;'))).toMatchObject({ code: 'VALUE_NOT_STORED', params: { name: 'pilotaX', expr: 'pilotaX + 3' } });
    expect(parseError(main('x == 5;'))).toMatchObject({ code: 'EXPECTED_ASSIGNMENT' });
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/parser.test.ts`

Expected: FAIL (`EXPECTED_ASSIGNMENT` instead of `VALUE_NOT_STORED`).

- [ ] **Step 3: Implement**

In `src/lang/parser.ts`:
- add `const ARITHMETIC = new Set(['+', '-', '*', '/', '%']);` next to `BITWISE`;
- in `parseSimple()`, record `const start = this.pos;` right after `const t = this.tok;`;
- right before `return this.fail(t, 'EXPECTED_ASSIGNMENT', ...)`, add:
```ts
    if (this.tok.kind === 'sym' && ARITHMETIC.has(this.tok.text)) {
      // `pilotaX + 3;` computes a value and throws it away: say so, and show how to keep it.
      this.pos = start;
      this.parseExpression();
      const expr = this.tokens.slice(start, this.pos).map((k) => k.text).join(' ');
      return this.fail(t, 'VALUE_NOT_STORED', { name: t.text, expr });
    }
```

In `src/i18n/ca.json`, in the diagnostics block next to `EXPECTED_ASSIGNMENT`:
```json
    "VALUE_NOT_STORED": "Has calculat «{expr}», però no l'has guardat a cap caixa. Per guardar-ho, escriu: «{name} = {expr};»",
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`

Expected: PASS. The i18n test that lists every code with a text also passes.

- [ ] **Step 5: Commit**

```bash
git add src/lang src/i18n/ca.json tests/parser.test.ts
git commit -m "Parser: explain a calculation that is not stored"
```

### Task 4: 🐢 slow-motion button on the machine

**Files:**
- Modify: `src/ui/GamePane.svelte` (prop `slow`, frame counter)
- Modify: `src/ui/LessonScreen.svelte` (state and button, in the cabinet)
- Modify: `src/i18n/ca.json` (UI keys)
- Modify: `src/app/app.css`
- Test: `tests/e2e/lessons.mjs` (added in Task 7, because lesson 3 must exist first; here, verify with lesson 2)

**Interfaces:**
- **Consumes:** `Runner.setSlow`, `Runner.frameCount` (Task 1).
- **Produces:**
  - the DOM button `.slow-btn` with `aria-pressed`, toggling the class `on`;
  - the counter `.frame-no`, whose text is "fotograma N", shown only while slow and not broken.

- [ ] **Step 1: i18n keys** (in the `ui` block of `src/i18n/ca.json`):
```json
    "slowMotion": "Càmera lenta",
    "frameNo": "fotograma {n}",
```

- [ ] **Step 2: GamePane**

Make these changes:
- add `slow` to the props: `let { broken, slow = false, onVariables, onError }: { broken: boolean; slow?: boolean; ... }`;
- add `let frameNo = $state(0);`;
- in `onFrame`, after `renderFrame(...)`, add `frameNo = runner?.frameCount ?? 0;`;
- after the `onMount`, add:
```ts
  // Bound to the toggle: applies now and to every later run.
  $effect(() => { runner?.setSlow(slow); });
```
`runner` is assigned in `onMount`, so the effect must also run after mount. To do that, make `runner` a `$state<Runner | null>(null)` or call `runner.setSlow(slow)` right after creating it in `onMount`; the second option is simpler and keeps `runner` non-reactive.

In the markup, after the coords span:
```svelte
  {#if slow && !broken && frameNo > 0}<span class="frame-no">{t('frameNo', { n: frameNo })}</span>{/if}
```
In `start()`, reset with `frameNo = 0;` before `runner?.start(code);`.

- [ ] **Step 3: LessonScreen**

Add `let slow = $state(false);`. Pass `{slow}` to `<GamePane … />`. Replace the variables block in the cabinet with:
```svelte
      {#if isExercise(view.step)}
        <div class="machine-row">
          <button class="slow-btn" class:on={slow} aria-pressed={slow} data-sound="page"
            title={t('slowMotion')} aria-label={t('slowMotion')} onclick={() => (slow = !slow)}>🐢</button>
          {#if view.step.showVariables}<VariablesPanel {variables} />{/if}
        </div>
      {/if}
```

- [ ] **Step 4: CSS** (`src/app/app.css`)

Add the following next to the `.vars` rules:
```css
.machine-row { display: flex; align-items: center; gap: 10px; }
.slow-btn { flex: none; font-size: 22px; line-height: 1; padding: 6px 10px; border-color: #3a3358; box-shadow: none; }
.slow-btn.on { border-color: var(--green); box-shadow: 0 0 12px var(--green); background: rgba(125, 255, 154, 0.12); }
.frame-no { position: absolute; left: 8px; top: 8px; z-index: 2; background: rgba(0, 0, 0, 0.7); color: var(--green); font: 700 14px ui-monospace, monospace; padding: 2px 8px; border-radius: 4px; pointer-events: none; }
```
Inside the `@media (max-height: 560px)` block, add:
```css
  .slow-btn { min-height: 44px; font-size: 18px; padding: 4px 8px; }
  .frame-no { font-size: 11px; }
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run check && npx vitest run && npm run e2e`

Expected:
- 0 errors and 0 warnings;
- all unit tests pass;
- e2e: all existing checks pass. The cabinet layout changed, so watch the "phone sideways" checks.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/i18n/ca.json src/app/app.css
git commit -m "Machine: 🐢 slow-motion button with frame counter"
```

### Task 5: The `frames` explanation card

**Files:**
- Create: `src/ui/FramesCard.svelte`
- Modify: `src/ui/ExplainCard.svelte`
- Modify: `src/lessons/model.ts` (`card: 'grid' | 'variable-box' | 'frames'`)
- Modify: `src/i18n/ca.json` (`framesRead`, `framesAdd`, `framesStore`, `framesLabel`)
- Modify: `src/app/app.css` (`.frames-card` rules)

**Interfaces:**
- **Produces:** `<ExplainCard card="frames" />` renders `svg.frames-card`.

- [ ] **Step 1: i18n** (in the `ui` block):
```json
    "framesRead": "1. llegeix {n}",
    "framesAdd": "2. suma 3",
    "framesStore": "3. guarda {n}",
    "framesLabel": "fotograma {n}",
```

- [ ] **Step 2: Card**

`src/ui/FramesCard.svelte`:
```svelte
<script lang="ts">
  import { t } from '../i18n/i18n';
  import { prefersReducedMotion } from './motion';

  // Three frames of the loop; in each one the line runs in three beats: read the box, add 3, store it back.
  const START = 400, STEP = 3, FRAMES = 3;
  const still = prefersReducedMotion();
  let tick = $state(still ? 4 : 0); // reduced motion: frame 2, "add" beat
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => (tick = (tick + 1) % (FRAMES * 3)), 900);
    return () => clearInterval(timer);
  });
  const frame = $derived(Math.floor(tick / 3));
  const beat = $derived(tick % 3);
  const before = $derived(START + frame * STEP);
  const inBox = $derived(beat === 2 ? before + STEP : before);
</script>

<svg viewBox="0 0 800 450" class="frames-card" role="img" aria-label="pilotaX = pilotaX + 3">
  {#each Array.from({ length: FRAMES }) as _, i (i)}
    <g transform="translate({40 + i * 250} 20)" class="film" class:now={i === frame}>
      <rect width="220" height="124" rx="8" class="film-frame" />
      <circle cx={60 + i * 40} cy="62" r="10" class="film-ball" />
      <text x="110" y="150" class="film-label">{t('framesLabel', { n: i + 1 })}</text>
    </g>
  {/each}
  <g transform="translate(60 230)">
    <rect width="200" height="130" rx="14" class="var-box" />
    <rect x="-10" y="-36" width="220" height="40" rx="8" class="lid" />
    <text x="100" y="-8" class="box-name">pilotaX</text>
    {#key inBox}<text x="100" y="88" class="box-value">{inBox}</text>{/key}
  </g>
  <text x="300" y="270" class="frames-code">pilotaX = pilotaX + 3;</text>
  <text x="300" y="330" class="beat" class:on={beat === 0}>{t('framesRead', { n: before })}</text>
  <text x="470" y="330" class="beat" class:on={beat === 1}>{t('framesAdd')}</text>
  <text x="600" y="330" class="beat" class:on={beat === 2}>{t('framesStore', { n: before + STEP })}</text>
</svg>
```

`ExplainCard.svelte`:
```svelte
<script lang="ts">
  import FramesCard from './FramesCard.svelte';
  import GridCard from './GridCard.svelte';
  import VariableBoxCard from './VariableBoxCard.svelte';

  let { card }: { card: 'grid' | 'variable-box' | 'frames' } = $props();
</script>

<div class="explain">
  {#if card === 'grid'}<GridCard />{:else if card === 'frames'}<FramesCard />{:else}<VariableBoxCard />{/if}
</div>
```
In `model.ts`, change to `export interface ExplainStep { kind: 'explain'; id: string; card: 'grid' | 'variable-box' | 'frames' }`.

- [ ] **Step 3: CSS** (next to the `.box-card` rules; it reuses `.var-box`, `.lid`, `.box-name` and `.box-value` by also giving the card the `box-card` look):
```css
.frames-card .var-box, .frames-card .lid { fill: #1d1446; stroke: var(--cyan); stroke-width: 4; }
.frames-card .lid { fill: #2a1d5e; stroke-width: 3; }
.frames-card .box-name { fill: var(--muted); font-size: 24px; text-anchor: middle; font-family: ui-monospace, monospace; }
.frames-card .box-value { fill: var(--yellow); font-size: 58px; text-anchor: middle; font-family: ui-monospace, monospace; animation: pop 0.4s; transform-box: fill-box; transform-origin: center; }
.frames-card .film-frame { fill: #000; stroke: #3a3358; stroke-width: 3; }
.frames-card .film.now .film-frame { stroke: var(--pink); filter: drop-shadow(0 0 6px var(--pink)); }
.frames-card .film-ball { fill: #fdf900; }
.frames-card .film-label { fill: var(--muted); font-size: 18px; text-anchor: middle; font-family: ui-monospace, monospace; }
.frames-card .film.now .film-label { fill: var(--pink); }
.frames-card .frames-code { fill: var(--text); font-size: 30px; font-family: ui-monospace, monospace; }
.frames-card .beat { fill: #5a5380; font-size: 22px; font-family: ui-monospace, monospace; transition: fill 0.2s; }
.frames-card .beat.on { fill: var(--yellow); }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run check && npx vitest run`

Expected: 0 errors, and PASS. The card is used and checked by e2e in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/lessons/model.ts src/i18n/ca.json src/app/app.css
git commit -m "Explain card: the game loop frame by frame"
```

### Task 6: Lesson 3 content

**Files:**
- Create in `content/pong/02-moviment/`:
  - `lesson.ts` and `ca.json`;
  - `crawl.c`, `crawl.solution.c`;
  - `diagonal.c`, `diagonal.solution.c`;
  - `left.c`, `left.solution.c`;
  - `speed.c`, `speed.solution.c`.
- Modify: `content/pong/index.ts`
- Test: create `tests/lesson3.test.ts`. `tests/content.test.ts` covers the generic rules automatically.

**Interfaces:**
- **Consumes:**
  - `check`, `circles`, `declares`, `variable` from `src/lessons/checks`;
  - `replaceZone`, `parseLessonSource` from `src/lessons/source`;
  - `ExplainStep.card: 'frames'` (Task 5);
  - the diagnostics from Tasks 2 and 3.
- **Produces:** `export const lesson2: Lesson`, with `id: 'pong-2'`, `number: 3`. It is registered as `LESSONS = [lesson0, lesson1, lesson2]`, so its route is `#/pong/2/<step>`.

- [ ] **Step 1: Failing test** (`tests/lesson3.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { lesson2 } from '../content/pong/02-moviment/lesson';
import { evaluate } from '../src/lessons/checks';
import { isExercise, type ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson2.steps.find((s) => s.id === id) as ExerciseStep;
/** Runs the start file of a step with its zone replaced by `zone`. */
function tryZone(id: string, zone: string) {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
}
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);

describe('lesson 3: the ball moves', () => {
  it('is lesson number 3, with a frames card', () => {
    expect(lesson2.number).toBe(3);
    expect(lesson2.steps.map((s) => s.id)).toEqual(['crawl', 'frames', 'diagonal', 'left', 'speed']);
    expect(lesson2.steps[1]).toMatchObject({ kind: 'explain', card: 'frames' });
    for (const s of lesson2.steps.filter(isExercise)) expect(s.run).toEqual({ frames: 30 });
  });

  it('crawl: storing a number instead of adding it leaves the ball still', () => {
    expect(firstFailing(tryZone('crawl', '        pilotaX = 3;'))).toBe('faster');
    expect(firstFailing(tryZone('crawl', '        pilotaX =+ 3;'))).toBe('faster');
  });

  it('crawl: too fast to see is not accepted', () => {
    expect(firstFailing(tryZone('crawl', '        pilotaX = pilotaX + 50;'))).toBe('notTooFast');
  });

  it('crawl: a calculation that is not stored is explained', () => {
    expect(tryZone('crawl', '        pilotaX + 3;')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'VALUE_NOT_STORED' } });
  });

  it('crawl: a new box inside the loop is explained', () => {
    expect(tryZone('crawl', '        int pilotaX = pilotaX + 3;')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'ALREADY_DECLARED' } });
  });

  it('diagonal: the ball must also keep going right', () => {
    expect(firstFailing(tryZone('diagonal', '        pilotaY = pilotaY + 2;'))).toBe('xStillMoves');
    expect(tryZone('diagonal', '        pilotaX = pilotaX + 3;\n        pilotaY = pilotaY + 5;')).toMatchObject({ passed: true });
  });

  it('left: any leftward speed works', () => {
    expect(tryZone('left', '        pilotaX = pilotaX - 1;')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('left', '        pilotaX = pilotaX + 0;'))).toBe('goesLeft');
  });

  it('speed: velX must exist, be non-zero and move the ball', () => {
    const decls = '    int palaY = 185;\n    int alcada = 80;\n    int pilotaX = 400;\n    int pilotaY = 225;\n';
    expect(tryZone('speed', decls + '    int velX = 0;')).toMatchObject({ kind: 'checked', passed: false });
    expect(firstFailing(tryZone('speed', decls + '    int velX = 0;'))).toBe('speedNotZero');
    expect(tryZone('speed', decls + '    int velX = -4;')).toMatchObject({ passed: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lesson3.test.ts`

Expected: FAIL (cannot resolve `../content/pong/02-moviment/lesson`).

- [ ] **Step 3: Exercise files**

`content/pong/02-moviment/crawl.c` is the shared template. Only the zone differs between steps:
```c
#include "raylib.h"
//@fold preparar
int main(void)
{
    InitWindow(800, 450, "Pong");
    SetTargetFPS(60);
//@endfold

    int palaY = 185;
    int alcada = 80;
    int pilotaX = 400;
    int pilotaY = 225;

    while (!WindowShouldClose())
    {
//@edit
        pilotaX = pilotaX + 1;
//@end

//@fold dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaY, 10, alcada, WHITE);
//@endfold
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
```
For each file, copy the template and change only the zone:
- `crawl.solution.c`: `        pilotaX = pilotaX + 5;`
- `diagonal.c`: `        pilotaX = pilotaX + 3;` plus the line `//@placeholder fes baixar la pilota: pilotaY`
- `diagonal.solution.c`: `        pilotaX = pilotaX + 3;` plus `        pilotaY = pilotaY + 2;`
- `left.c`: `        pilotaX = pilotaX + 3;`
- `left.solution.c`: `        pilotaX = pilotaX - 3;`

`speed.c` moves the zone up to the declarations, and the loop uses `velX`:
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
    int alcada = 80;
    int pilotaX = 400;
    int pilotaY = 225;
//@placeholder crea aquí la caixa velX
//@end

    while (!WindowShouldClose())
    {
        pilotaX = pilotaX + velX;

//@fold dibuixar
        BeginDrawing();
        ClearBackground(BLACK);
        DrawRectangle(20, palaY, 10, alcada, WHITE);
        DrawRectangle(770, palaY, 10, alcada, WHITE);
//@endfold
        DrawCircle(pilotaX, pilotaY, 8, YELLOW);
        EndDrawing();
//@fold tancar
    }

    CloseWindow();
    return 0;
}
//@endfold
```
`speed.solution.c` is the same, with the placeholder line replaced by `    int velX = 4;`.

- [ ] **Step 4: `lesson.ts`**

```ts
import { check, circles, declares, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import crawl from './crawl.c?raw';
import crawlSolution from './crawl.solution.c?raw';
import diagonal from './diagonal.c?raw';
import diagonalSolution from './diagonal.solution.c?raw';
import left from './left.c?raw';
import leftSolution from './left.solution.c?raw';
import speed from './speed.c?raw';
import speedSolution from './speed.solution.c?raw';

/** Checks run 30 frames; the ball starts at (400, 225). */
const FRAMES = 30;
const run = { frames: FRAMES };
const x = (ctx: CheckContext) => variable(ctx, 'pilotaX') ?? 400;
const y = (ctx: CheckContext) => variable(ctx, 'pilotaY') ?? 225;

export const lesson2: Lesson = {
  id: 'pong-2',
  number: 3,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'crawl', source: crawl, solution: crawlSolution, showVariables: true, run,
      checks: [
        check('faster', (ctx) => x(ctx) >= 400 + FRAMES * 2),
        check('notTooFast', (ctx) => x(ctx) <= 400 + FRAMES * 20),
        check('ballFollows', (ctx) => circles(ctx).some((c) => c.x === x(ctx) && c.y === y(ctx))),
      ],
    },
    { kind: 'explain', id: 'frames', card: 'frames' },
    {
      kind: 'practice', id: 'diagonal', source: diagonal, solution: diagonalSolution, showVariables: true, run,
      checks: [
        check('yMoves', (ctx) => y(ctx) > 225),
        check('xStillMoves', (ctx) => x(ctx) === 400 + FRAMES * 3),
      ],
    },
    {
      kind: 'practice', id: 'left', source: left, solution: leftSolution, showVariables: true, run,
      checks: [check('goesLeft', (ctx) => x(ctx) <= 400 - FRAMES)],
    },
    {
      kind: 'apply', id: 'speed', source: speed, solution: speedSolution, showVariables: true, run,
      checks: [
        check('declaresSpeed', (ctx) => declares(ctx.program, 'velX', 'int')),
        check('speedNotZero', (ctx) => (variable(ctx, 'velX') ?? 0) !== 0),
        check('usesSpeed', (ctx) => x(ctx) === 400 + FRAMES * (variable(ctx, 'velX') ?? 0)),
      ],
    },
  ],
};
```
Before relying on them, verify that `circles()` returns commands with `x`/`y` fields by reading `src/runtime/drawList.ts`. If the field names differ (e.g. `cx`), use those names.

- [ ] **Step 5: `ca.json`**

```json
{
  "title": "La pilota es mou",
  "folds": {
    "preparar": "preparar el joc",
    "dibuixar": "comença a dibuixar: fons i pales",
    "tancar": "tancar el joc"
  },
  "steps": {
    "crawl": {
      "prompt": [
        "Lliçó nova! Fins ara tot estava quiet. Avui la pilota es mourà sola. 🏃",
        "Mira el codi: hi ha un `while`. Tot el que hi ha a dins es repeteix 60 vegades cada segon. Cada volta és un fotograma, com els dibuixos d'una pel·lícula.",
        "La línia groga, `pilotaX = pilotaX + 1;`, suma 1 a la caixa `pilotaX` a cada fotograma. Per això la pilota s'arrossega cap a la dreta.",
        "Prem 🐢, a sota del joc, per veure-ho a càmera lenta: mira com puja el número de la caixa.",
        "Fes que la pilota corri més: canvia l'1 per un 5 i prem ▶ Executa."
      ],
      "hints": [
        "El número que diu quant avança és el que va després del +.",
        "Canvia l'1 per un 5.",
        "`pilotaX = pilotaX + 5;`"
      ],
      "success": "Se n'ha anat volant! Tranquil: a la lliçó 6 la farem rebotar. Prem ▶ Executa i tornarà a sortir del mig."
    },
    "frames": {
      "prompt": [
        "Com pot ser que `pilotaX = pilotaX + 3;` sigui veritat? A mates seria impossible!",
        "És que aquí el = no vol dir «igual». Vol dir «guarda-hi».",
        "L'ordinador ho fa en tres passos: llegeix la caixa (400), hi suma 3 (403) i ho guarda a la mateixa caixa.",
        "Al fotograma següent torna a començar: llegeix 403, suma 3, guarda 406… i així 60 vegades cada segon! Quan ho tinguis clar, prem Continua."
      ]
    },
    "diagonal": {
      "prompt": [
        "Ara la pilota va cap a la dreta. Fem que també baixi!",
        "Recorda la quadrícula: més avall vol dir una y més gran.",
        "A la línia buida de la zona groga, fes que `pilotaY` també creixi a cada fotograma."
      ],
      "hints": [
        "Copia la idea de la línia de `pilotaX`, però amb `pilotaY`.",
        "Has de guardar a `pilotaY` el que ja hi ha a `pilotaY`, més 2.",
        "`pilotaY = pilotaY + 2;`"
      ],
      "success": "En diagonal! Ja sembla un Pong de debò. 🎾"
    },
    "left": {
      "prompt": [
        "I si la vull cap a l'esquerra?",
        "A l'esquerra, la x és més petita. Fes que la pilota vagi cap a l'esquerra canviant només un signe."
      ],
      "hints": [
        "Ara a cada fotograma hi sumes 3. Què has de fer perquè la x es faci més petita?",
        "Canvia el + per un -.",
        "`pilotaX = pilotaX - 3;`"
      ],
      "success": "Cap a l'esquerra! Sumar la fa anar a la dreta, i restar, a l'esquerra."
    },
    "speed": {
      "prompt": [
        "Darrer repte! Ara el bucle diu `pilotaX = pilotaX + velX;`… però la caixa `velX` no existeix. Per això la màquina fa neu.",
        "`velX` serà la velocitat de la pilota: quants píxels avança a cada fotograma.",
        "Crea la caixa `velX` a la zona groga, amb el valor que vulguis (prova un 4)."
      ],
      "hints": [
        "Fes-ho igual que les altres caixes: `int nom = valor;`",
        "El nom és `velX` i el valor, un número que no sigui 0.",
        "`int velX = 4;`"
      ],
      "success": "Perfecte! I si hi poses un número negatiu, com -4, anirà cap a l'esquerra. A la lliçó 6 la farem rebotar només canviant el signe de `velX`. 😉"
    }
  },
  "checks": {
    "faster": "la pilota no corre prou. `pilotaX = pilotaX + 5;` agafa la caixa i hi suma 5. Si escrius només `pilotaX = 5;`, la pilota es queda quieta.",
    "notTooFast": "va tan ràpid que ni es veu! Prova un número entre 2 i 20.",
    "ballFollows": "la pilota s'ha de dibuixar a `pilotaX` i `pilotaY`.",
    "yMoves": "la pilota encara no baixa. Afegeix una línia que sumi alguna cosa a `pilotaY`.",
    "xStillMoves": "la pilota també ha de continuar anant cap a la dreta: deixa la línia de `pilotaX` com estava.",
    "goesLeft": "la pilota encara no va cap a l'esquerra. Per anar a l'esquerra, la x s'ha de fer més petita: resta en lloc de sumar.",
    "declaresSpeed": "falta crear la caixa `velX`, per exemple `int velX = 4;`",
    "speedNotZero": "amb `velX` igual a 0, la pilota no es mou! Posa-hi un altre número.",
    "usesSpeed": "la pilota ha d'avançar `velX` píxels a cada fotograma."
  }
}
```
Before writing, compare the keys with the lesson 2 `ca.json` (`title`, `folds`, `steps`, `checks`) and match its structure exactly.

- [ ] **Step 6: Register**

In `content/pong/index.ts`, set `import { lesson2 } from './02-moviment/lesson';` and `export const LESSONS: Lesson[] = [lesson0, lesson1, lesson2];`.

- [ ] **Step 7: Run tests and gcc**

Run: `npx vitest run && for f in content/pong/02-moviment/*.solution.c; do /c/msys64/ucrt64/bin/gcc.exe -std=c99 -Wall -Werror -fsyntax-only "$f" || echo "FAIL $f"; done`

Expected:
- all tests pass, including `tests/content.test.ts` for `pong-2` and `tests/lesson3.test.ts`;
- no `FAIL` lines.

If gcc reports a missing `raylib.h`, pass `-I` with the same include directory CI uses (see `.github/workflows/ci.yml`).

- [ ] **Step 8: Commit**

```bash
git add content/pong tests/lesson3.test.ts
git commit -m "Lesson 3: the ball moves"
```

### Task 7: End-to-end checks, verify, ship

**Files:**
- Modify: `tests/e2e/lessons.mjs`

- [ ] **Step 1: Lesson walk continues into lesson 3**

Replace:
```js
  await playLesson(1, ['solve', 'vars', 'explain', 'vars', 'vars', 'vars']);
  check('all lessons done', await visible(page.getByText('Has acabat totes les lliçons')));
```
with:
```js
  await playLesson(1, ['solve', 'vars', 'explain', 'vars', 'vars', 'vars']);
  check('lesson 2 done', await visible(page.getByText('Has acabat la lliçó!')));
  await button('Següent lliçó →').click();
  check('lesson 3 shown', await visible(page.getByRole('heading', { name: /lliçó 3/ })));
  await page.locator('.cm-editor').waitFor();
  await playLesson(2, ['vars', 'explain', 'vars', 'vars', 'vars']);
  check('all lessons done', await visible(page.getByText('Has acabat totes les lliçons')));
```
Read `playLesson` first. If its `explain` branch asserts on the grid card (the `grid label matches the dot` check), guard that check with `if (await page.locator('.grid-card').count())` so the frames card passes. Add:
```js
          if (await page.locator('.frames-card').count()) check(`${label}: frames card shows the box`, await visible(page.locator('.frames-card .box-value')));
```

- [ ] **Step 2: Slow motion and the TV static on `speed`**

After the "broken starting code shows TV static" block, add:
```js
  // 🐢 slows the game down and shows the frame number
  await page.goto(`${base}#/pong/2/0`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('no frame counter at full speed', (await page.locator('.frame-no').count()) === 0);
  await page.locator('.slow-btn').click();
  check('🐢 shows the frame number', await visible(page.locator('.frame-no')));
  const frameAt = async () => Number((await page.locator('.frame-no').innerText()).replace(/\D/g, ''));
  const f1 = await frameAt();
  await page.waitForTimeout(1000);
  const f2 = await frameAt();
  check('🐢 runs about 3 frames per second', f2 - f1 >= 1 && f2 - f1 <= 5, `${f1} → ${f2}`);
  await button('▶ Executa').click();
  check('▶ restarts the frame count in slow motion', (await frameAt()) <= 3);
  await page.locator('.slow-btn').click();
  check('🐢 again goes back to full speed', (await page.locator('.frame-no').count()) === 0);
  await page.goto(`${base}#/pong/2/4`);
  await page.reload();
  await page.locator('.cm-editor').waitFor();
  check('lesson 3 speed step starts with TV static', await visible(page.locator('.cabinet .tv-static')));
  check('lesson 3 speed step shows the velX ghost', await visible(page.locator('.cm-ghost', { hasText: 'velX' })));
```

- [ ] **Step 3: Phone: the 🐢 button is thumb-sized**

In the phone-sideways block, after the `buttons are at least 44 px tall` check, add:
```js
      const slowBox = await phone.locator('.slow-btn').boundingBox();
      check('phone sideways: 🐢 is at least 44 px tall', slowBox !== null && slowBox.height >= 44);
```

- [ ] **Step 4: Full verification (twice for e2e)**

Run: `npx vitest run && npx tsc --noEmit && npm run check && npm run e2e && npm run e2e && npm run build`

Expected:
- all unit tests pass;
- 0 type and svelte errors;
- e2e: every check PASSes in both runs;
- the build succeeds.

- [ ] **Step 5: Commit, push, watch CI**

```bash
git add tests/e2e/lessons.mjs
git commit -m "e2e: lesson 3 and slow motion"
git push origin main
"/c/Program Files/GitHub CLI/gh.exe" run watch $("/c/Program Files/GitHub CLI/gh.exe" run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```
Expected: CI green (`test`, `c-compat`, `deploy`).

- [ ] **Step 6: UI review loop**

Dispatch a UI-reviewer subagent on the live site to review lesson 3 and 🐢 at 1920×1080, 1366×768 and phone 844×390 touch. Fix any blocker or important finding, and re-review until the verdict is "ship as is".

---

## Review amendments (binding — override the tasks above where they differ)

Three reviewers checked the plan before execution: an engineer, a teacher and QA. These amendments were auto-approved.

**Task 1**
- Count only real frames: `if (r.status === 'frame') { this.frames++; last = r.drawList; continue; }`.

**Task 2**
- *Blocker:* the existing test `tests/checker.test.ts` "allows shadowing in an inner block and scopes for-variables" must become "scopes inner blocks and for-variables", using `ok('int x = 1;\n{ int y = 2; }\nfor (int i = 0; i < 3; i++) { x += i; }\nint i = 9;')`.
- Sibling blocks test: `expect(() => ok('for (int i = 0; i < 2; i++) { }\nfor (int i = 0; i < 2; i++) { }')).not.toThrow();`.
- Ruling: reuse `ALREADY_DECLARED` instead of a new `SHADOWED_VAR`. Its Catalan text already says "no hi tornis a posar el tipus". Cost if wrong: one new code plus text.

**Task 3**
- The text goes in the `errors` block of `src/i18n/ca.json`, not "diagnostics".
- Ruling: `expr` stays a token join. Rare oddities like `x - - 3` are accepted. Cost: a slightly odd message in edge cases.

**Task 4**
- The 🐢 state lives in a module store so it survives the `{#key}` remount on every step and lesson change: `src/ui/slowMotion.svelte.ts` → `export const slowMotion = $state({ on: false });`.
  - LessonScreen uses `slowMotion.on` in place of the local `slow`.
  - GamePane's `$effect(() => { runner?.setSlow(slow); })` is declared after `onMount`, which is enough. Drop the "make runner $state" note.
- CSS: `.machine-row .vars { flex: 1; min-width: 0; }`.

**Task 5**
- Use an interval of 400 ms per beat (3 beats ≈ 1.2 s per frame, as the spec says).

**Task 6, checks**
- Remove `ballFollows`; it cannot fail.
- Add a first check per moving step that rejects `x = constant` (a constant jump is not a whole number of pixels × 30 frames):
  - `crawl` and `left`: `check('adds', (ctx) => (x(ctx) - 400) % FRAMES === 0)`.
  - `diagonal`: `check('addsY', (ctx) => (y(ctx) - 225) % FRAMES === 0)`, placed after `yMoves`.
  - Order: crawl `[adds, faster, notTooFast]`, diagonal `[yMoves, addsY, xStillMoves]`, left `[adds, goesLeft]`.
- `speed`: the zone is only the placeholder line, so the declarations stay locked:
```c
    int pilotaY = 225;
//@edit
//@placeholder crea aquí la caixa velX
//@end
```
  The solution zone is `    int velX = 4;`. Checks: `[declaresSpeed, speedNotZero, speedNotTooFast (|velX| ≤ 20), usesSpeed]`.
- Unit test changes in `tests/lesson3.test.ts`:
  - `crawl`: `pilotaX = 3;` and `=+ 3` → `adds`; `pilotaX++;` → `faster`; `pilotaX += 5;` passes.
  - `diagonal`: `pilotaY++;` passes (written with the x line); `pilotaY = 300;` → `addsY`.
  - `left`: `pilotaX = 3;` → `adds`; `pilotaX -= 3;` passes.
  - `speed`: zone `'    int velX = 0;'` → `speedNotZero`; `1000` and `100000000` → `speedNotTooFast`; `-4` passes.
  - `crawl`: `pilotaX = pilotaX + 3` with no semicolon → `MISSING_SEMICOLON` on the zone's line.

**Task 6, texts**

Follow the teacher's changes. All check texts start with a capital letter.
- `crawl` pages:
  1. «Lliçó nova! Fins ara tot estava quiet. Avui la pilota es mourà sola. 🏃»
  2. «Mira el codi: ara es veu el `while`, que abans estava amagat a la barra «es repeteix a cada fotograma». Tot el que hi ha a dins es repeteix 60 vegades cada segon, fins que tanques el joc. Cada volta és un fotograma, com els dibuixos d'una pel·lícula.»
  3. «La línia groga, `pilotaX = pilotaX + 1;`, suma 1 a la caixa `pilotaX` a cada fotograma. Per això la pilota s'arrossega cap a la dreta. Sembla rar, oi? De seguida t'explico com funciona. Quan arribi a la vora, sortirà de la pantalla: és normal, encara no sap rebotar.»
  4. «Prem 🐢 (a sota del joc) i després ▶ Executa: veuràs la pilota avançar fotograma a fotograma i el número de `pilotaX` pujant d'1 en 1. Torna a prémer 🐢 per anar a velocitat normal.»
  5. «Fes que la pilota vagi més ràpid: canvia l'1 per un 5 i prem ▶ Executa.»
- `crawl` success: «Se n'ha anat volant! Cap problema: a la lliçó 6 la farem rebotar. Prem ▶ Executa i tornarà a sortir del mig.»
- `frames` pages 2–3: «Ja ho saps de la lliçó 2: el = no vol dir «igual», vol dir «guarda-hi».» / «L'ordinador primer calcula la part de la dreta: llegeix la caixa (400) i hi suma 3 (403). Després guarda el resultat a la caixa de l'esquerra, que és la mateixa.»
- `diagonal` page 1 gets an extra sentence: «(Si la 🐢 està encesa, tot va a poc a poc. Prem-la per apagar-la.)»
- `left` page 2: «A l'esquerra, la x és més petita. Fes que la pilota hi vagi.»
- `speed`:
  - page 1 starts «Últim repte!». Because the line is locked, the text reads «Ara el bucle diu `pilotaX = pilotaX + velX;`… però la caixa `velX` no existeix. Per això la màquina fa neu.»
  - page 2: «`velX` vol dir «velocitat en x»: quants píxels avança la pilota cap als costats a cada fotograma.»
  - page 3: «Crea la caixa `velX` a la línia groga, amb un número entre -20 i 20 que no sigui 0 (prova un 4).»
- Check texts:
  - `adds`: «La pilota ha saltat de cop i s'ha quedat quieta: has guardat un número a la caixa en lloc de sumar-l'hi. Escriu `pilotaX = pilotaX + …;`»
  - `addsY`: «La pilota ha saltat de cop: has guardat un número a `pilotaY` en lloc de sumar-l'hi. Escriu `pilotaY = pilotaY + …;`»
  - `faster`: «La pilota encara va massa a poc a poc: el número després del + ha de ser 2 o més.»
  - `notTooFast`: «Va tan ràpid que ni es veu! Prova un número entre 2 i 20.»
  - `yMoves`: «La pilota encara no baixa: afegeix `pilotaY = pilotaY + …;` amb un número positiu.»
  - `xStillMoves`: «La pilota també ha de continuar anant cap a la dreta: deixa la línia de `pilotaX` com estava.»
  - `goesLeft`: «La pilota encara no va cap a l'esquerra. Per anar a l'esquerra, la x s'ha de fer més petita.»
  - `declaresSpeed`: «Falta crear la caixa `velX`, per exemple `int velX = 4;`»
  - `speedNotZero`: «Amb `velX` igual a 0, la pilota no es mou! Posa-hi un altre número.»
  - `speedNotTooFast`: «Amb aquesta `velX` la pilota surt de la pantalla abans que la vegis! Prova un número entre -20 i 20.»
  - `usesSpeed`: «La pilota ha d'avançar `velX` píxels a cada fotograma.»

**Task 7, e2e additions**
- `playLesson` explain for lesson 2 (lesson 3 on screen):
  - check `.frames-card` unconditionally;
  - check that `.frames-card .box-value` text changes from `400` within 2 s;
  - in a `reducedMotion: 'reduce'` context, check the value stays the same over 1.5 s.
- 🐢 persists:
  - on `#/pong/2/0` press 🐢, then solve, ▶, Continua, Continua;
  - check `.slow-btn[aria-pressed="true"]` and that `.frame-no` is visible on `diagonal`;
  - switch it off afterwards.
- 🐢 on TV static (`#/pong/2/4`): press 🐢 and check there is no `.frame-no` and no page errors. Then solve and ▶, and check the counter is ≤ 3. Switch it off.
- After `crawl` succeeds at full speed, the `pilotaX` value in `.vars` grows between two reads 300 ms apart.
- Rate check: measure inside one `page.evaluate` over 1.5 s; the rate must be between 1.5 and 4.5 frames per second.
- Phone at 844×390 on `#/pong/2/4`, solved and run: `scrollWidth ≤ w`, the canvas bottom ≤ h, and 🐢 ≥ 44 px.
