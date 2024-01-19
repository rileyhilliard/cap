<script lang="ts">
  import { queryStore, gql, getContextClient } from '@urql/svelte';
  import type { Dataset } from '@backend/types';
  import Subnav from '../../components/Subnav.svelte';
  import type { NavigationItem } from '../../components/Subnav.svelte';
  import DB from 'virtual:icons/mdi/database-outline';
  import Star from 'virtual:icons/line-md/star-filled';
  import DocumentReport from 'virtual:icons/line-md/document-report';
  import ClipboardList from 'virtual:icons/line-md/clipboard-list';
  import { navState } from '$lib/stores/app';
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';

  const users = queryStore({
    client: getContextClient(),
    query: gql`
      query {
        datasets {
          id
          owner {
            username
          }
          slug
          path
        }
      }
    `,
  });

  const subscriptions = [];
  let datasets: Dataset[] = [];

  // Ensure reactivity: whenever $users.data changes, update datasets
  $: {
    if ($users.data && $users.data.datasets) {
      datasets = $users.data.datasets;
      console.log($users);
    }
  }

  subscriptions.push(
    page.subscribe(({ params: { entity } }) => {
      navState.set({
        items: [
          {
            name: entity,
            href: `/${entity}`,
          },
        ],
      });
    })
  );

  const subnav: NavigationItem[] = [
    { name: 'Overview', href: '#', current: true, icon: ClipboardList },
    { name: 'Datasets', href: '#', current: false, badge: 100, icon: DB },
    { name: 'Projects', href: '#', current: false, icon: DocumentReport },
    { name: 'Stars', href: '#', current: false, badge: 10, icon: Star },
  ];
  subscriptions.forEach(onDestroy);
</script>

<Subnav items={subnav} />
<div class="entity">
  <h1>This is the Entity Index page</h1>
  {#if $users.fetching}
    <p>Loading...</p>
  {:else if $users.error}
    <p>Oh no... {$users.error.message}</p>
  {:else}
    <ul>
      {#each datasets as dataset}
        <li><a href={dataset.path}>{dataset.owner.username}/{dataset.slug}</a></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
</style>
