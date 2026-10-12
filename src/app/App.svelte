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
