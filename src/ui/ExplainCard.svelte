<script lang="ts">
  import FramesCard from './FramesCard.svelte';
  import GridCard from './GridCard.svelte';
  import VariableBoxCard from './VariableBoxCard.svelte';

  let { card }: { card: 'grid' | 'variable-box' | 'frames' } = $props();
</script>

<div class="explain">
  {#if card === 'grid'}<GridCard />{:else if card === 'frames'}<FramesCard />{:else}<VariableBoxCard />{/if}
</div>
