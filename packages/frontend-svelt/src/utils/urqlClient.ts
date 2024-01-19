import { Client, cacheExchange, fetchExchange } from '@urql/core';

export const client: Client = new Client({
  url: 'http://localhost:3000/graphql', // replace with your GraphQL endpoint
  fetch,
  exchanges: [cacheExchange, fetchExchange],
});
