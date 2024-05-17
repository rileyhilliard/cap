import logger from '@utils/logger';
import { ApartmentModel } from '@domains/apartment/apartment.model';

export async function calculateAverageAndMedianRentalPrices() {
  logger.debug('Calculating rental prices');
  try {
    const pipeline = [
      {
        $match: {
          beds: { $in: [0, 1, 2, 3, 4, 5, 6] },
        },
      },
      {
        $unwind: '$rent',
      },
      {
        $group: {
          _id: '$beds',
          rents: { $push: '$rent.price' },
          count: { $sum: 1 },
        },
      }
    ];

    const results = await ApartmentModel.aggregate(pipeline);

    const rentStatistics: RentStatistics[] = results.map(group => {
      const { average, median } = calculateStatistics(group.rents);
      const beds = group._id === 0 ? 1 : group._id;
      const averagePricePerBedroom = average / beds;

      return {
        beds: group._id,
        averagePrice: average,
        medianPrice: median,
        averagePricePerBedroom,
        count: group.count
      };
    }).sort((a, b) => a.beds - b.beds);

    logger.debug('Calculating rental prices complete 🎉');
    return rentStatistics;
  } catch (error) {
    console.error('Error calculating rental prices:', error);
    throw error;
  }
}

function calculateStatistics(rents: number[]): { average: number; median: number } {
  const sortedRents = rents.filter(price => price != null).sort((a, b) => a - b);
  const total = sortedRents.reduce((acc, val) => acc + val, 0);
  const count = sortedRents.length;
  const average = total / count;

  let median;
  if (count % 2 === 0) {
    median = (sortedRents[count / 2 - 1] + sortedRents[count / 2]) / 2;
  } else {
    median = sortedRents[Math.floor(count / 2)];
  }

  return { average, median };
}

interface RentStatistics {
  beds: number;
  averagePrice: number;
  medianPrice: number;
  averagePricePerBedroom: number;
  count: number;
}