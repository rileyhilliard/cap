import type { RedfinHome } from '@utils/redfin'
export interface LatLong {
  lat: number;
  lon: number;
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
  isShowcaseListing: boolean;
}

export interface HdpData {
  homeInfo: HomeInfo;
}

export interface MergedProperty {
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
  latLong: LatLong;
  hdpData: HdpData;
  isUserClaimingOwner: boolean;
  isUserConfirmedClaim: boolean;
  pgapt: string;
  sgapt: string;
  shouldShowZestimateAsPrice: boolean;
  has3DModel: boolean;
  hasVideo: boolean;
  hoa?: number;
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

export interface DecoratedProperty extends MergedProperty {
  costs: YearlyCosts;
  returns: {
    avg: YearlyStats;
    median: YearlyStats;
  };
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

interface RedfinHomeWithoutPrice extends Omit<RedfinHome, 'price' | 'hoa' | 'sqFt' | 'pricePerSqFt' | 'lotSize' | 'latLong' | 'yearBuilt' | 'timeOnRedfin' | 'originalTimeOnRedfin'> { }

export interface RedfinProperty extends RedfinHomeWithoutPrice {
  latLong: LatLong,
  address: string,
  fingerprint: string,
  url: string,
  hoa?: number,
  price: number,
  sqFt?: number,
  pricePerSqFt?: number,
  yearBuilt: number,
  timeOnRedfin: number,
  originalTimeOnRedfin: number,
  lotSize?: number,
  firstListed: string,
  lastSeen: string,
  firstSeen: string,
} 