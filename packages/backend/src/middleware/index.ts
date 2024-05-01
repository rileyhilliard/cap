import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import puppeteer, { Browser, Page } from 'puppeteer';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('err handler', err)
  res.status(400).json({ error: err.message });
}

export function handlePropertyRequest() { }
export function handlePropertySchemaRequest() { }
export function handleDatasetDeletion() { }




interface LabeledValue {
  label?: string;
  value: string | number;
  level?: number;
}

interface Property {
  mlsId: LabeledValue;
  showMlsId: boolean;
  mlsStatus: string;
  showDatasourceLogo: boolean;
  price: LabeledValue;
  hideSalePrice: boolean;
  hoa?: LabeledValue;
  isHoaFrequencyKnown: boolean;
  sqFt: LabeledValue;
  pricePerSqFt: LabeledValue;
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

type CalculatedProperty = Property & {
  capRate?: number;
  roi?: number;
  cashFlow?: cashFlow;
  costs?: costs;
  monthlyCosts?: number;
  computedValues?: computedValues;
};

type computedValues = Property & {
  yearlyPropertyTaxRate?: number;
  yearlyMaintenanceRate?: number;
  yearlyPropertyInsuranceRate?: number;
  rentAverages?: { [key: string]: number };
  purchasePrice?: number;
  hoaMonthly?: number;
  propertySqFt?: number;
  yearlyPropertyTax?: number;
  yearlyMaintenanceCost?: number;
  yearlyPropertyInsurance?: number;
  monthlyRent?: number;
  annualIncome?: number;
};

type cashFlow = {
  yearlyNet?: number;
  yearlyGross?: number;
  monthlyGross?: number;
  monthlyNet?: number;
};

type costs = {
  yearly?: number;
  monthly?: number;
};

interface Listing {
  rent: string;
  bedBath: string;
  link: string;
  address: string;
  description?: string;
  title: string;
}

interface DecoratedListing extends Listing {
  parsedRent: number | null;
  beds: number;
  baths: number;
}