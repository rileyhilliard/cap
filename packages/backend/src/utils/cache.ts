import fs from 'fs';
import path from 'path';
import { hasher, isDev } from '@utils/helpers';
import { fileURLToPath } from 'url';
import logger from '@utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), '..');

export class Cache {
  private cacheDir: string;

  constructor(cacheDir: string = `${__dirname}/cache`) {
    this.cacheDir = cacheDir;
    this.initializeCacheDir();
  }

  private async initializeCacheDir(): Promise<void> {
    if (!fs.existsSync(this.cacheDir)) {
      await fs.promises.mkdir(this.cacheDir, { recursive: true });
    }
  }

  private async hasCache(key: string): Promise<boolean> {
    if (!isDev) return false;
    const hash = hasher(key);
    const filePath = this.getFilePath(hash);
    if (fs.existsSync(filePath)) {
      const stats = await fs.promises.stat(filePath);
      const lastModified = new Date(stats.mtime);
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      return new Date().getTime() - lastModified.getTime() <= SEVEN_DAYS;
    }
    return false;
  }

  private getFilePath(hash: string): string {
    return path.join(this.cacheDir, `${hash}.json`);
  }

  public async get(key: string): Promise<unknown> {
    await this.initializeCacheDir();

    logger.debug(`getting cache for ${key}`);
    const valid = await this.hasCache(key);
    if (valid) {
      const hash = hasher(key);
      const filePath = this.getFilePath(hash);
      const data = await fs.promises.readFile(filePath, 'utf8');
      logger.debug(`cache for ${key} exists and is valid`);
      try {
        return JSON.parse(data);
      } catch (error) {
        // @ts-ignore
        logger.error(`Error parsing cache for ${key} @ hash ${hash}: ${error.message}`);
      }
    }

    logger.debug(`cache for ${key} does not exist, or expired`);
    return null;
  }

  public async set(key: string, data: any): Promise<void> {
    if (!isDev) return;
    logger.debug(`SET cache for ${key}`);
    const existingCache = this.get(key) ?? Object.create(null);
    const hash = hasher(key);
    const filePath = this.getFilePath(hash);
    await fs.promises.writeFile(filePath, JSON.stringify({ ...existingCache, ...data }));
  }
}
