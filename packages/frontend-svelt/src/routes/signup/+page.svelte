<!-- Login.svelte -->
<script lang="ts">
  import { redirect } from '@sveltejs/kit';
  import { createClient } from '@supabase/supabase-js';
  import { onMount } from 'svelte';
  import { mutationStore, gql, getContextClient } from '@urql/svelte';
  import Error from '../+error.svelte';

  export let data;
  let { supabase } = data;
  $: ({ supabase } = data);

  // Initialize Supabase client
  // const supabaseUrl = 'your_supabase_url';
  // const supabaseAnonKey = 'your_supabase_anon_key';
  // const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const CREATE_USER_MUTATION = `
  mutation CreateUser($userData: NewUser!) {
    createUser(userData: $userData) {
      id
      email
    }
  }
`;

  // Function to handle the login
  async function register({ email, password }: { email: string; password: string }) {
    const urqlClient = getContextClient();
    const result = await supabase.auth.signUp({
      email,
      password,
    });

    if (result.error) {
      console.error('Error signing up', result.error);
      return;
    }

    if (!result.data.user) {
      throw new Error("The user creation was successful, but didn't return a user object");
    }

    mutationStore({
      client: urqlClient,
      query: CREATE_USER_MUTATION,
      variables: { supaBaseId: result.data.user.id, email },
    }).subscribe(result => {
      console.log('result:', result);
    });
    //

    const {
      data: { user, session },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (_error) {
      console.error('Error signing in user', error);
      return;
    }

    // Redirect or do something with the user/session
    console.log('User:', user);
    console.log('Session:', session);
    currentStep = 2;
    // throw redirect(302, '/');
  }

  async function updateUser(properties) {
    const session = await supabase.auth.getSession();
    if (!session) {
      console.error('No session found');
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.updateUser(properties);

    if (error) {
      console.error('Error updating user', error);
      return;
    }

    // Redirect or do something with the user/session
    console.log('User:', user);
    currentStep = 2;
    // throw redirect(302, '/');
  }

  // To handle the login on form submission
  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (event.target instanceof HTMLFormElement) {
      const formData = new FormData(event.target);
      const email = String(formData.get('email'));
      const password = String(formData.get('password'));
      register({ email, password });
    }
  }

  // On component mount
  onMount(() => {
    // Check if the user is already logged in
    const session = supabase.auth?.session;

    if (session) {
      // Redirect to home page or dashboard
      console.log('Already logged in, redirecting...');
    }
  });
  const inputClasses =
    'block w-full rounded-md border-0 bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6';
  let currentStep = 1;
</script>

<div class="flex min-h-full flex-col px-6 py-12 lg:px-8">
  {#if currentStep === 1}
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
        Sign up for an account
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <form class="space-y-6" action="#" method="POST" on:submit|preventDefault={handleSubmit}>
        <div>
          <label for="email" class="block text-sm font-medium leading-6 text-white"
            >Email address</label
          >
          <div class="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class={inputClasses}
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label for="password" class="block text-sm font-medium leading-6 text-white"
              >Password</label
            >
          </div>
          <div class="mt-2">
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class={inputClasses}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >Next</button
          >
        </div>
      </form>

      <div class="space-y-6 mt-6 text-center">
        Already have an account? <a
          href="/login"
          class="font-semibold text-indigo-400 hover:text-indigo-300">Log in</a
        >
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4">
        <a
          href="#"
          class="flex w-full items-center justify-center gap-3 rounded-md bg-[#1D9BF0] px-3 py-1.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84"
            />
          </svg>
          <span class="text-sm font-semibold leading-6">Twitter</span>
        </a>

        <a
          href="#"
          class="flex w-full items-center justify-center gap-3 rounded-md bg-[#24292F] px-3 py-1.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24292F]"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-semibold leading-6">GitHub</span>
        </a>
      </div>
    </div>
  {:else if currentStep === 2}
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
        Complete your profile
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto">
      <form class="mspace-y-6" action="#" method="POST" on:submit|preventDefault={updateUser}>
        <div class="mt-6 grid grid-cols-2 gap-4">
          <div>
            <div class="flex items-center justify-between">
              <label for="firstName" class="block text-sm font-medium leading-6 text-white"
                >First Name</label
              >
            </div>
            <div class="mt-2">
              <input
                id="firstName"
                name="firstName"
                type="firstName"
                autocomplete="given-name"
                required
                class={inputClasses}
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label for="lastName" class="block text-sm font-medium leading-6 text-white"
                >Last Name</label
              >
            </div>
            <div class="mt-2">
              <input
                id="lastName"
                name="lastName"
                type="lastName"
                autocomplete="family-name"
                required
                class={inputClasses}
              />
            </div>
          </div>

          <div>
            <label for="username" class="block text-sm font-medium leading-6 text-white"
              >Username</label
            >
            <div class="mt-2">
              <input id="username" name="username" type="username" required class={inputClasses} />
            </div>
          </div>

          <!-- TODO: when custom Avatars are supported -->
          <!-- <div>
          <label for="avatar" class="block text-sm font-medium leading-6 text-white"
            >Avatar <span>(Optional)</span></label
          >
          <div class="mt-2">
            <input
              id="avatar"
              name="avatar"
              type="avatar"
              class="block w-full rounded-md border-0 bg-black text-white placeholder-gray-400 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
            />
          </div>
        </div> -->

          <div>
            <label for="github" class="block text-sm font-medium leading-6 text-white"
              >Github Username <span>(Optional)</span></label
            >
            <div class="mt-2">
              <input id="github" name="github" type="github" class={inputClasses} />
            </div>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-1 gap-4">
          <div class="flex h-6 text-sm leading-6 items-center">
            <input
              id="comments"
              name="comments"
              type="checkbox"
              checked={true}
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <p class="text-gray-500 ml-3">
              I have read and agree with the <a
                href="/tos"
                class="text-indigo-400 hover:text-indigo-300">Terms of Service</a
              >
              and the
              <a href="/coc" class="text-indigo-400 hover:text-indigo-300">Code of Conduct</a>
            </p>
          </div>

          <div>
            <button
              type="submit"
              class="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >Create Account</button
            >
          </div>
        </div>
      </form>

      <div class="space-y-6 mt-6 text-center">
        Already have an account? <a
          href="/login"
          class="font-semibold text-indigo-400 hover:text-indigo-300">Log in</a
        >
      </div>
    </div>
  {/if}
</div>
