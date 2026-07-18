import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, CheckCircle, Upload, Image, MapPin, Phone, Mail, Clock, Building2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const STORAGE_KEY = 'medicore_labcenter_settings';
// TODO: Replace localStorage with api calls once settings endpoint is added to lab routes

const centerTypes = ['Pathology Lab', 'Diagnostic Center', 'Imaging Center'];
const certOptions = ['NABL', 'AERB', 'ISO'];

const defaultSettings = {
  centerName: 'MediCore Diagnostics',
  address: '123, Healthcare Avenue, New Delhi - 110001',
  phone: '+91 9876543210',
  email: 'info@medicorelab.com',
  centerType: 'Diagnostic Center',
  certifications: ['NABL', 'ISO'],
  timings: { weekday: '7:00 AM - 9:00 PM', weekend: '8:00 AM - 5:00 PM' },
  logo: '',
  gallery: [],
};

export default function LabSettings() {
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [centerName, setCenterName] = useState(settings.centerName || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [email, setEmail] = useState(settings.email || '');
  const [centerType, setCenterType] = useState(settings.centerType || 'Diagnostic Center');
  const [certifications, setCertifications] = useState(settings.certifications || []);
  const [weekday, setWeekday] = useState(settings.timings?.weekday || '');
  const [weekend, setWeekend] = useState(settings.timings?.weekend || '');
  const [logo, setLogo] = useState(settings.logo || '');
  const [gallery, setGallery] = useState(settings.gallery || []);

  const toggleCert = (cert) => {
    setCertifications(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]);
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'logo') setLogo(ev.target.result);
      else setGallery(prev => [...prev, ev.target.result]);
    };
    reader.readAsDataURL(file);
  };

  const removeGalleryImage = (idx) => {
    setGallery(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      const data = {
        centerName, address, phone, email, centerType, certifications,
        timings: { weekday, weekend }, logo, gallery,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Lab Center Settings</h1>
        <p className="text-muted-foreground">Manage your lab/diagnostic center profile</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/60">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden border-2 border-border/60">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-primary" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'logo')} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-heading text-xl font-bold text-foreground">{centerName || 'Your Lab Center'}</h2>
            <p className="text-muted-foreground text-sm">{centerType}</p>
            <div className="flex items-center gap-1 mt-2 justify-center sm:justify-start">
              {certifications.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Center Name</label>
            <Input value={centerName} onChange={e => setCenterName(e.target.value)} placeholder="Lab/Diagnostic center name" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <label className="text-sm font-medium mb-2 block">Center Type</label>
          <div className="flex flex-wrap gap-2">
            {centerTypes.map(t => (
              <button key={t} onClick={() => setCenterType(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${centerType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <label className="text-sm font-medium mb-2 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Certifications</label>
          <div className="flex flex-wrap gap-2">
            {certOptions.map(cert => (
              <button key={cert} onClick={() => toggleCert(cert)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${certifications.includes(cert) ? 'bg-success/20 text-success border border-success/30' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'}`}>
                {certifications.includes(cert) && <CheckCircle className="w-3.5 h-3.5" />}
                {cert}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <label className="text-sm font-medium mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timings</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Weekdays</label>
              <Input value={weekday} onChange={e => setWeekday(e.target.value)} placeholder="7:00 AM - 9:00 PM" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Weekends</label>
              <Input value={weekend} onChange={e => setWeekend(e.target.value)} placeholder="8:00 AM - 5:00 PM" />
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <label className="text-sm font-medium mb-2 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Gallery Images</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
            {gallery.map((img, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border/60">
                <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => removeGalleryImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  X
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'gallery')} />
            </label>
          </div>
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
