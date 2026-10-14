import {
  Stethoscope, ShieldCheck, AlertTriangle, Sparkles, CheckCircle2,
  FileText, Activity, Heart, Scale, Clock, Lock, PhoneCall,
  UserCheck, Award, Zap, Building2, BookOpen, AlertCircle,
  Eye, Headphones, Droplets, Home, Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PractitionerDTO } from './PractitionerHeader';
import { normalizePractitionerRole } from '../practitionerSectionRegistry';

interface PractitionerTypeSpecificProps {
  practitioner: PractitionerDTO;
}

export default function PractitionerTypeSpecific({ practitioner }: PractitionerTypeSpecificProps) {
  const role = normalizePractitionerRole(practitioner.roleType || practitioner.kind || (typeof practitioner.specialty === 'string' ? practitioner.specialty : ''));

  switch (role) {
    case 'dentist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Dental Specialties & Clinic Standards</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Dental Procedures & Price Guide</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>Dental Scaling & Polishing</span>
                  <strong className="text-foreground">From ₹800</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>Single-Sitting Root Canal (RCT)</span>
                  <strong className="text-foreground">From ₹2,500</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>Ceramic / Zirconia Crown</span>
                  <strong className="text-foreground">From ₹3,500</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>Dental Implants (Titanium)</span>
                  <strong className="text-foreground">From ₹18,000</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Invisible Aligners / Braces</span>
                  <strong className="text-foreground">From ₹35,000</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Equipment & Sterilisation Standards</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Class-B Autoclave 4-tier Sterilisation (100% infection control)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Low-radiation Digital RVG & Panoramic OPG in-house</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kid-friendly dental setup & painless local anesthesia wand</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero-cost EMI options available for aligners & implants</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      );

    case 'ayush':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">AYUSH & Holistic Medicine Profile</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Traditional System & Therapies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Practicing traditional Ayurveda & Naturopathy based on Prakriti (Vata-Pitta-Kapha) constitution analysis and root-cause holistic management.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Panchakarma', 'Shirodhara', 'Abhyanga', 'Nadi Pariksha', 'Diet & Lifestyle Swasthavritta'].map((t, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" /> Compliance & Complementary Care Note
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All herbal formulations and Panchakarma therapies are governed by AYUSH regulatory standards. AYUSH care is complementary; for acute medical emergencies, please visit an allopathic tertiary emergency center immediately.
              </p>
            </div>
          </div>
        </div>
      );

    case 'physiotherapist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Physiotherapy & Rehabilitation Focus</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Techniques & Modalities</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Manual Therapy & Joint Mobilization</li>
                <li>• IFT, TENS & Ultrasound Therapy</li>
                <li>• Dry Needling & Kinesio Taping</li>
                <li>• Post-operative Ortho Rehab (ACL/TKR)</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Doorstep Home Visits</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Home visit physiotherapy available within a 10 km radius with portable electrotherapy modalities and assessment kits.
              </p>
              <div className="text-xs font-bold text-foreground mt-2">Home session: From ₹800/visit</div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">10-Session Rehab Package</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Includes full functional assessment, personalized exercise chart on app, and weekly mobility progress re-evaluation.
              </p>
              <div className="text-xs font-bold text-primary mt-2">Package: ₹6,500 (Save 20%)</div>
            </div>
          </div>
        </div>
      );

    case 'dietitian':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Heart className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Clinical Nutrition & Dietetic Plans</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Specialty Diets</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Diabetes (HbA1c) Reversal Protocols</li>
                <li>• PCOS / Hormonal Balance Diets</li>
                <li>• Renal & Cardiac Low-Sodium Plans</li>
                <li>• Indian Regional (Jain, South, Satvik)</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">What's Included</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Weekly updated meal plans with recipes</li>
                <li>• Daily WhatsApp / App chat check-ins</li>
                <li>• Grocery shopping guide & eating-out tips</li>
                <li>• Monthly lab report (Lipid/Sugar) review</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Plans & Subscriptions</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>1-Week Kickstart</span>
                  <strong>₹799</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>4-Week Intensive</span>
                  <strong>₹2,499</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>12-Week Transformation</span>
                  <strong>₹5,999</strong>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            * Disclaimer: Dietary guidance is tailored to metabolic parameters. Results vary based on individual adherence and medical conditions. Guaranteed weight loss claims are strictly prohibited under health advertising guidelines.
          </p>
        </div>
      );

    case 'counsellor':
    case 'psychologist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-heading text-lg font-bold text-foreground">Mental Health & Psychological Counseling</h2>
            </div>
            <Badge variant="outline" className="text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200">
              100% Confidential Session
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Therapeutic Modalities & Focus Areas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evidence-based psychotherapy including Cognitive Behavioral Therapy (CBT), Acceptance & Commitment Therapy (ACT), and Trauma-Informed Counseling.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Anxiety & Panic', 'Depression', 'Work Stress & Burnout', 'Relationship / Couples', 'Grief & Loss', 'Self-Esteem'].map((c, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Session Privacy & LiveKit Video</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Peer-to-peer encrypted in-app video (no Google Meet / Zoom links)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Discreet billing mode (neutral merchant statement)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Strict code of ethics under RCI / psychological counseling guidelines</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Emergency Crisis Hotline Box */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs">
            <PhoneCall className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-400">Immediate Mental Health Crisis Support</p>
              <p className="text-muted-foreground mt-0.5">
                If you or someone you know is undergoing an acute psychological crisis or feeling suicidal, please reach out to the Govt. of India 24x7 National Tele-Mental Health Helpline:
                <strong className="text-rose-700 dark:text-rose-300 ml-1">Tele-MANAS: 14416 (Toll-Free)</strong> or dial <strong className="text-rose-700 dark:text-rose-300">112</strong>.
              </p>
            </div>
          </div>
        </div>
      );

    case 'psychiatrist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">Psychiatric Evaluation & Telemedicine Compliance</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Clinical Psychiatric Care</h3>
              <p className="text-muted-foreground leading-relaxed">
                Medical evaluation of neuropsychiatric conditions, mood disorders, adult ADHD, OCD, and medication management with periodic monitoring of therapeutic response.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /> Telemedicine Prescribing Rules (NMC)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                In strict accordance with NMC Telemedicine Practice Guidelines, Schedule X and narcotic psychiatric medications cannot be prescribed over tele-consultations. An in-person clinical visit is mandated for restricted prescriptions.
              </p>
            </div>
          </div>
        </div>
      );

    case 'nurse':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Activity className="w-5 h-5 text-sky-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Home Nursing Care & Clinical Skills</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Certified Clinical Skills</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• IV Infusions & IM/SC Injections</li>
                <li>• Urinary Catheterization (Foley's insertion & care)</li>
                <li>• Post-Operative Sterile Wound Dressing</li>
                <li>• Tracheostomy, Ryle's Tube feeding & Suctioning</li>
                <li>• ICU-at-Home Patient Vitals & Ventilator Monitoring</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Shift Options & Background Check</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>Short Visit (Procedure: Injection / Dressing)</span>
                  <strong>₹350 – ₹600</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span>12-Hour Shift (Day or Night)</span>
                  <strong>₹1,400 – ₹1,800</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>24-Hour Live-in Nursing Care</span>
                  <strong>₹2,500 – ₹3,200</strong>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                <ShieldCheck className="w-4 h-4" /> State Nursing Council Registered & Police Verified
              </div>
            </div>
          </div>
        </div>
      );

    case 'lawyer':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Scale className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Legal Practice & Medico-Legal Advisory</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Practice Areas</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Medical Negligence & Malpractice Claims</li>
                <li>• Consumer Court (NCDRC / SCDRC) Disputes</li>
                <li>• Health Insurance Repudiation & Claim Rejections</li>
                <li>• Hospital Regulatory Compliance & Clinical Establishment Act</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Bar Council Compliance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Registered with Bar Council of India. In accordance with BCI rules prohibiting commercial solicitation and advertisement of legal services, this profile provides purely factual professional information and consultation scheduling.
              </p>
            </div>
          </div>
        </div>
      );

    case 'yoga_teacher':
    case 'trainer':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading text-lg font-bold text-foreground">Fitness & Yoga Training Modules</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Batch Schedule & Training Formats</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• Morning Batch (06:30 AM – 07:30 AM) • Studio / Online</li>
                <li>• Evening Batch (06:00 PM – 07:00 PM) • Studio / Online</li>
                <li>• 1-on-1 Personalized Transformation Coaching</li>
                <li>• Prenatal / Postnatal & Senior Mobility Modules</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h3 className="font-bold text-amber-700 dark:text-amber-400 text-sm">Physical Readiness (PAR-Q)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Participants recovering from recent surgery, spinal conditions, or cardiovascular history are required to obtain medical clearance from their treating doctor before enrolling in high-intensity training.
              </p>
            </div>
          </div>
        </div>
      );

    case 'speech_occupational':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Speech, Language & Occupational Rehabilitation</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
              <h3 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm">Focus Areas & Therapeutic Interventions</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• Stuttering, Stammering & Voice Modulation Therapy</li>
                <li>• Pediatric Speech Delay, Autism & Aphasia Rehabilitation</li>
                <li>• Sensory Integration & Fine Motor Skill Training</li>
                <li>• Activities of Daily Living (ADL) & Ergonomic Independence</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="font-bold text-foreground text-sm">IEP & Progress Assessment</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every client receives an Individualized Education Program (IEP) with milestone tracking, periodic caregiver counseling, and objective baseline assessment scores.
              </p>
              <div className="flex items-center gap-2 pt-1 text-emerald-600 font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>RCI Registered Professional (Rehabilitation Council of India)</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'attendant':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Home className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Caregiver & Bedside Attendant Profile</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
              <span className="font-bold text-foreground block">Caregiving Tasks</span>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li>• Bedside mobility & transfer</li>
                <li>• Sponge bath & personal hygiene</li>
                <li>• Oral feeding & medication reminders</li>
                <li>• Basic vitals (BP/Pulse/Temp) log</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
              <span className="font-bold text-foreground block">Shift Durations</span>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li>• 4-Hour Daytime Support</li>
                <li>• 12-Hour Day / Night Shift</li>
                <li>• 24-Hour Live-in Attendant</li>
                <li>• 1-Day Trial Booking Available</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Trust & Verification</span>
              <p className="text-muted-foreground text-[11px]">
                Background verified by local police authority · Aadhaar identity validated · Hospital & agency certified training.
              </p>
            </div>
          </div>
        </div>
      );

    case 'phlebotomist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Droplets className="w-5 h-5 text-rose-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Doorstep Sample Collection Standards</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">Cold-Chain Kit</span>
              <p className="text-muted-foreground">Certified gel-pack insulated carry kit maintaining strictly 2°C – 8°C during sample transit.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">Vacutainer Protocols</span>
              <p className="text-muted-foreground">Pre-labeled barcode tubes, sterile disposable needles opened in front of patient.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
              <span className="font-bold text-rose-700 dark:text-rose-400 block">Doorstep Verification</span>
              <p className="text-muted-foreground">Phlebotomist presents digital FindMedi QR Badge with matching photo ID before entry.</p>
            </div>
          </div>
        </div>
      );

    case 'optometrist_audiologist':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Eye className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Vision & Hearing Diagnostic Services</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
              <h3 className="font-bold text-blue-700 dark:text-blue-400 text-sm">Optometry & Vision Care</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• Comprehensive Computerized Eye Testing & Refraction</li>
                <li>• Contact Lens Fitting, Evaluation & Toric Solutions</li>
                <li>• Low-Vision Assessment & Pediatric Vision Screening</li>
                <li>• Digital Prescription Sync with FindMedi Records</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Audiology & Hearing Health</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• Pure Tone Audiometry (PTA) & Tympanometry</li>
                <li>• Digital Hearing Aid Trial, Programming & Fitting</li>
                <li>• Tinnitus Management & Hearing Protection Consulting</li>
                <li>• Council / RCI certified audiologist supervision</li>
              </ul>
            </div>
          </div>
        </div>
      );

    case 'tpa_executive':
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="font-heading text-lg font-bold text-foreground">Cashless Mediclaim & TPA Helpdesk</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">Pre-Auth Coordination</span>
              <p className="text-muted-foreground">Rapid drafting and submission of initial pre-authorization paperwork within 2 hours of hospital admission.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">All Major Insurers & TPAs</span>
              <p className="text-muted-foreground">Empanelled with Star, Care, HDFC ERGO, Medi Assist, Vidal, Paramount, and Raksha TPA networks.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-1">
              <span className="font-bold text-teal-700 dark:text-teal-400 block">Transparent Advisory</span>
              <p className="text-muted-foreground">Guidance on non-payable expenses, co-pay clauses, and deduction limits under IRDAI guidelines.</p>
            </div>
          </div>
        </div>
      );

    default:
      // Canonical Doctor block (upgraded)
      return (
        <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">Clinical Practice & Consultation Protocols</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
              <span className="font-bold text-foreground block">Patient Prep Instructions</span>
              <p className="text-muted-foreground leading-relaxed">
                Please bring previous diagnostic reports, current medication strips, and discharge summaries for an effective consultation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
              <span className="font-bold text-foreground block">Digital Health Records</span>
              <p className="text-muted-foreground leading-relaxed">
                Prescriptions and lab referrals are automatically linked with your FindMedi ABHA Health Locker for seamless continuity of care.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Free 7-Day Follow-Up</span>
              <p className="text-muted-foreground leading-relaxed">
                All consultations include a free follow-up window within 7 days to review lab results and monitor treatment efficacy.
              </p>
            </div>
          </div>
        </div>
      );
  }
}
