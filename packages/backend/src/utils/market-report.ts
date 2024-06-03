import { timestamp } from '@utils/helpers';
import ElasticSearch, { responseTransformer } from '@utils/elastic-search';
import { queries } from '@utils/elastic-search-queries';
import { median, percentile, decimals } from '@utils/helpers';
import type { MergedProperty } from '@backend/types/property-types';

interface Property {
  price: number;
  beds: number;
  area: number;
}

interface Stat {
  index: string;
  date: string;
  beds: number;
  type: string;
  description: string;
  count: number;
  rents?: number[];
  avgRent: number;
  medianRent: number;
  avgRentPerSqft: number;
  medianRentPerSqft: number;
  rentPercentiles: {
    '25th': number;
    '50th': number;
    '90th': number;
  };
  rentPerSqftPercentiles: {
    '25th': number;
    '50th': number;
    '90th': number;
  };
}

interface Results {
  records: Omit<Stat, 'rents'>[];
}

async function getProperties(index: string): Promise<Property[]> {
  const es = ElasticSearch.getInstance();
  const documents = await es.data.query(index, queries.LAST_30_DAYS_UNIQUE_BY_ADDRESS);
  return responseTransformer(documents).filter((r: Property) => r.beds !== undefined) as Property[];
}

export async function analyzeRentalData(index: string): Promise<Results> {
  const date = timestamp();
  const properties = await getProperties(index);
  const stats: BedroomStats = {
    total: {
      index,
      date,
      type: 'total',
      description: 'All properties over the given timespan, regulardless of bedroom count',
      count: 0,
      avgRent: 0,
      medianRent: 0,
      avgRentPerSqft: 0,
      medianRentPerSqft: 0,
      rentPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
      rentPerSqftPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
      rents: [],
    },
  };

  // Group properties by bedroom count
  properties.forEach((property) => {
    const { price, beds } = property;

    if (!stats[beds]) {
      stats[beds] = {
        index,
        date,
        beds,
        type: beds === 0 ? 'studio' : `${beds}-bedroom`,
        description: `${beds === 0 ? 'Studio' : `${beds} bedroom`} properties`,
        count: 0,
        rents: [],
        avgRent: 0,
        medianRent: 0,
        avgRentPerSqft: 0,
        medianRentPerSqft: 0,
        rentPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
        rentPerSqftPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
      };
    }

    stats[beds].count++;
    stats[beds]?.rents?.push(price);

    // Add to total group
    stats.total.count++;
    stats.total?.rents?.push(price);
  });

  // Calculate statistics for each bedroom count
  const records = Object.keys(stats).reduce((acc, bedroom) => {
    const { rents, count } = stats[bedroom];
    // if the count is too low, don't include it in the report
    // this is to prevent outliers from skewing the data
    if (count < 5) {
      delete stats[bedroom];
      return acc;
    }

    const sqftRents = rents?.map((rent, i) => rent / properties[i].area).filter((p) => !isNaN(p)) ?? [];

    const dictionary = stats[bedroom];
    dictionary.avgRent = (rents?.length && decimals(rents.reduce((a, b) => a + b) / count)) ?? 0;
    dictionary.medianRent = (rents?.length && decimals(median(rents))) ?? 0;
    dictionary.avgRentPerSqft = decimals(sqftRents.reduce((a, b) => a + b) / count);
    dictionary.medianRentPerSqft = decimals(median(sqftRents));
    dictionary.rentPercentiles = {
      '25th': percentile(rents ?? [], 25),
      '50th': percentile(rents ?? [], 50),
      '90th': percentile(rents ?? [], 90),
    };
    stats[bedroom].rentPerSqftPercentiles = {
      '25th': percentile(sqftRents, 25),
      '50th': percentile(sqftRents, 50),
      '90th': percentile(sqftRents, 90),
    };
    delete stats[bedroom].rents;
    acc.push(stats[bedroom]);
    return acc;
  }, [] as Stat[]);
  return { records: records.sort((a, b) => b.count - a.count) };
}

export function generateRentalReport(index: string, properties: MergedProperty[]): RentalReport {
  const date = timestamp();
  const BASE_STAT = {
    index,
    date,
    beds: 0,
    count: 0,
    avgSqFt: 0,
    avgRent: 0,
    medianRent: 0,
    avgRentPerSqft: 0,
    medianRentPerSqft: 0,
    rentPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
    rentPerSqftPercentiles: { '25th': 0, '50th': 0, '90th': 0 },
    sqFts: [],
    prices: [],
    sqftRents: [],
  };
  const stats: Stats = {
    total: {
      ...structuredClone(BASE_STAT),
      type: 'total',
      description: 'All properties over the given timespan, regardless of bedroom count',
    },
  };

  properties.forEach((property) => {
    const { beds, area, price } = property;
    if (typeof beds !== 'number') return;

    if (!stats[beds]) {
      stats[beds] = {
        ...structuredClone(BASE_STAT),
        type: beds === 0 ? 'studio' : `${beds}-bedroom`,
        description: `${beds === 0 ? 'Studio' : `${beds} bedroom`} properties`,
        beds,
      };
    }

    if (area !== undefined) {
      stats[beds].sqFts?.push(area);
      stats.total.sqFts?.push(area);
      stats[beds].sqftRents?.push(price / area);
      stats.total.sqftRents?.push(price / area);
    }

    stats[beds].prices?.push(price);
    stats.total.prices?.push(price);

    stats[beds].count++;
    stats.total.count++;
  });

  Object.values(stats).forEach((dictionary) => {
    const { sqFts = [], prices = [], sqftRents = [], count } = dictionary;
    dictionary.avgSqFt = sqFts.length ? decimals(sqFts.reduce((a, b) => a + b) / sqFts.length) : 0;
    dictionary.avgRent = decimals(prices.reduce((a, b) => a + b, 0) / count);
    dictionary.medianRent = decimals(median(prices));
    dictionary.avgRentPerSqft = decimals(sqftRents.reduce((a, b) => a + b, 0) / sqftRents.length);
    dictionary.medianRentPerSqft = decimals(median(sqftRents));
    dictionary.rentPercentiles = {
      '25th': percentile(prices, 25),
      '50th': percentile(prices, 50),
      '90th': percentile(prices, 90),
    };
    dictionary.rentPerSqftPercentiles = {
      '25th': percentile(sqftRents, 25),
      '50th': percentile(sqftRents, 50),
      '90th': percentile(sqftRents, 90),
    };
    delete dictionary.sqFts;
    delete dictionary.prices;
    delete dictionary.sqftRents;
  });

  return stats as RentalReport;
}

interface Percentiles {
  '25th': number;
  '50th': number;
  '90th': number;
}

interface BedroomDictionary {
  index: string;
  date: string;
  beds: number;
  type: string;
  description: string;
  count: number;
  avgSqFt: number;
  avgRent: number;
  medianRent: number;
  avgRentPerSqft: number;
  medianRentPerSqft: number;
  rentPercentiles: Percentiles;
  rentPerSqftPercentiles: Percentiles;
  sqFts?: number[];
  sqftRents?: number[];
  prices?: number[];
}

export interface Stats {
  [key: string]: BedroomDictionary;
}

export interface RentalReport {
  [key: string]: Omit<BedroomDictionary, 'sqFts' | 'prices' | 'sqftRents'>;
}
