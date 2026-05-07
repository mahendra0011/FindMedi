import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const app = express();
const PORT = process.env.PORT || 5001;

// Build proper MongoDB URI with database name
let MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  // Parse URI to ensure database name is present
  try {
    const url = new URL(MONGO_URI);
    // If pathname is empty or just '/', add '/medicore'
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/medicore';
      MONGO_URI = url.toString();
    }
  } catch (e) {
    console.warn('⚠️ Could not parse MONGO_URI, using as-is');
  }
} else {
  MONGO_URI = 'mongodb://localhost:27017/medicore';
}

console.log('🔍 Environment check:', {
  PORT,
  MONGO_URI: MONGO_URI ? 'set' : 'NOT SET',
  SMTP_USER: process.env.SMTP_USER ? 'set' : 'NOT SET',
  SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'NOT SET',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  CLIENT_URL: process.env.CLIENT_URL || 'NOT SET'
});

// Middleware
const corsOptions = {
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// In production, restrict origins. In development, allow all.
if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = [
    process.env.CLIENT_URL,
    'https://medicore-main-1.onrender.com'
  ].filter(Boolean);
} else {
  corsOptions.origin = true; // Allow all in development
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
const mongooseOptions = {
  // New URL parser and unified topology
  maxPoolSize: 10, // Maximum number of sockets in the pool
  serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

console.log('🔄 Attempting MongoDB connection...');
console.log('   URI (first 50 chars):', MONGO_URI.substring(0, 50) + '...');

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
    console.error('   Full URI used (redacted):', MONGO_URI.replace(/\/\/([^:]+):([^@]+)/, '//***:***'));
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

