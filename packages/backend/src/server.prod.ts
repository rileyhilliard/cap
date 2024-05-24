import { startCron } from '@utils/cron';
import logger from '@utils/logger';
import { createApplication } from '@backend/app';

logger.info('Starting Production Server');
const app = createApplication();

logger.info('Instantiating cron job');
// we probably shouldnt start any cron jobs in dev mode
// right now this is the only real divergence between dev and prod serve setups
startCron();

export { app };