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
import { fetchRentalData } from '@utils/zillow';
import ElasticSearch from '@utils/elastic-search';

export async function application(app: Express) {
  const schema = await buildSchema({
    resolvers: [ZillowRentalResolver, ZillowRentalMutationResolver, ApartmentResolver, ApartmentMutationResolver],
  });

  app.get('/test', async (req: Request, res: Response) => {
    const { id } = req.params;
    const es = ElasticSearch.getInstance();
    logger.debug('Looking up property schema', { id });
    // const prices = await calculateAverageAndMedianRentalPrices()
    // const apartments = await apartmentsScraper();
    // const properties = await propertiesScraper(req, res);
    const properties = await es.data.get('redfin_ut');
    res.setHeader('Content-Type', 'application/json');
    res.json(properties);
    logger.debug('Property resolved');
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

  app.get('/v1/zillow/:index', async (req: Request, res: Response) => {
    console.time('/v1/zillow/:index');
    // UT college area rentals
    // const URL = 'https://www.zillow.com/homes/for_rent/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22west%22%3A-97.7904768939565%2C%22east%22%3A-97.67615041690571%2C%22south%22%3A30.250872135276055%2C%22north%22%3A30.355358017795723%7D%2C%22mapZoom%22%3A13%2C%22customRegionId%22%3A%22ebd3465b7cX1-CRvfdul3zlzgkr_1487v5%22%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22ah%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22isListVisible%22%3Atrue%7D';
    const { index } = req.params;
    const results = await fetchRentalData(index, req.body);
    res.setHeader('Content-Type', 'application/json');
    res.json(results);
    logger.debug('Property resolved');
    console.timeEnd('/v1/zillow/:index')
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