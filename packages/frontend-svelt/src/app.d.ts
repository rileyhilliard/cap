import 'unplugin-icons/types/svelte';
import type { Session } from '@supabase/supabase-js';
import { supabaseService } from '$lib/services/supabase';


// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {
      session: Session | null
    }
    // interface Platform {}
    interface Locals {
      supabase: supabaseService;
      getSession: () => Promise<Session | null>;
    }
  }
}

export { };