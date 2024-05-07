import logger from '@utils/logger';
import puppeteer from 'puppeteer';
import { Cache } from '@utils/cache';
import { upsertRentals } from '@domains/rental/zillow.rental.resolvers';
import type { ZillowRentalInput } from '@domains/rental/zillow.rental.model';
import ElasticSearch, { responseTransformer } from '@utils/elastic-search';
import fetch from 'node-fetch';
import { timestamp } from '@utils/helpers';
import { analyzeRentalData } from '@utils/market-report';
import { queries } from '@utils/elastic-search-queries';

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
  payload: unknown;
  cookies: string,
  meta: any;
}

async function devCache(index: string): Promise<ZillowRentalInput[]> {
  const es = ElasticSearch.getInstance();
  const esData = await es.data.get(index);

  // check elasticsearch first
  return (esData?.records ?? []) as ZillowRentalInput[];
}


async function processRentalData(index: string, options: ZillowOptions, data: ZillowRentalInput[]): Promise<void> {
  const es = ElasticSearch.getInstance();
  const date = timestamp();
  const _recs = await es.data.get(index);
  // filter out records that have unitCount, because those are listings that contain multiple
  // units so the price data is a range and not accurate / something that can be used for calculating
  // (they are mega apartment complexes)
  const allRecords = (_recs?.records ?? []).filter(r => r.unitCount === undefined);

  // Process each record in parallel using Promise.all
  const computedData = await Promise.all(
    data.map((record) => {

      // Extract and parse the price from the record
      const price = stringToNumber(record.price);

      // Fetch the base record from Elasticsearch
      let baseRecord = allRecords.find(r => r.address === record.address); // await fetchBaseRecord(es, index, record.address, date);
      baseRecord = baseRecord ?? {
        // pastPrices: [],
        firstSeen: date,
      };

      // I turned this off in favor of keeping duplicate records
      // I think Kibana will work better with duplicates
      // baseRecord = updateBaseRecord(baseRecord, price, date);

      // Merge the base record with the current record and additional fields
      return mergeRecords(baseRecord, record, price, date);
    })
  );

  // Upsert the computed data into Elasticsearch
  await es.index.upsert(index, {
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

// Helper function to update the base record with new price and date
function updateBaseRecord(baseRecord: BaseRecord, price: number, date: string): BaseRecord {
  return {
    ...baseRecord,
    pastPrices: [...(baseRecord.pastPrices || []), { price, date }],
  };
}

// Helper function to merge the base record with the current record and additional fields
function mergeRecords(baseRecord: BaseRecord, record: ZillowRentalInput, price: number, date: string): ComputedRecord {
  return {
    ...baseRecord,
    ...record,
    price,
    latLong: {
      lat: record.latLong.latitude,
      lon: record.latLong.longitude
    },
    lastSeen: date,
    firstListed: timestamp(
      +new Date(date) - (
        record.timeOnZillow ?? 0
      )
    ),
    decoratedPrice: record.price,
    url: `https://www.zillow.com${record.detailUrl}`,
  };
}

// Type definitions
interface BaseRecord {
  id?: string;
  pastPrices?: { price: number; date: string }[];
  firstSeen: string;
}

interface ComputedRecord extends Omit<ZillowRentalInput, 'price'> {
  price: number;
  lastSeen: string;
  firstListed: string;
  decoratedPrice: string;
  url: string;
}



// makes a PUT request to 'API_ROOT' with a payload of 'PAYLOAD' using the 'COOKIE' as cookies in the header 
// and USER_AGENT as the User agent, and returns the response as a JSON object 
export async function scrapeZillowRentals(index: string, options: ZillowOptions): Promise<any> {
  // const cachedData = await cache.get(options.url) as ZillowRequestResults;
  // const data = cachedData?.cat1?.searchResults?.mapResults ?? [];
  // if (data?.length) {
  //   logger.debug('Returning dev cache becase its been less than a week since the last PUT attempt.');
  //   processRentalData(index, options, data);
  //   return data;
  // }

  const es = ElasticSearch.getInstance();
  const meta = await es.data.metadata(index);

  if (!meta?.cookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found in the index metadata. Please pass in a session cookie @ options.cookies');
  }

  if (!meta?.payload && !options.payload) {
    throw new Error('No payload found in the index metadata. Please pass in the PUT payload of the query region (see the "async-create-search-page-state" request payload in the zillow page request)');
  }

  if (options.payload) {
    es.index.updateMetadata(index, { payload: options.payload });
  }

  const cookies = meta?.cookies ?? options.cookies.replace('\"', "");
  const payload = meta?.payload ?? options.payload;

  const response = await fetch('https://www.zillow.com/async-create-search-page-state', {
    method: 'PUT',
    headers: {
      'Cookie': cookies,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      'Origin': 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(payload)
  });
  const responseCookies = response.headers.get('set-cookie');
  es.index.updateMetadata(index, { cookies: responseCookies });
  try {
    const res = await response.json() as ZillowRequestResults;
    processRentalData(index, options, (res?.cat1?.searchResults?.mapResults ?? []));
    return res;
  } catch (error) {
    const text = await response.text();
    logger.error(error);
    logger.error(text);
    return error;
  }
}










// TODO: look up metket-report on rentals, and calculate things like ROI, etc
// NOTE: doing this at ingestion time will make things stale, but is it possible to
// do this vai computed properties or something? not sure... 
// one way to do this is by creating a 3rd index that generates these stats,
// and then have a cron job that whipes that index and recomputes it on some interval (daily?)



// NOTE NOTE: my ut_properties boundry is for 78757, not the UT lines, so I need to redo that..





async function processListingData(index: string, options: ZillowOptions, data: ZillowRentalInput[], enabled: boolean): Promise<void> {
  const es = ElasticSearch.getInstance();
  const date = timestamp();
  const _recs = await es.data.get(index);
  // filter out records that have unitCount, because those are listings that contain multiple
  // units so the price data is a range and not accurate / something that can be used for calculating
  // (they are mega apartment complexes)
  const allRecords = (_recs?.records ?? []).filter(r => r.unitCount === undefined);

  // Process each record in parallel using Promise.all
  const computedData = await Promise.all(
    data.map((record) => {
      // Extract and parse the price from the record
      const price = stringToNumber(record.price);

      // Fetch the base record from Elasticsearch
      let baseRecord = allRecords.find(r => r.address === record.address); // await fetchBaseRecord(es, index, record.address, date);
      baseRecord = baseRecord ?? {
        firstSeen: date,
      };

      // I turned this off in favor of keeping duplicate records
      // I think Kibana will work better with duplicates
      // baseRecord = updateBaseRecord(baseRecord, price, date);

      // Merge the base record with the current record and additional fields
      const decoratedRecord = {
        ...baseRecord,
        ...record, price,
        latLong: { lat: record.latLong.latitude, lon: record.latLong.longitude },
        lastSeen: date,
        firstListed: timestamp(+new Date(date) - (record.timeOnZillow ?? 0)),
        decoratedPrice: record.price,
        url: `https://www.zillow.com${record.detailUrl}`

      };

      return decoratedRecord;
    })
  );

  if (enabled) {
    // Upsert the computed data into Elasticsearch
    await es.index.upsert(index, {
      records: computedData,
      meta: {
        ...(options.meta ?? {}),
        url: options.url,
      },
    });
  }

  return {
    records: computedData,
    meta: {
      ...(options.meta ?? {}),
      url: options.url,
    },
  };
}

export async function scrapeZillowProperties(index: string, options: ZillowOptions): Promise<any> {
  const cachedData = await cache.get(options.url) as ZillowRequestResults;
  const data = cachedData?.cat1?.searchResults?.mapResults ?? [];
  if (data?.length) {
    logger.debug('Returning dev cache becase its been less than a week since the last PUT attempt.');
    // DB mutation disabled rn
    return processListingData(index, options, data, false);
  }

  const es = ElasticSearch.getInstance();
  const meta = await es.data.metadata(index);

  if (!meta?.cookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found in the index metadata. Please pass in a session cookie @ options.cookies');
  }

  if (!meta?.payload && !options.payload) {
    throw new Error('No payload found in the index metadata. Please pass in the PUT payload of the query region (see the "async-create-search-page-state" request payload in the zillow page request)');
  }

  if (options.payload) {
    es.index.updateMetadata(index, { payload: options.payload });
  }

  const cookies = meta?.cookies ?? options.cookies.replace('\"', "");
  const payload = meta?.payload ?? options.payload;

  const response = await fetch('https://www.zillow.com/async-create-search-page-state', {
    method: 'PUT',
    headers: {
      'Cookie': cookies,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      'Origin': 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(payload)
  });
  const responseCookies = response.headers.get('set-cookie');
  es.index.updateMetadata(index, { cookies: responseCookies });
  try {
    const res = await response.json() as ZillowRequestResults;
    await cache.set(options.url, res);
    processListingData(index, options, (res?.cat1?.searchResults?.mapResults ?? []), true);
    return res;
  } catch (error) {
    const text = await response.text();
    logger.error(error);
    logger.error(text);
    return error;
  }
}

const MONTHS_IN_YEAR = 12;
const YEARLY_TAX_RATE = 0.02;
const YEARLY_MAINTENANCE_RATE = 0.01;
const YEARLY_PROPERTY_INSURANCE_RATE = 0.0057;
// receive 2 indexes (rentals and properties) and calculate the ROI of a property based on the rental data (analyzeRentalData())
export async function calculateAverageAndMedianRentalPrices(rentalIndex: string, propertyIndex: string): Promise<void> {
  const decoratedIndex = `${propertyIndex}_decorated`;
  const es = ElasticSearch.getInstance();
  const rentalPromise = analyzeRentalData(rentalIndex);
  const propertyPromise = es.data.query(propertyIndex, queries.LAST_30_DAYS_UNIQUE_BY_ADDRESS).then(responseTransformer);

  const [rentalAnalysis, properties] = await Promise.all([rentalPromise, propertyPromise]);
  const decoratedProperties = properties
    .filter(p => {
      // remove properties that don't have a bed count, or are over 1.5M, or are lots, or are over $1M and have less than 5 beds
      const hasAnalysisReport = rentalAnalysis.records.find(report => report.beds === p.beds)
      return hasAnalysisReport &&
        p.price < 1000000 &&
        p.hdpData?.homeInfo?.homeType !== 'LOT';
    })
    .map((property) => {
      const {
        avgRent = 0,
        medianRent = 0,
        avgRentPerSqft = 0,
        medianRentPerSqft = 0
      } = rentalAnalysis.records.find(report => report.beds === property.beds) ?? {};
      const avgAnnualNetIncome = avgRent * MONTHS_IN_YEAR;
      const medianAnnualNetIncome = medianRent * MONTHS_IN_YEAR;
      const tax = property.price * YEARLY_TAX_RATE;
      const maintenance = property.price * YEARLY_MAINTENANCE_RATE;
      const insurance = property.price * YEARLY_PROPERTY_INSURANCE_RATE;
      const yearlyCosts = {
        tax,
        maintenance,
        insurance,
        totalCosts: tax + maintenance + insurance,
        // TODO: how to find HOA (if there is one)
        // NOTE: Redfin has HOA, so it's possible you might scrape redfin strictly for HOA
        // and join by address
      };
      const avgAnnualGrossIncome = avgAnnualNetIncome - yearlyCosts.totalCosts;
      const yearlyStats = {
        avg: {
          net: avgAnnualNetIncome,
          gross: avgAnnualGrossIncome,
          roi: avgAnnualGrossIncome / property.price,
          capRate: avgAnnualGrossIncome / property.price,
          cashFlow: avgAnnualNetIncome - yearlyCosts.totalCosts,
          yearsTillBreakEven: property.price / (avgAnnualGrossIncome - yearlyCosts.totalCosts),
        },
        median: {
          net: medianAnnualNetIncome,
          gross: avgAnnualGrossIncome - yearlyCosts.totalCosts,
          roi: avgAnnualGrossIncome / property.price,
          capRate: avgAnnualGrossIncome / property.price,
          cashFlow: medianAnnualNetIncome - yearlyCosts.totalCosts,
          yearsTillBreakEven: property.price / (avgAnnualGrossIncome - yearlyCosts.totalCosts),
        }
      };
      return {
        ...property,
        costs: {
          yearly: yearlyCosts,
          monthly: {
            tax: yearlyCosts.tax / MONTHS_IN_YEAR,
            maintenance: yearlyCosts.maintenance / MONTHS_IN_YEAR,
            insurance: yearlyCosts.insurance / MONTHS_IN_YEAR,
            totalCosts: yearlyCosts.totalCosts / MONTHS_IN_YEAR,
          }
        },
        stats: {
          yearly: yearlyStats,
          monthly: {
            avg: {
              net: yearlyStats.avg.net / MONTHS_IN_YEAR,
              gross: yearlyStats.avg.gross / MONTHS_IN_YEAR,
              cashFlow: yearlyStats.avg.cashFlow / MONTHS_IN_YEAR,
            },
            median: {
              net: yearlyStats.median.net / MONTHS_IN_YEAR,
              gross: yearlyStats.median.gross / MONTHS_IN_YEAR,
              cashFlow: yearlyStats.median.cashFlow / MONTHS_IN_YEAR,
            }
          }
        }
      };
    });


  await es.index.deleteIndex(decoratedIndex); // do we want to clear the index before upserting?
  // ... probably not if the upsert is able to properly update the records. . .
  await es.index.upsert(decoratedIndex, {
    records: decoratedProperties,
    meta: {
      rentalIndex,
      propertyIndex,
      rentalAnalysis
    },
  });

  return decoratedProperties;
}

type ZillowRequestResults = {
  cat1?: {
    searchResults?: {
      mapResults?: ZillowRentalInput[];
    };
  };
};