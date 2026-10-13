<script lang="ts">
  import { tick } from 'svelte';
  import { t } from '../i18n/i18n';
  import type { VariableView } from '../lang/interpreter';

  let { variables, focus = [] }: {
    variables: VariableView[];
    /** Boxes to keep in view when the row scrolls (phones): the ones the yellow zone talks about. */
    focus?: string[];
  } = $props();

  let previous = new Map<string, unknown>();
  let flashing = $state(new Set<string>());
  // Not tied to the effect's cleanup: `variables` changes every frame, which would cancel the timer at once.
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const changed = new Set<string>();
    for (const v of variables) if (previous.has(v.name) && previous.get(v.name) !== v.value) changed.add(v.name);
    previous = new Map(variables.map((v) => [v.name, v.value]));
    if (changed.size === 0) return;
    clearTimeout(timer);
    flashing = changed;
    timer = setTimeout(() => (flashing = new Set()), 600);
  });

  $effect(() => () => clearTimeout(timer));

  // A box that was just created goes last: when the row scrolls (phones), bring it into view.
  let row: HTMLDivElement | undefined = $state();
  const names = $derived(variables.map((v) => v.name).join(','));
  $effect(() => {
    if (!names || !row) return;
    const wanted = focus[0];
    tick().then(() => {
      if (!row) return;
      const chip = wanted ? row.querySelector<HTMLElement>(`[data-name="${wanted}"]`) : null;
      const left = chip ? row.scrollLeft + chip.getBoundingClientRect().left - row.getBoundingClientRect().left - 8 : row.scrollWidth;
      row.scrollTo({ left });
    });
  });

  const show = (v: VariableView) => (typeof v.value === 'object' ? 'Color' : String(v.value));
</script>

{#if variables.length > 0}
<section class="vars">
  <h3>{t('variablesTitle')}</h3>
  <div class="boxes" bind:this={row}>
    {#each variables as v (v.name)}
      <div class="box" class:flash={flashing.has(v.name)} data-name={v.name}>
        <span class="name">{v.name}</span>
        <span class="value">{show(v)}</span>
        <span class="type">{v.type}</span>
      </div>
    {/each}
  </div>
</section>
{/if}
