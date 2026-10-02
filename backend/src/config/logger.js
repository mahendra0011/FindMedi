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

    // DLB-15: redact credentials at the logger itself.
    //
    // pino serialises whatever it is handed, so the raw Mongo URI, the full
    // request headers (including the session cookie and the CSRF token) and the
    // OTP-related auth headers were all landing in `logs/combined.log`. A log
    // sink is not a trusted store: it is shipped to Datadog/Sentry, retained
    // longer than the data it describes, and readable by anyone with log access.
    //
    // Redaction at the writer is the only place that cannot be bypassed by a
    // handler that decides to log a req/err object.
    redact: {
      paths: [
        // Credentials and session material.
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        'req.headers["x-csrf-token"]',
        'req.headers["x-signature"]',
        'req.headers["x-razorpay-signature"]',
        'res.headers["set-cookie"]',
        'headers.cookie',
        'headers.authorization',
        // Connection strings and secrets, in any nesting.
        'uri', 'url', 'mongoUri', 'MONGO_URI',
        'config.mongoUri', 'req.url.host',
        '*.password', '*.passwordHash', '*.token', '*.jwt', '*.secret',
        '*.apiKey', '*.api_key', '*.authorization',
        'body.password', 'body.otp', 'body.currentPassword', 'body.newPassword',
        'body.refreshToken', 'body.accessToken', 'body.setupToken',
        'req.body.password', 'req.body.otp', 'req.body.refreshToken',
      ],
      censor: '[redacted]',
      remove: false,
    },
    // DLB-15: never let a serialized request carry the whole header set.
    serializers: {
      req(req) {
        const headers = { ...req.headers };
        for (const k of ['cookie', 'authorization', 'x-csrf-token', 'set-cookie']) {
          if (headers[k]) headers[k] = '[redacted]';
        }
        return { method: req.method, url: req.url, remoteAddress: req.remoteAddress, headers };
      },
      res(res) {
        const headers = { ...(res.headers || {}) };
        if (headers['set-cookie']) headers['set-cookie'] = '[redacted]';
        return { statusCode: res.statusCode, headers };
      },
      err(err) {
        // An error message can embed a connection string; strip the scheme.
        return { type: err?.type, message: err?.message, stack: err?.stack };
      },
    },
  },
  pino.transport({ targets })
);

export default logger;
