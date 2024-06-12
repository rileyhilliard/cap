import { type BulkWriteResult, MongoClient, Db, Collection, Document, Filter, UpdateFilter, FindOptions } from 'mongodb';
import logger from '@utils/logger';
import { isDev, hasher } from '@utils/helpers';

// Left off @ right now metadata is implemented as a record in a collection: that's not great for obvious reasons
// can metadata be stored in a separate collection? or in a separate field in the same collection unrelated to the collection?
// My best guess is that metadata should be stored in a separate collection (probably the 'registered_indexes' collection), 
// but I'm not sure
// Yeah, metadata is technically only related to a region, not a collection, so regions should be 
// used to store/retrieve/update metadata for a region

// NOTE: most of the above is implemented, but I need to migrate the database to mongo db before 
// refactoring the code to read and write to the metadata collection. Elasticsearch needs to be
// removed from the job runs before the refactor can be done

class MongoDBService {
  private static instance: MongoDBService;
  private client: MongoClient;
  private db: Db;

  private constructor() {
    if (MongoDBService.instance) {
      throw new Error(
        'A MongoDBService instance has already been created. Use MongoDBService.getInstance() to get its instance',
      );
    }

    const uri = process.env.MONGODB_URI || (isDev ? `mongodb://localhost:27017` : 'mongodb://admin:password@mongodb:27017');
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    this.client = new MongoClient(uri);
    this.db = this.connect();
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  public connect(dbName: string = 'estatemetrics'): Db {
    this.client.connect();
    return this.client.db(dbName);
  }

  public async disconnect(): Promise<void> {
    await this.client.close();
    logger.debug('Disconnected from MongoDB');
  }

  // The is MongoDB's equivalent of an index in elasticsearch
  public collection(name: string): Collection<Document> {
    return this.db.collection(name);
  }

  public validate = {
    dataset: (dataset: DatasetSchema) => {
      if (!dataset || !dataset.records || !Array.isArray(dataset.records)) {
        throw new Error(
          'Invalid dataset. A dataset must be at minimum an object with a records field that is an array.',
        );
      }
    },
  };

  public index = {
    create: async (indexName: string, records?: unknown[], _options?: { inferTypes: boolean }): Promise<void> => {
      const options = _options ?? { inferTypes: true };
      logger.debug(`Index ${indexName} creating index`);
      try {
        const collection = this.collection(indexName);
        await collection.createIndex({ '$**': 'text' });
        logger.debug(`Index ${indexName}: Index created`);
      } catch (error) {
        logger.error(`Index ${indexName}: An error occurred:`, error);
      }
    },

    upsert: async (
      indexName: string,
      dataset: DatasetSchema,
      _options?: { inferTypes: boolean },
    ): Promise<BulkWriteResult | void> => {
      const options = _options ?? { inferTypes: true };
      this.validate.dataset(dataset);
      await this.index.create(indexName, dataset.records, options);
      const { meta, records } = dataset;

      if (meta) {
        await this.index.updateMetadata(indexName, meta);
      }

      if (records.length === 0) {
        return;
      }

      try {
        const collection = this.collection(indexName);
        const bulkOps = records.map((doc) => {
          const { _id, id, ...dockWithoutId } = doc;
          return {
            updateOne: {
              filter: { _id: id },
              update: { $set: dockWithoutId },
              upsert: true,
            },
          }
        });

        const res = await collection.bulkWrite(bulkOps);
        logger.debug(`Index ${indexName}: Upserted ${records.length} documents`);
        // @ts-ignore
        return { indexName, ...res };
      } catch (error) {
        logger.error(`Index ${indexName}: Error upserting documents:`, error);
      }
    },

    delete: async (indexName: string, document: Document): Promise<void> => {
      try {
        const collection = this.collection(indexName);
        await collection.deleteOne({ _id: document._id });

        logger.debug(`Index ${indexName}: Document with ID ${document._id} deleted successfully`);
      } catch (error) {
        logger.error(`Index ${indexName}: Error deleting document ${JSON.stringify(document)}:`, error);
      }
    },

    deleteIndex: async (indexName: string): Promise<void> => {
      try {
        await this.db.dropCollection(indexName);
        logger.debug('Index deleted:', indexName);
      } catch (error: Error | any) {
        if (!error?.message?.includes('ns not found')) {
          console.error('Error deleting index:', error);
        }
      }
    },

    schema: async (indexName: string): Promise<Document | undefined> => {
      logger.debug(`Index ${indexName} fetching schema`);
      try {
        const collection = this.collection(indexName);
        const indexes = await collection.indexes();
        return indexes.find((index) => index.name === '$**_text');
      } catch (error) {
        logger.error('Error fetching index schema:', error);
      }
    },

    updateMetadata: async (collectionName: string, newMetadata: Record<string, any>): Promise<void> => {
      logger.debug(`updateMetadata ${collectionName}: Updating metadata`);
      const { id, _id, ...meta } = newMetadata;
      try {
        await this.index.create('metadata');
        const collection = this.collection('metadata');
        await collection.updateOne(
          { collection: collectionName },
          {
            $set: {
              ...meta,
              collection: collectionName
            }
          },
          { upsert: true },
        );
      } catch (error) {
        logger.error(`Index ${collectionName}: Error updating metadata:`, error);
      }
    },
  };

  public data = {
    metadata: async (collectionName: string): Promise<Record<string, any>> => {
      try {
        const collection = this.collection('metadata');
        const metadata = await collection.findOne({
          collection: collectionName
        });
        return metadata ?? {};
      } catch (error) {
        return {};
      }
    },

    compute: async (
      indexName: string,
      _query?: Filter<Document>,
      _aggs?: Document,
    ): Promise<Document[]> => {
      const query = _query ?? {};
      const aggs = _aggs ?? {};

      try {
        const collection = this.collection(indexName);
        const pipeline = [
          { $match: query },
          { $group: aggs },
        ];
        const results = await collection.aggregate(pipeline).toArray();
        return results;
      } catch (error) {
        logger.error(`Index ${indexName}: Error computing aggregation:`, error);
        return [];
      }
    },

    query: async (
      indexName: string,
      query: Document[] = []
    ): Promise<Document[]> => {
      logger.debug(`MongoDB: querying data from ${indexName}`);

      try {
        const collection = this.collection(indexName);
        const results = await collection.aggregate(
          query
        ).toArray();

        return results;
      } catch (error: any) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
        return [];
      }
    },

    get: async (
      indexName: string,
      query: Document[] = [],
      size: number = 1000,
    ): Promise<DatasetSchema | void> => {
      logger.debug(`MongoDB: fetching data from ${indexName}`);
      try {
        const results = await this.data.query(indexName, query);
        const meta = await this.data.metadata(indexName);
        logger.debug(`MongoDB: returned data from ${indexName}`);
        return {
          records: results,
          meta,
        };
      } catch (error) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
      }
    },

    record: async (
      indexName: string,
      query: Filter<Document> = {},
      size: number = 1,
    ): Promise<Document | null> => {
      try {
        const collection = this.collection(indexName);
        const record = await collection.findOne(query);
        return record;
      } catch (error) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
      }
      return null;
    },

    mutate: async (indexName: string, field: string): Promise<void> => {
      const res = await this.data.get(indexName);
      const { records = [] } = res ?? {};

      const mutatedRecords = records.map((record: Document) => {
        const recordDate = record[field];
        const epochTimestamp = new Date(recordDate).getTime();
        record.date = epochTimestamp;
        return record;
      });

      await this.index.upsert(indexName, { records: mutatedRecords });
    },
  };

  public utility = {
    dedupe: async (indexName: string, field: string): Promise<void> => {
      try {
        const collection = this.collection(indexName);
        const duplicates = await collection
          .aggregate([
            { $group: { _id: `$${field}`, count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
            { $match: { count: { $gt: 1 } } },
          ])
          .toArray();

        const bulkOps = duplicates.flatMap((group) => {
          const docsToRemove = group.docs.slice(1);
          return docsToRemove.map((doc: Document) => ({
            deleteOne: { filter: { _id: doc._id } },
          }));
        });

        if (bulkOps.length > 0) {
          await collection.bulkWrite(bulkOps);
          logger.debug(`Deduplicated ${bulkOps.length} documents in collection: ${indexName}`);
        }
      } catch (error) {
        console.error('Error deduplicating documents:', error);
      }
    },
  };

  public async listIndices(): Promise<Record<string, any>> {
    const collections = await this.db.listCollections().toArray();
    const indexMap: Record<string, any> = {};

    for (const collection of collections) {
      const indexName = collection.name;
      const metadata = await this.data.metadata(indexName);
      indexMap[indexName] = metadata;
    }

    return indexMap;
  }

  public async query(indexNames: string | string[], query: string, size: number = 1000): Promise<Document[]> {
    const indexes = Array.isArray(indexNames) ? indexNames : [indexNames];
    logger.debug(`Querying index(es) ${indexes} with query: ${query}`);
    try {
      const results: Document[] = [];

      for (const indexName of indexes) {
        const collection = this.collection(indexName);
        const documents = await collection
          .find({ $text: { $search: query } }, { limit: size })
          .toArray();
        results.push(...documents);
      }

      logger.debug(`Query successful: ${indexes}`);
      return results;
    } catch (error) {
      logger.error(`Error querying index ${indexes}:`, error);
      return [];
    }
  }
}

// Interfaces and types
interface DatasetSchema {
  meta?: Document;
  records: Document[];
}

export default MongoDBService;