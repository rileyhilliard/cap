import crypto from 'crypto';
import type { MergedProperty } from '@backend/types/property-types';
export const timestamp = (date = new Date()): string => new Date(date).toISOString();

export function median(numbers: number[]): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function percentile(numbers: number[], percentile: number): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const index = (percentile / 100) * sorted.length;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= sorted.length) {
    return sorted[lower];
  }

  return decimals(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

export function decimals(num: number, dec: number = 2) {
  return parseFloat(num.toFixed(dec));
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase()
    .replace(/apt|apartment|Unit|unit/, 'apt') // Standardize apartment abbreviation
    .replace(/st|street/, 'street') // Standardize street abbreviation
    .replace(/\s+#/, ' apt ') // Convert '#' to 'apt' for apartment numbers
    .replace(/,|\./g, '') // Remove commas and periods
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim(); // Remove leading and trailing spaces
}

export function hasher(string: string): string {
  return crypto.createHash('sha256').update(string).digest('hex');
}

export function mergeRecords(redfin: any[], zillow: any[]): MergedProperty[] {
  const redfinDictionary = Object.create(null);
  redfin.forEach(property => redfinDictionary[property.fingerprint] = property);
  const mergedRecords = zillow.map(property => {
    const redfinProperty = redfinDictionary[property.fingerprint];
    if (redfinProperty) {
      const mergedProperty = {
        ...property,
        redfinUrl: redfinProperty.url,
        redfinDescription: redfinProperty.description,
        redfinAddress: redfinProperty.address,
        redfinPrice: redfinProperty.price,
        redfinBeds: redfinProperty.beds,
        redfinBaths: redfinProperty.baths,
        redfinFirstListed: redfinProperty.firstListed,
        redfinLastSeen: redfinProperty.lastSeen,
        redfinFirstSeen: redfinProperty.firstSeen,
        mergedRecords: true
      };
      delete redfinDictionary[property.fingerprint];
      return mergedProperty;
    }
    return property;
  });
  // for now, purge any listing over 1M
  // .filter(property => property.price < 1000000);

  return mergedRecords.concat(Object.values(redfinDictionary)).sort((a, b) => a.address < b.address ? -1 : 1);
}

export function mergePropertyIndexes(redfin: any[], zillow: any[]): any[] {
  const redfinDictionary = Object.create(null);
  redfin.forEach(property => redfinDictionary[property.fingerprint] = property);
  const mergedRecords = zillow.map(property => {
    const redfinProperty = redfinDictionary[property.fingerprint];
    if (redfinProperty) {
      const mergedProperty = {
        ...property,
        redfinUrl: redfinProperty.url,
        redfinDescription: redfinProperty.description,
        redfinAddress: redfinProperty.address,
        redfinPrice: redfinProperty.price,
        redfinBeds: redfinProperty.beds,
        redfinBaths: redfinProperty.baths,
        redfinFirstListed: redfinProperty.firstListed,
        redfinLastSeen: redfinProperty.lastSeen,
        redfinFirstSeen: redfinProperty.firstSeen,
        mergedRecords: true
      };
      delete redfinDictionary[property.fingerprint];
      return mergedProperty;
    }
    return property;
  });

  return mergedRecords.concat(Object.values(redfinDictionary)).sort((a, b) => a.address < b.address ? -1 : 1);
}