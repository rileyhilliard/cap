import logger from '@utils/logger';
import { Cache } from '@utils/cache';
import ElasticSearch, { responseTransformer } from '@utils/elastic-search';
import fetch from 'node-fetch';
import { timestamp } from '@utils/helpers';

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
interface RedfinOptions {
  url: string;
  meta: any;
}

function responseTransformer(response) {
  const date = timestamp();
  const properties = response?.payload?.homes ?? [];
  return properties.map(property => {
    return {
      ...property,
      latLong: {
        lat: property?.latLong?.value?.latitude,
        lon: property?.latLong?.value?.longitude
      },
      address: `${property.streetLine.value}, ${property.city}, ${property.state}, ${property.zip}`,
      url: `https://www.redfin.com${property.url}`,
      hoa: property?.hoa?.value ?? 0,
      price: property?.price?.value ?? undefined,
      sqFt: property?.sqFt?.value ?? undefined,
      pricePerSqFt: property?.pricePerSqFt?.value ?? undefined,
      yearBuilt: property?.yearBuilt?.value ?? undefined,
      timeOnRedfin: property?.timeOnRedfin?.value ?? undefined,
      originalTimeOnRedfin: property?.originalTimeOnRedfin?.value ?? undefined,
      lotSize: property?.lotSize?.value ?? undefined,
      firstListed: timestamp(
        +new Date(date) - (
          property?.timeOnRedfin?.value ?? 0
        )
      ),
      // todo: merge 
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
    const cachedData: any = await cache.get(URL);
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

    const properties = await fetchProperties(URL);
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

async function fetchProperties(url: string): Promise<RedfinProperty[]> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
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
    const cleaned = JSON.parse(text.replace('{}&&{"', '{"'));
    cache.set(url, cleaned);
    return responseTransformer(cleaned);
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

interface RedfinProperty {
  hideSalePrice: boolean;
  isHoaFrequencyKnown: boolean;
  pricePerSqFt: number;
  showDatasourceLogo: boolean;
  mlsId: LabeledValue;
  showMlsId: boolean;
  mlsStatus: string;
  price: LabeledValue;
  hoa: LabeledValue;
  sqFt: LabeledValue;
  lotSize: LabeledValue;
  beds: number;
  baths: number;
  fullBaths: number;
  location: LabeledValue;
  stories: number;
  latLong: {
    value: {
      latitude: number;
      longitude: number;
    };
    level?: number;
  };
  streetLine: LabeledValue;
  unitNumber?: LabeledValue;
  city: string;
  state: string;
  zip: string;
  postalCode: LabeledValue;
  countryCode: string;
  showAddressOnMap: boolean;
  soldDate: number;
  searchStatus: number;
  propertyType: number;
  uiPropertyType: number;
  listingType: number;
  propertyId: number;
  listingId: number;
  dataSourceId: number;
  marketId: number;
  yearBuilt: LabeledValue;
  dom: LabeledValue;
  timeOnRedfin: LabeledValue;
  originalTimeOnRedfin: LabeledValue;
  timeZone: string;
  primaryPhotoDisplayLevel: number;
  photos: LabeledValue;
  additionalPhotosInfo: any[]; // specify further if there's a structure
  url: string;
  hasInsight: boolean;
  sashes: any[]; // specify further if there's a structure
  isHot: boolean;
  hasVirtualTour: boolean;
  hasVideoTour: boolean;
  has3DTour: boolean;
  newConstructionCommunityInfo: any; // specify further if there's a structure
  isRedfin: boolean;
  isNewConstruction: boolean;
  listingRemarks: string;
  remarksAccessLevel: number;
  servicePolicyId: number;
  businessMarketId: number;
  isShortlisted: boolean;
  isViewedListing: boolean;
}

interface Property extends RedfinProperty {
  capRate: number;
  roi?: number;
  cashFlow?: CashFlow;
  costs?: Costs;
  computedValues?: ComputedValues;
}

interface ComputedValues {
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

interface Calculations {
  yearlyPropertyTaxRate: number;
  yearlyMaintenanceRate: number;
  yearlyPropertyInsuranceRate: number;
  rentAverages: { [key: string]: number };
}

interface Costs {
  yearly?: number;
  monthly?: number;
}

interface CashFlow {
  yearly: {
    net?: number;
    gross?: number;
  };
  monthly: {
    net?: number;
    gross?: number;
  };
}

interface LabeledValue {
  label?: string;
  value: string | number;
  level?: number;
}

interface PropertiesResponse {
  properties: Property[];
  variables: Calculations;
}