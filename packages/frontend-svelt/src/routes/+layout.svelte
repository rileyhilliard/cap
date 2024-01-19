<script lang="ts">
  import '../app.postcss';
  import './styles.css';
  import Nav from '../components/Nav.svelte';
  import { client } from '../utils/urqlClient';
  import { setContextClient } from '@urql/svelte';
  import { navState, type NavItem } from '$lib/stores/app';
  // ------ supabase ------
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { invalidate } from '$app/navigation';

  export let data;
  const subscriptions = [];

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || session?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
        return;
      }

      console.log('onAuthStateChange', event);
      switch (event) {
        case 'SIGNED_OUT': {
          // delete cookies on sign out
          const expires = new Date(0).toUTCString();
          document.cookie = `my-access-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
          document.cookie = `my-refresh-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
          break;
        }
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED': {
          const maxAge = 30 * 3 * 24 * 60 * 60; // 3 months expiry
          document.cookie = `my-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
          document.cookie = `my-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
          if (!session) {
            supabase.auth.getSession().then(response => {
              console.log('refreshed session, redirecting', response.data.session);
              session = response.data.session;
              if (window.location.href !== '/') {
                window.location.href = '/';
              }
              return response;
            });
          }
          break;
        }
        default:
          // Handle any other events that are not covered above
          break;
      }
    });
    return () => subscription.unsubscribe();
  });

  let navItems: NavItem[] = [];
  subscriptions.push(
    navState.subscribe(state => {
      console.count('layout navState.subscribe()');
      navItems = state.items;
    })
  );

  setContextClient(client);
  subscriptions.forEach(onDestroy);
</script>

<div class="app">
  <Nav {navItems} {supabase} {session} />
  <slot {data} />
  <footer>
    <p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 12px;
  }

  footer a {
    font-weight: bold;
  }

  @media (min-width: 480px) {
    footer {
      padding: 12px 0;
    }
  }
</style>
