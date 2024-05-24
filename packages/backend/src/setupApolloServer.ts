import { Express } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSchema } from 'type-graphql';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApartmentMutationResolver } from '@domains/apartment/apartment.resolvers';
import { ZillowRentalMutationResolver } from '@domains/rental/zillow.rental.resolvers';

export async function setupApolloServer(app: Express): Promise<void> {
  const schema = await buildSchema({
    resolvers: [ZillowRentalMutationResolver, ApartmentMutationResolver],
  });

  const server = new ApolloServer<{ token?: string }>({ schema });
  await server.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token as string | undefined }),
    }),
  );
}