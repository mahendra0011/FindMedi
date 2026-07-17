import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import { configureMongoDns } from './config/mongoDns.js';

const app = express();
configureMongoDns();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'no-referrer' },
}));

// MongoDB injection protection
app.use(mongoSanitize());

// XSS protection
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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

const redactMongoUri = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

console.log('🔍 Environment check:', {
  PORT: process.env.PORT || 'not set',
  MONGO_URI: process.env.MONGO_URI ? 'set' : 'NOT SET',
  BREVO_API_KEY: process.env.BREVO_API_KEY ? 'set' : 'NOT SET',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'mahendrapra0077@gmail.com',
  CLIENT_URL: process.env.CLIENT_URL || 'NOT SET',
  NODE_ENV: process.env.NODE_ENV || 'development'
});

// Load MONGO_URI with environment fallback
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

// Check if URI contains placeholders and warn
if (MONGO_URI.includes('<username>') || MONGO_URI.includes('<password>')) {
  console.warn('⚠️  MONGO_URI appears to contain placeholders. Please set your actual MongoDB Atlas connection string.');
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
    console.warn('⚠️ Could not parse MONGO_URI, using as-is');
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
  const allowedOrigins = [];
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }
  // Add the production frontend URL
  allowedOrigins.push('https://medicore-main-1.onrender.com');
  corsOptions.origin = allowedOrigins.filter(Boolean);
} else {
  corsOptions.origin = true; // Allow all in development
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
import Report from './models/Report.js';
import uploadRoutes from './routes/upload.js';
import emergencyRoutes from './routes/emergency.js';
import departmentRoutes from './routes/departments.js';
import paymentRoutes from './routes/payments.js';
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
import patientPortalRoutes from './routes/patient.js';

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
app.use('/api/patient', patientPortalRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// Connect & start
const PORT = process.env.PORT || 5001;
const mongooseOptions = {
  // New URL parser and unified topology
  maxPoolSize: 10, // Maximum number of sockets in the pool
  serverSelectionTimeoutMS: 30000, // Keep trying to connect for 30 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  // Fail fast if not connected, don't buffer commands
  bufferCommands: false
};

console.log('🔄 Attempting MongoDB connection...');
console.log('   URI:', redactMongoUri(MONGO_URI));

mongoose.connect(MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => {
      const serverUrl = `http://localhost:${PORT}`;
      console.log(`🚀 Server running on ${serverUrl}`);
      console.log(`📡 Health check: ${serverUrl}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error name:', err.name);
    console.error('   Full URI used (redacted):', redactMongoUri(MONGO_URI));
    // Log stack trace in development only
    if (process.env.NODE_ENV !== 'production') {
      console.error('   Stack trace:', err.stack);
    }
    process.exit(1);
  });

// Handle connection events for better debugging
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📦 MongoDB connection closed');
  process.exit(0);
});
// 13
