import { Express } from 'express';
import bodyParser from 'body-parser';
import { isDev, getServePort } from '@utils/helpers';
import logger from '@utils/logger';

export function configureApp(app: Express): void {
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  if (!isDev) {
    const port = getServePort();
    app.listen(port, () => logger.info(`Express: Production Server started @ 'http://localhost:${port}'`));
  }
}
