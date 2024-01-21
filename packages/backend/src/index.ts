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
import puppeteer, { Browser, Page } from 'puppeteer';
import { HTMLElement } from '@types/node';

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

// UT college area
const apartmentsDotCom = 'https://www.apartments.com/student-housing/?sk=e4158953cfe2832ceb41cca8821635d2&bb=s2hk_z3tqJ79gw-H';
const redFinBoundry = 'https://www.redfin.com/stingray/api/gis?al=1&include_nearby_homes=true&market=austin&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly=-97.75393%2030.27555%2C-97.70638%2030.27555%2C-97.70638%2030.32261%2C-97.75393%2030.32261%2C-97.75393%2030.27555&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4,5,6,7,8&v=8&zoomLevel=14';
const linkGen = (page: number | undefined) => `https://www.apartments.com/student-housing/${page ? page + '/' : ''}?bb=s2hk_z3tqJ79gw-H`

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

interface Listing {
  rent: string;
  bedBath: string;
  link: string;
  address: string;
  description?: string;
  title: string;
}

async function gatherDataFromListings(page: Page): Promise<Listing[]> {
  const listingsSelector = await page.waitForSelector('.placardContainer', { timeout: 20000 });
  const loadingOverlay = await page.$('.loadingOverlay');
  logger.debug('gatherDataFromListings  loadingOverlay loaded', loadingOverlay);

  // await for the loading spinner to disappear before proceeding
  // NOTE: page.waitForFunction doesnt seem to work well when needing to 
  // look up dom elements dynamically
  // await new Promise(resolve => setTimeout(resolve, 5000));

  // logger.debug('gatherDataFromListings results loaded');

  return listingsSelector?.evaluate((container) => {
    const listings = container.querySelectorAll('article.placard');
    return [...listings].map(listing => {
      const rent = listing.querySelector('.property-pricing')?.textContent.trim() || listing.querySelector('.price-range')?.textContent.trim();
      const bedBath = listing.querySelector('.property-beds')?.textContent.trim() || listing.querySelector('.bed-range')?.textContent.trim();
      const description = listing.querySelector('.property-amenities')?.textContent.trim() ?? null;
      const link = listing.querySelector('.property-link')?.href ?? null;
      const title = listing.querySelector('.property-title')?.textContent.trim() ?? null;
      const address = listing.querySelector('.property-address')?.textContent.trim() ?? null;
      return { rent, bedBath, description, link, title, address };
    }).filter(l => l.link && l.title);
  }) ?? [];
}
// TODO: move the rawListings processing to a function and then 
// start a cycler through the paging to process each page of results 


async function scrapeApartments(url: string): Promise<Listing[]> {
  const allListings: Listing[] = [];
  const browser: Browser = await puppeteer.launch({ args: ['--disable-http2'] });
  logger.debug('puppeteer launched', url);
  const page: Page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',

    // NOTE: apartments.com API will fail if it doenst have valid cookies from an actual session
    'Cookie': 'cul=en-US; ab=%7b%22e%22%3atrue%2c%22r%22%3a%5b%5d%7d; afe=%7b%22e%22%3afalse%7d; fso=%7b%22e%22%3afalse%7d; _gac_UA-1746553-2=1.1703386470.CjwKCAiAp5qsBhAPEiwAP0qeJq0OgGDbrQ1YlbB1h0DuomsCx16UU0UgZeaAa_ywqnVbmUzaNIMuFxoCVLoQAvD_BwE; _gcl_aw=GCL.1703386470.CjwKCAiAp5qsBhAPEiwAP0qeJq0OgGDbrQ1YlbB1h0DuomsCx16UU0UgZeaAa_ywqnVbmUzaNIMuFxoCVLoQAvD_BwE; _gcl_dc=GCL.1703386470.CjwKCAiAp5qsBhAPEiwAP0qeJq0OgGDbrQ1YlbB1h0DuomsCx16UU0UgZeaAa_ywqnVbmUzaNIMuFxoCVLoQAvD_BwE; _gcl_au=1.1.610252271.1703386470; _scid=e477f7f0-276a-457c-a451-e0450891d5e8; _tt_enable_cookie=1; _ttp=Uvk9nSNzYcB2FBxJdAlQABgTeyY; cto_optout=1; _fbp=fb.1.1703386470641.276131334; _pin_unauth=dWlkPVpUTXdZekUxTUdJdFltTTJOeTAwT1RFMUxUazFNVFF0WlRRNE9UazFZekJsT1dNMQ; anw=true; cb=1; _gid=GA1.2.634011024.1705701796; _sctr=1%7C1705644000000; s=; _ga=GA1.1.563818034.1703386470; _dpm_id.c51a=9c09af42-7eda-4f00-9549-025aebe93104.1703386470.5.1705756327.1705705562.aadc632e-03a5-491b-afd4-fe89c83273ed; _uetsid=8c6fe700b71611eeb0c4db9c08cff41d; _uetvid=c1fcc4a0a20711ee8989efbc2fae8df2; _scid_r=e477f7f0-276a-457c-a451-e0450891d5e8; _derived_epik=dj0yJnU9MjM4Y1hmUEdlWFIydS1xZ0FpS0hPTkhJMUhKUUw5S24mbj1Vb1QtNFhCMHQtODBxNGo3REhiYmRnJm09MSZ0PUFBQUFBR1dyeHFjJnJtPTEmcnQ9QUFBQUFHV3J4cWMmc3A9Mg; uat=%7B%22VisitorId%22%3A%22272e42f4-d028-4e01-a3b9-ce105155c37e%22%2C%22VisitId%22%3A%227f163782-3cd1-4b47-bdae-366502dc6fdc%22%2C%22LastActivityDate%22%3A%222024-01-20T08%3A12%3A06.7664428-05%3A00%22%2C%22LastFrontDoor%22%3A%22APTS%22%2C%22LastSearchId%22%3A%225059ADE0-0F8F-4422-9733-AA355DBF27F7%22%7D; sr=%7B%22Width%22%3A918%2C%22Height%22%3A756%2C%22PixelRatio%22%3A2%7D; lsc=%7B%22StateKey%22%3A%2271f79b587b8a87e36b361eabf1b25ecb%22%7D; _ga_X3LTX2PVM9=GS1.1.1705785773.8.1.1705785960.19.0.0; _clck=15qmrv1%7C2%7Cfil%7C0%7C1453; RT="z=1&dm=apartments.com&si=742e93b3-e6c1-4cb1-baa3-cc649bf890b1&ss=lrl8btws&sl=0&tt=0&bcn=%2F%2F17de4c16.akstat.io%2F"; _clsk=1c4f7wf%7C1705806356098%7C2%7C0%7Cn.clarity.ms%2Fcollect; _dd_s='
  })
  await page.setViewport({ width: 1366, height: 768 });
  logger.debug('puppeteer viewport set');
  logger.debug('puppeteer page created', page);
  // page.on('requestfailed', request => {
  //   logger.error(`Request failed: ${request.url()}`);
  // });
  await page.goto(linkGen(undefined), { timeout: 5000 });
  logger.debug('puppeteerurl resolved');

  // next page
  const paging = await page.waitForSelector('.searchResults .pageRange');
  const totalPages = await paging?.evaluate((container) => {
    const [, _totalPages] = container.textContent.trim().replace('Page ', '').split(' of ');
    return Number.parseInt(_totalPages);
  });

  logger.debug(`There are ${totalPages} pages to cycle through`);

  if (totalPages) {
    for (let i = 1; i < totalPages;) {
      logger.debug(`fetching page ${i}`);
      const _listings = await gatherDataFromListings(page);
      allListings.push(..._listings);
      logger.debug(`page ${i} fetched ✅`, _listings.at(-1));
      logger.debug(`URL before nav: ${page.url()}`);
      // !!! BUG ALERT !!! this is going to miss the last page of results, so it needs a slight logic rework
      i++;
      await page.goto(linkGen(i), { timeout: 5000 });
      await page.waitForSelector('.searchResults .pageRange');
      logger.debug(`URL after nav: ${page.url()}`);
    }
  }

  // NEXT STEP: store these in a db and then make a fetching API to crunh the numbers
  // Into averages and such 

  logger.debug('🎉 all pages fetched', allListings);

  await browser.close();

  return allListings;
}

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
  const hash = createHash(redFinBoundry);

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
    const responseData = await fetch(redFinBoundry)
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
  scrapeApartments(apartmentsDotCom);
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