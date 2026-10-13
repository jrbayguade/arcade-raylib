<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../i18n/i18n';
  import { compile } from '../lang/compile';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { VariableView } from '../lang/interpreter';
  import { LessonEngine, MAX_STARS } from '../lessons/engine';
  import { feedbackFor } from '../lessons/feedback';
  import { isExercise, promptPages, type Lesson } from '../lessons/model';
  import { parseLessonSource, zoneText } from '../lessons/source';
  import { RaylibHost } from '../runtime/raylib';
  import { HALL_HASH, routeHash } from '../app/route';
  import { recordExercise, recordStep, savedExercises } from '../lessons/progress';
  import { download, mainC } from '../lessons/export';
  import { LESSONS } from '../../content/pong';
  import BitBubble from './BitBubble.svelte';
  import CodePane from './CodePane.svelte';
  import Confetti from './Confetti.svelte';
  import ExplainCard from './ExplainCard.svelte';
  import GamePane from './GamePane.svelte';
  import type { BitMessage } from './message';
  import { persist, persistSoon, progress } from './progressStore.svelte';
  import { slowMotion } from './slowMotion.svelte';
  import { sounds } from './sound';
  import VariablesPanel from './VariablesPanel.svelte';

  const SYMBOLS = [';', '(', ')', '{', '}', '=', ',', '"', '<', '>', '+', '-'];

  let { lesson, lessonIndex, startStep, hasNextLesson }: {
    lesson: Lesson;
    lessonIndex: number;
    startStep: number;
    hasNextLesson: boolean;
  } = $props();

  // App re-keys this screen on every route change, so reading the initial props here is intended.
  const engine = untrack(() => new LessonEngine(lesson, startStep, savedExercises(progress, lesson)));

  /** Saves where the kid is and what they have done in this step (code, stars, hints). */
  function save(soon = false): void {
    const ex = engine.saved(engine.step.id);
    if (ex) recordExercise(progress, lesson, engine.step.id, ex);
    recordStep(progress, lessonIndex, lesson, engine.stepIndex);
    if (soon) persistSoon();
    else persist();
  }
  untrack(save);
  let version = $state(0);
  let resetCount = $state(0);
  let errorLine = $state<number | null>(null);
  let message = $state<BitMessage>(null);
  let variables = $state<VariableView[]>([]);
  let celebrations = $state(0);
  let celebrating = $state(false);
  let symbolsOpen = $state(false);
  let resetArmed = $state(false);
  let broken = $state(false);
  let game: ReturnType<typeof GamePane> | undefined = $state();
  let codePane: ReturnType<typeof CodePane> | undefined = $state();

  const view = $derived.by(() => {
    version;
    const pages = promptPages(engine.texts);
    const exercise = isExercise(engine.step);
    return {
      step: engine.step,
      index: engine.stepIndex,
      exercise: engine.exercise,
      texts: engine.texts,
      // On exercises the last page is the mission: always visible, so it is not typed among the others.
      pages: exercise ? pages.slice(0, -1) : pages,
      mission: exercise ? pages[pages.length - 1] : null,
      hintsShown: engine.shownHints().length,
      hintsTotal: engine.texts.hints?.length ?? 0,
      moreHints: engine.hasMoreHints,
      canContinue: engine.canContinue,
      isLast: engine.isLastStep,
    };
  });

  // A primitive: effects that read it only re-run when the step really changes (not on every engine update).
  const stepId = $derived(view.step.id);

  /** Names written in the yellow zone: their boxes are the ones the kid is watching. */
  const zoneNames = $derived.by(() => {
    const ex = view.exercise;
    if (!ex) return [];
    const zone = ex.code.slice(ex.shown.editable.from, ex.code.length - (ex.shown.code.length - ex.shown.editable.to));
    return variables.map((v) => v.name).filter((n) => new RegExp(`\\b${n}\\b`).test(zone));
  });

  const lessonStars = $derived.by(() => {
    version;
    let earned = 0;
    let max = 0;
    for (const s of lesson.steps) {
      if (!isExercise(s)) continue;
      max += MAX_STARS;
      earned += engine.starsOf(s.id);
    }
    return { earned, max };
  });

  const mood = $derived.by((): 'normal' | 'happy' | 'thinking' => {
    if (message?.kind === 'live') return 'thinking';
    if (message?.kind === 'result') {
      return message.feedback?.kind === 'success' ? 'happy' : 'thinking';
    }
    return 'normal';
  });

  // Entering an exercise switches the machine on with its starting code, so the kid sees what is broken;
  // starting code that does not compile (the challenge is to fix it) shows TV static instead.
  $effect(() => {
    stepId;
    untrack(() => {
      if (!game) return;
      // Opened straight on an explanation (a shared or resumed link): nothing has run yet, so show snow, not a black screen.
      if (!isExercise(view.step) || !view.exercise) {
        // The machine-fixed card: the kid's own finished game plays on, never TV static.
        if (view.step.kind === 'explain' && view.step.card === 'fixed') {
          const last = lesson.steps.filter(isExercise).at(-1);
          const saved = last ? engine.saved(last.id) ?? savedExercises(progress, lesson)[last.id] : undefined;
          const code = saved?.done ? saved.code : last ? parseLessonSource(last.solution).code : null;
          if (code) { broken = false; game.start(code); return; }
        }
        if (!game.isRunning()) broken = true;
        return;
      }
      const code = view.exercise.source.code;
      if (compile(code, new RaylibHost({ seed: 1 })).ok) {
        broken = false;
        game.start(code);
      } else {
        broken = true;
        game.stop();
      }
    });
  });

  // Typing outside the yellow zone: a beep every time, Bit explains it once per step.
  let toldAboutZone = false;
  let lastBlockedBeep = 0;
  function blocked(): void {
    const now = performance.now();
    if (now - lastBlockedBeep > 400) { sounds.play('error'); lastBlockedBeep = now; }
    if (!toldAboutZone) {
      toldAboutZone = true;
      message = { kind: 'note', text: t('outsideZone') };
    }
  }

  function changed(code: string): void {
    engine.setCode(code);
    errorLine = null;
    save(true);
  }

  function showLiveError(d: Diagnostic): void {
    sounds.play('error');
    message = { kind: 'live', diagnostic: d };
    errorLine = d.line;
  }

  function celebrate(stars: number): void {
    sounds.play('success');
    for (let i = 0; i < stars; i++) setTimeout(() => sounds.play('star', { pitch: 1 + i * 0.25 }), 450 + i * 300);
    celebrations++;
    celebrating = true;
    setTimeout(() => (celebrating = false), 900);
  }

  function gameCenter(): { x: number; y: number } {
    const r = document.querySelector('.cabinet .machine')?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
  }

  function run(): void {
    sounds.play('run');
    const wasDone = engine.exercise?.done ?? false;
    const result = engine.run();
    save();
    version++;
    if (!result) return;
    const ex = engine.exercise!;
    message = { kind: 'result', feedback: feedbackFor(result), stars: ex.stars, maxStars: MAX_STARS };
    if (result.kind === 'checked') {
      errorLine = null;
      broken = false;
      game?.start(ex.code);
      // Steps played with keys: the keyboard goes to the game, so W moves the paddle instead of typing a "w".
      if (isExercise(view.step) && view.step.controls?.length) game?.focus();
      if (result.passed && !wasDone) celebrate(ex.stars);
    } else {
      sounds.play('error');
      errorLine = result.diagnostic.line;
      broken = result.kind === 'compile-error';
      game?.stop();
    }
  }

  function hint(): void {
    const text = engine.showHint();
    save();
    version++;
    if (text) message = { kind: 'hint', n: engine.shownHints().length, text };
  }

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  function reset(): void {
    if (!resetArmed) {
      resetArmed = true;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => (resetArmed = false), 3000);
      return;
    }
    resetArmed = false;
    clearTimeout(resetTimer);
    engine.reset();
    save();
    errorLine = null;
    message = null;
    resetCount++;
    version++;
  }

  function next(): void {
    if (!engine.next()) return;
    variables = [];
    errorLine = null;
    message = null;
    symbolsOpen = false;
    toldAboutZone = false;
    history.replaceState(null, '', routeHash({ lesson: lessonIndex, step: engine.stepIndex }));
    save();
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
    <button class="home" data-sound="page" title={t('hallBack')} aria-label={t('hallBack')} onclick={() => (location.hash = HALL_HASH)}>🏠</button>
    <h1 class="brand">BIT ARCADE <span>· {lesson.machine ?? ''} · {lesson.final ? t('finalShort') : t('lessonShort', { n: lesson.number })} · {lesson.texts.title}</span></h1>
    <div class="lights" role="img" aria-label={t('stepOf', { n: view.index + 1, total: lesson.steps.length })}>
      {#each lesson.steps as s, i (s.id)}
        <i class="light" class:done={i < view.index} class:now={i === view.index}></i>
      {/each}
    </div>
    <span class="total">⭐ {lessonStars.earned}/{lessonStars.max}</span>
  </header>

  {#key view.step.id}
    <BitBubble pages={view.pages} mission={view.mission} {message} checkTexts={lesson.texts.checks}
      success={view.texts.success} {mood} {celebrating} />
  {/key}

  <div class="work">
    {#if isExercise(view.step) && view.exercise}
      {#if symbolsOpen}
        <div class="symbols" aria-label={t('symbolsLabel')}>
          {#each SYMBOLS as s (s)}
            <button data-sound="type" onpointerdown={(e) => e.preventDefault()} onclick={() => codePane?.insert(s)}>{s}</button>
          {/each}
        </div>
      {/if}
      {#key `${view.step.id}/${resetCount}`}
        <CodePane bind:this={codePane} source={view.exercise.shown} foldLabels={lesson.texts.folds}
          {errorLine} onChange={changed} onRun={run} onBlocked={blocked} />
      {/key}
    {:else if view.step.kind === 'explain'}
      <ExplainCard card={view.step.card} />
    {/if}
  </div>

  <div class="actions" class:solved={view.canContinue}>
    {#if view.canContinue && !view.isLast}
      {#key view.step.id}<button class="primary next" data-sound="next" onclick={next}>{t('continue')}</button>{/key}
    {:else if view.canContinue && hasNextLesson}
      <button class="primary next" data-sound="next" onclick={nextLesson}>{t('nextLesson')}</button>
    {/if}
    {#if view.step.kind === 'explain' && view.step.card === 'fixed'}
      <button class="primary download" data-sound="success" onclick={() => download('main.c', mainC(progress, LESSONS))}>{t('downloadMain')}</button>
    {/if}
    {#if view.canContinue && view.isLast}
      <button class="to-hall" data-sound="page" onclick={() => (location.hash = HALL_HASH)} aria-label={t('hallBack')}>🏠<span class="to-hall-label"> {t('hallBackLabelText')}</span></button>
    {/if}
    {#if isExercise(view.step)}
      <button class="run" class:secondary={view.canContinue} data-sound="none" onclick={run} title={t('runShortcut')} aria-label={t('run')}><span aria-hidden="true">▶</span> <span class="run-label" aria-hidden="true">{t('runLabel')}</span></button>
      <button class="hint-btn" data-sound="hint" onclick={hint} disabled={!view.moreHints} title={t('hintTitle')}>
        {t('hintCount', { n: view.hintsShown, total: view.hintsTotal })}
      </button>
      <button class="keys-toggle" class:on={symbolsOpen} aria-expanded={symbolsOpen} aria-label={t('symbolsLabel')}
        title={t('symbolsLabel')} onpointerdown={(e) => e.preventDefault()} onclick={() => (symbolsOpen = !symbolsOpen)}>⌨️</button>
      <button class="reset" class:armed={resetArmed} onclick={reset} title={t('resetTitle')} aria-label={t('resetTitle')}>
        {resetArmed ? t('resetConfirm') : '⟲'}
      </button>
    {/if}
    {#if view.canContinue && view.isLast}
      <span class="done">{#if lesson.final}{t('finalDone')}{:else}{t('lessonDone')}{#if !hasNextLesson}<span class="all-done"> {t('allDone')}</span>{/if}{/if}</span>
    {/if}
  </div>

  <section class="machine-area">
    <div class="cabinet">
      <div class="marquee">{lesson.machine ?? ''}</div>
      <GamePane bind:this={game} {broken} slow={slowMotion.on} controls={isExercise(view.step) ? (view.step.controls ?? []) : view.step.card === 'fixed' ? ['KEY_W', 'KEY_S'] : []} onVariables={(v) => (variables = v)} onError={showLiveError} />
      {#if isExercise(view.step)}
        <div class="machine-row">
          <button class="slow-btn" class:on={slowMotion.on} aria-pressed={slowMotion.on} data-sound="page"
            title={t('slowMotion')} aria-label={t('slowMotion')} onclick={() => (slowMotion.on = !slowMotion.on)}>🐢 <span class="slow-label">{t('slowLabel')}</span>{#if slowMotion.on} ✓{/if}</button>
          {#if view.step.showVariables}<VariablesPanel {variables} focus={zoneNames} />{/if}
        </div>
      {/if}
    </div>
  </section>
</div>

<Confetti trigger={celebrations} origin={gameCenter} />
