<script lang="ts">
  import { LESSONS } from '../../content/pong';
  import { PONG_PLAN } from '../../content/pong/plan';
  import { routeHash } from '../app/route';
  import { t } from '../i18n/i18n';
  import { download, mainC } from '../lessons/export';
  import { lessonDone, lessonStars, resumeStep, unlockedCount } from '../lessons/progress';
  import BitFace from './BitFace.svelte';
  import LanguagePicker from './LanguagePicker.svelte';
  import { clearProgress, progress } from './progressStore.svelte';

  /** The arcade hall: the Pong cabinet with its lessons, the machines still to come, and "Continua". */
  const OTHERS = ['BRICK', 'SNAKE', '???'];

  const unlocked = $derived(unlockedCount(progress, LESSONS));
  /** The whole machine is fixed: the hall celebrates and offers to play. */
  const allDone = $derived(LESSONS.every((l) => lessonDone(progress, l)));
  const started = $derived(Object.keys(progress.exercises).length > 0);
  /** Where "Continua" goes: the last place, else the first lesson not finished. */
  const target = $derived.by(() => {
    const last = progress.last;
    if (last && LESSONS[last.lesson]) return { lesson: last.lesson, step: Math.min(last.step, LESSONS[last.lesson].steps.length - 1) };
    const firstOpen = LESSONS.findIndex((l) => !lessonDone(progress, l));
    const lesson = firstOpen < 0 ? LESSONS.length - 1 : Math.min(unlocked - 1, firstOpen);
    return { lesson, step: resumeStep(progress, LESSONS[lesson]) };
  });
  const rows = $derived(PONG_PLAN.map((planned, i) => {
    const lesson = LESSONS[i];
    if (!lesson) return { i, planned, lesson: null, state: 'soon' as const, stars: null };
    const state = lessonDone(progress, lesson) ? 'done' as const : i < unlocked ? 'open' as const : 'locked' as const;
    return { i, planned, lesson, state, stars: lessonStars(progress, lesson) };
  }));

  /** What Bit says: the greeting, or why a locked lesson does not open. */
  let say = $state<string | null>(null);
  let shake = $state<number | null>(null);

  function open(i: number): void {
    const row = rows[i];
    if (row.state === 'locked') {
      say = t('hallLockedSay', { n: PONG_PLAN[unlocked - 1].number ?? unlocked });
      shake = i;
      setTimeout(() => (shake = null), 500);
      return;
    }
    location.hash = routeHash({ lesson: i, step: resumeStep(progress, LESSONS[i]) });
  }

  let resetArmed = $state(false);
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
    clearProgress();
  }
</script>

<div class="hall">
  <LanguagePicker />
  <h1 class="hall-sign">BIT ARCADE</h1>
  <div class="hall-floor">
    <section class="hall-pong cabinet" class:fixed={allDone} aria-label="PONG">
      <div class="marquee">PONG{#if allDone} 🏆{/if}</div>
      <ol class="lesson-list">
        {#each rows as row (row.i)}
          <li>
            <button class="lesson-item {row.state}" class:shake={shake === row.i} class:target={row.lesson !== null && row.i === target.lesson}
              disabled={row.state === 'soon'} aria-disabled={row.state === 'locked'} data-sound={row.state === 'locked' ? 'error' : undefined}
              title={row.state === 'locked' ? t('hallLocked') : undefined} onclick={() => open(row.i)}>
              <span class="lesson-no">{row.planned.number ?? '🏆'}</span>
              <span class="lesson-title">{row.lesson?.texts.title ?? row.planned.title}</span>
              <span class="lesson-state">
                {#if row.state === 'soon'}{t('hallComing')}
                {:else if row.state === 'locked'}<span class="lock">🔒</span>
                {:else}⭐ {row.stars?.earned}/{row.stars?.max}{#if row.state === 'done'}<span class="done-badge">✓</span>{/if}{/if}
              </span>
            </button>
          </li>
        {/each}
      </ol>
    </section>
    <aside class="hall-others">
      {#each OTHERS as name (name)}
        <div class="mini-cab">
          <div class="mini-roof">{name}</div>
          <div class="mini-screen"><div class="tv-static"></div></div>
          <div class="mini-soon">{t('hallComing')}</div>
        </div>
      {/each}
    </aside>
  </div>
  <div class="hall-bit">
    <BitFace mood="happy" size={56} />
    <p class="bubble hall-say">{say ?? (allDone ? t('hallAllDone') : started ? t('hallWelcomeBack') : t('hallWelcome'))}</p>
    {#if allDone}
      <button class="primary hall-continue" data-sound="next" onclick={() => (location.hash = routeHash({ lesson: LESSONS.length - 1, step: LESSONS[LESSONS.length - 1].steps.length - 1 }))}>{t('hallPlay')}</button>
      <button class="download" data-sound="success" title={t('downloadMain')} onclick={() => download('main.c', mainC(progress, LESSONS))}>⬇ main.c</button>
    {:else}
    <button class="primary hall-continue" data-sound="next" onclick={() => (location.hash = routeHash(target))}>
      {started ? (LESSONS[target.lesson].final ? t('hallContinueFinal') : t('hallContinue', { n: LESSONS[target.lesson].number })) : t('hallStart')}
    </button>
    {/if}
  </div>
  {#if started}
    <button class="hall-reset" class:armed={resetArmed} onclick={reset}>{resetArmed ? t('hallResetConfirm') : t('hallReset')}</button>
  {/if}
</div>
