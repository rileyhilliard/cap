import type { SupabaseService } from '$lib/services/supabase';
import type { Session } from '@supabase/supabase-js';
import { writable } from 'svelte/store';

export type NavItem = {
  name: string;
  href: string;
  current?: boolean;
};

export type NavState = {
  items: NavItem[];
};

export const navState = writable<NavState>({
  items: []
});

export const sessionState = writable<Session | null>(null);
export const supabaseService = writable<SupabaseService | null>(null);