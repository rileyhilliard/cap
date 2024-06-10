import { Express, Request, Response } from 'express';
import { updateRegionsIndex, fetchRegion, getIndexNames } from '@utils/region';
import { runJob } from '@utils/job';
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

  // Trigger a job run
  app.post('/v1/jobs/run', async (req: Request, res: Response) => {
    const start = performance.now();
    await runJob();
    const end = performance.now();
    const timeInSeconds = (end - start) / 1000; ``
    return res.json({ success: true, took: `${timeInSeconds} seconds` });
  });

  app.delete('/v1/regions/:id', async (req: Request, res: Response) => {
    console.time(`DELETE /v1/regions/${req.params.id}`);
    const { id } = req.params;
    const indexes = getIndexNames(id);
    const results = await Promise.all(Object.keys(indexes).map(async (key) => es.index.deleteIndex(indexes[key])));

    console.timeEnd(`DELETE /v1/regions/${req.params.id}`);
    return res.json(results);
  });

  app.get('/v1/regions', async (req: Request, res: Response) => {
    const results = await es.data.get('registered_indexes');

    res.json(results);
  });

  app.get('/v1/regions/:id', async (req: Request, res: Response) => {
    const { COMBINED_PROPERTIES_INDEX } = getIndexNames(req.params.id);
    const results = await es.data.get(COMBINED_PROPERTIES_INDEX);

    res.json(results);
  });

  app.get('/v1/indexes', async (req: Request, res: Response) => {
    const listIndices = await es.listIndices();
    const registeredRegions = await es.data.get('registered_indexes');

    res.json({ listIndices, registeredRegions });
  });

  app.get('/v1/indexes/:id', async (req: Request, res: Response) => {
    const results = await es.data.get(req.params.id);
    res.json(results);
  });

  app.get('/v1/error', async (req: Request, res: Response) => {
    logger.error('This is an error log');
    logger.debug('this is for debugging')
    logger.info('this should be informational')
    logger.warn('this is a warning')
    res.json([]);
  });
}
