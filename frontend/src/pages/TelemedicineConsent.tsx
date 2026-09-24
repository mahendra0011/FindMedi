import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, ShieldCheck, FileCheck, AlertTriangle, Pill, Stethoscope, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TelemedicineConsent() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Telemedicine & Digital Health Consent</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                NMC Telemedicine Practice Guidelines (2020) & Statutory Prescription Standards
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
          {/* Statutory Framework */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> 1. National Medical Commission (NMC) Telemedicine Framework
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every digital consultation (via video stream, audio call, or encrypted chat) conducted over FindMedi is governed by the <strong>Telemedicine Practice Guidelines (March 25, 2020)</strong> issued by the Board of Governors in supersession of the Medical Council of India (MCI) and notified by the Ministry of Health and Family Welfare (MoHFW), Government of India.
            </p>
          </section>

          {/* Informed Consent Declaration */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> 2. Patient Informed Consent Acknowledgments
            </h2>
            <p className="text-muted-foreground text-sm">
              By initiating or booking an online teleconsultation, the patient or legal guardian expressly acknowledges and consents to the following clinical principles:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li>
                <strong>Clinical Limitations:</strong> A virtual teleconsultation relies on audio-visual feeds and patient-reported symptoms. It does not allow for physical palpation, chest auscultation with an acoustic stethoscope, or invasive diagnostic testing.
              </li>
              <li>
                <strong>Practitioner Clinical Discretion:</strong> If the attending medical practitioner determines that teleconsultation is inadequate to reach a safe diagnosis, they have the statutory obligation to recommend an in-person clinic visit, emergency flying doctor dispatch, or hospital OPD evaluation.
              </li>
              <li>
                <strong>Explicit Consent:</strong> Explicit patient consent is recorded when the patient clicks "Join Call" or initiates the consultation session.
              </li>
            </ul>
          </section>

          {/* Prescription Medicine Classification & Strict Schedule X Prohibition */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-500" /> 3. Digital Prescription Rules & Prohibited Drugs (List O, A, B, and Prohibited List)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Medical practitioners on FindMedi prescribe medications strictly in accordance with the drug categories sanctioned under the NMC Guidelines:
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                <span className="font-bold text-foreground">Permissible Medications (List O, A, and B):</span>
                <p className="text-muted-foreground">Over-the-counter (OTC) formulations, first-aid remedies, re-fill maintenance medications for previously diagnosed chronic illnesses (hypertension, diabetes, asthma), and add-on therapies.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs space-y-1">
                <span className="font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Strictly Prohibited Online (Schedule X & Narcotics):
                </span>
                <p className="text-destructive/90">
                  Medicines listed under <strong>Schedule X of the Drugs and Cosmetics Rules, 1945</strong>, and all substances governed by the <strong>Narcotic Drugs and Psychotropic Substances (NDPS) Act, 1985</strong> (including potent hypnotics, sedatives, morphine derivatives, and habit-forming psychotropics) are <strong>STRICTLY BANNED</strong> from being prescribed via teleconsultation. Any attempt to solicit such prescriptions will result in immediate session termination.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Validity of Digital Prescriptions */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-500" /> 4. Legal Validity of FindMedi Digital Prescriptions
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Prescriptions generated through the FindMedi clinical engine comply with the electronic record standards of <strong>Section 4 and Section 5 of the Information Technology Act, 2000</strong>. Each digital prescription contains:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Doctor's full name, medical qualification, and State Medical Council / NMC Registration Number.</li>
              <li>Patient name, age, biological gender, and date of consultation.</li>
              <li>Generic drug names with explicit dosage, route, frequency, and duration of therapy.</li>
              <li>Tamper-proof digital timestamp and system-generated unique Rx reference barcode recognized by registered pharmacies across India.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. Medical Standards Division.
        </div>
      </div>
    </div>
  );
}
