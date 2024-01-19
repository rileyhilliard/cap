<script lang="ts">
  import { formatNumber } from '../utils/helpers';

  export let content: number | string;
  export let color: string = 'gray';
</script>

{#if content}
  <span
    class={`inline-flex items-center rounded-md bg-${color}-400/10 px-2 py-1 text-xs font-medium text-${color}-400 ring-1 ring-inset ring-${color}-400/20`}
  >
    {formatNumber(content)}
  </span>
{/if}
