import logger from '@utils/logger';

export function setupErrorHandlers(): void {
  process.on('unhandledRejection', (reason: Error, promise) => {
    logger.error('unhandledRejection', { unhandledRejection: true, ...reason });
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('uncaughtException', { uncaughtException: true, ...error });
  });
}
