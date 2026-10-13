<script lang="ts">
  import type { ExplainCardId } from '../lessons/model';
  import AndCard from './AndCard.svelte';
  import BounceCard from './BounceCard.svelte';
  import CompareCard from './CompareCard.svelte';
  import FramesCard from './FramesCard.svelte';
  import GridCard from './GridCard.svelte';
  import IfCard from './IfCard.svelte';
  import VariableBoxCard from './VariableBoxCard.svelte';

  let { card }: { card: ExplainCardId } = $props();
</script>

<div class="explain">
  {#if card === 'grid'}<GridCard />{:else if card === 'frames'}<FramesCard />{:else if card === 'if'}<IfCard />{:else if card === 'compare'}<CompareCard />{:else if card === 'bounce'}<BounceCard />{:else if card === 'and'}<AndCard />{:else}<VariableBoxCard />{/if}
</div>
