import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  Appointment,
  Assessment,
  CounsellorApplication,
  Journal,
  Message,
  MoodEntry,
  Notification,
  OtpVerification,
  Payment,
  PeerComment,
  PeerPost,
  PeerReport,
  Resource,
  Review,
  User,
} from "../models/index.js";

const curatedResources = [
  {
    title: "Box Breathing for Exam Stress",
    type: "video",
    category: "Stress",
    language: "English",
    url: "https://www.youtube.com/watch?v=tEmt1Znux58",
    description: "A short guided breathing video for acute stress and study pressure.",
    durationMin: 4,
    tags: ["breathing", "exam stress", "grounding"],
  },
  {
    title: "Mindfulness Practice for Focus",
    type: "video",
    category: "Meditation",
    language: "English",
    url: "https://www.youtube.com/watch?v=inpok4MKVLM",
    description: "A simple mindfulness practice for grounding and focus.",
    durationMin: 10,
    tags: ["mindfulness", "meditation", "focus"],
  },
  {
    title: "Caring for Your Mental Health",
    type: "article",
    category: "General",
    language: "English",
    url: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    description: "Self-care basics for emotional wellbeing, stress, sleep, connection, and getting help.",
    durationMin: 8,
    tags: ["self care", "wellbeing", "mental health"],
  },
  {
    title: "My Mental Health: Do I Need Help?",
    type: "article",
    category: "Support",
    language: "English",
    url: "https://www.nimh.nih.gov/health/publications/my-mental-health-do-i-need-help",
    description: "A practical guide to understand when symptoms may need professional support.",
    durationMin: 7,
    tags: ["support", "symptoms", "help"],
  },
  {
    title: "Sleep Hygiene Checklist",
    type: "article",
    category: "Sleep",
    language: "English",
    url: "https://www.sleepfoundation.org/sleep-hygiene",
    description: "Practical habits that support better sleep and recovery.",
    durationMin: 8,
    tags: ["sleep hygiene", "routine", "rest"],
  },
  {
    title: "Self-Motivation Guide",
    type: "article",
    category: "Motivation",
    language: "English",
    url: "https://www.mindtools.com/c4chclh/self-motivation",
    description: "Motivation tools for goals, confidence, positive thinking, and personal growth.",
    durationMin: 9,
    tags: ["motivation", "goals", "confidence"],
  },
  {
    title: "How to Build Self-Confidence",
    type: "article",
    category: "Self Confidence",
    language: "English",
    url: "https://www.mindtools.com/ap5omwt/how-to-build-self-confidence/",
    description: "Practical steps for improving confidence, self-belief, and daily performance.",
    durationMin: 10,
    tags: ["self confidence", "motivation", "growth"],
  },
  {
    title: "Understanding Anxiety Disorders",
    type: "article",
    category: "Anxiety",
    language: "English",
    url: "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
    description: "Reliable information about anxiety symptoms, support options, and treatment paths.",
    durationMin: 9,
    tags: ["anxiety", "symptoms", "support"],
  },
  {
    title: "Depression Information and Support",
    type: "article",
    category: "Depression",
    language: "English",
    url: "https://www.nimh.nih.gov/health/topics/depression",
    description: "Trusted guidance about depression signs, treatment, and when to seek help.",
    durationMin: 9,
    tags: ["depression", "support", "mental health"],
  },
  {
    title: "Coping With Traumatic Stress Reactions",
    type: "article",
    category: "Trauma Support",
    language: "English",
    url: "https://www.ptsd.va.gov/gethelp/coping_stress_reactions.asp",
    description: "Grounding, breathing, and active coping ideas for traumatic stress reactions.",
    durationMin: 12,
    tags: ["trauma support", "grounding", "coping"],
  },
  {
    title: "Recovery and Recovery Support",
    type: "article",
    category: "Addiction Recovery",
    language: "English",
    url: "https://www.samhsa.gov/find-help/recovery",
    description: "Recovery support principles for people working through substance use challenges.",
    durationMin: 8,
    tags: ["addiction recovery", "support", "recovery"],
  },
  {
    title: "Managing Student Stress",
    type: "article",
    category: "Student Pressure",
    language: "English",
    url: "https://jedfoundation.org/resource/how-to-manage-stress/",
    description: "Student-friendly stress management strategies for school, exams, and pressure.",
    durationMin: 8,
    tags: ["student pressure", "exam stress", "study"],
  },
  {
    title: "Stress Management Strategies",
    type: "article",
    category: "Stress",
    language: "English",
    url: "https://www.helpguide.org/mental-health/stress/stress-management",
    description: "Healthy strategies for reducing stress and building resilience.",
    durationMin: 12,
    tags: ["stress", "resilience", "coping"],
  },
  {
    title: "Burnout Recovery Tips",
    type: "article",
    category: "Burnout",
    language: "English",
    url: "https://www.helpguide.org/mental-health/stress/burnout-prevention-and-recovery",
    description: "How to recognize burnout and rebuild energy with boundaries and support.",
    durationMin: 11,
    tags: ["burnout", "boundaries", "recovery"],
  },
  {
    title: "Healthy Boundaries in Relationships",
    type: "article",
    category: "Relationships",
    language: "English",
    url: "https://www.helpguide.org/articles/relationships-communication/setting-healthy-boundaries-in-relationships.htm",
    description: "A guide to setting boundaries that protect identity, wellbeing, and relationships.",
    durationMin: 10,
    tags: ["relationships", "boundaries", "communication"],
  },
  {
    title: "Dealing With Loneliness",
    type: "article",
    category: "Loneliness",
    language: "English",
    url: "https://www.helpguide.org/relationships/social-connection/loneliness-and-social-isolation",
    description: "Ways to rebuild connection and reduce loneliness or social isolation.",
    durationMin: 9,
    tags: ["loneliness", "connection", "support"],
  },
  {
    title: "Relaxation Techniques for Stress Relief",
    type: "article",
    category: "Meditation",
    language: "English",
    url: "https://www.helpguide.org/mental-health/stress/relaxation-techniques-for-stress-relief",
    description: "Relaxation practices for calming the body and easing stress.",
    durationMin: 10,
    tags: ["relaxation", "breathing", "meditation"],
  },
];

const thumbnailPalettes = {
  Anxiety: ["#1d4ed8", "#7c3aed", "#14b8a6"],
  Stress: ["#f97316", "#db2777", "#7c3aed"],
  Sleep: ["#312e81", "#0284c7", "#06b6d4"],
  Burnout: ["#b45309", "#be123c", "#7c2d12"],
  Motivation: ["#7c3aed", "#2563eb", "#06b6d4"],
  "Self Confidence": ["#9333ea", "#db2777", "#2563eb"],
  Relationships: ["#be185d", "#7c3aed", "#2563eb"],
  Loneliness: ["#4338ca", "#0891b2", "#0f766e"],
  Meditation: ["#0f766e", "#2563eb", "#7c3aed"],
  Depression: ["#1e3a8a", "#581c87", "#0f766e"],
  "Trauma Support": ["#047857", "#0f766e", "#1d4ed8"],
  "Addiction Recovery": ["#15803d", "#0f766e", "#2563eb"],
  "Student Pressure": ["#7c3aed", "#2563eb", "#f97316"],
  General: ["#4f46e5", "#7c3aed", "#0891b2"],
};

function escapeSvgText(value = "") {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  })[char]);
}

function shortSvgTitle(value = "") {
  const text = String(value).trim();
  return text.length > 34 ? `${text.slice(0, 31)}...` : text;
}

function youtubeIdFromUrl(value = "") {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || "";
    if (url.hostname === "youtu.be") return url.pathname.replace("/", "");
  } catch {
    return "";
  }
  return "";
}

function seedResourceThumbnail(resource) {
  if (resource.thumbnail) return resource.thumbnail;
  const youtubeId = resource.type === "video" ? youtubeIdFromUrl(resource.url) : "";
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  const palette = thumbnailPalettes[resource.category] || thumbnailPalettes.General;
  const title = escapeSvgText(shortSvgTitle(resource.title));
  const category = escapeSvgText(resource.category || "Wellness");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${palette[0]}" offset="0"/><stop stop-color="${palette[1]}" offset="0.55"/><stop stop-color="${palette[2]}" offset="1"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="45"/></filter></defs><rect width="1200" height="675" fill="#050914"/><rect width="1200" height="675" fill="url(#g)" opacity="0.92"/><circle cx="1030" cy="110" r="190" fill="#ffffff" opacity="0.12" filter="url(#blur)"/><circle cx="130" cy="620" r="210" fill="#050914" opacity="0.30" filter="url(#blur)"/><rect x="78" y="82" width="1044" height="511" rx="42" fill="#050914" opacity="0.42" stroke="#ffffff" stroke-opacity="0.16"/><text x="120" y="172" fill="#ffffff" opacity="0.76" font-family="Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="7">${category}</text><text x="120" y="315" fill="#ffffff" font-family="Arial, sans-serif" font-size="62" font-weight="800">${title}</text><text x="120" y="420" fill="#dbeafe" opacity="0.88" font-family="Arial, sans-serif" font-size="30">MindSupport wellness article</text><circle cx="1000" cy="470" r="72" fill="#ffffff" opacity="0.14"/><path d="M962 470h76M1000 432v76" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.72"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const counsellorPhotos = {
  "Aisha Mehra": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format",
  "Rahul Verma": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&auto=format",
  "Neha Iyer": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face&auto=format",
  "Kabir Khan": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&auto=format",
  "Priya Nair": "https://images.unsplash.com/photo-1587614382344-4ecb093b79b2?w=400&h=400&fit=crop&crop=face&auto=format",
};

const seededCounsellors = [
  {
    name: "Aisha Mehra",
    email: "aisha.mehra@mindsupport.seed",
    specialization: "Anxiety and Stress Management",
    bio: "Licensed psychologist helping students manage anxiety, panic, exam stress, and emotional overwhelm with practical coping plans.",
    location: "Mumbai, Maharashtra",
    education: "PhD Clinical Psychology, RCI registered",
    consultationModes: ["google-meet", "in-person", "voice-call"],
    counsellorType: "professional",
    verificationBadge: "Verified Professional",
    experience: "8 years",
    languages: ["English", "Hindi"],
    sessionPricing: 599,
    categories: ["Anxiety", "Stress", "Student Pressure"],
    availability: ["Monday: 10:00-16:00", "Wednesday: 15:00-18:00", "Friday: 09:00-14:00"],
    rating: 4.9,
    reviews: 128,
    responseTime: "Fast Response",
    licenseNumber: "MHP-PSY-1001",
    certificateLinks: ["https://example.com/certificates/aisha-mehra"],
    linkedin: "https://www.linkedin.com/in/aisha-mehra",
  },
  {
    name: "Rahul Verma",
    email: "rahul.verma@mindsupport.seed",
    specialization: "Career Pressure and Confidence",
    bio: "Community mentor focused on career stress, self-confidence, interview pressure, and small-step motivation for students.",
    location: "Pune, Maharashtra",
    education: "Peer support certification and career mentoring training",
    consultationModes: ["google-meet", "voice-call"],
    counsellorType: "mentor",
    verificationBadge: "Community Mentor",
    experience: "5 years",
    languages: ["English", "Hindi", "Marathi"],
    sessionPricing: 299,
    categories: ["Career Stress", "Self Confidence", "Motivation"],
    availability: ["Tuesday: 12:00-18:00", "Thursday: 18:00-21:00", "Saturday: 10:00-13:00"],
    rating: 4.7,
    reviews: 86,
    responseTime: "Within 12 hours",
    linkedin: "https://www.linkedin.com/in/rahul-verma",
  },
  {
    name: "Neha Iyer",
    email: "neha.iyer@mindsupport.seed",
    specialization: "Depression and Mood Support",
    bio: "Professional counsellor supporting low mood, loneliness, grief, emotional numbness, and therapy progress tracking.",
    location: "Chennai, Tamil Nadu",
    education: "M.Phil Clinical Psychology, licensed therapist",
    consultationModes: ["google-meet", "in-person", "voice-call"],
    counsellorType: "professional",
    verificationBadge: "Verified Professional",
    experience: "10 years",
    languages: ["English", "Tamil"],
    sessionPricing: 549,
    categories: ["Depression", "Loneliness", "General"],
    availability: ["Monday: 16:00-19:00", "Thursday: 10:00-13:00", "Saturday: 14:00-17:00"],
    rating: 4.8,
    reviews: 142,
    responseTime: "Fast Response",
    licenseNumber: "MHP-PSY-1002",
    certificateLinks: ["https://example.com/certificates/neha-iyer"],
    linkedin: "https://www.linkedin.com/in/neha-iyer",
  },
  {
    name: "Kabir Khan",
    email: "kabir.khan@mindsupport.seed",
    specialization: "Addiction Recovery Peer Support",
    bio: "Peer support mentor for recovery routines, relapse prevention habits, accountability, and rebuilding confidence.",
    location: "Hyderabad, Telangana",
    education: "Certified addiction recovery peer mentor",
    consultationModes: ["google-meet", "voice-call"],
    counsellorType: "mentor",
    verificationBadge: "Community Mentor",
    experience: "6 years",
    languages: ["English", "Hindi", "Urdu"],
    sessionPricing: 249,
    categories: ["Addiction Recovery", "Stress", "Motivation"],
    availability: ["Wednesday: 18:00-21:00", "Friday: 18:00-21:00", "Sunday: 11:00-14:00"],
    rating: 4.6,
    reviews: 74,
    responseTime: "Within 24 hours",
    linkedin: "https://www.linkedin.com/in/kabir-khan",
  },
  {
    name: "Priya Nair",
    email: "priya.nair@mindsupport.seed",
    specialization: "Trauma Support and Grounding",
    bio: "Trauma-informed therapist helping clients with grounding, safety planning, triggers, PTSD symptoms, and emotional regulation.",
    location: "Kochi, Kerala",
    education: "PsyD Counselling Psychology, trauma-informed care",
    consultationModes: ["google-meet", "in-person"],
    counsellorType: "professional",
    verificationBadge: "Verified Professional",
    experience: "12 years",
    languages: ["English", "Malayalam", "Hindi"],
    sessionPricing: 599,
    categories: ["Trauma Support", "PTSD", "Anxiety"],
    availability: ["Tuesday: 09:00-12:00", "Thursday: 14:00-17:00", "Saturday: 09:00-12:00"],
    rating: 4.9,
    reviews: 166,
    responseTime: "Fast Response",
    licenseNumber: "MHP-PSY-1003",
    certificateLinks: ["https://example.com/certificates/priya-nair"],
    linkedin: "https://www.linkedin.com/in/priya-nair",
  },
];

const SEED_BATCH = "mindsupport-demo-v2";

const collectionModels = [
  User,
  CounsellorApplication,
  Resource,
  Appointment,
  Review,
  Journal,
  Message,
  Payment,
  Notification,
  PeerPost,
  PeerComment,
  PeerReport,
  MoodEntry,
  Assessment,
  OtpVerification,
];

const seededUsers = [
  {
    name: "Ananya Sharma",
    email: "ananya.sharma@mindsupport.seed",
    phone: "+91-90000-11001",
  },
  {
    name: "Rohan Patel",
    email: "rohan.patel@mindsupport.seed",
    phone: "+91-90000-11002",
  },
  {
    name: "Isha Kapoor",
    email: "isha.kapoor@mindsupport.seed",
    phone: "+91-90000-11003",
  },
  {
    name: "Kavya Menon",
    email: "kavya.menon@mindsupport.seed",
    phone: "+91-90000-11004",
  },
];

const pendingCounsellorApplicants = [
  {
    name: "Nitin Bansal",
    email: "nitin.bansal.pending@mindsupport.seed",
    phone: "+91-90000-12001",
    requestedType: "professional",
    specialization: "Anxiety and adolescent counselling",
    bio: "Clinical psychology graduate applying to support students with anxiety, panic symptoms, and study pressure.",
    experience: "3 years",
    languages: ["English", "Hindi"],
    sessionPricing: 800,
    certificateLinks: ["https://example.com/certificates/nitin-bansal"],
    linkedin: "https://www.linkedin.com/in/nitin-bansal",
    idDocumentType: "Aadhaar",
    idDocumentNumber: "SEED-ID-1001",
    licenseNumber: "PENDING-PSY-2201",
    education: "MA Clinical Psychology",
    categories: ["Anxiety", "Student Pressure", "Stress"],
    availability: ["Tue 10:00-13:00", "Thu 15:00-18:00"],
    approach: "CBT-informed, structured, and student-friendly support.",
    emergencyTraining: "Basic crisis response workshop completed",
    referenceContact: "reference.nitin@example.com",
    verificationNotes: "Pending license and identity document review.",
  },
  {
    name: "Pooja Kulkarni",
    email: "pooja.kulkarni.pending@mindsupport.seed",
    phone: "+91-90000-12002",
    requestedType: "mentor",
    specialization: "Breakup recovery and loneliness",
    bio: "Peer mentor applying to support people through breakup recovery, loneliness, and confidence rebuilding.",
    experience: "2 years",
    languages: ["English", "Hindi", "Marathi"],
    sessionPricing: 350,
    certificateLinks: [],
    linkedin: "https://www.linkedin.com/in/pooja-kulkarni",
    idDocumentType: "Passport",
    idDocumentNumber: "SEED-ID-1002",
    licenseNumber: "",
    education: "Peer support facilitation course",
    categories: ["Relationships", "Loneliness", "Self Confidence"],
    availability: ["Mon 18:00-21:00", "Sat 10:00-13:00"],
    approach: "Empathetic peer support with privacy-first check-ins.",
    emergencyTraining: "Platform safety and escalation training pending",
    referenceContact: "reference.pooja@example.com",
    verificationNotes: "Pending identity verification and mentor interview.",
  },
];

function daysFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function seedAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff`;
}

function seedMeetLink() {
  const raw = String(process.env.GOOGLE_MEET_DEFAULT_LINK || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const pathname = url.pathname.replace(/\/+$/, "");
    return url.hostname === "meet.google.com" && pathname && pathname !== "/new" ? url.toString() : "";
  } catch {
    return "";
  }
}

function seedUsername(value) {
  return String(value || "mindsupport")
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function paymentSplit(amount) {
  const platformFee = Math.round(Number(amount || 0) * 0.02);
  return {
    platformCommissionRate: 2,
    platformFee,
    counsellorPayout: Math.max(0, Number(amount || 0) - platformFee),
  };
}

const supportPlanSeeds = {
  one: {
    supportPlanId: "one-time",
    supportPlanName: "One-Time Session",
    supportPlanDuration: "Single session",
    supportPlanCadence: "One-time consultation",
    supportPlanBestFor: ["Immediate support", "One-off guidance", "Quick check-in"],
  },
  short: {
    supportPlanId: "short-term",
    supportPlanName: "Short-Term Support",
    supportPlanDuration: "4-8 sessions",
    supportPlanCadence: "One session every two days",
    supportPlanBestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
  },
  medium: {
    supportPlanId: "medium-term",
    supportPlanName: "Medium-Term Support",
    supportPlanDuration: "8-15 sessions",
    supportPlanCadence: "Weekly or bi-weekly",
    supportPlanBestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
  },
  long: {
    supportPlanId: "long-term",
    supportPlanName: "Long-Term Therapy",
    supportPlanDuration: "3-6+ months",
    supportPlanCadence: "Weekly or bi-weekly sessions",
    supportPlanBestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
  },
};

function packagePricesFromSession(sessionPricing = 0, type = "professional") {
  const base = Number(sessionPricing) || (type === "mentor" ? 299 : 599);
  return {
    oneTime: Math.max(299, Math.round((base * 1) / 50) * 50 - 1),
    shortTerm: Math.max(599, Math.round((base * 3) / 50) * 50 - 1),
    mediumTerm: Math.max(999, Math.round((base * 5) / 50) * 50 - 1),
    longTerm: Math.max(1599, Math.round((base * 8) / 50) * 50 - 1),
  };
}

async function ensureMongoCollections() {
  for (const model of collectionModels) {
    try {
      await model.createCollection();
    } catch (error) {
      if (error?.code !== 48 && !String(error?.message || "").toLowerCase().includes("already exists")) {
        throw error;
      }
    }
  }
}

async function upsertSeedUser(profile, password = crypto.randomUUID()) {
  const email = profile.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { email },
    {
      $set: {
        ...profile,
        email,
        username: profile.username || seedUsername(profile.email || profile.name),
        role: profile.role || "user",
        status: profile.status || "active",
        otpVerified: true,
        otpVerifiedAt: new Date(),
      },
      $setOnInsert: { passwordHash, createdAt: new Date() },
    },
    { upsert: true }
  );
  return User.findOne({ email });
}

async function seedAdminAccount() {
  const email = (process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || process.env.SEED_ADMIN_NAME || "MindSupport Admin").trim();

  if (!email || !password) {
    return { seeded: false, reason: "ADMIN_EMAIL and ADMIN_PASSWORD were not provided" };
  }

  if (password.length < 8) {
    return { seeded: false, reason: "ADMIN_PASSWORD must be at least 8 characters" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { email },
    {
      $set: {
        name,
        email,
        username: seedUsername(email),
        passwordHash,
        role: "admin",
        status: "active",
        verificationStatus: "approved",
        otpVerified: true,
        otpVerifiedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return { seeded: true, email };
}

async function seedApprovedCounsellors() {
  const counsellorDocs = [];

  for (const counsellor of seededCounsellors) {
    const userUpdate = {
      ...counsellor,
      role: "counsellor",
      status: "approved",
      verificationStatus: "approved",
      otpVerified: true,
      otpVerifiedAt: new Date(),
      platformCommission: 2,
      supportPlanPrices: counsellor.supportPlanPrices || packagePricesFromSession(counsellor.sessionPricing, counsellor.counsellorType),
      hasCustomSupportPlanPrices: true,
      bookingEnabled: true,
      unavailableDates: [],
      meetLink: seedMeetLink(),
      profilePhotoUrl: counsellorPhotos[counsellor.name] || seedAvatar(counsellor.name),
      idVerification: "Seed verification record",
    };
    const user = await upsertSeedUser(userUpdate);
    counsellorDocs.push(user);
    await CounsellorApplication.updateOne(
      { user: user._id },
      {
        $set: {
          user: user._id,
          status: "approved",
          requestedType: counsellor.counsellorType,
          fullName: counsellor.name,
          bio: counsellor.bio,
          specialization: counsellor.specialization,
          experience: counsellor.experience,
          languages: counsellor.languages,
          sessionPricing: counsellor.sessionPricing,
          profilePhotoUrl: userUpdate.profilePhotoUrl,
          certificateLinks: counsellor.certificateLinks || [],
          linkedin: counsellor.linkedin || "",
          idDocumentType: "Seed Verification",
          idDocumentNumber: "SEED-APPROVED",
          licenseNumber: counsellor.licenseNumber || "",
          education: counsellor.education || (counsellor.counsellorType === "professional" ? "Verified professional qualification" : "Peer support training"),
          categories: counsellor.categories,
          availability: counsellor.availability,
          approach: "Warm, structured, privacy-first support.",
          emergencyTraining: "Crisis escalation and safety referral basics",
          referenceContact: "platform-seed@mindsupport.local",
          verificationNotes: "Seeded approved counsellor for marketplace launch data.",
          reviewedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  return counsellorDocs;
}

async function seedPendingCounsellorApplications() {
  const applicantDocs = [];

  for (const applicant of pendingCounsellorApplicants) {
    const user = await upsertSeedUser({
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      role: "counsellor",
      status: "pending",
      specialization: applicant.specialization,
      bio: applicant.bio,
      counsellorType: applicant.requestedType,
      verificationStatus: "pending",
      experience: applicant.experience,
      languages: applicant.languages,
      sessionPricing: applicant.sessionPricing,
      profilePhotoUrl: seedAvatar(applicant.name),
      certificateLinks: applicant.certificateLinks,
      linkedin: applicant.linkedin,
      licenseNumber: applicant.licenseNumber,
      idVerification: `${applicant.idDocumentType}: ${applicant.idDocumentNumber}`,
      categories: applicant.categories,
      availability: applicant.availability,
    });
    applicantDocs.push(user);

    await CounsellorApplication.updateOne(
      { user: user._id },
      {
        $set: {
          user: user._id,
          status: "pending",
          requestedType: applicant.requestedType,
          fullName: applicant.name,
          bio: applicant.bio,
          specialization: applicant.specialization,
          experience: applicant.experience,
          languages: applicant.languages,
          sessionPricing: applicant.sessionPricing,
          profilePhotoUrl: seedAvatar(applicant.name),
          certificateLinks: applicant.certificateLinks,
          linkedin: applicant.linkedin,
          idDocumentType: applicant.idDocumentType,
          idDocumentNumber: applicant.idDocumentNumber,
          licenseNumber: applicant.licenseNumber,
          education: applicant.education,
          categories: applicant.categories,
          availability: applicant.availability,
          approach: applicant.approach,
          emergencyTraining: applicant.emergencyTraining,
          referenceContact: applicant.referenceContact,
          verificationNotes: applicant.verificationNotes,
          adminNotes: "",
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  return applicantDocs;
}

async function resetSeededActivity(seedUsers, seedCounsellors, adminResult) {
  const userIds = seedUsers.map((user) => user._id);
  const counsellorIds = seedCounsellors.map((user) => user._id);
  const participantIds = [...userIds, ...counsellorIds];

  if (adminResult?.email) {
    const admin = await User.findOne({ email: adminResult.email }).select("_id");
    if (admin) participantIds.push(admin._id);
  }

  await Promise.all([
    Review.deleteMany({ $or: [{ student: { $in: userIds } }, { counsellor: { $in: counsellorIds } }] }),
    Appointment.deleteMany({ $or: [{ student: { $in: userIds } }, { counsellor: { $in: counsellorIds } }] }),
    Journal.deleteMany({ user: { $in: userIds } }),
    Message.deleteMany({ $or: [{ from: { $in: participantIds } }, { to: { $in: participantIds } }] }),
    Payment.deleteMany({ user: { $in: userIds } }),
    Notification.deleteMany({ $or: [{ user: { $in: participantIds } }, { "metadata.seedBatch": SEED_BATCH }] }),
    OtpVerification.deleteMany({ user: { $in: participantIds } }),
    MoodEntry.deleteMany({ user: { $in: userIds } }),
    Assessment.deleteMany({ user: { $in: userIds } }),
    PeerReport.deleteMany({ reporter_uid: /^seed:/ }),
    PeerComment.deleteMany({ author_uid: /^seed:/ }),
    PeerPost.deleteMany({ author_uid: /^seed:/ }),
  ]);
}

async function seedPlatformActivity(seedUsers, seedCounsellors, adminResult) {
  const [ananya, rohan, isha, kavya] = seedUsers;
  const counsellorByEmail = Object.fromEntries(seedCounsellors.map((counsellor) => [counsellor.email, counsellor]));
  const aisha = counsellorByEmail["aisha.mehra@mindsupport.seed"];
  const rahul = counsellorByEmail["rahul.verma@mindsupport.seed"];
  const neha = counsellorByEmail["neha.iyer@mindsupport.seed"];
  const priya = counsellorByEmail["priya.nair@mindsupport.seed"];
  const kabir = counsellorByEmail["kabir.khan@mindsupport.seed"];

  const appointments = await Appointment.insertMany([
    {
      student: ananya._id,
      studentEmail: ananya.email,
      counsellor: aisha._id,
      counsellorName: aisha.name,
      date: daysFromToday(1),
      time: "15:00",
      mode: "google-meet",
      status: "confirmed",
      concern: "Exam anxiety and sleep disruption",
      ...supportPlanSeeds.short,
      supportPlanPrice: 1799,
      notes: "Prepare grounding exercise and follow-up plan.",
      meetingProvider: "google-meet",
      meetingLink: aisha.meetLink || seedMeetLink(),
    },
    {
      student: ananya._id,
      studentEmail: ananya.email,
      counsellor: neha._id,
      counsellorName: neha.name,
      date: daysFromToday(-5),
      time: "11:30",
      mode: "google-meet",
      status: "completed",
      concern: "Low motivation and social withdrawal",
      ...supportPlanSeeds.medium,
      supportPlanPrice: 2749,
      notes: "Completed session. Continue daily mood tracking.",
      meetingProvider: "google-meet",
      meetingLink: neha.meetLink || seedMeetLink(),
    },
    {
      student: rohan._id,
      studentEmail: rohan.email,
      counsellor: rahul._id,
      counsellorName: rahul.name,
      date: daysFromToday(2),
      time: "18:30",
      mode: "google-meet",
      status: "pending",
      concern: "Career pressure and interview stress",
      ...supportPlanSeeds.short,
      supportPlanPrice: 899,
      notes: "Awaiting counsellor confirmation.",
      meetingProvider: "google-meet",
      meetingLink: rahul.meetLink || seedMeetLink(),
    },
    {
      student: isha._id,
      studentEmail: isha.email,
      counsellor: priya._id,
      counsellorName: priya.name,
      date: daysFromToday(-12),
      time: "09:30",
      mode: "google-meet",
      status: "completed",
      concern: "Grounding support for trauma triggers",
      ...supportPlanSeeds.long,
      supportPlanPrice: 4799,
      notes: "Safety plan reviewed and resources shared.",
      meetingProvider: "google-meet",
      meetingLink: priya.meetLink || seedMeetLink(),
    },
    {
      student: kavya._id,
      studentEmail: kavya.email,
      counsellor: kabir._id,
      counsellorName: kabir.name,
      date: daysFromToday(4),
      time: "12:00",
      mode: "google-meet",
      status: "confirmed",
      concern: "Burnout, sleep routine, and workload balance",
      ...supportPlanSeeds.medium,
      supportPlanPrice: 2499,
      notes: "Bring sleep log for review.",
      meetingProvider: "google-meet",
      meetingLink: kabir.meetLink || seedMeetLink(),
    },
  ]);

  await Review.insertMany([
    {
      appointment: appointments[1]._id,
      student: ananya._id,
      counsellor: neha._id,
      professionalism: 5,
      helpfulness: 5,
      communication: 4,
      averageRating: 4.7,
      comment: "Clear recommendations and very calm follow-up.",
      anonymous: true,
      status: "approved",
    },
    {
      appointment: appointments[3]._id,
      student: isha._id,
      counsellor: priya._id,
      professionalism: 5,
      helpfulness: 5,
      communication: 5,
      averageRating: 5,
      comment: "Helped me create a realistic safety plan.",
      anonymous: true,
      status: "approved",
    },
  ]);

  await Journal.insertMany([
    {
      user: ananya._id,
      title: "Before tomorrow's session",
      content: "I feel nervous about exams, but the breathing exercise helped tonight.",
      mood: "anxious",
      gratitude: "My friend checked in after class.",
      trigger: "Late-night study pressure",
      sharedWithCounsellor: true,
      sharedAt: new Date(),
    },
    {
      user: ananya._id,
      title: "Small win",
      content: "Finished one chapter and took a walk instead of skipping lunch.",
      mood: "hopeful",
      gratitude: "A quiet evening.",
      trigger: "Revision backlog",
      sharedWithCounsellor: false,
    },
    {
      user: rohan._id,
      title: "Interview pressure",
      content: "I keep comparing myself with classmates. Need to plan one practical next step.",
      mood: "stressed",
      gratitude: "Updated my resume.",
      trigger: "Placement group messages",
      sharedWithCounsellor: false,
    },
    {
      user: isha._id,
      title: "Grounding worked",
      content: "The 5-4-3-2-1 grounding technique helped when I felt overwhelmed.",
      mood: "steady",
      gratitude: "Music and a supportive teacher.",
      trigger: "Crowded hallway",
      sharedWithCounsellor: true,
      sharedAt: new Date(),
    },
  ]);

  const moodDocs = [];
  const moodPatterns = [
    { user: ananya, moods: [4, 3, 4, 4, 5, 3, 4] },
    { user: rohan, moods: [3, 3, 4, 2, 3, 4, 3] },
    { user: isha, moods: [4, 4, 5, 4, 3, 4, 5] },
    { user: kavya, moods: [3, 4, 3, 4, 4, 5, 4] },
  ];
  for (const pattern of moodPatterns) {
    pattern.moods.forEach((mood, index) => {
      moodDocs.push({
        user: pattern.user._id,
        userKey: pattern.user.email,
        mood,
        note: ["Good day overall", "A bit stressed", "Used breathing practice", "Slept better"][index % 4],
        date: daysFromToday(index - 6),
      });
    });
  }
  await MoodEntry.insertMany(moodDocs);

  await Assessment.insertMany([
    {
      user: ananya._id,
      userKey: ananya.email,
      type: "phq9",
      responses: { q1: 1, q2: 1, q3: 2, q4: 1, q5: 0, q6: 1, q7: 1, q8: 0, q9: 0 },
      score: 7,
      level: "low",
      recommendations: ["Continue daily mood tracking", "Book a follow-up if sleep worsens"],
    },
    {
      user: rohan._id,
      userKey: rohan.email,
      type: "gad7",
      responses: { q1: 2, q2: 2, q3: 1, q4: 2, q5: 1, q6: 1, q7: 1 },
      score: 10,
      level: "moderate",
      recommendations: ["Try the stress management guide", "Discuss interview anxiety in the next session"],
    },
    {
      user: isha._id,
      userKey: isha.email,
      type: "phq9",
      responses: { q1: 1, q2: 0, q3: 1, q4: 1, q5: 0, q6: 0, q7: 1, q8: 0, q9: 0 },
      score: 4,
      level: "low",
      recommendations: ["Keep grounding resources available", "Share triggers when comfortable"],
    },
  ]);

  await OtpVerification.create({
    user: ananya._id,
    channel: "email",
    destination: ananya.email,
    codeHash: await bcrypt.hash(crypto.randomUUID(), 10),
    purpose: "seed-expired-verification-demo",
    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    consumedAt: new Date(),
  });

  await Message.insertMany([
    {
      from: aisha._id,
      to: ananya._id,
      appointment: appointments[0]._id,
      subject: "Session reminder",
      text: "Hi Ananya, your Google Meet session is confirmed for tomorrow at 3:00 PM.",
      readBy: [aisha._id],
    },
    {
      from: ananya._id,
      to: aisha._id,
      appointment: appointments[0]._id,
      subject: "Sleep question",
      text: "Thank you. I will bring my mood notes. Sleep was difficult yesterday.",
      readBy: [ananya._id, aisha._id],
    },
    {
      from: rahul._id,
      to: rohan._id,
      appointment: appointments[2]._id,
      subject: "Booking request",
      text: "I received your request. Please share one interview situation you want to practice.",
      task: "Write down one interview question that feels difficult.",
      readBy: [rahul._id],
    },
    {
      from: priya._id,
      to: isha._id,
      appointment: appointments[3]._id,
      subject: "Grounding plan",
      text: "Keep the grounding card nearby. Message me after trying it twice this week.",
      fileName: "grounding-plan.pdf",
      fileUrl: "https://example.com/resources/grounding-plan.pdf",
      readBy: [priya._id, isha._id],
    },
  ]);

  await Payment.insertMany([
    {
      user: ananya._id,
      appointment: appointments[0]._id,
      invoiceNumber: "MS-SEED-INV-1001",
      amount: 1799,
      ...paymentSplit(1799),
      currency: "INR",
      kind: "session",
      plan: "Short-Term Support one-time booking",
      description: "Confirmed anxiety counselling package",
      status: "paid",
      paidAt: new Date(),
    },
    {
      user: isha._id,
      appointment: appointments[3]._id,
      invoiceNumber: "MS-SEED-INV-1003",
      amount: 4799,
      ...paymentSplit(4799),
      currency: "INR",
      kind: "session",
      plan: "Long-Term Therapy one-time booking",
      description: "Completed Google Meet counselling package",
      status: "paid",
      paidAt: new Date(),
    },
  ]);

  await Notification.insertMany([
    {
      user: ananya._id,
      type: "session",
      title: "Upcoming Google Meet session",
      message: "Your session with Aisha Mehra starts tomorrow at 3:00 PM.",
      metadata: { seedBatch: SEED_BATCH },
    },
    {
      user: rohan._id,
      type: "booking",
      title: "Booking request pending",
      message: "Rahul Verma will accept or reschedule your career pressure session soon.",
      metadata: { seedBatch: SEED_BATCH },
    },
    {
      audienceRole: "admin",
      type: "application",
      title: "Counsellor applications waiting",
      message: "Two seeded counsellor verification requests are pending review.",
      metadata: { seedBatch: SEED_BATCH },
    },
    {
      audienceRole: "all",
      type: "announcement",
      title: "Safety reminder",
      message: "MindSupport provides emotional support and does not replace emergency medical care.",
      metadata: { seedBatch: SEED_BATCH },
    },
  ]);

  const post = await PeerPost.create({
    author_uid: "seed:ananya",
    alias: "QuietStar",
    category: "Student Pressure",
    content: "Sharing a tiny win: I studied for 25 minutes and then actually rested.",
    up: 18,
    down: 0,
  });
  const comment = await PeerComment.create({
    post_id: post._id,
    author_uid: "seed:rohan",
    alias: "SteadySteps",
    content: "This helped me try the same 25 minute focus block today.",
  });
  await PeerReport.create({
    post_id: post._id,
    comment_id: comment._id,
    reporter_uid: "seed:moderation",
    reason: "Seed report for admin moderation workflow",
    status: "reviewing",
  });

  if (adminResult?.email) {
    const admin = await User.findOne({ email: adminResult.email });
    if (admin) {
      await Notification.create({
        user: admin._id,
        type: "security",
        title: "Admin account ready",
        message: "Manual admin login has been seeded from environment variables.",
        metadata: { seedBatch: SEED_BATCH },
      });
    }
  }
}

async function getCollectionCounts() {
  const entries = await Promise.all(
    collectionModels.map(async (model) => [model.collection.collectionName, await model.countDocuments()])
  );
  return Object.fromEntries(entries);
}

async function seedDatabase() {
  await ensureMongoCollections();
  for (const resource of curatedResources) {
    const seededResource = {
      ...resource,
      thumbnail: seedResourceThumbnail(resource),
    };
    await Resource.updateOne(
      { title: seededResource.title },
      {
        $set: seededResource,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  const admin = await seedAdminAccount();
  const seedUserDocs = [];
  for (const user of seededUsers) {
    seedUserDocs.push(
      await upsertSeedUser({
        ...user,
        role: "user",
        status: "active",
        verificationStatus: "none",
      })
    );
  }

  const approvedCounsellors = await seedApprovedCounsellors();
  const pendingApplicants = await seedPendingCounsellorApplications();
  await resetSeededActivity(seedUserDocs, [...approvedCounsellors, ...pendingApplicants], admin);
  await seedPlatformActivity(seedUserDocs, approvedCounsellors, admin);

  return {
    admin,
    collections: await getCollectionCounts(),
  };
}

export { seedDatabase };
