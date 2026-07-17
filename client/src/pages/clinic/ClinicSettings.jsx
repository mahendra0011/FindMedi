import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, CheckCircle, Upload, User, Mail, Phone, MapPin, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function ClinicSettings() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timings, setTimings] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = await api.getDoctors();
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
          setBio(myDoc.bio || '');
          setPhone(myDoc.phone || '');
          setAddress(myDoc.location || '');
          setAvatar(myDoc.avatar || '');
        }
        const stored = localStorage.getItem('medicore_clinics');
        if (stored) {
          const clinics = JSON.parse(stored);
          const primary = clinics[0];
          if (primary) {
            setClinicName(primary.name || '');
            setAddress(primary.address || '');
            setPhone(primary.phone || '');
            setEmail(primary.email || '');
            setTimings(`${primary.timings?.weekday || ''} / ${primary.timings?.weekend || ''}`);
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (doctor) {
        await api.updateDoctor(doctor._id, { bio, phone, location: address });
      }
      await api.updateProfile({ name: clinicName, phone, address, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Clinic Profile Settings</h1>
        <p className="text-muted-foreground">Manage your clinic's public profile information</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/60">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden border-2 border-border/60">
              {avatar ? (
                <img src={avatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setAvatar(ev.target.result);
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-heading text-xl font-bold text-foreground">{clinicName || user?.name}</h2>
            <p className="text-muted-foreground text-sm">{user?.specialization || 'General Clinic'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Clinic Name</label>
            <Input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Your clinic name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinic@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Clinic address" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timings</label>
            <Input value={timings} onChange={e => setTimings(e.target.value)} placeholder="e.g. 9AM-5PM Mon-Sat" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Doctor Name</label>
            <Input value={user?.name || ''} disabled className="bg-muted" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">About / Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell patients about your clinic..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none h-24" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          {saved && <CheckCircle className="w-4 h-4 text-green-300" />}
        </Button>
      </div>
    </div>
  );
}
