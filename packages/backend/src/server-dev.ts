import 'reflect-metadata';
import express from 'express';
import { connectToDB } from '@utils/db';
import logger from '@utils/logger';
import { application } from '@backend/app';
import ElasticSearch from '@utils/elastic-search';
import bodyParser from 'body-parser';

logger.debug('Express:dev: Creating elastic search client');
ElasticSearch.getInstance();
logger.debug('Express:dev: elastic search client created');

logger.debug('Express:dev: Connecting to local mongoose DB');
await connectToDB();
logger.debug('Express:dev: local mongoose DB connected 🚀');

logger.debug('Express:dev: Creating dev app');
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

logger.debug('Express:dev: dev app created 🚀');

logger.debug('Express:dev: dev setting up routes');
application(app);
logger.debug('Express:dev: dev routes created 🚀');

export { app };
