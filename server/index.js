import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import xss from 'xss';
import logger from './config/logger.js';
import { configureMongoDns } from './config/mongoDns.js';
import { validateEnv, printEnvStatus } from './config/envValidator.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { csrfProtection, setCsrfToken } from './middleware/csrf.js';
import { initSocket } from './services/socketService.js';

const app = express();
configureMongoDns();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com", "https://basemaps.cartocdn.com", "https://api.maptiler.com", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://api.maptiler.com", "https://api.openrouteservice.org", "https://api.open-elevation.com"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'no-referrer' },
}));

// MongoDB injection protection
app.use(mongoSanitize());

// XSS protection - recursive sanitization for nested objects
function sanitizeValue(value) {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
});

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 100,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { message: 'Too many OTP requests, please wait 10 minutes.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { message: 'Too many password reset requests, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  logger.warn('Rate limiting is using in-memory store. Set REDIS_URL for shared rate limiting across multiple instances.');
}

// CSRF protection (active when cookie-based auth is used)
if (process.env.NODE_ENV === 'production') {
  logger.info('CSRF protection is enabled via double-submit cookie pattern + Origin validation.');
}

// Environment validation
validateEnv();
printEnvStatus();

const redactMongoUri = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

// Load MONGO_URI with environment fallback
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

// Check if URI contains placeholders and warn
if (MONGO_URI.includes('<username>') || MONGO_URI.includes('<password>')) {
  logger.warn('⚠️  MONGO_URI appears to contain placeholders. Please set your actual MongoDB Atlas connection string.');
}

// Parse URI to ensure database name is present
if (MONGO_URI.startsWith('mongodb')) {
  try {
    const url = new URL(MONGO_URI);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/medicore';
      MONGO_URI = url.toString();
    }
  } catch (e) {
    logger.warn('⚠️ Could not parse MONGO_URI, using as-is');
  }
}

// Middleware
const corsOptions = {
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// In production, restrict origins. In development, allow all.
if (process.env.NODE_ENV === 'production') {
  const allowedOrigins = [
    // 'https://medicore.example.com', // placeholder — rely on CLIENT_URL / CORS_ORIGIN env vars
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
  ].filter(Boolean);
  if (allowedOrigins.length === 0) {
    logger.error('CORS: No allowed origins configured for production. Set CLIENT_URL or CORS_ORIGIN env vars.');
  }
  corsOptions.origin = allowedOrigins;
} else {
  corsOptions.origin = true; // Allow all in development
}

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
// CSRF protection for state-changing requests (POST/PUT/DELETE)
app.use('/api', csrfProtection);
// CSRF token endpoint (must be before auth routes to allow anonymous access)
app.get('/api/auth/csrf-token', setCsrfToken);
// Serve uploaded files with filename-based access control
app.use('/uploads', (req, res, next) => {
  // Authenticated access only for medical files (check cookie or Authorization header)
  const hasAuth = req.cookies?.token || req.headers.authorization;
  if (req.path.match(/\.(pdf|dcm|dicom|jpg|jpeg|png|gif)$/i) && !hasAuth) {
    return res.status(401).json({ message: 'Authentication required for medical file access' });
  }
  next();
}, express.static(path.join(__dirname, 'public/uploads')));

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import doctorRoutes from './routes/doctors.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import recordRoutes from './routes/records.js';
import billingRoutes from './routes/billing.js';
import dashboardRoutes from './routes/dashboard.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/upload.js';
import emergencyRoutes from './routes/emergency.js';
import departmentRoutes from './routes/departments.js';
import paymentRoutes from './routes/payments.js';
import transactionRoutes from './routes/transactions.js';
import labRoutes from './routes/lab.js';
import pharmacyRoutes from './routes/pharmacy.js';
import ipdRoutes from './routes/ipd.js';
import triageRoutes from './routes/triage.js';
import radiologyRoutes from './routes/radiology.js';
import insuranceRoutes from './routes/insurance.js';
import dietRoutes from './routes/diet.js';
import otRoutes from './routes/ot.js';
import bloodbankRoutes from './routes/bloodbank.js';
import physioRoutes from './routes/physio.js';
import mentalhealthRoutes from './routes/mentalhealth.js';
import staffRoutes from './routes/staff.js';
import inventoryRoutes from './routes/inventory.js';
import housekeepingRoutes from './routes/housekeeping.js';
import tokenRoutes from './routes/tokens.js';
import nursingRoutes from './routes/nursing.js';
import bedRoutes from './routes/beds.js';
import testRoutes from './routes/tests.js';
import hospitalRoutes from './routes/hospitals.js';
import facilityRoutes from './routes/facilities.js';
import clinicRoutes from './routes/clinics.js';
import platformRoutes from './routes/platform.js';
import twoFactorRoutes from './routes/twoFactor.js';
import patientPortalRoutes from './routes/patient.js';
import auditLogRoutes from './routes/auditLogs.js';
import reviewModerationRoutes from './routes/reviewModeration.js';
import systemSettingRoutes from './routes/systemSettings.js';
import commissionRoutes from './routes/commission.js';
import disputeRoutes from './routes/disputes.js';
import supportTicketRoutes from './routes/supportTickets.js';
import leaveRequestRoutes from './routes/leaveRequests.js';
import categoryRoutes from './routes/categories.js';
import licenseRoutes from './routes/licenses.js';
import announcementRoutes from './routes/announcements.js';
import broadcastRoutes from './routes/broadcast.js';
import platformCouponRoutes from './routes/platformCoupons.js';
import featuredListingRoutes from './routes/featuredListings.js';
import cityRoutes from './routes/cities.js';
import platformContentRoutes from './routes/platformContent.js';
import exportRoutes from './routes/export.js';
import integrationRoutes from './routes/integrations.js';
import deliveryPartnerRoutes from './routes/deliveryPartners.js';
import { connectRedis } from './config/redis.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/bloodbank', bloodbankRoutes);
app.use('/api/physio', physioRoutes);
app.use('/api/mentalhealth', mentalhealthRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/nursing', nursingRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/patient', patientPortalRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reviews/moderation', reviewModerationRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/platform-coupons', platformCouponRoutes);
app.use('/api/featured-listings', featuredListingRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/platform-content', platformContentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/delivery-partners', deliveryPartnerRoutes);

// 2FA routes
app.use('/api/auth/2fa', twoFactorRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
 
// 404 handler for unknown routes
app.use(notFound);

// Centralized error handler (must be last)
app.use(errorHandler);

// Connect & start
const PORT = process.env.PORT || 5001;
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  bufferCommands: false
};

logger.info('🔄 Attempting MongoDB connection...');
logger.info('   URI: ' + redactMongoUri(MONGO_URI));

if (process.env.NODE_ENV !== 'test') {
  const server = http.createServer(app);
  initSocket(server);
  if (process.env.REDIS_URL) {
    connectRedis().catch((err) => logger.error(`Redis connection failed: ${err.message}`));
  }
  mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => {
      logger.info('✅ MongoDB connected successfully');
      server.listen(PORT, () => {
        const serverUrl = `http://localhost:${PORT}`;
        logger.info(`🚀 Server running on ${serverUrl}`);
        logger.info(`📡 Health check: ${serverUrl}/api/health`);
      });
    })
    .catch(err => {
      logger.error('❌ MongoDB connection error: ' + err.message);
      logger.error('   Error code: ' + err.code);
      logger.error('   Error name: ' + err.name);
      logger.error('   Full URI used (redacted): ' + redactMongoUri(MONGO_URI));
      if (process.env.NODE_ENV !== 'production') {
        logger.error('   Stack trace: ' + err.stack);
      }
      process.exit(1);
    });

  mongoose.connection.on('connected', async () => {
    logger.info('✅ Mongoose connected to MongoDB');
    try {
      const Appointment = (await import('./models/Appointment.js')).default;
      const Payment = (await import('./models/Payment.js')).default;
      await Appointment.syncIndexes();
      await Payment.syncIndexes();
      logger.info('✅ Database indexes synced');
    } catch (e) {
      logger.error('⚠️ Failed to sync indexes: ' + e.message);
    }
  });

  mongoose.connection.on('error', (err) => {
    logger.error('❌ Mongoose connection error: ' + err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ Mongoose disconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('📦 MongoDB connection closed');
    process.exit(0);
  });
}

export default app;
