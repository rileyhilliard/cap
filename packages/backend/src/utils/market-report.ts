import { timestamp } from '@utils/helpers';
import { median, percentile, decimals } from '@utils/helpers';
import type { MergedProperty } from '@backend/types/property-types';

export function generateRentalReport(index: string, properties: MergedProperty[]): RentalReport {
  if (properties.length === 0) return {};
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
