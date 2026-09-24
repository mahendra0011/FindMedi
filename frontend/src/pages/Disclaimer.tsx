import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ShieldCheck, Scale, PhoneCall, HeartPulse, Siren, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Medical & Emergency Disclaimer</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Statutory Intermediary Notice & Good Samaritan Legal Protection
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
          {/* Section 1: Acute Life-Threatening Emergencies Alert */}
          <section className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-6 space-y-3 text-destructive">
            <div className="flex items-center gap-2 font-bold text-base sm:text-lg">
              <Siren className="w-6 h-6 animate-bounce" /> 1. Acute Life-Threatening Emergencies (Dial 112 / 108)
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-destructive/90">
              FindMedi is <strong>NOT an alternative to emergency hospital trauma centers or intensive care resuscitation</strong>. If you or any individual around you is experiencing life-threatening symptoms—such as acute myocardial infarction (heart attack), stroke, severe hemorrhage, respiratory arrest, anaphylactic shock, or traumatic vehicular injury—you must immediately contact the national emergency hotlines:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="tel:108" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs shadow-md">
                <PhoneCall className="w-4 h-4" /> Dial 108 (National Ambulance)
              </a>
              <a href="tel:112" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs shadow-md">
                <PhoneCall className="w-4 h-4" /> Dial 112 (All-India Emergency)
              </a>
            </div>
          </section>

          {/* Section 2: Technology Intermediary Status */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> 2. Technology Intermediary Status (IT Act Sec 79)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FindMedi operates solely as a digital healthcare coordination platform and an <strong>Intermediary under Section 79 of the Information Technology Act, 2000</strong>. FindMedi does not practice medicine, operate hospitals, or directly provide medical diagnoses. All medical treatments, flying squad bedside interventions, telemedicine consultations, laboratory pathology analyses, and prescription drugs are delivered by independent, verified third-party registered medical practitioners (RMPs), licensed hospitals, accredited diagnostic labs, and retail pharmacies.
            </p>
          </section>

          {/* Section 3: Good Samaritan Statutory Protection */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> 3. Good Samaritan Legal Shield (Motor Vehicles Act Sec 134A)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              In strict accordance with <strong>Section 134A of the Motor Vehicles (Amendment) Act 2019</strong> and the guidelines formulated by the Hon’ble Supreme Court of India in <em>SaveLIFE Foundation v. Union of India</em>:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
              <li>Any citizen or bystander who uses FindMedi to report an emergency or request an ambulance/flying doctor for a road accident victim or stranger in distress is fully protected from civil and criminal liability.</li>
              <li>Good Samaritans shall not be detained at hospitals, compelled to disclose personal identity, or forced to bear treatment/transport costs for the victim.</li>
              <li>Responding flying squad physicians providing emergency bedside stabilization in good faith are granted full statutory protection from unwarranted harassment.</li>
            </ul>
          </section>

          {/* Section 4: False Alarms & Prank SOS Penalties */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> 4. Penalties for False Alarms & Prank Emergency Dispatches
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Triggering a frivolous, hoax, or prank Emergency Doctor or Ambulance SOS dispatch wastes critical life-safety resources and endangers patients genuinely fighting for survival.
            </p>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">⚖️ Statutory Criminal Notice:</p>
              <p>
                Transmitting false emergency alarms or intentionally misleading first responders constitutes an offense under <strong>Section 182 and Section 268 of the Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS)</strong>, punishable by imprisonment and monetary fines. FindMedi logs IP telemetry, verified phone numbers, and GPS coordinates and cooperates fully with law enforcement agencies in prosecuting false distress reports.
              </p>
            </div>
          </section>

          {/* Section 5: Mental Health Crisis & Suicide Prevention */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-violet-500" /> 5. Mental Health Crisis & Suicide Intervention (Mental Healthcare Act 2017)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FindMedi chat consultations and wellness tools are not designed for acute psychiatric emergencies or active suicide intervention. If you or someone you know is having thoughts of self-harm or experiencing a severe psychological crisis, please connect with dedicated government crisis helplines immediately:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-1">
                <span className="font-bold text-violet-400 block">Tele-MANAS (Govt. of India 24/7 Toll-Free)</span>
                <a href="tel:14416" className="text-sm font-black font-mono text-foreground hover:underline block">
                  📞 14416 / 1800-891-4416
                </a>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                <span className="font-bold text-primary block">KIRAN Mental Health Helpline</span>
                <a href="tel:18005990019" className="text-sm font-black font-mono text-foreground hover:underline block">
                  📞 1800-599-0019
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. All statutory rights reserved.
        </div>
      </div>
    </div>
  );
}
