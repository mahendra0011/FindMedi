import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, CheckCircle, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Privacy Policy</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Compliant with DPDP Act 2023 & Ayushman Bharat Digital Mission (ABDM)</p>
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
              <Lock className="w-4 h-4 text-emerald-500" /> 1. Commitment to Health Data Security
            </h2>
            <p className="text-muted-foreground text-sm">
              FindMedi is deeply committed to protecting the privacy, confidentiality, and security of your personal information and sensitive personal health data (SPHD). In full compliance with the Digital Personal Data Protection (DPDP) Act 2023 and the Information Technology Act 2000, all medical records, diagnostics, doctor notes, and teleconsultation audio/video streams are protected by state-of-the-art encryption protocols.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> 2. Information We Collect
            </h2>
            <p className="text-muted-foreground text-sm">
              We collect information that you provide directly to us when registering, booking medical consultations, or purchasing medications:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Demographic Information:</strong> Full name, date of birth, biological gender, mobile number, and residential address.</li>
              <li><strong>Clinical Information:</strong> Medical history, allergy profiles, blood group, vital signs, prescriptions, diagnostic reports, and ABHA ID.</li>
              <li><strong>Telemetry & Geolocation:</strong> Real-time GPS coordinates collected during active emergency ambulance dispatches, ride requests, and medicine deliveries.</li>
              <li><strong>Financial Information:</strong> Payment tokens processed via RBI-authorized payment aggregators (Razorpay, Stripe); we never store raw credit card numbers or CVV.</li>
            </ul>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-500" /> 3. Ayushman Bharat Digital Mission (ABDM) & ABHA Consent
            </h2>
            <p className="text-muted-foreground text-sm">
              FindMedi functions as an approved Health Information User (HIU) and Health Information Provider (HIP) under the ABDM ecosystem. Your longitudinal health records are shared with authorized healthcare facilities strictly on a consent-based architecture. You retain the absolute right to revoke data consent, request audit trails of health record access, or unlink your ABHA number at any time via your Patient Settings.
            </p>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-500" /> 4. Emergency Flying Doctor & Real-Time Telemetry Privacy
            </h2>
            <p className="text-muted-foreground text-sm">
              During critical acute medical emergencies triggered via the <strong>Emergency Doctor SOS</strong> or <strong>Ambulance SOS</strong>:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Patient GPS & Triage Telemetry:</strong> Precise GPS coordinates, emergency crisis category, and reported vital symptoms are broadcast exclusively to verified on-duty physicians within a 5–15 km operational perimeter to facilitate immediate physical arrival.</li>
              <li><strong>Doctor On-Duty GPS Beacons:</strong> When a clinic doctor activates <em>Emergency Flying Squad Duty</em>, background GPS beacons are streamed at 5-second intervals to calculate accurate ETAs and route dispatch telemetry. Doctor location streaming terminates automatically upon standing down from duty.</li>
              <li><strong>Emergency Medical Summary Sharing:</strong> Known allergies, chronic conditions, and current medications are disclosed to the dispatched physician under the emergency life-safety exemption of Section 7 of the DPDP Act 2023.</li>
              <li><strong>Telemetry Auto-Purge:</strong> High-frequency transient GPS telemetry pings are scrubbed within 30 days of case completion; only the final verified clinical summary and invoice are retained in the patient's encrypted health vault.</li>
            </ul>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-500" /> 5. Data Sharing & Third-Party Protections
            </h2>
            <p className="text-muted-foreground text-sm">
              We do not sell, rent, or monetize your health data under any circumstances. Information is shared strictly on a need-to-know basis:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>With Assigned Practitioners:</strong> To facilitate clinical diagnosis, prescription writing, and treatment planning.</li>
              <li><strong>With Logistics Partners:</strong> Delivery couriers receive only delivery address, recipient name, and masked phone numbers.</li>
              <li><strong>Statutory Authorities:</strong> Disclosed only when strictly required by a court order, police FIR, or public health epidemic notification mandate.</li>
            </ul>
          </section>

          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> 6. Your Rights as a Data Principal
            </h2>
            <p className="text-muted-foreground text-sm">
              Under Indian law, you have the right to access your health data in a portable format (JSON/CSV), correct inaccurate health history, nominate emergency representatives to manage records, or request complete account erasure. For data protection inquiries, you may contact our appointed Data Protection Officer (DPO) at <code>dpo@findmedi.in</code>.
            </p>
          </section>
        </div>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
