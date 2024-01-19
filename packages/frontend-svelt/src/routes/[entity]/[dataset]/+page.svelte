<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { page } from '$app/stores';
  import type { Dataset } from '@backend/types';

  // Components and Icons
  import Subnav from '../../../components/Subnav.svelte';
  import Badge from '../../../components/Badge.svelte';
  import type { NavigationItem, IconComponent } from '../../../components/Subnav.svelte';
  import DB from 'virtual:icons/mdi/database-outline';
  import Star from 'virtual:icons/line-md/star-filled';
  import Chart from 'virtual:icons/mdi/chart-bell-curve-cumulative';
  import ClipboardList from 'virtual:icons/line-md/clipboard-list';
  import Merge from 'virtual:icons/mdi/source-merge';
  import Eye from 'virtual:icons/mdi/eye-plus';
  import Fork from 'virtual:icons/mdi/source-fork';
  import { onMount } from 'svelte';
  import FileUpload from '$lib/components/file-upload.svelte';
  import ApiLinker from '$lib/components/api-linker.svelte';

  // Stores and services
  import { navState } from '$lib/stores/app';
  import dataManager from '$lib/services/data-manager';

  // Component props and local variables
  export let data;
  let datasource = '';
  let debounceTimeout: number | undefined;
  let isValidURL: boolean = true;

  // Svelte store states
  const uploadInProgress = writable(false);
  const uploadComplete = writable(false);
  const progressBar = tweened(0, { duration: 10000, easing: cubicOut });
  const inputClasses =
    'block w-full rounded-md bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6';

  $: if ($uploadInProgress) {
    progressBar.set(100);
  } else if ($uploadComplete) {
    progressBar.set(100, { duration: 150 });
    setTimeout(() => {
      progressBar.set(0, { duration: 150 });
    }, 500);
  } else {
    progressBar.set(0, { duration: 0 });
  }

  // Function to be called when the input changes
  function syncData() {
    console.log('Syncing data: ', datasource);
    // Add your data synchronization logic here
  }

  function validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  function fileUploaded(result: Dataset) {
    console.log('fileUploaded', result);
  }

  $: isValidURL = validateURL(datasource);
  // Reactive statement to handle debouncing
  $: if (datasource && isValidURL) {
    if (debounceTimeout !== undefined) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(syncData, 2000) as unknown as number;
  }

  onMount(() => {
    return () => {
      // Cleanup to avoid memory leaks
      clearTimeout(debounceTimeout);
    };
  });

  console.log('data.dataset', data.dataset);

  // Subscription to the progressBar store
  const progressBarUnsibscribe = progressBar.subscribe(value => {
    if ($uploadComplete && value === 100) {
      setTimeout(() => {
        progressBar.set(0, { duration: 150 });
        setTimeout(() => {
          uploadComplete.set(false);
        }, 1000);
      }, 500);
    }
  });

  const subnav: NavigationItem[] = [
    { name: 'Overview', href: '#', current: true, icon: ClipboardList as IconComponent },
    { name: 'Data', href: '#', current: false, icon: DB as IconComponent },
    {
      name: 'Change Requests',
      href: '#',
      current: false,
      badge: 6,
      icon: Merge as IconComponent,
    },
    { name: 'Visualize', href: '#', current: false, icon: Chart as IconComponent },
  ];

  const actionItems = [
    { name: 'Watch', href: '#', current: true, badge: data.dataset?.watchersCount, icon: Eye },
    { name: 'Contribute', href: '#', current: false, badge: 4, icon: Fork },
    { name: 'Star', href: '#', current: false, badge: data.dataset?.starCount, icon: Star },
  ];

  // Subscription for navigation state
  function setupPageSubscription() {
    return page.subscribe(({ params: { entity, dataset } }) => {
      navState.set({
        items: [
          { name: entity, href: `/${entity}` },
          { name: dataset, href: `/${entity}/${dataset}` },
        ],
      });
    });
  }

  // Initialize and manage subscriptions
  const subscriptions = [setupPageSubscription(), progressBarUnsibscribe];
  onDestroy(() => subscriptions.forEach(unsubscribe => unsubscribe()));
</script>

<Subnav items={subnav} />
<main class="pb-8">
  {#if data.dataset}
    <header
      class="px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4 border-b border-white/10"
    >
      <div class="flex items-center gap-x-4">
        <!-- This div will group the h2 and the isPublic div -->
        <h2 class="font-semibold text-lg text-white">{data?.dataset?.title}</h2>
        <div class="rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset">
          {data?.dataset?.isPublic ? 'public' : 'private'}
        </div>
      </div>

      <!-- TODO: make into an actions tray component -->
      <ul
        role="list"
        class="flex flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8"
      >
        {#each actionItems as item (item.name)}
          <li>
            <a href={item.href} class={item.current ? 'text-indigo-400' : ''}>
              <span class="inline-flex items-center gap-x-2">
                {#if item.icon}
                  <svelte:component this={item.icon} />
                {/if}
                {item.name}
                {#if item.badge}
                  <Badge content={item.badge} />
                {/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </header>
    <div class="px-4 sm:px-6 lg:px-8">
      <!-- Main 3 column grid -->
      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
        <!-- Left column -->
        <div class="grid grid-cols-1 gap-4 lg:col-span-2">
          <FileUpload dataset={data.dataset} onSuccess={fileUploaded} />
          <ApiLinker dataset={data.dataset} onSuccess={console.log} />

          <!-- <div>
            <label for="datasource" class="block leading-6 font-semibold text-lg text-white"
              >Add a data source endpoint</label
            >
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
          </div> -->
        </div>

        <!-- Right column -->
        <div class="grid grid-cols-1 gap-4">
          <section aria-labelledby="section-2-title">
            <h2 class="sr-only" id="section-2-title">Section title</h2>
            <div class="overflow-hidden rounded-lg bg-gray-900/80 shadow">
              <div class="p-6">
                <div>
                  <h2 class="font-semibold text-lg text-white">Description</h2>
                  {#if data.dataset?.description}
                    <p class="text-white">{data.dataset?.description}</p>
                  {:else}
                    <p class="text-white">
                      No description exists on the dataset model, but if it did it would appear
                      here.
                    </p>
                  {/if}
                </div>
                <div>
                  <h2 class="font-semibold text-lg text-white">Dource file:</h2>
                  {#if data.dataset?.files?.length}
                    {#each data.dataset?.files as file}
                      <p class="text-white">{file.name}</p>
                    {/each}
                  {:else}
                    <p class="text-white">This dataset does not have any data uploaded yet.</p>
                  {/if}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  {:else}
    no Dataset, it's either loading, failed to load, or doesnt exist
  {/if}
</main>
