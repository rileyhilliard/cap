<script context="module">
  export async function load({ url }) {
    // You can access query params directly from the `url` object
    const queryParams = url.searchParams;
    // For example, if you have a query param named 'id'
    const id = queryParams.get('id');
    // You can pass this as a prop to the page component
    return { props: { id } };
  }
</script>

<!-- Login.svelte -->
<script lang="ts">
  import Account from 'virtual:icons/line-md/account';
  import Shield from 'virtual:icons/mdi/shield-account-variant-outline';
  import Database from 'virtual:icons/mdi/database-cog-outline';

  export let data;
  let { supabase } = data;
  $: ({ supabase, user = {} } = data);

  const inputClasses =
    'block w-full rounded-md border-0 bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6';
</script>

<div class="flex flex-col">
  <!-- 3 column wrapper -->
  <div class="mx-auto w-full max-w-7xl grow lg:flex xl:px-2">
    <!-- Left sidebar & main wrapper -->
    <div class="flex-1 xl:flex">
      <!-- Static sidebar for desktop -->
      <div class="lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <!-- Sidebar component, swap this element with another sidebar if you like -->
        <div class="flex grow flex-col gap-y-5 overflow-y-auto px-2">
          <nav class="flex flex-1 flex-col">
            <ul role="list" class="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" class="-mx-2 space-y-1">
                  <li>
                    <!-- Current: "bg-gray-50 text-indigo-600", Default: "text-white hover:text-white hover:bg-gray-700" -->
                    <a
                      href="#"
                      class="bg-gray-700 text-white group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    >
                      <Account class="h-6 w-6 shrink-0 text-white group-hover:text-white" />
                      Public Profile
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      class="text-white hover:text-white hover:bg-gray-700 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    >
                      <Shield class="h-6 w-6 shrink-0 text-white group-hover:text-white" />
                      Password and Authentication
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      class="text-white hover:text-white hover:bg-gray-700 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    >
                      <Database class="h-6 w-6 shrink-0 text-white group-hover:text-white" />
                      Datasets
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div class="px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6">
        <!-- Main area -->
      </div>
    </div>

    <div class="shrink-0 px-4 py-6 sm:px-6 lg:w-96 lg:pr-8 xl:pr-6">
      <h2 class="text-base font-bold">Profile picture</h2>
      <form
        data-turbo="false"
        class="edit_user"
        id=""
        novalidate="novalidate"
        aria-label="Profile picture"
        action="/upload"
        accept-charset="UTF-8"
        method="post"
      >
        <input type="hidden" name="_method" value="put" autocomplete="off" /><input
          type="hidden"
          name="authenticity_token"
          value={user.id}
        />

        <file-attachment
          input="avatar_upload"
          class=""
          data-alambic-owner-id="2060731"
          data-alambic-owner-type="User"
          data-upload-policy-url="/upload/policies/avatars"
          ><input
            type="hidden"
            value="2arMUlAH0x6F0LazgIO0kbwg_3Be2ukmFlNui9Xc3CKI0KLrOMqHI7sc6QxWvlSATZPGaCFzrh0_TtfkE8LXWA"
            data-csrf="true"
            class="js-data-upload-policy-url-csrf"
          />
          <input
            type="file"
            id="avatar_upload"
            class="manual-file-chooser width-full ml-0"
            hidden=""
          />
        </file-attachment>
      </form>
    </div>
  </div>
</div>
