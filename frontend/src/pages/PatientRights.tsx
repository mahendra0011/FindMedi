import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HeartHandshake, ShieldCheck, FileText, CheckCircle2, UserCheck, AlertTriangle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PatientRights() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Charter of Patient Rights & Responsibilities</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Adopted from the Ministry of Health & Family Welfare (MoHFW) & NHRC Guidelines
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          {/* Statutory Charter Introduction */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> 1. National Patient Rights Framework
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FindMedi is founded on the fundamental principle that healthcare is a basic human right. We strictly enforce the <strong>Charter of Patient Rights</strong> drafted by the National Human Rights Commission (NHRC) and approved by the Ministry of Health and Family Welfare (MoHFW), Government of India across all participating healthcare establishments and practitioners.
            </p>
          </section>

          {/* Core Patient Rights */}
          <section className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> 2. Fundamental Rights of the Patient
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">1. Right to Adequate Information</span>
                <p className="text-muted-foreground">Every patient has the right to receive clear, comprehensible information regarding their diagnosis, proposed treatments, potential risks, and verified qualifications of attending practitioners.</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">2. Right to Emergency Medical Care</span>
                <p className="text-muted-foreground">Under Supreme Court directive (<em>Parmanand Katara v. UOI</em>), no emergency patient shall be denied immediate stabilization or basic life support due to financial inability or police formalities.</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">3. Right to Medical Records & ABHA</span>
                <p className="text-muted-foreground">Patients have an absolute statutory right to obtain digital and physical copies of diagnostic reports, discharge summaries, and prescription records within 72 hours.</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">4. Right to Transparent Billing</span>
                <p className="text-muted-foreground">Patients are entitled to itemized bills and upfront price schedules for doctor consultations, diagnostic investigations, and emergency ambulance transit fees.</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">5. Right to Privacy & Dignity</span>
                <p className="text-muted-foreground">Clinical examinations, teleconsultation feeds, and sensitive personal health data (SPHD) are protected under strict confidentiality protocols and the DPDP Act 2023.</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground block">6. Right to Second Opinion</span>
                <p className="text-muted-foreground">Patients possess the unhindered right to seek an independent second medical opinion from any specialist without prejudice from their current primary physician.</p>
              </div>
            </div>
          </section>

          {/* Patient Responsibilities & Zero Tolerance for Violence */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-violet-500" /> 3. Patient Responsibilities & Healthcare Worker Protection
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Effective healthcare relies on mutual respect, honesty, and partnership between patients and clinical responders:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li><strong>Accurate Medical History:</strong> Patients and caregivers must disclose all known drug allergies, existing medical conditions, and ongoing medications to prevent adverse drug reactions.</li>
              <li><strong>Treatment Adherence:</strong> Follow prescribed treatment regimens and medication dosages as instructed by licensed physicians.</li>
              <li>
                <strong>Zero Tolerance for Workplace Violence:</strong> Healthcare workers (doctors, nurses, paramedics, ambulance drivers) are protected by state <strong>Medicare Service Persons and Medicare Service Institutions Acts</strong>. Verbal abuse, physical aggression, or vandalism of medical ambulances/equipment is a cognizable, non-bailable offense leading to instant platform blacklisting and police prosecution.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. Patient Advocacy Division.
        </div>
      </div>
    </div>
  );
}
