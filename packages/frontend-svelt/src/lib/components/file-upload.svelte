<script lang="ts">
  import type { Dataset } from '@backend/types';
  import { writable } from 'svelte/store';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Spinner from 'virtual:icons/svg-spinners/pulse-rings-multiple';
  import Success from 'virtual:icons/line-md/circle-twotone-to-confirm-circle-twotone-transition';
  import Alert from 'virtual:icons/line-md/alert';
  import FileIcon from 'virtual:icons/line-md/document-report-twotone';
  import dataManager from '$lib/services/data-manager';

  export let dataset: Dataset;
  export let onSuccess: (result: Dataset) => void;

  let fileForm: HTMLFormElement;
  let isDragOver = false;
  let isUnsupportedFileType = false;
  const supportedFileTypes = ['application/json', 'text/csv'];
  const uploadInProgress = writable(false);
  const uploadedFiles = writable([]);
  const uploadComplete = writable(false);
  const uploadError = writable(false);
  const progressBar = tweened(0, { duration: 10000, easing: cubicOut });

  // Function for handling form submission
  async function handleSubmit(event?: Event) {
    event?.preventDefault?.();
    if (dataset?.id && $uploadedFiles.length) {
      return dataManager.updateDataset({
        id: dataset.id,
        files: $uploadedFiles,
      });
    }
  }

  async function uploadDataset(file: File) {
    console.log('uploadDataset', file, dataset?.id);
    if (!file || !dataset?.id) return;

    uploadInProgress.set(true);
    uploadComplete.set(false);
    uploadError.set(false);

    try {
      const formData = new FormData();
      formData.append('type', 'dataset');
      formData.append('id', dataset.id);
      formData.append('file', file);

      const response = await fetch('/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');

      const uploadResults = await response.json();
      uploadedFiles.set($uploadedFiles.concat(uploadResults.files));
      const result = await handleSubmit();
      console.log('uploadDataset', result);
      if (result?.files) {
        dataset.files = result?.files;
      }

      uploadComplete.set(true);
      onSuccess(dataset);
      return result;
    } catch (error) {
      console.error(error);
      uploadError.set(true);
    } finally {
      uploadInProgress.set(false);
    }
  }

  async function UploadFiles(files: FileList | null | void) {
    if (files?.length) {
      const filesArray = Array.from(files);
      await Promise.all(
        filesArray.map(async file => {
          if (isFileTypeSupported(file)) {
            // TODO: wait for first to complete before starting next
            return uploadDataset(file);
          } else {
            // Handle unsupported file type case
            // TODO: track state in single files array and update success/error state
            isUnsupportedFileType = true;
          }
        })
      );
    }
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    UploadFiles(input?.files);
  }

  // Reactive subscription for the progress bar
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

  function isFileTypeSupported(file: File) {
    return supportedFileTypes.includes(file.type);
  }

  // Handles files when they are dropped on the upload area
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    isUnsupportedFileType = false;

    const files = event.dataTransfer?.files;
    UploadFiles(files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
    isUnsupportedFileType = false;
  }

  function handleDragLeave() {
    isDragOver = false;
    isUnsupportedFileType = false;
  }
</script>

<form on:submit={handleSubmit} bind:this={fileForm}>
  {#if $uploadedFiles.length}
    {#each $uploadedFiles as file}
      <p class="text-white">Uploaded file: {file.name}</p>
    {/each}
  {/if}
  <div>
    <label for="file-upload" class="block leading-6 font-semibold text-lg text-white"
      >Upload a Dataset File</label
    >
    <div
      id="upload-area"
      class="mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-6 py-10 relative"
      role="button"
      aria-label="Drop files here to upload"
      tabindex="0"
      class:bg-gray-900={isDragOver}
      class:bg-red-100={isUnsupportedFileType}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragenter={handleDragOver}
      on:dragleave={handleDragLeave}
    >
      <div class="absolute top-0 left-0 h-full bg-gray-500/10" style="width: {$progressBar}%" />
      <div class="text-center">
        <div class="mx-auto h-12 w-12">
          {#if $uploadInProgress}
            <Spinner class="h-12 w-12 text-blue-500" />
          {:else if $uploadComplete}
            <Success class="h-12 w-12 text-green-500" />
          {:else if $uploadError}
            <Alert class="h-12 w-12 text-red-500" />
          {:else}
            <FileIcon class="h-12 w-12 text-gray-500" />
          {/if}
        </div>
        {#if isDragOver}
          <div class="mt-4 flex text-sm leading-6 text-gray-400">
            <p class=" font-semibold text-white">Drop your file here</p>
          </div>
        {:else}
          <div class="mt-4 flex text-sm leading-6 text-gray-400">
            <label
              for="file-upload"
              class="px-1 relative cursor-pointer rounded-md bg-gray-900 font-semibold text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-500"
            >
              <span> Upload a file </span>
            </label>
            <p class="pl-1">or drag and drop</p>
          </div>
        {/if}
        <p class="text-xs leading-5 text-gray-400">only CSV or JSON is supported</p>
      </div>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        class="sr-only"
        accept=".json,.csv"
        disabled={$uploadInProgress}
        on:change={handleFileChange}
      />
    </div>
    <!-- <button type="submit" class="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
    >Upload</button
  > -->
  </div>
</form>
