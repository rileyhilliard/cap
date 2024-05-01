import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import logger from './logger.js';
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

  private createHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('hex');
  }

  private async hasCache(key: string): Promise<boolean> {
    const hash = this.createHash(key);
    const filePath = this.getFilePath(hash);
    if (fs.existsSync(filePath)) {
      const stats = await fs.promises.stat(filePath);
      const lastModified = new Date(stats.mtime);
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      return (new Date().getTime() - lastModified.getTime()) <= SEVEN_DAYS;
    }
    return false;
  }

  private getFilePath(hash: string): string {
    return path.join(this.cacheDir, `${hash}.json`);
  }

  public async get(key: string): Promise<any> {
    await this.initializeCacheDir();

    logger.debug(`getting cache for ${key}`);
    const valid = await this.hasCache(key);
    if (valid) {
      const hash = this.createHash(key);
      const filePath = this.getFilePath(hash);
      const data = await fs.promises.readFile(filePath, 'utf8');
      logger.debug(`cache for ${key} exists and is valid`);
      return JSON.parse(data);
    }

    logger.debug(`cache for ${key} does not exist, or expired`);
    return null;
  }

  public async set(key: string, data: any): Promise<void> {
    await this.initializeCacheDir();

    const hash = this.createHash(key);
    const filePath = this.getFilePath(hash);
    await fs.promises.writeFile(filePath, JSON.stringify(data));
  }

}
