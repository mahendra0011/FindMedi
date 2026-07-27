import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Plus, X, Calendar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DeliveryZone() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workZone, setWorkZone] = useState([]);
  const [availability, setAvailability] = useState('flexible');
  const [newPincode, setNewPincode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const prof = await api.get('/delivery-partners/profile/me');
      setProfile(prof);
      setWorkZone(prof.workZone || []);
      setAvailability(prof.availability || 'flexible');
    } catch {
      toast.error('Failed to load profile');
    }
    setLoading(false);
  };

  const addZone = () => {
    const pin = newPincode.trim();
    if (pin && !workZone.includes(pin)) {
      setWorkZone([...workZone, pin]);
      setNewPincode('');
    }
  };

  const removeZone = (pin) => {
    setWorkZone(workZone.filter((z) => z !== pin));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/delivery-partners/profile/${profile._id}`, {
        workZone,
        availability,
      });
      setProfile((p) => ({ ...p, workZone, availability }));
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
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
        <h1 className="font-heading text-2xl font-bold text-foreground">My Zone & Availability</h1>
        <p className="text-muted-foreground">Manage your delivery area and working hours</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-5"
      >
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Delivery Zone (Pincodes)</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {workZone.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones added yet</p>
          ) : (
            workZone.map((pin) => (
              <span key={pin} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                <MapPin className="w-3 h-3" /> {pin}
                <button onClick={() => removeZone(pin)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input value={newPincode} onChange={(e) => setNewPincode(e.target.value)}
            placeholder="Enter pincode" className="max-w-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') addZone(); }}
          />
          <Button variant="outline" onClick={addZone} className="gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border p-5"
      >
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Availability</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { value: 'full-time', label: 'Full-time', desc: 'Available all day' },
            { value: 'part-time', label: 'Part-time', desc: 'Specific hours' },
            { value: 'flexible', label: 'Flexible', desc: 'As per availability' },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setAvailability(opt.value)}
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
            <Badge variant={profile?.status === 'approved' ? 'default' : 'secondary'}>{profile?.status}</Badge>
          </div>
          <div className="flex justify-between py-2 border-b border-border/40">
            <span className="text-muted-foreground">Online</span>
            <span className={`font-medium ${profile?.isOnline ? 'text-success' : 'text-muted-foreground'}`}>
              {profile?.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Available</span>
            <span className={`font-medium ${profile?.isAvailable ? 'text-success' : 'text-muted-foreground'}`}>
              {profile?.isAvailable ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
