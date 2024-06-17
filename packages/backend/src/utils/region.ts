import 'reflect-metadata';
import { scrapeRedfinProperties, scrapeRedfinRentals } from '@backend/utils/redfin';
import { scrapeZillowRentals, scrapeZillowProperties, decorateProperties } from '@utils/zillow';
import MongoDBService from '@utils/mongo-db';
import { generateRentalReport } from '@utils/market-report';
import { mergeRecords, timestamp, hasher, isDev, delayRandom } from '@utils/helpers';
import type { ZillowRentalOptions, ZillowPropertyOptions } from '@utils/zillow';
import type {
  ZillowRental,
  RedfinRental,
  RedfinProperty,
  DecoratedProperty,
  ZillowProperty,
  MergedProperty,
} from '@backend/types/property-types';
import type { RedfinOptions } from '@utils/redfin';
import type { RentalReport } from '@utils/market-report';
import logger from './logger';

const RENTALS_PREFIX = 'rentals';
const PROPERTIES_PREFIX = 'properties';

const snakeCase = (...args: string[]) => args.filter(Boolean).join('_');

const getZillowPropertyConfig = (config: any) => ({
  ...config,
  url: config.url
    .replace('for_rent', 'for_sale')
    .replace(
      /("filterState").*/,
      '"filterState":{"ah":{"value":true},"sort":{"value":"globalrelevanceex"}},"isListVisible":true}',
    ),
  payload: {
    ...config.payload,
    searchQueryState: {
      ...config.payload.searchQueryState,
      filterState: {
        sortSelection: { value: 'globalrelevanceex' },
        isAllHomes: { value: true },
      },
    },
    wants: {
      ...config.payload.wants,
      cat2: ['total'],
    },
  },
});

const getRedfinPropertyConfig = (config: any) => ({
  ...config,
  url: config.url
    .replace('v1/search/rentals', 'gis')
    .replace(
      /includeKeyFacts.*poly=/,
      'include_nearby_homes=true&market=austin&mpt=99&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly=',
    ),
});

export const getIndexNames = (regionId: string) => ({
  COMBINED_RENTALS_INDEX: snakeCase(regionId, RENTALS_PREFIX),
  COMBINED_PROPERTIES_INDEX: snakeCase(regionId, PROPERTIES_PREFIX),
  ZILLOW_RENTALS_INDEX: snakeCase(regionId, RENTALS_PREFIX, 'zillow'),
  ZILLOW_PROPERTIES_INDEX: snakeCase(regionId, PROPERTIES_PREFIX, 'zillow'),
  REDFIN_RENTALS_INDEX: snakeCase(regionId, RENTALS_PREFIX, 'redfin'),
  REDFIN_PROPERTIES_INDEX: snakeCase(regionId, PROPERTIES_PREFIX, 'redfin'),
  RENTAL_REPORT_INDEX: snakeCase(regionId, RENTALS_PREFIX, 'report'),
});

export const getBaseMeta = (regionId: string, zillow: any, redfin: any, indexes: ReturnType<typeof getIndexNames>) => ({
  lastRan: timestamp(),
  region: regionId,
  zillow: {
    rentals: zillow,
    properties: getZillowPropertyConfig(zillow),
  },
  redfin: {
    rentals: redfin,
    properties: getRedfinPropertyConfig(redfin),
  },
  relatedIndexes: Object.values(indexes),
});

const scrapeData = async (
  indexes: ReturnType<typeof getIndexNames>,
  zillow: RegionConfig['zillow'],
  redfin: RegionConfig['redfin'],
): Promise<BulkScrapedData> => {
  const startTime = Date.now();
  logger.info('Fetching data from Zillow and Redfin...');

  const [
    zillowRentalResults,
    redfinRentalResults,
    zillowPropertiesResults,
    redfinPropertiesResults,
  ] = await Promise.all([
    scrapeZillowRentals(indexes.ZILLOW_RENTALS_INDEX, zillow.rentals)
      .then(async (result) => {
        logger.info('Zillow rentals fetch succeeded');
        return result;
      })
      .catch((error) => {
        logger.error('Zillow rentals fetch failed', error);
        throw error;
      }),
    delayRandom().then(() => scrapeRedfinRentals(indexes.REDFIN_RENTALS_INDEX, redfin.rentals)
      .then(async (result) => {
        logger.info('Redfin rentals fetch succeeded');
        return result;
      })
      .catch((error) => {
        logger.error('Redfin rentals fetch failed', error);
        throw error;
      })),
    delayRandom().then(() => scrapeZillowProperties(indexes.ZILLOW_PROPERTIES_INDEX, getZillowPropertyConfig(zillow.properties))
      .then(async (result) => {
        logger.info('Zillow properties fetch succeeded');
        return result;
      })
      .catch((error) => {
        logger.error('Zillow properties fetch failed', error);
        throw error;
      })),
    delayRandom().then(() => scrapeRedfinProperties(indexes.REDFIN_PROPERTIES_INDEX, getRedfinPropertyConfig(redfin.properties))
      .then(async (result) => {
        logger.info('Redfin properties fetch succeeded 🎉');
        return result;
      })
      .catch((error) => {
        logger.error('Redfin properties fetch failed', error);
        throw error;
      })),
  ]);

  const endTime = Date.now();
  logger.info(`Data fetching succeeded. Time taken: ${endTime - startTime}ms`);

  return { zillowRentalResults, redfinRentalResults, zillowPropertiesResults, redfinPropertiesResults };
};

const processData = (scrapedData: BulkScrapedData, indexes: ReturnType<typeof getIndexNames>): ProcessedData => {
  const { zillowRentalResults, redfinRentalResults, zillowPropertiesResults, redfinPropertiesResults } = scrapedData;

  const combinedRentals = mergeRecords(redfinRentalResults, zillowRentalResults);
  const rentalReport = generateRentalReport(indexes.RENTAL_REPORT_INDEX, combinedRentals);
  const combinedProperties = mergeRecords(redfinPropertiesResults, zillowPropertiesResults);
  const decoratedProperties = decorateProperties(combinedProperties, rentalReport);

  return { combinedRentals, rentalReport, decoratedProperties };
};

const getIndexData = (
  processedData: ProcessedData,
  scrapedData: BulkScrapedData,
  indexes: ReturnType<typeof getIndexNames>,
  baseMeta: RegionConfig,
) => {
  const meta = { ...baseMeta };
  return [
    { index: indexes.REDFIN_RENTALS_INDEX, records: scrapedData.redfinRentalResults, meta: meta.redfin.rentals },
    { index: indexes.ZILLOW_RENTALS_INDEX, records: scrapedData.zillowRentalResults, meta: meta.zillow.rentals },
    { index: indexes.RENTAL_REPORT_INDEX, records: [processedData.rentalReport], meta },
    {
      index: indexes.REDFIN_PROPERTIES_INDEX,
      records: scrapedData.redfinPropertiesResults,
      meta: meta.redfin.properties,
    },
    {
      index: indexes.ZILLOW_PROPERTIES_INDEX,
      records: scrapedData.zillowPropertiesResults,
      meta: meta.zillow.properties,
    },
    { index: indexes.COMBINED_RENTALS_INDEX, records: processedData.combinedRentals },
    {
      index: indexes.COMBINED_PROPERTIES_INDEX,
      records: processedData.decoratedProperties,
      meta: { ...meta, rentalReport: processedData.rentalReport },
    },
  ];
};

const upsertData = async (indexData: ReturnType<typeof getIndexData>) => {
  const mongo = MongoDBService.getInstance();

  for (const { index, records, meta } of indexData) {
    await mongo.index.upsert(index, { records, meta });
    logger.info(`Upserted ${index} with ${records.length} records 🎉`);
  }
};

export const shouldRun = async (regionId: string): Promise<boolean> => {
  const mongo = MongoDBService.getInstance();
  const TwentyThreeHours = 23 * 60 * 60 * 1000;
  const prevMeta = await mongo.data.metadata(regionId);
  const lastRan = new Date(prevMeta?.lastRan ?? 0).getTime();

  // dont run more than once per day
  return isDev || Date.now() - lastRan > TwentyThreeHours;
}

export const updateRegionsIndex = async (regionId: string, options: any) => {
  const mongo = MongoDBService.getInstance();
  const proceed = await shouldRun(regionId);

  if (!proceed) {
    logger.info(`Skipping updating the regions tracker index for ${regionId} as it was updated less than a day ago`);
    return;
  }

  const { redfin, zillow } = options;
  const indexes = getIndexNames(regionId);
  const baseMeta = getBaseMeta(regionId, zillow, redfin, indexes);
  const payload = {
    records: [
      {
        ...baseMeta,
        region: regionId,
        id: hasher(regionId),
      },
    ],
    meta: {
      lastRan: timestamp(),
    },
  };

  await mongo.index.upsert('registered_indexes', payload);
};

async function getRegionConfig(regionId: string): Promise<RegionConfig | void> {
  const mongo = MongoDBService.getInstance();
  const regions = await mongo.data.get('registered_indexes');
  const config = (regions?.records ?? []).filter((r: RegionConfig) => r.region === regionId)?.at(0);
  if (!config) {
    logger.error(`no config found for ${regionId}`);
    return;
  }

  return config as RegionConfig;
}

export async function fetchRegion(regionId: string) {
  const proceed = await shouldRun(regionId);
  if (!proceed) {
    logger.warn(`${regionId} was updated less than a day ago, this is currently a warning, but should eventually be an error`);
    // return;
  }

  const options = await getRegionConfig(regionId);
  const { redfin, zillow } = options;

  const indexes = getIndexNames(regionId);
  const scrapedData = await scrapeData(indexes, zillow, redfin);
  const processedData = processData(scrapedData, indexes);
  const indexData = getIndexData(processedData, scrapedData, indexes, options);

  // I dont think I need to update this again 🤔
  // await updateRegionsIndex(regionId, options);
  upsertData(indexData);

  return processedData.decoratedProperties;
}

interface RegionConfig {
  region: string;
  zillow: {
    rentals: ZillowRentalOptions;
    properties: ZillowPropertyOptions;
  };
  redfin: {
    rentals: RedfinOptions;
    properties: RedfinOptions;
  };
  relatedIndexes: string[];
  id: string;
}

interface BulkScrapedData {
  zillowRentalResults: ZillowRental[];
  redfinRentalResults: RedfinRental[];
  zillowPropertiesResults: ZillowProperty[];
  redfinPropertiesResults: RedfinProperty[];
}

interface ProcessedData {
  combinedRentals: MergedProperty[];
  rentalReport: RentalReport;
  decoratedProperties: DecoratedProperty[];
}
