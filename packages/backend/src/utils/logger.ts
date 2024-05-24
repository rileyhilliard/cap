import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import util from 'util';
// import { isDev } from '@utils/helpers';
// TODO: should the console be suppressed in prod mode?
// I imagine prod should transport these to an actual log file
// or something like sentry . . . 
const isDev = true;

let lastTimestamp = Date.now();

const durationFormat = format.printf(info => {
  const now = Date.now();
  const durationMs = now - lastTimestamp;
  // console.log(`${info.message} durationMs: `, durationMs);
  lastTimestamp = now;
  const _d = new Date(lastTimestamp);

  const formattedTimestamp = _d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
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
  const argsString = args.map((arg: unknown) =>
    typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : arg
  ).join(' ');

  return `${formattedDuration} | ${formattedTimestamp} [${info.level}]: ${info.message} ${argsString}`;
});


const cleanStackTrace = (stack?: string) => {
  if (!stack) return '';

  // Replace absolute paths with relative ones
  const cwd = process.cwd();
  return stack.split('\n').map(line => line.replace(cwd, '')).join('\n');
};

// Console transport
const consoleTransport: transports.ConsoleTransportInstance = new transports.Console({
  format: format.combine(
    format.colorize(),
    durationFormat
  )
});

// Daily Rotate File transport
const fileRotateTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'  // keep logs for 14 days
});

// Logger instance
const logger: Logger = createLogger({
  level: isDev ? 'debug' : 'info',
  // format: format.combine(
  //   format.errors({ stack: true }),
  //   format.splat(),
  //   format.json(),
  //   durationFormat
  // ),
  defaultMeta: { service: '@backend' },
  transports: [
    fileRotateTransport,
    ...(isDev ? [consoleTransport] : [])
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
    ...(isDev ? [consoleTransport] : [])
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
    ...(isDev ? [consoleTransport] : [])
  ],
});

export default logger;
