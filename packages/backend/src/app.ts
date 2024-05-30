import 'reflect-metadata';
import express, { Express } from 'express';
// import { setupApolloServer } from './setupApolloServer';
import { setupRoutes } from './setupRoutes';
import { setupErrorHandlers } from './setupErrorHandlers';
import { configureApp } from './configureApp';
import logger from '@utils/logger';

export function createApplication(): Express {
  logger.info('Express: Creating express app');
  const app = express();

  setupErrorHandlers();
  configureApp(app);
  setupRoutes(app);

  // disabling for now: this would need to be fully overhauled if a graphql server is desired 
  // setupApolloServer(app);

  return app;
}
