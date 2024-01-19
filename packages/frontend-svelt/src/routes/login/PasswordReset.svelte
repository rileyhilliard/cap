<script lang="ts">
  import type { SupabaseService } from '$lib/services/supabase';
  import { goto } from '$app/navigation';
  // import { toast } from './Toast.svelte'; // Assume a toast component for notifications

  export let supabase: SupabaseService;
  export let resetEmail: string;

  let email = resetEmail || '';
  let password = '';
  let confirmPassword = '';
  let loading = false;

  async function resetPassword() {
    if (password !== confirmPassword) {
      console.log('Passwords must match!', 'error');
      return;
    }

    try {
      loading = true;
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) throw error;

      console.log('Your password has been reset!', 'success');
      goto('/login');
    } catch (error) {
      console.log('Failed to reset password:', error);
    } finally {
      loading = false;
    }
  }
  const inputClasses =
    'block w-full rounded-md border-0 bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6';
</script>

<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
  <p class="text-center">
    Almost there! Create a new password that's as strong as your coffee on a Monday morning. Make it
    memorable, but unlike that one-hit wonder from the 90s, don't share it with everyone!
  </p>
  <form on:submit|preventDefault={resetPassword} class="space-y-6">
    <div>
      <label for="email" class="block text-sm font-medium leading-6 text-white">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="mario@nintendo.com (it's-a me, your email!)"
        required
        class={inputClasses}
      />
    </div>
    <div>
      <label for="password" class="block text-sm font-medium leading-6 text-white"
        >New Password</label
      >
      <input
        id="password"
        type="password"
        bind:value={password}
        placeholder="••••••••"
        autocomplete="new-password"
        required
        minlength="8"
        class={inputClasses}
      />
    </div>
    <div>
      <label for="confirmPassword" class="block text-sm font-medium leading-6 text-white"
        >Confirm New Password</label
      >
      <input
        id="confirmPassword"
        type="password"
        bind:value={confirmPassword}
        placeholder="••••••••"
        autocomplete="new-password"
        required
        minlength="8"
        class={inputClasses}
      />
    </div>
    <div>
      <button
        type="submit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={loading}
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </div>
  </form>
</div>
