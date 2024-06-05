import Transport from 'winston-transport';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import util from 'util';
import ElasticSearch from '@utils/elastic-search';
import { timestamp, hasher, isDev } from '@utils/helpers';

const { env } = process;

let lastTimestamp = Date.now();

const durationFormat = format.printf((info) => {
  const now = Date.now();
  const durationMs = now - lastTimestamp;
  // console.log(`${info.message} durationMs: `, durationMs);
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

  const args = info[Symbol.for('splat')] || [];
  const argsString = args
    .map((arg: unknown) => (typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : arg))
    .join(' ');

  return `${formattedDuration} | ${formattedTimestamp} [${info.level}]: ${info.message} ${argsString}`;
});

function removeLines(stack?: string, num: number = 2): string {
  if (!stack) return '';
  return stack.split('\n').slice(num).join('\n');
}

function cleanStackTrace(stack?: string): string {
  if (!stack) return '';
  const cwd = process.cwd();
  return stack
    .split('\n')
    .map((line) => line.replace(cwd, '').trim().replace(/\(.*\/node_modules\//, '(/node_modules/'))
    .join('\n');
}

function getStackTrace(meta: Record<string, any>): string {
  return meta.stack
    ? removeLines(cleanStackTrace(meta.stack), 1)
    : removeLines(cleanStackTrace(new Error().stack), 2);
}

// Console transport
const consoleTransport: transports.ConsoleTransportInstance = new transports.Console({
  format: format.combine(format.colorize(), durationFormat),
});

class ElasticsearchTransport extends Transport {
  private esService: ElasticSearch;

  constructor() {
    super(...arguments);
    this.esService = ElasticSearch.getInstance();
  }

  log(context: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', context);
    });

    if (!isDev && (context.level === 'error' || context.level === 'warn')) {
      const logData: LogData = {
        message: context.message,
        stack: context.stack,
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
    const stack = getStackTrace(meta);
    logger.error(meta.message ?? message, { ...meta, stack });
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    const stack = getStackTrace(meta);
    logger.warn(meta.message ?? message, { ...meta, stack });
  },
  info: (message: string, meta: Record<string, any> = {}) => {
    logger.info(meta.message ?? message, { ...meta });
  },
  debug: (message: string, meta: Record<string, any> = {}) => {
    logger.debug(meta.message ?? message, { ...meta });
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