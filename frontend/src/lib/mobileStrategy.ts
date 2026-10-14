/**
 * Document 15 — Mobile App Strategy Specifications
 * Frontend TypeScript interfaces, constants, and helper utilities.
 */

export interface MobileArchitectureTier {
  tier: string;
  phase: string;
  verdict: string;
  pros: string;
  cons: string;
}

export interface AppPortfolioItem {
  code: string;
  name: string;
  targetUsers: string;
  channels: string;
  features: string[];
}

export interface NativeCapabilityItem {
  capability: string;
  pwa: string;
  capacitor: string;
  native: string;
}

export const MOBILE_ARCHITECTURE_DECISION = {
  selectedPath: 'PWA_TO_CAPACITOR',
  recommendation: 'PWA now in R1 → Capacitor shells in R2 → Native Android/Kotlin only for rider/ambulance tracking when background location demands.',
  tiers: [
    {
      tier: 'PWA (Progressive Web App)',
      phase: 'R1',
      verdict: 'Primary launch platform for all users and providers',
      pros: 'Single codebase, instant deployment, zero app-store friction or commissions',
      cons: 'iOS push notification limitations, background location restricted, camera controls basic',
    },
    {
      tier: 'Capacitor Hybrid Wrapper',
      phase: 'R2',
      verdict: 'App Store and Google Play presence for Patient & Partner apps',
      pros: 'Reuses existing React web codebase, access to native biometrics, camera, secure storage, and push plugins',
      cons: 'WebView performance on low-end devices requires bundle budget enforcement',
    },
    {
      tier: 'Native Android / Kotlin Service',
      phase: 'R2 / R3',
      verdict: 'Selective background location service for Driver & Ambulance',
      pros: 'Bulletproof foreground service, lowest battery drain, highest GPS precision under background kill',
      cons: 'Separate codebase and native build pipeline',
    },
  ] as MobileArchitectureTier[],
};

export const APP_PORTFOLIO: AppPortfolioItem[] = [
  {
    code: 'findmedi_patient',
    name: 'FindMedi (Patient & Family)',
    targetUsers: 'Patients, families, dependents, wellness & fitness seekers',
    channels: 'PWA in R1, Play Store & App Store in R2',
    features: ['Appointment booking', 'Telemedicine video calls', 'Health records & locker', 'Pharmacy orders', 'Emergency SOS'],
  },
  {
    code: 'findmedi_partner',
    name: 'FindMedi Partner (Provider & Practice)',
    targetUsers: 'Doctors, clinics, diagnostic labs, pharmacies, fitness trainers, nurses',
    channels: 'PWA in R1, Play Store & App Store in R2',
    features: ['Real-time appointment schedule', 'Digital e-prescriptions', 'Queue management', 'Earnings & settlements', 'Direct patient chat'],
  },
  {
    code: 'findmedi_field',
    name: 'FindMedi Field Mode (Integrated in Partner)',
    targetUsers: 'Phlebotomists, home care nurses, health camp volunteers',
    channels: 'Field mode toggle inside Partner App (feature-flagged)',
    features: ['Offline route queue', 'Barcode sample scanning', 'Start/End OTP verification', 'Local SQLite sync buffer'],
  },
  {
    code: 'findmedi_driver',
    name: 'FindMedi Ride & Ambulance Driver',
    targetUsers: 'Ambulance drivers, medicine delivery partners, sample couriers',
    channels: 'Dedicated mobile shell with persistent foreground location tracking',
    features: ['Background location telemetry', 'Trip state machine', 'Turn-by-turn navigation deep-links', 'Emergency panic button'],
  },
  {
    code: 'ops_console',
    name: 'Superadmin & Ops Command',
    targetUsers: 'Platform operators, KYC reviewers, moderators, finance team',
    channels: 'Web only (Desktop-optimized)',
    features: ['Provider onboarding workspace', 'Moderation queues', 'Dispute resolution', 'Platform KPIs'],
  },
];

export const PWA_SPECIFICATIONS = {
  manifest: {
    name: 'FindMedi — Care near you',
    shortName: 'FindMedi',
    display: 'standalone',
    themeColor: '#0d9488',
    backgroundColor: '#ffffff',
    startUrl: '/',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Book a doctor', shortName: 'Book', url: '/book' },
      { name: 'Emergency SOS', shortName: 'SOS', url: '/sos' },
      { name: 'My health records', shortName: 'Records', url: '/records' },
    ],
  },
  cachingRules: {
    appShell: 'Pre-cached during Service Worker install (index.html, manifest, core icons, offline.html)',
    staticAssets: 'Cache-first with network fallback for versioned JS, CSS, and media bundles',
    publicApi: 'Stale-while-revalidate for public catalogs and service city listings',
    personalPhiApi: 'STRICTLY NETWORK-ONLY — never stored in CacheStorage or IndexedDB without encryption',
    offlineFallback: 'Serves /offline.html with 24x7 emergency contacts (112, 108) and cached appointment summaries',
  },
};

export const NATIVE_CAPABILITY_MATRIX: NativeCapabilityItem[] = [
  { capability: 'Push Notifications', pwa: 'Supported on Android; limited on iOS PWA', capacitor: 'Full FCM / APNs support', native: 'Full native push' },
  { capability: 'Background Location', pwa: 'Restricted / killed when screen off', capacitor: 'Supported via foreground service plugin', native: 'Native foreground service' },
  { capability: 'Camera & Document Scanning', pwa: 'Basic HTML5 file input', capacitor: 'Native camera with edge detection & crop', native: 'Custom camera ML kit' },
  { capability: 'Barcode & QR Code Scanning', pwa: 'BarcodeDetector API / WebAssembly', capacitor: 'Native ML Kit scanner plugin', native: 'High-speed hardware scanner' },
  { capability: 'Biometric App Lock', pwa: 'WebAuthn (partial)', capacitor: 'TouchID / FaceID / BiometricPrompt plugin', native: 'BiometricPrompt API' },
  { capability: 'Encrypted Offline Storage', pwa: 'IndexedDB (unencrypted at rest)', capacitor: 'SQLCipher / SecureStorage plugin', native: 'Encrypted SQLite via Android Keystore' },
  { capability: 'App Store Discovery', pwa: 'Not discoverable in app stores', capacitor: 'Fully eligible for Play Store & App Store', native: 'Fully eligible' },
  { capability: 'Play Integrity / App Attest', pwa: 'Not available', capacitor: 'Supported via native bridge plugin', native: 'Native Play Integrity API' },
];

export const MOBILE_SECURITY_CONTROLS = {
  authentication: 'Short-lived access tokens (15m) + secure refresh tokens held in OS Keystore / Keychain. Never plain localStorage.',
  screenShielding: 'FLAG_SECURE enabled on sensitive viewports (health records, psychiatric notes, payment card fields) to prevent screenshots.',
  dataAtRest: 'Zero plaintext health data. Offline field queues encrypted via SQLCipher using device-bound hardware key.',
  integrityChecking: 'Play Integrity API checks for rooted/jailbroken devices and mock GPS locations on field & driver apps.',
  pushPrivacy: 'Zero PHI in push payloads. Payload contains generic trigger ("You have an update"); health details fetched post-auth.',
  storeCompliance: 'Google Play Data Safety and Apple Privacy Nutrition labels declared with zero commercial data broker tracking.',
};

export const MOBILE_PERFORMANCE_TARGETS = {
  coldStartSeconds: 3.0,
  timeToInteractiveSeconds: 4.0,
  jsBundleRouteKbGzip: 200,
  maxMemoryMb: 250,
  maxApkSizeMb: 40,
  batteryDrainPerHourPct: 3.0,
  targetFps: 60,
};

export const MOBILE_ROLLOUT_PLAN = [
  { phase: 'R1', scope: 'PWA polish: manifest.webmanifest, offline.html, web push, and zero-PHI service worker caching' },
  { phase: 'R2-A', scope: 'Capacitor shell for FindMedi Partner app with camera doc scanning and push notifications' },
  { phase: 'R2-B', scope: 'Capacitor shell for FindMedi Patient app with biometric lock and App Store / Play Store release' },
  { phase: 'R2-C', scope: 'Pilot 20–50 field and ambulance partners with background location and offline sync queue' },
  { phase: 'R3', scope: 'Staged production rollout (5% → 20% → 100%) with automated version enforcement and kill-switch' },
];

export function checkMobilePerformanceMetric(metricName: string, value: number) {
  const targets = MOBILE_PERFORMANCE_TARGETS;
  let passed = false;
  let target = 0;
  let unit = '';

  switch (metricName) {
    case 'coldStart':
      target = targets.coldStartSeconds;
      passed = value <= target;
      unit = 's';
      break;
    case 'tti':
      target = targets.timeToInteractiveSeconds;
      passed = value <= target;
      unit = 's';
      break;
    case 'bundleSize':
      target = targets.jsBundleRouteKbGzip;
      passed = value <= target;
      unit = 'KB gz';
      break;
    case 'memory':
      target = targets.maxMemoryMb;
      passed = value <= target;
      unit = 'MB';
      break;
    case 'apkSize':
      target = targets.maxApkSizeMb;
      passed = value <= target;
      unit = 'MB';
      break;
    default:
      return { found: false, passed: false, message: `Unknown metric "${metricName}"` };
  }

  return {
    found: true,
    metric: metricName,
    value,
    target,
    unit,
    passed,
    message: passed
      ? `${metricName}: ${value}${unit} is within target threshold of ≤ ${target}${unit}.`
      : `${metricName}: ${value}${unit} exceeds allowed threshold of ≤ ${target}${unit}.`,
  };
}
