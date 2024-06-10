import { Client, estypes } from '@elastic/elasticsearch';
import logger from '@utils/logger';
import { isValidUrl, isDev } from '@utils/helpers';
import { startElastic, stopElastic } from '@utils/docker';
import { debounce } from 'lodash';

function inferElasticsearchFieldType(value: any): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value !== 0) {
      if (value > 1000000000 || value < -1000000000) {
        return 'long';
      } else {
        return 'integer';
      }
    } else {
      return 'float';
    }
  } else if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
      return 'date';
    }
    if (isValidUrl(value)) {
      return 'keyword';
    }
    return 'text';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (Array.isArray(value)) {
    return 'nested';
  } else if (value instanceof Date) {
    return 'date';
  } else if (typeof value === 'object') {
    return 'object';
  } else {
    return 'text';
  }
}

function generateSchemaFromRecords(records: any[]): any {
  const schema: any = {};

  for (const record of records) {
    for (const key in record) {
      if (record.hasOwnProperty(key)) {
        const value = record[key];

        if (!schema[key]) {
          schema[key] = {
            type: inferElasticsearchFieldType(value),
            properties:
              typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
                ? {}
                : undefined,
          };
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          if (!schema[key].properties) {
            schema[key].properties = {};
          }
          const nestedSchema = generateSchemaFromRecords([value]);
          mergeSchemas(schema[key].properties, nestedSchema);
        } else {
          const inferredType = inferElasticsearchFieldType(value);
          if (schema[key].type !== inferredType) {
            if (schema[key].type === 'integer' && inferredType === 'float') {
              schema[key].type = 'float';
            } else if (schema[key].type === 'float' && inferredType === 'integer') {
              // Keep the type as 'float'
            } else {
              schema[key].type = 'text'; // Fallback to 'text' if types are incompatible
            }
          }
        }
      }
    }
  }

  return schema;
}

function mergeSchemas(schema1: any, schema2: any): void {
  for (const key in schema2) {
    if (schema2.hasOwnProperty(key)) {
      if (!schema1[key]) {
        schema1[key] = schema2[key];
      } else if (schema1[key].type !== schema2[key].type) {
        if (schema1[key].type === 'integer' && schema2[key].type === 'float') {
          schema1[key].type = 'float';
        } else if (schema1[key].type === 'float' && schema2[key].type === 'integer') {
          // Keep the type as 'float'
        } else {
          schema1[key].type = 'text'; // Fallback to 'text' if types are incompatible
        }
      }

      if (schema1[key].properties && schema2[key].properties) {
        mergeSchemas(schema1[key].properties, schema2[key].properties);
      }
    }
  }
}

export function responseTransformer(
  response: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>,
) {
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
  private client: Client | null;
  private host: string;
  private closeConnection: () => void;
  private setupConnectionPromise: Promise<void> | null;

  private constructor() {
    if (ElasticsearchService.instance) {
      throw new Error(
        'An ElasticsearchService instance has already been created. Use ElasticsearchService.getInstance() to get its instance',
      );
    }

    const devLocalHost = 'http://localhost:9200';
    // process?.env?.ELASTIC is set in pm2.config.cjs
    this.host = process.env.ELASTIC ?? devLocalHost;

    if (!isDev && this.host === devLocalHost) {
      console.warn(new Error(
        `elasticsearch: production served with the dev elasticsearch host (${devLocalHost}). It should be something like http://<elasticsearch docker container name>:9200`,
      ));
    }

    const FIVE_MINUTES = 60000 * 5;
    this.closeConnection = debounce(this._close, FIVE_MINUTES, { leading: false, trailing: true });
    this.client = null;
    this.setupConnectionPromise = null;
    this.setupConnection();
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
      await this.setupConnection();
      try {
        const query = {
          bool: {
            must: [] as Array<{ term: Term }>,
          },
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
            query,
          },
        });

        logger.debug(`Source ${source} ${dataset}: Source fetched successfully`);
        return responseTransformer(response);
      } catch (error) {
        logger.error(`Source ${source} ${dataset}: Error fetching source:`, error);
        return undefined;
      } finally {
        await this.closeConnection();
      }
    },
  };

  public validate = {
    dataset: async (dataset: DatasetSchema) => {
      await this.setupConnection();
      if (!dataset || !dataset.records || !Array.isArray(dataset.records)) {
        await this.closeConnection();
        throw new Error(
          'Invalid dataset. A dataset must be at minimum an object with a records field that is an array.',
        );
      }
      await this.closeConnection();
    },
  };

  public index = {
    create: async (indexName: string, records?: unknown[], _options?: { inferTypes: boolean }): Promise<void> => {
      await this.setupConnection();
      const options = _options ?? { inferTypes: true };
      logger.debug(`Index ${indexName} creating index`);
      try {
        const indexExists = await this.client.indices.exists({ index: indexName });

        if (!indexExists) {
          // NOTE the inferrence here is probably close, but copilot was off by something specific

          const schema = options.inferTypes && records && generateSchemaFromRecords(records);
          await this.client.indices.create({
            index: indexName,
            body: {
              settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
              },
              ...(schema
                ? {
                  mappings: {
                    properties: schema,
                  },
                }
                : {}),
            },
          });
          logger.debug(`Index ${indexName}: Index created`);
        }
      } catch (error) {
        logger.error(`Index ${indexName}: An error occurred:`, error);
      }
      await this.closeConnection();
    },

    upsert: async (
      indexName: string,
      dataset: DatasetSchema,
      _options?: { inferTypes: boolean },
    ): Promise<estypes.BulkResponse[] | undefined> => {
      await this.setupConnection();
      const options = _options ?? { inferTypes: true };
      this.validate.dataset(dataset);

      // try to create an index in case it doesn't exist
      await this.index.create(indexName, dataset.records, options);

      const { meta, records } = dataset;

      if (meta) {
        await this.index.updateMetadata(indexName, meta);
      }

      if (records.length === 0) {
        return dataset;
      }

      const batchSize = 3000;

      try {
        const responses: Promise<estypes.BulkResponse>[] = [];
        logger.debug(
          `Inserting ${records.length} records in ${Math.ceil(records.length / batchSize)} batches of ${batchSize}`,
        );
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const body = [];

          for (const doc of batch) {
            if ('id' in doc) {
              // If the document has an _id, create an UpdateRequest
              body.push(
                {
                  update: {
                    _index: indexName,
                    _id: doc.id,
                  },
                },
                {
                  doc,
                  doc_as_upsert: true,
                },
              );
            } else {
              // If no document with the same shape exists, create an IndexRequest
              body.push(
                {
                  index: {
                    _index: indexName,
                  },
                },
                doc,
              );
            }
          }

          const response = this.client.bulk({ refresh: true, body });
          responses.push(response);
        }

        const results = await Promise.all(responses);
        if (results[0].errors) {
          const errs = results[0].items
            .filter((i) => (i?.index ?? i?.update)?.status || 200 > 399)
            .map((i) => {
              return new Error((i?.index ?? i?.update)?.error?.reason ?? 'unknown');
            });
          errs?.forEach(logger.error);
        }

        return results;
      } catch (error) {
        logger.error(`Index ${indexName}: Error upserting documents:`, error);
        return undefined;
      }

      await this.closeConnection();
    },

    delete: async (indexName: string, document: ElasticsearchDocument): Promise<estypes.DeleteResponse | undefined> => {
      await this.setupConnection();
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
      } finally {
        await this.closeConnection();
      }

    },

    deleteIndex: async (indexName: string): Promise<void> => {
      await this.setupConnection();
      try {
        await this.client.indices.delete({ index: indexName });
        logger.debug('Index deleted:', indexName);
      } catch (error: Error | any) {
        if (!error?.message?.includes('index_not_found_exception')) {
          console.error('Error deleting index:', error);
        }
      } finally {
        await this.closeConnection();
      }
    },

    schema: async (index: string): Promise<estypes.IndicesGetMappingResponse | undefined> => {
      await this.setupConnection();
      logger.debug(`Index ${index} fetching schema`);
      try {
        const response = await this.client.indices.getMapping({ index });
        return response;
      } catch (error) {
        logger.error('Error fetching index schema:', error);
      } finally {
        await this.closeConnection();
      }
    },

    updateMetadata: async (
      indexName: string,
      newMetadata: Record<string, any>,
    ): Promise<estypes.IndicesPutMappingResponse | undefined> => {
      await this.setupConnection();
      logger.debug(`Index ${indexName}: Updating metadata`);
      try {
        await this.index.create(indexName);
        const existingMetadata = await this.data.metadata(indexName);

        return this.client.indices.putMapping({
          index: indexName,
          body: {
            _meta: {
              ...existingMetadata,
              ...newMetadata,
            },
          },
        });
      } catch (error) {
        logger.error(`Index ${indexName}: Error updating metadata:`, error);
      } finally {
        await this.closeConnection();
      }
    },
  };

  public data = {
    metadata: async (indexName: string): Promise<Record<string, any>> => {
      await this.setupConnection();
      try {
        const meta = await this.client.indices.get({
          index: indexName,
        });
        return meta[indexName]?.mappings?._meta ?? {};
      } catch (error) {
        return {};
      } finally {
        await this.closeConnection();
      }
    },

    compute: async (
      index: string,
      _query?: estypes.QueryDslQueryContainer,
      _aggs?: estypes.AggregationsAggregationContainer,
    ): Promise<estypes.SearchResponse> => {
      await this.setupConnection();
      const client = this;

      const query = _query ?? {
        bool: {
          filter: [
            {
              range: {
                lastSeen: {
                  gte: 'now-30d/d',
                  lte: 'now/d',
                },
              },
            },
          ],
        },
      };

      const aggs = _aggs ?? {
        unique_addresses: {
          terms: {
            field: 'address.keyword',
            size: 10000,
          },
          aggs: {
            latest_record: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['price'],
                },
                sort: [
                  {
                    lastSeen: {
                      order: 'desc',
                    },
                  },
                ],
              },
            },
          },
        },
      };

      return this.client
        .search<estypes.SearchResponse<estypes.SearchResponse>>({
          index: index,
          body: {
            size: 0,
            query: query,
            aggs: aggs,
          },
        })
        .catch((e) => e)
        .finally(() => client.closeConnection());
    },

    query: async (
      indexName: string,
      body: estypes.SearchRequest,
      size: number = 1000,
    ): Promise<estypes.SearchResponse<unknown>> => {
      await this.setupConnection();
      logger.debug(`es: querying data from ${indexName}`);
      body.size = body.size ?? size; // Ensure the size is set in the body, defaulting to the function parameter

      try {
        return this.client.search<estypes.SearchResponse<unknown>>({
          index: indexName,
          body,
        });
      } catch (error: any) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
        if (error?.meta?.body?.error?.type === 'index_not_found_exception') {
          logger.error(`Index ${indexName} not found`);
        }
        return error;
      } finally {
        await this.closeConnection();
      }
    },

    get: async (
      indexName: string,
      query: estypes.QueryDslQueryContainer = { match_all: {} },
      size: number = 1000,
    ): Promise<DatasetSchema | void> => {
      await this.setupConnection();
      logger.debug(`es: fetching data from ${indexName}`);
      const body = {
        query,
        size,
        // ...({
        //   collapse: {
        //     field: uniqueBy
        //   }
        // })
      };
      try {
        // TODO: figure out why promise.all isnt properly awaiting, and make these in parallel
        const response = await this.client.search<estypes.SearchResponse<estypes.SearchResponse>>({
          index: indexName,
          body,
        });

        const meta = await this.data.metadata(indexName);
        const records = responseTransformer(response);
        logger.debug(`es:returned data from ${indexName}`);
        return {
          records,
          // @ts-ignore
          meta,
          response,
        };
      } catch (error) {
        if (error.message.includes('index_not_found_exception')) {
          return undefined; // { ...error.meta.body, message: error.message };
        }
        logger.error(`Index ${indexName}: Error fetching data:`, error);
        throw error;
      } finally {
        await this.closeConnection();
      }
    },

    record: async (
      indexName: string,
      query: estypes.QueryDslQueryContainer = { match_all: {} },
      size: number = 1,
    ): Promise<KeyValuePair<unknown> | void> => {
      await this.setupConnection();
      try {
        // TODO: figure out why promise.all isnt properly awaiting, and make these in parallel
        const response = await this.client.search<estypes.SearchResponse<estypes.SearchResponse>>({
          index: indexName,
          body: {
            query,
            size,
          },
        });
        return (responseTransformer(response) ?? []).at(0);
      } catch (error) {
        logger.error(`Index ${indexName}: Error fetching data:`, error);
        if (error.message.includes('index_not_found_exception')) {
          return undefined; // { ...error.meta.body, message: error.message };
        }

        throw error;
      } finally {
        await this.closeConnection();
      }
    },

    mutate: async (indexName: string, field: string) => {
      await this.setupConnection();
      const { records } = await this.data.get(indexName);

      const mutatedRecords = records.map((record: ElasticsearchDocument) => {
        const recordDate = record[field];
        const epochTimestamp = new Date(recordDate, 0, 1).getTime();
        record.date = epochTimestamp;
        return record;
      });

      return this.index.upsert(indexName, { records: mutatedRecords }).finally(() => this.closeConnection());
    },
  };

  public utility = {
    dedupe: async (indexName: string, field: string): Promise<void> => {
      await this.setupConnection();
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
        const promiseResults = [];
        if (duplicateGroups.length > 0) {
          // @ts-ignore
          duplicateGroups.map(async (foundDuplicate) => {
            const dupeRecords = foundDuplicate.duplicate_docs.hits.hits;
            dupeRecords.pop(); // pop off the record to keep
            // @ts-ignore
            promiseResults.push(
              dupeRecords.map(async ({ _index: index, _id: id }) =>
                this.client.delete({
                  index,
                  id,
                }),
              ),
            );
          });
        }

        // NOTE: this probably isnt actually awaiting
        const results = await promiseResults;

        // @ts-ignore
        return results;
      } catch (error) {
        console.error('Error deleting duplicate documents:', error);
      } finally {
        await this.closeConnection();
      }
    },
  };

  public async listIndices() {
    await this.setupConnection();
    const indexes = await this.client.cat.indices({
      format: 'json',
    });

    const indexMap = {};
    const promises = indexes.map(async ({ index }) => {
      if (typeof index !== 'string' || index.startsWith('.')) return;
      const metadata = await this.data.metadata(index);
      indexMap[index] = metadata;
    });
    await Promise.all(promises);
    await this.closeConnection();
    return indexMap;
  }

  /**
   * Executes a search query based on the provided Lucene query string.
   * @param indexName The name of the index to query.
   * @param luceneQuery The Lucene query string.
   * @param size The number of search hits to return.
   * @returns A promise that resolves to the search results.
   */
  public async query(
    indexNames: string | string[],
    luceneQuery: string,
    size: number = 1000,
  ): Promise<Record<string, unknown>[]> {
    await this.setupConnection();
    const indexes = Array.isArray(indexNames) ? indexNames.join(',') : indexNames;
    logger.debug(`Querying index(es) ${indexNames} with query: ${luceneQuery}`);
    try {
      const response = await this.client.search({
        index: indexes,
        body: {
          query: {
            query_string: {
              query: luceneQuery,
            },
          },
          size,
        },
      });
      logger.debug(`Query successful: ${indexes}`);
      return responseTransformer(response);
    } catch (error) {
      logger.error(`Error querying index ${indexes}:`, error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }

  private async setupConnection() {
    if (!this.setupConnectionPromise) {
      this.setupConnectionPromise = new Promise(async (resolve) => {
        try {
          await this.client.ping();
          console.log('Elasticsearch connection already running, no need to set it up again');
          resolve(null);
          this.setupConnectionPromise = null;
          return;
        } catch (error) {
          startElastic();
        }
        while (true) {
          try {
            await this.waitForElasticsearchReady();
            this.client = new Client({ node: this.host });
            await this.client.ping();
            console.log('Elasticsearch connection established');
            resolve(null);
            this.setupConnectionPromise = null;
            this.closeConnection(); // auto close after 5 minutes of inactivity
            break;
          } catch (error) {
            console.error('Elasticsearch not ready, retrying in 5 seconds...');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      });
    }
    return this.setupConnectionPromise;
  }

  private async waitForElasticsearchReady() {
    return new Promise<void>((resolve, reject) => {
      const checkReadyStatus = () => {
        const url = `${this.host}/_cluster/health`;
        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            if (data?.status === 'green' || data?.status === 'yellow') {
              resolve();
            } else {
              setTimeout(checkReadyStatus, 500);
            }
          })
          .catch((error) => {
            console.count(error.message);
            setTimeout(checkReadyStatus, 500);
          });
      };
      checkReadyStatus();
    });
  }

  private async _close() {
    logger.debug('Elasticsearch connection closing');
    await this.client?.close();
    this.client = null;
    stopElastic();
    logger.debug('Elasticsearch connection closed');
  }
}

// Interfaces and types
interface DatasetSchema {
  meta?: ElasticsearchDocument;
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

type KeyValuePair<T> = {
  key: string;
  value: T;
};
