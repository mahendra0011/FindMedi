import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, CheckCircle, Scale, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Terms of Service</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Last updated: September 2026 • FindMedi Healthcare Ecosystem</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> 1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground text-sm">
              By accessing, browsing, registering on, or utilizing the FindMedi platform (including our web portal, mobile applications, and connected health APIs), you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> 2. Medical Disclaimers & Emergency Protocols
            </h2>
            <p className="text-muted-foreground text-sm">
              FindMedi is a digital healthcare coordination platform connecting patients with licensed hospitals, registered medical practitioners, diagnostic laboratories, certified pharmacies, emergency ambulance operators, and patient attendants.
            </p>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs sm:text-sm space-y-1">
              <p className="font-semibold">⚠️ Acute Medical Emergencies:</p>
              <p>
                If you or someone around you is experiencing a life-threatening medical emergency (such as severe chest pain, stroke symptoms, major trauma, or profuse bleeding), please trigger the in-app Emergency SOS hotline or contact the national emergency services (112 or 108) immediately. Online text consultations and scheduled visits are not substitutes for acute trauma resuscitation.
              </p>
            </div>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> 3. Healthcare Provider Responsibilities & Onboarding
            </h2>
            <p className="text-muted-foreground text-sm">
              All healthcare practitioners and institutional facilities registering on FindMedi represent and warrant that they possess active, unencumbered statutory licenses (including National Medical Commission registration, State Bar Council enrollment, Drug Licenses Form 20/21, and Clinical Establishment Act registration). Any fraudulent submission of credentials will result in immediate permanent account suspension and statutory reporting to licensing authorities.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-500" /> 4. Appointment Bookings, Payments & Refund Policy
            </h2>
            <p className="text-muted-foreground text-sm">
              • <strong>Patient Cancellation:</strong> Full 100% refund is issued if an outpatient consultation is cancelled more than 2 hours prior to the scheduled slot.<br />
              • <strong>Provider Cancellation:</strong> If a doctor, ambulance, or laboratory cancels a pre-paid service, 100% of the booking amount is automatically credited back to the source payment method or instant MediCoins wallet.<br />
              • <strong>Medicine Orders:</strong> Sealed, unopened medicines may be returned within 48 hours of delivery, excluding cold-chain biologics and Schedule X formulations.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-500" /> 5. Telemedicine & Prescription Guidelines
            </h2>
            <p className="text-muted-foreground text-sm">
              All digital consultations conducted over FindMedi video or chat strictly adhere to the Telemedicine Practice Guidelines issued by the Board of Governors (in supersession of Medical Council of India). Digital prescriptions issued through the platform carry legal validity across registered Indian pharmacies. Habit-forming narcotics and Schedule X drugs cannot be prescribed via online teleconsultation.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-500" /> 6. Emergency Flying Doctor Services & Statutory License Compliance
            </h2>
            <p className="text-muted-foreground text-sm">
              FindMedi provides an on-demand dispatch network connecting patients in acute medical distress to certified, on-duty <strong>Clinic Doctors & General Practitioners (Flying Squad)</strong>:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li>
                <strong>Statutory Licensure & Verification:</strong> Only physicians with active, unencumbered registration with the National Medical Commission (NMC) or their respective State Medical Council are permitted to go on active flying squad duty. Practitioners are required to carry a standardized Emergency Diagnostic Kit (Pulse Oximeter, BP Monitor, Nebulizer, Glucometer, and basic life support injectables).
              </li>
              <li>
                <strong>Scope of Bedside Triage & Limitation of Liability:</strong> The dispatched physician acts as a mobile emergency medical responder delivering bedside stabilization, vital sign assessment, and acute symptomatic relief. If the patient's condition demands advanced life support, trauma surgery, or ICU monitoring, the physician holds statutory clinical discretion to immediately trigger an <em>ICU Ambulance Escalation</em>.
              </li>
              <li>
                <strong>Good Samaritan Legal Shield:</strong> Both the responding physician and assisting citizens operate under the statutory protections of <strong>Section 134A of the Motor Vehicles (Amendment) Act 2019</strong> and the guidelines laid down by the Hon’ble Supreme Court of India. No criminal or civil liability shall attach to medical personnel rendering bona fide emergency care in good faith.
              </li>
              <li>
                <strong>Emergency Pricing & Standby Fee:</strong> Emergency doctor dispatches carry a standardized response fee (base ₹800). If a patient cancels after the doctor has already commenced transit, a travel standby compensation fee (₹250) is credited to the doctor to offset transit expenditures.
              </li>
            </ul>
          </section>
        </div>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
