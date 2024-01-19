<script lang="ts">
  import type { Dataset } from '@backend/types';
  import { onMount } from 'svelte';
  import { debounce } from '$lib/utils';

  export let dataset: Dataset;
  export let onSuccess: (result: Dataset) => void;
  export let initialDataSource = '';

  let datasource = initialDataSource;
  let debounceTimeout: number | undefined;
  let isValidURL: boolean = true;

  const inputClasses =
    'block w-full rounded-md bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6';

  function validateURL(url: string): boolean {
    try {
      new URL(url);
      return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(url);
    } catch (e) {
      return false;
    }
  }

  $: isValidURL = validateURL(datasource);

  const debouncedOnSuccess = debounce(onSuccess, 2000);

  $: isValidURL = validateURL(datasource);
  $: if (datasource && isValidURL) {
    debouncedOnSuccess(dataset);
  }

  onMount(() => {
    return () => {
      if (debounceTimeout !== undefined) clearTimeout(debounceTimeout);
    };
  });
</script>

<input
  type="url"
  id="datasource"
  name="datasource"
  bind:value={datasource}
  class={`${inputClasses} ${
    !isValidURL && datasource
      ? 'border-red-500 border-1 focus:ring-red-500'
      : 'border-0 focus:ring-indigo-500'
  }`}
  placeholder="Note: this can be a direct link to a file or an API endpoint"
  required
/>
