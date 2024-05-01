import BaseModel from '../../utils/base-model.js';
import { ObjectType, Field, InputType } from 'type-graphql';
import { prop, getModelForClass } from '@typegoose/typegoose';

@ObjectType()
class LatLong {
  @Field(type => Number)
  @prop({ type: Number, required: true })
  public latitude!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public longitude!: number;
}

@ObjectType()
class VariableData {
  @Field(type => String)
  @prop({ type: String, required: false })
  public type?: string;

  @Field(type => String)
  @prop({ type: String, required: false })
  public text?: string;
}

@ObjectType()
class BadgeInfo {
  @Field(type => String)
  @prop({ type: String, required: true })
  public type!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public text!: string;
}

@ObjectType()
class HomeInfo {
  @Field(type => Number)
  @prop({ type: Number, required: true })
  public zpid!: number;

  @Field(type => String)
  @prop({ type: String, required: true })
  public streetAddress!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public zipcode!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public city!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public state!: string;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public latitude!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public longitude!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public price!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public bathrooms!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public bedrooms!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public livingArea!: number;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public homeType!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public homeStatus!: string;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public daysOnZillow!: number;

  @Field(type => Boolean)
  @prop({ type: Boolean, required: true })
  public isFeatured!: boolean;

  @Field(type => Number)
  @prop({ type: Number, required: true })
  public rentZestimate!: number;

  @Field(type => String)
  @prop({ type: String, required: true })
  public currency!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public country!: string;

  @Field(type => String)
  @prop({ type: String })
  public unit?: string;
}

@ObjectType()
class HdpData {
  @Field(type => HomeInfo)
  @prop({ _id: false, type: () => HomeInfo })
  public homeInfo!: HomeInfo;
}

@ObjectType()
class ZillowRental extends BaseModel {
  @Field(type => String)
  @prop({ type: String })
  public plid?: string;

  @Field(type => String)
  @prop({ type: String })
  public zpid?: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public imgSrc!: string;

  @Field(type => Boolean)
  @prop({ type: Boolean, required: false, default: false })
  public hasImage!: boolean;

  @Field(type => String)
  @prop({ type: String, required: true })
  public detailUrl!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public statusType!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public statusText!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public price!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public address!: string;

  @Field(type => Number)
  @prop({ type: Number })
  public minBeds?: number;

  @Field(type => Number)
  @prop({ type: Number })
  public minBaths?: number;

  @Field(type => Number)
  @prop({ type: Number })
  public minArea?: number;

  @Field(type => Number)
  @prop({ type: Number })
  public lotId?: number;

  @prop({ _id: false })
  public latLong!: LatLong;

  @prop({ _id: false })
  public variableData?: VariableData;

  @prop({ _id: false })
  public badgeInfo?: BadgeInfo;

  @Field(type => HdpData)
  @prop({ _id: false, type: () => HdpData })
  public hdpData?: HdpData;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isBuilding?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public canSaveBuilding?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public has3DModel!: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isHomeRec?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  isFeaturedListing!: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isShowcaseListing?: boolean;

  @Field(type => Number)
  @prop({ type: Number })
  public timeOnZillow!: number;

  @Field(type => Number)
  @prop({ type: Number })
  public unitCount?: number;

  @Field(type => String)
  @prop({ type: String })
  public rentalMarketingSubType?: string;

  @Field(type => String)
  @prop({ type: String })
  public rawHomeStatusCd?: string;

  @Field(type => String)
  @prop({ type: String })
  public marketingStatusSimplifiedCd?: string;

  @Field(type => String)
  @prop({ type: String })
  public priceLabel?: string;

  @Field(type => Number, { nullable: true })
  @prop({ type: Number })
  public beds?: number;

  @Field(type => Number, { nullable: true })
  @prop({ type: Number })
  public baths?: number;

  @Field(type => Number)
  @prop({ type: Number })
  public area?: number;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isUserClaimingOwner?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isUserConfirmedClaim?: boolean;

  @Field(type => String)
  @prop({ type: String })
  public pgapt?: string;

  @Field(type => String)
  @prop({ type: String })
  public sgapt?: string;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public shouldShowZestimateAsPrice?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public hasVideo?: boolean;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public hasAdditionalAttributions?: boolean;

  @Field(type => String)
  @prop({ type: String })
  public listingType?: string;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public isFavorite?: boolean;

  @Field(type => String)
  @prop({ type: String })
  public availabilityDate?: string;

  @Field(type => Boolean)
  @prop({ type: Boolean })
  public visited?: boolean;

  @Field(type => String)
  get zillowUrl(): string {
    if (!this.detailUrl) return '';
    return `https://www.zillow.com${this.detailUrl}`;
  }

  // Virtual for rent
  @Field(type => Number)
  public get rent(): number {
    // Extract the numerical value from the price string
    console.log(this.price)
    const digits = this.price?.replace(/[^0-9]/g, "") ?? '';
    return parseInt(digits, 10) || 0;
  }
}

const ZillowRentalModel = getModelForClass(ZillowRental, {
  schemaOptions: {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
});

// Input model for ZillowRental
@InputType()
class LatLongInput {
  @Field(type => Number)
  public latitude!: number;

  @Field(type => Number)
  public longitude!: number;
}

@InputType()
class VariableDataInput {
  @Field(type => String)
  public type?: string;

  @Field(type => String)
  public text?: string;
}

@InputType()
class BadgeInfoInput {
  @Field(type => String)
  public type!: string;

  @Field(type => String)
  public text!: string;
}

@InputType()
class HomeInfoInput {
  @Field(type => Number)
  public zpid!: number;

  @Field(type => String)
  public streetAddress!: string;

  @Field(type => String)
  public zipcode!: string;

  @Field(type => String)
  public city!: string;

  @Field(type => String)
  public state!: string;

  @Field(type => Number)
  public latitude!: number;

  @Field(type => Number)
  public longitude!: number;

  @Field(type => Number)
  public price!: number;

  @Field(type => Number)
  public bathrooms!: number;

  @Field(type => Number)
  public bedrooms!: number;

  @Field(type => Number)
  public livingArea!: number;

  @Field(type => String)
  public homeType!: string;

  @Field(type => String)
  public homeStatus!: string;

  @Field(type => Number)
  public daysOnZillow!: number;

  @Field(type => Boolean)
  public isFeatured!: boolean;

  @Field(type => Number)
  public rentZestimate!: number;

  @Field(type => String)
  public currency!: string;

  @Field(type => String)
  public country!: string;

  @Field(type => String, { nullable: true })
  public unit?: string;
}

@InputType()
class ZillowRentalInput {
  @Field(type => String, { nullable: true })
  public plid?: string;

  @Field(type => String, { nullable: true })
  public zpid?: string;

  @Field(type => String)
  public imgSrc!: string;

  @Field(type => Boolean)
  public hasImage!: boolean;

  @Field(type => String)
  public detailUrl!: string;

  @Field(type => String)
  public statusType!: string;

  @Field(type => String)
  public statusText!: string;

  @Field(type => String)
  public price!: string;

  @Field(type => String)
  public address!: string;

  @Field(type => Number, { nullable: true })
  public minBeds?: number;

  @Field(type => Number, { nullable: true })
  public minBaths?: number;

  @Field(type => Number, { nullable: true })
  public minArea?: number;

  @Field(type => Number, { nullable: true })
  public lotId?: number;

  @Field(type => LatLongInput)
  public latLong!: LatLongInput;

  @Field(type => VariableDataInput, { nullable: true })
  public variableData?: VariableDataInput;

  @Field(type => BadgeInfoInput, { nullable: true })
  public badgeInfo?: BadgeInfoInput;

  @Field(type => HomeInfoInput, { nullable: true })
  public hdpData?: HomeInfoInput;

  @Field(type => Boolean, { nullable: true })
  public isBuilding?: boolean;

  @Field(type => Boolean, { nullable: true })
  public canSaveBuilding?: boolean;

  @Field(type => Boolean)
  public has3DModel!: boolean;

  @Field(type => Boolean, { nullable: true })
  public isHomeRec?: boolean;

  @Field(type => Boolean)
  public isFeaturedListing!: boolean;

  @Field(type => Boolean, { nullable: true })
  public isShowcaseListing?: boolean;

  @Field(type => Number, { nullable: true })
  public timeOnZillow?: number;

  @Field(type => Number, { nullable: true })
  public unitCount?: number;

  @Field(type => String, { nullable: true })
  public rentalMarketingSubType?: string;

  @Field(type => String, { nullable: true })
  public rawHomeStatusCd?: string;

  @Field(type => String, { nullable: true })
  public marketingStatusSimplifiedCd?: string;

  @Field(type => String, { nullable: true })
  public priceLabel?: string;

  @Field(type => Number, { nullable: true })
  public beds?: number;

  @Field(type => Number, { nullable: true })
  public baths?: number;

  @Field(type => Number, { nullable: true })
  public area?: number;

  @Field(type => Boolean, { nullable: true })
  public isUserClaimingOwner?: boolean;

  @Field(type => Boolean, { nullable: true })
  public isUserConfirmedClaim?: boolean;

  @Field(type => String, { nullable: true })
  public pgapt?: string;

  @Field(type => String, { nullable: true })
  public sgapt?: string;

  @Field(type => Boolean, { nullable: true })
  public shouldShowZestimateAsPrice?: boolean;

  @Field(type => Boolean, { nullable: true })
  public hasVideo?: boolean;

  @Field(type => Boolean, { nullable: true })
  public hasAdditionalAttributions?: boolean;

  @Field(type => String, { nullable: true })
  public listingType?: string;

  @Field(type => Boolean, { nullable: true })
  public isFavorite?: boolean;

  @Field(type => String, { nullable: true })
  public availabilityDate?: string;

  @Field(type => Boolean, { nullable: true })
  public visited?: boolean;
}

export { ZillowRental, ZillowRentalModel, ZillowRentalInput };
