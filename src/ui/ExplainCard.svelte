<script lang="ts">
  import GridCard from './GridCard.svelte';
  import VariableBoxCard from './VariableBoxCard.svelte';

  let { card }: { card: 'grid' | 'variable-box' } = $props();
</script>

<div class="explain">
  {#if card === 'grid'}<GridCard />{:else}<VariableBoxCard />{/if}
</div>
