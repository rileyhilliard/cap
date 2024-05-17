import logger from '@utils/logger';
import { Cache } from '@utils/cache';
import ElasticSearch from '@utils/elastic-search';
import fetch from 'node-fetch';
import { timestamp, normalizeAddress, hasher } from '@utils/helpers';
import type { RedfinProperty } from '@backend/types/property-types';
const MONTHS_IN_YEAR = 12;
const YEARLY_TAX_RATE = 0.02;
const YEARLY_MAINTENANCE_RATE = 0.01;
const YEARLY_PROPERTY_INSURANCE_RATE = 0.0057;
// replace this with a real query and calculation of apartments data
// const rentAverages: { [key: string]: number } = { '1': 1507, '2': 2224, '3': 3000, '4': 3800 };
const rentAverages: { [key: string]: number } = { '1': 2122, '2': 2828, '3': 3397, '4': 4825 };

const cache = new Cache();
const redFinBoundary = 'https://www.redfin.com/stingray/api/gis?al=1&include_nearby_homes=true&market=austin&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly=-97.75393%2030.27555%2C-97.70638%2030.27555%2C-97.70638%2030.32261%2C-97.75393%2030.32261%2C-97.75393%2030.27555&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4,5,6,7,8&v=8&zoomLevel=14';
// https://www.redfin.com/stingray/api/gis?al=1&cluster_bounds=-97.75405%2030.27231%2C-97.71079%2030.27231%2C-97.71079%2030.32188%2C-97.75405%2030.32188%2C-97.75405%2030.27231&include_nearby_homes=true&market=austin&mpt=99&num_homes=350&ord=redfin-recommended-asc&page_number=1&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4,5,6,7,8&user_poly=-97.737783%2030.280351%2C-97.752374%2030.283835%2C-97.753919%2030.286132%2C-97.753490%2030.289097%2C-97.747739%2030.293321%2C-97.749284%2030.296804%2C-97.746366%2030.301473%2C-97.737697%2030.302881%2C-97.730659%2030.313107%2C-97.723192%2030.311329%2C-97.714094%2030.298583%2C-97.712549%2030.289912%2C-97.719072%2030.284946%2C-97.728427%2030.283093%2C-97.731946%2030.279239%2C-97.737783%2030.280351&v=8&zoomLevel=14
export interface RedfinOptions {
  url: string;
  meta: any;
}

function responseTransformer(response: RedfinPropertyResponse): RedfinProperty[] {
  const date = timestamp();
  const properties = response?.payload?.homes ?? [];
  return properties.map(property => {
    const address = `${property.streetLine.value}, ${property.city}, ${property.state}, ${property.zip}`;
    return {
      ...property,
      latLong: {
        lat: property.latLong.value.latitude,
        lon: property.latLong.value.longitude,
      },
      address,
      fingerprint: hasher(normalizeAddress(address)),
      url: `https://www.redfin.com${property.url}`,
      hoa: property.hoa?.value ?? 0,
      price: property.price.value,
      sqFt: property?.sqFt?.value ?? undefined,
      pricePerSqFt: property?.pricePerSqFt?.value ?? undefined,
      yearBuilt: property?.yearBuilt?.value ?? undefined,
      timeOnRedfin: property.timeOnRedfin.value,
      originalTimeOnRedfin: property.originalTimeOnRedfin.value,
      lotSize: property?.lotSize?.value ?? undefined,
      firstListed: timestamp(
        new Date(
          new Date(date).getTime() - (
            property?.timeOnRedfin?.value ?? 0
          )
        )
      ),
      lastSeen: date,
      firstSeen: date,
    }
  })
}

export async function scrapeRedfinProperties(index: string, options: RedfinOptions): Promise<RedfinProperty[]> {
  const es = ElasticSearch.getInstance();
  const meta = await es.data.metadata(index);
  const URL = meta?.url || options?.url;

  if (typeof URL !== 'string') {
    throw new Error('No redfin "stingray/api/gis?" API url found in the index metadata. Please pass in a url @ options.url');
  }

  try {
    // const esData = await es.data.get(index);
    // if (esData) {
    //   return esData;
    // }
    const cachedData = await cache.get(URL) as RedfinPropertyResponse | void;
    if (cachedData) {
      await es.index.deleteIndex(index);
      const processed = responseTransformer(cachedData);
      es.index.upsert(index, {
        records: processed,
        meta: {
          ...(options.meta ?? {}),
          url: options.url,
        },
      });
      return processed as RedfinProperty[];
    }

    const properties = await fetchProperties(URL, false);
    es.index.upsert(index, {
      records: properties,
      meta: {
        ...(options.meta ?? {}),
        url: options.url,
      },
    });
    return properties;
  } catch (error) {
    return error;
  }
}

function rentalResponseTransformer(response) {
  const date = timestamp();
  const rentals = response?.homes ?? [];
  const res = rentals.map(({ homeData, rentalExtension }) => {
    const merged = {
      ...homeData,
      ...rentalExtension
    };
    const address = `${merged.addressInfo.formattedStreetLine}, ${merged.addressInfo.city}, ${merged.addressInfo.state}, ${merged.addressInfo.zip}`;
    const formatted = {
      ...merged,
      firstListed: merged.lastUpdated,
      lastSeen: date,
      firstSeen: date,
      address,
      fingerprint: hasher(normalizeAddress(address)),
      beds: merged.bedRange?.min === merged.bedRange?.max ? merged.bedRange?.min : null,
      baths: merged.bathRange?.min === merged.bathRange?.max ? merged.bathRange?.min : null,
      sqft: merged.sqftRange?.min === merged.sqftRange?.max ? merged.sqftRange?.min : null,
      price: merged.rentPriceRange?.min === merged.rentPriceRange?.max ? merged.rentPriceRange?.min : null,
      url: `https://www.redfin.com${merged.url}`,
      latLong: {
        lat: merged.addressInfo.centroid.latitude,
        lon: merged.addressInfo.centroid.longitude,
      }
    };

    if (!Number.isNaN(formatted.beds)) {
      delete formatted.bedRange;
    }
    if (!Number.isNaN(formatted.baths)) {
      delete formatted.bathRange;
    }

    if (!Number.isNaN(formatted.sqft)) {
      delete formatted.sqftRange;
    }

    if (!Number.isNaN(formatted.price)) {
      delete formatted.rentPriceRange;
    }

    delete formatted.photosInfo;
    delete formatted.addressInfo;
    return formatted;
  });

  return res;
}
//https://www.redfin.com/stingray/api/v1/search/rentals?al=1&includeKeyFacts=true&isRentals=true&market=austin&num_homes=350&ord=days-on-redfin-desc&page_number=1&poly=-97.75584%2030.27237%2C-97.7155%2030.27237%2C-97.7155%2030.32195%2C-97.75584%2030.32195%2C-97.75584%2030.27237&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4&use_max_pins=true&user_poly=-97.735345%2030.279787%2C-97.753112%2030.284753%2C-97.752768%2030.289719%2C-97.747618%2030.292609%2C-97.748820%2030.297204%2C-97.746073%2030.300909%2C-97.740580%2030.300465%2C-97.737919%2030.301799%2C-97.731654%2030.312024%2C-97.719723%2030.308838%2C-97.712685%2030.297945%2C-97.712256%2030.292609%2C-97.717835%2030.285494%2C-97.721011%2030.284605%2C-97.725131%2030.286309%2C-97.731225%2030.278972%2C-97.735345%2030.279787&v=8&zoomLevel=14
export async function scrapeRedfinRentals(index: string, options: RedfinOptions): Promise<RedfinProperty[]> {
  const es = ElasticSearch.getInstance();
  const meta = await es.data.metadata(index);
  const URL = meta?.url || options?.url;

  if (typeof URL !== 'string') {
    throw new Error('No redfin "stingray/api/v1/search/rentals?" API url found in the index metadata. Please pass in a url @ options.url');
  }

  try {
    // const esData = await es.data.get(index);
    // if (esData) {
    //   return esData;
    // }
    const cachedData: any = await cache.get(URL);
    if (cachedData) {
      await es.index.deleteIndex(index);
      const processed = rentalResponseTransformer(cachedData);
      // es.index.upsert(index, {
      //   records: processed,
      //   meta: {
      //     ...(options.meta ?? {}),
      //     url: options.url,
      //   },
      // });
      return processed as RedfinProperty[];
    }

    const properties = await fetchProperties(URL, true);
    es.index.upsert(index, {
      records: properties,
      meta: {
        ...(options.meta ?? {}),
        url: options.url,
      },
    });
    return properties;
  } catch (error) {
    return error;
  }
}

async function fetchProperties(url: string, isRental: boolean): Promise<RedfinProperty[]> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // 'Cookie': '<IF NEEDED>',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'Origin': 'https://www.redfin.com',
        'Sec-Fetch-Mode': 'cors',
      }
    });

    const text = await response.text();
    const cleaned = JSON.parse(isRental ? text : text.replace('{}&&{"', '{"')) as RedfinPropertyResponse;
    cache.set(url, cleaned);
    return isRental ? rentalResponseTransformer(cleaned) : responseTransformer(cleaned);
  } catch (error) {
    logger.error('fetchProperties error: ', error);
    return error;
  }
}

function processProperties(properties: RedfinProperty[]): Property[] {
  return properties.map(calculatePropertyData)
    .sort((a, b) => b.capRate - a.capRate);
}

function calculatePropertyData(property: RedfinProperty): Property {
  // Ensure values are treated as numbers
  const purchasePrice = Number(property.price.value);
  const hoaMonthly = Number(property.hoa?.value) || 0;
  const propertySqFt = Number(property.sqFt.value);
  const bedsString = property.beds?.toString() ?? '0';
  const monthlyRent = rentAverages[bedsString] || 0;

  // Calculations
  const yearlyPropertyTax = purchasePrice * YEARLY_TAX_RATE;
  const yearlyMaintenanceCost = purchasePrice * YEARLY_MAINTENANCE_RATE;
  const yearlyPropertyInsurance = purchasePrice * YEARLY_PROPERTY_INSURANCE_RATE;
  const yearlyCosts = (hoaMonthly * MONTHS_IN_YEAR) + yearlyPropertyTax + yearlyMaintenanceCost + yearlyPropertyInsurance;
  const annualIncome = monthlyRent * MONTHS_IN_YEAR;
  const cashFlow = annualIncome - yearlyCosts;
  const capRate = cashFlow / purchasePrice;
  const roi = cashFlow / purchasePrice;
  const breakevenPoint = purchasePrice / cashFlow;

  // Returning the property with additional calculated data
  return {
    ...property,
    capRate,
    roi,
    cashFlow: {
      yearly: {
        net: cashFlow,
        gross: annualIncome,
      },
      monthly: {
        net: cashFlow / MONTHS_IN_YEAR,
        gross: annualIncome / MONTHS_IN_YEAR,
      }
    },
    costs: {
      yearly: yearlyCosts,
      monthly: yearlyCosts / MONTHS_IN_YEAR,
    },
    computedValues: {
      purchasePrice,
      hoaMonthly,
      propertySqFt,
      yearlyPropertyTax,
      yearlyMaintenanceCost,
      yearlyPropertyInsurance,
      monthlyRent,
      annualIncome,
      breakevenPoint // years it will take to break even
    }
  };
}


export interface Property extends RedfinProperty {
  capRate: number;
  roi?: number;
  cashFlow?: CashFlow;
  costs?: Costs;
  computedValues?: ComputedValues;
}

export interface ComputedValues {
  purchasePrice: number;
  hoaMonthly: number;
  propertySqFt: number;
  yearlyPropertyTax: number;
  yearlyMaintenanceCost: number;
  yearlyPropertyInsurance: number;
  monthlyRent: number;
  annualIncome: number;
  breakevenPoint: number;
}

export interface Calculations {
  yearlyPropertyTaxRate: number;
  yearlyMaintenanceRate: number;
  yearlyPropertyInsuranceRate: number;
  rentAverages: { [key: string]: number };
}

export interface Costs {
  yearly?: number;
  monthly?: number;
}

export interface CashFlow {
  yearly: {
    net?: number;
    gross?: number;
  };
  monthly: {
    net?: number;
    gross?: number;
  };
}


/// types
export interface LatLong {
  latitude: number;
  longitude: number;
}

export interface ValueLevel<T> {
  value: T;
  level: number;
}

export interface Sash {
  sashType: number;
  sashTypeId: number;
  sashTypeName: string;
  sashTypeColor: string;
  isRedfin: boolean;
  isActiveKeyListing: boolean;
  timeOnRedfin: number;
  openHouseText: string;
  lastSaleDate: string;
  lastSalePrice: string;
}

export interface RedfinHome {
  mlsId: {
    label: string;
    value: string;
  };
  showMlsId: boolean;
  mlsStatus: string;
  showDatasourceLogo: boolean;
  price: ValueLevel<number>;
  hideSalePrice: boolean;
  hoa: ValueLevel<number>;
  isHoaFrequencyKnown: boolean;
  sqFt: ValueLevel<number>;
  pricePerSqFt: ValueLevel<number>;
  lotSize: ValueLevel<number>;
  beds: number;
  baths: number;
  fullBaths: number;
  location: ValueLevel<string>;
  latLong: ValueLevel<LatLong>;
  streetLine: ValueLevel<string>;
  unitNumber: ValueLevel<string>;
  city: string;
  state: string;
  zip: string;
  postalCode: ValueLevel<string>;
  countryCode: string;
  showAddressOnMap: boolean;
  searchStatus: number;
  propertyType: number;
  uiPropertyType: number;
  listingType: number;
  propertyId: number;
  listingId: number;
  dataSourceId: number;
  marketId: number;
  yearBuilt: ValueLevel<number>;
  dom: ValueLevel<number>;
  timeOnRedfin: ValueLevel<number>;
  originalTimeOnRedfin: ValueLevel<number>;
  timeZone: string;
  primaryPhotoDisplayLevel: number;
  photos: ValueLevel<string>;
  additionalPhotosInfo: any[];
  url: string;
  hasInsight: boolean;
  sashes: Sash[];
  isHot: boolean;
  hasVirtualTour: boolean;
  hasVideoTour: boolean;
  has3DTour: boolean;
  newConstructionCommunityInfo: {};
  isRedfin: boolean;
  isNewConstruction: boolean;
  listingRemarks: string;
  remarksAccessLevel: number;
  servicePolicyId: number;
  businessMarketId: number;
  buildingId: number;
  isShortlisted: boolean;
  isViewedListing: boolean;
}

export interface Address {
  streetNumber: string;
  directionalPrefix: string;
  streetName: string;
  streetType: string;
  directionalSuffix: string;
  unitType: string;
  unitValue: string;
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

export interface Building {
  id: number;
  address: Address;
  buildingName: string;
  numUnitsForSale: number;
  url: string;
  responseCode: number;
}

export interface SearchMedian {
  price: number;
  sqFt: number;
  pricePerSqFt: number;
  dom: number;
  beds: number;
  baths: number;
}

export interface Payload {
  homes: RedfinHome[];
  dataSources: any[];
  buildings: {
    [key: string]: Building;
  };
  searchMedian: SearchMedian;
  serviceRegionName: string;
  csvDownloadLinkDisplayLevel: number;
}

export interface RedfinPropertyResponse {
  version: number;
  errorMessage: string;
  resultCode: number;
  payload: Payload;
}