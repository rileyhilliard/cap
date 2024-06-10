import Transport from 'winston-transport';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import util from 'util';
import ElasticSearch from '@utils/elastic-search';
import { timestamp, hasher, isDev } from '@utils/helpers';
import chalk from 'chalk';

const { env } = process;
const cwd = process.cwd();
const trimPath = cwd.substring(0, cwd.lastIndexOf('/') + 1);

let lastTimestamp = Date.now();

const durationFormat = format.printf((info) => {
  const now = Date.now();
  const durationMs = now - lastTimestamp;
  lastTimestamp = now;
  const _d = new Date(lastTimestamp);

  const formattedTimestamp =
    _d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + `:${_d.getMilliseconds().toString().padStart(3, '0')}`;

  let formattedDuration;
  if (durationMs < 1000) {
    formattedDuration = `${durationMs}ms`;
  } else if (durationMs < 60000) {
    formattedDuration = `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(2);
    formattedDuration = `${minutes}m ${seconds}s`;
  }

  const stack = removeLines(cleanStackTrace(info?.stack ?? new Error().stack, false), 2)
  const args = (info[Symbol.for('splat')] || []).filter((arg: { stack: string }) => !arg.stack);
  const argsString = args
    .map((arg: unknown) => (typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : arg))
    .join(' ');

  return `${chalk.bold(formattedTimestamp)} [${info.level}]: ${chalk.magenta(info.message)} ${chalk.blue(`(${formattedDuration})`)}${!info.level?.includes('info') ? '\n' + chalk.dim(stack) : ''}${argsString ? '\n' + argsString : ''}`;
});

function removeLines(stack?: string, num: number = 2): string {
  if (!stack) return '';
  return stack.split('\n').slice(num).join('\n');
}

function cleanStackTrace(stack?: string, trim = true): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .map((line) => {
      let cleaned = line.replace(trimPath, '').replace(/\((\w+)\/src\//, '(@$1/src/').replace(/\(.*\/node_modules\//, '(/node_modules/');
      if (trim) {
        return cleaned.trim();
      }
      return cleaned;
    })
    .join('\n');
}

function getStackTrace(meta: Record<string, any>): string {
  return meta.stack
    ? removeLines(cleanStackTrace(meta.stack), 1)
    : removeLines(cleanStackTrace(new Error().stack), 2);
}

// Console transport
const consoleTransport: transports.ConsoleTransportInstance = new transports.Console({
  format: format.combine(
    format.colorize(),
    durationFormat
  ),
});

class ElasticsearchTransport extends Transport {
  private esService: ElasticSearch;

  constructor() {
    super(...arguments);
    this.esService = ElasticSearch.getInstance();
  }

  log(context: any, callback: () => void) {
    setImmediate(() => this.emit('logged', context));

    // only log errors and warnings to Elasticsearch in production
    if (!isDev && (context.level === 'error' || context.level === 'warn')) {
      const stack = getStackTrace(context);
      const logData: LogData = {
        stack,
        message: context.message,
        service: context.service,
        level: context.level,
        uncaughtException: !!context.uncaughtException,
        uncaughtRejection: !!context.uncaughtRejection,
        customLog: (context.uncaughtException || context.uncaughtRejection) !== true,
        environment: context.environment,
        version: context.version,
        package: context.package,
        mode: context.mode,
        nodeVersion: context.nodeVersion,
        timestamp: timestamp(),
        fingerprints: {
          stack: hasher(context.stack),
          messageAndStack: hasher(`${context.message}${context.stack}`),
        }
      };
      this.esService.index.upsert('backend-logs', { records: [logData] })
        .then(() => callback())
        .catch((error) => {
          const firstItem = error?.context?.[0]?.items?.[0];
          console.error('Failed to log to Elasticsearch:', firstItem, error);
          callback();
        });
    } else {
      callback();
    }
  }
}

// Daily Rotate File transport
const fileRotateTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d', // keep logs for 7 days
});

const esTransport = new ElasticsearchTransport();

// Logger instance
const logger: Logger = createLogger({
  // log debug level and above in development; info level and above in production
  level: isDev ? 'debug' : 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    durationFormat
  ),
  defaultMeta: {
    service: '@backend',
    environment: 'node',
    version: env.npm_package_version ?? 'not present in process.env.npm_package_version',
    package: env.npm_package_name ?? 'not present in process.env.npm_package_name',
    mode: env.NODE_ENV ?? 'not present in process.env.NODE_ENV',
    nodeVersion: process.version,
  },
  transports: [
    fileRotateTransport,
    consoleTransport,
    esTransport,
  ],
  exceptionHandlers: [new transports.File({ filename: 'logs/exceptions.log' }), consoleTransport, esTransport],
  rejectionHandlers: [new transports.File({ filename: 'logs/rejections.log' }), consoleTransport, esTransport],
});

const customLogger = {
  error: (message: string, meta: Record<string, any> = {}) => {
    meta.stack = meta.stack ?? new Error().stack;
    logger.error(meta.message ?? message, meta);
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    meta.stack = meta.stack ?? new Error().stack;
    logger.warn(meta.message ?? message, meta);
  },
  info: (message: string, meta: Record<string, any> = {}) => {
    meta.stack = meta.stack ?? new Error().stack;
    logger.info(meta?.message ?? message, meta);
  },
  debug: (message: string, meta: Record<string, any> = {}) => {
    meta.stack = meta.stack ?? new Error().stack;
    logger.debug(meta?.message ?? message, meta);
  },
};

export default customLogger;


interface LogData {
  message: string;
  stack?: string;
  service?: string;
  level: string;
  environment: string;
  timestamp: string;
  version: string;
  package: string;
  mode: string;
  nodeVersion: string;
  fingerprints: {
    stack: string;
    messageAndStack: string;
  };
  uncaughtException?: boolean;
  uncaughtRejection?: boolean;
  customLog: boolean;
}