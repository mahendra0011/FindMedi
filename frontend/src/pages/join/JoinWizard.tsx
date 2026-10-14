/**
 * # 01 — Join FindMedi: Config-Driven Provider Onboarding Wizard
 *
 * Unified onboarding for all 46 provider types across 8 display groups:
 * - Healthcare Facilities (Hospital, Clinic, Diagnostic, Blood Bank, Day-care, etc.)
 * - Practitioners (Doctor, Dentist, Ayush, Dietitian, Physio, Counsellor, etc.)
 * - Wellness & Fitness (Yoga, Gym, Wellness Centre, Sports Academy, Trainer)
 * - Commerce (Pharmacy, Equipment Rental, Health Store, Supplements, Devices)
 * - Home Services (Home Nursing, Attendant/Caregiver, Sample Collection, Home Physio)
 * - Transport / Delivery (Delivery Partner, Rider/Driver, Patient Transport, Ambulance)
 * - Community (NGO, Event/Camp Organizer, Support Group, CPR/First-aid Training)
 * - Professional (Lawyer, Insurance/TPA Desk)
 *
 * Strict boundary: zero out-of-scope/faltu categories (no pet care, tattoo, funeral, medical tourism).
 * Server-authoritative: loads configs from GET /api/config/provider-types,
 * with comprehensive 46-type offline fallback.
 * Auto-draft sync, document upload, status tracker, and multilingual (EN/HI).
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Stethoscope,
  Microscope,
  Pill,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
  Plus,
  X,
  Users,
  Star,
  Award,
  CalendarDays,
  BadgeCheck,
  Loader2,
  Shield,
  Heart,
  Eye,
  EyeOff,
  Activity,
  Lock,
  Globe,
  Image as ImageIcon,
  UserRound,
  BarChart3,
  Truck,
  FileImage,
  IndianRupee,
  Calendar,
  AlertCircle,
  MessageSquare,
  Video,
  Ambulance,
  RotateCcw,
  Home,
  Car,
  Scale,
  Briefcase,
  Brain,
  HeartHandshake,
  GraduationCap,
  BrainCircuit,
  Dumbbell,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Upload,
  FileCheck,
  Search,
  HelpCircle,
  FolderOpen,
  Send,
  CheckCircle,
  ExternalLink,
  HeartPulse,
  Smile,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api, apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ActivationPanel from './ActivationPanel';
import fallbackCatalogData from '@/data/providerTypeCatalogFallback.json';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface WizardField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  help?: string;
}

interface WizardStep {
  key: string;
  label: string;
  fields: string[];
}

interface DocSpec {
  key: string;
  label: string;
  mandatory: boolean;
  expiryRequired: boolean;
  maxMb?: number;
}

interface ProviderTypeConfigDto {
  typeKey: string;
  kind: string;
  group: string;
  tier: string;
  label: string;
  icon: string;
  description: string;
  steps: WizardStep[];
  fields: WizardField[];
  requiredDocs: DocSpec[];
  optionalDocs: DocSpec[];
  agreementTemplateId: string;
  approvalPolicy?: {
    slaHours?: number;
    level?: string;
    twoPerson?: boolean;
  };
  version: number;
}

type FieldValue = string | number | boolean | string[];
type StepValues = Record<string, FieldValue>;
type DraftState = Record<string, StepValues>;

interface ApplicationSummary {
  _id: string;
  applicationId?: string;
  typeKey: string;
  status: 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'expired';
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
  providerId?: string | null;
  // 2.md 11 — the submit-time anti-fraud screen (absent on legacy rows).
  autoChecks?: {
    verdict?: 'unchecked' | 'clear' | 'review' | 'conflict' | 'error';
    forceTwoPerson?: boolean;
    runAt?: string;
    checks?: Array<{ key: string; status: string; severity: string; note: string }>;
  };
  needsInfo?: Array<{ docKey?: string; comment?: string; by?: string; at?: string; resolvedAt?: string | null }>;
  draft?: { stepData?: DraftState };
}

/* ── i18n ──────────────────────────────────────────────────────────────── */

type Lang = 'en' | 'hi';

const STRINGS = {
  en: {
    title: 'Join FindMedi Network',
    subtitle: 'Register your facility, medical practice, or healthcare service on India’s leading healthcare platform.',
    searchPh: 'Search 50+ provider types (e.g. Hospital, Dentist, Gym, Pharmacy, Ambulance)…',
    quizTitle: 'Not sure which category fits your organization?',
    quizSubtitle: 'Answer 3 quick questions to discover your optimal onboarding flow.',
    quizCta: 'Find my category',
    quizAgain: 'Reset quiz',
    suggested: 'Recommended category',
    pickType: 'Get Started',
    backToTypes: '← All Provider Categories',
    stepOf: 'Step',
    of: 'of',
    next: 'Continue',
    back: 'Previous',
    saveExit: 'Save Draft',
    savedOn: 'Cloud synced',
    savedLocal: 'Saved locally on device',
    submit: 'Submit Application',
    submitDone: 'Application Submitted Successfully 🎉',
    agreeRequired: 'Please review and accept all required declarations to proceed.',
    fixStep: 'Please complete all required fields marked with *.',
    declaration: 'I hereby declare that all information submitted is true, correct, and legally compliant.',
    docsTitle: 'Regulatory & Identity Verification Documents',
    docsSubtitle: 'Upload clear scans or photos of your government, regulatory, and tax documents.',
    upload: 'Choose File',
    uploaded: 'Uploaded ✓',
    expiryPh: 'Document Expiry Date',
    alreadyRegistered: 'Already registered? Check your application status →',
    myAppsTitle: 'My Applications & Onboarding Status',
    noApps: 'You have not submitted any applications yet.',
    startNewApp: '+ Start New Application',
    underReviewBadge: 'Under Review',
    actionRequiredBadge: 'Action Required',
    approvedBadge: 'Approved & Active',
    rejectedBadge: 'Needs Revision / Rejected',
    expiredBadge: 'Draft Expired',
    expiredNote: 'This draft expired after 30 days of inactivity. Nothing from it is retained - start a new application to continue.',
    appealBtn: 'Appeal Decision',
    fixAndResubmit: 'Review & Resubmit',
    resumeDraft: 'Resume Draft',
    stageDraft: 'Draft',
    stageSubmitted: 'Submitted',
    stageScreening: 'Auto-screen',
    stageReview: 'Review',
    stageDecision: 'Decision',
    stageActivation: 'Activation',
  },
  hi: {
    title: 'FindMedi नेटवर्क से जुड़ें',
    subtitle: 'अपनी स्वास्थ्य सुविधा, क्लिनिक या वेलनेस सेवा को भारत के प्रमुख हेल्थकेयर प्लेटफॉर्म पर रजिस्टर करें।',
    searchPh: '50+ प्रोवाइडर प्रकार खोजें (उदा. Hospital, Dentist, Gym, Pharmacy, Ambulance)…',
    quizTitle: 'सही श्रेणी चुनने में सहायता चाहिए?',
    quizSubtitle: 'अपनी संस्था के लिए उपयुक्त ऑनबोर्डिंग श्रेणी खोजने हेतु 3 प्रश्नों के उत्तर दें।',
    quizCta: 'श्रेणी का सुझाव देखें',
    quizAgain: 'Quiz रीसेट करें',
    suggested: 'आपके लिए अनुशंसित',
    pickType: 'शुरू करें',
    backToTypes: '← सभी श्रेणियां',
    stepOf: 'चरण',
    of: '/',
    next: 'आगे बढ़ें',
    back: 'पीछे',
    saveExit: 'ड्राफ्ट सहेजें',
    savedOn: 'क्लाउड में सुरक्षित',
    savedLocal: 'डिवाइस पर सुरक्षित',
    submit: 'आवेदन जमा करें',
    submitDone: 'आवेदन सफलतापूर्वक जमा किया गया 🎉',
    agreeRequired: 'आगे बढ़ने के लिए कृपया सभी अनिवार्य नियम व शर्तें स्वीकार करें।',
    fixStep: 'कृपया * वाले सभी अनिवार्य फ़ील्ड भरें।',
    declaration: 'मैं पुष्टि करता/करती हूँ कि दी गई जानकारी पूर्णतः सत्य, सटीक और वैध है।',
    docsTitle: 'वैधानिक एवं पहचान सत्यापन दस्तावेज़',
    docsSubtitle: 'कृपया अपने सरकारी, विनियामक और टैक्स दस्तावेज़ों की स्पष्ट प्रतियां अपलोड करें।',
    upload: 'फ़ाइल चुनें',
    uploaded: 'अपलोड हुआ ✓',
    expiryPh: 'दस्तावेज़ समाप्ति तिथि',
    alreadyRegistered: 'पहले से पंजीकृत हैं? अपने आवेदन की स्थिति देखें →',
    myAppsTitle: 'मेरे आवेदन एवं ऑनबोर्डिंग स्थिति',
    noApps: 'आपने अभी तक कोई आवेदन जमा नहीं किया है।',
    startNewApp: '+ नया आवेदन शुरू करें',
    underReviewBadge: 'समीक्षाधीन',
    actionRequiredBadge: 'सुधार अपेक्षित',
    approvedBadge: 'स्वीकृत एवं सक्रिय',
    rejectedBadge: 'संशोधन आवश्यक / अस्वीकृत',
    expiredBadge: 'ड्राफ्ट समाप्त',
    expiredNote: 'यह ड्राफ्ट 30 दिन की निष्क्रियता के बाद समाप्त हो गया। इसका कोई डेटा सुरक्षित नहीं है - जारी रखने के लिए नया आवेदन शुरू करें।',
    appealBtn: 'पुनर्विचार अपील',
    fixAndResubmit: 'सुधारें और पुनः भेजें',
    resumeDraft: 'ड्राफ्ट जारी रखें',
    stageDraft: 'ड्राफ्ट',
    stageSubmitted: 'जमा',
    stageScreening: 'स्वचालित जाँच',
    stageReview: 'समीक्षा',
    stageDecision: 'निर्णय',
    stageActivation: 'सक्रियण',
  },
} as const;

type StringKey = keyof typeof STRINGS.en;

/* ── 2.md 6 — applicant-visible stage tracker ───────────────────────────── */

type StageState = 'done' | 'current' | 'attention' | 'failed' | 'pending';

const STAGE_CLASS: Record<StageState, string> = {
  done: 'bg-primary/10 text-primary border-primary/30',
  current: 'bg-primary text-primary-foreground border-primary font-semibold',
  attention: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-muted text-muted-foreground/70 border-border',
};

const STAGE_MARK: Record<StageState, string> = {
  done: '✓',
  current: '●',
  attention: '!',
  failed: '✕',
  pending: '',
};

/**
 * One row per stage, derived only from fields the list payload already has —
 * never a second fetch. Invariant: at most ONE stage is `current` (attention
 * and failed are signals, not cursors), so the eye always has one place to
 * land. `expired` never reaches here (the row swaps the tracker for its note).
 */
const stageTrack = (app: ApplicationSummary): Array<{ key: StringKey; state: StageState }> => {
  const s = app.status;
  const decided = s === 'approved' || s === 'rejected';
  const verdict = app.autoChecks?.verdict;
  const flagged = verdict === 'review' || verdict === 'conflict' || verdict === 'error';

  return [
    { key: 'stageDraft', state: s === 'draft' ? 'current' : 'done' },
    { key: 'stageSubmitted', state: s === 'draft' ? 'pending' : (s === 'submitted' || s === 'resubmitted' ? 'current' : 'done') },
    // Screening runs AT submit: post-submit it can only be done (clear) or
    // attention (flag) — never a lingering cursor.
    { key: 'stageScreening', state: s === 'draft' ? 'pending' : (flagged ? 'attention' : 'done') },
    {
      key: 'stageReview',
      state: s === 'under_review' ? 'current'
        : s === 'needs_info' ? 'attention'
        : decided ? 'done'
        : 'pending',
    },
    { key: 'stageDecision', state: s === 'approved' ? 'done' : s === 'rejected' ? 'failed' : 'pending' },
    // Activation details live in ActivationPanel below the row (approved only).
    { key: 'stageActivation', state: s === 'approved' ? 'current' : 'pending' },
  ];
};

/* ── 8 Display Groups ─────────────────────────────────────────────────── */

interface DisplayGroup {
  key: string;
  emoji: string;
  labelEn: string;
  labelHi: string;
  descEn: string;
}

const DISPLAY_GROUPS: DisplayGroup[] = [
  { key: 'facilities', emoji: '🏥', labelEn: 'Healthcare facilities', labelHi: 'स्वास्थ्य सुविधाएँ', descEn: 'Hospitals, polyclinics, diagnostic labs, day care, blood banks' },
  { key: 'practitioners', emoji: '👨‍⚕️', labelEn: 'Practitioners (Individual)', labelHi: 'चिकित्सक (व्यक्तिगत)', descEn: 'Doctors, dentists, psychologists, dietitians, physiotherapists' },
  { key: 'wellness', emoji: '🧘', labelEn: 'Wellness & fitness', labelHi: 'वेलनेस व फिटनेस', descEn: 'Yoga studios, fitness centers, meditation, sports academies' },
  { key: 'commerce', emoji: '🛒', labelEn: 'Commerce & supplies', labelHi: 'कॉमर्स व उपकरण', descEn: 'Pharmacies, medical equipment rental, optical, health stores' },
  { key: 'home_service', emoji: '🏠', labelEn: 'Home services', labelHi: 'होम स्वास्थ्य सेवाएँ', descEn: 'Home nursing, elder care attendants, home phlebotomy' },
  { key: 'transport', emoji: '🚑', labelEn: 'Transport & logistics', labelHi: 'परिवहन व डिलीवरी', descEn: 'Ambulance fleets, medicine delivery partners, driver riders' },
  { key: 'community', emoji: '🎪', labelEn: 'Community & outreach', labelHi: 'सामुदायिक स्वास्थ्य', descEn: 'Health NGOs, screening camps, CPR/BLS training providers' },
  { key: 'professional', emoji: '⚖️', labelEn: 'Professional services', labelHi: 'पेशेवर सेवाएँ', descEn: 'Medico-legal advocates, hospital assistants, TPA insurance desks' },
];

function displayGroupOf(t: ProviderTypeConfigDto): string {
  if (t.group === 'clinical') return t.kind === 'practitioner' ? 'practitioners' : 'facilities';
  return t.group;
}

/* ── Icon Component Resolver ─────────────────────────────────────────── */

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Building2,
  Stethoscope,
  Microscope,
  Pill,
  Smile: HeartPulse,
  Eye,
  EyeHospital: Eye,
  Activity,
  HeartPulse,
  BrainCircuit,
  Ambulance,
  Car,
  Truck,
  Scale,
  Brain,
  HeartHandshake,
  GraduationCap,
  Dumbbell,
  Flower2: Sparkles,
  ShieldCheck,
  ShoppingBag: Pill,
  Users,
  Home,
  Briefcase,
  FileText,
};

function resolveIcon(iconName: string): ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || Stethoscope;
}

/* ── Contact fields pre-populated on Account step ──────────────────────── */

const ACCOUNT_CONTACT_FIELDS: WizardField[] = [
  { key: 'contact_name', label: 'Authorized Contact Name', type: 'text', required: true, help: 'Legal owner or designated administrator' },
  { key: 'contact_phone', label: 'Primary Mobile Number', type: 'phone', required: true, help: 'For OTP verification and critical notices' },
  { key: 'contact_email', label: 'Official Email Address', type: 'email', required: true, help: 'For official compliance correspondence' },
];

/* ── Legacy Type Name Normalizer ───────────────────────────────────────── */

const LEGACY_TYPE_MAP: Record<string, string> = {
  hospital: 'hospital',
  clinic: 'clinic',
  diagnostic: 'diagnostic',
  pharmacy: 'pharmacy',
  delivery: 'delivery',
  rider: 'rider',
  assistant: 'assistant',
  lawyer: 'lawyer',
  counsellor: 'counsellor',
  psychiatrist: 'psychiatrist',
  doctor: 'doctor',
  dentist: 'dentist',
  gym: 'gym',
  yoga: 'yoga_studio',
  ambulance: 'ambulance_operator',
};

/* ── Main Component ───────────────────────────────────────────────────── */

const LS_LANG = 'findmedi:lang';
const lsDraftKey = (typeKey: string) => `findmedi:join:draft:${typeKey}`;

export default function JoinWizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, login, register: registerUser } = useAuth();

  const [lang, setLang] = useState<Lang>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(LS_LANG) === 'hi' ? 'hi' : 'en',
  );
  const t = useCallback((k: StringKey): string => STRINGS[lang][k] ?? k, [lang]);

  const [types, setTypes] = useState<ProviderTypeConfigDto[]>(
    (fallbackCatalogData as unknown as ProviderTypeConfigDto[]) || [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [quiz, setQuiz] = useState({ setting: '', org: '', offer: '' });
  const [quizDone, setQuizDone] = useState(false);

  const [selected, setSelected] = useState<ProviderTypeConfigDto | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  // 2.md 6 — the reviewer's needs_info items follow the loaded application so
  // the wizard can land on (and annotate) exactly the step that must be fixed.
  const [needsInfoItems, setNeedsInfoItems] = useState<ApplicationSummary['needsInfo']>([]);
  const [draft, setDraft] = useState<DraftState>({});
  const [stepError, setStepError] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submittedAppRef, setSubmittedAppRef] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // My Applications View State
  const [viewMode, setViewMode] = useState<'chooser' | 'my-applications'>('chooser');
  const [myApplications, setMyApplications] = useState<ApplicationSummary[]>([]);
  const [loadingMyApps, setLoadingMyApps] = useState(false);

  // Auth Dialog Modal for unauthenticated visitors
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_LANG, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Fetch active provider types from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await api.get('/config/provider-types')) as unknown as {
          providerTypes?: ProviderTypeConfigDto[];
        };
        const list = Array.isArray(res?.providerTypes) ? res.providerTypes : [];
        if (cancelled) return;
        if (list.length > 0) {
          setTypes(list);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'API offline — displaying catalog fallback');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle URL query parameters (?type=hospital or ?group=facilities or ?id=appId)
  useEffect(() => {
    if (types.length === 0) return;

    const rawType = searchParams.get('type');
    const groupParam = searchParams.get('group');
    const appIdParam = searchParams.get('id') || searchParams.get('applicationId');

    if (groupParam && DISPLAY_GROUPS.some((g) => g.key === groupParam)) {
      setActiveGroup(groupParam);
    }

    if (rawType && !selected) {
      const normalizedKey = LEGACY_TYPE_MAP[rawType.toLowerCase()] || rawType.toLowerCase();
      const match = types.find((t) => t.typeKey === normalizedKey || t.typeKey.toLowerCase() === rawType.toLowerCase());
      if (match) {
        pickType(match);
      }
    }

    if (appIdParam && !applicationId && isAuthenticated) {
      loadServerApplication(appIdParam);
    }
  }, [types, searchParams, isAuthenticated]);

  // Declared before loadServerApplication: its deps array reads this map
  // eagerly on every render (it also drives the resume-index computation).
  const fieldByKey = useMemo(() => {
    const map = new Map<string, WizardField>();
    for (const f of selected?.fields ?? []) map.set(f.key, f);
    for (const f of ACCOUNT_CONTACT_FIELDS) map.set(f.key, f);
    return map;
  }, [selected]);

  // Fetch applicant's own applications list
  const fetchMyApplications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingMyApps(true);
    try {
      const res = (await api.get('/join')) as unknown as {
        applications?: ApplicationSummary[];
      };
      setMyApplications(Array.isArray(res?.applications) ? res.applications : []);
    } catch {
      setMyApplications([]);
    } finally {
      setLoadingMyApps(false);
    }
  }, [isAuthenticated]);

  // Load existing application from server
  const loadServerApplication = useCallback(async (appId: string) => {
    try {
      const res = (await api.get(`/join/${appId}`)) as unknown as {
        application?: ApplicationSummary;
      };
      if (res?.application) {
        const app = res.application;
        // Drafts expire after 30 days of inactivity (2.md join / backend job
        // joinDraftExpiry). An old ?id= link to one must not reopen a dead
        // wizard - the PATCH would 409 anyway - so land on the list, where
        // the Expired badge explains and offers a fresh application.
        if (app.status === 'expired') {
          setViewMode('my-applications');
          fetchMyApplications();
          return;
        }
        const matchingType = types.find((t) => t.typeKey === app.typeKey);
        if (matchingType) {
          setSelected(matchingType);
          setApplicationId(app._id);
          setSubmittedAppRef(app.applicationId || app._id);
          if (app.draft?.stepData) {
            setDraft(app.draft.stepData);
          }
          if (app.status === 'submitted' || app.status === 'under_review' || app.status === 'approved') {
            setSubmitted(true);
          }
          // 2.md 6: `needs_info` re-opens at the step the reviewer flagged
          // (documents), a draft resumes at the first step with a missing
          // required field, and either way the list hands over to the wizard —
          // previously neither happened, so Resume/Resubmit looked dead.
          setNeedsInfoItems(app.status === 'needs_info' ? (app.needsInfo ?? []) : []);
          const resumeIdx = (() => {
            if (app.status === 'needs_info') {
              const docs = matchingType.steps.findIndex((s) => s.key === 'documents');
              if (docs >= 0) return docs;
            }
            const data = app.draft?.stepData ?? {};
            const idx = matchingType.steps.findIndex((s) => {
              if (s.key === 'documents' || s.key === 'review') return false;
              const fields = s.key === 'account'
                ? ACCOUNT_CONTACT_FIELDS
                : s.fields.map((k) => fieldByKey.get(k)).filter(Boolean);
              return fields.some((f) => validateValue(f as WizardField, (data[s.key] ?? {})[(f as WizardField).key]) !== null);
            });
            return idx >= 0 ? idx : 0;
          })();
          setStepIdx(resumeIdx);
          setStepError('');
          setViewMode('chooser');
          setSaveState('saved');
        }
      }
    } catch (e) {
      console.warn('Failed to resume application from server', e);
    }
  }, [types, fieldByKey, fetchMyApplications]);

  const openMyApplications = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setViewMode('my-applications');
    fetchMyApplications();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return types.filter((x) => {
      if (activeGroup !== 'all' && displayGroupOf(x) !== activeGroup) return false;
      if (!q) return true;
      return [x.label, x.typeKey, x.description, x.tier, x.group].join(' ').toLowerCase().includes(q);
    });
  }, [types, query, activeGroup]);

  const groupedCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of types) m.set(displayGroupOf(x), (m.get(displayGroupOf(x)) ?? 0) + 1);
    return m;
  }, [types]);

  const suggestion = useMemo(() => {
    if (!quizDone) return null;
    const { setting, org, offer } = quiz;
    if (!setting || !org || !offer) return null;

    if (offer === 'fitness') return 'wellness';
    if (offer === 'goods') return 'commerce';
    if (offer === 'events') return 'community';
    if (offer === 'legal_or_insurance') return 'professional';
    if (setting === 'patient_home') return 'home_service';
    if (setting === 'online' && org === 'individual') return 'practitioners';
    if (setting === 'own_studio_or_shop') return 'wellness';
    if (setting === 'outdoors_events') return 'transport';
    return org === 'individual' ? 'practitioners' : 'facilities';
  }, [quizDone, quiz]);

  /* ── Draft management & server syncing ─────────────────────────────────── */

  const loadLocalDraft = useCallback((typeKey: string) => {
    try {
      const raw = window.localStorage.getItem(lsDraftKey(typeKey));
      if (raw) setDraft(JSON.parse(raw) as DraftState);
      else setDraft({});
    } catch {
      setDraft({});
    }
  }, []);

  const pickType = useCallback(
    (cfg: ProviderTypeConfigDto) => {
      setSelected(cfg);
      setStepIdx(0);
      setStepError('');
      setSubmitted(false);
      setApplicationId(null);
      setNeedsInfoItems([]);
      setSaveState('idle');
      loadLocalDraft(cfg.typeKey);

      // Pre-fill user contact info if logged in
      if (user) {
        setDraft((prev) => ({
          ...prev,
          account: {
            contact_name: user.name || '',
            contact_email: user.email || '',
            contact_phone: user.phone || '',
            ...(prev['account'] || {}),
          },
        }));
      }

      // If user is authenticated, create or attach to a server application draft
      if (isAuthenticated) {
        api
          .post('/join', { typeKey: cfg.typeKey })
          .then((res: unknown) => {
            const app = (res as { application?: { _id?: string; applicationId?: string } })?.application;
            if (app?._id) {
              setApplicationId(app._id);
              if (app.applicationId) setSubmittedAppRef(app.applicationId);
              setSaveState('saved');
            }
          })
          .catch(() => {
            setSaveState('local');
          });
      } else {
        setSaveState('local');
      }
    },
    [loadLocalDraft, isAuthenticated, user],
  );

  const persistDraft = useCallback((next: DraftState, typeKey: string, appId: string | null) => {
    try {
      window.localStorage.setItem(lsDraftKey(typeKey), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    if (!appId) {
      setSaveState('local');
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      const lastStep = Object.keys(next).pop();
      const payload = lastStep ? { [lastStep]: next[lastStep] } : next;
      apiClient({ url: `/join/${appId}`, method: 'PATCH', data: { draft: payload } })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('local'));
    }, 800);
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const setStepValue = useCallback(
    (stepKey: string, fieldKey: string, v: FieldValue) => {
      if (!selected) return;
      setDraft((prev) => {
        const next = { ...prev, [stepKey]: { ...(prev[stepKey] ?? {}), [fieldKey]: v } };
        persistDraft(next, selected.typeKey, applicationId);
        return next;
      });
    },
    [selected, applicationId, persistDraft],
  );

  /* ── Step Navigation & Validation ─────────────────────────────────────── */

  const steps = selected?.steps ?? [];
  const current = steps[stepIdx];
  const values: StepValues = current ? draft[current.key] ?? {} : {};

  const stepFields: WizardField[] = useMemo(() => {
    if (!selected || !current) return [];
    const out: WizardField[] = [];
    if (current.key === 'account') out.push(...ACCOUNT_CONTACT_FIELDS);
    for (const k of current.fields) {
      const f = fieldByKey.get(k);
      if (f) out.push(f);
    }
    return out;
  }, [selected, current, fieldByKey]);

  const isDocsStep = current?.key === 'documents';
  const isReviewStep = current?.key === 'review';

  const validateStep = useCallback((): boolean => {
    if (!selected || !current) return false;
    if (isReviewStep) {
      const decl = values['declaration'];
      if (decl !== true) {
        setStepError(t('agreeRequired'));
        return false;
      }
      return true;
    }
    if (isDocsStep) return true;
    for (const f of stepFields) {
      const err = validateValue(f, values[f.key]);
      if (err) {
        setStepError(err);
        return false;
      }
    }
    setStepError('');
    return true;
  }, [selected, current, isReviewStep, isDocsStep, stepFields, values, t]);

  const goNext = () => {
    if (!validateStep()) return;
    setStepError('');
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepError('');
    if (stepIdx === 0) {
      setSelected(null);
      return;
    }
    setStepIdx((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!selected || !validateStep()) return;

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    setStepError('');
    try {
      let appId = applicationId;
      if (!appId) {
        const res = (await api.post('/join', { typeKey: selected.typeKey })) as unknown as {
          application?: { _id?: string; applicationId?: string };
        };
        appId = res?.application?._id ?? null;
        if (appId) {
          setApplicationId(appId);
          if (res?.application?.applicationId) setSubmittedAppRef(res.application.applicationId);
        }
      }
      if (appId) {
        await apiClient({ url: `/join/${appId}`, method: 'PATCH', data: { draft } });
        const submitRes = (await api.post(`/join/${appId}/submit`, {})) as unknown as {
          application?: { applicationId?: string };
        };
        if (submitRes?.application?.applicationId) {
          setSubmittedAppRef(submitRes.application.applicationId);
        }
      }
      try {
        window.localStorage.removeItem(lsDraftKey(selected.typeKey));
      } catch {
        /* ignore */
      }
      setSubmitted(true);
      setNeedsInfoItems([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Submit failed. Please verify required fields and documents.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = steps.length > 0 ? Math.round(((stepIdx + 1) / steps.length) * 100) : 0;

  // Inline Auth handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authIsLogin) {
        await login(authEmail, authPassword);
      } else {
        await registerUser({
          email: authEmail,
          password: authPassword,
          name: authName || authEmail.split('@')[0],
          phone: authPhone,
          role: 'doctor', // default guest provider role
        });
      }
      setAuthModalOpen(false);

      // Once authenticated, sync draft to cloud immediately
      if (selected) {
        const res = (await api.post('/join', { typeKey: selected.typeKey })) as unknown as {
          application?: { _id?: string; applicationId?: string };
        };
        const newAppId = res?.application?._id;
        if (newAppId) {
          setApplicationId(newAppId);
          if (res?.application?.applicationId) setSubmittedAppRef(res.application.applicationId);
          await apiClient({ url: `/join/${newAppId}`, method: 'PATCH', data: { draft } });
          setSaveState('saved');
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading FindMedi Provider Specifications…</p>
      </div>
    );
  }

  /* ── My Applications View ── */
  if (viewMode === 'my-applications') {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode('chooser')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t('backToTypes')}
            </button>
            <Button onClick={() => setViewMode('chooser')} size="sm">
              {t('startNewApp')}
            </Button>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FolderOpen className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('myAppsTitle')}</h1>
                <p className="text-sm text-muted-foreground">Track approvals, review SLA timers, and resolve revision requests.</p>
              </div>
            </div>

            {loadingMyApps ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : myApplications.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">{t('noApps')}</p>
                <Button onClick={() => setViewMode('chooser')} variant="outline">
                  {t('startNewApp')}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myApplications.map((app) => {
                  const cfg = types.find((x) => x.typeKey === app.typeKey);
                  // 2.md 11 — a submit-time screen verdict is a signal to the
                  // APPLICANT too: `clear` stays quiet, anything else shows.
                  const verdict = app.autoChecks?.verdict;
                  const screenFlagged = verdict === 'review' || verdict === 'conflict' || verdict === 'error';
                  return (
                    <Fragment key={app._id}>
                    <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{cfg?.label || app.typeKey}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-muted text-muted-foreground">
                            {app.applicationId || app._id.slice(-8)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'} · SLA:{' '}
                          {cfg?.approvalPolicy?.slaHours ?? 24}h
                        </p>
                        {app.status !== 'expired' && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {stageTrack(app).map((st, i) => (
                              <Fragment key={st.key}>
                                {i > 0 && (
                                  <span className="text-xs text-muted-foreground/40" aria-hidden="true">
                                    ›
                                  </span>
                                )}
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full border ${STAGE_CLASS[st.state]}`}
                                >
                                  {STAGE_MARK[st.state] ? `${STAGE_MARK[st.state]} ` : ''}
                                  {t(st.key)}
                                </span>
                              </Fragment>
                            ))}
                          </div>
                        )}
                        {app.status === 'needs_info' && (
                          <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg p-2.5">
                            <span className="font-semibold">Reviewer Notes:</span>{' '}
                            {app.needsInfo
                              ?.map((n) => (n.docKey ? `${n.docKey}: ${n.comment}` : n.comment))
                              .filter(Boolean)
                              .join('; ') || 'Additional documents or field updates requested.'}
                          </div>
                        )}
                        {app.status === 'rejected' && app.rejectionReason && (
                          <div className="mt-2 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-2.5">
                            <span className="font-semibold">Reason:</span> {app.rejectionReason}
                          </div>
                        )}
                        {app.status === 'expired' && (
                          <div className="mt-2 text-xs bg-muted border border-border text-muted-foreground rounded-lg p-2.5">
                            {t('expiredNote')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : app.status === 'needs_info'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse'
                              :                             app.status === 'rejected'
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : app.status === 'expired'
                              ? 'bg-muted text-muted-foreground border-border'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {app.status === 'approved'
                            ? t('approvedBadge')
                            : app.status === 'needs_info'
                            ? t('actionRequiredBadge')
                            : app.status === 'rejected'
                            ? t('rejectedBadge')
                            : app.status === 'expired'
                            ? t('expiredBadge')
                            : t('underReviewBadge')}
                        </span>

                        {screenFlagged && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              verdict === 'conflict'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : verdict === 'review'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                            title={
                              verdict === 'conflict'
                                ? 'Automatic checks found a possible duplicate identity — a second reviewer must approve.'
                                : verdict === 'review'
                                ? 'Automatic checks flagged something for the reviewer to verify.'
                                : 'Automatic checks could not complete; the reviewer will verify manually.'
                            }
                          >
                            {verdict === 'conflict'
                              ? 'Duplicate flagged'
                              : verdict === 'review'
                              ? 'Auto-screen flag'
                              : 'Checks incomplete'}
                          </span>
                        )}

                        {app.status === 'expired' ? (
                          <Button size="sm" variant="outline" onClick={() => setViewMode('chooser')}>
                            {t('startNewApp')}
                          </Button>
                        ) : app.status === 'needs_info' || app.status === 'draft' ? (
                          <Button size="sm" onClick={() => loadServerApplication(app._id)}>
                            {app.status === 'needs_info' ? t('fixAndResubmit') : t('resumeDraft')}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {app.status === 'approved' && (
                      <ActivationPanel applicationId={app._id} providerId={app.providerId} />
                    )}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Category Chooser (Landing) ── */
  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-50/40 dark:bg-slate-950/40 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> India’s Unified Health & Wellness Network
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{t('title')}</h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{t('subtitle')}</p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={openMyApplications}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-card text-xs font-medium hover:bg-muted transition-colors shadow-sm"
                >
                  <FolderOpen className="w-4 h-4 text-primary" />
                  My Applications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-card text-xs font-medium hover:bg-muted transition-colors shadow-sm"
                >
                  <User className="w-4 h-4 text-primary" />
                  Sign In / Register
                </button>
              )}

              <button
                type="button"
                onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium bg-card hover:bg-muted transition-colors shadow-sm"
              >
                {lang === 'en' ? 'हिंदी' : 'English'}
              </button>
            </div>
          </div>

          {loadError && (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Offline / fallback catalog active: {loadError}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border bg-card pl-12 pr-4 py-3.5 text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/70"
              placeholder={t('searchPh')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Group Filter Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all shadow-sm ${
                activeGroup === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                  : 'bg-card hover:bg-muted text-foreground'
              }`}
            >
              All Categories ({types.length})
            </button>
            {DISPLAY_GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setActiveGroup(g.key)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all shadow-sm ${
                  activeGroup === g.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                    : 'bg-card hover:bg-muted text-foreground'
                }`}
              >
                {g.emoji} {lang === 'hi' ? g.labelHi : g.labelEn} ({groupedCounts.get(g.key) ?? 0})
              </button>
            ))}
          </div>

          {/* Interactive Diagnostic Quiz Card */}
          <div className="rounded-2xl border bg-gradient-to-br from-blue-500/5 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-base text-foreground">{t('quizTitle')}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('quizSubtitle')}</p>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">1. Primary Workplace</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-xs bg-card shadow-sm"
                  value={quiz.setting}
                  onChange={(e) => {
                    setQuiz((q) => ({ ...q, setting: e.target.value }));
                    setQuizDone(false);
                  }}
                >
                  <option value="">Select workplace…</option>
                  <option value="clinic_or_hospital">Hospital, Polyclinic or Diagnostic Lab</option>
                  <option value="own_studio_or_shop">Dedicated Studio, Gym or Pharmacy Store</option>
                  <option value="patient_home">Patient / Client Home Visits</option>
                  <option value="online">Telemedicine / Digital Consults</option>
                  <option value="outdoors_events">Mobile Logistics, Fleet or Outdoor Events</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">2. Team Structure</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-xs bg-card shadow-sm"
                  value={quiz.org}
                  onChange={(e) => {
                    setQuiz((q) => ({ ...q, org: e.target.value }));
                    setQuizDone(false);
                  }}
                >
                  <option value="">Select structure…</option>
                  <option value="individual">Solo Practitioner / Freelancer</option>
                  <option value="team">Multi-staff Organization / Clinic / Fleet</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">3. Core Offering</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-xs bg-card shadow-sm"
                  value={quiz.offer}
                  onChange={(e) => {
                    setQuiz((q) => ({ ...q, offer: e.target.value }));
                    setQuizDone(false);
                  }}
                >
                  <option value="">Select service…</option>
                  <option value="treatment">Clinical Diagnosis & Medical Treatment</option>
                  <option value="fitness">Wellness, Yoga & Fitness Coaching</option>
                  <option value="goods">Medicines, Supplements & Medical Gear</option>
                  <option value="events">Health Camps & Blood Donation Drives</option>
                  <option value="legal_or_insurance">Legal Assistance & Insurance TPA Claims</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => setQuizDone(true)}
                disabled={!quiz.setting || !quiz.org || !quiz.offer}
              >
                {quizDone ? t('quizAgain') : t('quizCta')}
              </Button>

              {suggestion && (
                <div className="inline-flex items-center gap-2 text-xs bg-card border rounded-xl px-3 py-1.5 shadow-sm">
                  <span className="text-muted-foreground">{t('suggested')}:</span>
                  <button
                    type="button"
                    className="font-semibold text-primary underline hover:text-primary/80"
                    onClick={() => setActiveGroup(suggestion)}
                  >
                    {DISPLAY_GROUPS.find((g) => g.key === suggestion)?.labelEn ?? suggestion} →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grouped Cards */}
          <div className="space-y-10">
            {DISPLAY_GROUPS.filter((g) => activeGroup === 'all' || activeGroup === g.key).map((g) => {
              const items = filtered.filter((x) => displayGroupOf(x) === g.key);
              if (items.length === 0) return null;
              return (
                <section key={g.key} className="space-y-4">
                  <div className="flex items-baseline justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.emoji}</span>
                      <h2 className="font-bold text-lg text-foreground">{lang === 'hi' ? g.labelHi : g.labelEn}</h2>
                      <span className="text-xs text-muted-foreground font-normal">({items.length} options)</span>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{g.descEn}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((x) => {
                      const IconComp = resolveIcon(x.icon);
                      const isT1 = x.tier === 'T1';
                      const isT2 = x.tier === 'T2';
                      return (
                        <div
                          key={x.typeKey}
                          className="group relative rounded-2xl border bg-card p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all duration-200"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span
                                className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                  isT1
                                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                    : isT2
                                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                }`}
                              >
                                {x.tier} {isT1 ? 'Clinical' : isT2 ? 'Health' : 'Wellness'}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                                {x.label}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {x.description}
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                              SLA: {x.approvalPolicy?.slaHours ?? 24}h
                            </span>
                            <button
                              type="button"
                              onClick={() => pickType(x)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform"
                            >
                              {t('pickType')} <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="border-t pt-8 flex items-center justify-between text-sm text-muted-foreground">
            <button type="button" onClick={openMyApplications} className="underline hover:text-foreground">
              {t('alreadyRegistered')}
            </button>
            <p className="text-xs">
              FindMedi Provider Regulatory Onboarding · Fully compliant with CEA, NMC, DCI, AYUSH & Pharmacy Act standards.
            </p>
          </div>
        </div>

        {/* Auth Dialog Modal */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 relative animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold">{authIsLogin ? 'Sign In to FindMedi' : 'Create Provider Account'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Secure your onboarding progress and track administrative verifications.
                </p>
              </div>

              {authError && (
                <div className="text-xs bg-destructive/10 border border-destructive/20 text-destructive p-2.5 rounded-lg">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {!authIsLogin && (
                  <>
                    <div>
                      <label className="text-xs font-medium block mb-1">Full Legal Name</label>
                      <Input
                        required
                        placeholder="Dr. Rajesh Kumar"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Mobile Number</label>
                      <Input
                        required
                        type="tel"
                        placeholder="9876543210"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium block mb-1">Email Address</label>
                  <Input
                    required
                    type="email"
                    placeholder="doctor@clinic.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">Password</label>
                  <Input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full mt-2" disabled={authLoading}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : authIsLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground pt-1">
                {authIsLogin ? "Don't have an account yet?" : 'Already have a provider account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthIsLogin(!authIsLogin);
                    setAuthError('');
                  }}
                  className="font-semibold text-primary underline"
                >
                  {authIsLogin ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Multi-Step Wizard Engine ── */
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToTypes')}
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Signed in as <span className="font-semibold text-foreground">{user.name || user.email}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
              className="rounded-full border px-3 py-1 text-xs bg-card hover:bg-muted"
            >
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>
        </div>

        {/* Wizard Header */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                  {selected.tier} {selected.kind}
                </span>
                <span className="text-xs text-muted-foreground">· SLA: {selected.approvalPolicy?.slaHours ?? 24}h</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{selected.label}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-semibold text-primary">{progress}% Completed</span>
              <p className="text-[11px] text-muted-foreground">
                {saveState === 'saved' ? 'Synced to Cloud ✓' : saveState === 'local' ? 'Saved Locally' : 'Saving…'}
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Step Bubbles */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {steps.map((s, i) => {
                const isActive = i === stepIdx;
                const isPast = i < stepIdx;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      if (i <= stepIdx || validateStep()) {
                        setStepError('');
                        setStepIdx(i);
                      }
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isPast
                        ? 'bg-muted text-foreground hover:bg-muted/80'
                        : 'text-muted-foreground opacity-60'
                    }`}
                  >
                    {isPast ? '✓ ' : `${i + 1}. `}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Form Body */}
        {submitted ? (
          <div className="bg-card border rounded-2xl p-8 text-center space-y-4 shadow-sm animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('submitDone')}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your application reference is{' '}
              <span className="font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                {submittedAppRef || applicationId || 'APP-REVIEW-PENDING'}
              </span>
              . Our compliance team will review your submitted credentials within{' '}
              <span className="font-semibold text-foreground">{selected.approvalPolicy?.slaHours ?? 24} hours</span>.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Button onClick={() => setViewMode('my-applications')}>Check Application Status</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Register Another Facility
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                  {t('stepOf')} {stepIdx + 1} {t('of')} {steps.length}
                </span>
                <h2 className="text-xl font-bold text-foreground">{current?.label}</h2>
              </div>
            </div>

            {/* Dynamic Step Content */}
            <div className="space-y-4">
              {isDocsStep ? (
                <div className="space-y-3">
                  {needsInfoItems && needsInfoItems.length > 0 && (
                    <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                      <p className="font-semibold">Reviewer asked for changes on these documents:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {needsInfoItems.map((n) => (
                          <li key={`${n.docKey}-${n.at ?? ''}`}>
                            <span className="font-mono">{n.docKey}</span> — {n.comment}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <DocsStep
                    typeKey={selected.typeKey}
                    applicationId={applicationId}
                    requiredDocs={selected.requiredDocs}
                    optionalDocs={selected.optionalDocs}
                    uploadLabel={t('upload')}
                    uploadedLabel={t('uploaded')}
                    expiryPh={t('expiryPh')}
                    docsTitle={t('docsTitle')}
                    docsSubtitle={t('docsSubtitle')}
                    onRequireAuth={() => setAuthModalOpen(true)}
                  />
                </div>
              ) : isReviewStep ? (
                <ReviewStep steps={steps} draft={draft} fieldByKey={fieldByKey} />
              ) : (
                <div className="grid gap-4">
                  {stepFields.map((f) => (
                    <FieldWidget
                      key={f.key}
                      field={f}
                      value={current ? values[f.key] : undefined}
                      onChange={(v) => current && setStepValue(current.key, f.key, v)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Statutory Declaration Checkbox for Review Step */}
            {isReviewStep && (
              <div className="pt-4 border-t">
                <label className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                    checked={values['declaration'] === true}
                    onChange={(e) => current && setStepValue(current.key, 'declaration', e.target.checked)}
                  />
                  <span className="text-xs sm:text-sm font-medium leading-relaxed">
                    {t('declaration')} <span className="text-destructive">*</span>
                  </span>
                </label>
              </div>
            )}

            {stepError && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{stepError}</span>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={goBack}>
                {t('back')}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selected) {
                      try {
                        window.localStorage.setItem(lsDraftKey(selected.typeKey), JSON.stringify(draft));
                      } catch {
                        /* ignore */
                      }
                      setSaveState(applicationId ? 'saved' : 'local');
                    }
                  }}
                >
                  {t('saveExit')}
                </Button>

                {isReviewStep ? (
                  <Button type="button" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…
                      </>
                    ) : (
                      t('submit')
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={goNext}>
                    {t('next')} <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal for Unauthenticated Applicants */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold">{authIsLogin ? 'Sign In to Save Progress' : 'Create Provider Account'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in so your application drafts, verification documents, and audit logs are preserved in your account.
              </p>
            </div>

            {authError && (
              <div className="text-xs bg-destructive/10 border border-destructive/20 text-destructive p-2.5 rounded-lg">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {!authIsLogin && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1">Full Legal Name</label>
                    <Input
                      required
                      placeholder="Dr. Rajesh Kumar"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Mobile Number</label>
                    <Input
                      required
                      type="tel"
                      placeholder="9876543210"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium block mb-1">Email Address</label>
                <Input
                  required
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Password</label>
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : authIsLogin ? 'Sign In & Sync Draft' : 'Create & Sync'}
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground pt-1">
              {authIsLogin ? "Don't have an account yet?" : 'Already registered?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthIsLogin(!authIsLogin);
                  setAuthError('');
                }}
                className="font-semibold text-primary underline"
              >
                {authIsLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Field Widget Component ─────────────────────────────────────────────── */

function FieldWidget({
  field,
  value,
  onChange,
}: {
  field: WizardField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  const label = (
    <label className="block text-xs font-semibold text-foreground mb-1.5">
      {field.label} {field.required ? <span className="text-destructive">*</span> : null}
    </label>
  );
  const help = field.help ? <p className="text-[11px] text-muted-foreground mt-1">{field.help}</p> : null;
  const str = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  switch (field.type) {
    case 'textarea':
    case 'address':
      return (
        <div>
          {label}
          <Textarea
            rows={3}
            placeholder={field.type === 'address' ? 'Door / Building, Street, Landmark, City, State, PIN' : ''}
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <Input
            type="number"
            value={str}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {help}
        </div>
      );
    case 'date':
      return (
        <div>
          {label}
          <Input type="date" value={str} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );
    case 'select':
      return (
        <div>
          {label}
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">— Select an option —</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {help}
        </div>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) =>
        onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20">
            {(field.options ?? []).map((o) => {
              const active = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {o.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
          {help}
        </div>
      );
    }
    case 'boolean':
      return (
        <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/20 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-primary text-primary focus:ring-primary"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-xs font-medium text-foreground leading-snug">
            {field.label} {field.required ? <span className="text-destructive">*</span> : null}
            {help}
          </span>
        </label>
      );
    case 'phone':
      return (
        <div>
          {label}
          <Input
            type="tel"
            inputMode="tel"
            placeholder="10-digit mobile number"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
    case 'email':
      return (
        <div>
          {label}
          <Input
            type="email"
            placeholder="official@domain.com"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
    case 'geo':
      return (
        <div>
          {label}
          <Input
            placeholder="Latitude, Longitude (e.g. 28.6139, 77.2090)"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
    default:
      return (
        <div>
          {label}
          <Input value={str} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );
  }
}

/* ── Validation Helper ───────────────────────────────────────────────────── */

function validateValue(field: WizardField, value: FieldValue | undefined): string | null {
  if (!field.required) return null;
  if (field.type === 'boolean') return value === true ? null : `${field.label} must be accepted`;
  if (field.type === 'multiselect')
    return Array.isArray(value) && value.length > 0 ? null : `Please select at least one option for ${field.label}`;
  if (field.type === 'email')
    return typeof value === 'string' && /.+@.+\..+/.test(value) ? null : `${field.label} must be a valid email`;
  if (field.type === 'phone')
    return typeof value === 'string' && value.replace(/\D/g, '').length >= 10
      ? null
      : `${field.label} must be a valid 10-digit mobile number`;
  if (field.type === 'number')
    return value !== '' && value !== undefined && !Number.isNaN(Number(value))
      ? null
      : `${field.label} is required`;
  return typeof value === 'string' && value.trim().length > 0 ? null : `${field.label} is required`;
}

/* ── Documents Upload Step ───────────────────────────────────────────────── */

function DocsStep({
  applicationId,
  requiredDocs,
  optionalDocs,
  uploadLabel,
  uploadedLabel,
  expiryPh,
  docsTitle,
  docsSubtitle,
  onRequireAuth,
}: {
  typeKey: string;
  applicationId: string | null;
  requiredDocs: DocSpec[];
  optionalDocs: DocSpec[];
  uploadLabel: string;
  uploadedLabel: string;
  expiryPh: string;
  docsTitle: string;
  docsSubtitle: string;
  onRequireAuth: () => void;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  // Fetch already uploaded documents from server if applicationId exists
  useEffect(() => {
    if (!applicationId) return;
    (async () => {
      try {
        const res = (await api.get(`/join/${applicationId}`)) as unknown as {
          documents?: Array<{ docType?: string; status?: string; expiryDate?: string; version?: number }>;
        };
        if (Array.isArray(res?.documents)) {
          const m: Record<string, boolean> = {};
          const exp: Record<string, string> = {};
          for (const d of res.documents) {
            if (d.docType && d.status !== 'rejected') {
              m[d.docType] = true;
              if (d.expiryDate) exp[d.docType] = d.expiryDate.split('T')[0];
            }
          }
          setDone(m);
          setExpiry(exp);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [applicationId]);

  const upload = async (doc: DocSpec, file: File | undefined) => {
    if (!file) return;
    if (!applicationId) {
      onRequireAuth();
      return;
    }
    setBusy(doc.key);
    setErr('');
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('docType', doc.key);
      if (expiry[doc.key]) form.append('expiryDate', expiry[doc.key]);

      await apiClient({
        url: `/join/${applicationId}/documents`,
        method: 'POST',
        data: form,
      });

      setDone((d) => ({ ...d, [doc.key]: true }));
      setFileNames((f) => ({ ...f, [doc.key]: file.name }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Document upload failed. Check format and file size (< 10MB).');
    } finally {
      setBusy(null);
    }
  };

  const renderDocCard = (doc: DocSpec, mandatory: boolean) => {
    const isDone = done[doc.key];
    const isUploading = busy === doc.key;

    return (
      <div
        key={doc.key}
        className={`rounded-xl border p-4 transition-all ${
          isDone ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{doc.label}</span>
              {mandatory ? (
                <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider bg-destructive/10 px-2 py-0.5 rounded-full">
                  Required
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allowed: PDF, JPG, PNG, WEBP (Max {doc.maxMb ?? 10}MB)
              {fileNames[doc.key] && <span className="font-mono text-foreground ml-1">({fileNames[doc.key]})</span>}
            </p>
          </div>

          {isDone ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
              <Check className="w-3.5 h-3.5" /> {uploadedLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
          {doc.expiryRequired && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Expiry:</span>
              <input
                type="date"
                className="rounded-lg border px-2.5 py-1.5 text-xs bg-background shadow-sm"
                placeholder={expiryPh}
                value={expiry[doc.key] ?? ''}
                onChange={(e) => setExpiry((x) => ({ ...x, [doc.key]: e.target.value }))}
              />
            </div>
          )}

          <label className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted transition-colors shadow-sm bg-card">
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Uploading…' : isDone ? 'Replace File' : uploadLabel}
            <input
              type="file"
              className="hidden"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => upload(doc, e.target.files?.[0])}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{docsTitle}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{docsSubtitle}</p>
      </div>

      {!applicationId && (
        <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex items-center justify-between">
          <span>Sign in or create an account to upload verification documents.</span>
          <Button size="sm" variant="outline" onClick={onRequireAuth}>
            Sign In
          </Button>
        </div>
      )}

      {err && (
        <div className="text-xs bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl">
          {err}
        </div>
      )}

      <div className="space-y-3">
        {requiredDocs.map((d) => renderDocCard(d, true))}
        {optionalDocs.map((d) => renderDocCard(d, false))}
      </div>
    </div>
  );
}

/* ── Review Step Component ───────────────────────────────────────────────── */

function ReviewStep({
  steps,
  draft,
  fieldByKey,
}: {
  steps: WizardStep[];
  draft: DraftState;
  fieldByKey: Map<string, WizardField>;
}) {
  const fmt = (v: FieldValue | undefined): string => {
    if (v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
    return String(v);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Review Application Details</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Please confirm all submitted details are complete and accurate before submission.
        </p>
      </div>

      {steps
        .filter((s) => s.key !== 'review' && s.key !== 'documents')
        .map((s) => {
          const vals = draft[s.key] ?? {};
          const keys =
            s.key === 'account' ? [...ACCOUNT_CONTACT_FIELDS.map((f) => f.key), ...s.fields] : s.fields;

          return (
            <div key={s.key} className="rounded-xl border bg-card p-4 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1.5">{s.label}</h4>
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {keys.map((k) => (
                  <div key={k} className="flex flex-col">
                    <dt className="text-muted-foreground">{fieldByKey.get(k)?.label ?? k}</dt>
                    <dd className="font-semibold text-foreground mt-0.5 break-words">{fmt(vals[k])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
    </div>
  );
}
