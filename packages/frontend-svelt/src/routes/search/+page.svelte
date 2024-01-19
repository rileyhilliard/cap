<script context="module">
  import { query } from 'svelte-apollo';
  import { gql } from '@apollo/client/core';

  // // TODO: move this to a single place in the app hierarchy (the top level)
  // setClient(client)

  const GET_ENTITIES = gql`
    query GetEntities {
      entities {
        id
        username
        email
        type
        organizationDetails {
          name
          description
        }
      }
    }
  `;

  const entities = query(GET_ENTITIES);
  debugger;
</script>

<div class="search">
  <h1>This is the Search page</h1>
  {#if $entities.loading}
    <p>Loading...</p>
  {:else if $entities.error}
    <p>Error: {$entities.error.message}</p>
  {:else}
    <ul>
      {#each $entities.data.entities as entity (entity.id)}
        <li>
          {entity.username} ({entity.email})
          {#if entity.organizationDetails}
            <div>
              <strong>{entity.organizationDetails.name}</strong>
              <p>{entity.organizationDetails.description}</p>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
</style>
