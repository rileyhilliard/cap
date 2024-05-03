import logger from '@utils/logger';
import { Cache } from '@utils/cache';
import type { Request, Response } from 'express';

const MONTHS_IN_YEAR = 12;
const YEARLY_TAX_RATE = 0.02;
const YEARLY_MAINTENANCE_RATE = 0.01;
const YEARLY_PROPERTY_INSURANCE_RATE = 0.0057;
// replace this with a real query and calculation of apartments data
// const rentAverages: { [key: string]: number } = { '1': 1507, '2': 2224, '3': 3000, '4': 3800 };
const rentAverages: { [key: string]: number } = { '1': 2122, '2': 2828, '3': 3397, '4': 4825 };

const cache = new Cache();
const redFinBoundary = 'https://www.redfin.com/stingray/api/gis?al=1&include_nearby_homes=true&market=austin&num_homes=350&ord=redfin-recommended-asc&page_number=1&poly=-97.75393%2030.27555%2C-97.70638%2030.27555%2C-97.70638%2030.32261%2C-97.75393%2030.32261%2C-97.75393%2030.27555&sf=1,2,3,5,6,7&start=0&status=9&uipt=1,2,3,4,5,6,7,8&v=8&zoomLevel=14';

export async function propertiesScraper(req: Request, res: Response): Promise<PropertiesResponse> {
  const response = {
    properties: [],
    variables: {
      yearlyPropertyTaxRate: YEARLY_TAX_RATE,
      yearlyMaintenanceRate: YEARLY_MAINTENANCE_RATE,
      yearlyPropertyInsuranceRate: YEARLY_PROPERTY_INSURANCE_RATE,
      rentAverages,
    }
  } as PropertiesResponse;
  try {
    const cachedData: Property[] = await cache.get(redFinBoundary);
    if (cachedData) {
      response.properties = processProperties(cachedData);
      return response;
    }

    const properties = await fetchProperties(redFinBoundary);
    const data = processProperties(properties);

    await cache.set(redFinBoundary, data);
    response.properties = data;
    return response;
  } catch (error) {
    logger.error('propertiesScraper error: ', error);
    return response;
  }
}

async function fetchProperties(url: string): Promise<RedfinProperty[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  const text = await response.text();
  const cleaned = JSON.parse(text.replace('{}&&{"', '{"'));
  return cleaned?.payload?.homes || [];
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