import BaseModel from '../../utils/base-model.js';
import { ObjectType, Field, InputType } from 'type-graphql';
import { prop, getModelForClass, pre } from '@typegoose/typegoose';

// Only save the last rent object if it's been more than 7 days since the second last rent object.
// we really only care about tracking a properties rent every week
// @pre<Apartment>('save', function (next) {
//   const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
//   if (this.rent && this.isModified('rent')) {
//     const lastRent = this.rent.at(-1);
//     const secondLastRent = this.rent.at(-2);
//     if (lastRent && secondLastRent) {
//       const lastRentDate = new Date(lastRent.date);
//       const secondLastRentDate = new Date(secondLastRent.date);
//       const thirtyDaysAfterSecondLastRent = new Date(secondLastRentDate.getTime() + ONE_WEEK);
//       if (lastRentDate < thirtyDaysAfterSecondLastRent) {
//         this.rent.pop(); // Remove the last rent object
//       }
//     }
//   }
//   next();
// })

// rent class is a model for the rent of an apartment and is an array of rent objects
// each rent object has a date and a price. 
@ObjectType()
export class Rent {

  @Field(type => Date)
  @prop({ type: Date, required: false, default: Date.now })
  public date?: Date;

  @Field(type => Number, { nullable: true })
  @prop({ type: Number, required: false })
  public price?: number | null;
}

@ObjectType()
export class Apartment extends BaseModel {
  @Field(type => String)
  @prop({ type: String, required: true })
  public title!: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public address!: string;

  @Field(type => String, { nullable: true })
  @prop({ type: String, required: false })
  public description?: string | null;

  @Field(type => String)
  @prop({ type: String, required: false })
  public parsedRent?: string;

  @Field(type => String)
  @prop({ type: String, required: true })
  public parsedBedBath!: string;

  @Field(type => String, { nullable: true })
  @prop({ type: String, required: true })
  public url!: string | null;

  @Field(type => Rent, { nullable: false })
  @prop({ type: Rent, required: true, default: [] })
  public rent!: Rent;

  @Field(type => Number, { nullable: true })
  @prop({ type: Number, required: false })
  public beds?: number | null;

  @Field(type => Number, { nullable: true })
  @prop({ type: Number, required: false })
  public baths?: number | null;

  @Field(type => Boolean, { nullable: false })
  @prop({ type: Boolean, required: true })
  public hasPriceRange!: boolean;
}

export const ApartmentModel = getModelForClass(Apartment, {
  schemaOptions: {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
});

/**
 * Input types for Apartment model
 */

@InputType()
class RentInput {
  @Field(type => Date)
  public date?: Date;

  @Field(type => Number, { nullable: true })
  public price?: number | null;
}

@InputType()
export class ApartmentInput {
  @Field(type => String)
  public title!: string;

  @Field(type => String)
  public address!: string;

  @Field(type => String, { nullable: true })
  public description?: string | null;

  @Field(type => String, { nullable: true })
  public parsedRent?: string | null;

  @Field(type => String)
  public parsedBedBath!: string;

  @Field(type => String)
  public url!: string;

  // BUG: this is an object for some reason, not an array
  @Field(type => RentInput, { nullable: false })
  public rent!: RentInput;

  @Field(type => Number)
  public beds!: number;

  @Field(type => Number)
  public baths!: number;

  @Field(type => Boolean, { nullable: false })
  public hasPriceRange!: boolean;
}