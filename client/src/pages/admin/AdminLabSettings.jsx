import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Building2, Phone, Mail, MapPin, Clock, Image, Plus, X, CheckCircle2, Shield, Globe, FlaskConical, Microscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminLabSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const f = await api.getMyFacility();
        setForm({
          name: f.name || '',
          email: f.email || '',
          phone: f.phone || '',
          address: f.address || '',
          city: f.city || '',
          state: f.state || '',
          description: f.description || '',
          logo: f.logo || '',
          image: f.image || '',
          establishedYear: f.establishedYear || '',
          workingHours: f.workingHours || '8:00 AM - 8:00 PM',
          nablNumber: f.nablNumber || '',
          aerbNumber: f.aerbNumber || '',
          pathologistName: f.pathologistName || '',
          pathologistQualification: f.pathologistQualification || '',
          radiologistName: f.radiologistName || '',
          radiologistQualification: f.radiologistQualification || '',
          cardiologistName: f.cardiologistName || '',
          cardiologistQualification: f.cardiologistQualification || '',
          technicianName: f.technicianName || '',
          technicianRole: f.technicianRole || '',
          technicianQualification: f.technicianQualification || '',
          technicianExperience: f.technicianExperience || '',
          accreditations: f.accreditations || [],
          amenities: f.amenities || { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, drinkingWater: false, wifi: false },
          socialLinks: f.socialLinks || { facebook: '', instagram: '', youtube: '' },
        });
      } catch (e) { console.error(e); toast.error('Failed to load lab data'); }
      setLoading(false);
    };
    load();
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addAccreditation = () => {
    const v = prompt('Enter accreditation:');
    if (v) update('accreditations', [...form.accreditations, v.trim().toUpperCase()]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = await api.getMyFacility();
      await api.updateFacility(f._id, {
        ...form,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
      });
      toast.success('Lab settings updated successfully');
    } catch (e) { toast.error(e.message || 'Failed to update'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Lab Settings</h1>
        <p className="text-muted-foreground">Manage your diagnostic lab profile, accreditations, and staff</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Lab Name</Label><Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Enter lab name" /></div>
            <div className="space-y-2"><Label>Established Year</Label><Input type="number" value={form.establishedYear} onChange={e => update('establishedYear', e.target.value)} placeholder="e.g. 2015" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><Phone className="w-3 h-3 inline mr-1" /> Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 8900" /></div>
            <div className="space-y-2"><Label><Mail className="w-3 h-3 inline mr-1" /> Email</Label><Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="lab@email.com" /></div>
          </div>
          <div className="space-y-2"><Label><MapPin className="w-3 h-3 inline mr-1" /> Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Full address" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Enter city" /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => update('state', e.target.value)} placeholder="Enter state" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief description about your lab" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> Images & Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Logo URL</Label><Input value={form.logo} onChange={e => update('logo', e.target.value)} placeholder="https://..." /></div>
          <div className="space-y-2"><Label>Cover Image URL</Label><Input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Accreditations & Licenses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><FlaskConical className="w-3 h-3 inline mr-1" /> NABL Number</Label><Input value={form.nablNumber} onChange={e => update('nablNumber', e.target.value)} placeholder="NABL-CC-2020-01-00987" /></div>
            <div className="space-y-2"><Label><Microscope className="w-3 h-3 inline mr-1" /> AERB Number</Label><Input value={form.aerbNumber} onChange={e => update('aerbNumber', e.target.value)} placeholder="AERB registration number" /></div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Accreditations</Label><Button variant="outline" size="sm" onClick={addAccreditation}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
            <div className="flex flex-wrap gap-2">
              {form.accreditations?.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> {a}
                  <button onClick={() => update('accreditations', form.accreditations.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="w-5 h-5" /> Key Personnel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">Pathologist</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.pathologistName} onChange={e => update('pathologistName', e.target.value)} placeholder="Dr. name" /></div>
            <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={form.pathologistQualification} onChange={e => update('pathologistQualification', e.target.value)} placeholder="MD Pathology, DNB" /></div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground mb-2">Radiologist</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.radiologistName} onChange={e => update('radiologistName', e.target.value)} placeholder="Dr. name" /></div>
            <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={form.radiologistQualification} onChange={e => update('radiologistQualification', e.target.value)} placeholder="MD Radiology" /></div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground mb-2">Cardiologist</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.cardiologistName} onChange={e => update('cardiologistName', e.target.value)} placeholder="Dr. name" /></div>
            <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={form.cardiologistQualification} onChange={e => update('cardiologistQualification', e.target.value)} placeholder="MD Cardiology" /></div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground mb-2">Technician</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.technicianName} onChange={e => update('technicianName', e.target.value)} placeholder="Technician name" /></div>
            <div className="space-y-1"><Label className="text-xs">Role</Label><Input value={form.technicianRole} onChange={e => update('technicianRole', e.target.value)} placeholder="Lab Technician / Phlebotomist" /></div>
            <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={form.technicianQualification} onChange={e => update('technicianQualification', e.target.value)} placeholder="B.Sc, MLT" /></div>
            <div className="space-y-1"><Label className="text-xs">Experience</Label><Input value={form.technicianExperience} onChange={e => update('technicianExperience', e.target.value)} placeholder="e.g. 3 years" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Working Hours</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Default Hours</Label>
          <Input value={form.workingHours} onChange={e => update('workingHours', e.target.value)} placeholder="e.g. 8:00 AM - 8:00 PM" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Amenities</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Object.entries({ parking: 'Parking', acWaitingArea: 'AC Waiting Area', wheelchairAccess: 'Wheelchair Access', cardPayment: 'Card Payment', drinkingWater: 'Drinking Water', wifi: 'Free Wi-Fi' }).map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.amenities?.[k] || false} onChange={e => update('amenities', { ...form.amenities, [k]: e.target.checked })} className="rounded border-border" />
              {lbl}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Social Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {['facebook', 'instagram', 'youtube'].map(s => (
            <div key={s} className="space-y-1">
              <Label className="capitalize">{s}</Label>
              <Input value={form.socialLinks?.[s] || ''} onChange={e => update('socialLinks', { ...form.socialLinks, [s]: e.target.value })} placeholder={`https://${s}.com/...`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
