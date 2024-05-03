import { Resolver, Query, Arg, FieldResolver, Root, ID, Mutation, InputType, Field } from 'type-graphql';
import { Property, PropertyModel } from '@domains/property/property.model';
import logger from '@utils/logger';

export function fetchProperty(options: object): Promise<Property | null> {
  return PropertyModel.findOne(options).exec();
}

@Resolver(_of => Property)
export default class PropertyResolver {
  @Query(_returns => [Property])
  async property(
    @Arg('ids', type => [ID], { nullable: true }) ids?: string[],
  ): Promise<Property[]> {
    logger.debug('resolving Properties');
    let query = {};
    if (ids && ids.length) {
      query = { id: { $in: ids } };  // Filter by ids if they're provided
    }

    const properties = await PropertyModel.find(query).exec();
    return properties.map(property => property.toJSON());
  }
}
