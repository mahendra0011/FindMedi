import React, { useState } from 'react';
import {
  Syringe, Calendar, CheckCircle2, AlertCircle, Clock, Download,
  MapPin, ShieldCheck, User, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PatientVaccinations() {
  const [activeTab, setActiveTab] = useState<'child' | 'adult'>('child');

  const childSchedule = [
    { name: 'BCG + OPV (Birth Dose) + Hep B', dueAge: 'At Birth', status: 'Completed', dateAdministered: '12 Jan 2024', provider: 'Fortis Hospital Delhi', certificate: 'CERT-UIP-001' },
    { name: 'OPV 1 + Pentavalent 1 + Rota 1 + PCV 1', dueAge: '6 Weeks', status: 'Completed', dateAdministered: '24 Feb 2024', provider: 'Primary Health Centre', certificate: 'CERT-UIP-002' },
    { name: 'OPV 2 + Pentavalent 2 + Rota 2', dueAge: '10 Weeks', status: 'Completed', dateAdministered: '04 Apr 2024', provider: 'Primary Health Centre', certificate: 'CERT-UIP-003' },
    { name: 'OPV 3 + Pentavalent 3 + Rota 3 + PCV 2', dueAge: '14 Weeks', status: 'Completed', dateAdministered: '18 May 2024', provider: 'Max Hospital Saket', certificate: 'CERT-UIP-004' },
    { name: 'MR 1 (Measles Rubella) + JE 1 + Vitamin A', dueAge: '9–12 Months', status: 'Upcoming Due', dueDate: '15 Nov 2026', provider: 'Government / Private Center', certificate: null },
    { name: 'DPT Booster 1 + OPV Booster + MR 2', dueAge: '16–24 Months', status: 'Scheduled Future', dueDate: '15 Jun 2027', provider: 'Scheduled', certificate: null },
  ];

  const adultSchedule = [
    { name: 'Annual Quadrivalent Influenza (Flu Shot)', target: 'All Adults (Annual)', status: 'Upcoming Due', dueDate: 'October 2026', provider: 'Recommended Before Winter', certificate: null },
    { name: 'Hepatitis B (3-Dose Series)', target: 'Healthcare & High Risk', status: 'Completed', dateAdministered: '10 May 2023', provider: 'Apollo Hospital', certificate: 'CERT-AD-HEPB' },
    { name: 'HPV Vaccine (Human Papillomavirus)', target: 'Females & Males (9-26 yrs)', status: 'Completed', dateAdministered: '15 Aug 2022', provider: 'Max Healthcare', certificate: 'CERT-AD-HPV' },
    { name: 'Td / Tdap (Tetanus, Diphtheria, Pertussis Booster)', target: 'Every 10 Years', status: 'Completed', dateAdministered: '12 Feb 2021', provider: 'City Clinic', certificate: 'CERT-AD-TDAP' },
  ];

  const schedule = activeTab === 'child' ? childSchedule : adultSchedule;

  const handleDownloadCert = (cert: string) => {
    toast.success(`Vaccination certificate ${cert} downloaded.`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Vaccination Records & Schedule</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track National Immunization Schedule (UIP) doses for children and adult boosters with digital records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => toast.info('Opening nearby vaccination centres map...')}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" /> Nearest Vaccine Centre
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('child')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'child'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Child Immunization (UIP & IAP)
        </button>
        <button
          onClick={() => setActiveTab('adult')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'adult'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Adult & Travel Vaccines
        </button>
      </div>

      {/* Vaccine Timeline Table */}
      <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-xs divide-y divide-border/40">
        {schedule.map((item, i) => (
          <div key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                item.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : item.status.includes('Due')
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Syringe className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                    item.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : item.status.includes('Due')
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Schedule: <strong className="text-foreground">{activeTab === 'child' ? item.dueAge : item.target}</strong> • {item.provider}
                </p>
                {item.dateAdministered && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Administered on: {item.dateAdministered}
                  </p>
                )}
                {item.dueDate && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    Due Date: {item.dueDate}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0 self-end sm:self-center">
              {item.certificate ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadCert(item.certificate!)}
                  className="rounded-xl text-xs h-8 gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Certificate
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => toast.info('Booking appointment for this vaccine slot...')}
                  className="rounded-xl text-xs h-8 font-semibold"
                >
                  Book Slot
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
