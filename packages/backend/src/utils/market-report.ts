import { timestamp } from '@utils/helpers';
import ElasticSearch, { responseTransformer } from '@utils/elastic-search';
import { queries } from '@utils/elastic-search-queries';
import { median, percentile, decimals } from '@utils/helpers';

interface Property {
  price: number;
  beds: number;
  area: number;
}

interface Stat {
  index: string;
  date: string;
  beds: number;
  type: string;
  description: string;
  count: number;
  rents?: number[];
  avgRent: number;
  medianRent: number;
  avgRentPerSqft: number;
  medianRentPerSqft: number;
  rentPercentiles: {
    "25th": number;
    "50th": number;
    "90th": number;
  };
  rentPerSqftPercentiles: {
    "25th": number;
    "50th": number;
    "90th": number;
  };
}
interface BedroomStats {
  [bedroom: string]: Stat;
}

interface Results {
  records: Omit<Stat, 'rents'>[];
}

async function getProperties(index: string): Promise<Property[]> {
  const es = ElasticSearch.getInstance();
  const documents = await es.data.query(index, queries.LAST_30_DAYS_UNIQUE_BY_ADDRESS);
  return responseTransformer(documents).filter((r: Property) => r.beds !== undefined) as Property[];
}

export async function analyzeRentalData(index: string): Promise<Results> {
  const date = timestamp();
  const properties = await getProperties(index);
  const stats: BedroomStats = {
    total: {
      index,
      date,
      type: "total",
      description: "All properties over the given timespan, regulardless of bedroom count",
      count: 0,
      avgRent: 0,
      medianRent: 0,
      avgRentPerSqft: 0,
      medianRentPerSqft: 0,
      rentPercentiles: { "25th": 0, "50th": 0, "90th": 0 },
      rentPerSqftPercentiles: { "25th": 0, "50th": 0, "90th": 0 },
      rents: [],
    }
  };

  // Group properties by bedroom count
  properties.forEach(property => {
    const { price, beds } = property;

    if (!stats[beds]) {
      stats[beds] = {
        index,
        date,
        beds,
        type: beds === 0 ? 'studio' : `${beds}-bedroom`,
        description: `${beds === 0 ? 'Studio' : `${beds} bedroom`} properties`,
        count: 0,
        rents: [],
        avgRent: 0,
        medianRent: 0,
        avgRentPerSqft: 0,
        medianRentPerSqft: 0,
        rentPercentiles: { "25th": 0, "50th": 0, "90th": 0 },
        rentPerSqftPercentiles: { "25th": 0, "50th": 0, "90th": 0 }
      };
    }

    stats[beds].count++;
    stats[beds]?.rents?.push(price);

    // Add to total group
    stats.total.count++;
    stats.total?.rents?.push(price);
  });

  // Calculate statistics for each bedroom count
  const records = Object.keys(stats).reduce((acc, bedroom) => {
    const { rents, count } = stats[bedroom];
    // if the count is too low, don't include it in the report
    // this is to prevent outliers from skewing the data
    if (count < 5) {
      delete stats[bedroom];
      return acc;
    }

    const sqftRents = rents?.map((rent, i) => rent / properties[i].area)
      .filter(p => !isNaN(p)) ?? [];

    const dictionary = stats[bedroom];
    dictionary.avgRent = (rents?.length && decimals(rents.reduce((a, b) => a + b) / count)) ?? 0;
    dictionary.medianRent = (rents?.length && decimals(median(rents))) ?? 0;
    dictionary.avgRentPerSqft = decimals(sqftRents.reduce((a, b) => a + b) / count);
    dictionary.medianRentPerSqft = decimals(median(sqftRents));
    dictionary.rentPercentiles = {
      "25th": percentile(rents ?? [], 25),
      "50th": percentile(rents ?? [], 50),
      "90th": percentile(rents ?? [], 90)
    };
    stats[bedroom].rentPerSqftPercentiles = {
      "25th": percentile(sqftRents, 25),
      "50th": percentile(sqftRents, 50),
      "90th": percentile(sqftRents, 90)
    };
    delete stats[bedroom].rents;
    acc.push(stats[bedroom]);
    return acc;
  }, [] as Stat[]);
  return { records: records.sort((a, b) => b.count - a.count) };
}
