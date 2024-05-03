import { Client, estypes, } from '@elastic/elasticsearch';
import logger from '@utils/logger';

function responseTransformer(response: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
  const { hits } = response.hits;
  const length = hits.length;
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    const record = hits[i];
    result[i] = {
      id: record._id,
      ...(record._source ?? {}),
    };
  }

  return result;
}

class ElasticsearchService {
  private static instance: ElasticsearchService;
  private client: Client;

  private constructor() {
    if (ElasticsearchService.instance) {
      throw new Error('An ElasticsearchService instance has already been created. Use ElasticsearchService.getInstance() to get its instance');
    }

    logger.debug('elasticsearch: creating client');
    this.client = new Client({ node: 'http://localhost:9200' });
    logger.debug('elasticsearch: client created');
  }

  public static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService();
    }
    return ElasticsearchService.instance;
  }

  public sources = {
    get: async (source?: string, dataset?: string): Promise<ElasticsearchDocument | undefined> => {
      logger.debug(`Source ${source} ${dataset}: fetching source`);
      try {
        const query = {
          bool: {
            must: [] as Array<{ term: Term; }>
          }
        };

        if (source) {
          query.bool.must.push({ term: { 'source.keyword': source } as Term });
        }

        if (dataset) {
          query.bool.must.push({ term: { 'dataset.keyword': dataset } as Term });
        }

        const response = await this.client.search({
          index: 'sources',
          body: {
            query
          }
        });

        logger.debug(`Source ${source} ${dataset}: Source fetched successfully`);
        return responseTransformer(response);
      } catch (error) {
        logger.error(`Source ${source} ${dataset}: Error fetching source:`, error);
        return undefined;
      }
    }
  };

  public validate = {
    dataset: (dataset: DatasetSchema) => {
      if (!dataset || !dataset.records || !Array.isArray(dataset.records)) {
        throw new Error('Invalid dataset. A dataset must be at minimum an object with a records field that is an array.');
      }
    }
  };

  public index = {
    create: async (indexName: string): Promise<void> => {
      logger.debug(`Index ${indexName} creating index`);
      try {
        const indexExists = await this.client.indices.exists({ index: indexName });

        if (!indexExists) {
          await this.client.indices.create({
            index: indexName,
            body: {
              settings: {
                number_of_shards: 1,
                number_of_replicas: 1
              }
            }
          });
          logger.debug(`Index ${indexName}: Index created`);
        }
      } catch (error) {
        logger.error(`Index ${indexName}: An error occurred:`, error);
      }
    },

    upsert: async (indexName: string, dataset: DatasetSchema): Promise<estypes.BulkResponse[] | undefined> => {
      this.validate.dataset(dataset);

      // try to create an index in case it doesn't exist
      await this.index.create(indexName);

      const { meta, records } = dataset;

      if (meta) {
        await this.index.updateMetadata(indexName, meta);
      }

      if (records.length === 0) {
        return dataset;
      }

      const batchSize = 3000; // Adjust the batch size as needed

      try {
        const responses: Promise<estypes.BulkResponse>[] = [];
        logger.debug(`Inserting ${records.length} records in ${Math.ceil(records.length / batchSize)} batches of ${batchSize}`);
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const body = [];

          for (const doc of batch) {
            if ('id' in doc) {
              // If the document has an _id, create an UpdateRequest
              body.push({
                update: {
                  _index: indexName,
                  _id: doc.id,
                },
              }, {
                doc,
                doc_as_upsert: true,
              });
            } else {
              // If no document with the same shape exists, create an IndexRequest
              body.push({
                index: {
                  _index: indexName,
                },
              }, doc);
            }
          }

          const response = this.client.bulk({ refresh: true, body });
          responses.push(response);
        }

        const results = await Promise.all(responses);
        logger.debug(`Index ${indexName}: Documents upserted successfully`);
        return results;
      } catch (error) {
        logger.error(`Index ${indexName}: Error upserting documents:`, error);
        return undefined;
      }
    },

    delete: async (indexName: string, document: ElasticsearchDocument): Promise<estypes.DeleteResponse | undefined> => {
      try {
        const response = await this.client.delete({
          index: indexName,
          id: document.id, // Assuming the document has an _id field
          refresh: true, // Refresh the index to make the changes visible immediately
        });

        logger.debug(`Index ${indexName}: Document with ID ${document._id} deleted successfully`);
        return response;
      } catch (error) {
        logger.error(`Index ${indexName}: Error deleting document ${JSON.stringify(document)}:`, error);
        return undefined;
      }
    },

    deleteIndex: async (indexName: string): Promise<void> => {
      try {
        await this.client.indices.delete({ index: indexName });
        logger.debug('Index deleted:', indexName);
      } catch (error) {
        console.error('Error deleting index:', error);
      }
    },

    schema: async (index: string): Promise<estypes.IndicesGetMappingResponse | undefined> => {
      logger.debug(`Index ${index} fetching schema`);
      try {
        const response = await this.client.indices.getMapping({ index });
        return response;
      } catch (error) {
        logger.error('Error fetching index schema:', error);
      }
    },

    updateMetadata: async (indexName: string, newMetadata: Record<string, any>): Promise<estypes.IndicesPutMappingResponse | undefined> => {
      logger.debug(`Index ${indexName}: Updating metadata`);
      try {
        const existingMetadata = await this.data.metadata(indexName);

        return this.client.indices.putMapping({
          index: indexName,
          body: {
            _meta: {
              ...existingMetadata,
              ...newMetadata,
            }
          }
        });
      } catch (error) {
        logger.error(`Index ${indexName}: Error updating metadata:`, error);
      }
    }
  };

  public data = {
    metadata: async (indexName: string): Promise<Record<string, any>> => {
      try {
        const meta = await this.client.indices.get({
          index: indexName,
        });
        return meta[indexName]?.mappings?._meta ?? {};
      } catch (error) {
        logger.error(`Index ${indexName}: Error fetching metadata:`, error);
        return {};
      }
    },

    get: async (indexName: string, query: estypes.QueryDslQueryContainer = { match_all: {} }, size: number = 1000): Promise<DatasetSchema | void> => {
      logger.debug(`es: fetching data from ${indexName}`);
      try {
        // TODO: figure out why promise.all isnt properly awaiting, and make these in parallel
        const response = await this.client.search<estypes.SearchResponse<estypes.SearchResponse>>({
          index: indexName,
          body: {
            query,
            size
          }
        });

        const meta = await this.data.metadata(indexName);
        const records = responseTransformer(response);
        logger.debug(`es:returned data from ${indexName}`);
        return {
          records,
          // @ts-ignore
          meta,
        };
      } catch (error) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
        if (error.message.includes('index_not_found_exception')) {
          return undefined // { ...error.meta.body, message: error.message };
        }

        throw error;
      }
    },

    mutate: async (indexName: string, field: string) => {
      const { records } = await this.data.get(indexName);

      const mutatedRecords = records.map(record => {
        const recordDate = record[field];
        const epochTimestamp = new Date(recordDate, 0, 1).getTime();
        record.date = epochTimestamp;
        return record;
      });

      return this.index.upsert(indexName, { records: mutatedRecords });
    }
  };

  public utility = {
    dedupe: async (indexName: string, field: string): Promise<void> => {
      try {
        // Query the index to find duplicate records based on the "url" field
        const response = await this.client.search({
          index: indexName,
          body: {
            aggs: {
              duplicates: {
                terms: {
                  field: `${field}.keyword`,
                  min_doc_count: 2,
                },
                aggs: {
                  duplicate_docs: {
                    top_hits: {
                      size: 10,
                      sort: [{ _id: 'asc' }],
                    },
                  },
                },
              },
            },
          },
        });

        // Get the duplicate document groups
        // @ts-ignore
        const duplicateGroups = response?.aggregations?.duplicates?.buckets;
        let promiseResults = [];
        if (duplicateGroups.length > 0) {
          // @ts-ignore
          duplicateGroups.map(async (foundDuplicate) => {
            const dupeRecords = foundDuplicate.duplicate_docs.hits.hits;
            dupeRecords.pop(); // pop off the record to keep
            // @ts-ignore
            promiseResults.push(dupeRecords.map(async ({ _index: index, _id: id }) => this.client.delete({
              index,
              id,
            })));
          });
        }

        // NOTE: this probably isnt actually awaiting
        const results = await promiseResults;

        // @ts-ignore
        return results;
      } catch (error) {
        console.error('Error deleting duplicate documents:', error);
      }
    }
  }

  public async listIndices() {
    const indexes = await this.client.cat.indices({
      format: 'json',
    });

    const indexMap = {};
    const promises = indexes.map(async ({ index }) => {
      const metadata = await this.data.metadata(index);
      if (index === '.geoip_databases') return;
      indexMap[index] = metadata;
    });
    await Promise.all(promises);
    return indexMap;
  }

  /**
   * Executes a search query based on the provided Lucene query string.
   * @param indexName The name of the index to query.
   * @param luceneQuery The Lucene query string.
   * @param size The number of search hits to return.
   * @returns A promise that resolves to the search results.
   */
  public async query(indexNames: string | string[], luceneQuery: string, size: number = 1000): Promise<Record<string, unknown>[]> {
    const indexes = Array.isArray(indexNames) ? indexNames.join(',') : indexNames;
    logger.debug(`Querying index(es) ${indexNames} with query: ${luceneQuery}`);
    try {
      const response = await this.client.search({
        index: indexes,
        body: {
          query: {
            query_string: {
              query: luceneQuery
            }
          },
          size
        }
      });
      logger.debug(`Query successful: ${indexes}`);
      return responseTransformer(response);
    } catch (error) {
      logger.error(`Error querying index ${indexes}:`, error);
      return [];
    }
  }
}

// Interfaces and types
interface DatasetSchema {
  meta?: ElasticsearchDocument
  records: ElasticsearchDocument[];
}

interface ElasticsearchDocument {
  [key: string]: any;
}

export default ElasticsearchService;

interface Term {
  source?: string;
  dataset?: string;
}