'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Plus, X, Calendar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useDeliveryProfile, useUpdateDeliveryZone } from '@/features/delivery';

export default function DeliveryZonePage() {
  const { data: profile, isLoading } = useDeliveryProfile();
  const updateMutation = useUpdateDeliveryZone();
  const [workZone, setWorkZone] = useState<string[]>([]);
  const [availability, setAvailability] = useState('flexible');
  const [newPincode, setNewPincode] = useState('');

  useEffect(() => {
    if (profile) {
      setWorkZone((profile.workZone as string[]) ?? []);
      setAvailability((profile.availability as string) ?? 'flexible');
    }
  }, [profile]);

  const addZone = () => {
    const pin = newPincode.trim();
    if (pin && !workZone.includes(pin)) {
      setWorkZone([...workZone, pin]);
      setNewPincode('');
    }
  };

  const removeZone = (pin: string) => {
    setWorkZone(workZone.filter((z) => z !== pin));
  };

  const save = async () => {
    const id = (profile as unknown as { _id?: string })?._id;
    if (!id) {
      toast.error('Profile not found');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, workZone, availability });
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const p = profile as unknown as { status?: string; isOnline?: boolean; isAvailable?: boolean } | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Zone & Availability</h1>
        <p className="text-muted-foreground">Manage your delivery area and working hours</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Delivery Zone (Pincodes)</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {workZone.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones added yet</p>
          ) : (
            workZone.map((pin) => (
              <span
                key={pin}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20"
              >
                <MapPin className="w-3 h-3" /> {pin}
                <button type="button" onClick={() => removeZone(pin)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newPincode}
            onChange={(e) => setNewPincode(e.target.value)}
            placeholder="Enter pincode"
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addZone();
            }}
          />
          <Button variant="outline" onClick={addZone} className="gap-1 rounded-xl">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border p-5"
      >
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Availability</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { value: 'full-time', label: 'Full-time', desc: 'Available all day' },
            { value: 'part-time', label: 'Part-time', desc: 'Specific hours' },
            { value: 'flexible', label: 'Flexible', desc: 'As per availability' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAvailability(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                availability === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border/60 bg-muted/20 hover:border-primary/30 text-muted-foreground'
              }`}
            >
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-xs mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Current Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/40">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={p?.status === 'approved' ? 'default' : 'secondary'}>{p?.status ?? 'pending'}</Badge>
          </div>
          <div className="flex justify-between py-2 border-b border-border/40">
            <span className="text-muted-foreground">Online</span>
            <span className={`font-medium ${p?.isOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {p?.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Available</span>
            <span className={`font-medium ${p?.isAvailable ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {p?.isAvailable ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={updateMutation.isPending} className="gap-2 rounded-xl">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
