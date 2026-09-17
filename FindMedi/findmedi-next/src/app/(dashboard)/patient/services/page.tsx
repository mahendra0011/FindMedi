/**
 * Lab Services — ported from client/src/pages/patient/PatientServices.jsx (Phase 4).
 * Browse the test catalog, book lab services, track booked items.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Activity,
  TestTube,
  Heart,
  Droplets,
  Thermometer,
  Calendar,
  CheckCircle,
  Loader2,
  IndianRupee,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { tests, billing, lab } from '@/lib/api';
import { toast } from 'sonner';

const serviceIcons: Record<string, LucideIcon> = {
  bp_check: Thermometer,
  blood_sugar: Droplets,
  fbc: Activity,
  xray: TestTube,
  ecg: Heart,
  urine_test: Droplets,
  lipid_profile: Activity,
  thyroid: TestTube,
};

const categoryColors: Record<string, string> = {
  Basic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Lab: 'bg-green-500/10 text-green-500 border-green-500/20',
  Imaging: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Cardiac: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusColors: Record<string, string> = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};

interface CatalogService {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface LabBillService {
  name: string;
  price?: number;
}

interface LabBill {
  _id: string;
  invoiceId?: string;
  patient?: string;
  patientId?: string | { _id?: string; name?: string };
  doctor?: string;
  service?: string;
  services?: LabBillService[];
  source?: string;
  date?: string;
  status?: string;
  amount?: number;
  paid?: number;
}

interface BookedService {
  id: string;
  invoiceId?: string;
  date?: string;
  status: string;
  amount: number;
  paid: number;
  services: LabBillService[];
}

const splitServiceNames = (service = ''): string[] =>
  service
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const onError = (e: Error) => toast.error(e.message);

export default function MyServicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedServices, setSelectedServices] = useState<CatalogService[]>([]);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  const userId = user?._id || (user as unknown as { id?: string })?.id;
  const userName = user?.name ?? '';

  const { data: catalogData, isLoading: loading } = useQuery({
    queryKey: ['lab-services'],
    queryFn: async (): Promise<CatalogService[]> => {
      const res = await tests.get({});
      return (Array.isArray(res) ? res : []).map((t, i) => ({
        id: String(t._id ?? `test-${i}`),
        name: String(t.name ?? 'Test'),
        price: Number(t.price ?? 0),
        category: typeof t.category === 'string' ? t.category : undefined,
      }));
    },
    staleTime: 300_000,
  });

  const { data: billsData } = useQuery({
    queryKey: ['lab-bills', userId ?? ''],
    queryFn: async (): Promise<LabBill[]> => {
      const res = await billing.get({});
      return (Array.isArray(res) ? res : []) as unknown as LabBill[];
    },
    staleTime: 30_000,
  });

  const services = catalogData ?? [];

  const isPatientBill = (bill: LabBill) => {
    const uid = String(userId || '');
    const patientId = typeof bill.patientId === 'object' ? bill.patientId?._id : bill.patientId;
    if (uid && patientId && String(patientId) === uid) return true;
    if (userName && (bill.patient === userName || (typeof bill.patientId === 'object' && bill.patientId?.name === userName)))
      return true;
    return false;
  };

  const isLabBill = (bill: LabBill) => {
    if (bill.source === 'lab') return true;
    if (Array.isArray(bill.services) && bill.services.length > 0) return true;
    if (String(bill.doctor || '').toLowerCase() === 'lab services') return true;
    const serviceText = String(bill.service || '').toLowerCase();
    return services.some((service) => serviceText.includes(service.name.toLowerCase()));
  };

  const buildBooked = (bills: LabBill[]): BookedService[] =>
    bills
      .filter((bill) => isPatientBill(bill))
      .filter((bill) => isLabBill(bill))
      .map((bill) => {
        const serviceNames = splitServiceNames(bill.service);
        const billServices =
          Array.isArray(bill.services) && bill.services.length > 0
            ? bill.services
            : serviceNames.map((name) => {
                const match = services.find((service) => service.name === name);
                return match || { name, price: 0 };
              });
        return {
          id: bill._id || bill.invoiceId || bill.service || '',
          invoiceId: bill.invoiceId,
          date: bill.date,
          status: bill.status || 'Pending',
          amount: Number(bill.amount) || billServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
          paid: Number(bill.paid) || 0,
          services: billServices,
        };
      });

  const bookedServices = buildBooked(billsData ?? []);
  const [lastBooking, setLastBooking] = useState<BookedService | null>(null);

  const toggleService = (service: CatalogService) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) return prev.filter((s) => s.id !== service.id);
      return [...prev, service];
    });
  };

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleBook = async () => {
    if (selectedServices.length === 0) return;
    setBooking(true);
    try {
      await lab.createBooking({
        patientId: userId ?? '',
        patientName: userName || 'Patient',
        tests: selectedServices.map((s) => s.name),
        testIds: selectedServices.map((s) => s.id),
        totalAmount,
        visitType: 'Walk-in',
        status: 'Pending',
      });
      setLastBooking({
        id: `booking-${Date.now()}`,
        date: new Date().toISOString(),
        status: 'Pending',
        amount: totalAmount,
        paid: 0,
        services: selectedServices.map((s) => ({ name: s.name, price: s.price })),
      });
      setSuccess(true);
      setSelectedServices([]);
      void qc.invalidateQueries({ queryKey: ['lab-bills'] });
    } catch (e) {
      onError(e instanceof Error ? e : new Error('Booking failed'));
    }
    setBooking(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Services</h1>
        <p className="text-muted-foreground">Book lab tests and diagnostics</p>
      </div>

      {success && lastBooking && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-success/10 border border-success/20 rounded-2xl p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">Lab services booked</h2>
              <p className="text-sm text-muted-foreground mt-1">{lastBooking.services.map((s) => s.name).join(', ')}</p>
              <p className="text-xs text-muted-foreground mt-1">Track it under your bookings.</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-8 text-xs" onClick={() => router.push('/patient/bookings')}>
                  View Bookings
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {selectedServices.length > 0 && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-foreground">Selected Services ({selectedServices.length})</p>
              <p className="text-sm text-muted-foreground">Total: ₹{totalAmount}</p>
            </div>
            <Button onClick={() => void handleBook()} disabled={booking} className="gap-2">
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {booking ? 'Booking...' : 'Book Now'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((s) => (
              <span key={s.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {s.name} - ₹{s.price}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-foreground">Your Booked Lab Services</h2>
            <p className="text-sm text-muted-foreground">Recently booked lab tests and diagnostic services</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void qc.invalidateQueries({ queryKey: ['lab-bills'] })}>
            Refresh
          </Button>
        </div>

        {bookedServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
            <TestTube className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No lab services booked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookedServices.slice(0, 5).map((booked) => (
              <div key={booked.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{booked.invoiceId || 'Lab booking'}</p>
                    <p className="font-medium text-foreground">{booked.services.map((s) => s.name).join(', ')}</p>
                    <p className="text-xs text-muted-foreground">Booked on {booked.date || 'Today'}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[booked.status] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {booked.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {booked.services.map((service, index) => (
                    <span
                      key={`${booked.id}-${service.name || index}`}
                      className="px-2.5 py-1 rounded-full bg-background text-xs text-foreground border border-border/60"
                    >
                      {service.name}
                      {service.price ? ` - ₹${service.price}` : ''}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-semibold text-warning flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {Math.max(booked.amount - booked.paid, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, i) => {
          const Icon = serviceIcons[service.id] || TestTube;
          const isSelected = selectedServices.some((s) => s.id === service.id);
          const colorClass = categoryColors[service.category ?? ''] || 'bg-muted text-muted-foreground';

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleService(service)}
              className={`bg-card rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border/60 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{service.category}</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  {service.price}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No lab services available right now</p>
        </div>
      )}

      {selectedServices.length === 0 && services.length > 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Click on services to select them</p>
        </div>
      )}

    </div>
  );
}
