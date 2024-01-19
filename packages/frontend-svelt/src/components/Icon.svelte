<script lang="ts">
  // NOTE: I am not sure if this is actually a useability improvement . . .

  import { onMount } from 'svelte';
  import type { IconComponent } from './Subnav.svelte';

  export let type: string = '';

  let icon: IconComponent = null;
  let forwardedProps = {}; // to store all other props except 'type'

  // Watch for changes in all properties and filter out the 'type'
  $: forwardedProps = Object.fromEntries(Object.entries($$props).filter(([key]) => key !== 'type'));

  async function loadIcon(type: string) {
    switch (type) {
      case 'line-md/cloud-tags-loop':
        return import('virtual:icons/line-md/cloud-tags-loop');
      default:
        throw new Error(
          `Unknown icon type: ${type}. You need to add this new icon to the Icon.svelte component map.`
        );
    }
  }

  onMount(async () => {
    if (type) {
      const module = await loadIcon(type);
      icon = module.default as IconComponent;
    }
  });
</script>

{#if icon}
  <svelte:component this={icon} {...forwardedProps} />
{/if}
