<script context="module" lang="ts">
  import type { SvelteComponent } from 'svelte';

  interface IconProps {
    // Define any specific props if necessary
  }

  interface SvgAttributes {
    viewBox?: string;
    xmlns?: string;
    version?: string;
    width?: number | string;
    height?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    strokeDasharray?: string | number;
    strokeDashoffset?: string | number;
    preserveAspectRatio?: string;
    transform?: string;
    x?: number | string;
    y?: number | string;
    xmlSpace?: string;
    // ... add other SVG attributes as needed
  }

  export type IconComponent = typeof SvelteComponent & {
    new (options: {
      target: Element;
      anchor?: Element;
      props?: IconProps;
      hydrate?: boolean;
      intro?: boolean;
    }): SvelteComponent<IconProps>;
  } & SvgAttributes;

  export interface NavigationItem {
    name: string;
    href: string;
    current: boolean;
    icon?: IconComponent;
    badge?: number;
  }
</script>

<script lang="ts">
  import Badge from './Badge.svelte'; // Assuming Badge is a Svelte component

  export let items: NavigationItem[];
</script>

<nav class="flex overflow-x-auto border-b border-white/10 py-1">
  <ul
    role="list"
    class="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8"
  >
    {#each items as item (item.name)}
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
</nav>
