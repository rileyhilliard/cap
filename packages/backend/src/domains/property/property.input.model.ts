import { InputType, Field } from 'type-graphql';

@InputType()
export class CreatePropertyInput {
  @Field(type => String, { nullable: true })
  title?: string;
}

@InputType()
export class UpdatePropertyInput extends CreatePropertyInput {
}
