import { MergedHomeRental } from '@utils/redfin';
import ZillowPropertyOptions from '@utils/zillow';
export interface LatLong {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
}

export interface BaseProps {
  firstSeen: string;
  lastSeen: string;
}

export interface ListingSubType {
  is_FSBA: boolean;
}

export interface HomeInfo {
  zpid: number;
  streetAddress: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  price: number;
  bathrooms: number;
  bedrooms: number;
  livingArea: number;
  homeType: string;
  homeStatus: string;
  daysOnZillow: number;
  isFeatured: boolean;
  shouldHighlight: boolean;
  zestimate: number;
  rentZestimate: number;
  listing_sub_type: ListingSubType;
  isUnmappable: boolean;
  isPreforeclosureAuction: boolean;
  homeStatusForHDP: string;
  priceForHDP: number;
  timeOnZillow: number;
  isNonOwnerOccupied: boolean;
  isPremierBuilder: boolean;
  isZillowOwned: boolean;
  currency: string;
  country: string;
  taxAssessedValue: number;
  lotAreaValue: number;
  lotAreaUnit: string;
  isRentalWithBasePrice?: boolean;
  unit?: string;
  isShowcaseListing: boolean;
}

export interface HdpData {
  homeInfo: HomeInfo;
}

export interface PropertyBase extends BaseProps {
  zpid: string;
  rawHomeStatusCd: string;
  marketingStatusSimplifiedCd: string;
  imgSrc: string;
  hasImage: boolean;
  detailUrl: string;
  statusType: string;
  statusText: string;
  price: number;
  priceLabel: string;
  address: string;
  beds: number;
  baths: number;
  area: number;
  latLong: LatLong;
  isUserClaimingOwner: boolean;
  isUserConfirmedClaim: boolean;
  pgapt: string;
  sgapt: string;
  shouldShowZestimateAsPrice: boolean;
  has3DModel: boolean;
  hasVideo: boolean;
  isHomeRec: boolean;
  hasAdditionalAttributions: boolean;
  isFeaturedListing: boolean;
  isShowcaseListing: boolean;
  listingType: string;
  isFavorite: boolean;
  visited: boolean;
  timeOnZillow: number;
  decoratedPrice: string;
  url: string;
  id: string;
}

export interface MergedProperty extends PropertyBase {
  id: string;
  hdpData: HdpData;
  info3String: string;
  brokerName: string;
  firstListed: string;
  hoa?: number;
  redfinUrl?: string;
  redfinAddress?: string;
  redfinPrice?: number;
  redfinBeds?: number;
  redfinBaths?: number;
  redfinFirstListed?: string;
  redfinLastSeen?: string;
  redfinFirstSeen?: string;
  mergedRecords: boolean;
}

export interface YearlyCosts {
  tax: number;
  maintenance: number;
  insurance: number;
  hoa: number;
  total: number;
}

export interface YearlyStats {
  net: number;
  gross: number;
  roi: number;
  capRate: number;
  cashFlow: number;
  breakEvenYears: number;
}

export interface DecoratedProperty extends MergedProperty {
  costs: YearlyCosts;
  returns: {
    avg: YearlyStats;
    median: YearlyStats;
  };
}

interface RedfinHomeBase {
  propertyId: number;
  listingId: number;
  dataSourceId: number;
  marketId: number;
  mlsId: {
    label: string;
    value: string;
  };
  showMlsId: boolean;
  mlsStatus: string;
  showDatasourceLogo: boolean;
  hideSalePrice: boolean;
  isHoaFrequencyKnown: boolean;
  fullBaths: number;
  partialBaths?: number;
  location: {
    value: string;
    level: number;
  };
  streetLine: {
    value: string;
    level: number;
  };
  unitNumber: {
    value: string;
    level: number;
  };
  city: string;
  state: string;
  zip: string;
  postalCode: {
    value: string;
    level: number;
  };
  countryCode: string;
  showAddressOnMap: boolean;
  soldDate?: number;
  searchStatus: number;
  propertyType: number;
  uiPropertyType: number;
  listingType: number;
  dom: {
    value: number;
    level: number;
  };
  timeZone: string;
  primaryPhotoDisplayLevel: number;
  photos: {
    value: string;
    level: number;
  };
  additionalPhotosInfo: any[];
  isRedfin: boolean;
  isNewConstruction: boolean;
  listingRemarks: string;
  remarksAccessLevel: number;
  servicePolicyId: number;
  businessMarketId: number;
  buildingId?: number;
  isShortlisted: boolean;
  isViewedListing: boolean;
}

export interface RedfinProperty extends RedfinHomeBase {
  latLong: LatLong;
  address: string;
  id: string;
  url: string;
  hoa?: number;
  price: number;
  sqFt?: number;
  pricePerSqFt?: number;
  yearBuilt: number;
  timeOnRedfin: number;
  originalTimeOnRedfin: number;
  lotSize?: number;
  firstListed: string;
}

interface KeyFact {
  description: string;
  rank: number;
}

interface ValueLevel<T> {
  min: T;
  max: T;
}

export interface RedfinRental extends Omit<MergedHomeRental, 'price' | 'latLong' | 'bedRange' | 'bathRange' | 'sqftRange' | 'rentPriceRange' | 'photosInfo' | 'addressInfo'> {
  lastSeen: string;
  firstSeen: string;
  address: string;
  id: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  price: number;
  url: string;
  latLong: LatLong;
  firstListed: string;
}


interface VariableData {
  type: string;
  text?: string;
  data: {
    isRead: boolean | null;
    isFresh: boolean;
  };
}

export interface ZillowRental extends PropertyBase {
  hdpData: HdpData;
  variableData: VariableData;
  unitCount?: number;
  availabilityDate?: string;
  rentalMarketingSubType: string;
  firstListed: string;
}

export type ZillowRequestResults = {
  cat1: {
    searchResults: {
      mapResults: ZillowRental[];
    };
  };
};

// TODO: try to be more DRY between the zillow property and rental records
export interface ZillowProperty {
  id: string;
  firstSeen: string;
  zpid: string;
  rawHomeStatusCd: string;
  marketingStatusSimplifiedCd: string;
  imgSrc: string;
  hasImage: boolean;
  detailUrl: string;
  statusType: string;
  statusText: string;
  price: number;
  priceLabel: string;
  address: string;
  beds: number;
  baths: number;
  area: number;
  latLong: {
    lat: number;
    lon: number;
  };
  variableData: {
    type: string;
    text: string;
  };
  hdpData: {
    homeInfo: {
      zpid: number;
      streetAddress: string;
      zipcode: string;
      city: string;
      state: string;
      latitude: number;
      longitude: number;
      price: number;
      bathrooms: number;
      bedrooms: number;
      livingArea: number;
      homeType: string;
      homeStatus: string;
      daysOnZillow: number;
      isFeatured: boolean;
      shouldHighlight: boolean;
      rentZestimate: number;
      listing_sub_type: {
        is_FSBA: boolean;
      };
      isUnmappable: boolean;
      isPreforeclosureAuction: boolean;
      homeStatusForHDP: string;
      priceForHDP: number;
      timeOnZillow: number;
      isNonOwnerOccupied: boolean;
      isPremierBuilder: boolean;
      isZillowOwned: boolean;
      currency: string;
      country: string;
      taxAssessedValue: number;
      unit: string;
      lotAreaValue: number;
      lotAreaUnit: string;
      isShowcaseListing: boolean;
    };
  };
  isUserClaimingOwner: boolean;
  isUserConfirmedClaim: boolean;
  pgapt: string;
  sgapt: string;
  shouldShowZestimateAsPrice: boolean;
  has3DModel: boolean;
  hasVideo: boolean;
  isHomeRec: boolean;
  hasAdditionalAttributions: boolean;
  isFeaturedListing: boolean;
  isShowcaseListing: boolean;
  listingType: string;
  isFavorite: boolean;
  visited: boolean;
  info3String: string;
  brokerName: string;
  timeOnZillow: number;
  lastSeen: string;
  firstListed: string;
  decoratedPrice: string;
  url: string;
  fingerprint: string;
}