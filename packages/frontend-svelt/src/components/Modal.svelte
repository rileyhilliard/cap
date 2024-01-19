<script lang="ts">
  export let showModal: boolean; // boolean

  let dialog: HTMLDialogElement | null = null; // HTMLDialogElement

  $: if (dialog && showModal) {
    dialog.showModal();
  } else if (dialog && showModal === false) {
    dialog.close();
  }

  function handleClose() {
    showModal = false;
  }

  function handleDialogClick() {
    if (dialog) dialog.close();
  }

  function handleContentClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
  class="inset-0 overflow-y-auto rounded-lg bg-black"
  bind:this={dialog}
  on:close={handleClose}
  on:click|self={handleDialogClick}
>
  <div
    class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 text-white"
  >
    <div
      class="relative transform overflow-hidden rounded-lg px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:w-full sm:max-w-lg sm:p-6"
    >
      <div class="mt-3 text-center sm:mt-5">
        <slot name="header" />
        <div class="mt-2">
          <slot />
        </div>
        <slot name="actions" />
        <slot name="footer" />
      </div>
    </div>
  </div>
</dialog>

<style>
  dialog::backdrop {
    background: rgb(70 70 70 / 45%);
  }
  dialog[open] {
    animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes zoom {
    from {
      transform: scale(0.95);
    }
    to {
      transform: scale(1);
    }
  }
  dialog[open]::backdrop {
    animation: fade 0.2s ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
