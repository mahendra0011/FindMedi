import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Plus, X, Calendar, Save, Loader2, Navigation, ShieldCheck, Bike, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const PRESET_PINCODES = [
  { pin: '482001', area: 'Civil Lines / High Court' },
  { pin: '482002', area: 'Gorakhpur / Rampur' },
  { pin: '482003', area: 'Wright Town / Russell Chowk' },
  { pin: '482004', area: 'Adhartal / Industrial Area' },
  { pin: '482005', area: 'Medical College / Garha' },
  { pin: '482008', area: 'Vijay Nagar / ISBT' },
  { pin: '110001', area: 'Connaught Place / Central Delhi' },
  { pin: '110029', area: 'Safdarjung / AIIMS Campus' },
];

export default function DeliveryZone() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workZone, setWorkZone] = useState<string[]>([]);
  const [availability, setAvailability] = useState<'full-time' | 'part-time' | 'flexible'>('flexible');
  const [newPincode, setNewPincode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const prof = await api.get('/delivery-partners/profile/me').catch(() => null);
      setProfile(prof);
      setWorkZone(prof?.workZone || ['482001', '482002', '482005']);
      setAvailability(prof?.availability || 'flexible');
    } catch {
      toast.error('Failed to load zone profile');
    }
    setLoading(false);
  };

  const addZone = (pinToAdd?: string) => {
    const pin = (pinToAdd || newPincode).trim();
    if (pin && !workZone.includes(pin)) {
      setWorkZone([...workZone, pin]);
      setNewPincode('');
    }
  };

  const removeZone = (pin: string) => {
    setWorkZone(workZone.filter((z) => z !== pin));
  };

  const save = async () => {
    if (!profile?._id) return;
    setSaving(true);
    try {
      await api.put(`/delivery-partners/profile/${profile._id}`, {
        workZone,
        availability,
      });
      setProfile((p: any) => ({ ...p, workZone, availability }));
      toast.success('Operational zone & availability preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading delivery zones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Delivery Zone & Shift Hours
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define postal codes where you accept medicine delivery orders and set your working commitments
            </p>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 self-start sm:self-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Zone & Schedule'}
        </Button>
      </div>

      {/* ── Pincodes Configuration Card ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="font-bold text-base text-foreground">
              Delivery Operating Pincodes ({workZone.length} Selected)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only medicine orders for these postal locations will ping your delivery console
            </p>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {profile?.city || 'Jabalpur Metro'}
          </span>
        </div>

        {/* Selected Zone Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {workZone.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No postal zones chosen yet. Add at least one pincode.</p>
          ) : (
            workZone.map((pin) => (
              <span
                key={pin}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{pin}</span>
                <button
                  type="button"
                  onClick={() => removeZone(pin)}
                  className="hover:text-destructive transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Custom Input */}
        <div className="flex gap-2 max-w-md pt-2">
          <Input
            value={newPincode}
            onChange={(e) => setNewPincode(e.target.value)}
            placeholder="Enter 6-digit postal pincode..."
            className="h-10 text-xs rounded-xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addZone();
            }}
          />
          <Button
            type="button"
            onClick={() => addZone()}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Pincode
          </Button>
        </div>

        {/* Quick popular chips */}
        <div className="pt-3 border-t border-border/60">
          <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-2">
            Popular Service Hubs:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_PINCODES.map((item) => {
              const isSelected = workZone.includes(item.pin);
              return (
                <button
                  key={item.pin}
                  type="button"
                  onClick={() => (isSelected ? removeZone(item.pin) : addZone(item.pin))}
                  className={`text-[11px] px-3 py-1.5 rounded-xl font-medium border transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/60'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {item.pin} ({item.area})
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Availability Shift Selection ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="font-bold text-base text-foreground">Weekly Shift Commitment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select your preferred delivery shift structure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'full-time', label: 'Full-Time Shift', desc: 'Active 8–10 hours daily. Higher dispatch priority.' },
            { value: 'part-time', label: 'Part-Time Shift', desc: 'Morning or Evening hours. Great for students.' },
            { value: 'flexible', label: 'On-Demand Flexible', desc: 'Go online whenever you want and take gigs.' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAvailability(opt.value as any)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                availability === opt.value
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border/60 bg-muted/20 hover:border-primary/40 text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                {availability === opt.value && <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>}
              </div>
              <p className="font-bold text-sm text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
