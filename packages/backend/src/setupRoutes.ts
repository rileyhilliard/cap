import { Express, Request, Response } from 'express';
import { updateRegionsIndex, fetchRegion, getIndexNames } from '@utils/region';
import { runJob } from '@utils/job';
import MongoDBService from '@utils/mongo-db';
import logger from '@utils/logger';
import { generateRentalReport } from '@utils/market-report';
import { syncToPostgres } from '@utils/postgres';

export function setupRoutes(app: Express): void {
  const mongo = MongoDBService.getInstance();
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
    const timeInSeconds = (end - start) / 1000;
    logger.info(`/v1/jobs/run ${timeInSeconds} seconds`)
    return res.json({ success: true, took: `${timeInSeconds} seconds` });
  });

  app.delete('/v1/regions/:id', async (req: Request, res: Response) => {
    console.time(`DELETE /v1/regions/${req.params.id}`);
    const { id } = req.params;
    const indexes = getIndexNames(id);
    const results = await Promise.all(Object.keys(indexes).map(async (key) => mongo.index.deleteIndex(indexes[key])));

    console.timeEnd(`DELETE /v1/regions/${req.params.id}`);
    return res.json(results);
  });

  app.get('/v1/regions', async (req: Request, res: Response) => {
    const results = await mongo.data.get('registered_indexes');

    res.json(results);
  });

  app.get('/v1/sync', async (req: Request, res: Response) => {
    await syncToPostgres();
    res.json({ result: 'saynced' });
  });

  app.get('/v1/report/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const mongo = MongoDBService.getInstance();
    const indexes = getIndexNames(id);
    const rentals = await mongo.data.get(indexes.COMBINED_RENTALS_INDEX);
    const results = await generateRentalReport(indexes.RENTAL_REPORT_INDEX, rentals?.records ?? [])
    res.json(results);
  });

  app.get('/v1/metadata', async (req: Request, res: Response) => {
    const results = await mongo.data.get('metadata');
    res.json(results);
  });

  app.get('/v1/migrate', async (req: Request, res: Response) => {
    const results = await mongo.listIndices();
    const upserts = await Promise.all(Object.keys(results).map(async (i) => {
      const data = await mongo.data.get(i);
      return data && mongo.index.upsert(i, data);
    }));

    res.json(upserts);
  });

  app.get('/v1/regions/:id', async (req: Request, res: Response) => {
    const { COMBINED_PROPERTIES_INDEX } = getIndexNames(req.params.id);
    const results = await mongo.data.get(COMBINED_PROPERTIES_INDEX);

    res.json(results);
  });

  app.get('/v1/indexes', async (req: Request, res: Response) => {
    const results = await mongo.listIndices();

    res.json(results);
  });

  app.get('/v1/indexes/:id', async (req: Request, res: Response) => {
    const results = await mongo.data.get(req.params.id);
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
