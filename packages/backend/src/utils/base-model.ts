import { ObjectType, Field, ID } from 'type-graphql';
import { prop, mongoose } from '@typegoose/typegoose';

@ObjectType()
export default class BaseModel {
  @Field(() => ID)
  @prop({ type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() })
  public _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  public get id(): string {
    return this._id.toHexString();
  }

  // nerf note, mongoose tries to automatically set id for some reason
  // however without the above, 'id' doesnt exist on the object
  // After the above is added, we need to nerf the setter for 'id'
  // the `get id` proxies off to _id, so that's all handled fine anyway  
  public set id(value: string) {
  }

  @Field(type => Date)
  @prop({ type: Date, default: () => Date.now() })
  public createdAt!: Date;

  @Field(type => Date)
  @prop({ type: Date, default: () => Date.now() })
  public updatedAt?: Date;
}
