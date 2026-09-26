import pino from 'pino';
import fs from 'fs';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

const logDir = path.resolve('logs');
if (isProd && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Prod: JSON to rotating files. Dev: JSON to stdout (structured, Sentry/Datadog-ready).
const targets = isProd
  ? [
      { target: 'pino/file', options: { destination: 'logs/combined.log' }, level: 'info' },
      { target: 'pino/file', options: { destination: 'logs/error.log' }, level: 'error' },
    ]
  : [{ target: 'pino/file', options: { destination: 1 }, level: process.env.LOG_LEVEL || 'info' }];

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'findmedi-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.transport({ targets })
);

export default logger;
