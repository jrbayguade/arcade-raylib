<script lang="ts">
  import { t } from '../i18n/i18n';
  import type { VariableView } from '../lang/interpreter';

  let { variables }: { variables: VariableView[] } = $props();

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

  const show = (v: VariableView) => (typeof v.value === 'object' ? 'Color' : String(v.value));
</script>

{#if variables.length > 0}
<section class="vars">
  <h3>{t('variablesTitle')}</h3>
  <div class="boxes">
    {#each variables as v (v.name)}
      <div class="box" class:flash={flashing.has(v.name)}>
        <span class="name">{v.name}</span>
        <span class="value">{show(v)}</span>
        <span class="type">{v.type}</span>
      </div>
    {/each}
  </div>
</section>
{/if}
