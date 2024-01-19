<script lang="ts">
  export let error: Error;
  export let status: number;
</script>

<main class="grid min-h-full place-items-center bg-gray-900 px-6 py-24 sm:py-32 lg:px-8">
  {#if status === 404}
    <div class="text-center">
      <p class="text-base font-semibold text-indigo-600">404</p>
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">Page not found</h1>
      <p class="mt-6 text-base leading-7 text-gray-600">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="/"
          class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >Go back home</a
        >
        <a href="/contact" class="text-sm font-semibold text-white"
          >Contact support <span aria-hidden="true">&rarr;</span></a
        >
      </div>
    </div>
  {:else}
    <h1 class="text-3xl font-bold tracking-tight text-white sm:text-5xl">An error occurred</h1>
    <p class="mt-4 text-lg text-gray-600">We're sorry, something went wrong.</p>
    {#if status === 500}
      <p class="mt-2 text-base text-gray-500">Internal Server Error</p>
    {:else}
      <p class="mt-2 text-base text-gray-500">Error {status}: {error?.message}</p>
    {/if}
    <div class="mt-6">
      <a href="/" class="text-base font-semibold text-indigo-600 hover:text-indigo-500"
        >Go back home</a
      >
    </div>
  {/if}
</main>

<style>
  /* Your global CSS might already handle this */
</style>
