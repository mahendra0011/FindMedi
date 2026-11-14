import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, HeartPulse, Users, Building2, Stethoscope, ArrowRight } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { Button } from '@/components/ui/button';

const pillars = [
  {
    icon: HeartPulse,
    title: 'Connected care',
    desc: 'Appointments, records, diagnostics, pharmacy and follow-ups stay linked across one patient journey.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust and privacy',
    desc: 'Role-scoped access, audit trails and DPDP-aligned consent controls protect sensitive health data.',
  },
  {
    icon: Building2,
    title: 'Built for providers',
    desc: 'Hospitals, clinics, labs and independent practitioners get role-specific dashboards and workflows.',
  },
  {
    icon: Users,
    title: 'Care for everyone',
    desc: 'Patients, families, attendants and emergency responders use the same coordinated platform.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">About FindMedi</h1>
              <p className="text-sm text-muted-foreground mt-1">Healthcare coordination for patients, providers and care teams.</p>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            FindMedi is a healthcare technology platform that connects people with verified hospitals, clinics,
            diagnostic centres, pharmacies and independent practitioners. We bring discovery, booking, records and
            follow-up into one place so care is easier to find and easier to continue.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="bg-card rounded-2xl border border-border/60 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <pillar.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-heading font-bold text-lg text-foreground">{pillar.title}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border/60 bg-muted/30 p-6 sm:p-8">
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" /> For providers
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              Hospitals, clinics, labs and practitioners can join FindMedi to manage appointments, staff, schedules
              and patient communication from role-specific dashboards.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button asChild className="gap-2">
                <Link to="/join-platform">Register your facility <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/doctor-setup">Join as a doctor <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>
              Questions? Write to <a className="text-primary underline underline-offset-2" href="mailto:contact@findmedi.in">contact@findmedi.in</a>{' '}
              or call <a className="text-primary underline underline-offset-2" href="tel:+9118001234567">+91 1800-123-4567</a>.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
