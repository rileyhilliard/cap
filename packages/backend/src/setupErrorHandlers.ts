import logger from '@utils/logger';

export function setupErrorHandlers(): void {
  process.on('unhandledRejection', (reason: Error, promise) => {
    logger.error('unhandledRejection', { unhandledRejection: true, ...reason });
  });

  process.on('uncaughtException', (error: Error) => {
    error.uncaughtException = true
    logger.error('uncaughtException', error);
  });
}
