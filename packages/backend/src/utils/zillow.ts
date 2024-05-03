import logger from '@utils/logger';
import puppeteer from 'puppeteer';
import { Cache } from '@utils/cache';
import { upsertRentals } from '@domains/rental/zillow.rental.resolvers';
import type { ZillowRentalInput } from '@domains/rental/zillow.rental.model';
import ElasticSearch from '@utils/elastic-search';
import { url } from 'inspector';

const cache = new Cache();
const API_ROOT = 'https://www.zillow.com/async-create-search-page-state';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAYLOAD = {
  searchQueryState: {
    isMapVisible: true,
    mapBounds: {
      north: 30.32924698878185,
      south: 30.27700404394706,
      east: -97.7023716922353,
      west: -97.7642556186269
    },
    filterState: {
      isForRent: {
        value: true
      },
      isForSaleByAgent: {
        value: false
      },
      isForSaleByOwner: {
        value: false
      },
      isNewConstruction: {
        value: false
      },
      isComingSoon: {
        value: false
      },
      isAuction: {
        value: false
      },
      isForSaleForeclosure: {
        value: false
      },
      isAllHomes: {
        value: true
      }
    },
    isListVisible: true,
    mapZoom: 14,
    customRegionId: "ebd3465b7cX1-CRvfdul3zlzgkr_1487v5"
  },
  wants: {
    cat1: [
      "listResults",
      "mapResults"
    ]
  },
  requestId: 25,
  isDebugRequest: false
};

interface ZillowOptions {
  url: string;
  cookies: string,
  meta: any;
}

export const fetchRentalData = async (index: string, options: ZillowOptions): Promise<ZillowRentalInput[]> => {
  const es = ElasticSearch.getInstance();
  const esData = await es.data.get(index);

  // check elasticsearch first
  if (esData?.records?.length) return esData.records as ZillowRentalInput[];

  // check dev cache
  const cachedData = await cache.get(options.url) as ResultsType;
  const _rentals: ZillowRentalInput[] = cachedData?.cat1?.searchResults?.mapResults ?? [];
  if (_rentals?.length) return _rentals;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let responseData = null;

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  const cachedCookies = await cache.get(`${index}-meta`)?.cookies;
  if (!cachedCookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found. Please pass in a zillow session cookie @ options.cookies');
  }

  await page.setExtraHTTPHeaders({
    'Cookie': cachedCookies ?? options.cookies.replace('\"', ""),
  })

  // Enable request interception
  await page.setRequestInterception(true);

  const waitForApiCall: Promise<ZillowRentalInput[]> = new Promise((resolve) => {
    page.on('request', request => {
      if (request.url().endsWith('async-create-search-page-state')) {
        logger.debug('call detected.');
      }
      request.continue();
    });

    page.on('response', async response => {
      if (response.url().includes('async-create-search-page-state')) {
        try {
          responseData = await response.json() as ResultsType; // Get response data
          const data = responseData?.cat1?.searchResults?.mapResults ?? [];
          resolve(data);
          // for development purposes, if we get a successful response we cache it
          // so we dont have to make the request to zillow again
          cache.set(options.url, responseData);
          // await upsertRentals(data); // mongoDB

          // actually insert data into elasticsearch
          // NOTE: this will dupe right now
          await es.index.upsert(index, {
            records: data,
            meta: options.meta ?? {},
          });// elasticsearch
        } catch (error) {
          logger.error('Error in response', error);
        }
      }
    });
  });

  // listen to errors and log them
  page.on('error', err => logger.error('error', err));

  await page.goto(options.url); // Go to the website
  const cookiesArray = await page.cookies() ?? [];
  const cookies = cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  cache.set(`${index}-meta`, { index, ...options, cookies });

  const results = await waitForApiCall;
  await browser.close();
  return results;
}

// makes a PUT request to 'API_ROOT' with a payload of 'PAYLOAD' using the 'COOKIE' as cookies in the header 
// and USER_AGENT as the User agent, and returns the response as a JSON object 
export async function putZillowResults(): Promise<any> {
  const response = await fetch(API_ROOT, {
    method: 'PUT',
    headers: {
      'Cookie': '<cookies here>',
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(PAYLOAD)
  });
  return await response.json();
}

type ResultsType = {
  cat1?: {
    searchResults?: {
      mapResults?: ZillowRentalInput[];
    };
  };
};