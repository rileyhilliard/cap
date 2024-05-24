import crypto from 'crypto';
import type { MergedProperty } from '@backend/types/property-types';
import logger from '@utils/logger';

export const timestamp = (date: number | Date = new Date()): string => new Date(date).toISOString();

export function median(numbers: number[]): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch (err) {
    return false;
  }
}

// Helper function to extract and parse the price from a string
export function stringToNumber(stringNumber: string | number): number {
  if (typeof stringNumber == 'string') {
    const _price = parseInt(stringNumber.replace(/\D/g, ''), 10) ?? 0;
    return isNaN(_price) ? 0 : _price;
  }

  return isNaN(stringNumber) ? 0 : stringNumber;
}

export function percentile(numbers: number[], percentile: number, winsorize = true): number {
  if (winsorize) {
    const winsorizedNumbers = winsorizeData(numbers);
    return calculatePercentile(winsorizedNumbers, percentile);
  } else {
    return calculatePercentile(numbers, percentile);
  }
}

export const isDev: boolean = process.env.NODE_ENV === 'development';

function winsorizeData(numbers: number[], lowerPercentile = 5, upperPercentile = 95): number[] {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const lowerIndex = Math.floor((lowerPercentile / 100) * sorted.length);
  const upperIndex = Math.floor((upperPercentile / 100) * sorted.length);
  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];

  return numbers.map(num => {
    if (num < lowerValue) {
      return lowerValue;
    } else if (num > upperValue) {
      return upperValue;
    } else {
      return num;
    }
  });
}

function calculatePercentile(numbers: number[], percentile: number): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const index = (percentile / 100) * sorted.length;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= sorted.length) {
    return sorted[lower];
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
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

export function mergeRecords(redfin: any, zillow: any[]): MergedProperty[] {
  const redfinDictionary = Object.create(null);
  redfin.forEach(property => redfinDictionary[property.id] = property);
  const mergedRecords = zillow.map(property => {
    const redfinProperty = redfinDictionary[property.id];
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
      delete redfinDictionary[property.id];
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
  redfin.forEach(property => redfinDictionary[property.id] = property);
  const mergedRecords = zillow.map(property => {
    const redfinProperty = redfinDictionary[property.id];
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
      delete redfinDictionary[property.id];
      return mergedProperty;
    }
    return property;
  });

  return mergedRecords.concat(Object.values(redfinDictionary)).sort((a, b) => a.address < b.address ? -1 : 1);
}

export function getServeArg(arg: string): string | undefined {
  const argument = process.argv.indexOf(arg);
  if (argument !== -1 && process.argv.length > argument + 1) {
    const argValue = process.argv[argument + 1];
    if (argValue !== undefined) {
      return argValue;
    }
    logger.error(`The serve argument ${arg} was not found. Here's the available serve args:\n ${process.argv}`);
  }
}

export function getServePort(): number {
  let port = 4000; // Default port
  const portArg = parseInt(getServeArg('--port') || '', 10);
  if (!isNaN(portArg)) {
    port = portArg;
  } else {
    logger.warn(`No "--port" arg supplied when serving. Falling back to default port: ${port}`);
  }
  return port;
}