import { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Phone, Mail, MapPin, Clock, Image, Plus, X, CheckCircle2, Globe, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const DAY_LABELS = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };

export default function AdminClinicSettings() {
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
          pincode: f.pincode || '',
          licenseNumber: f.licenseNumber || '',
          description: f.description || '',
          website: f.details?.website || '',
          logo: f.logo || '',
          image: f.image || '',
          establishedYear: f.establishedYear || '',
          specialties: f.specialties || [],
          accreditations: f.accreditations || [],
          timing: f.timing || { monday:'9:00 AM - 6:00 PM', tuesday:'9:00 AM - 6:00 PM', wednesday:'9:00 AM - 6:00 PM', thursday:'9:00 AM - 6:00 PM', friday:'9:00 AM - 6:00 PM', saturday:'9:00 AM - 2:00 PM', sunday:'Closed' },
          amenities: f.amenities || { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, inHousePharmacy: false, drinkingWater: false, wifi: false, homeVisit: false },
          insurance: f.details?.insurance || [],
          socialLinks: f.socialLinks || { facebook: '', instagram: '', youtube: '' },
        });
      } catch (e) { console.error(e); toast.error('Failed to load clinic data'); }
      setLoading(false);
    };
    load();
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addSpecialty = () => {
    const v = prompt('Enter specialty (e.g. General Medicine, Pediatrics):');
    if (v) update('specialties', [...form.specialties, v.trim()]);
  };

  const addAccreditation = () => {
    const v = prompt('Enter accreditation:');
    if (v) update('accreditations', [...form.accreditations, v.trim().toUpperCase()]);
  };

  const addInsurance = () => {
    const v = prompt('Enter insurance provider name:');
    if (v) update('insurance', [...form.insurance, v.trim()]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = await api.getMyFacility();
      await api.updateFacility(f._id, {
        ...form,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
        details: { ...(f.details || {}), website: form.website, insurance: form.insurance },
      });
      toast.success('Clinic settings updated successfully');
    } catch (e) { toast.error(e.message || 'Failed to update'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Clinic Settings</h1>
        <p className="text-muted-foreground">Manage your clinic profile, working hours, and services</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Basic Information</CardTitle><CardDescription>Clinic name, contact details, and description</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Clinic Name</Label><Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Enter clinic name" /></div>
            <div className="space-y-2"><Label>Established Year</Label><Input type="number" value={form.establishedYear} onChange={e => update('establishedYear', e.target.value)} placeholder="e.g. 2010" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><Phone className="w-3 h-3 inline mr-1" /> Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 8900" /></div>
            <div className="space-y-2"><Label><Mail className="w-3 h-3 inline mr-1" /> Email</Label><Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="clinic@email.com" /></div>
          </div>
          <div className="space-y-2"><Label><MapPin className="w-3 h-3 inline mr-1" /> Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Full address" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Enter city" /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => update('state', e.target.value)} placeholder="Enter state" /></div>
            <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={e => update('pincode', e.target.value)} placeholder="Pincode" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><FileText className="w-3 h-3 inline mr-1" /> License Number</Label><Input value={form.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} placeholder="License / registration number" /></div>
            <div className="space-y-2"><Label><Globe className="w-3 h-3 inline mr-1" /> Website</Label><Input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief description about your clinic" /></div>
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
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Working Hours</CardTitle><CardDescription>Set per-day opening hours</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.keys(DAY_LABELS).map(day => (
            <div key={day} className="space-y-1">
              <Label className="text-xs capitalize">{DAY_LABELS[day]}</Label>
              <Input value={form.timing?.[day] || ''} onChange={e => update('timing', { ...form.timing, [day]: e.target.value })} placeholder="9AM-6PM" className="h-8 text-xs" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Specialties & Accreditations</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Specialties</Label><Button variant="outline" size="sm" onClick={addSpecialty}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
            <div className="flex flex-wrap gap-2">
              {form.specialties?.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {s}
                  <button onClick={() => update('specialties', form.specialties.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                </span>
              ))}
            </div>
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
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label><Shield className="w-3 h-3 inline mr-1" /> Insurance Accepted</Label><Button variant="outline" size="sm" onClick={addInsurance}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
            <div className="flex flex-wrap gap-2">
              {form.insurance?.map((ins, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Shield className="w-3 h-3" /> {ins}
                  <button onClick={() => update('insurance', form.insurance.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Amenities</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Object.entries({ parking: 'Parking', acWaitingArea: 'AC Waiting Area', wheelchairAccess: 'Wheelchair Access', cardPayment: 'Card Payment', inHousePharmacy: 'In-house Pharmacy', drinkingWater: 'Drinking Water', wifi: 'Free Wi-Fi', homeVisit: 'Home Visit' }).map(([k, lbl]) => (
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
