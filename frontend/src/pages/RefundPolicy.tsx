import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Stethoscope, Ambulance, Pill, TestTube, CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Cancellation & Refund Policy</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Fair, transparent cancellation guidelines across appointments, emergency runs & pharmacy
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
          {/* Section 1: Doctor Outpatient Appointments */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> 1. In-Clinic & Telemedicine Doctor Appointments
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground">Cancellation &gt; 2 Hours Prior to Slot:</span>
                <p>100% full refund is automatically credited back to your source payment method or instant MediCoins wallet without any cancellation penalty.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground">Cancellation &lt; 2 Hours Prior to Slot:</span>
                <p>50% refund is issued, with the remaining 50% retained as clinic slot blocking compensation, unless rescheduled to another available slot within 7 days.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="font-bold text-foreground">Doctor Cancellation or No-Show:</span>
                <p>If the attending physician cancels the appointment or is unavailable, you receive a <strong>100% automatic refund</strong> plus a priority rebooking credit.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Emergency Flying Doctor & Ambulance SOS */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Ambulance className="w-4 h-4 text-teal-500" /> 2. Emergency Flying Doctor & Ambulance SOS Dispatches
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Because emergency dispatches trigger immediate vehicle mobilization, specialized cancellation rules apply to protect on-duty responders:</p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Cancellation While Searching (0 – 120s):</strong> If cancelled while the platform is still searching for candidate doctors/ambulances, <strong>100% of pre-authorized funds are immediately released</strong> with zero fee.
                </li>
                <li>
                  <strong>Emergency Doctor Standby Fee (Post-Claim Transit):</strong> If a patient cancels after an emergency doctor has accepted the dispatch and commenced physical road transit, a standardized <strong>₹250 standby compensation fee</strong> is charged to cover transit fuel and doctor readiness. The remaining balance is refunded.
                </li>
                <li>
                  <strong>Ambulance En-Route Cancellation:</strong> Once an ICU/BLS ambulance has rolled out of the hospital bay, a base mobilization charge applies if cancelled by the caller before arrival.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Laboratory & Diagnostic Bookings */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TestTube className="w-4 h-4 text-cyan-500" /> 3. Diagnostic Tests & Health Checkup Packages
            </h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li><strong>Prior to Sample Collection:</strong> 100% refund if cancelled at least 1 hour before scheduled home sample collection or diagnostic center visit.</li>
              <li><strong>Post Sample Collection:</strong> Once the phlebotomist has collected biological specimens or imaging scans have commenced, no refund can be processed as laboratory consumables and reagent testing are committed.</li>
            </ul>
          </section>

          {/* Section 4: Pharmacy Orders & Medicine Delivery */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-500" /> 4. Pharmacy Orders & Prescription Medicine Returns
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Under the <strong>Drugs and Cosmetics Act, 1940</strong>, strict quality regulations govern medicine returns:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Eligible for 48h Return
                  </span>
                  <p className="text-muted-foreground">Unopened, undamaged medicine strips, sealed bottles, and diagnostic equipment in original manufacturer packaging with intact batch numbers.</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs space-y-1">
                  <span className="font-bold text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Strictly Non-Returnable
                  </span>
                  <p className="text-muted-foreground">Cold-chain biologics (Insulin, Vaccines), opened syrups, cut blister strips, Schedule X controlled substances, and hygiene goods.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Payout Turnaround Times */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" /> 5. Refund Processing Timelines & Modes
            </h2>
            <p className="text-muted-foreground text-sm">
              All approved refunds are initiated instantly by our automated billing engine. The turnaround time depends on your banking rail:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-center">
              <div className="p-3 rounded-xl bg-muted/40 border">
                <span className="text-xs text-muted-foreground uppercase font-bold block">UPI / Wallet</span>
                <span className="text-base font-black text-foreground font-mono">15 Mins – 2 Hours</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border">
                <span className="text-xs text-muted-foreground uppercase font-bold block">Debit / Credit Cards</span>
                <span className="text-base font-black text-foreground font-mono">3 – 5 Business Days</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border">
                <span className="text-xs text-muted-foreground uppercase font-bold block">Net Banking</span>
                <span className="text-base font-black text-foreground font-mono">2 – 4 Business Days</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              For any refund status disputes, contact billing support at <code>billing@findmedi.in</code> with your transaction reference number.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
