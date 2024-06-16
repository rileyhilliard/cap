import logger from '@utils/logger';
import { Cache } from '@utils/cache';
import MongoDBService from '@utils/mongo-db';
import fetch from 'node-fetch';
import { timestamp, normalizeAddress, hasher, decimals, stringToNumber } from '@utils/helpers';

import type {
  MergedProperty,
  DecoratedProperty,
  YearlyCosts,
  YearlyStats,
  ZillowRental,
  ZillowRequestResults,
  ZillowProperty,
} from '@backend/types/property-types';
import type { RentalReport } from '@utils/market-report';

const cache = new Cache();
const API_ROOT = 'https://www.zillow.com/async-create-search-page-state';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAYLOAD = {
  searchQueryState: {
    isMapVisible: true,
    mapBounds: {
      north: 30.32924698878185,
      south: 30.27700404394706,
      east: -97.7023716922353,
      west: -97.7642556186269,
    },
    filterState: {
      isForRent: {
        value: true,
      },
      isForSaleByAgent: {
        value: false,
      },
      isForSaleByOwner: {
        value: false,
      },
      isNewConstruction: {
        value: false,
      },
      isComingSoon: {
        value: false,
      },
      isAuction: {
        value: false,
      },
      isForSaleForeclosure: {
        value: false,
      },
      isAllHomes: {
        value: true,
      },
    },
    isListVisible: true,
    mapZoom: 14,
    customRegionId: 'ebd3465b7cX1-CRvfdul3zlzgkr_1487v5',
  },
  wants: {
    cat1: ['listResults', 'mapResults'],
  },
  requestId: 25,
  isDebugRequest: false,
};

export interface ZillowRentalOptions {
  payload: {
    isDebugRequest: boolean;
    requestId: number;
    searchQueryState: {
      filterState: {
        [key: string]: {
          value: boolean;
        };
      };
      pagination: {};
      mapBounds: {
        east: number;
        south: number;
        north: number;
        west: number;
      };
      customRegionId: string;
      isListVisible: boolean;
      isMapVisible: boolean;
      mapZoom: number;
    };
    wants: {
      cat1: string[];
    };
  };
  cookies: string;
  url: string;
}

export interface ZillowPropertyOptions {
  payload: {
    isDebugRequest: boolean;
    requestId: number;
    searchQueryState: {
      filterState: {
        sortSelection: {
          value: string;
        };
        isAllHomes: {
          value: boolean;
        };
      };
      pagination: {};
      mapBounds: {
        east: number;
        south: number;
        north: number;
        west: number;
      };
      customRegionId: string;
      isListVisible: boolean;
      isMapVisible: boolean;
      mapZoom: number;
    };
    wants: {
      cat1: string[];
      cat2: string[];
    };
  };
  cookies: string;
  url: string;
}

function processRentalData(results: ZillowRequestResults): ZillowRental[] {
  const data = results?.cat1?.searchResults?.mapResults ?? [];
  return data.filter((r) => r.unitCount === undefined).map((r) => mergeRecords(r));
}

// Helper function to update the base record with new price and date
function updateBaseRecord(baseRecord: BaseRecord, price: number, date: string): BaseRecord {
  return {
    ...baseRecord,
    pastPrices: [...(baseRecord.pastPrices || []), { price, date }],
  };
}

// Helper function to merge the base record with the current record and additional fields
function mergeRecords(record: ZillowRental, preExistingRecord?: BaseRecord): ZillowRental {
  const date = timestamp();
  return {
    ...(preExistingRecord ?? {}),
    ...record,
    price: stringToNumber(record.price),
    id: hasher(normalizeAddress(record.address)),
    latLong: {
      lat: record.latLong.latitude,
      lon: record.latLong.longitude,
    },
    lastSeen: date,
    firstListed: timestamp(+new Date(date) - (record.timeOnZillow ?? 0)),
    url: `https://www.zillow.com${record.detailUrl}`,
  };
}

// Type definitions
interface BaseRecord {
  id?: string;
  pastPrices?: { price: number; date: string }[];
  firstSeen: string;
}

export async function scrapeZillowRentals(index: string, options: ZillowRentalOptions): Promise<ZillowRental[]> {
  const cachedData = (await cache.get(options.url)) as ZillowRequestResults;
  if (cachedData) {
    return processRentalData(cachedData);
  }

  const mongo = MongoDBService.getInstance();
  const meta = await mongo.data.metadata(index);
  if (!meta?.cookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found in the index metadata. Please pass in a session cookie @ options.cookies');
  }

  if (!meta?.payload && !options.payload) {
    throw new Error(
      'No payload found in the index metadata. Please pass in the PUT payload of the query region (see the "async-create-search-page-state" request payload in the zillow page request)',
    );
  }

  if (options.payload) {
    mongo.index.updateMetadata(index, { payload: options.payload });
  }

  const cookies = meta?.cookies ?? options.cookies.replace('"', '');
  const payload = meta?.payload ?? options.payload;
  const response = await fetch('https://www.zillow.com/async-create-search-page-state', {
    method: 'PUT',
    headers: {
      Cookie: cookies,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      Origin: 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(payload),
  });
  const responseCookies = response.headers.get('set-cookie');
  mongo.index.updateMetadata(index, { cookies: responseCookies });
  try {
    const res = (await response.json()) as ZillowRequestResults;
    cache.set(options.url, res);
    const records = processRentalData(res);
    return records;
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

async function processListingData(
  index: string,
  options: ZillowPropertyOptions,
  data: ZillowRental[],
): Promise<ZillowProperty[]> {
  const mongo = MongoDBService.getInstance();
  const date = timestamp();
  const _recs = await mongo.data.get(index);
  // filter out records that have unitCount, because those are listings that contain multiple
  // units so the price data is a range and not accurate / something that can be used for calculating
  // (they are mega apartment complexes)
  const allRecords = (_recs?.records ?? []).filter((r) => r.unitCount === undefined);

  // Process each record in parallel using Promise.all
  const computedData = await Promise.all(
    data.map((record) => {
      // Extract and parse the price from the record
      const price = stringToNumber(record.price);

      // Fetch the base record from Elasticsearch
      let baseRecord = allRecords.find((r) => r.address === record.address); // await fetchBaseRecord(es, index, record.address, date);
      baseRecord = baseRecord ?? {
        firstSeen: date,
      };

      // I turned this off in favor of keeping duplicate records
      // I think Kibana will work better with duplicates
      // baseRecord = updateBaseRecord(baseRecord, price, date);

      // Merge the base record with the current record and additional fields
      const decoratedRecord = {
        ...baseRecord,
        ...record,
        price,
        latLong: { lat: record.latLong.latitude, lon: record.latLong.longitude },
        lastSeen: date,
        firstListed: timestamp(+new Date(date) - (record.timeOnZillow ?? 0)),
        decoratedPrice: record.price,
        url: `https://www.zillow.com${record.detailUrl}`,
        id: hasher(normalizeAddress(record.address)),
      };

      return decoratedRecord;
    }),
  );

  return computedData;
}

export async function scrapeZillowProperties(index: string, options: ZillowPropertyOptions): Promise<ZillowProperty[]> {
  const cachedData = (await cache.get(options.url)) as ZillowRequestResults;
  const data = cachedData?.cat1?.searchResults?.mapResults ?? [];
  if (data?.length) {
    logger.debug('Returning dev cache becase its been less than a week since the last PUT attempt.');
    // DB mutation disabled rn
    return processListingData(index, options, data);
  }

  const mongo = MongoDBService.getInstance();
  const meta = await mongo.data.metadata(index);

  if (!meta?.cookies && typeof options.cookies !== 'string') {
    throw new Error('No cookies found in the index metadata. Please pass in a session cookie @ options.cookies');
  }

  if (!meta?.payload && !options.payload) {
    throw new Error(
      'No payload found in the index metadata. Please pass in the PUT payload of the query region (see the "async-create-search-page-state" request payload in the zillow page request)',
    );
  }

  if (options.payload) {
    mongo.index.updateMetadata(index, { payload: options.payload });
  }

  const cookies = meta?.cookies ?? options.cookies.replace('"', '');
  const payload = options.payload ?? meta?.payload;

  const response = await fetch('https://www.zillow.com/async-create-search-page-state', {
    method: 'PUT',
    headers: {
      Cookie: cookies,
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      Origin: 'https://www.zillow.com',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(payload),
  });
  const responseCookies = response.headers.get('set-cookie');
  mongo.index.updateMetadata(index, { cookies: responseCookies });
  try {
    const res = (await response.json()) as ZillowRequestResults;
    await cache.set(options.url, res);
    const results = await processListingData(index, options, res?.cat1?.searchResults?.mapResults ?? [], true);
    return results;
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

export function decorateProperties(
  properties: MergedProperty[],
  rentalAnalysis: RentalReport = {},
): DecoratedProperty[] {
  return properties.map((property) => {
    const { beds, hoa, price } = property;
    // fallback to 4/3 bedroom report if there's no report data
    // this happens if the beds count is high, like a 14 bedroom probably doenst 
    // have any comparative rental data
    const report = rentalAnalysis[beds] ?? rentalAnalysis[4] ?? rentalAnalysis[3] ?? rentalAnalysis[2] ?? {};
    const { avgRent = 0, medianRent = 0 } = report;


    const yearlyCosts: YearlyCosts = {
      tax: decimals(price * YEARLY_TAX_RATE),
      maintenance: decimals(price * YEARLY_MAINTENANCE_RATE),
      insurance: decimals(price * YEARLY_PROPERTY_INSURANCE_RATE),
      hoa: decimals((hoa ?? 0) * MONTHS_IN_YEAR),
      total: 0,
    };
    yearlyCosts.total = decimals(yearlyCosts.tax + yearlyCosts.maintenance + yearlyCosts.insurance + yearlyCosts.hoa);

    const calculateYearlyStats = (monthlyRent: number): YearlyStats => {
      const annualNetIncome = decimals(monthlyRent * MONTHS_IN_YEAR);
      const annualGrossIncome = decimals(annualNetIncome - yearlyCosts.total);
      return {
        net: annualNetIncome,
        gross: annualGrossIncome,
        roi: decimals(annualGrossIncome / price),
        capRate: decimals(annualGrossIncome / price),
        cashFlow: decimals(annualGrossIncome),
        breakEvenYears: decimals(price / annualGrossIncome),
      };
    };

    const yearlyStats = {
      avg: calculateYearlyStats(avgRent),
      median: calculateYearlyStats(medianRent),
    };

    return {
      ...property,
      avgRent,
      medianRent,
      costs: yearlyCosts,
      returns: yearlyStats,
    };
  });
}
