<script lang="ts">
  import { LESSONS } from '../../content/pong';
  import { t } from '../i18n/i18n';
  import Hall from '../ui/Hall.svelte';
  import Intro from '../ui/Intro.svelte';
  import LanguagePicker from '../ui/LanguagePicker.svelte';
  import { INTRO_KEY, shouldShowIntro } from '../ui/intro';
  import LessonScreen from '../ui/LessonScreen.svelte';
  import { sounds, type SoundName } from '../ui/sound';
  import { isHall, parseRoute, routeHash } from './route';

  const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } };

  let route = $state(parseRoute(location.hash, LESSONS.length));
  let showIntro = $state(shouldShowIntro(location.hash, introSeen()));
  let hall = $state(isHall(location.hash));

  $effect(() => {
    const onHash = () => {
      route = parseRoute(location.hash, LESSONS.length);
      hall = isHall(location.hash);
      if (location.hash === '#/intro') showIntro = true;
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });

  function introDone(): void {
    try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode: the intro will show again */ }
    showIntro = false;
    const start = routeHash({ lesson: 0, step: 0 });
    if (location.hash !== start) location.hash = start;
    route = parseRoute(start, LESSONS.length);
    hall = false;
  }

  // Audio may only start after a user gesture; every button then clicks (or plays its own data-sound).
  $effect(() => {
    const unlock = () => sounds.unlock();
    const onClick = (e: MouseEvent) => {
      const button = (e.target as Element | null)?.closest?.('button');
      if (!button || button.disabled || button.dataset.sound === 'none') return;
      sounds.play((button.dataset.sound as SoundName | undefined) ?? 'click');
    };
    addEventListener('pointerdown', unlock, { capture: true });
    addEventListener('keydown', unlock, { capture: true });
    addEventListener('click', onClick, { capture: true });
    return () => {
      removeEventListener('pointerdown', unlock, { capture: true });
      removeEventListener('keydown', unlock, { capture: true });
      removeEventListener('click', onClick, { capture: true });
    };
  });

  if (import.meta.env.DEV) {
    const heard: string[] = [];
    (window as unknown as { __bitArcadeSounds: string[] }).__bitArcadeSounds = heard;
    sounds.onPlay = (name) => heard.push(name);
  }
</script>

{#if showIntro}
  <Intro onDone={introDone} />
{:else if hall}
  <Hall />
{:else}
  {#key `${route.lesson}/${route.step}`}
    <LessonScreen
      lesson={LESSONS[route.lesson]}
      lessonIndex={route.lesson}
      startStep={route.step}
      hasNextLesson={route.lesson < LESSONS.length - 1}
    />
  {/key}
{/if}

<div class="rotate" role="alert">
  <LanguagePicker />
  <div class="rotate-phone" aria-hidden="true">📱</div>
  <p>{t('rotate')}</p>
</div>
