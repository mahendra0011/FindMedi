import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { configureMongoDns } from './config/mongoDns.js';

const app = express();
configureMongoDns();

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
import uploadRoutes from './routes/upload.js';
import emergencyRoutes from './routes/emergency.js';

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
