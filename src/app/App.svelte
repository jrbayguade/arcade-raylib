<script lang="ts">
  import { LESSONS } from '../../content/pong';
  import { t } from '../i18n/i18n';
  import LessonScreen from '../ui/LessonScreen.svelte';
  import { sounds, type SoundName } from '../ui/sound';
  import { parseRoute } from './route';

  let route = $state(parseRoute(location.hash, LESSONS.length));

  $effect(() => {
    const onHash = () => (route = parseRoute(location.hash, LESSONS.length));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });

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

{#key `${route.lesson}/${route.step}`}
  <LessonScreen
    lesson={LESSONS[route.lesson]}
    lessonIndex={route.lesson}
    startStep={route.step}
    hasNextLesson={route.lesson < LESSONS.length - 1}
  />
{/key}

<div class="rotate" role="alert">
  <div class="rotate-phone" aria-hidden="true">📱</div>
  <p>{t('rotate')}</p>
</div>
