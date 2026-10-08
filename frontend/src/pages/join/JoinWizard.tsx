/**
 * R1 — Config-driven "Join FindMedi" wizard (parallel run with JoinPlatform.tsx).
 *
 * - Fetches GET /api/config/provider-types (public) and renders a grouped
 *   chooser: 8 groups per rolesmd/2.md §2 (clinical is split by kind into
 *   "Healthcare facilities" + "Practitioners", matching the spec table) with
 *   search + a 3-question "Not sure?" quiz stub.
 * - Steps (account → business → location → practitioners → services →
 *   documents → payout → availability → agreement → review) come from the
 *   selected type's config row; every field widget is rendered by field type.
 * - Autosave: POST /api/join { typeKey } then debounced
 *   PATCH /api/join/:id { draft: { [stepKey]: values } }. Join endpoints need
 *   auth, so unauthenticated visitors (or failures) fall back to localStorage.
 * - Per-step validation honours each field's `required` flag; agreement /
 *   declaration booleans must be ticked. Progress bar + Hindi/English label
 *   stub via i18n keys. JoinPlatform.tsx is left untouched.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiClient } from '@/lib/api';

/* ── Types (mirror GET /api/config/provider-types DTO) ─────────────────── */

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
  maxMb: number;
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
  approvalPolicy?: { slaHours?: number };
  version: number;
}

type FieldValue = string | number | boolean | string[];
type StepValues = Record<string, FieldValue>;
type DraftState = Record<string, StepValues>;

/* ── i18n stub (Hindi/English labels via keys) ─────────────────────────── */

type Lang = 'en' | 'hi';

const STRINGS = {
  en: {
    title: 'Join FindMedi',
    subtitle: 'Pick your provider type — one config-driven flow for every role.',
    searchPh: 'Search — try "dentist", "gym", "yoga"…',
    quizTitle: 'Not sure? Answer 3 quick questions',
    quizCta: 'See suggestion',
    quizAgain: 'Retake quiz',
    suggested: 'Suggested for you',
    pickType: 'Choose',
    backToTypes: '← All types',
    stepOf: 'Step',
    of: 'of',
    next: 'Next',
    back: 'Back',
    saveExit: 'Save & exit',
    savedOn: 'Draft saved',
    savedLocal: 'Saved on this device (login to sync)',
    submit: 'Review & submit',
    submitDone: 'Application submitted for review 🎉',
    agreeRequired: 'Please accept all agreements to continue.',
    fixStep: 'Please fill the required fields marked *.',
    declaration: 'I confirm the information above is true and current.',
    docsTitle: 'Documents',
    upload: 'Upload',
    uploaded: 'Uploaded ✓',
    expiryPh: 'Expiry date (required)',
    contactName: 'Full name',
    contactPhone: 'Mobile number',
    contactEmail: 'Email',
    alreadyRegistered: 'Already registered? Add another branch / service →',
  },
  hi: {
    title: 'FindMedi से जुड़ें',
    subtitle: 'अपना provider type चुनें — हर role के लिए एक ही flow।',
    searchPh: 'खोजें — "dentist", "gym", "yoga"…',
    quizTitle: 'समझ नहीं आ रहा? 3 सवालों के जवाब दें',
    quizCta: 'सुझाव देखें',
    quizAgain: 'Quiz दोबारा दें',
    suggested: 'आपके लिए सुझाव',
    pickType: 'चुनें',
    backToTypes: '← सभी types',
    stepOf: 'चरण',
    of: '/',
    next: 'आगे',
    back: 'पीछे',
    saveExit: 'Save & exit',
    savedOn: 'Draft saved',
    savedLocal: 'इस device पर saved (sync के लिए login करें)',
    submit: 'Review & submit',
    submitDone: 'Application review के लिए भेज दी गई 🎉',
    agreeRequired: 'जारी रखने के लिए सभी agreements स्वीकार करें।',
    fixStep: 'कृपया * वाले ज़रूरी fields भरें।',
    declaration: 'मैं पुष्टि करता/करती हूँ कि ऊपर दी जानकारी सही है।',
    docsTitle: 'दस्तावेज़',
    upload: 'Upload',
    uploaded: 'Uploaded ✓',
    expiryPh: 'Expiry date (ज़रूरी)',
    contactName: 'पूरा नाम',
    contactPhone: 'मोबाइल नंबर',
    contactEmail: 'ईमेल',
    alreadyRegistered: 'पहले से registered हैं? दूसरी branch / service जोड़ें →',
  },
} as const;

type StringKey = keyof typeof STRINGS.en;

/* ── 8 chooser groups (rolesmd/2.md §2; clinical split by kind) ─────────── */

interface DisplayGroup {
  key: string;
  emoji: string;
  labelEn: string;
  labelHi: string;
}

const DISPLAY_GROUPS: DisplayGroup[] = [
  { key: 'facilities', emoji: '🏥', labelEn: 'Healthcare facilities', labelHi: 'स्वास्थ्य सुविधाएँ' },
  { key: 'practitioners', emoji: '👨‍⚕️', labelEn: 'Practitioners (individual)', labelHi: 'चिकित्सक (व्यक्तिगत)' },
  { key: 'wellness', emoji: '🧘', labelEn: 'Wellness & fitness', labelHi: 'वेलनेस व फिटनेस' },
  { key: 'commerce', emoji: '🛒', labelEn: 'Commerce', labelHi: 'कॉमर्स' },
  { key: 'home_service', emoji: '🏠', labelEn: 'Home services', labelHi: 'होम सेवाएँ' },
  { key: 'transport', emoji: '🚗', labelEn: 'Transport / delivery', labelHi: 'परिवहन / डिलीवरी' },
  { key: 'community', emoji: '🎪', labelEn: 'Community', labelHi: 'समुदाय' },
  { key: 'professional', emoji: '⚖️', labelEn: 'Professional', labelHi: 'पेशेवर' },
];

/** Map a catalog row to one of the 8 display groups. */
function displayGroupOf(t: ProviderTypeConfigDto): string {
  if (t.group === 'clinical') return t.kind === 'practitioner' ? 'practitioners' : 'facilities';
  return t.group;
}

/* ── Offline fallback so the wizard still renders without the API ───────── */

const FALLBACK_TYPES: ProviderTypeConfigDto[] = [
  {
    typeKey: 'dental_clinic', kind: 'facility', group: 'clinical', tier: 'T1',
    label: 'Dental Clinic', icon: 'Smile', description: 'Dental consultations, RCT, implants.',
    steps: [
      { key: 'account', label: 'Account', fields: ['referral_code'] },
      { key: 'business', label: 'Business & identity', fields: ['legal_name', 'display_name', 'pan'] },
      { key: 'location', label: 'Location', fields: ['address', 'geo'] },
      { key: 'services', label: 'Services & pricing', fields: ['services', 'base_fee'] },
      { key: 'documents', label: 'Documents', fields: [] },
      { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'ifsc', 'account_number'] },
      { key: 'agreement', label: 'Policies & agreement', fields: ['commission_accepted'] },
      { key: 'review', label: 'Review & submit', fields: ['declaration'] },
    ],
    fields: [
      { key: 'referral_code', label: 'Referral code', type: 'text' },
      { key: 'legal_name', label: 'Legal name', type: 'text', required: true },
      { key: 'display_name', label: 'Display name', type: 'text', required: true },
      { key: 'pan', label: 'PAN', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'address', required: true },
      { key: 'geo', label: 'Map pin', type: 'geo', required: true },
      { key: 'services', label: 'Services offered', type: 'multiselect', required: true, options: ['Consultation', 'Dental procedure', 'Health check-up'] },
      { key: 'base_fee', label: 'Standard fee (INR)', type: 'number' },
      { key: 'account_holder', label: 'Account holder name', type: 'text', required: true },
      { key: 'ifsc', label: 'IFSC', type: 'text', required: true },
      { key: 'account_number', label: 'Account number', type: 'text', required: true },
      { key: 'commission_accepted', label: 'Commission terms accepted', type: 'boolean', required: true },
      { key: 'declaration', label: 'I confirm the information above is true', type: 'boolean', required: true },
    ],
    requiredDocs: [{ key: 'owner_id', label: 'Owner photo ID', mandatory: true, expiryRequired: false, maxMb: 10 }],
    optionalDocs: [],
    agreementTemplateId: 'tmpl_clinical',
    version: 1,
  },
  {
    typeKey: 'dentist', kind: 'practitioner', group: 'clinical', tier: 'T1',
    label: 'Dentist', icon: 'Smile', description: 'BDS / MDS dentist.',
    steps: [
      { key: 'account', label: 'Account', fields: ['referral_code'] },
      { key: 'identity', label: 'Profile & registration', fields: ['display_name', 'registration_number', 'qualification'] },
      { key: 'services', label: 'Services & fee', fields: ['services', 'base_fee'] },
      { key: 'documents', label: 'Documents', fields: [] },
      { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'ifsc', 'account_number'] },
      { key: 'agreement', label: 'Policies & agreement', fields: ['commission_accepted'] },
      { key: 'review', label: 'Review & submit', fields: ['declaration'] },
    ],
    fields: [
      { key: 'referral_code', label: 'Referral code', type: 'text' },
      { key: 'display_name', label: 'Display name', type: 'text', required: true },
      { key: 'registration_number', label: 'Registration number', type: 'text', required: true },
      { key: 'qualification', label: 'Qualifications', type: 'text', required: true },
      { key: 'services', label: 'Services offered', type: 'multiselect', required: true, options: ['Consultation', 'Dental procedure'] },
      { key: 'base_fee', label: 'Standard fee (INR)', type: 'number' },
      { key: 'account_holder', label: 'Account holder name', type: 'text', required: true },
      { key: 'ifsc', label: 'IFSC', type: 'text', required: true },
      { key: 'account_number', label: 'Account number', type: 'text', required: true },
      { key: 'commission_accepted', label: 'Commission terms accepted', type: 'boolean', required: true },
      { key: 'declaration', label: 'I confirm the information above is true', type: 'boolean', required: true },
    ],
    requiredDocs: [{ key: 'owner_id', label: 'Government photo ID', mandatory: true, expiryRequired: false, maxMb: 10 }],
    optionalDocs: [],
    agreementTemplateId: 'tmpl_clinical',
    version: 1,
  },
  {
    typeKey: 'yoga_studio', kind: 'facility', group: 'wellness', tier: 'T3',
    label: 'Yoga Studio / Teacher', icon: 'Flower2', description: 'Yoga classes online or offline.',
    steps: [
      { key: 'account', label: 'Account', fields: ['referral_code'] },
      { key: 'business', label: 'Business & identity', fields: ['legal_name', 'display_name'] },
      { key: 'location', label: 'Location', fields: ['address'] },
      { key: 'documents', label: 'Documents', fields: [] },
      { key: 'payout', label: 'Payout / bank', fields: ['account_holder', 'ifsc', 'account_number'] },
      { key: 'agreement', label: 'Policies & agreement', fields: ['commission_accepted'] },
      { key: 'review', label: 'Review & submit', fields: ['declaration'] },
    ],
    fields: [
      { key: 'referral_code', label: 'Referral code', type: 'text' },
      { key: 'legal_name', label: 'Legal name', type: 'text', required: true },
      { key: 'display_name', label: 'Display name', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'address', required: true },
      { key: 'account_holder', label: 'Account holder name', type: 'text', required: true },
      { key: 'ifsc', label: 'IFSC', type: 'text', required: true },
      { key: 'account_number', label: 'Account number', type: 'text', required: true },
      { key: 'commission_accepted', label: 'Commission terms accepted', type: 'boolean', required: true },
      { key: 'declaration', label: 'I confirm the information above is true', type: 'boolean', required: true },
    ],
    requiredDocs: [{ key: 'owner_id', label: 'Owner photo ID', mandatory: true, expiryRequired: false, maxMb: 10 }],
    optionalDocs: [],
    agreementTemplateId: 'tmpl_wellness',
    version: 1,
  },
];

/* ── Quiz stub (3 questions → suggested display group) ──────────────────── */

const QUIZ_SETTING_OPTS = ['clinic_or_hospital', 'own_studio_or_shop', 'patient_home', 'online', 'outdoors_events'];
const QUIZ_ORG_OPTS = ['individual', 'team'];
const QUIZ_OFFER_OPTS = ['treatment', 'fitness', 'goods', 'events', 'legal_or_insurance'];

function suggestGroup(setting: string, org: string, offer: string): string {
  if (offer === 'fitness') return 'wellness';
  if (offer === 'goods') return 'commerce';
  if (offer === 'events') return 'community';
  if (offer === 'legal_or_insurance') return 'professional';
  // treatment / support:
  if (setting === 'patient_home') return 'home_service';
  if (setting === 'online' && org === 'individual') return 'practitioners';
  if (setting === 'own_studio_or_shop') return 'wellness';
  if (setting === 'outdoors_events') return 'transport';
  return org === 'individual' ? 'practitioners' : 'facilities';
}

/* ── Field widget (renders one config field by type) ────────────────────── */

function FieldWidget({
  field,
  value,
  onChange,
}: {
  field: WizardField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  const base = 'w-full rounded-lg border px-3 py-2 text-sm bg-background';
  const label = (
    <label className="block text-sm font-medium mb-1">
      {field.label} {field.required ? <span className="text-destructive">*</span> : null}
    </label>
  );
  const help = field.help ? <p className="text-xs text-muted-foreground mt-1">{field.help}</p> : null;
  const str = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  switch (field.type) {
    case 'textarea':
    case 'address':
      return (
        <div>{label}<textarea className={base} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
    case 'number':
      return (
        <div>{label}<input className={base} type="number" value={str} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />{help}</div>
      );
    case 'date':
      return (
        <div>{label}<input className={base} type="date" value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
    case 'select':
      return (
        <div>{label}
          <select className={base} value={str} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>{help}</div>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) =>
        onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
      return (
        <div>{label}
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((o) => (
              <button
                key={o} type="button" onClick={() => toggle(o)}
                className={`rounded-full border px-3 py-1 text-xs ${selected.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}
              >
                {o}
              </button>
            ))}
          </div>{help}</div>
      );
    }
    case 'boolean':
      return (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.label} {field.required ? <span className="text-destructive">*</span> : null}{help}</span>
        </label>
      );
    case 'phone':
      return (
        <div>{label}<input className={base} type="tel" inputMode="tel" value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
    case 'email':
      return (
        <div>{label}<input className={base} type="email" value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
    case 'geo':
      return (
        <div>{label}<input className={base} placeholder="lat,lng — e.g. 23.1599,79.9120" value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
    default:
      return (
        <div>{label}<input className={base} value={str} onChange={(e) => onChange(e.target.value)} />{help}</div>
      );
  }
}

/* ── Validation ─────────────────────────────────────────────────────────── */

function validateValue(field: WizardField, value: FieldValue | undefined): string | null {
  if (!field.required) return null;
  if (field.type === 'boolean') return value === true ? null : `${field.label} is required`;
  if (field.type === 'multiselect') return Array.isArray(value) && value.length > 0 ? null : `${field.label} is required`;
  if (field.type === 'email') return typeof value === 'string' && /.+@.+\..+/.test(value) ? null : `${field.label} must be a valid email`;
  if (field.type === 'phone') return typeof value === 'string' && value.replace(/\D/g, '').length >= 10 ? null : `${field.label} must be a 10-digit number`;
  if (field.type === 'number') return value !== '' && value !== undefined && !Number.isNaN(Number(value)) ? null : `${field.label} is required`;
  return typeof value === 'string' && value.trim().length > 0 ? null : `${field.label} is required`;
}

/** Extra contact fields always rendered on the account step (§3: name/mobile/email). */
const ACCOUNT_CONTACT_FIELDS: WizardField[] = [
  { key: 'contact_name', label: 'Full name', type: 'text', required: true },
  { key: 'contact_phone', label: 'Mobile number', type: 'phone', required: true },
  { key: 'contact_email', label: 'Email', type: 'email', required: true },
];

/* ── Wizard ─────────────────────────────────────────────────────────────── */

const LS_LANG = 'findmedi:lang';
const lsDraftKey = (typeKey: string) => `findmedi:join:draft:${typeKey}`;

export default function JoinWizard() {
  const [lang, setLang] = useState<Lang>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(LS_LANG) === 'hi' ? 'hi' : 'en',
  );
  const t = useCallback((k: StringKey): string => STRINGS[lang][k] ?? k, [lang]);

  const [types, setTypes] = useState<ProviderTypeConfigDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [quiz, setQuiz] = useState({ setting: '', org: '', offer: '' });
  const [quizDone, setQuizDone] = useState(false);

  const [selected, setSelected] = useState<ProviderTypeConfigDto | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<DraftState>({});
  const [stepError, setStepError] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(LS_LANG, lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/config/provider-types') as unknown as { providerTypes?: ProviderTypeConfigDto[] };
        const list = Array.isArray(res?.providerTypes) ? res.providerTypes : [];
        if (cancelled) return;
        if (list.length > 0) {
          setTypes(list);
        } else {
          setTypes(FALLBACK_TYPES);
          setUsingFallback(true);
        }
      } catch (err) {
        if (cancelled) return;
        setTypes(FALLBACK_TYPES);
        setUsingFallback(true);
        setLoadError(err instanceof Error ? err.message : 'Failed to load provider types');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, WizardField>();
    for (const f of selected?.fields ?? []) map.set(f.key, f);
    for (const f of ACCOUNT_CONTACT_FIELDS) map.set(f.key, f);
    return map;
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return types.filter((x) => {
      if (activeGroup !== 'all' && displayGroupOf(x) !== activeGroup) return false;
      if (!q) return true;
      return [x.label, x.typeKey, x.description].join(' ').toLowerCase().includes(q);
    });
  }, [types, query, activeGroup]);

  const groupedCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of types) m.set(displayGroupOf(x), (m.get(displayGroupOf(x)) ?? 0) + 1);
    return m;
  }, [types]);

  const suggestion = useMemo(() => {
    if (!quizDone) return null;
    if (!quiz.setting || !quiz.org || !quiz.offer) return null;
    return suggestGroup(quiz.setting, quiz.org, quiz.offer);
  }, [quizDone, quiz]);

  /* ── Draft: load + autosave ─────────────────────────────────────────── */

  const loadLocalDraft = useCallback((typeKey: string) => {
    try {
      const raw = window.localStorage.getItem(lsDraftKey(typeKey));
      if (raw) setDraft(JSON.parse(raw) as DraftState);
      else setDraft({});
    } catch { setDraft({}); }
  }, []);

  const pickType = useCallback((cfg: ProviderTypeConfigDto) => {
    setSelected(cfg);
    setStepIdx(0);
    setStepError('');
    setSubmitted(false);
    setApplicationId(null);
    setSaveState('idle');
    loadLocalDraft(cfg.typeKey);
    // Create (or reuse) a server draft — needs login; otherwise local only.
    api.post('/join', { typeKey: cfg.typeKey })
      .then((res: unknown) => {
        const id = (res as { application?: { _id?: string } })?.application?._id;
        if (id) setApplicationId(id);
      })
      .catch(() => { setSaveState('local'); });
  }, [loadLocalDraft]);

  const persistDraft = useCallback((next: DraftState, typeKey: string, appId: string | null) => {
    try { window.localStorage.setItem(lsDraftKey(typeKey), JSON.stringify(next)); } catch { /* ignore */ }
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

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const setStepValue = useCallback((stepKey: string, fieldKey: string, v: FieldValue) => {
    if (!selected) return;
    setDraft((prev) => {
      const next = { ...prev, [stepKey]: { ...(prev[stepKey] ?? {}), [fieldKey]: v } };
      persistDraft(next, selected.typeKey, applicationId);
      return next;
    });
  }, [selected, applicationId, persistDraft]);

  /* ── Step rendering / navigation ─────────────────────────────────────── */

  const steps = selected?.steps ?? [];
  const current = steps[stepIdx];
  const values: StepValues = current ? (draft[current.key] ?? {}) : {};

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
      if (decl !== true) { setStepError(t('agreeRequired')); return false; }
      return true;
    }
    if (isDocsStep) return true; // server enforces required docs on submit
    for (const f of stepFields) {
      const err = validateValue(f, values[f.key]);
      if (err) { setStepError(t('fixStep')); return false; }
    }
    setStepError('');
    return true;
  }, [selected, current, isReviewStep, isDocsStep, stepFields, values, t]);

  const goNext = () => {
    if (!validateStep()) return;
    setStepError('');
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => {
    setStepError('');
    if (stepIdx === 0) { setSelected(null); return; }
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async () => {
    if (!selected || !validateStep()) return;
    setSubmitting(true);
    setStepError('');
    try {
      let appId = applicationId;
      if (!appId) {
        const res = await api.post('/join', { typeKey: selected.typeKey }) as unknown as { application?: { _id?: string } };
        appId = res?.application?._id ?? null;
        if (appId) setApplicationId(appId);
      }
      if (appId) {
        await apiClient({ url: `/join/${appId}`, method: 'PATCH', data: { draft } });
        await api.post(`/join/${appId}/submit`, {});
      }
      try { window.localStorage.removeItem(lsDraftKey(selected.typeKey)); } catch { /* ignore */ }
      setSubmitted(true);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = steps.length > 0 ? Math.round(((stepIdx + 1) / steps.length) * 100) : 0;

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Chooser ──
  if (!selected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
            </div>
            <button
              type="button" onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
              className="rounded-full border px-3 py-1 text-sm shrink-0"
            >
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>
          {usingFallback && loadError && (
            <p className="mt-3 text-xs text-amber-600">Config API unreachable ({loadError}) — showing built-in types.</p>
          )}

          <input
            className="mt-6 w-full rounded-lg border px-4 py-2.5 text-sm bg-background"
            placeholder={t('searchPh')}
            value={query} onChange={(e) => setQuery(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button" onClick={() => setActiveGroup('all')}
              className={`rounded-full border px-3 py-1 text-xs ${activeGroup === 'all' ? 'bg-primary text-primary-foreground border-primary' : ''}`}
            >
              All ({types.length})
            </button>
            {DISPLAY_GROUPS.map((g) => (
              <button
                key={g.key} type="button" onClick={() => setActiveGroup(g.key)}
                className={`rounded-full border px-3 py-1 text-xs ${activeGroup === g.key ? 'bg-primary text-primary-foreground border-primary' : ''}`}
              >
                {g.emoji} {lang === 'hi' ? g.labelHi : g.labelEn} ({groupedCounts.get(g.key) ?? 0})
              </button>
            ))}
          </div>

          {/* Quiz stub */}
          <div className="mt-6 rounded-xl border p-4">
            <h2 className="font-semibold text-sm">{t('quizTitle')}</h2>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <select className="rounded-lg border px-3 py-2 text-sm bg-background" value={quiz.setting} onChange={(e) => { setQuiz((q) => ({ ...q, setting: e.target.value })); setQuizDone(false); }}>
                <option value="">1. Workplace…</option>
                {QUIZ_SETTING_OPTS.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm bg-background" value={quiz.org} onChange={(e) => { setQuiz((q) => ({ ...q, org: e.target.value })); setQuizDone(false); }}>
                <option value="">2. Individual / team…</option>
                {QUIZ_ORG_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm bg-background" value={quiz.offer} onChange={(e) => { setQuiz((q) => ({ ...q, offer: e.target.value })); setQuizDone(false); }}>
                <option value="">3. Offering…</option>
                {QUIZ_OFFER_OPTS.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={() => setQuizDone(true)} className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm">
                {quizDone ? t('quizAgain') : t('quizCta')}
              </button>
              {suggestion && (
                <p className="text-sm">
                  {t('suggested')}: <button type="button" className="underline font-medium" onClick={() => setActiveGroup(suggestion)}>
                    {DISPLAY_GROUPS.find((g) => g.key === suggestion)?.labelEn ?? suggestion}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Grouped cards */}
          <div className="mt-6 space-y-8">
            {DISPLAY_GROUPS.filter((g) => activeGroup === 'all' || activeGroup === g.key).map((g) => {
              const items = filtered.filter((x) => displayGroupOf(x) === g.key);
              if (items.length === 0) return null;
              return (
                <section key={g.key}>
                  <h2 className="font-semibold">{g.emoji} {lang === 'hi' ? g.labelHi : g.labelEn}</h2>
                  <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((x) => (
                      <div key={x.typeKey} className="rounded-xl border p-4 flex flex-col">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{x.label}</h3>
                          <span className="text-[11px] rounded-full bg-muted px-2 py-0.5">{x.tier}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex-1">{x.description}</p>
                        <button
                          type="button" onClick={() => pickType(x)}
                          className="mt-3 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                        >
                          {t('pickType')} →
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            <Link to="/join-platform" className="underline">{t('alreadyRegistered')}</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Wizard ──
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setSelected(null)} className="text-sm underline">{t('backToTypes')}</button>
          <button
            type="button" onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
            className="rounded-full border px-3 py-1 text-sm"
          >
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>

        <h1 className="mt-4 text-2xl font-bold">{selected.label}</h1>
        <p className="text-sm text-muted-foreground">{selected.description} · SLA {selected.approvalPolicy?.slaHours ?? 24}h</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t('stepOf')} {stepIdx + 1} {t('of')} {steps.length} — {current?.label}</span>
            <span>{saveState === 'saved' ? `${t('savedOn')} ✓` : saveState === 'local' ? t('savedLocal') : saveState === 'saving' ? '…' : ''}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {steps.map((s, i) => (
              <button
                key={s.key} type="button" onClick={() => { setStepError(''); setStepIdx(i); }}
                className={`rounded-full px-2 py-0.5 text-[11px] border ${i === stepIdx ? 'bg-primary text-primary-foreground border-primary' : i < stepIdx ? 'bg-muted' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {submitted ? (
          <div className="mt-8 rounded-xl border p-6 text-center">
            <p className="text-lg font-semibold">{t('submitDone')}</p>
            <Link to="/" className="mt-3 inline-block underline text-sm">← Home</Link>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">{current?.label}</h2>

            {isDocsStep ? (
              <DocsStep
                typeKey={selected.typeKey}
                applicationId={applicationId}
                requiredDocs={selected.requiredDocs}
                optionalDocs={selected.optionalDocs}
                uploadLabel={t('upload')}
                uploadedLabel={t('uploaded')}
                expiryPh={t('expiryPh')}
                docsTitle={t('docsTitle')}
              />
            ) : isReviewStep ? (
              <ReviewStep steps={steps} draft={draft} fieldByKey={fieldByKey} declarationLabel={t('declaration')} />
            ) : (
              stepFields.map((f) => (
                <FieldWidget
                  key={f.key}
                  field={f}
                  value={current ? values[f.key] : undefined}
                  onChange={(v) => current && setStepValue(current.key, f.key, v)}
                />
              ))
            )}

            {isReviewStep && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox" className="mt-1"
                  checked={values['declaration'] === true}
                  onChange={(e) => current && setStepValue(current.key, 'declaration', e.target.checked)}
                />
                <span>{t('declaration')} <span className="text-destructive">*</span></span>
              </label>
            )}

            {stepError && <p className="text-sm text-destructive">{stepError}</p>}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={goBack} className="rounded-lg border px-4 py-2 text-sm">{t('back')}</button>
              <button
                type="button"
                onClick={() => {
                  if (selected) {
                    try { window.localStorage.setItem(lsDraftKey(selected.typeKey), JSON.stringify(draft)); } catch { /* ignore */ }
                    setSaveState(applicationId ? 'saved' : 'local');
                  }
                }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {t('saveExit')}
              </button>
              {isReviewStep ? (
                <button
                  type="button" onClick={handleSubmit} disabled={submitting}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
                >
                  {submitting ? '…' : t('submit')}
                </button>
              ) : (
                <button type="button" onClick={goNext} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
                  {t('next')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Documents step ─────────────────────────────────────────────────────── */

function DocsStep({
  applicationId, requiredDocs, optionalDocs, uploadLabel, uploadedLabel, expiryPh, docsTitle,
}: {
  typeKey: string;
  applicationId: string | null;
  requiredDocs: DocSpec[];
  optionalDocs: DocSpec[];
  uploadLabel: string;
  uploadedLabel: string;
  expiryPh: string;
  docsTitle: string;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const upload = async (doc: DocSpec, file: File | undefined) => {
    if (!file) return;
    if (!applicationId) { setErr('Login to upload documents (draft is local-only).'); return; }
    setBusy(doc.key);
    setErr('');
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('docType', doc.key);
      if (expiry[doc.key]) form.append('expiryDate', expiry[doc.key]);
      await apiClient({ url: `/join/${applicationId}/documents`, method: 'POST', data: form });
      setDone((d) => ({ ...d, [doc.key]: true }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const row = (doc: DocSpec, mandatory: boolean) => (
    <div key={doc.key} className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{doc.label} {mandatory ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal">(optional)</span>}</p>
        {done[doc.key] && <span className="text-xs text-emerald-600">{uploadedLabel}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {doc.expiryRequired && (
          <input
            type="date" className="rounded-lg border px-2 py-1.5 text-sm bg-background" placeholder={expiryPh}
            value={expiry[doc.key] ?? ''} onChange={(e) => setExpiry((x) => ({ ...x, [doc.key]: e.target.value }))}
          />
        )}
        <label className="rounded-lg border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
          {busy === doc.key ? '…' : uploadLabel}
          <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => upload(doc, e.target.files?.[0])} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{docsTitle}</h3>
      {requiredDocs.map((d) => row(d, true))}
      {optionalDocs.map((d) => row(d, false))}
      {!applicationId && <p className="text-xs text-amber-600">Login to upload documents — fields stay saved on this device.</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

/* ── Review step ────────────────────────────────────────────────────────── */

function ReviewStep({
  steps, draft, fieldByKey, declarationLabel,
}: {
  steps: WizardStep[];
  draft: DraftState;
  fieldByKey: Map<string, WizardField>;
  declarationLabel: string;
}) {
  const fmt = (v: FieldValue | undefined): string => {
    if (v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
    return String(v);
  };
  void declarationLabel;
  return (
    <div className="space-y-4">
      {steps.filter((s) => s.key !== 'review').map((s) => {
        const vals = draft[s.key] ?? {};
        const keys = s.key === 'account'
          ? [...ACCOUNT_CONTACT_FIELDS.map((f) => f.key), ...s.fields]
          : s.fields;
        if (s.key === 'documents') return null;
        return (
          <div key={s.key} className="rounded-lg border p-3">
            <h3 className="text-sm font-semibold">{s.label}</h3>
            <dl className="mt-2 space-y-1">
              {keys.map((k) => (
                <div key={k} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{fieldByKey.get(k)?.label ?? k}</dt>
                  <dd className="text-right font-medium">{fmt(vals[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
