import BaseModel from '@utils/base-model';
import { ObjectType, Field } from 'type-graphql';
import { prop, getModelForClass } from '@typegoose/typegoose';


@ObjectType()
export class Property extends BaseModel {
  @Field(type => String)
  @prop({ type: String, required: true })
  public title!: string;
}

export const PropertyModel = getModelForClass(Property, {
  schemaOptions: {
    // toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
});
