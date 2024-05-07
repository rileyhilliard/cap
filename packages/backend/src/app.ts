import 'reflect-metadata';
import { Request, Response } from 'express';
import type { Express } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import { buildSchema } from 'type-graphql';
import logger from '@utils/logger';
import { propertiesScraper } from '@utils/properties-scraper';
import { fetchProperty } from '@domains/property/property.resolvers';
import ApartmentResolver, { ApartmentMutationResolver } from '@domains/apartment/apartment.resolvers';
import ZillowRentalResolver, { ZillowRentalMutationResolver } from '@domains/rental/zillow.rental.resolvers';
import { scrapeZillowRentals, scrapeZillowProperties, calculateAverageAndMedianRentalPrices } from '@utils/zillow';
import ElasticSearch from '@utils/elastic-search';
import { analyzeRentalData } from '@utils/market-report';

export async function application(app: Express) {
  const schema = await buildSchema({
    resolvers: [ZillowRentalResolver, ZillowRentalMutationResolver, ApartmentResolver, ApartmentMutationResolver],
  });

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

  app.get('/v1/zillow/:regionId', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/zillow/${regionId}`);
    const es = ElasticSearch.getInstance();
    const results = await es.data.get(regionId);
    res.json(results);
    console.timeEnd(`/v1/zillow/${regionId}`);
  });

  app.get('/v1/zillow/:rentalIndex/:propertyIndex', async (req: Request, res: Response) => {
    const { rentalIndex, propertyIndex } = req.params;
    console.time(`/v1/zillow/${rentalIndex}/${propertyIndex}`);
    const report = await calculateAverageAndMedianRentalPrices(rentalIndex, propertyIndex);
    res.json(report);
    console.timeEnd(`/v1/zillow/${rentalIndex}/${propertyIndex}`);
  });

  app.get('/v1/zillow/:regionId/report', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/zillow/${regionId}/compute`);
    const report = await analyzeRentalData(regionId);
    res.json(report);
    console.timeEnd(`/v1/zillow/${regionId}/compute`);
  });

  app.put('/v1/zillow/:regionId', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/zillow/${regionId}`);
    const results = await scrapeZillowRentals(regionId, req.body);
    res.json(results);
    console.timeEnd(`/v1/zillow/${regionId}`);
  });

  app.put('/v1/props/:regionId', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/props/${regionId}`);
    const results = await scrapeZillowProperties(regionId, req.body);
    res.json(results);
    console.timeEnd(`/v1/props/${regionId}`);
  });

  app.delete('/v1/zillow/:regionId', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/zillow/${regionId}`);
    const es = ElasticSearch.getInstance();
    const results = await es.index.deleteIndex(regionId);
    res.json(results);
    console.timeEnd(`/v1/zillow/${regionId}`);
  });

  app.get('/v1/indexes', async (req: Request, res: Response) => {
    const es = ElasticSearch.getInstance();
    const results = await es.listIndices();
    res.json(results);
  })

  app.get('/v1/dataset/:entity/:slug/del', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({ msg: 'del is not implemented yet' });
  });

  const server = new ApolloServer<MyContext>({ schema });
  logger.debug('Apollo: Starting server');
  await server.start();
  logger.debug('Apollo: Server started 🚀');
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
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Perform cleanup
  process.exit(1); // Exit your app; consider using a process manager to restart
});

interface MyContext {
  token?: string;
}