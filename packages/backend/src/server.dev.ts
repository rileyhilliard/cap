import logger from '@utils/logger';
import { createApplication } from '@backend/app';

logger.info('Starting Dev Server');
const app = createApplication();

export { app };
