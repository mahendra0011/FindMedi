import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Phone, Mail, MapPin, Save, Loader2, Camera, 
  Bike, ShieldCheck, HeartPulse, BellRing, Sparkles, Navigation,
  CreditCard, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function DeliverySettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    vehicleType: 'motorcycle',
    vehicleNumber: '',
    emergencyContact: { name: '', phone: '', relation: 'Family' },
    notifications: { sound: true, highPriorityAlerts: true, smsBackup: true },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const prof = await api.get('/delivery-partners/profile/me');
      setProfile(prof);
      setForm({
        name: prof.name || user?.name || '',
        phone: prof.phone || user?.phone || '',
        email: prof.email || user?.email || '',
        address: prof.address || '',
        city: prof.city || 'Jabalpur',
        pincode: prof.pincode || '',
        vehicleType: prof.vehicleType || 'motorcycle',
        vehicleNumber: prof.vehicleNumber || '',
        emergencyContact: prof.emergencyContact || { name: '', phone: '', relation: 'Family' },
        notifications: { sound: true, highPriorityAlerts: true, smsBackup: true },
      });
    } catch {
      toast.error('Failed to load profile');
    }
    setLoading(false);
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const setNested = (parent: string, k: string, v: any) => setForm((f: any) => ({ 
    ...f, 
    [parent]: { ...f[parent], [k]: v } 
  }));

  const save = async () => {
    setSaving(true);
    try {
      if (profile?._id) {
        await api.put(`/delivery-partners/profile/${profile._id}`, form);
      }
      toast.success('Profile preferences successfully saved!');
    } catch {
      toast.error('Failed to update profile settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading delivery partner preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Profile Settings & Preferences
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your personal credentials, mobility vehicle configuration, and emergency SOS contacts
            </p>
          </div>
        </div>

        <Button 
          onClick={save} 
          disabled={saving} 
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-xs h-10 px-5 gap-2 shadow-sm self-start sm:self-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Updating...' : 'Save Preferences'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary stats */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm"
          >
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 p-1 shadow-sm flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-muted/40 flex items-center justify-center overflow-hidden">
                  {profile?.photo ? (
                    <img src={profile.photo} alt="Partner avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
              </div>
              <button 
                title="Change Photo"
                onClick={() => toast.info('To update profile photo, upload in Documents & KYC')}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-transform hover:scale-105"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-foreground mb-0.5">{profile?.name || user?.name}</h2>
            <p className="text-xs text-muted-foreground mb-3">{profile?.phone || user?.phone}</p>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 rounded-full capitalize">
                {profile?.vehicleType || 'Motorcycle'} Partner
              </Badge>
              <Badge variant="outline" className="text-muted-foreground text-xs px-2.5 py-0.5 rounded-full">
                ID: {profile?._id?.slice(-6).toUpperCase() || 'MED891'}
              </Badge>
            </div>

            <div className="pt-4 border-t border-border/60 grid grid-cols-2 gap-3 text-left">
              <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Rating</span>
                <span className="text-base font-bold text-warning">★ {profile?.rating || '4.9'}</span>
              </div>
              <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Deliveries</span>
                <span className="text-base font-bold text-primary">{profile?.totalDeliveries || 48}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Notification Settings */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" />
              Dispatch Alerts
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">High-Volume Siren</p>
                  <p className="text-[11px] text-muted-foreground">Ringtone during incoming runs</p>
                </div>
                <Switch 
                  checked={form.notifications.sound} 
                  onCheckedChange={(checked) => setNested('notifications', 'sound', checked)} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">2-Min Urgent Timer</p>
                  <p className="text-[11px] text-muted-foreground">Full screen emergency dispatch</p>
                </div>
                <Switch 
                  checked={form.notifications.highPriorityAlerts} 
                  onCheckedChange={(checked) => setNested('notifications', 'highPriorityAlerts', checked)} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Detailed form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-sm"
          >
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Full Registered Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={form.name} 
                    onChange={(e) => set('name', e.target.value)} 
                    className="pl-9 rounded-xl" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Primary Mobile Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={form.phone} 
                    onChange={(e) => set('phone', e.target.value)} 
                    className="pl-9 rounded-xl" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={form.email} 
                    onChange={(e) => set('email', e.target.value)} 
                    className="pl-9 rounded-xl" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Home City (Base Hub)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={form.city} 
                    onChange={(e) => set('city', e.target.value)} 
                    className="pl-9 rounded-xl" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Street / Local Address</Label>
                <Input 
                  value={form.address} 
                  onChange={(e) => set('address', e.target.value)} 
                  placeholder="House/Apartment, Colony/Road"
                  className="rounded-xl" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Home Pincode</Label>
                <Input 
                  value={form.pincode} 
                  onChange={(e) => set('pincode', e.target.value)} 
                  placeholder="e.g. 482001"
                  className="rounded-xl" 
                />
              </div>
            </div>
          </motion.div>

          {/* Vehicle Information */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-sm"
          >
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              <Bike className="w-4 h-4 text-primary" />
              Delivery Vehicle Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Vehicle Type</Label>
                <select 
                  value={form.vehicleType}
                  onChange={(e) => set('vehicleType', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="motorcycle">Motorcycle / Bike (Petrol / EV)</option>
                  <option value="scooter">Scooter / Activa</option>
                  <option value="bicycle">Electric Bicycle / Eco Pedal</option>
                  <option value="four_wheeler">Four Wheeler / Medical Van</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Vehicle Registration Number</Label>
                <Input 
                  value={form.vehicleNumber} 
                  onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} 
                  placeholder="e.g. MP-20-EA-9912"
                  className="rounded-xl font-mono uppercase" 
                />
              </div>
            </div>
          </motion.div>

          {/* Emergency SOS Contact */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-destructive" />
                Emergency Contact (Rider Safety SOS)
              </h3>
              <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] px-2 py-0.5 rounded-full">
                Active SOS Link
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              In case of sudden accident, vehicle breakdown, or medical distress on duty, FindMedi safety dispatch alerts this contact immediately.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Emergency Contact Name</Label>
                <Input 
                  value={form.emergencyContact.name} 
                  onChange={(e) => setNested('emergencyContact', 'name', e.target.value)} 
                  placeholder="Relative or next of kin"
                  className="rounded-xl" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Emergency Contact Phone</Label>
                <Input 
                  value={form.emergencyContact.phone} 
                  onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)} 
                  placeholder="10-digit mobile number"
                  className="rounded-xl" 
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
