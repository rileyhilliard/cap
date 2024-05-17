import 'reflect-metadata';
import { Request, Response } from 'express';
import type { Express } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import { buildSchema } from 'type-graphql';
import logger from '@utils/logger';
import { scrapeRedfinProperties, scrapeRedfinRentals } from '@backend/utils/redfin';
import { fetchProperty } from '@domains/property/property.resolvers';
import ApartmentResolver, { ApartmentMutationResolver } from '@domains/apartment/apartment.resolvers';
import ZillowRentalResolver, { ZillowRentalMutationResolver } from '@domains/rental/zillow.rental.resolvers';
import { scrapeZillowRentals, scrapeZillowProperties, calculateAverageAndMedianRentalPrices, decorateProperties } from '@utils/zillow';
import ElasticSearch from '@utils/elastic-search';
import { generateRentalReport } from '@utils/market-report';
import { mergeRecords } from '@utils/helpers';
import { url } from 'inspector';

export async function application(app: Express) {
  const schema = await buildSchema({
    resolvers: [ZillowRentalResolver, ZillowRentalMutationResolver, ApartmentResolver, ApartmentMutationResolver],
  });

  app.get('/v1/metadata/:index', async (req: Request, res: Response) => {
    const { index } = req.params;
    const es = ElasticSearch.getInstance();
    const metadata = await es.data.metadata(index);
    res.json(metadata);
  });

  app.put('/v1/redfin/:regionId/properties', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    const index = `${regionId}_rentals_redfin`;
    logger.debug('Looking up property schema', { index });
    const properties = await scrapeRedfinProperties(index, req.body);
    res.json(properties);
    logger.debug('Property resolved');
  });

  app.put('/v1/redfin/:regionId/rentals', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    const index = `${regionId}_rentals_redfin`;
    logger.debug('Looking up property schema', { index });
    const properties = await scrapeRedfinRentals(index, req.body);
    res.json(properties);
    logger.debug('Property resolved');
  });

  // {
  //   "redfin": {
  //     "url": "https://www.redfin.com/stingray/api/v1/search/rentals?al=1&includeKeyFacts=true&isRentals=true&market=austin&num_homes=350&ord=days-on-redfin-desc&page_number=1&poly=-97.75584%2030.27237%2C-97.7155%2030.27237%2C-97.7155%2030.32195%2C-97.75584%2030.32195%2C-97.75584%2030.27237&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4&use_max_pins=true&user_poly=-97.735345%2030.279787%2C-97.753112%2030.284753%2C-97.752768%2030.289719%2C-97.747618%2030.292609%2C-97.748820%2030.297204%2C-97.746073%2030.300909%2C-97.740580%2030.300465%2C-97.737919%2030.301799%2C-97.731654%2030.312024%2C-97.719723%2030.308838%2C-97.712685%2030.297945%2C-97.712256%2030.292609%2C-97.717835%2030.285494%2C-97.721011%2030.284605%2C-97.725131%2030.286309%2C-97.731225%2030.278972%2C-97.735345%2030.279787&v=8&zoomLevel=14"
  //   },
  //   "zillow": {
  //     "payload": {
  //         "isDebugRequest": false,
  //         "requestId": 5,
  //         "searchQueryState": {
  //             "filterState": {
  //                 "isComingSoon": {
  //                     "value": false
  //                 },
  //                 "isForSaleForeclosure": {
  //                     "value": false
  //                 },
  //                 "isForSaleByAgent": {
  //                     "value": false
  //                 },
  //                 "isAuction": {
  //                     "value": false
  //                 },
  //                 "isForRent": {
  //                     "value": true
  //                 },
  //                 "isForSaleByOwner": {
  //                     "value": false
  //                 },
  //                 "isAllHomes": {
  //                     "value": true
  //                 },
  //                 "isNewConstruction": {
  //                     "value": false
  //                 }
  //             },
  //             "pagination": {},
  //             "mapBounds": {
  //                 "east": -97.70331582980855,
  //                 "south": 30.269844711606915,
  //                 "north": 30.322091470128218,
  //                 "west": -97.76365480380757
  //             },
  //             "customRegionId": "ebd3465b7cX1-CRvfdul3zlzgkr_1487v5",
  //             "isListVisible": true,
  //             "isMapVisible": true,
  //             "mapZoom": 14
  //         },
  //         "wants": {
  //             "cat1": [
  //                 "listResults",
  //                 "mapResults"
  //             ]
  //         }
  //     },
  //     "cookies": "search=6|1717619129261%7Crect%3D30.322091470128218%2C-97.70331582980855%2C30.269844711606915%2C-97.76365480380757%26crid%3Debd3465b7cX1-CRvfdul3zlzgkr_1487v5%26disp%3Dmap%26mdm%3Dauto%26p%3D1%26z%3D1%26listPriceActive%3D1%26fs%3D0%26fr%3D1%26mmm%3D0%26rs%3D0%26ah%3D0%26singlestory%3D0%26housing-connector%3D0%26abo%3D0%26garage%3D0%26pool%3D0%26ac%3D0%26waterfront%3D0%26finished%3D0%26unfinished%3D0%26cityview%3D0%26mountainview%3D0%26parkview%3D0%26waterview%3D0%26hoadata%3D1%26zillow-owned%3D0%263dhome%3D0%26featuredMultiFamilyBuilding%3D0%26student-housing%3D0%26income-restricted-housing%3D0%26military-housing%3D0%26disabled-housing%3D0%26senior-housing%3D0%26excludeNullAvailabilityDates%3D0%26isRoomForRent%3D0%26isEntirePlaceForRent%3D1%26commuteMode%3Ddriving%26commuteTimeOfDay%3Dnow%09%09%09%7B%22isList%22%3Atrue%2C%22isMap%22%3Atrue%7D%09%09%09%09%09; max-age=315576000; path=/; domain=.zillow.com, zgsession=1|6e7a2cb0-3208-4feb-91d0-9b3c68518fe8; Path=/; Domain=.zillow.com; HTTPOnly, x-amz-continuous-deployment-state=AYABeCaawhuCLLVqmh9w1xIbyDIAPgACAAFEAB1kM2Jsa2Q0azB3azlvai5jbG91ZGZyb250Lm5ldAABRwAVRzA3MjU1NjcyMVRZRFY4RDcyVlpWAAEAAkNEABpDb29raWUAAACAAAAADLOI48czez%2FpnyWshQAwEe1RP+yK5wq3k4EJ3UVNP80NEyukVOpBzb0VuHnDWE20j16vZnEXlMFmgjCBYgLfAgAAAAAMAAQAAAAAAAAAAAAAAAAAAAJNFWThTTMNC2TnKYI9%2FyL%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAAAzJnEG8Cj9ztaym94Z4OPkyW8RaC2gJUUthc7%2Fo; HttpOnly; Path=/; Expires=Mon, 06 May 2024 20:55:28 GMT",
  //     "url": "https://www.zillow.com/homes/for_rent/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22west%22%3A-97.7904768939565%2C%22east%22%3A-97.67615041690571%2C%22south%22%3A30.250872135276055%2C%22north%22%3A30.355358017795723%7D%2C%22mapZoom%22%3A13%2C%22customRegionId%22%3A%22ebd3465b7cX1-CRvfdul3zlzgkr_1487v5%22%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22ah%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22isListVisible%22%3Atrue%7D"
  //   }
  // }
  /** 
   * Mega job test endpoint
   * eventually this will be migrated to a cron job which will run every 24 hours
   * OR will remain open so a UI can kick off a new region: for example, 
   * right now I want to see UT regional data, but this could be expanded to include
   * and region to be tracked
   * 
   * scrape rentals
   * generate a report
   * scrape properties
   * calculate ROI stats
   * upsert to new elasticsearch index with combined data
   */
  app.put('/v1/add/:regionId', async (req: Request, res: Response) => {
    const { regionId } = req.params;
    console.time(`/v1/add/${regionId}`);
    const { redfin, zillow } = req.body;
    // convert zillow rental url to for_sale url
    const [root, query] = decodeURIComponent(zillow.url).replace('for_rent', 'for_sale').replace(/("filterState").*/, '"filterState":{"ah":{"value":true},"sort":{"value":"globalrelevanceex"}},"isListVisible":true}').split('?searchQueryState=');
    const zillowPropertyConfig = {
      ...zillow,
      url: `${root}?searchQueryState=${encodeURIComponent(query)}`,
      payload: {
        ...zillow.payload,
        searchQueryState: {
          ...zillow.payload.searchQueryState,
          filterState: {
            "sortSelection": { "value": "globalrelevanceex" },
            "isAllHomes": { "value": true }
          }
        },
        wants: {
          ...zillow.payload.wants,
          cat2: ["total"]
        }
      }
    };
    const redfinPropertyConfig = {
      ...redfin,
      url: redfin.url.replace('v1/search/rentals', 'gis').replace(/includeKeyFacts.*poly=/, 'include_nearby_homes=true&market=austin&mpt=99&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly='),
    };
    const RENTALS = `${regionId}_rentals`;
    const PROPERTIES = `${regionId}_properties`;
    const zillowRentalIndex = `${RENTALS}_zillow`;
    const zillowPropertiesIndex = `${PROPERTIES}_zillow`;
    const redfinRentalIndex = `${RENTALS}_redfin`;
    const redfinPropertiesIndex = `${PROPERTIES}_redfin`;
    const rentalReportIndex = `${RENTALS}_report`;
    const combinedRentalIndex = RENTALS;
    const combinedPropertyIndex = PROPERTIES;

    const [zillowRentalResults, redfinRentalResults] = await Promise.all([
      scrapeZillowRentals(zillowRentalIndex, zillow),
      scrapeRedfinRentals(redfinRentalIndex, redfin)
    ]);

    const mergedRecords = mergeRecords(redfinRentalResults, zillowRentalResults);
    // insert merged records into combinedRentalIndex
    const rentalReport = await generateRentalReport(rentalReportIndex, mergedRecords);

    const [zillowPropertiesResults, redfinPropertiesResults] = await Promise.all([
      scrapeZillowProperties(zillowPropertiesIndex, zillowPropertyConfig),
      scrapeRedfinProperties(redfinPropertiesIndex, redfinPropertyConfig)
    ]);

    const combinedPropertyResults = await mergeRecords(redfinPropertiesResults, zillowPropertiesResults);
    const decoratedProperties = decorateProperties(combinedPropertyResults, rentalReport)
    console.timeEnd(`/v1/add/${regionId}`);
    return res.json(decoratedProperties);
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