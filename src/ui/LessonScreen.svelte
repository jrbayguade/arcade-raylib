<script lang="ts">
  import { t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
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
  let liveError = $state<Diagnostic | null>(null);
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

  function showLiveError(d: Diagnostic): void {
    liveError = d;
    errorLine = d.line;
  }

  function run(): void {
    const result = engine.run();
    liveError = null;
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
    <BitBubble prompt={view.texts.prompt} hints={view.hints} result={view.exercise?.result ?? null}
      {liveError} checkTexts={lesson.texts.checks} success={view.texts.success} />
    {#if view.exercise}
      <div class="actions">
        <button onclick={hint} disabled={!view.moreHints} title={t('hintTitle')}>{t('hint')}</button>
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
    <GamePane bind:this={game} onVariables={(v) => (variables = v)} onError={showLiveError} />
    {#if isExercise(view.step) && view.step.showVariables}
      <VariablesPanel {variables} />
    {/if}
  </section>
</div>
