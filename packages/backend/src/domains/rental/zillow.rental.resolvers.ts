import { Resolver, Query, Arg, FieldResolver, Root, ID, Mutation } from 'type-graphql';
import { ZillowRental, ZillowRentalModel, ZillowRentalInput } from '@domains/rental/zillow.rental.model';
import logger from '@utils/logger';

export function fetchRental(options: object): Promise<ZillowRental | null> {
  return ZillowRentalModel.findOne(options).exec();
}

export async function upsertRentals(rentals: ZillowRentalInput[]): Promise<ZillowRental[]> {
  logger.debug('upserting zillow Rentals');
  const upsertedRentals = await Promise.all(rentals.map(async rental => {
    const existingRental = await fetchRental({ address: rental.address });
    if (existingRental) {
      logger.debug(' Rental already exists in DB. Updating:', rental.address);
      return ZillowRentalModel.findByIdAndUpdate(existingRental.id, rental, { new: true }).exec();
    }

    return ZillowRentalModel.create(rental);
  }));

  logger.debug('upserting Rentals done 🎉');

  return upsertedRentals.map(rental => rental!.toJSON());
}

@Resolver(_of => ZillowRental)
export default class ZillowRentalResolver {
  @Query(_returns => [ZillowRental])
  async rental(
    @Arg('ids', type => [ID], { nullable: true }) ids?: string[],
  ): Promise<ZillowRental[]> {
    logger.debug('resolving Rentals');

    let query = {};
    if (ids && ids.length) {
      query = { _id: { $in: ids } };
    }

    const _rentals = await ZillowRentalModel.find(query).select('price').exec();


    // this is probably close to working
    // it seems like the values are properly computed, and then a secondary computation 
    // happens that loses the context of 'this' in the virtuals
    return _rentals; // _rentals.map(rental => rental.toJSON()); 
  }
}

@Resolver(_of => ZillowRental)
export class ZillowRentalMutationResolver {
  @Mutation(_returns => [ZillowRental])
  async upsertRentals(
    @Arg('rentals', type => [ZillowRentalInput]) rentals: ZillowRentalInput[],
  ): Promise<ZillowRental[]> {
    return upsertRentals(rentals);
  }
}
