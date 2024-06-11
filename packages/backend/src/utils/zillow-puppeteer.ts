import logger from '@utils/logger';
import { Cache } from '@utils/cache';
import MongoDBService from '@utils/mongo-db';
import { ZillowProperty } from '@backend/types/property-types';
import puppeteer from 'puppeteer';
const cache = new Cache();

interface ZillowOptions {
  url: string;
  payload: unknown;
  cookies: string;
  meta: any;
}

async function devCache(index: string): Promise<ZillowProperty[]> {
  const mongo = MongoDBService.getInstance();
  const esData = await mongo.data.get(index);

  // check elasticsearch first
  return (esData?.records ?? []) as ZillowProperty[];
}

export const fetchRentalData = async (index: string, options: ZillowOptions): Promise<ZillowProperty[]> => {
  const mongo = MongoDBService.getInstance();
  const esCache = await devCache(index);
  if (esCache.length) {
    return esCache;
  }

  // check dev cache
  const cachedData = (await cache.get(options.url)) as ZillowRequestResults;
  const data = cachedData?.cat1?.searchResults?.mapResults ?? [];
  if (data?.length) {
    processData(index, options, data);
    return data;
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let responseData = null;

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  const meta = await mongo.data.metadata(index);
  if (!meta?.cookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found. Please pass in a session cookie @ options.cookies');
  }

  await page.setExtraHTTPHeaders({
    Cookie: meta?.cookies ?? options.cookies.replace('"', ''),
  });

  // Enable request interception
  await page.setRequestInterception(true);

  const waitForApiCall: Promise<ZillowProperty[]> = new Promise((resolve) => {
    page.on('request', (request) => {
      if (request.url().endsWith('async-create-search-page-state')) {
        logger.debug('call detected.');
      }
      request.continue();
    });

    page.on('response', async (response) => {
      console.log(response.url());
      if (response.url().includes('async-create-search-page-state')) {
        try {
          responseData = (await response.json()) as ZillowRequestResults; // Get response data
          const data = responseData?.cat1?.searchResults?.mapResults ?? [];
          resolve(data);
          // for development purposes, if we get a successful response we cache it
          // so we dont have to make the request to zillow again
          cache.set(options.url, responseData);
          processData(index, options, data);
        } catch (error) {
          const text = await response.text();
          logger.error('Error in response', text);
        }
      }
    });
  });

  // listen to errors and log them
  page.on('error', (err) => logger.error('error', err));

  await page.goto(options.url); // Go to the website
  const cookiesArray = (await page.cookies()) ?? [];
  const cookies = cookiesArray.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  // cache.set(`${index}-meta`, { index, ...options, cookies });
  mongo.index.updateMetadata(index, { cookies });

  const results = await waitForApiCall;
  await browser.close();
  return results;
};

async function processData(index: string, options: ZillowOptions, data: ZillowProperty[]): Promise<void> {
  const mongo = MongoDBService.getInstance();
  const date = new Date().toISOString();
  const _recs = await mongo.data.get(index);
  const allRecords = _recs?.records ?? [];

  // Process each record in parallel using Promise.all
  const computedData = await Promise.all(
    data.map((record) => {
      // Extract and parse the price from the record
      const price = stringToNumber(record.price);

      // Fetch the base record from Elasticsearch
      let baseRecord = allRecords.find((r) => r.address === record.address); // await fetchBaseRecord(es, index, record.address, date);
      baseRecord = baseRecord ?? {
        pastPrices: [],
        firstSeen: date,
      };

      // Update the base record with new price and date
      // TODO: fix the interface for the base record
      // @ts-ignore
      baseRecord = updateBaseRecord(baseRecord, price, date);

      // Merge the base record with the current record and additional fields
      return mergeRecords(baseRecord, record, price, date);
    }),
  );

  // Upsert the computed data into Elasticsearch
  await mongo.index.upsert(index, {
    records: computedData,
    meta: {
      ...(options.meta ?? {}),
      url: options.url,
    },
  });
}

// Helper function to extract and parse the price from a string
function stringToNumber(stringNumber: string): number {
  const _price = parseInt(stringNumber.replace(/\D/g, ''), 10) ?? 0;
  return isNaN(_price) ? 0 : _price;
}

// Helper function to fetch the base record from Elasticsearch
async function fetchBaseRecord(
  es: ElasticSearch,
  index: string,
  address: string,
  date: string,
): Promise<BaseRecord | ZillowProperty> {
  const baseRecord = (await mongo.data.record(index, {
    match: { address },
  })) as BaseRecord | undefined;

  return (
    baseRecord ?? {
      pastPrices: [],
      firstSeen: date,
    }
  );
}

// Helper function to update the base record with new price and date
function updateBaseRecord(baseRecord: BaseRecord, price: number, date: string): BaseRecord {
  return {
    ...baseRecord,
    pastPrices: [...(baseRecord.pastPrices || []), { price, date }],
  };
}

// Helper function to merge the base record with the current record and additional fields
function mergeRecords(baseRecord: BaseRecord, record: ZillowProperty, price: number, date: string): ComputedRecord {
  return {
    ...baseRecord,
    ...record,
    price,
    lastSeen: date,
    multipleListings: record.unitCount !== undefined,
    decoratedPrice: record.price,
    url: `https://www.zillow.com${record.detailUrl}`,
  };
}

// Type definitions
interface BaseRecord {
  id?: string;
  pastPrices: { price: number; date: string }[];
  firstSeen: string;
}

interface ComputedRecord extends Omit<ZillowProperty, 'price'> {
  price: number;
  lastSeen: string;
  multipleListings: boolean;
  decoratedPrice: string;
  url: string;
}

type ZillowRequestResults = {
  cat1?: {
    searchResults?: {
      mapResults?: ZillowProperty[];
    };
  };
};
