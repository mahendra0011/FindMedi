import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Building2, Phone, Mail, MapPin, Clock, Shield, Ambulance, BedDouble, CheckCircle2, Image, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminHospitalSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const h = await api.getMyHospital();
        setForm({
          name: h.name || '',
          email: h.email || '',
          phone: h.phone || '',
          address: h.address || '',
          city: h.city || '',
          state: h.state || '',
          description: h.description || '',
          logo: h.logo || '',
          image: h.image || '',
          establishedYear: h.establishedYear || '',
          hospitalType: h.hospitalType || 'Private',
          bedAvailability: h.bedAvailability || 0,
          emergency24x7: h.emergency24x7 || false,
          ambulanceService: h.ambulanceService || false,
          accreditations: h.accreditations || [],
          workingHours: h.workingHours || { weekdays: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 2:00 PM', sunday: 'Closed' },
          insuranceAccepted: h.insuranceAccepted || [],
        });
      } catch (e) { console.error(e); toast.error('Failed to load hospital data'); }
      setLoading(false);
    };
    load();
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addAccreditation = () => {
    const v = prompt('Enter accreditation (e.g. NABH, NABL, ISO):');
    if (v) update('accreditations', [...form.accreditations, v.trim().toUpperCase()]);
  };

  const addInsurance = () => {
    const v = prompt('Enter insurance provider name:');
    if (v) update('insuranceAccepted', [...form.insuranceAccepted, { provider: v.trim() }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const h = await api.getMyHospital();
      await api.updateHospital(h._id, {
        ...form,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
      });
      toast.success('Hospital settings updated successfully');
    } catch (e) { toast.error(e.message || 'Failed to update'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Hospital Settings</h1>
        <p className="text-muted-foreground">Manage your hospital profile, working hours, and services</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Basic Information</CardTitle><CardDescription>Hospital name, contact details, and description</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Hospital Name</Label><Input value={form.name} onChange={e => update('name', e.target.value)} /></div>
            <div className="space-y-2"><Label>Established Year</Label><Input type="number" value={form.establishedYear} onChange={e => update('establishedYear', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><Phone className="w-3 h-3 inline mr-1" /> Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
            <div className="space-y-2"><Label><Mail className="w-3 h-3 inline mr-1" /> Email</Label><Input value={form.email} onChange={e => update('email', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label><MapPin className="w-3 h-3 inline mr-1" /> Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => update('state', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Hospital Type</Label><select value={form.hospitalType} onChange={e => update('hospitalType', e.target.value)} className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option>Private</option><option>Government</option></select></div>
            <div className="space-y-2"><Label><BedDouble className="w-3 h-3 inline mr-1" /> Bed Availability</Label><Input type="number" value={form.bedAvailability} onChange={e => update('bedAvailability', Number(e.target.value))} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} /></div>
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
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Working Hours</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {['weekdays', 'saturday', 'sunday'].map(day => (
            <div key={day} className="space-y-2">
              <Label className="capitalize">{day}</Label>
              <Input value={form.workingHours?.[day] || ''} onChange={e => update('workingHours', { ...form.workingHours, [day]: e.target.value })} placeholder={day === 'sunday' ? 'Closed' : '9:00 AM - 6:00 PM'} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Services & Badges</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between"><Label>24/7 Emergency Service</Label><Switch checked={form.emergency24x7} onCheckedChange={v => update('emergency24x7', v)} /></div>
          <div className="flex items-center justify-between"><Label><Ambulance className="w-4 h-4 inline mr-1" /> Ambulance Service</Label><Switch checked={form.ambulanceService} onCheckedChange={v => update('ambulanceService', v)} /></div>
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
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Insurance Accepted</Label><Button variant="outline" size="sm" onClick={addInsurance}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
            <div className="flex flex-wrap gap-2">
              {form.insuranceAccepted?.map((ins, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Shield className="w-3 h-3" /> {ins.provider || ins}
                  <button onClick={() => update('insuranceAccepted', form.insuranceAccepted.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                </span>
              ))}
            </div>
          </div>
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
