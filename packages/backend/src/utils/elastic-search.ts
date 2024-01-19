import { Client, estypes } from '@elastic/elasticsearch';
import logger from './logger.js';

// Create a client instance
logger.debug('elasticsearch: creating client');
const client = new Client({ node: 'http://localhost:9200' });
logger.debug('elasticsearch: client created');

export async function createIndex(index: string): Promise<estypes.IndicesCreateResponse | estypes.IndicesGetResponse | undefined> {
  logger.debug(`Index ${index} creating index`);
  try {
    // Check if the index already exists
    const indexExists = await client.indices.exists({ index });

    if (indexExists) {
      logger.debug(`Index ${index} already exists`);
      return client.indices.get({ index });;
    } else {
      // Create a new index
      const response = await client.indices.create({
        index,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          }
        }
      });
      logger.debug(`Index ${index}: Index created:`, response);
      return response;
    }
  } catch (error) {
    logger.error(`Index ${index}: An error occurred:`, error);
  }
}

export async function deleteIndex(indexName: string): Promise<void> {
  try {
    await client.indices.delete({ index: indexName });
    logger.debug('Index deleted:', indexName);
  } catch (error) {
    console.error('Error deleting index:', error);
  }
}

export async function getSchema(index: string): Promise<estypes.IndicesGetMappingResponse | undefined> {
  logger.debug(`Index ${index} fetching schema`);
  try {
    const response = await client.indices.getMapping({ index });
    return response;
  } catch (error) {
    logger.error('Error fetching index schema:', error);
  }
}

export const getIndexName = (datasetID: string, fileName: string): string => {
  const elasticsearchIndex = `dataset-${datasetID}-${fileName}`.toLowerCase();
  return elasticsearchIndex;
}

function chunkArray<T>(array: T[], chunkSize: number = 500): T[][] {
  const chunkedArray: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    chunkedArray.push(chunk);
  }
  return chunkedArray;
}

export async function addData(indexName: string, data: ElasticsearchDocument[]): Promise<void> {
  logger.debug(`Index ${indexName}: adding data. ${data.length} records being added`);
  try {
    // insert 
    const CHUNK_SIZE = 1000;
    chunkArray(data, CHUNK_SIZE).forEach(async (chunk, index) => {
      const body: (ElasticsearchBulkOperation | ElasticsearchDocument)[] = chunk.flatMap(doc => [{ index: { _index: indexName } }, doc]);

      // Directly capturing the response here
      const bulkResponse = await client.bulk({ refresh: true, body });

      if (bulkResponse.errors) {
        const erroredDocuments: any[] = [];
        bulkResponse.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: body[i * 2] as ElasticsearchBulkOperation,
              document: body[i * 2 + 1] as ElasticsearchDocument
            });
          }
        });
        logger.error('Some documents failed to index:', erroredDocuments);
      } else {
        logger.debug(`chunk ${index} of ${Math.round(data.length / CHUNK_SIZE)}: All documents indexed successfully`);
      }
    });
  } catch (error) {
    logger.error('Error indexing documents:', error);
  }
}

interface MyRecord {
  id: string;
  [key: string]: unknown;
}

export async function getData(indexName: string, query: estypes.QueryDslQueryContainer = { match_all: {} }, size: number = 1000): Promise<MyRecord[]> {
  logger.debug(`Index ${indexName}: fetching data`);
  try {
    const { hits: { hits: results } } = await client.search<estypes.SearchResponse<estypes.SearchResponse>>({
      index: indexName,
      body: {
        query,
        size
      }
    });

    logger.debug(`Index ${indexName}: Data fetched successfully`);
    logger.debug(`Index ${indexName}: remapping data`);

    const records = results.map(record => ({
      id: record._id,
      ...record._source
    }));

    logger.debug(`Index ${indexName}: remapped`);
    return records;
  } catch (error) {
    logger.error(`Index ${indexName}: Error fetching data:`, error);
    throw error;
  }
}

interface ElasticsearchBulkOperation {
  index: {
    _index: string;
  };
}

interface ElasticsearchDocument {
  [key: string]: any;
}