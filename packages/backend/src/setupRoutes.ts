import { Express, Request, Response } from 'express';
import { updateRegionsIndex, fetchRegion, getIndexNames } from '@utils/region';
import ElasticSearch from '@utils/elastic-search';
import logger from '@utils/logger';

export function setupRoutes(app: Express): void {
  const es = ElasticSearch.getInstance();
  logger.info('Express: Setting up routes');

  app.put('/v1/regions/:id', async (req: Request, res: Response) => {
    console.time(`PUT /v1/regions/${req.params.id}`);
    const { id } = req.params;

    // register the region to the db
    await updateRegionsIndex(id, req.body);

    // scrapes the region and upserts the data to the db
    await fetchRegion(id);
    console.timeEnd(`PUT /v1/regions/${req.params.id}`);
    return res.json({ id, added: true, ...req.body });
  });

  app.delete('/v1/regions/:id', async (req: Request, res: Response) => {
    console.time(`DELETE /v1/regions/${req.params.id}`);
    const { id } = req.params;
    const indexes = getIndexNames(id);
    const results = await Promise.all(Object.keys(indexes)
      .map(async (key) => es.index.deleteIndex(indexes[key])));

    console.timeEnd(`DELETE /v1/regions/${req.params.id}`);
    return res.json(results);
  });

  app.get('/v1/regions', async (req: Request, res: Response) => {
    const results = await es.data.get('registered_indexes')

    res.json(results);
  });

  app.get('/v1/regions/:id', async (req: Request, res: Response) => {
    const { COMBINED_PROPERTIES_INDEX } = getIndexNames(req.params.id);
    const results = await es.data.get(COMBINED_PROPERTIES_INDEX)

    res.json(results);
  });

  app.get('/v1/indexes', async (req: Request, res: Response) => {
    const results = await es.listIndices()

    res.json(results);
  });

  app.get('/v1/indexes/:id', async (req: Request, res: Response) => {
    const results = await es.data.get(req.params.id);
    res.json(results);
  });
}