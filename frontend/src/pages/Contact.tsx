import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, LifeBuoy, ShieldCheck, ArrowRight } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { buildLocaleAlternates } from '@/lib/seoAlternates';

const CHANNELS = [
  {
    icon: Phone,
    title: 'Support hotline',
    lines: ['+91 1800-123-4567', 'Ext 4 - Grievance & redressal'],
    href: 'tel:+9118001234567',
  },
  {
    icon: Mail,
    title: 'Email support',
    lines: ['contact@findmedi.in'],
    href: 'mailto:contact@findmedi.in',
  },
  {
    icon: MapPin,
    title: 'Registered office',
    lines: ['FindMedi Healthcare Technologies Pvt. Ltd.', 'Bengaluru, Karnataka, India'],
  },
  {
    icon: Clock,
    title: 'Hours',
    lines: ['Care, chat and booking: 24x7', 'Grievance office: Mon-Sat, 9:00-18:00 IST'],
  },
];

const ESCALATIONS = [
  {
    title: 'Clinical safety or an adverse event',
    body: 'Call the hotline and ask for the clinical safety desk. Emergencies must go to 108 first.',
    href: 'tel:108',
    cta: 'Emergency - call 108',
  },
  {
    title: 'Data privacy request (DSR)',
    body: 'Access, correction, export or erasure of your health data. The DPO office reviews every request.',
    href: '/grievance',
    cta: 'Grievance & DPO office',
  },
  {
    title: 'Provider onboarding',
    body: 'Hospitals, clinics, labs, pharmacies and independent practitioners join through the provider programme.',
    href: '/join-platform',
    cta: 'Join as a provider',
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Contact FindMedi - Support, Grievance & DPO | FindMedi"
        description="Reach FindMedi: support hotline, email, registered office, clinical safety escalation and the DPO grievance office."
        canonical="/contact"
        alternates={buildLocaleAlternates('/contact')}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'FindMedi Healthcare Technologies Pvt. Ltd.',
          url: '/contact',
          contactPoint: [{
            '@type': 'ContactPoint',
            telephone: '+91-1800-123-4567',
            contactType: 'customer support',
            areaServed: 'IN',
            availableLanguage: ['en', 'hi'],
          }],
          email: 'contact@findmedi.in',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Bengaluru',
            addressCountry: 'IN',
          },
        }}
      />
      <PublicNavbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <LifeBuoy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground">Contact FindMedi</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  One number for care, one inbox for everything else, and a named office for your data rights.
                </p>
              </div>
            </div>
          </header>

          <section className="grid sm:grid-cols-2 gap-4">
            {CHANNELS.map((channel) => (
              <div key={channel.title} className="rounded-3xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <channel.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                  <h2 className="font-heading font-semibold text-foreground">{channel.title}</h2>
                </div>
                {channel.lines.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    {channel.href && line === channel.lines[0] ? (
                      <a href={channel.href} className="text-primary underline underline-offset-2">{line}</a>
                    ) : (
                      line
                    )}
                  </p>
                ))}
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Where your question belongs</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {ESCALATIONS.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border/60 bg-card p-5 space-y-3 flex flex-col">
                  <h3 className="font-heading font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1">{item.body}</p>
                  {item.href.startsWith('/') ? (
                    <Button asChild variant="outline" size="sm" className="rounded-xl self-start">
                      <Link to={item.href}>{item.cta} <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </Button>
                  ) : (
                    <a href={item.href} className="text-sm font-semibold text-primary underline underline-offset-2 self-start">
                      {item.cta}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-muted/20 p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Never send a password, OTP or full medical record over an unverified call. We never ask for an OTP
              on our behalf, and no agent can read your records without your consent in the app.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
