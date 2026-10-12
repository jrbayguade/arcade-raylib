<script lang="ts">
  import { onMount } from 'svelte';
  import { createLessonEditor, type LessonEditor } from '../editor/editor';
  import { t } from '../i18n/i18n';
  import type { LessonSource } from '../lessons/source';

  let { source, foldLabels, errorLine, onChange, onRun }: {
    source: LessonSource;
    foldLabels: Record<string, string>;
    errorLine: number | null;
    onChange: (code: string) => void;
    onRun: () => void;
  } = $props();

  let parent: HTMLDivElement;
  let editor: LessonEditor | null = null;

  onMount(() => {
    editor = createLessonEditor({
      parent,
      source,
      foldLabel: (key, lines) => t('foldLines', { lines, label: foldLabels[key] ?? key }),
      onChange,
      onRun,
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
