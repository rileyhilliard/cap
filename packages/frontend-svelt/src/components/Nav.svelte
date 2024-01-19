<script lang="ts">
  import Beer from 'virtual:icons/line-md/beer-alt-twotone-loop';
  import Search from 'virtual:icons/line-md/search';
  import Bell from 'virtual:icons/line-md/bell';
  import { classes } from '../utils/helpers';
  import type { Session, SupabaseClient } from '@supabase/supabase-js';

  let open = false;

  export let navItems;
  export let session: Session | null;
  export let supabase: SupabaseClient;
  function toggleOpen() {
    open = !open;
  }

  async function logout() {
    await supabase.auth.signOut();
    toggleOpen();
  }
</script>

<nav>
  <div class="pt-3 p-2 sm:px-4 lg:px-8">
    <div class="relative flex items-center justify-between">
      <div class="flex items-center px-2 lg:px-0">
        <div class="flex-shrink-0">
          <a href="/"><Beer class="h-6 w-6 text-white" /></a>
        </div>
        <div class="hidden lg:ml-6 lg:block">
          <div class="flex">
            {#if navItems?.length}
              {#each navItems as item, idx}
                <span>
                  <a
                    href={item.href}
                    class={classes(
                      item.current
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'rounded-md p-2 text-sm font-medium'
                    )}
                  >
                    {item.name}
                  </a>
                  {#if navItems.length > 1 && idx !== navItems.length - 1}
                    <span>/</span>
                  {/if}
                </span>
              {/each}
            {/if}
          </div>
        </div>
      </div>
      <div class="flex flex-1 justify-center px-2 lg:ml-6 lg:justify-end">
        <div class="w-full max-w-lg lg:max-w-xs">
          <label for="search" class="sr-only">Search</label>
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search class="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="search"
              name="search"
              class="block w-full rounded-md border-0 bg-gray-700 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
              placeholder="Search"
              type="search"
            />
          </div>
        </div>
      </div>
      <div class="flex lg:hidden">
        <!-- Mobile menu button -->
        <button
          on:click={toggleOpen}
          class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
        >
          {#if open}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="2em"
              height="2em"
              viewBox="0 0 24 24"
              {...$$props}
              ><path
                fill="currentColor"
                d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
              /></svg
            >
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"
              ><path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="4"
                d="M7.95 11.95h32m-32 12h32m-32 12h32"
              /></svg
            >
          {/if}
        </button>
      </div>
      Does Session exist? {session ? 'true' : 'false'}
      <div class="hidden lg:ml-4 lg:block">
        <div class="flex items-center">
          {#if session}
            <button
              type="button"
              class="relative flex-shrink-0 rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <Bell class="h-5 w-5 m-1" />
            </button>

            <!-- Profile dropdown -->
            <!-- Since Svelte doesn't have a direct equivalent to the Menu component, the functionality might need to be implemented differently -->
            <div class="relative ml-4 flex-shrink-0">
              <button
                on:click={toggleOpen}
                class="relative flex rounded-full bg-gray-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                <img
                  class="h-8 w-8 rounded-full"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                />
              </button>
              <!-- Profile dropdown menu -->
              {#if open}
                <div
                  class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >Your Profile</a
                  >
                  <a
                    href="/settings"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a
                  >
                  <button
                    on:click={logout}
                    class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >Sign out
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <a
              href="/login"
              class="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md p-2 text-sm font-medium"
              >Log In</a
            >
            <a
              href="/signup"
              class="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md p-2 text-sm font-medium"
              >Sign Up</a
            >
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if open}
    <!-- Mobile Menu Panel -->
    <div class="lg:hidden space-y-1 px-2 pb-3 pt-2">
      {#if navItems?.length}
        {#each navItems as item}
          <button
            on:click={toggleOpen}
            class="block rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
          >
            {item.name}
          </button>
        {/each}
      {/if}
      {#if session}
        <div class="border-t border-gray-700 pb-3 pt-4 px-5 flex items-center">
          <img
            class="h-10 w-10 rounded-full"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          />
          <div class="ml-3">
            <div class="text-base font-medium text-white">Tom Cook</div>
            <div class="text-sm font-medium text-gray-400">tom@example.com</div>
          </div>
          <button
            class="relative ml-auto flex-shrink-0 rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <!-- BellIcon placeholder -->
            🔔
          </button>
        </div>
        <div class="mt-3 space-y-1 px-2">
          <a
            href="#"
            class="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
            >Your Profile</a
          >
          <a
            href="/settings"
            class="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
            >Settings</a
          >
          <button
            on:click={logout}
            class="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
            >Sign out
          </button>
        </div>
      {:else}
        <div class="mt-3 space-y-1 px-2">
          <a
            on:click={toggleOpen}
            href="/login"
            class="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
            >Log In</a
          >
          <a
            on:click={toggleOpen}
            href="/signup"
            class="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
            >Sign Up</a
          >
        </div>
      {/if}
    </div>
  {/if}
</nav>
