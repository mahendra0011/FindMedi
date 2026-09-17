'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, MapPin, Save, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useDeliveryProfile, useUpdateDeliveryProfile } from '@/features/delivery';

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  emergencyContact: { name: string; phone: string };
}

export default function DeliverySettingsPage() {
  const { data: profile, isLoading } = useDeliveryProfile();
  const updateMutation = useUpdateDeliveryProfile();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    emergencyContact: { name: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      const p = profile as unknown as Record<string, unknown>;
      const ec = (p.emergencyContact as { name?: string; phone?: string } | undefined) ?? { name: '', phone: '' };
      setForm({
        name: (p.name as string) ?? '',
        phone: (p.phone as string) ?? '',
        email: (p.email as string) ?? '',
        address: (p.address as string) ?? '',
        city: (p.city as string) ?? '',
        pincode: (p.pincode as string) ?? '',
        emergencyContact: { name: ec.name ?? '', phone: ec.phone ?? '' },
      });
    }
  }, [profile]);

  const set = (k: keyof Omit<FormState, 'emergencyContact'>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setNested = (k: 'name' | 'phone', v: string) =>
    setForm((f) => ({ ...f, emergencyContact: { ...f.emergencyContact, [k]: v } }));

  const save = async () => {
    const id = (profile as unknown as { _id?: string })?._id;
    if (!id) {
      toast.error('Profile not found');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, ...form } as unknown as { id: string } & Record<string, unknown>);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const p = profile as unknown as {
    name?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    createdAt?: string;
    totalDeliveries?: number;
    rating?: string | number;
  } | undefined;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/40">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <p className="font-heading font-semibold text-lg text-foreground">{p?.name ?? 'Delivery Partner'}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {p?.vehicleType ?? 'vehicle'} • {p?.vehicleNumber ?? 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pincode</Label>
            <Input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
          </div>

          <div className="pt-4 border-t border-border/40">
            <h3 className="font-semibold text-foreground mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.emergencyContact.name} onChange={(e) => setNested('name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.emergencyContact.phone} onChange={(e) => setNested('phone', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={save} disabled={updateMutation.isPending} className="gap-2 rounded-xl">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border p-5"
      >
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Account Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/40">
            <span className="text-muted-foreground">Member Since</span>
            <span className="text-foreground">{p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/40">
            <span className="text-muted-foreground">Total Deliveries</span>
            <span className="text-foreground">{p?.totalDeliveries ?? 0}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Rating</span>
            <span className="text-foreground">{p?.rating ?? 0}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
