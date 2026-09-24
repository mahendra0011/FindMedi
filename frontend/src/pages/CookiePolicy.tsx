import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, Shield, CheckCircle2, Sliders, Lock, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Cookie & Tracking Policy</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Transparent disclosure of local storage, session cookies & telemetry tokens
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
          {/* Section 1: What Are Cookies */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> 1. Overview & Data Minimization
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FindMedi uses browser cookies, secure LocalStorage, and sessionStorage tokens strictly to deliver reliable medical workflows, maintain authenticated patient-doctor sessions, and synchronize low-latency real-time emergency dispatch telemetry. We adhere strictly to data minimization standards under the <strong>Digital Personal Data Protection Act, 2023</strong>.
            </p>
          </section>

          {/* Section 2: Categories of Cookies */}
          <section className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" /> 2. Categories of Storage Technologies We Utilize
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-500" /> Strictly Necessary & Authentication Cookies
                </div>
                <p className="text-muted-foreground">
                  Essential for platform security. These include cryptographic JSON Web Tokens (JWT), CSRF defense headers, and active session identifiers. Without these, secure login and access to encrypted health vaults are impossible.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-500" /> Real-Time Telemetry & Socket Handshake Tokens
                </div>
                <p className="text-muted-foreground">
                  Used by our WebSocket gateway (`Socket.IO`) to maintain connection persistence when patients request emergency flying doctors, track moving ambulances on GPS maps, or receive incoming clinical alerts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-primary" /> Functional & Preference Storage
                </div>
                <p className="text-muted-foreground">
                  Remembers your selected UI theme (Dark/Light mode), language localization preferences, and cached clinic search perimeters (5km / 10km / 15km).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Third-Party Advertising Policy */}
          <section className="bg-card rounded-2xl border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500" /> 3. Zero Third-Party Advertising Trackers
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FindMedi maintains a <strong>strict Zero-Ad Tracker Policy</strong>. We do not deploy third-party advertising cookies, cross-site profiling pixels (such as Meta Pixel or ad network beacons), or data-broker trackers on any medical record, consultation, or prescription screens. Your private health journey is never monetized.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FindMedi Technologies Pvt. Ltd. Privacy Architecture.
        </div>
      </div>
    </div>
  );
}
