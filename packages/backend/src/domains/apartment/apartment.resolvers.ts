import { Resolver, Query, Arg, FieldResolver, Root, ID, Mutation } from 'type-graphql';
import { Apartment, ApartmentModel, ApartmentInput } from './apartment.model.js';
import logger from '../../utils/logger.js';

export function fetchApartment(options: object): Promise<Apartment | null> {
  return ApartmentModel.findOne(options).exec();
}
export async function upsertApartments(apartments: ApartmentInput[]): Promise<Apartment[]> {
  logger.debug('upserting Apartments');
  const upsertedApartments = await Promise.all(apartments.map(async apartment => {
    const existingApartment = await fetchApartment({ address: apartment.address });
    if (existingApartment) {
      return ApartmentModel.findByIdAndUpdate(existingApartment.id, apartment, { new: true }).exec();
    }

    return ApartmentModel.create(apartment);
  }));

  logger.debug('upserting Apartments done 🎉');

  return upsertedApartments
    .filter(apartment => apartment !== null)
    .map(apartment => apartment!.toJSON());
}

@Resolver(_of => Apartment)
export default class ApartmentResolver {
  @Query(_returns => [Apartment])
  async apartment(
    @Arg('ids', type => [ID], { nullable: true }) ids?: string[],
  ): Promise<Apartment[]> {
    logger.debug('resolving Apartments');
    let query = {};
    if (ids && ids.length) {
      query = { id: { $in: ids } };  // Filter by ids if they're provided
    }

    const apartments = await ApartmentModel.find(query).exec();
    return apartments.map(apartment => apartment.toJSON());
  }
}

@Resolver(_of => Apartment)
export class ApartmentMutationResolver {
  @Mutation(_returns => [Apartment])
  async upsertApartments(
    @Arg('apartments', type => [ApartmentInput]) apartments: ApartmentInput[],
  ): Promise<Apartment[]> {
    return upsertApartments(apartments);
  }
}
