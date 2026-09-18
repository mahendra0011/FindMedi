/**
 * Home page — Server Component with server-side data fetching.
 *
 * This is the FindMedi landing page. It fetches featured doctors, hospitals,
 * and diagnostic centers from the backend API at build/request time.
 *
 * Ported from client/src/pages/Home.jsx (which used framer-motion + ReactBits).
 * Animations are deferred to Phase 5 (framer-motion → motion migration).
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Building2, Microscope, ShoppingBag, Video, Calendar, Shield, Clock } from 'lucide-react';
import type { Doctor } from '@/types/models/doctor';


import { api } from '@/lib/api';

const SERVICE_CARDS = [
  { icon: Stethoscope, title: 'Find Doctors', desc: 'Consult verified doctors across 50+ specialties', href: '/doctors', color: 'text-blue-600' },
  { icon: Building2, title: 'Hospitals', desc: 'Book appointments at top hospitals and clinics', href: '/hospitals', color: 'text-emerald-600' },
  { icon: Microscope, title: 'Lab Tests', desc: 'Book diagnostic tests at trusted centers', href: '/diagnostic-centers', color: 'text-purple-600' },
  { icon: ShoppingBag, title: 'Medicine Store', desc: 'Order medicines with home delivery', href: '/buy-medicine', color: 'text-amber-600' },
  { icon: Video, title: 'Online Consultation', desc: 'Video chat with doctors anytime', href: '/doctor/consultations', color: 'text-red-600' },
  { icon: Calendar, title: 'OPD Booking', desc: 'Book OPD slots with token management', href: '/hospital/opd-token', color: 'text-cyan-600' },
];

const FEATURES = [
  { icon: Shield, title: 'Verified Providers', desc: 'All doctors and hospitals are verified' },
  { icon: Clock, title: '24/7 Support', desc: 'Round the clock customer support' },
  { icon: Video, title: 'Online Consultation', desc: 'Consult doctors via video call' },
];

export const metadata = {
  title: 'FindMedi — Find doctors, hospitals & diagnostic centers near you',
  description: 'India\'s trusted healthcare platform to book appointments, order medicines, book diagnostic tests, and connect with doctors online or offline.',
};

async function fetchHomeData() {
  try {
    const [doctorsRes, hospitalsRes, labsRes] = await Promise.all([
      api.doctors.get({ limit: 6, featured: true }).catch(() => []),
      api.hospitals.get({ limit: 6, featured: true }).catch(() => []),
      api.facilities.get({ limit: 6, type: 'lab', approved: true }).catch(() => []),
    ]);
    const toArray = (res: unknown) => {
      if (Array.isArray(res)) return res;
      const r = res as { doctors?: unknown[]; hospitals?: unknown[]; facilities?: unknown[]; data?: unknown[] } | undefined;
      return r?.doctors || r?.hospitals || r?.facilities || r?.data || [];
    };
    return {
      doctors: toArray(doctorsRes),
      hospitals: toArray(hospitalsRes),
      labs: toArray(labsRes),
    };
  } catch {
    return { doctors: [], hospitals: [], labs: [] };
  }
}

export default async function HomePage() {
  const { doctors } = await fetchHomeData();

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="page-header py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="page-title">Your Health, Our Priority</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              FindMedi connects you with verified doctors, hospitals, and diagnostic centers
              across India. Book appointments, order medicines, and manage your health records — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Book Appointment</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/doctors">Find a Doctor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-2xl font-bold mb-2">Our Services</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comprehensive healthcare services at your fingertips
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CARDS.map((service) => (
              <Link key={service.title} href={service.href}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <service.icon className={`h-6 w-6 ${service.color}`} />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{service.desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured providers */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Featured Doctors</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor: Doctor) => (
              <Card key={doctor._id}>
                <CardContent className="pt-6">
                  <p className="font-semibold">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                  <p className="text-sm mt-1">{doctor.consultation_fees ? `₹${doctor.consultation_fees}` : 'Fee on consultation'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Why Choose FindMedi?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
