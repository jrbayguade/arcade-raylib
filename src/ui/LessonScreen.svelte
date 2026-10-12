<script lang="ts">
  import { t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { VariableView } from '../lang/interpreter';
  import { LessonEngine, MAX_STARS } from '../lessons/engine';
  import { isExercise, promptPages, type Lesson } from '../lessons/model';
  import { parseLessonSource, zoneText } from '../lessons/source';
  import { routeHash } from '../app/route';
  import BitBubble from './BitBubble.svelte';
  import CodePane from './CodePane.svelte';
  import Confetti from './Confetti.svelte';
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
  let liveError = $state<Diagnostic | null>(null);
  let variables = $state<VariableView[]>([]);
  let celebrations = $state(0);
  let celebrating = $state(false);
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

  function showLiveError(d: Diagnostic): void {
    liveError = d;
    errorLine = d.line;
  }

  function celebrate(): void {
    celebrations++;
    celebrating = true;
    setTimeout(() => (celebrating = false), 900);
  }

  function gameCenter(): { x: number; y: number } {
    const r = document.querySelector('.game .machine')?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
  }

  function run(): void {
    const wasDone = engine.exercise?.done ?? false;
    const result = engine.run();
    liveError = null;
    version++;
    if (!result) return;
    if (result.kind === 'checked') {
      errorLine = null;
      game?.start(engine.exercise!.code);
      if (result.passed && !wasDone) celebrate();
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
    game?.stop();
    errorLine = null;
    liveError = null;
    resetCount++;
    version++;
  }

  function next(): void {
    if (!engine.next()) return;
    game?.stop();
    variables = [];
    errorLine = null;
    liveError = null;
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
    {#key view.step.id}
      <BitBubble pages={promptPages(view.texts)} hints={view.hints} result={view.exercise?.result ?? null}
        {liveError} checkTexts={lesson.texts.checks} success={view.texts.success} {celebrating} />
    {/key}
    {#if view.exercise}
      <div class="actions">
        <button onclick={hint} disabled={!view.moreHints} title={t('hintTitle')}>{t('hint')}</button>
        <button onclick={reset}>{t('reset')}</button>
      </div>
      {#if view.exercise.done}
        <p class="stars" aria-label={t('starsEarned', { n: view.exercise.stars, max: MAX_STARS })}>
          {#each Array.from({ length: MAX_STARS }) as _, i (i)}<span class="star" class:earned={i < view.exercise.stars} style="animation-delay: {i * 300}ms">⭐</span>{/each}
        </p>
      {/if}
    {/if}
    {#if view.canContinue && view.isLast}
      <p class="done">{t('lessonDone')}</p>
      {#if !hasNextLesson}<p class="done">{t('allDone')}</p>{/if}
    {/if}
  </aside>

  <main class="code">
    <div class="toolbar">
      {#if isExercise(view.step)}
        <button class="run" onclick={run} title={t('runShortcut')}>{t('run')}</button>
      {/if}
      {#if view.canContinue && !view.isLast}
        {#key view.step.id}<button class="primary next" onclick={next}>{t('continue')}</button>{/key}
      {:else if view.canContinue && hasNextLesson}
        <button class="primary next" onclick={nextLesson}>{t('nextLesson')}</button>
      {/if}
    </div>
    {#if isExercise(view.step) && view.exercise}
      {#key `${view.step.id}/${resetCount}`}
        <CodePane bind:this={codePane} source={view.exercise.source} foldLabels={lesson.texts.folds}
          {errorLine} onChange={changed} onRun={run} />
      {/key}
    {:else if view.step.kind === 'explain'}
      <ExplainCard card={view.step.card} />
    {/if}
  </main>

  <section class="game">
    <GamePane bind:this={game} onVariables={(v) => (variables = v)} onError={showLiveError} />
    {#if isExercise(view.step) && view.step.showVariables}
      <VariablesPanel {variables} />
    {/if}
  </section>
</div>

<Confetti trigger={celebrations} origin={gameCenter} />
