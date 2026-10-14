import {
  HeartPulse,
  BedDouble,
  Ambulance,
  Microscope,
  Pill,
  Smile,
  Eye,
  Flower2,
  Activity,
  Dumbbell,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Droplets,
  Phone,
  FileText,
  Home,
  Baby,
  Stethoscope,
  CalendarDays,
  Users,
  Truck,
  Package,
  Leaf,
  Repeat,
  HeartHandshake,
  ShieldAlert,
  Scissors,
  Glasses,
  Syringe,
  Timer,
  IndianRupee,
  MapPin,
  UserCheck,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface FacilityTypeSpecificProps {
  type: string;
  data: any;
  onAction?: (actionKey: string, payload?: any) => void;
}

export default function FacilityTypeSpecific({ type, data = {}, onAction }: FacilityTypeSpecificProps) {
  const normType = (type || 'hospital').toLowerCase();

  // ── Hospital: Departments + Emergency + Beds ──
  if (normType === 'hospital') {
    const depts = data.departments || [
      'Cardiology & Cath Lab',
      'Orthopaedics & Joint Replacement',
      'Neurology & Neurosurgery',
      'Gastroenterology & Hepatology',
      'Paediatrics & Neonatology',
      'Obstetrics & Gynaecology',
      'Nephrology & Dialysis',
      'Pulmonology & Critical Care',
      'Oncology & Daycare Chemotherapy',
      'General & Laparoscopic Surgery',
    ];

    return (
      <div className="space-y-6">
        {/* Emergency & Trauma Section */}
        <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">24x7 Emergency & Critical Trauma Unit</h3>
              <p className="text-xs text-muted-foreground">Dedicated emergency physicians, ICU, CCU, and rapid ambulance response</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-card/80 rounded-xl p-3 border">
              <span className="text-muted-foreground block text-[11px]">Trauma Level</span>
              <span className="font-bold text-foreground text-sm">{data.traumaLevel || 'Level 1 Comprehensive'}</span>
            </div>
            <div className="bg-card/80 rounded-xl p-3 border">
              <span className="text-muted-foreground block text-[11px]">Emergency Helpline</span>
              <span className="font-bold text-rose-600 text-sm font-mono">{data.emergencyPhone || '108 / +91-9876543210'}</span>
            </div>
            <div className="bg-card/80 rounded-xl p-3 border">
              <span className="text-muted-foreground block text-[11px]">Ambulance Fleet</span>
              <span className="font-bold text-foreground text-sm">BLS & ALS On-Site</span>
            </div>
          </div>
        </div>

        {/* Live Beds / Inpatient Capacity */}
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Inpatient Ward Categories & Tariffs</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="border rounded-xl p-3 space-y-1">
              <span className="font-semibold block text-foreground">General Ward</span>
              <p className="text-muted-foreground">Shared room with nursing monitoring</p>
              <span className="font-bold text-sm text-emerald-600 block pt-1">₹{data.genWardRate || '1,200'} / day</span>
            </div>
            <div className="border rounded-xl p-3 space-y-1">
              <span className="font-semibold block text-foreground">Semi-Private / Private</span>
              <p className="text-muted-foreground">Air-conditioned with attendant cot</p>
              <span className="font-bold text-sm text-emerald-600 block pt-1">₹{data.privateRate || '3,500'} / day</span>
            </div>
            <div className="border rounded-xl p-3 space-y-1">
              <span className="font-semibold block text-foreground">Intensive Care (ICU)</span>
              <p className="text-muted-foreground">Multi-para monitoring & ventilator</p>
              <span className="font-bold text-sm text-emerald-600 block pt-1">₹{data.icuRate || '8,500'} / day</span>
            </div>
          </div>
        </div>

        {/* Clinical Departments */}
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-base text-foreground">Specialised Medical Departments</h3>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {depts.map((d: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Blood Bank Availability Heatmap ──
  if (normType === 'blood_bank') {
    const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className="font-bold text-base text-foreground">Live Blood Component Stock</h3>
            <p className="text-xs text-muted-foreground">Updated every 2 hours · Compliant with NACO & State Blood Transfusion Council</p>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
          {groups.map((grp) => (
            <div key={grp} className="rounded-xl border p-3 text-center bg-rose-500/5 border-rose-500/20">
              <span className="text-base font-extrabold text-rose-600 block">{grp}</span>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase">Available</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Components available: Whole Human Blood, Packed Red Blood Cells (PRBC), Fresh Frozen Plasma (FFP), Platelet Concentrate.
        </p>
      </div>
    );
  }

  // ── Gym & Fitness Plans ──
  if (normType === 'gym') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Membership Plans & Equipment</h3>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="border rounded-xl p-4 space-y-2 bg-card">
            <span className="font-bold text-sm block">Monthly Pass</span>
            <p className="text-muted-foreground">Full floor access, cardio + weights</p>
            <span className="text-base font-bold text-foreground block">₹1,500 / month</span>
            <Button size="sm" variant="outline" className="w-full text-xs">Choose Monthly</Button>
          </div>
          <div className="border-2 border-primary rounded-xl p-4 space-y-2 bg-primary/5 relative">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full absolute -top-2.5 right-3">Popular</span>
            <span className="font-bold text-sm block">Quarterly Pass</span>
            <p className="text-muted-foreground">Floor access + 2 trainer sessions</p>
            <span className="text-base font-bold text-primary block">₹3,800 / 3 months</span>
            <Button size="sm" className="w-full text-xs">Choose Quarterly</Button>
          </div>
          <div className="border rounded-xl p-4 space-y-2 bg-card">
            <span className="font-bold text-sm block">Annual Unlimited</span>
            <p className="text-muted-foreground">Full year + locker + steam bath</p>
            <span className="text-base font-bold text-foreground block">₹12,000 / year</span>
            <Button size="sm" variant="outline" className="w-full text-xs">Choose Annual</Button>
          </div>
        </div>

        {/* Peak Hours Graph preview */}
        <div className="pt-2 text-xs space-y-1.5">
          <span className="font-semibold text-muted-foreground block">Typical Crowd Meter:</span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>6 AM – 9 AM: <span className="text-amber-600 font-semibold">Moderate</span></span> · 
            <span>9 AM – 5 PM: <span className="text-emerald-600 font-semibold">Quiet</span></span> · 
            <span>5 PM – 9 PM: <span className="text-rose-600 font-semibold">Peak</span></span>
          </div>
        </div>
      </div>
    );
  }

  // ── Dental Specialties & Sterilization ──
  if (normType === 'dental') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Smile className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Dental Specialities & Sterilization Protocol</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="border rounded-xl p-3 bg-muted/20">
            <span className="font-bold block text-foreground">Class-B Autoclave Sterilization</span>
            <p className="text-muted-foreground text-[11px]">100% individual sealed sterilization pouches opened in front of patients.</p>
          </div>
          <div className="border rounded-xl p-3 bg-muted/20">
            <span className="font-bold block text-foreground">In-house Digital OPG & X-Ray</span>
            <p className="text-muted-foreground text-[11px]">Low radiation digital sensor radiography for instantaneous root diagnosis.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Government Health Centre (PHC/CHC/Jan Aushadhi) ──
  if (normType === 'govt') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base text-foreground">Government Healthcare & Free Public Services</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Free General OPD Consultations</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Free Childhood & Maternal Immunisation</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Essential Generic Medicines (Jan Aushadhi)</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Free NCD & Diabetes Screenings</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          Information sourced from official govt portals · Last verified periodically · Claim this listing if you are facility staff
        </p>
      </div>
    );
  }

  // ── Eye Hospital / Optical (spec §2.6) ──
  if (normType === 'eye') {
    const specialties = data.specialties || ['Cataract (Phaco)', 'Retina & Vitreous', 'Glaucoma', 'Cornea & Oculoplasty', 'Squint & Paediatric Ophthal', 'LASIK & Refractive'];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Eye Specialities, Technology & Optical Shop</h3>
            <p className="text-xs text-muted-foreground">Phaco emulsification · OCT · Fundus laser · Computerised vision testing</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          {specialties.map((s: string) => (
            <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">{s}</span>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="border rounded-xl p-3 bg-blue-500/5 border-blue-500/20">
            <span className="font-bold block text-foreground">Cataract Surgery Package</span>
            <p className="text-muted-foreground text-[11px]">Phaco + foldable IOL, 1-day stay, post-op drops included</p>
            <span className="text-sm font-bold text-blue-600 block pt-1">From ₹{data.cataractPrice || '18,000'}</span>
          </div>
          <div className="border rounded-xl p-3 bg-blue-500/5 border-blue-500/20">
            <span className="font-bold block text-foreground">LASIK / Specs Removal</span>
            <p className="text-muted-foreground text-[11px]">Blade-free contoura vision, screening included</p>
            <span className="text-sm font-bold text-blue-600 block pt-1">From ₹{data.lasikPrice || '35,000'}</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Optical shop on premises: frames & lenses from leading brands · Free eye-test with frame purchase · Prescription upload for powered lenses</p>
      </div>
    );
  }

  // ── AYUSH Clinic / Panchakarma (spec §2.7) ──
  if (normType === 'ayush') {
    const system = data.systemOfMedicine || 'Ayurveda';
    const treatments = data.treatments || [
      { name: 'Panchakarma Detox (7 days)', duration: '7 days', price: '₹12,000' },
      { name: 'Abhyanga full-body massage', duration: '60 min', price: '₹1,200' },
      { name: 'Shirodhara stress therapy', duration: '45 min', price: '₹1,500' },
      { name: 'Nadi Pariksha + consult', duration: '30 min', price: '₹400' },
    ];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Flower2 className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">{system} Treatments & Panchakarma</h3>
            <p className="text-xs text-muted-foreground">Practitioners with valid State Council registration (CCIM/NCISM)</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          {treatments.map((t: any) => (
            <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <div className="min-w-0">
                <span className="font-semibold text-foreground block truncate">{t.name}</span>
                <span className="text-[11px] text-muted-foreground">{t.duration}</span>
              </div>
              <span className="font-bold text-emerald-600 shrink-0 pl-2">{t.price}</span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>AYUSH therapies are complementary support, not a substitute for emergency or acute medical care. No cure claims are permitted on listings.</span>
        </div>
      </div>
    );
  }

  // ── Dialysis Centre (spec §2.8) ──
  if (normType === 'dialysis') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Dialysis Shifts, Water Quality & Safety</h3>
            <p className="text-xs text-muted-foreground">Recurring slot booking · RO-treated dialysis-grade water · Isolation machines for HBV/HCV</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="border rounded-xl p-3">
            <span className="font-bold block text-foreground">Morning Shift</span>
            <p className="text-muted-foreground">6:00 AM – 11:00 AM</p>
            <span className="text-[11px] font-semibold text-emerald-600">Slots available</span>
          </div>
          <div className="border rounded-xl p-3">
            <span className="font-bold block text-foreground">Afternoon Shift</span>
            <p className="text-muted-foreground">12:00 PM – 5:00 PM</p>
            <span className="text-[11px] font-semibold text-amber-600">Limited slots</span>
          </div>
          <div className="border rounded-xl p-3">
            <span className="font-bold block text-foreground">Evening Shift</span>
            <p className="text-muted-foreground">5:00 PM – 10:00 PM</p>
            <span className="text-[11px] font-semibold text-emerald-600">Slots available</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Per-session price: ₹{data.sessionPrice || '1,800'}–₹{data.sessionPriceMax || '2,500'} (varies by machine type) · Nephrologist on call · PM-JAY / insurance empanelled · Transport assistance available
        </p>
      </div>
    );
  }

  // ── Yoga Studio (spec §2.14) ──
  if (normType === 'yoga') {
    const styles = data.styles || ['Hatha', 'Vinyasa Flow', 'Ashtanga', 'Prenatal Yoga', 'Therapeutic / Chair Yoga'];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Styles, Batch Timetable & Trial</h3>
            <p className="text-xs text-muted-foreground">Teachers certified by Yoga Certification Board (YCB), Ministry of AYUSH</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          {styles.map((s: string) => (
            <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium">{s}</span>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="border rounded-xl p-3">
            <span className="font-bold block">Drop-in Class</span>
            <span className="text-emerald-600 font-bold">₹300 / class</span>
          </div>
          <div className="border-2 border-primary rounded-xl p-3 bg-primary/5">
            <span className="text-[10px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">1st Class Free</span>
            <span className="font-bold block pt-1">Trial Session</span>
            <span className="text-primary font-bold">Free</span>
          </div>
          <div className="border rounded-xl p-3">
            <span className="font-bold block">Monthly Unlimited</span>
            <span className="text-emerald-600 font-bold">₹2,000 / month</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Prenatal & therapy batches require doctor clearance · Online live sessions available · Women-only batch timings listed in timetable</p>
      </div>
    );
  }

  // ── Wellness Centre / Spa (spec §2.15) ──
  if (normType === 'wellness') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Therapies, Hygiene Standards & Safety</h3>
            <p className="text-xs text-muted-foreground">Therapist gender options · Single-use linens · Sanitised equipment between sessions</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-800 dark:text-purple-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Wellness & spa services are non-medical. Contraindications (pregnancy, cardiac conditions) must be declared. No medical-cure claims are permitted.</span>
        </div>
      </div>
    );
  }

  // ── Equipment Rental / Medical Devices (spec §2.16) ──
  if (normType === 'equipment') {
    const items = data.catalogue || [
      { name: 'Oxygen Concentrator 5L', rentPerDay: 350, buyPrice: 28000, deposit: 2000 },
      { name: 'Hospital Bed (electric, remote)', rentPerDay: 500, buyPrice: 42000, deposit: 3000 },
      { name: 'CPAP Machine with mask', rentPerDay: 450, buyPrice: 35000, deposit: 2500 },
      { name: 'Wheelchair (foldable, light)', rentPerDay: 150, buyPrice: 6500, deposit: 500 },
    ];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Rent / Buy Catalogue</h3>
            <p className="text-xs text-muted-foreground">Sanitised & delivered · Refundable deposit · Demo on delivery · Warranty on purchase</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          {items.map((it: any) => (
            <div key={it.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <div className="min-w-0">
                <span className="font-semibold text-foreground block truncate">{it.name}</span>
                <span className="text-[11px] text-muted-foreground">Deposit ₹{it.deposit} · Delivery in 24 hrs</span>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="font-bold text-primary block">Rent ₹{it.rentPerDay}/day</span>
                <span className="text-[11px] text-muted-foreground">Buy ₹{it.buyPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">Oxygen concentrators & CPAP devices require a valid doctor&apos;s prescription. Safety instructions provided at delivery.</p>
      </div>
    );
  }

  // ── Ambulance Operator (spec §2.12) ──
  if (normType === 'ambulance') {
    const fleet = data.fleet || [
      { type: 'BLS (Basic Life Support)', equipment: 'Oxygen, stretcher, first-aid', fare: '₹800 base + ₹28/km' },
      { type: 'ALS (Advanced Life Support)', equipment: 'Ventilator, defibrillator, infusion pumps', fare: '₹1,500 base + ₹45/km' },
      { type: 'NICU Transport', equipment: 'Transport incubator, neonatal ventilator', fare: 'On request' },
    ];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-rose-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Fleet, Equipment & Fare Structure</h3>
            <p className="text-xs text-muted-foreground">GPS-tracked · Trained EMT drivers · Available 24x7 · Average ETA 12–18 min</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          {fleet.map((f: any) => (
            <div key={f.type} className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{f.type}</span>
                <span className="font-bold text-rose-600">{f.fare}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{f.equipment}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Fares are indicative; final fare depends on distance, waiting time & tolls. Driver/EMT credentials verified (numbers masked for privacy).</p>
      </div>
    );
  }

  // ── Event / Camp / Workshop (spec §2.19) ──
  if (normType === 'event') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Event Details & Registration</h3>
            <p className="text-xs text-muted-foreground">{data.eventDate || 'Sat, 25 Oct · 9:00 AM – 2:00 PM'} · {data.eventVenue || 'Community Hall, Health City'}</p>
          </div>
        </div>
        {data.seatsLeft !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="font-semibold text-amber-800 dark:text-amber-300">Seats left: {data.seatsLeft}</span>
            <span className="text-muted-foreground">Register by {data.registrationDeadline || '23 Oct'}</span>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">Organiser:</span> {data.organiser || 'Partner facility (verified)'}</p>
          <p><span className="font-semibold text-foreground">Eligibility:</span> {data.eligibility || 'Open to all · Age/gender criteria listed per event'}</p>
          <p><span className="font-semibold text-foreground">Consent:</span> Photos may be taken at events. Attendance implies consent to event photography; medical data from camps is stored only with separate consent.</p>
        </div>
      </div>
    );
  }

  // ── Maternity / IVF (spec §2.9) ──
  if (normType === 'maternity_ivf') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Baby className="w-5 h-5 text-pink-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Maternity Packages & IVF (ART Regulated)</h3>
            <p className="text-xs text-muted-foreground">Obstetricians & fertility specialists · Level-III NICU · Labour delivery rooms</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="border rounded-xl p-3">
            <span className="font-bold block">Normal Delivery Package</span>
            <p className="text-muted-foreground">2-day stay, doctor, room</p>
            <span className="text-pink-600 font-bold">From ₹{data.normalDeliveryPrice || '25,000'}</span>
          </div>
          <div className="border rounded-xl p-3">
            <span className="font-bold block">C-Section Package</span>
            <p className="text-muted-foreground">4-day stay, OT, anaesthesia</p>
            <span className="text-pink-600 font-bold">From ₹{data.csectionPrice || '55,000'}</span>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-800 dark:text-pink-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>IVF services operate under ART Act registration. Success rates are published only from audited internal data. No gender-determination services are offered (PCPNDT compliant).</span>
        </div>
      </div>
    );
  }

  // ── Rehab / De-addiction / Child Development (spec §2.10) ──
  if (normType === 'rehab') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Programs, Admission & Privacy</h3>
            <p className="text-xs text-muted-foreground">Psychiatrist-led team · Residential & day programs · Family involvement sessions</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="border rounded-xl p-3">
            <span className="font-bold block">Residential Program</span>
            <p className="text-muted-foreground">30 / 60 / 90 days · 24x7 supervised stay</p>
          </div>
          <div className="border rounded-xl p-3">
            <span className="font-bold block">Day Care Program</span>
            <p className="text-muted-foreground">Mon–Sat · structured therapy + return home</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Your visit here is confidential. Notifications & statements use neutral labels (discreet mode). Admission requires assessment; helpline available 24x7.</span>
        </div>
      </div>
    );
  }

  // ── Pharmacy Store (spec §2.4) ──
  if (normType === 'pharmacy') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Delivery, Prescriptions & Store Info</h3>
            <p className="text-xs text-muted-foreground">Rx accepted · Cold-chain items available · Pharmacist on duty during store hours</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="border rounded-xl p-3">
            <Timer className="w-4 h-4 text-primary mb-1" />
            <span className="font-bold block">Delivery ETA</span>
            <span className="text-muted-foreground">{data.deliveryEta || '60–90 min within 5 km'}</span>
          </div>
          <div className="border rounded-xl p-3">
            <IndianRupee className="w-4 h-4 text-primary mb-1" />
            <span className="font-bold block">Delivery Fee</span>
            <span className="text-muted-foreground">{data.deliveryFee || '₹30 · Free above ₹499'}</span>
          </div>
          <div className="border rounded-xl p-3">
            <FileText className="w-4 h-4 text-primary mb-1" />
            <span className="font-bold block">Upload Rx</span>
            <span className="text-muted-foreground">Photo/PDF accepted for Rx medicines</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Drug Licence verified (number masked) · Returns per medicine category policy · H1 schedule medicines require valid prescription</p>
      </div>
    );
  }

  // ── Health-food / Supplement / Skincare Store (spec §2.17) ──
  if (normType === 'health_store') {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-foreground">Categories, Certifications & Delivery</h3>
            <p className="text-xs text-muted-foreground">Supplements · Health foods · Personal care · Baby care · Diabetes-friendly</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {['FSSAI Licensed', 'CDSCO Notified', 'Vegan Options', 'Sugar-Free Range', 'Lab-Tested'].map((b) => (
            <span key={b} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3" /> {b}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">Health supplements are not medicines and are not a substitute for medical advice or treatment. Prescription-only items are flagged and require a valid Rx.</p>
      </div>
    );
  }

  // ── Program / Membership (spec §2.21) ──
  if (normType === 'program') {
    const included = data.includes || ['Dedicated doctor consults', 'Dietitian plan', 'Progress tracking app', 'Monthly review session'];
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">{data.duration || '3-month'} Program · What&apos;s Included</h3>
            <p className="text-xs text-muted-foreground">Structured care program with clear schedule and outcome tracking (aggregate & anonymised)</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {included.map((inc: string) => (
            <div key={inc} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">{inc}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Medical clearance may be required before joining · Pause & cancellation policy applies · Talk to an advisor before enrolling if you have active conditions</p>
      </div>
    );
  }

  // ── Elder-Care / Assisted Living / Hospice (spec §2.22) ──
  if (normType === 'eldercare' || normType === 'elder_care' || normType === 'assisted_living' || normType === 'hospice') {
    const careLevels = data.careLevels || ['Independent Living', 'Assisted Care', 'Dementia & Memory Care', 'Palliative & Hospice'];
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Care Levels & Assisted Living Facility</h3>
              <p className="text-xs text-muted-foreground">{data.bedsAvailable ? `${data.bedsAvailable} Beds open` : 'Private & Sharing Suites'} · 24x7 In-house Nursing & Physician On-Call</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-2.5 text-xs pt-1">
            {careLevels.map((lvl: string) => (
              <div key={lvl} className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold block text-foreground">{lvl}</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs pt-2">
            <div className="border rounded-xl p-3">
              <span className="text-muted-foreground block text-[11px]">Visiting Hours</span>
              <span className="font-bold text-foreground">{data.visitingHours || '10:00 AM - 1:00 PM & 4:00 PM - 7:00 PM'}</span>
            </div>
            <div className="border rounded-xl p-3">
              <span className="text-muted-foreground block text-[11px]">Emergency Protocol</span>
              <span className="font-bold text-foreground">Tie-up with ICU Hospital + 24x7 Ambulance</span>
            </div>
            <div className="border rounded-xl p-3">
              <span className="text-muted-foreground block text-[11px]">Family Portal</span>
              <span className="font-bold text-foreground">Live daily vitals & activity reports</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">State establishment registered · Compassionate palliative care team · Dietary supervision with fresh in-house meal preparation.</p>
        </div>
      </div>
    );
  }

  // ── Vaccination Centre (spec §2.23) ──
  if (normType === 'vaccination' || normType === 'vaccination_centre') {
    const uipVaccines = ['BCG', 'Polio (OPV/IPV)', 'Hepatitis B', 'Pentavalent', 'Rotavirus', 'PCV', 'MR / MMR', 'DPT Booster'];
    const optionalVaccines = ['Influenza (Flu)', 'HPV (Cervical Cancer)', 'Typhoid Conjugate', 'Varicella (Chickenpox)', 'Hepatitis A'];
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Vaccines & Immunization Schedule</h3>
              <p className="text-xs text-muted-foreground">Govt Universal Immunization Programme (UIP) Free · Cold-chain certified storage (2°C - 8°C)</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free Govt UIP Schedule (Children & Pregnant Women)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {uipVaccines.map((v) => (
                  <span key={v} className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Optional & Travel Immunization
              </span>
              <div className="flex flex-wrap gap-1.5">
                {optionalVaccines.map((v) => (
                  <span key={v} className="text-xs bg-muted/40 text-foreground font-medium px-2.5 py-1 rounded-lg border">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Instant Digital Certificate</span>
              <p className="text-muted-foreground">Barcode-verified vaccination record with batch number & expiry date provided</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Post-Shot Observation</span>
              <p className="text-muted-foreground">30-minute monitored recovery lounge with emergency anaphylaxis kit on-site</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Diet Kitchen / Clinical Meal-Plan Provider (spec §2.24) ──
  if (normType === 'diet_kitchen' || normType === 'meal_plan') {
    const mealPlans = [
      { name: 'Diabetic Care (Low-GI)', desc: 'Balanced complex carbs, high fiber, sugar-free diabetic nutrition' },
      { name: 'Renal / Kidney Friendly', desc: 'Strictly monitored potassium, phosphorus & controlled protein levels' },
      { name: 'Cardiac & Hypertensive', desc: 'Low sodium, zero trans-fat, omega-rich heart healthy meals' },
      { name: 'Keto & Weight Management', desc: 'Calorie-counted macronutrient target meals curated by clinical dietitians' },
    ];
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Clinical Diet Plans & Hospital Partnerships</h3>
              <p className="text-xs text-muted-foreground">FSSAI Licensed Kitchen · Pure Veg, Jain & Halal options with complete allergen disclosure</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
            {mealPlans.map((mp) => (
              <div key={mp.name} className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <span className="font-bold text-foreground block">{mp.name}</span>
                <p className="text-muted-foreground text-[11px]">{mp.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs pt-2">
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Flexible Subscription</span>
              <p className="text-muted-foreground">Pause, skip, or cancel deliveries anytime via mobile app</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Delivery Windows</span>
              <p className="text-muted-foreground">Breakfast (7-9 AM), Lunch (12-2 PM), Dinner (7-9 PM)</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Clinical Verification</span>
              <p className="text-muted-foreground">Every plan verified by registered clinical dietitian (RD)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Specialty Centre (Cancer, Cardiac, Ortho, Spine, Pain, Sleep, Urology) (spec §2.25) ──
  if (normType === 'specialty_centre' || normType === 'cancer_centre' || normType === 'cardiac_cath_lab' || normType === 'ortho_spine_clinic' || normType === 'pain_clinic' || normType === 'sleep_lab' || normType === 'urology_centre') {
    const procedures = data.procedures || ['Comprehensive Specialty Consult', 'Advanced Diagnostic Workup', 'Minimally Invasive Interventions', 'Day-care Procedures & Infusions', 'Multidisciplinary Tumor Board / Case Review'];
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Advanced Specialty Care & Technology</h3>
              <p className="text-xs text-muted-foreground">Specialist-led diagnosis, cutting-edge equipment & multidisciplinary care pathways</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 text-xs pt-1">
            {procedures.map((proc: string) => (
              <div key={proc} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-medium text-foreground">{proc}</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs pt-2">
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Patient Care Pathway</span>
              <p className="text-muted-foreground">Initial Assessment → Targeted Diagnostics → Board Review → Personalized Care</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Cashless Desk & PM-JAY</span>
              <p className="text-muted-foreground">Empanelled with leading TPAs, private insurers & Ayushman Bharat schemes</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">Second Opinion Service</span>
              <p className="text-muted-foreground">Document review & tele-consult option with senior super-specialists</p>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <span className="font-bold">Medical Claims Policy:</span> All medical procedures and treatment plans are clinically supervised. No guaranteed or exaggerated outcome claims are made per platform medical governance.
          </div>
        </div>
      </div>
    );
  }

  // ── Corporate Wellness Program (B2B) (spec §2.26) ──
  if (normType === 'corporate_wellness' || normType === 'corporate_program') {
    const modules = [
      'Annual On-Site & Diagnostic Health Checkups',
      'Doctor & Dietitian Virtual Webinars',
      'AHA-Accredited CPR & First-Aid Training for Staff',
      'Confidential 24x7 Employee Mental Health & Counselling Desk',
      'Step Challenges & Corporate Fitness Leaderboards',
    ];
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">B2B Corporate Health & Employee Wellness Modules</h3>
              <p className="text-xs text-muted-foreground">Comprehensive institutional wellness plans tailored for 50 to 10,000+ employees</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 text-xs pt-1">
            {modules.map((m) => (
              <div key={m} className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">{m}</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="border rounded-xl p-3">
              <span className="font-bold block">k-Anonymous Aggregate Analytics</span>
              <p className="text-muted-foreground">Employers receive only anonymized health trends (e.g. general hypertension/ergonomic risk). Zero personal PHI is ever disclosed.</p>
            </div>
            <div className="border rounded-xl p-3">
              <span className="font-bold block">DPDP Act & HIPAA Compliant</span>
              <p className="text-muted-foreground">Enterprise-grade data encryption at rest and in transit with dedicated account manager and SLA.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

