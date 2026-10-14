/**
 * Environment variable validation on startup using Zod
 * Ensures all required config and strong secrets are present before the server starts.
 * In production, weak secrets (< 32 chars or default dictionary values) or missing
 * essential vars immediately abort boot with process.exit(1).
 */
import { z } from 'zod';

const WEAK_SECRETS = new Set([
  'secret',
  'your_jwt_secret_here',
  'change_me',
  'password',
  '12345678',
  '1234567890',
  'findmedi',
  'findmedi_secret',
  'jwtsecret',
  'supersecret',
  'admin',
  'default',
]);

const baseEnvSchema = z.object({
  PORT: z.string().default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MongoDB connection string (MONGO_URI) is required'),
  JWT_SECRET: z.string().optional(),
  CLIENT_URL: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  COOKIE_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
});

const productionEnvSchema = baseEnvSchema.extend({
  MONGO_URI: z.string()
    .min(1, 'MongoDB connection string is required')
    .refine((val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'), {
      message: 'MONGO_URI must start with mongodb:// or mongodb+srv://',
    })
    .refine((val) => !val.includes('<username>') && !val.includes('<password>'), {
      message: 'MONGO_URI contains placeholder values (<username>/<password>)',
    }),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required in production' })
    .min(32, 'JWT_SECRET is too short (min 32 chars required in production)')
    .refine((val) => !WEAK_SECRETS.has(val.toLowerCase().trim()), {
      message: 'JWT_SECRET is using a weak or known default dictionary value',
    }),
  CLIENT_URL: z.string({ required_error: 'CLIENT_URL is required in production for CORS' })
    .url('CLIENT_URL must be a valid URL'),
  FRONTEND_URL: z.string({ required_error: 'FRONTEND_URL is required in production for Health-ID QR codes' })
    .url('FRONTEND_URL must be a valid URL')
    .refine((val) => !val.includes('localhost'), {
      message: 'FRONTEND_URL in production must not point to localhost',
    }),
});

/**
 * Validates environment variables according to NODE_ENV.
 * @param {Record<string, string|undefined>} [envObj=process.env]
 * @returns {{ ok: boolean, data?: any, errors: string[], warnings: string[] }}
 */
export function validateEnv(envObj = process.env) {
  const env = envObj.NODE_ENV || 'development';
  const schema = env === 'production' ? productionEnvSchema : baseEnvSchema;
  const warnings = [];
  const errors = [];

  const result = schema.safeParse(envObj);

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.push(`${issue.path.join('.') || 'ENV'}: ${issue.message}`);
    });
  }

  // Development warnings
  if (env !== 'production') {
    const jwtSecret = envObj.JWT_SECRET;
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        warnings.push('⚠️  JWT_SECRET is too short (min 32 chars). Generate a strong one for production.');
      }
      if (WEAK_SECRETS.has(jwtSecret.toLowerCase().trim())) {
        warnings.push('🚨 JWT_SECRET is using a weak/default value! This is a security risk.');
      }
    } else {
      warnings.push('⚠️  JWT_SECRET is not set in development. Authentication may use fallback or fail.');
    }

    if (envObj.MONGO_URI) {
      if (envObj.MONGO_URI.includes('<username>') || envObj.MONGO_URI.includes('<password>')) {
        warnings.push('🚨 MONGO_URI still contains placeholder values (<username>/<password>).');
      }
      if (!envObj.MONGO_URI.startsWith('mongodb')) {
        warnings.push('⚠️  MONGO_URI does not start with mongodb:// or mongodb+srv://');
      }
    }
  }

  // Common warning: identical secrets
  if (envObj.JWT_SECRET && envObj.MONGO_URI && envObj.JWT_SECRET === envObj.MONGO_URI) {
    warnings.push('🚨 JWT_SECRET and MONGO_URI should not be the same value!');
  }

  return {
    ok: errors.length === 0,
    data: result.success ? result.data : null,
    errors,
    warnings,
  };
}

/**
 * Prints environment validation status and optionally exits on failure in production.
 * @param {object} [options]
 * @param {Record<string, string|undefined>} [options.envObj=process.env]
 * @param {boolean} [options.exitOnFailure]
 * @returns {boolean}
 */
export function printEnvStatus({ envObj = process.env, exitOnFailure } = {}) {
  const { ok, errors, warnings } = validateEnv(envObj);
  const isProd = (envObj.NODE_ENV || process.env.NODE_ENV) === 'production';
  const shouldExit = exitOnFailure !== undefined ? exitOnFailure : isProd;

  if (errors.length > 0) {
    console.error('\n❌ Environment Configuration Validation Failed:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\n   Please set valid values in your .env file or environment.\n');
    if (shouldExit) {
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    warnings.forEach((w) => console.warn(`   ${w}`));
    console.warn('');
  }

  if (ok && warnings.length === 0) {
    console.log('✅ Environment configuration validated successfully (Zod boot-schema)');
  }

  return ok;
}

export default { validateEnv, printEnvStatus };