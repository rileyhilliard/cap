import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { buildSchema } from 'type-graphql';
import { connectToDB } from './utils/db.js';
import logger from './utils/logger.js';
import { uploadMiddleware, uploadHandler } from './middleware/file-upload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PropertyResolver, { fetchProperty } from './domains/property/property.resolvers.js';
import crypto from 'crypto';
import fetch from 'node-fetch';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 4000;

// connect to the database
await connectToDB();

const schema = await buildSchema({
  resolvers: [PropertyResolver],
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

const endpoint = 'https://www.redfin.com/stingray/api/gis?al=1&include_nearby_homes=true&market=austin&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly=-97.75393%2030.27555%2C-97.70638%2030.27555%2C-97.70638%2030.32261%2C-97.75393%2030.32261%2C-97.75393%2030.27555&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4,5,6,7,8&v=8&zoomLevel=14';
// Function to create a hash from a string
function createHash(string: string): string {
  return crypto.createHash('sha256').update(string).digest('hex');
}

interface LabeledValue {
  label?: string;
  value: string | number;
  level?: number;
}

interface Property {
  mlsId: LabeledValue;
  showMlsId: boolean;
  mlsStatus: string;
  showDatasourceLogo: boolean;
  price: LabeledValue;
  hideSalePrice: boolean;
  hoa?: LabeledValue;
  isHoaFrequencyKnown: boolean;
  sqFt: LabeledValue;
  pricePerSqFt: LabeledValue;
  lotSize: LabeledValue;
  beds: number;
  baths: number;
  fullBaths: number;
  location: LabeledValue;
  stories: number;
  latLong: {
    value: {
      latitude: number;
      longitude: number;
    };
    level?: number;
  };
  streetLine: LabeledValue;
  unitNumber?: LabeledValue;
  city: string;
  state: string;
  zip: string;
  postalCode: LabeledValue;
  countryCode: string;
  showAddressOnMap: boolean;
  soldDate: number;
  searchStatus: number;
  propertyType: number;
  uiPropertyType: number;
  listingType: number;
  propertyId: number;
  listingId: number;
  dataSourceId: number;
  marketId: number;
  yearBuilt: LabeledValue;
  dom: LabeledValue;
  timeOnRedfin: LabeledValue;
  originalTimeOnRedfin: LabeledValue;
  timeZone: string;
  primaryPhotoDisplayLevel: number;
  photos: LabeledValue;
  additionalPhotosInfo: any[]; // specify further if there's a structure
  url: string;
  hasInsight: boolean;
  sashes: any[]; // specify further if there's a structure
  isHot: boolean;
  hasVirtualTour: boolean;
  hasVideoTour: boolean;
  has3DTour: boolean;
  newConstructionCommunityInfo: any; // specify further if there's a structure
  isRedfin: boolean;
  isNewConstruction: boolean;
  listingRemarks: string;
  remarksAccessLevel: number;
  servicePolicyId: number;
  businessMarketId: number;
  isShortlisted: boolean;
  isViewedListing: boolean;
}

type CalculatedProperty = Property & {
  capRate?: number;
  roi?: number;
  cashFlow?: cashFlow;
  costs?: costs;
  monthlyCosts?: number;
  computedValues?: computedValues;
};

type computedValues = Property & {
  yearlyPropertyTaxRate?: number;
  yearlyMaintenanceRate?: number;
  yearlyPropertyInsuranceRate?: number;
  rentAverages?: number;
  purchasePrice?: number;
  hoaMonthly?: number;
  propertySqFt?: number;
  yearlyPropertyTax?: number;
  yearlyMaintenanceCost?: number;
  yearlyPropertyInsurance?: number;
  monthlyRent?: number;
  annualIncome?: number;
};

type cashFlow = {
  yearlyNet?: number;
  yearlyGross?: number;
  monthlyGross?: number;
  monthlyNet?: number;
};

type costs = {
  yearly?: number;
  monthly?: number;
};

function calculatePropertyData(property: Property): CalculatedProperty {
  // Constants
  const yearlyPropertyTaxRate = 0.02;
  const yearlyMaintenanceRate = 0.01;
  const yearlyPropertyInsuranceRate = 0.0057;
  const rentAverages: { [key: string]: number } = { '1': 1507, '2': 2224, '3': 3000, '4': 3800 };

  // Ensure values are treated as numbers
  const purchasePrice = Number(property.price.value);
  const hoaMonthly = Number(property.hoa?.value) || 0;
  const propertySqFt = Number(property.sqFt.value);

  // Calculations
  const yearlyPropertyTax = purchasePrice * yearlyPropertyTaxRate;
  const yearlyMaintenanceCost = purchasePrice * yearlyMaintenanceRate;
  const yearlyPropertyInsurance = purchasePrice * yearlyPropertyInsuranceRate;
  const monthlyRent = rentAverages[property.beds?.toString?.()] ?? 0;

  const yearlyCosts = (hoaMonthly * 12) + yearlyPropertyTax + yearlyMaintenanceCost + yearlyPropertyInsurance;
  const monthlyCosts = yearlyCosts / 12;
  const annualIncome = monthlyRent * 12;
  const cashFlow = annualIncome - yearlyCosts;
  const capRate = (annualIncome - yearlyCosts) / purchasePrice;
  const roi = cashFlow / purchasePrice;

  // Returning the property with additional calculated data
  return {
    ...property,
    capRate,
    roi,
    cashFlow: {
      yearlyNet: cashFlow,
      yearlyGross: annualIncome,
      monthlyNet: cashFlow / 12,
      monthlyGross: annualIncome / 12
    },
    costs: {
      yearly: yearlyCosts,
      monthly: monthlyCosts
    },
    computedValues: {
      yearlyPropertyTaxRate,
      yearlyMaintenanceRate,
      yearlyPropertyInsuranceRate,
      rentAverages,
      purchasePrice,
      hoaMonthly,
      propertySqFt,
      yearlyPropertyTax,
      yearlyMaintenanceCost,
      yearlyPropertyInsurance,
      monthlyRent,
      annualIncome
    }
  };
}


// Function to check if the data for a hash already exists
async function fetchDataForHash(hash: string): Promise<any> {
  try {
    const filePath = path.join(__dirname, 'cache', `${hash}.json`);
    if (fs.existsSync(filePath)) {
      const stats = await fs.promises.stat(filePath);
      const now = new Date();
      const lastModified = new Date(stats.mtime);

      // Check if the file is older than 1 day
      const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      if (now.getTime() - lastModified.getTime() > oneDay) {
        logger.debug('Cache is old for', hash);
        return null;
      }

      logger.debug('Cache hit for', hash);
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error(error);
  }
  logger.debug('Cache miss for', hash);
  return null;
}

// Function to save data for a hash
async function saveDataForHash(hash: string, data: any): Promise<void> {
  const cacheDir = path.join(__dirname, 'cache');
  const filePath = path.join(cacheDir, `${hash}.json`);

  logger.debug('Saving fetched data for', filePath);
  const crunchData = data.map(calculatePropertyData).sort((a: any, b: any) => b.capRate - a.capRate);

  try {
    // Check if the cache directory exists, if not, create it
    if (!fs.existsSync(cacheDir)) {
      await fs.promises.mkdir(cacheDir, { recursive: true });
    }

    // Now write the file
    await fs.promises.writeFile(filePath, JSON.stringify(crunchData));
    return crunchData;
  } catch (error) {
    logger.error('Error saving data', error);
    throw error; // Rethrow the error after logging (or handle it as needed)
  }
}

// Example usage in an Express route
export async function getProperty(req: Request, res: Response): Promise<void> {
  // Create a hash of the endpoint
  const hash = createHash(endpoint);

  // Check if data for this hash already exists
  const cachedData = await fetchDataForHash(hash);
  if (cachedData) {
    // Data exists, return it
    res.setHeader('Content-Type', 'application/json');
    res.json(cachedData);
    logger.debug('returned cache for', hash);
    return;
  }

  // Fetch new data since it's not in the cache
  try {
    logger.debug('fetching fresh data for', hash);
    const responseData = await fetch(endpoint)
      .then(res => {
        logger.debug('getProperty', res);
        return res;
      })
      .then(res => res.text())
      .then(text => {
        const cleaned = text.replace('{}&&{"', '{"');
        const parsed = JSON.parse(cleaned);
        return parsed;
      });
    const data = responseData?.payload?.homes;
    if (!data) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'no data exists @ response.payload.homes. Did the shape change?', responseData });
    }
    // Save the new data for future use
    const crunchedData = await saveDataForHash(hash, data);
    res.setHeader('Content-Type', 'application/json');
    res.json(crunchedData);

  } catch (error) {
    logger.error('getProperty error: ', error);
    res.status(500).send('Error fetching data');
  }
}

app.get('/v1/properties/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug('Looking up property schema', { id });
  await getProperty(req, res);
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

// Upload endpoint
app.post('/upload', uploadMiddleware, uploadHandler);

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

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('err handler', err)
  res.status(400).json({ error: err.message });
});

// Modified server startup
await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
logger.debug(`@backend ready @ http://localhost:${port}/graphql`);

interface MyContext {
  token?: string;
}