/**
 * Environment variable validation on startup
 * Ensures all required config is present before the server starts
 */

const REQUIRED_VARS = {
  PRODUCTION: [
    { name: 'MONGO_URI', message: 'MongoDB connection string is required' },
    { name: 'JWT_SECRET', message: 'JWT secret is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"' },
    { name: 'CLIENT_URL', message: 'Client URL is required for CORS' },
  ],
  DEVELOPMENT: [
    { name: 'MONGO_URI', message: 'MongoDB connection string is required' },
  ],
  ALL: [
    { name: 'PORT', message: 'Port is required', defaultValue: '5001' },
    { name: 'NODE_ENV', message: 'Environment is required', defaultValue: 'development' },
  ],
};

export function validateEnv() {
  const env = process.env.NODE_ENV || 'development';
  const missing = [];
  const warnings = [];

  // Check all-environment vars
  REQUIRED_VARS.ALL.forEach(({ name, message, defaultValue }) => {
    if (!process.env[name]) {
      if (defaultValue) {
        process.env[name] = defaultValue;
        warnings.push(`⚙️  ${name} not set, using default: ${defaultValue}`);
      } else {
        missing.push(`${name}: ${message}`);
      }
    }
  });

  // Check environment-specific vars
  const envSpecific = env === 'production' ? REQUIRED_VARS.PRODUCTION : REQUIRED_VARS.DEVELOPMENT;
  envSpecific.forEach(({ name, message }) => {
    if (!process.env[name]) {
      missing.push(`${name}: ${message}`);
    }
  });

  // Check JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      warnings.push('⚠️  JWT_SECRET is too short (min 32 chars). Generate a strong one for production.');
    }
    if (['secret', 'your_jwt_secret_here', 'change_me'].includes(process.env.JWT_SECRET)) {
      warnings.push('🚨 JWT_SECRET is using a weak/default value! This is a security risk.');
    }
  }

  // Check MONGO_URI has no placeholders
  if (process.env.MONGO_URI) {
    if (process.env.MONGO_URI.includes('<username>') || process.env.MONGO_URI.includes('<password>')) {
      warnings.push('🚨 MONGO_URI still contains placeholder values (<username>/<password>). Update with real credentials.');
    }
    if (!process.env.MONGO_URI.startsWith('mongodb')) {
      warnings.push('⚠️  MONGO_URI does not start with mongodb:// or mongodb+srv://');
    }
  }

  // Check for common insecure values
  if (process.env.JWT_SECRET === process.env.MONGO_URI) {
    warnings.push('🚨 JWT_SECRET and MONGO_URI should not be the same value!');
  }

  return { missing, warnings };
}

export function printEnvStatus() {
  const { missing, warnings } = validateEnv();

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(m => console.error(`   - ${m}`));
    console.error('\n   Please set these in your .env file or environment.\n');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    warnings.forEach(w => console.warn(`   ${w}`));
    console.warn('');
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }

  return missing.length === 0;
}

export default { validateEnv, printEnvStatus };