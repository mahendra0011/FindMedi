import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Snapshot the operator-supplied environment BEFORE .env is merged in, so the
// secrets-file step below can tell "injected by the platform" apart from
// "left over in a developer's .env" (precedence: platform > secrets file > .env).
const platformEnvKeys = new Set(Object.keys(process.env));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Optional external secrets injection (Phase 8): if SECRETS_FILE points at a
// KEY=VALUE file rendered by Doppler / Vault Agent / AWS Secrets Manager
// (`doppler secrets render --format env > secrets.env`), its values are
// overlaid on top of .env — real secrets win over local dev defaults without
// any provider-specific SDK in the codebase. Parsing rules live in
// utils/secretsFile.js (unit-tested in test/secretsFile.test.js).
if (process.env.SECRETS_FILE) {
  try {
    const { applySecretsFile } = await import('./utils/secretsFile.js');
    const { applied, skipped } = applySecretsFile(
      process.env.SECRETS_FILE,
      platformEnvKeys,
    );
    // Lazy import to avoid a cycle with config/logger at boot time.
    (await import('./config/logger.js')).default.info(
      `Loaded ${applied} secrets from SECRETS_FILE (${skipped} left to the platform environment)`,
    );
  } catch (err) {
    // A broken secrets file must not silently boot with missing config:
    // envValidator below is the second line of defence, but say what happened.
    console.error(`SECRETS_FILE load failed: ${err.message}`);
  }
}

import { initFeatureFlags, initPostHog } from './services/featureFlags.js';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { buildCorsOptions } from './config/cors.js';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
// §4.5/§4.6: extra NoSQL-injection layer + unknown filter fields ignored.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);
// P1-5: HTTP Parameter Pollution -- collapses duplicate keys so
// ` ?sort=asc&sort[]=desc ` cannot bypass a sort-field allowlist or trigger an
// unexpected array inside a handler that expects a string.
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import sanitizeHtml from 'sanitize-html';
import logger from './config/logger.js';
import { configureMongoDns } from './config/mongoDns.js';
import { getPipelineHealth } from './services/dataPipelineHealth.js';
import { validateEnv, printEnvStatus } from './config/envValidator.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { protect, superadminOnly } from './middleware/auth.js';
import { verifyAccessToken } from './utils/jwtKeys.js';
import { readAuthCookie } from './lib/cookiePolicy.js';
import { csrfProtection, setCsrfToken } from './middleware/csrf.js';
import { initSocket } from './services/socketService.js';
// INF-M-02: Prometheus metrics (registry + HTTP instrumentation) and the
// token-guarded scrape route mounted at the app root.
import { metricsMiddleware, startProcessMetrics } from './lib/metrics.js';
import { opsHealthMiddleware } from './services/opsHealthService.js';
import metricsRoutes from './routes/metrics.js';

const app = express();
configureMongoDns();

// Sentry error tracking (env-gated: no SENTRY_DSN = no-op, zero overhead)
// §6.4: scrub PII/PHI before it leaves the process — cookies, auth headers,
// request bodies (OTP/password/PHI) and query strings (tokens/PHI in access logs).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
    beforeSend(event) {
      try {
        if (event.request) {
          delete event.request.cookies;
          delete event.request.data;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['x-csrf-token'];
            delete event.request.headers['x-api-key'];
          }
          if (typeof event.request.url === 'string') {
            event.request.url = event.request.url.split('?')[0];
          }
        }
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
          delete event.user.username;
        }
        if (Array.isArray(event.breadcrumbs)) {
          for (const crumb of event.breadcrumbs) {
            if (crumb?.data?.url && typeof crumb.data.url === 'string') {
              crumb.data.url = crumb.data.url.split('?')[0];
            }
            if (crumb?.data) {
              delete crumb.data.request_body;
              delete crumb.data.response_body;
            }
          }
        }
      } catch { /* scrubbing must never drop the event */ }
      return event;
    },
  });
}
// Database target: medicore

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Google Sign-In loads its helper from accounts.google.com (index.html).
      scriptSrc: ["'self'", "https://accounts.google.com"],
      // index.css @imports Google Fonts; Tailwind + React inline styles need
      // 'unsafe-inline' (style-src, not script-src).
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      // Images arrive from many hosts (Cloudinary, CMS content, chat
      // attachments, map styles, avatars) — https: scheme covers them without
      // allowing data: exfil beyond what img-src already permits.
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      // Audio/video: bundled sounds (self), MediaRecorder blobs, remote files.
      mediaSrc: ["'self'", "data:", "blob:", "https:"],
      // Google Sign-In renders a hidden iframe; the resource hub embeds
      // YouTube videos.
      frameSrc: ["'self'", "https://accounts.google.com", "https://www.youtube.com"],
      // Workers: Vite bundles, PostHog session-recording blobs.
      workerSrc: ["'self'", "blob:"],
      // 'self' covers same-origin socket.io; the built SPA calls the API on
      // its configured origin (findmedi-main.onrender.com) which can differ
      // from the page origin. MapLibre fetches styles/tiles/glyphs via XHR,
      // chat previews fetch attachment URLs, translate + nominatim are called
      // directly from the client.
      connectSrc: [
        "'self'",
        "wss://findmedi-main.onrender.com",
        "https://findmedi-main.onrender.com",
        "https://api.maptiler.com",
        "https://api.open-elevation.com",
        "https://tiles.openfreemap.org",
        "https://demotiles.maplibre.org",
        "https://tile.openstreetmap.org",
        "https://*.tile.openstreetmap.org",
        "https://basemaps.cartocdn.com",
        "https://nominatim.openstreetmap.org",
        "https://translate.googleapis.com",
        "https://accounts.google.com",
        "https://res.cloudinary.com",
        "https://app.posthog.com",
        "https://*.posthog.com",
      ],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'no-referrer' },
}));

// HTTP request logging (structured JSON via Pino)
// §6.2: log method + path only — never query strings (tokens/PHI) or bodies.
app.use(pinoHttp({
  logger,
  customProps: () => ({}),
  serializers: {
    req(req) {
      const rawUrl = req.raw?.url || req.url || '';
      return {
        method: req.method,
        url: String(rawUrl).split('?')[0],
        remoteAddress: req.remoteAddress,
      };
    },
  },
}));

// §5.13/§8.1: private API responses must never sit in a browser, CDN or proxy
// cache — PHI replay past revocation, back-button/bfcache exposure, web-cache
// deception. Public auth-issuer metadata stays cacheable.
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/auth/csrf-token') return next();
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  next();
});

// INF-M-02: count every response once, after logging so /metrics itself and
// rate-limited requests are all observed by the same instruments.
app.use(metricsMiddleware);
// ADM-M-05: separate response tracker feeding the ops-health error-rate window.
// Deliberately NOT folded into metrics.js - the Prometheus counters are the
// machine-facing time series, this is the 5-minute window the dashboard widget
// reads, and neither should be able to break the other.
app.use(opsHealthMiddleware);

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
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests, please try again later.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many OTP verification attempts, please try again later.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset attempts, please try again later.' },
});

const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many token refresh requests, please try again later.' },
});

// AUTH-004: behind nginx/Render/Cloudflare, req.ip is the proxy without this — every
// IP-keyed limiter and audit row would collapse to one address.
// Allows TRUST_PROXY env configuration (e.g. 2 for Cloudflare + Render LB, 1 for single proxy).
const trustProxySetting = process.env.TRUST_PROXY
  ? (!isNaN(Number(process.env.TRUST_PROXY)) ? parseInt(process.env.TRUST_PROXY, 10) : process.env.TRUST_PROXY)
  : 1;
app.set('trust proxy', trustProxySetting);

// AUTH-005: normalize /auth/login → /api/auth/login BEFORE the limiters run,
// otherwise prefix-less URLs skip every limiter and only get rewritten later.
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads') && req.url !== '/' && req.url !== '/favicon.ico') {
    const knownApiPrefixes = [
      '/auth', '/analytics', '/users', '/doctors', '/patients', '/appointments',
      '/records', '/billing', '/dashboard', '/reviews', '/notifications', '/reports',
      '/upload', '/emergency', '/departments', '/payments', '/transactions', '/lab',
      '/pharmacy', '/ipd', '/triage', '/radiology', '/insurance', '/diet', '/ot',
      '/bloodbank', '/physio', '/mentalhealth', '/staff', '/inventory', '/housekeeping',
      '/tokens', '/nursing', '/beds', '/tests', '/hospitals', '/facilities', '/clinics',
      '/platform', '/patient', '/audit-logs', '/system-settings', '/tenant-quotas', '/commission',
      '/disputes', '/support-tickets', '/leave-requests', '/schedule-change-requests',
      '/categories', '/licenses', '/announcements', '/broadcast', '/platform-coupons',
      '/featured-listings', '/cities', '/platform-content', '/export', '/integrations',
      '/delivery-partners', '/delivery-boy', '/delivery', '/ai-chat', '/drive', '/calls', '/health'
    ];
    if (knownApiPrefixes.some(p => req.url.startsWith(p))) {
      req.url = `/api${req.url}`;
    }
  }
  next();
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpVerifyLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/refresh', tokenRefreshLimiter);

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

// DP-B-01: `assertOpenSearchAuth()` was EXPORTED but never called, so the
// guarantee it documents was theoretical. An anonymous `GET /_search` against a
// security-plugin-enabled cluster returns full EHR documents and the audit
// trail, and nothing in the boot path noticed.
//
// It runs here, beside `validateEnv()`, because it is the same class of check: a
// configuration state that must fail BEFORE the process serves traffic, not a
// warning logged later. In production it throws, which aborts boot — the correct
// outcome, since an index of medical records must not be reachable anonymously.
//
// Deliberately not wrapped in a catch-and-ignore: swallowing it would restore the
// exact defect being fixed.
try {
  const { assertOpenSearchAuth, assertEhrPseudonymSalt } = await import('./services/opensearchIndexer.js');
  const verdict = assertOpenSearchAuth();
  assertEhrPseudonymSalt();
  if (verdict.skipped === 'unconfigured') {
    logger.info('OpenSearch not configured - search falls back to MongoDB queries.');
  } else if (verdict.warning) {
    logger.warn(`DP-B-01: ${verdict.warning}. Set OPENSEARCH_USERNAME/OPENSEARCH_PASSWORD.`);
  } else {
    logger.info('OpenSearch security plugin: authenticated access confirmed.');
  }
} catch (err) {
  logger.error(`DP-B-01: OpenSearch auth assertion failed - refusing to start. ${err.message}`);
  throw err;
}

// AUTH-B-06: never log the connection string itself. Only the *shape* is
// operational information an on-call engineer needs; the host, cluster name and
// database name are infrastructure details that must not land in log sinks.
const mongoTargetSummary = (uri) => {
  try {
    const parsed = new URL(String(uri).replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    return {
      scheme: uri.startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb',
      db: parsed.pathname?.replace(/^\//, '') || '(default)',
    };
  } catch {
    return { scheme: 'mongodb', db: '(unparsed)' };
  }
};

const redactMongoUri = (uri) => {
  const { scheme, db } = mongoTargetSummary(uri);
  return `${scheme}://<redacted-host>/${db}`;
};

// Load MONGO_URI with environment fallback
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

// Check if URI contains placeholders and warn
if (MONGO_URI.includes('<username>') || MONGO_URI.includes('<password>')) {
  logger.warn('⚠️  MONGO_URI appears to contain placeholders. Please set your actual MongoDB Atlas connection string.');
}

// Parse URI to ensure database name is present
if (MONGO_URI.startsWith('mongodb')) {
  try {
    const url = new URL(MONGO_URI);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/findmedi';
      MONGO_URI = url.toString();
    }
  } catch (e) {
    logger.warn('⚠️ Could not parse MONGO_URI, using as-is');
  }
}

// MIND-B-03: the CORS policy now lives in ONE place — `src/config/cors.js` —
// which `mindsupport/src/app.js` also imports. The two copies had drifted, and
// the drift was exploitable: this file matched origins exactly, while mindsupport
// compared hostname+port and treated a configured `*` as "allow everything", so
// `CORS_ORIGIN=*` opened one app to every origin while leaving the other closed.
const corsOptions = buildCorsOptions({
  onBlocked: (message, decision) => logger.warn(`${message} (${decision.reason})`),
});

app.use(cors(corsOptions));
app.use(cookieParser());
// PAY-B-13: the webhook router is mounted BEFORE the global JSON body parser so
// the RAW body survives for HMAC verification (express.json() would otherwise
// consume it, making every signature check fail).
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes);
// File 16 §16.2: gateway webhooks need the same raw-body treatment for HMAC.
app.use('/api/checkout/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
// File 22 P1-27: telephony provider webhooks are HMAC'd over raw bytes too.
app.use('/api/contact-center/telephony/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

// CHAT-M-02: /api/chat/upload receives base64-encoded files up to 25MB (~34MB
// of base64 text), which the global 1mb JSON cap silently rejected with 413 —
// the documented 25MB chat limit was unreachable in practice. Scope a larger
// parser to that ONE path (method+path matched, so no other route grows its
// body limit); every other JSON request keeps the 1mb abuse/DoS guard.
const jsonBody = express.json({ limit: '1mb' });
const jsonChatUploadBody = express.json({ limit: '36mb' });
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/chat/upload') {
    return jsonChatUploadBody(req, res, next);
  }
  return jsonBody(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// AUTH-B-14: body sanitizers MUST run AFTER the body parsers — mounted
// earlier they saw `req.body === undefined` for JSON requests, so no JSON
// body was ever sanitized (and the query/params sanitising still applies).
// MongoDB injection protection
app.use(mongoSanitize());

// P1-5: HTTP Parameter Pollution â€” the `hpp` package collapses duplicate
// query/body keys to the last scalar value, running after mongoSanitize.
app.use(hpp());

// XSS protection - recursive sanitization for nested objects (strips all HTML tags/attrs)
function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
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
  // AUTH-022: multipart bodies are file buffers + text fields validated by
  // multer/zod — running the HTML stripper over them corrupts uploads, so the
  // sanitizer covers JSON/urlencoded bodies only.
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) return next();
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


// (Prefix normalization runs above, before the rate limiters — AUTH-005.)

// CSRF protection for state-changing requests (POST/PUT/DELETE)
app.use('/api', csrfProtection);
// CSRF token endpoint (must be before auth routes to allow anonymous access)
app.get('/api/auth/csrf-token', setCsrfToken);
app.get('/auth/csrf-token', setCsrfToken);
// Serve uploaded files behind REAL access control (AUTH-029, DLB-12, DLB-21).
//
// Before: the gate only ran for a short extension allow-list
// (pdf/dcm/jpg/...) and merely required *a* valid JWT. Any other file
// (doc/docx/svg/txt/csv/xls/zip/...) was served to ANONYMOUS callers, and a
// logged-in user of any role could read every patient's document/report/chat
// file by guessing the path.
//
// Now: EVERY file needs a valid session, and the directory decides the
// additional ownership rule — medical documents / reports / call recordings
// need a Record or ChatConversation link plus ownership, chat attachments need
// conversation membership, avatars/images may be read by any signed-in user.
import User from './models/User.js';
import Record from './models/Record.js';
import ChatMessage from './models/ChatMessage.js';
import ChatConversation from './models/ChatConversation.js';

const SENSITIVE_UPLOAD_DIRS = new Set(['documents', 'reports', 'call-recordings']);
const CHAT_UPLOAD_DIRS = new Set(['chat']);

const userCanReadRecord = (user, record) => {
  if (!record) return false;
  if (user.role === 'superadmin') return true;
  if (user.role === 'hospital_admin') {
    return Boolean(user.hospitalId && record.hospitalId && record.hospitalId.toString() === user.hospitalId.toString());
  }
  if (['doctor', 'clinic_doctor', 'counsellor', 'psychiatrist'].includes(user.role)) {
    const own = (user.doctorProfileId || user._id)?.toString();
    return Boolean(record.doctorId && own && record.doctorId.toString() === own);
  }
  if (user.role === 'patient') {
    return Boolean(record.patientId && record.patientId.toString() === user._id.toString());
  }
  return false;
};

app.use('/uploads', async (req, res, next) => {
  // 1. Always require a real session (no extension allow-list any more).
  let user = null;
  try {
    const token = readAuthCookie(req.cookies, 'token')
      || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ message: 'Authentication required for file access' });
    // AUTH-F-01: jwtKeys, not bare JWT_SECRET (rotatable keys + refresh-as-
    // access rejection), matching `protect` exactly.
    const decoded = verifyAccessToken(token);
    user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Authentication required for file access' });
    if ((decoded.tv ?? 0) !== (user.tokenVersion || 0) || user.status === 'blocked') {
      return res.status(403).json({ message: 'Session is not valid for file access' });
    }
  } catch {
    return res.status(401).json({ message: 'Authentication required for file access' });
  }

  const [dir, fileName] = req.path.split('/').filter(Boolean);
  const fileId = fileName || '';

  try {
    // 2. Medical documents / generated reports / call recordings: the file must
    //    be attached to a record the caller is allowed to read.
    if (SENSITIVE_UPLOAD_DIRS.has(dir)) {
      if (user.role === 'superadmin') return next();
      const records = await Record.find({
        $or: [
          { 'data.uploadedFile.fileId': fileId },
          { attachments: fileId },
          { 'medicalHistory.fileId': fileId },
        ],
      }).select('patientId doctorId hospitalId').limit(5);
      if (records.some((record) => userCanReadRecord(user, record))) return next();
      return res.status(403).json({ message: 'You do not have access to this file' });
    }

    // 3. Chat attachments: only members of the conversation may fetch them.
    if (CHAT_UPLOAD_DIRS.has(dir)) {
      const message = await ChatMessage.findOne({ 'attachments.url': req.originalUrl })
        .select('conversationId')
        .lean();
      if (!message) return res.status(404).json({ message: 'File not found' });
      const conversation = await ChatConversation.findById(message.conversationId).select('participants').lean();
      const isMember = conversation?.participants?.some((p) => String(p) === String(user._id));
      if (!isMember) return res.status(403).json({ message: 'You do not have access to this file' });
      return next();
    }

    // 4. Avatars / images / signatures / image derivatives: any signed-in user.
    return next();
  } catch (err) {
    logger.error(`Upload access check failed for ${req.originalUrl}: ${err.message}`);
    return res.status(403).json({ message: 'You do not have access to this file' });
  }
}, express.static(path.join(__dirname, '..', 'public/uploads'), {
  dotfiles: 'deny',
  index: false,
  fallthrough: false,
}));

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import doctorRoutes from './routes/doctors.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import waitlistRoutes from './routes/waitlist.js';
import appointmentSeriesRoutes from './routes/appointmentSeries.js';
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
import walletGuardRoutes from './routes/walletGuards.js';
import labRoutes from './routes/lab.js';
import pharmacyRoutes from './routes/pharmacy.js';
import ipdRoutes from './routes/ipd.js';
import triageRoutes from './routes/triage.js';
import clinicalAlertRoutes from './routes/clinicalAlerts.js';
import radiologyRoutes from './routes/radiology.js';
import searchRoutes from './routes/search.js';
import videoRoutes from './routes/video.js';
import surgeRoutes from './routes/surge.js';
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
// A4 patient portal (rolesmd 10.md 4.3 + 4.4, 6.md 2.5/2.15/2.7): vaccination
// schedules, DPDP data-subject requests (self-service + the compliance queue)
// and meal subscriptions - each its own resource, like deletionRequests below.
import patientVaccinationRoutes from './routes/vaccinations.js';
import patientDsrRoutes from './routes/dsr.js';
import adminDsrRoutes from './routes/adminDsr.js';
import breakGlassRoutes from './routes/breakGlass.js';
import crmRoutes from './routes/crm.js';
import iamRoutes from './routes/iam.js';
import financeRoutes from './routes/finance.js';
import tpaRoutes from './routes/tpa.js';
import orderRoutes from './routes/orders.js';
import storeRoutes from './routes/stores.js';
import fhirRoutes from './routes/fhir.js';
import rosterRoutes from './routes/roster.js';
import maternityRoutes from './routes/maternity.js';
import doctorDashRoutes from './routes/doctor.js';
import caseRoutes from './routes/casePresentations.js';
import mortuaryRoutes from './routes/mortuary.js';
import oncologyRoutes from './routes/oncology.js';
import formRoutes from './routes/forms.js';
import signatureRoutes from './routes/signatures.js';
import verifyRoutes from './routes/verify.js';
import queueRoutes from './routes/queues.js';
import kioskRoutes from './routes/kiosk.js';
import printRoutes from './routes/print.js';
import recallRoutes from './routes/recall.js';
import cssdRoutes from './routes/cssd.js';
import clinicalRoutes from './routes/clinical.js';
import mealSubscriptionRoutes from './routes/mealSubscriptions.js';
import membershipRoutes from './routes/memberships.js';
import patientEventRoutes from './routes/patientEvents.js';
import patientPolicyRoutes from './routes/patientInsurancePolicies.js';
import patientDashboardRoutes from './routes/patientDashboard.js';
import patientTimelineRoutes from './routes/patientTimeline.js';
import patientRecommendationsRoutes from './routes/patientRecommendations.js';
import patientWomensHealthRoutes from './routes/patientWomensHealth.js';
import patientWellnessRoutes from './routes/patientWellness.js';
import secondOpinionRoutes from './routes/secondOpinions.js';
import dentalRoutes from './routes/dental.js';
import eyeRoutes from './routes/eye.js';
import dialysisRoutes from './routes/dialysis.js';
import fertilityRoutes from './routes/fertility.js';
import doctorCmeRoutes from './routes/doctorCme.js';
import qualityChecklistRoutes from './routes/qualityChecklists.js';
import auditLogRoutes from './routes/auditLogs.js';
import opsHealthRoutes from './routes/opsHealth.js';
import tenantQuotaRoutes from './routes/tenantQuotas.js';
import reviewModerationRoutes from './routes/reviewModeration.js';
import systemSettingRoutes from './routes/systemSettings.js';
import commissionRoutes from './routes/commission.js';
import adminSecurityRoutes from './routes/adminSecurity.js';
import disputeRoutes from './routes/disputes.js';
import supportTicketRoutes from './routes/supportTickets.js';
import leaveRequestRoutes from './routes/leaveRequests.js';
import scheduleChangeRequestRoutes from './routes/scheduleChangeRequests.js';
import categoryRoutes from './routes/categories.js';
import providerRoutes from './routes/providers.js';
import practitionerRoutes from './routes/practitioners.js';
import productRoutes from './routes/products.js';
import providerTypeRoutes from './routes/providerTypes.js';
import adminProviderTypeRoutes from './routes/adminProviderTypes.js';
import providerServiceRoutes from './routes/providerServices.js';
// Catalogue half of the provider workspace (10.md 4.2 plans + products).
// Mounted at /api/provider AFTER /api/provider/services so the deeper, earlier
// mount keeps serving /services untouched — this router only ever sees
// /plans and /products.
import providerCatalogRoutes from './routes/providerCatalog.js';
import joinRoutes from './routes/join.js';
import adminApplicationRoutes from './routes/adminApplications.js';
import onboardingMetricsRoutes from './routes/onboardingMetrics.js';
// rolesmd 5.md flows B (quote), E (events) and G (rental) + 8.md §5/§6 queue.
import quoteRoutes from './routes/quotes.js';
import eventRoutes from './routes/events.js';
import rentalRoutes from './routes/rentals.js';
import workflowRoutes from './routes/workflows.js';
import approvalRoutes from './routes/approvals.js';
import rulesRoutes from './routes/rules.js';
import masterRoutes from './routes/masters.js';
import rcmRoutes from './routes/rcm.js';
import checkoutRoutes from './routes/checkout.js';
import reconRoutes from './routes/recon.js';
import enterpriseRoutes from './routes/enterprise.js';
import reportStudioRoutes from './routes/reportStudio.js';
import insightRoutes from './routes/insights.js';
import contactCenterRoutes from './routes/contactCenter.js';
import hubRoutes from './routes/hub.js';
import safetyRoutes from './routes/safety.js';
import frontofficeRoutes from './routes/frontoffice.js';
import notifyTemplateRoutes from './routes/notifyTemplates.js';
import qualityRoutes from './routes/quality.js';
import moderationRoutes from './routes/moderation.js';
import licenseRoutes from './routes/licenses.js';
import announcementRoutes from './routes/announcements.js';
import broadcastRoutes from './routes/broadcast.js';
import platformCouponRoutes from './routes/platformCoupons.js';
import featuredListingRoutes from './routes/featuredListings.js';
import cityRoutes from './routes/cities.js';
import platformContentRoutes from './routes/platformContent.js';
import exportRoutes from './routes/export.js';
// ADM-M-07 / DLM-06: DPDP erasure workflow (request -> approve -> execute ->
// certificate). Mounted separately from /api/admin so a user's own
// self-service request does not need an admin mount to reach it.
import deletionRequestRoutes from './routes/deletionRequests.js';
import integrationRoutes from './routes/integrations.js';
import deliveryPartnerRoutes from './routes/deliveryPartners.js';
import deliveryRoutes from './routes/delivery.js';
import aiChatRoutes from './routes/aiChat.js';
import driveRoutes from './routes/drive.js';
import analyticsRoutes from './routes/analytics.js';
import chatRoutes from './routes/chat.js';
import callRoutes from './routes/calls.js';
import rideRoutes from './routes/rides.js';
import riderRoutes from './routes/riders.js';
import adminRiderRoutes from './routes/adminRiders.js';
import assistantRoutes from './routes/assistants.js';
import assistantBookingRoutes from './routes/assistantBookings.js';
import adminAssistantRoutes from './routes/adminAssistants.js';
import lawyerRoutes from './routes/lawyers.js';
import lawyerBookingRoutes from './routes/lawyerBookings.js';
import adminLawyerRoutes from './routes/adminLawyers.js';
import demoPaymentRoutes from './routes/demoPayment.js';
import serviceCityRoutes from './routes/serviceCities.js';
import medicineReminderRoutes from './routes/medicineReminders.js';
import vitalsRoutes from './routes/vitals.js';
import carePlanRoutes from './routes/carePlans.js';
import healthIdRoutes from './routes/healthId.js';
import emergencySOSRoutes from './routes/emergencySOS.js';
import emergencyDoctorRoutes from './routes/emergencyDoctor.js';
import ambulanceDriverRoutes from './routes/ambulanceDriver.js';
import loyaltyRoutes from './routes/loyalty.js';
import referralRoutes from './routes/referral.js';
import adminSosSettingsRoutes from './routes/adminSosSettings.js';
import instantDispatchRoutes from './routes/instantDispatch.js';
import mindsupportRoutes, { attachMindRealtime } from './routes/mindsupport.js';
import routingRoutes from './routes/routing.js';
import webhookRoutes from './routes/webhook.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
// APPT-M-01: mounted BEFORE /api/appointments so the broader router's `GET /:id`
// can never swallow '/waitlist/...' (a GET /api/appointments/waitlist would
// otherwise resolve ':id = waitlist').
app.use('/api/appointments/waitlist', waitlistRoutes);
// APPT-M-02: must precede /api/appointments or GET /:id swallows /series/...
app.use('/api/appointments/series', appointmentSeriesRoutes);
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
app.use('/api/wallet-guards', walletGuardRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/clinical-alerts', clinicalAlertRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/surge', surgeRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/health-id', healthIdRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/admin', adminSosSettingsRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/bloodbank', bloodbankRoutes);
app.use('/api/physio', physioRoutes);
app.use('/api/mentalhealth', mentalhealthRoutes);
// Phase 5 (merge): MindSupport counselling platform, namespaced to avoid
// collisions with main /api/* routes. Hospital /api/mentalhealth/* untouched.
app.use('/api/mindsupport', mindsupportRoutes);
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
// A4. Mounted as their OWN resources right after the patient portal: patient.js
// has no catch-all, so an unknown /api/patient/* subpath falls through to these
// mounts regardless of order - the same reason deletionRequests is separate.
app.use('/api/patient/vaccinations', patientVaccinationRoutes);
app.use('/api/patient/dsr', patientDsrRoutes);
app.use('/api/patient/meals', mealSubscriptionRoutes);
// Flow D purchase (5.md 5). The spec spells the path two ways - 10.md 4.3
// "POST /api/memberships", 6.md dashboard "GET/POST /patient/memberships" -
// so the SAME router answers both; one handler, zero duplicated logic, and
// whichever spelling the page is built against is already covered.
app.use('/api/memberships', membershipRoutes);
app.use('/api/patient/memberships', membershipRoutes);
// 6.md 140 dashboard additions: my event registrations (session-scoped list,
// join carries the public event fields) and the policy registry (own rows,
// expiry derived at read — the Insurance model stays the CLAIMS registry).
app.use('/api/patient/events', patientEventRoutes);
app.use('/api/patient/insurance/policies', patientPolicyRoutes);
// 6.md §8 `GET /patient/dashboard/summary?profileId=` — aggregated, cached
// short (60s server-side), object-authz self-or-family via profileAccess.
app.use('/api/patient/dashboard', patientDashboardRoutes);
// 6.md §2.6/§2.10 unified timeline: segment=upcoming merges bookings,
// segment=history is the records timeline (person/type/date filters).
app.use('/api/patient/timeline', patientTimelineRoutes);
// 6.md §2.11 discover feed: near-you events/facilities, packages, trending,
// programs, care-plan suggestions (opt-out via ?personalised=false), seasonal
// alerts, reviewed content — object-authz via profileAccess on ?profileId=.
app.use('/api/patient/recommendations', patientRecommendationsRoutes);
// 6.md §2.9 women's health (opt-in): separate per-profile consent, private by
// design — no other surface reads these collections.
app.use('/api/patient/wellness/womens', patientWomensHealthRoutes);
// 6.md §2.10/§2.11 fitness (opt-in) + nutrition logs, computed streaks.
app.use('/api/patient/wellness', patientWellnessRoutes);
// 7.md:39 second-opinion inbox: patient shares records+question with a doctor,
// doctor answers/declines; the share is a minted ConsentRecord that dies with
// the request.
app.use('/api/second-opinions', secondOpinionRoutes);
// 7.md:3.1 dental charts, treatment plans, lab-work tracker, sterilisation
// log — provider-ownership guarded, patient read-own via /mine.
app.use('/api/provider/dental', dentalRoutes);
// 7.md:3.2 eye exams, optical job cards, surgery pipeline — same guards.
app.use('/api/provider/eye', eyeRoutes);
// 7.md:3.16 dialysis sessions + water-quality logs — same guards.
app.use('/api/provider/dialysis', dialysisRoutes);
// 7.md:3.17 fertility cycles + audited outcome reporting — same guards.
app.use('/api/provider/fertility', fertilityRoutes);
// 7.md:39 doctor CME tracker — scoped to the caller's own Doctor profiles.
app.use('/api/doctor/cme', doctorCmeRoutes);
// 7.md:3.41 quality/NABH checklists — immutable snapshots, derived scores.
app.use('/api/provider/quality', qualityChecklistRoutes);
// 6.md 140 `GET /patient/rentals`: the self-scoped list already lives at
// /api/rentals (rentals.js GET /, authz: self) — same router, dashboard
// spelling, exactly like /api/patient/memberships above.
app.use('/api/patient/rentals', rentalRoutes);
// 10.md 4.4: "GET/POST /api/admin/dsr (data-subject requests)" - the compliance
// queue behind dsr:read/dsr:approve (compliance_officer), separate from the
// self-service half above so neither surface inherits the other's gate.
app.use('/api/admin/dsr', adminDsrRoutes);
// File 23 §4.2: break-glass queue (request/decide/revoke) behind
// breakglass:read/write/approve — DPO, clinical safety, support L2.
app.use('/api/admin/break-glass', breakGlassRoutes);
// File 24: supply/partnership CRM (crm:read/write) + command center.
app.use('/api/crm', crmRoutes);
// File 25: tenant Access Control Center (staff:manage gate inside).
app.use('/api/iam', iamRoutes);
// File 09 §9.5: tariff/discount/credit-notes/cash-counter finance surface.
app.use('/api/finance', financeRoutes);
// File 09 §9.6: TPA desk (insurers, pre-auth, claims, pipeline).
app.use('/api/tpa', tpaRoutes);
// File 09 §9.3 / doc 11 §4: CPOE orders + doctor review inbox/rounds/OT.
app.use('/api/orders', orderRoutes);
// File 09 §9.7: multi-store indent/issue/receive + GRN + stock ledger.
app.use('/api/stores', storeRoutes);
// File 09 §7.2: FHIR R4 read export (dual auth: session or x-api-key).
app.use('/api/fhir', fhirRoutes);
// File 09 §9.8: duty roster (draft → published).
app.use('/api/roster', rosterRoutes);
// File 09 §04.7: maternity (antenatal, labour, delivery → birth record).
app.use('/api/maternity', maternityRoutes);
// Doc 11 §5 P0: single-call doctor dashboard aggregate + tasks.
app.use('/api/doctor', doctorDashRoutes);
// Doc 11 P2: tumour-board / M&M / teaching cases.
app.use('/api/cases', caseRoutes);
// File 09 §06.7: mortuary receive/release.
app.use('/api/mortuary', mortuaryRoutes);
// File 09 §04.9: oncology protocols + cycles.
app.use('/api/oncology', oncologyRoutes);
// File 14 §14.1: versioned form templates + pinned responses.
app.use('/api/forms', formRoutes);
// File 14 §14.2 + §14.4: print pipeline + labels + scan checkpoints.
app.use('/api/print', printRoutes);
// File 14 §14.5: e-signatures (auth) + public doc verify (no login).
app.use('/api/signatures', signatureRoutes);
app.use('/api/verify', verifyRoutes);
// Doc 12 §6: recall engine (rules, derived dues, deduped sends).
app.use('/api/recalls', recallRoutes);
// File 15: unified queue engine + signed display + movement.
app.use('/api/queues', queueRoutes);
// File 15 §15.3: kiosk self check-in (public, rate-limited + bot-gated).
app.use('/api/kiosk', kioskRoutes);
// File 09 §9.7/06.4: CSSD set master + sterilisation cycles.
app.use('/api/cssd', cssdRoutes);
// File 09 §04: EMR templates + CDSS check + ICU flowsheet.
app.use('/api/clinical', clinicalRoutes);
// File 13 §13.1/§13.2/§13.3+§13.5/§13.6: workflows, approvals, rules+tasks, masters+flags.
app.use('/api/workflows', workflowRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/masters', masterRoutes);
// File 16: RCM tracker, gateway checkout, bank recon, enterprise ledgers.
app.use('/api/rcm', rcmRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/recon', reconRoutes);
app.use('/api/enterprise', enterpriseRoutes);
// File 17: report studio (whitelisted datasets) + KPIs/metrics/AI.
app.use('/api/report-studio', reportStudioRoutes);
app.use('/api/insights', insightRoutes);
// File 18: contact center + integration hub + outbound webhooks.
app.use('/api/contact-center', contactCenterRoutes);
app.use('/api/hub', hubRoutes);
// File 22 P0-5: safety/quality/compliance ledgers.
app.use('/api/safety', safetyRoutes);
// File 22 P0-6: front-office enquiries.
app.use('/api/frontoffice', frontofficeRoutes);
// File 22 P2-35: notification template registry.
app.use('/api/notify', notifyTemplateRoutes);
// File 22 P2-30: quality (NABH/CAPA/PCPNDT/MTP).
app.use('/api/quality', qualityRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ops-health', opsHealthRoutes);
app.use('/api/tenant-quotas', tenantQuotaRoutes);
app.use('/api/reviews/moderation', reviewModerationRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/admin/security', adminSecurityRoutes);
// DLM-06: erasure requests. Order matters - mounted as its own resource so the
// ownership checks inside it (self-service vs superadmin) are the only gate
// between a user and someone else's deletion record.
app.use('/api/deletion-requests', deletionRequestRoutes);

// BullMQ Bull Board (job-queue visibility) — superadmin only, no-op without REDIS_URL.
// Top-level await (not fire-and-forget): routes must register BEFORE the 404
// handler below, otherwise they 404 despite being in the stack.
try {
  const { getBoardRouter } = await import('./lib/queueBoard.js');
  const boardRouter = await getBoardRouter();
  if (boardRouter) {
    app.use('/admin/queues', protect, superadminOnly, boardRouter);
    logger.info('📋 Bull Board mounted at /admin/queues');
  }
} catch (err) {
  logger.warn(`Bull Board mount skipped: ${err.message}`);
}

// OpenAPI docs (Phase 4) — /api/docs.json always served; Swagger UI needs
// swagger-ui-express installed. Open in non-production, auth-gated in prod.
try {
  const { buildOpenApiDocument } = await import('./lib/openapi.js');
  const openapiDoc = buildOpenApiDocument();
  const docsGate = process.env.NODE_ENV === 'production' ? [protect] : [];
  app.get('/api/docs.json', ...docsGate, (_, res) => res.json(openapiDoc));
  logger.info('📖 OpenAPI JSON served at /api/docs.json');
  try {
    const swaggerUi = await import('swagger-ui-express');
    const handler = swaggerUi.default ?? swaggerUi;
    app.use('/api/docs', ...docsGate, handler.serve, handler.setup(openapiDoc, { customSiteTitle: 'FindMedi API Docs' }));
    logger.info('📖 Swagger UI mounted at /api/docs');
  } catch {
    logger.warn('Swagger UI unavailable (run npm install) — /api/docs.json still served.');
  }
} catch (err) {
  logger.warn(`OpenAPI docs skipped: ${err.message}`);
}
app.use('/api/disputes', disputeRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/schedule-change-requests', scheduleChangeRequestRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/providers', providerRoutes);
// 10.md 4.1 public catalogue: the practitioner spelling of the detail DTO and
// the cross-vendor storefront listing. Both anonymous + DTO-only, like
// /api/providers above (Cache-Control set per route, allowlisted fields).
app.use('/api/practitioners', practitionerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/config/provider-types', providerTypeRoutes);
app.use('/api/admin/provider-type-configs', adminProviderTypeRoutes);
app.use('/api/join', joinRoutes);
app.use('/api/admin/applications', adminApplicationRoutes);
// 2.md 13: onboarding funnel metrics. Superadmin only, no-store - see the
// route file for why neither the data nor a cached copy of it is public.
app.use('/api/onboarding-metrics', onboardingMetricsRoutes);
// FLOW-B / FLOW-E / FLOW-G and the 8.md §5/§6 moderation queue.
app.use('/api/quotes', quoteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/provider/services', providerServiceRoutes);
app.use('/api/provider', providerCatalogRoutes);
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
app.use('/api/delivery-boy', deliveryPartnerRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/ride', rideRoutes);
app.use('/api/vehicle', rideRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin/riders', adminRiderRoutes);
app.use('/api/admin/rides', (req, res, next) => { req.url = '/rides' + (req.url === '/' ? '' : req.url); adminRiderRoutes(req, res, next); });
app.use('/api/admin/vehicles', (req, res, next) => { req.url = '/vehicles' + (req.url === '/' ? '' : req.url); adminRiderRoutes(req, res, next); });
app.use('/api/assistant', assistantRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/assistant-booking', assistantBookingRoutes);
app.use('/api/assistant-bookings', assistantBookingRoutes);
app.use('/api/admin/assistants', adminAssistantRoutes);
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/lawyer-booking', lawyerBookingRoutes);
app.use('/api/lawyer-bookings', lawyerBookingRoutes);
app.use('/api/admin/lawyers', adminLawyerRoutes);
app.use('/api/payment/demo', demoPaymentRoutes);
app.use('/api/emergency-sos', emergencySOSRoutes);
app.use('/api/emergency-doctor', emergencyDoctorRoutes);
app.use('/api/instant', instantDispatchRoutes);
app.use('/api/ambulance', ambulanceDriverRoutes);
app.use('/api/service-cities', serviceCityRoutes);
app.use('/api/medicine-reminders', medicineReminderRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/vitals-reminders', (req, res, next) => {
  req.url = '/reminders' + (req.url === '/' ? '' : req.url);
  vitalsRoutes(req, res, next);
});
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/routing', routingRoutes);

// 2FA routes
app.use('/api/auth/2fa', twoFactorRoutes);

// AUTH-005: bare /auth mounts removed — prefix normalization + limiters cover
// /auth/* via /api/auth/*, so these duplicates only bypassed rate limiting.

app.get(['/api/health', '/health', '/api/v1/health'], async (_, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let redisStatus = 'fallback_memory';
  try {
    const { isRedisReady } = await import('./config/redis.js');
    redisStatus = isRedisReady() ? 'connected' : 'disconnected/fallback';
  } catch (_) {}

  let kafkaStatus = 'unconfigured';
  try {
    const { isKafkaConfigured } = await import('./config/kafka.js');
    kafkaStatus = isKafkaConfigured() ? 'ready' : 'in_memory_spine';
  } catch (_) {}

  let queuesStatus = 'disabled';
  try {
    const { queueStatus } = await import('./lib/queues.js');
    const qs = await queueStatus();
    queuesStatus = qs.enabled ? 'ready' : `disabled (${qs.reason || 'no redis'})`;
  } catch (_) {}

  res.json({
    status: 'ok',
    service: 'FindMedi Core Platform',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    components: {
      mongodb: mongoStatus,
      redis: redisStatus,
      kafka: kafkaStatus,
      queues: queuesStatus,
      valhallaRouting: process.env.VALHALLA_URL ? 'external_engine' : 'haversine_fallback',
      paymentMode: 'DEMO_SANDBOX_ESCROW',
    },
    h3Resolutions: {
      ambulanceSos: 6,
      instantConsult: 7,
      riderMobility: 8,
      finePolygon: 9,
    },
  });
});

/**
 * INF-B-07: orchestrator-friendly liveness/readiness split.
 *
 * `/api/health` above is a diagnostics endpoint: it always answers 200 so a
 * dashboard can read the component map even while degraded. That is exactly
 * wrong for a Kubernetes probe — a pod whose datastore is unreachable stays in
 * the load-balancer rotation.
 *
 *   /healthz  liveness  — the process is up and the event loop turns. 200/500.
 *                         Never touches a dependency (a slow DB must not cause
 *                         a restart loop).
 *   /readyz   readiness — a real ping of each required dependency with a short
 *                         timeout. 503 while degraded so traffic is drained.
 */
const MONGO_READY_STATES = new Set([1]);

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

app.get('/healthz', (_req, res) => {
  // Liveness only proves the process can serve a request — it touches NO
  // dependency (INF-B-07 partial: the old form pinged mongo here, so a slow DB
  // could restart the pod via the liveness probe). Dependency health lives in
  // /readyz, which is allowed to 503.
  res.status(200).json({ status: 'alive', uptimeSeconds: Math.floor(process.uptime()) });
});

// INF-M-02: /metrics next to the probes — same class of root-level, non-/api
// endpoint (no CSRF, no API rate bucket), guarded by METRICS_TOKEN inside.
app.use(metricsRoutes);

app.get('/readyz', async (_req, res) => {
  const mongoReady = MONGO_READY_STATES.has(mongoose.connection.readyState)
    && await withTimeout(
      mongoose.connection.db?.admin().command({ ping: 1 }).then(() => true).catch(() => false),
      1500,
      false
    ) === true;

  // no initial value: both the try and the catch below assign before the first
  // read (line `mongoReady && redisReady`), so an initializer would be dead.
  let redisReady;
  try {
    const { redisClient, isRedisReady } = await import('./config/redis.js');
    // Redis is optional (the app degrades to in-memory), so it is reported but
    // only fatal when the deployment actually configured it.
    redisReady = !process.env.REDIS_URL
      || (isRedisReady() && await withTimeout(redisClient.ping(), 1000, false) === 'PONG');
  } catch { redisReady = false; }

  const ready = mongoReady && redisReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    checks: { mongodb: mongoReady, redis: redisReady },
  });
});
/**
 * DP-B-05: data-pipeline freshness, exposed separately from process liveness.
 *
 * `/healthz` says the process is up. It cannot say the Kafka consumer is keeping
 * up — and those are independent facts. A pod that has been running for a week
 * with a wedged consumer passes every liveness probe while every dashboard
 * silently shows no data, which is precisely how this defect stayed invisible.
 *
 * Deliberately NOT part of `/readyz`: a stale analytics rollup must not take the
 * API out of the load-balancer rotation. Taking appointments offline because a
 * batch job is behind would turn a reporting problem into a clinical one. This
 * returns 200 with `degraded: true` in the body, for monitoring to alert on — not
 * a 503 that would drain traffic.
 */
app.get('/healthz/pipelines', async (_req, res) => {
  const health = getPipelineHealth();
  if (health.degraded) {
    logger.warn(
      'DP-B-05: data pipelines degraded - stale=' + health.stalePipelines.join(',')
      + ' failing=' + health.failingPipelines.join(',')
    );
  }
  res.status(200).json(health);
});

app.get('/', (_, res) => res.json({ status: 'ok', message: 'FindMedi API running', health: '/api/v1/health', docs: '/api/v1/health' }));

// ── Serve frontend in production (only if client/dist exists - single-service deploy) ──
import fs from 'fs';
if (process.env.NODE_ENV === 'production') {
  // INF-B-08: the repo ships `frontend/dist`, NOT `client/dist`. The old path
  // never existed, so on a single-service production deploy the static mount and
  // the SPA fallback silently never registered and every non-API route 404'd.
  // FRONTEND_DIST lets a deployment point at a build served from elsewhere;
  // otherwise probe the two locations the repo/tooling actually produce.
  const candidatePaths = [
    process.env.FRONTEND_DIST,
    path.join(__dirname, '..', '..', 'frontend', 'dist'),
    path.join(__dirname, '..', '..', 'client', 'dist'),
  ].filter(Boolean);

  const clientDist = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (clientDist) {
    app.use(express.static(clientDist));
    // SPA fallback: serve index.html for non-API routes (must be before 404)
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err) res.status(404).end();
      });
    });
    logger.info(`🌐 Serving SPA from ${clientDist}`);
  } else if (process.env.REQUIRE_SPA_BUILD === 'true') {
    // Opt-in hard failure so a misconfigured single-service deploy cannot come up
    // silently in API-only mode.
    logger.error('REQUIRE_SPA_BUILD=true but no frontend build was found in: ' + candidatePaths.join(', '));
    throw new Error('Frontend build missing in production (REQUIRE_SPA_BUILD=true)');
  } else {
    logger.warn('⚠️ No frontend build found (' + candidatePaths.join(', ') + ') - running in API-only mode (expected for split deploy)');
  }
}
 
// 404 handler for unknown routes
// TEMP-PROBE (debug, delete after use)
app.get('/__probe/router', (_req, res) => {
  res.json({
    healthzRegistered: app._router.stack.some((l) => l.route && String(l.route.path).includes('/healthz')),
    stack: app._router.stack.map((l) => ({
      name: l.name,
      route: l.route ? String(l.route.path) : undefined,
      mount: l.path,
      regexp: l.regexp ? String(l.regexp).slice(0, 140) : undefined,
    })),
  });
});
app.use(notFound);

// Sentry captures unhandled route errors before our responder formats them
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

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
  // §15.4: Slowloris guard — a client dribbling headers/body no longer pins a
  // socket for Node's 5-min default. Nginx client_*_timeout stays the outer layer.
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  let instantDispatchRetryTimer;
  // INF-M-02: nodejs_*/process_* gauges start only on a real boot, so tests
  // that import this file never spawn the collection interval.
  startProcessMetrics();
  initSocket(server).then((mainIo) => {
    // Phase 6 (merge): MindSupport realtime rooms on the shared server.
    try { attachMindRealtime(mainIo); } catch (err) { logger.error(`MindSupport realtime attach failed: ${err.message}`); }
  }).catch((err) => logger.error(`Socket.IO init failed: ${err.message}`));
  mongoose.connect(MONGO_URI, mongooseOptions)
    .then(async () => {
      // Coupon caps depend on these unique keys. Create their indexes explicitly
      // before the HTTP listener opens rather than relying on autoIndex.
      try {
        const { default: CouponRedemption } = await import('./models/PlatformCouponRedemption.js');
        const { default: CouponUserUsage } = await import('./models/PlatformCouponUserUsage.js');
        await Promise.all([CouponRedemption.createIndexes(), CouponUserUsage.createIndexes()]);
        logger.info('Coupon redemption indexes ready');
      } catch (indexError) {
        logger.error(`Coupon redemption indexes failed; refusing to start payment API: ${indexError.message}`);
        throw indexError;
      }
      logger.info('✅ MongoDB connected successfully');
      
      // Initialize feature flags and PostHog
      initFeatureFlags();
      initPostHog();
      
      try {
        const { recoverStuckRequests } = await import('./services/emergencyDispatchService.js');
        await recoverStuckRequests();
      } catch (e) {
        logger.warn('recoverStuckRequests failed: ' + e.message);
      }
      // File 03 — H3 hex-cache reconciler (DB ↔ Redis drift fix, every 5 min)
      try {
        const { startHexCacheReconcile } = await import('./jobs/hexCacheReconcile.job.js');
        startHexCacheReconcile(Number(process.env.HEX_RECONCILE_INTERVAL_MS || 5 * 60 * 1000));
      } catch (e) {
        logger.warn('hexCacheReconcile scheduler failed: ' + e.message);
      }
      // Spec 14 — in-process demand-surge calculator (every 60s; Flink can replace it).
      try {
        const { startSurgeCalc } = await import('./jobs/surgeCalc.job.js');
        startSurgeCalc(Number(process.env.SURGE_CALC_INTERVAL_MS || 60 * 1000));
      } catch (e) {
        logger.warn('surgeCalc scheduler failed: ' + e.message);
      }
      // Spec 15 — OpenSearch indices (no-op unless OPENSEARCH_NODE is set).
      try {
        const { ensureIndices } = await import('./services/opensearchIndexer.js');
        ensureIndices().catch(() => {});
      } catch (e) {
        logger.warn('opensearch ensureIndices failed: ' + e.message);
      }
      // Doc 02 §4.3: stale GPS → auto offline (unless on duty), every 60s
      setInterval(async () => {
        try {
          const { default: Ambulance } = await import('./models/Ambulance.js');
          const { default: RiderProfile } = await import('./models/RiderProfile.js');
          const riderFreshCutoff = new Date(Date.now() - Number(process.env.RIDER_LOCATION_FRESH_SECONDS || 60) * 1000);
          const staleRiders = await RiderProfile.find({ isOnline: true, riderStatus: 'active', 'currentLocation.updatedAt': { $lt: riderFreshCutoff } }).select('userId').limit(500).lean();
          if (staleRiders.length) {
            const riderIds = staleRiders.map((rider) => rider.userId);
            await RiderProfile.updateMany({ userId: { $in: riderIds }, isOnline: true, activeDispatchRequestId: null }, { $set: { isOnline: false } });
            const { removeProviderFromCache } = await import('./lib/h3Cache.js');
            await Promise.allSettled(riderIds.map((providerId) => removeProviderFromCache({ providerId, providerType: 'rider' })));
          }
          await Ambulance.updateMany(
            { isOnline: true, isOnDuty: { $ne: true }, lastPingAt: { $lt: new Date(Date.now() - 3 * 60 * 1000) } },
            { isOnline: false }
          );
        } catch {}
      }, 60 * 1000);
      // Graceful EADDRINUSE handling: without this the whole process died with an
      // unhandled 'error' event stack trace whenever a stale backend still held the port.
      server.on('error', (err) => {
        if (err?.code === 'EADDRINUSE') {
          logger.error(`Port ${PORT} is already in use - another FindMedi backend is probably still running.`);
          logger.error('   Fix: run "npm run free-ports" from the project root (or close the other terminal).');
          logger.error('   Tip: this watcher retries automatically on the next file change.');
          process.exit(1);
        }
        logger.error('Server error: ' + err.message);
        process.exit(1);
      });

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
      const Doctor = (await import('./models/Doctor.js')).default;
      const Patient = (await import('./models/Patient.js')).default;
      await Appointment.syncIndexes();
      await Payment.syncIndexes();
      await Doctor.syncIndexes();
      await Patient.syncIndexes();
      logger.info('✅ Database indexes synced');

      const { ensureDemoUsers } = await import('./services/demoSeedService.js');
      await ensureDemoUsers();

      // Start Transactional Outbox Background Poller
      const { startOutboxPoller } = await import('./services/outboxPollerService.js');
      startOutboxPoller();
      const { startInstantDispatchRetryRecovery } = await import('./services/instantDispatchService.js');
      instantDispatchRetryTimer = startInstantDispatchRetryRecovery();

      // Start Event Consumer Subscriber Daemon (processes outbox / kafka pipeline)
      const { startKafkaConsumer } = await import('./services/kafkaConsumerService.js');
      startKafkaConsumer();

      // Spec 18 — internal gRPC MatchingEngineService (fail-soft; REST stays primary)
      try {
        const { startGrpcServer } = await import('./lib/grpcServer.js');
        await startGrpcServer();
      } catch (e) {
        logger.warn('gRPC server failed to start (non-fatal): ' + e.message);
      }

      // Phase 3 — BullMQ workers (notifications; no-op without REDIS_URL)
      try {
        const { startWorkers } = await import('./workers/index.js');
        await startWorkers();
      } catch (e) {
        logger.warn('job workers failed to start (non-fatal): ' + e.message);
      }

      // Release unconfirmed pharmacy stock holds after their finite checkout
      // window; the database CAS makes this safe across multiple API replicas.
      try {
        const { startPharmacyReservationExpiry } = await import('./services/pharmacyInventoryService.js');
        startPharmacyReservationExpiry({ intervalMs: Number(process.env.PHARMACY_RESERVATION_SWEEP_MS) || 60_000 });
      } catch (e) {
        logger.error('pharmacy reservation expiry worker failed to start: ' + e.message);
      }

      // MISS-PAY-003: wallet ledger reconciliation (daily, cron)
      try {
        const { startWalletReconcile } = await import('./jobs/walletReconcile.job.js');
        startWalletReconcile();
      } catch (e) {
        logger.warn('wallet reconcile job failed to start (non-fatal): ' + e.message);
      }

      // NOTIF-M-03: appointment reminders (T-24h/T-2h), every 5 min. The state
      // lives on the Appointment doc, so a missed tick is caught up by the next.
      try {
        const { startAppointmentReminders } = await import('./jobs/appointmentReminder.job.js');
        startAppointmentReminders(process.env.APPT_REMINDER_CRON || '*/5 * * * *');
      } catch (e) {
        logger.warn('appointment reminder job failed to start (non-fatal): ' + e.message);
      }

      // PAY-M-03: payout-vs-settlement reconciliation (daily, 03:00 — offset
      // from the 02:00 wallet job). Mismatch = audit + superadmin alert.
      try {
        const { startPayoutReconcile } = await import('./jobs/payoutReconcile.job.js');
        startPayoutReconcile(process.env.PAYOUT_RECON_CRON || '0 3 * * *');
      } catch (e) {
        logger.warn('payout reconcile job failed to start (non-fatal): ' + e.message);
      }

      // 2.md 5 / 8.md 2 / 8.md 14: document expiry (60/30/7-day reminders,
      // grace-suspension of the listing, ops alert on expiry). Daily, 06:00 —
      // offset from the 02:00 wallet and 03:00 payout jobs.
      try {
        const { startDocumentExpiry } = await import('./jobs/documentExpiry.job.js');
        startDocumentExpiry(process.env.DOC_EXPIRY_CRON || '0 6 * * *');
      } catch (e) {
        logger.warn('document expiry job failed to start (non-fatal): ' + e.message);
      }
    } catch (e) {
      logger.error('⚠️ Failed to sync indexes, seed demo users, or start outbox poller: ' + e.message);
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
    try {
      const { stopInstantDispatchRetryRecovery } = await import('./services/instantDispatchService.js');
      stopInstantDispatchRetryRecovery(instantDispatchRetryTimer);
    } catch {}
    try {
      const { stopOutboxPoller } = await import('./services/outboxPollerService.js');
      stopOutboxPoller();
    } catch {}
    try {
      const { stopWorkers } = await import('./workers/index.js');
      await stopWorkers();
      const { closeQueues } = await import('./lib/queues.js');
      await closeQueues();
    } catch {}
    await mongoose.connection.close();
    logger.info('📦 MongoDB connection closed');
    process.exit(0);
  });
}

export default app;
