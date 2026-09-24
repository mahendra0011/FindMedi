import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserCheck, Shield, Clock, Mail, Phone, MapPin, Building, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GrievanceRedressal() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Grievance Redressal & DPO Office</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Statutory Redressal Mechanism under IT Rules 2021 & DPDP Act 2023
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
          {/* Statutory Mandate Notice */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> 1. Statutory Redressal Mandate
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              In compliance with <strong>Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, <strong>Section 13 of the Digital Personal Data Protection Act, 2023</strong>, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, FindMedi maintains a dedicated, nodal Grievance Redressal mechanism for expeditious resolution of consumer complaints, medical billing disputes, data privacy concerns, and content objections.
            </p>
          </section>

          {/* Grievance Officer & DPO Profile Cards */}
          <section className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" /> 2. Nodal Grievance & Data Protection Officers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Grievance Officer */}
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-foreground">Grievance Redressal Officer</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">IT Rules 2021</span>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Name:</strong> Adv. Sandeep Menon</p>
                  <p><strong className="text-foreground">Designation:</strong> Head of Legal & Grievance Redressal</p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>grievance@findmedi.in</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>+91 1800-123-4567 (Ext: 4)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>FindMedi Towers, Sector 4, HSR Layout, Bengaluru, Karnataka – 560102</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Data Protection Officer */}
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-foreground">Data Protection Officer (DPO)</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">DPDP Act 2023</span>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Name:</strong> Dr. Priyanka Sengupta</p>
                  <p><strong className="text-foreground">Designation:</strong> Chief Information Security Officer & DPO</p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>dpo@findmedi.in</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>+91 1800-123-4567 (Ext: 9)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Building className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Data Governance Division, FindMedi Technologies Pvt. Ltd., Bengaluru</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Turnaround Time SLA Mandate */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" /> 3. Redressal Service Level Agreement (SLA) Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs sm:text-sm space-y-1">
                <div className="font-bold text-teal-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Acknowledgment within 24 Hours
                </div>
                <p className="text-muted-foreground">Every formal complaint submitted via email or portal generates a unique Ticket ID and is acknowledged within twenty-four (24) hours.</p>
              </div>
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm space-y-1">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Resolution within 15 Days
                </div>
                <p className="text-muted-foreground">Comprehensive investigation, consultation with attending medical facilities, and final written resolution are delivered within fifteen (15) days.</p>
              </div>
            </div>
          </section>

          {/* Escalation Hierarchy */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> 4. Dispute Escalation Hierarchy
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If your grievance is not resolved satisfactorily within the statutory fifteen (15) day period:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Data Protection Inquiries:</strong> You retain the statutory right to file a complaint before the <strong>Data Protection Board of India (DPBI)</strong> under Section 27 of the DPDP Act 2023.</li>
              <li><strong>Consumer Service Disputes:</strong> You may register an online complaint with the <strong>National Consumer Helpline (NCH)</strong> at <code>consumerhelpline.gov.in</code> (Toll-Free 1915).</li>
              <li><strong>Medical Clinical Malpractice:</strong> Clinical negligence allegations are cognizable by the Ethics and Medical Registration Board of the <strong>National Medical Commission (NMC)</strong> or the relevant State Medical Council.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. Statutory Compliance Division.
        </div>
      </div>
    </div>
  );
}
