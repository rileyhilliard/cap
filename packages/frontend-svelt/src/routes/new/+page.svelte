<script lang="ts">
  import CheckMark from 'virtual:icons/line-md/circle-to-confirm-circle-transition';
  import { inputClasses } from '../../utils/helpers';
  import dataManager from '$lib/services/data-manager';
  import type { CreateDatasetInput } from '$lib/services/data-manager';
  type FormDataEntryValue = string | File;
  // TypeScript script area for any logic or data handling
  export let data;
  let isFormValid = false;
  let { user } = data;
  $: ({ user = {} } = data);
  $: isFormValid = isValidDatasetName(formModel.slug);
  let formModel = {
    owner: user?.username ?? '',
    slug: '',
    description: '',
  };

  function isValidDatasetName(name: string) {
    return /^[a-z0-9-]+$/.test(name);
  }

  async function handleSubmit(event: Event) {
    if (user?.id && event.target instanceof HTMLFormElement) {
      const formData = new FormData(event.target);

      // Explicitly map form fields to CreateDatasetInput
      const post: CreateDatasetInput = {
        description: formData.get('description'),
        owner: user.id,
        slug: formData.get('slug'),
        isPublic: formData.get('visibility') === 'PUBLIC',
      };

      console.log('post', post);

      const result = await dataManager.createDataset(post).catch(e => console.error(e));
      if (result?.path) {
        window.location.href = result?.path;
      }
    }
  }

  import { writable } from 'svelte/store';

  const datasetOptions = [
    { id: 1, title: 'Public', value: 'PRIVATE', description: 'Everyone can see your dataset' },
    { id: 2, title: 'Private', value: 'PUBLIC', description: 'Only you can see your dataset' },
  ];

  const selectedOption = writable(datasetOptions[0]);
</script>

<div class="bg-gray-900 overflow-y-auto">
  <div class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 px-6 lg:px-8">
    <div class="mx-auto max-w-2xl lg:mx-0">
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Create a new Dataset
      </h1>
      <p class="mt-6 text-lg leading-8 text-gray-300">
        Welcome to the 'Create a Dataset' page, where your data aspirations become reality. Here,
        every dataset is a puzzle waiting to be solved, and you hold the pieces. Start crafting your
        data story, one number at a time!
      </p>
    </div>
    <form class="space-y-6" action="#" method="POST" on:submit|preventDefault={handleSubmit}>
      <div>
        <div class="mt-2 flex">
          <div class="w-1/2">
            <label for="owner" class="block text-sm font-medium leading-6 text-white">Owner</label>
            <input
              id="owner"
              readonly
              name="owner"
              type="text"
              bind:value={user.username}
              required
              class={inputClasses}
            />
          </div>

          <div class="text-2xl mx-1 flex flex-col justify-end">/</div>
          <div class="w-1/2">
            <label for="slug" class="block text-sm font-medium leading-6 text-white"
              >Dataset Name</label
            >
            <div class="relative">
              <input
                id="slug"
                name="slug"
                placeholder="world-bank-development-indicators"
                bind:value={formModel.slug}
                type="text"
                autocomplete="off"
                required
                class={inputClasses}
              />
              {#if !isValidDatasetName(formModel.slug) && formModel.slug !== ''}
                <p class="error-message text-sm text-red-500 absolute">
                  Dataset name must be lowercase and contain no spaces (dashes allowed).
                </p>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label for="description" class="block text-sm font-medium leading-6 text-white"
            >Description (Optional)</label
          >
        </div>
        <div class="mt-2">
          <input
            id="description"
            name="description"
            type="text"
            placeholder="Describe your dataset's story in a nutshell...or a data cell!"
            bind:value={formModel.description}
            class={inputClasses}
          />
        </div>
      </div>
      <fieldset>
        <legend class="text-base font-semibold leading-6 text-white"
          >Who Should See Your Data? Public Eyes or Private Spies?</legend
        >

        <div class="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
          {#each datasetOptions as datasetOption}
            <!-- Active: "border-indigo-600 ring-2 ring-indigo-600", Not Active: "border-gray-300" -->
            <label
              class="relative flex cursor-pointer rounded-lg border bg-black p-4 shadow-sm focus:outline-none {$selectedOption.id ===
              datasetOption.id
                ? 'border-indigo-600 ring-2 ring-indigo-600'
                : 'border-gray-800'}"
            >
              <input
                type="radio"
                name="visibility"
                checked={$selectedOption.id === datasetOption.id}
                value={datasetOption.value}
                class="sr-only"
                on:click={() => ($selectedOption = datasetOption)}
              />
              <span class="flex flex-1">
                <span class="flex flex-col">
                  <span class="block text-sm font-medium">{datasetOption.title}</span>
                  <span class="mt-1 flex items-center text-sm text-gray-300"
                    >{datasetOption.description}</span
                  >
                </span>
              </span>
              <!-- Not Checked: "invisible" -->
              {#if $selectedOption.id === datasetOption.id}
                <CheckMark class="h-5 w-5 text-indigo-600" />
              {/if}
              <span
                class="pointer-events-none absolute -inset-px rounded-lg {$selectedOption.id ===
                datasetOption.id
                  ? 'border border-indigo-600'
                  : 'border-2 border-transparent'}"
                aria-hidden="true"
              />
            </label>
          {/each}
        </div>
      </fieldset>

      <div class="rounded-md bg-gray-800 p-4 flex">
        <div class="ml-3 flex-1 md:flex md:justify-between">
          <p class="text-sm text-gray-200">
            Once your dataset is created, you can upload your files using the web interface or git.
          </p>
        </div>
      </div>

      <div>
        <button
          disabled={!isFormValid}
          type="submit"
          class={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm
          ${
            !isFormValid
              ? 'bg-gray-500 text-gray-300'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white'
          }
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`}
        >
          {!isFormValid ? 'Dataset Name Required' : 'Create'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .error-message {
    bottom: -46px; /* Adjust this value based on your design */
    left: 0;
  }
</style>
