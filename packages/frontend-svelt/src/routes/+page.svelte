<script lang="ts">
  import { writable } from 'svelte/store';
  import ChartBarSquareIcon from 'virtual:icons/heroicons/chart-bar-square';
  import Cog6ToothIcon from 'virtual:icons/heroicons/cog-6-tooth';
  import FolderIcon from 'virtual:icons/heroicons/folder';
  import GlobeAltIcon from 'virtual:icons/heroicons/globe-alt';
  import ServerIcon from 'virtual:icons/heroicons/server';
  import SignalIcon from 'virtual:icons/heroicons/signal';
  import XMarkIcon from 'virtual:icons/heroicons/x-mark';
  import Bars3Icon from 'virtual:icons/heroicons/bars-3';
  import ChevronRightIcon from 'virtual:icons/heroicons/chevron-right-solid';
  import ChevronUpDownIcon from 'virtual:icons/heroicons/chevron-up-down-solid';
  import MagnifyingGlassIcon from 'virtual:icons/heroicons/magnifying-glass-solid';
  import PlusIcon from 'virtual:icons/heroicons/plus-small';
  import { classes } from '../utils/helpers';
  import { navState } from '$lib/stores/app';

  // TODO: left off at seting up the authentication redirect stuff
  // NOTE: the docs is talking abotu redirecting to another route,
  // but a better way would be to detect the session and if there's no session
  // render a login component and NOT the logged in UI (or redirect to a /login route)
  // This is the next step

  export let data;
  let { datasets } = data;
  $: ({ datasets = [] } = data);
  console.log('datasets', datasets);

  navState.set({
    items: [],
  });

  // Data
  const navigation = [
    { name: 'Projects', href: '#', icon: FolderIcon, current: false },
    { name: 'Deployments', href: '#', icon: ServerIcon, current: true },
    { name: 'Activity', href: '#', icon: SignalIcon, current: false },
    { name: 'Domains', href: '#', icon: GlobeAltIcon, current: false },
    { name: 'Usage', href: '#', icon: ChartBarSquareIcon, current: false },
    { name: 'Settings', href: '#', icon: Cog6ToothIcon, current: false },
  ];
  const teams = [
    { id: 1, name: 'Planetaria', href: '#', initial: 'P', current: false },
    { id: 2, name: 'Protocol', href: '#', initial: 'P', current: false },
    { id: 3, name: 'Tailwind Labs', href: '#', initial: 'T', current: false },
  ];
  const statuses = {
    offline: 'text-gray-500 bg-gray-100/10',
    online: 'text-green-400 bg-green-400/10',
    error: 'text-rose-400 bg-rose-400/10',
  };
  const environments = {
    Preview: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    Production: 'text-indigo-400 bg-indigo-400/10 ring-indigo-400/30',
  };
  const deployments = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    href: '#',
    projectName: 'ios-app',
    teamName: 'Planetaria',
    status: 'offline',
    statusText: 'Initiated 1m 32s ago',
    description: 'Deploys from GitHub',
    environment: 'Preview',
  }));
  const activityItems = [
    {
      user: {
        name: 'Michael Foster',
        imageUrl:
          'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      },
      projectName: 'ios-app',
      commit: '2d89f0c8',
      branch: 'main',
      date: '1h',
      dateTime: '2023-01-23T11:00',
    },
    // More items...
  ];

  // State for sidebar
  let sidebarOpen = false;
  let filterOpen = false;
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
  function toggleFilter() {
    filterOpen = !filterOpen;
  }
</script>

<!-- disable everything for now:  -->

{#if sidebarOpen}
  <div class="fixed inset-0 bg-gray-900/80 transition-opacity ease-linear duration-300">
    <div class="fixed inset-0 bg-gray-900/80" />
  </div>

  <div class="fixed inset-0 flex transition ease-in-out duration-300 transform">
    <div class="relative mr-16 flex w-full max-w-xs flex-1 transition ease-in-out duration-300">
      <div
        class="absolute left-full top-0 flex w-16 justify-center pt-5 transition-opacity ease-in-out duration-300"
      >
        <button on:click={toggleSidebar}>
          <span class="sr-only">Close sidebar</span>
          <XMarkIcon />
        </button>
      </div>

      <!-- Sidebar content -->
      <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 ring-1 ring-white/10">
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                {#each navigation as item (item.name)}
                  <li>
                    <a
                      href={item.href}
                      class={classes(
                        item.current
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                      )}
                    >
                      <svelte:component this={item.icon} />
                      {item.name}
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
            <li>
              <div class="text-xs font-semibold leading-6 text-gray-400">Your teams</div>
              <ul role="list" class="-mx-2 mt-2 space-y-1">
                {#each teams as team (team.name)}
                  <li>
                    <a
                      href={team.href}
                      class={classes(
                        team.current
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                      )}
                    >
                      <span
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[0.625rem] font-medium text-gray-400 group-hover:text-white"
                      >
                        {team.initial}
                      </span>
                      <span class="truncate">{team.name}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
{/if}

<!-- Static sidebar for desktop -->

<div class="h-full w-full grow lg:flex">
  <aside class="hidden xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col h-full">
    <header class="flex items-center justify-between p-6 pb-0">
      <h2 class="font-semibold text-sm text-white">Your Datasets</h2>
      <a
        href="/new"
        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <PlusIcon />
        New
      </a>
    </header>
    <!-- Sidebar content -->
    <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 p-6">
      <nav class="flex flex-1 flex-col">
        <ul role="list" class="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" class="-mx-2 space-y-1">
              {#each navigation as item (item.name)}
                <li>
                  <a
                    href={item.href}
                    class={classes(
                      item.current
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <svelte:component this={item.icon} />
                    {item.name}
                  </a>
                </li>
              {/each}
            </ul>
          </li>
          <li>
            <div class="text-xs font-semibold leading-6 text-gray-400">Your teams</div>
            <ul role="list" class="-mx-2 mt-2 space-y-1">
              {#each teams as team (team.name)}
                <li>
                  <a
                    href={team.href}
                    class={classes(
                      team.current
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[0.625rem] font-medium text-gray-400 group-hover:text-white"
                    >
                      {team.initial}
                    </span>
                    <span class="truncate">{team.name}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
  <div class="flex-1 xl:flex overflow-y-auto">
    <main class="flex-grow">
      <header
        class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        <h1 class="text-base font-semibold leading-7 text-white">Home</h1>
        <!-- Sort dropdown functionality would need to be implemented using Svelte's state management and logic -->
        <!-- For the sake of brevity, a simplified dropdown structure is provided below -->
        <div class="relative">
          <button
            on:click={toggleFilter}
            class="flex items-center gap-x-1 text-sm font-medium leading-6 text-white"
          >
            Sort by
            <!-- Replace ChevronUpDownIcon with appropriate Svelte component or SVG -->
          </button>
          {#if filterOpen}
            <div
              class="absolute right-0 z-10 mt-2.5 w-40 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none"
            >
              <!-- Dropdown items -->
              <a href="#" class="block px-3 py-1 text-sm leading-6 text-gray-900">Name</a>
              <a href="#" class="block px-3 py-1 text-sm leading-6 text-gray-900">Date updated</a>
              <a href="#" class="block px-3 py-1 text-sm leading-6 text-gray-900">Environment</a>
            </div>
          {/if}
        </div>
      </header>

      <!-- Deployment list -->
      <ul role="list" class="divide-y divide-white/5">
        {#each datasets as dataset (dataset.id)}
          <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
            <div class="min-w-0 flex-auto">
              <div class="flex items-center gap-x-3">
                <!-- Replace with appropriate color based on deployment status -->
                <div class="flex-none rounded-full p-1">
                  {#if dataset.validationStatus === 'VALIDATED'}
                    <div class="h-2 w-2 rounded-full bg-green-400" />
                  {:else if dataset.validationStatus === 'PENDING' || dataset.validationStatus === 'UNDER_REVIEW'}
                    <div class="h-2 w-2 rounded-full bg-yellow-400" />
                  {:else if dataset.validationStatus === 'REJECTED'}
                    <div class="h-2 w-2 rounded-full bg-red-400" />
                  {:else}
                    <div class="h-2 w-2 rounded-full bg-current" />
                  {/if}
                </div>
                <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                  <a href={dataset.path} class="flex gap-x-2">
                    <span class="truncate">{dataset.owner.username}</span>
                    <span class="text-gray-400">/</span>
                    <span class="whitespace-nowrap">{dataset.slug}</span>
                  </a>
                </h2>
              </div>
              <div class="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400">
                <p class="truncate">{dataset.description}</p>
                <!-- SVG separator -->
                <svg viewBox="0 0 2 2" class="h-0.5 w-0.5 flex-none fill-gray-300">
                  <circle cx={1} cy={1} r={1} />
                </svg>
                <p class="whitespace-nowrap">{dataset.validationStatus}</p>
              </div>
            </div>
            <!-- Replace with appropriate color -->
            <div class="rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset">
              {dataset.isPublic ? 'public' : 'private'}
            </div>
            <ChevronRightIcon />
          </li>
        {/each}
      </ul>
    </main>

    <!-- Activity feed -->
    <aside class="shrink-0 border-t border-gray-200 lg:w-96 lg:border-t-0">
      <header
        class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        <h2 class="text-base font-semibold leading-7 text-white">Trending</h2>
        <a href="#" class="text-sm font-semibold leading-6 text-indigo-400">View all</a>
      </header>
      <ul role="list" class="divide-y divide-white/5">
        {#each activityItems as item (item.commit)}
          <li class="px-4 py-4 sm:px-6 lg:px-8">
            <div class="flex items-center gap-x-3">
              <img
                src={item.user.imageUrl}
                alt=""
                class="h-6 w-6 flex-none rounded-full bg-gray-800"
              />
              <h3 class="flex-auto truncate text-sm font-semibold leading-6 text-white">
                {item.user.name}
              </h3>
              <time dateTime={item.dateTime} class="flex-none text-xs text-gray-600"
                >{item.date}</time
              >
            </div>
            <p class="mt-3 truncate text-sm text-gray-500">
              Pushed to <span class="text-gray-400">{item.projectName}</span> (
              <span class="font-mono text-gray-400">{item.commit}</span> on
              <span class="text-gray-400">{item.branch}</span>)
            </p>
          </li>
        {/each}
      </ul>
    </aside>
  </div>
</div>
