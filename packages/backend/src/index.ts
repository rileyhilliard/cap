import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import { buildSchema } from 'type-graphql';
import { connectToDB } from './utils/db.js';
import logger from './utils/logger.js';
import { propertiesScraper } from './utils/properties-scraper.js';
import PropertyResolver, { fetchProperty } from './domains/property/property.resolvers.js';
import ApartmentResolver, { ApartmentMutationResolver } from './domains/apartment/apartment.resolvers.js';
import ZillowRentalResolver, { ZillowRentalMutationResolver } from './domains/rental/zillow.rental.resolvers.js';
import { apartmentsScraper } from './utils/apartments-scraper.js';
import { calculateAverageAndMedianRentalPrices } from './utils/queries.js';
import { putZillowResults, loadPage } from './utils/zillow.js';
const port = process.env.PORT || 4000;

// connect to the database
await connectToDB();

const schema = await buildSchema({
  resolvers: [ZillowRentalResolver, ZillowRentalMutationResolver, ApartmentResolver, ApartmentMutationResolver],
});

logger.debug('Express: Creating server');
const app = express();
const httpServer = http.createServer(app);
logger.debug('Express: Server created 🚀');
const server = new ApolloServer<MyContext>({ schema });

// Note you must call `start()` on the `ApolloServer`
// instance before passing the instance to `expressMiddleware`
logger.debug('Apollo: Starting server');
await server.start();
logger.debug('Apollo: Server started 🚀');




app.get('/v1/properties/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug('Looking up property schema', { id });
  // const prices = await calculateAverageAndMedianRentalPrices()
  // const apartments = await apartmentsScraper();
  const properties = await propertiesScraper(req, res);
  res.setHeader('Content-Type', 'application/json');
  res.json(properties.properties);
  logger.debug('Property resolved');
});

app.get('/v1/properties/:id/zil', async (req: Request, res: Response) => {
  const { id } = req.params;
  const results = await loadPage();
  res.setHeader('Content-Type', 'application/json');
  res.json(results);
  logger.debug('Property resolved');
});


app.get('/v1/properties/:id/schema', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug('Looking up property schema', { id });
  const property = await fetchProperty({ id });
  if (!property) {
    res.status(404).send(`Property ${id} not found`);
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.json(property);
  logger.debug('Property resolved');
})

app.get('/v1/dataset/:entity/:slug/del', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ msg: 'del is not implemented yet' });
})

// Specify the path where we'd like to mount our server
app.use(
  '/graphql',
  cors<cors.CorsRequest>(),
  bodyParser.json(),
  // expressMiddleware accepts the same arguments:
  // an Apollo Server instance and optional configuration options
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  }),
);

// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error('err handler', err)
//   res.status(400).json({ error: err.message });
// });

// Modified server startup
await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
logger.debug(`@backend ready @ http://localhost:${port}/graphql`);

interface MyContext {
  token?: string;
}