import { useState, useEffect } from 'react';
import {
  Save, Loader2, Building2, Phone, Mail, MapPin, Clock, Shield, Ambulance,
  BedDouble, CheckCircle2, Image, Plus, X, Globe, Star, MessageSquare, Video,
  AlertTriangle, ShieldCheck, CheckSquare, Home,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function DoctorAutoConfirmList() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    api.getDoctorAutoConfirmList()
      .then(setDoctors)
      .catch(() => toast.error('Failed to load doctors'))
      .finally(() => setLoading(false));
  }, []);

  const toggleConfirm = async (doc) => {
    const next = doc.autoConfirmAppointment === false ? true : false;
    setSavingId(doc._id);
    setDoctors(prev => prev.map(d => d._id === doc._id ? { ...d, autoConfirmAppointment: next } : d));
    try { await api.updateDoctorAutoConfirm(doc._id, next); }
    catch { toast.error('Failed to update ' + doc.name); }
    setSavingId(null);
  };

  const updateSlotCapacity = async (doc, n) => {
    setDoctors(prev => prev.map(d => d._id === doc._id ? { ...d, maxBookingsPerSlot: n } : d));
    try { await api.updateDoctorSlotCapacity(doc._id, n); }
    catch { toast.error('Failed to update slot capacity for ' + doc.name); }
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Doctor Auto-Confirm &amp; Slot Capacity</CardTitle>
        <CardDescription>Har doctor ke liye auto-confirm on/off aur ek slot me kitne patients book ho sakte hain — set karein</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {doctors.map(doc => (
          <div key={doc._id} className="flex items-center justify-between py-2 border-b last:border-0 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground truncate">{doc.specialization}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Per slot</span>
                <Input type="number" min={1} max={20} className="w-16 h-8" value={doc.maxBookingsPerSlot || 1}
                  onChange={e => updateSlotCapacity(doc, Number(e.target.value))} />
              </div>
              <Switch checked={doc.autoConfirmAppointment !== false} disabled={savingId === doc._id} onCheckedChange={() => toggleConfirm(doc)} />
            </div>
          </div>
        ))}
        {!doctors.length && <p className="text-sm text-muted-foreground">No doctors found.</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminHospitalSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    licenseNumber: '',
    website: '',
    description: '',
    logo: '',
    image: '',
    establishedYear: '',
    hospitalType: 'Private',
    bedAvailability: 0,
    emergency24x7: false,
    emergencySupport: false,
    ambulanceService: false,
    refundOnMissedOrCancelled: true,
    appointmentModes: ['chat', 'video', 'offline'],
    accreditations: [],
    workingHours: { weekdays: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 6:00 PM', sunday: 'Closed' },
    insuranceAccepted: [],
    specialties: [],
    amenities: { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, inHousePharmacy: false, drinkingWater: false, wifi: false, homeVisit: false },
    socialLinks: { facebook: '', instagram: '', youtube: '' },
  });
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const h = await api.getMyHospital();
        const settings = await api.getFacilitySettings().catch(() => ({}));
        if (settings?.autoConfirmAppointment !== undefined) setAutoConfirm(settings.autoConfirmAppointment);
        setForm({
          name: h.name || '',
          email: h.email || '',
          phone: h.phone || '',
          address: h.address || '',
          city: h.city || '',
          state: h.state || '',
          pincode: h.pincode || '',
          licenseNumber: h.licenseNumber || '',
          website: h.website || '',
          description: h.description || '',
          logo: h.logo || '',
          image: h.image || '',
          establishedYear: h.establishedYear || '',
          hospitalType: h.hospitalType || 'Private',
          bedAvailability: h.bedAvailability || 0,
          emergency24x7: Boolean(h.emergency24x7 || h.emergencySupport),
          emergencySupport: Boolean(h.emergencySupport || h.emergency24x7),
          ambulanceService: Boolean(h.ambulanceService),
          refundOnMissedOrCancelled: h.refundOnMissedOrCancelled !== false,
          appointmentModes: h.appointmentModes || ['chat', 'video', 'offline'],
          accreditations: h.accreditations || [],
          workingHours: h.workingHours || { weekdays: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 6:00 PM', sunday: 'Closed' },
          insuranceAccepted: h.insuranceAccepted || [],
          specialties: h.specialties || [],
          amenities: h.amenities || { parking: false, acWaitingArea: false, wheelchairAccess: false, cardPayment: false, inHousePharmacy: false, drinkingWater: false, wifi: false, homeVisit: false },
          socialLinks: h.socialLinks || { facebook: '', instagram: '', youtube: '' },
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load hospital data');
      }
      setLoading(false);
    };
    load();
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleMode = (mode) => {
    const current = form.appointmentModes || [];
    if (current.includes(mode)) {
      if (current.length === 1) {
        toast.warning('At least one consultation mode must remain enabled');
        return;
      }
      update('appointmentModes', current.filter(m => m !== mode));
    } else {
      update('appointmentModes', [...current, mode]);
    }
  };

  const addAccreditation = () => {
    const v = prompt('Enter accreditation (e.g. NABH, NABL, ISO):');
    if (v) update('accreditations', [...form.accreditations, v.trim().toUpperCase()]);
  };

  const addSpecialty = () => {
    const v = prompt('Enter specialty (e.g. General Medicine, Pediatrics):');
    if (v) update('specialties', [...form.specialties, v.trim()]);
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
        emergency24x7: form.emergency24x7,
        emergencySupport: form.emergency24x7,
      });
      toast.success('Hospital settings updated successfully');
    } catch (e) {
      toast.error(e.message || 'Failed to update hospital');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Hospital Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your hospital profile, consultation channels, emergency services, and policies</p>
        </div>
        <Button size="default" onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Modes of Appointment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> Modes of Appointment You Provide
          </CardTitle>
          <CardDescription>Select all consultation modes your hospital doctors provide to patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div
              onClick={() => toggleMode('offline')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                form.appointmentModes?.includes('offline') ? 'border-violet-500 bg-violet-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.appointmentModes?.includes('offline') ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">In Hospital</span>
                <span className="text-[11px] text-muted-foreground">Hospital OPD visit</span>
              </div>
              <input type="checkbox" checked={form.appointmentModes?.includes('offline')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('home_visit')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                (form.appointmentModes?.includes('home_visit') || form.appointmentModes?.includes('home')) ? 'border-amber-500 bg-amber-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(form.appointmentModes?.includes('home_visit') || form.appointmentModes?.includes('home')) ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Home className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Home Visit</span>
                <span className="text-[11px] text-muted-foreground">Doctor at patient home</span>
              </div>
              <input type="checkbox" checked={(form.appointmentModes?.includes('home_visit') || form.appointmentModes?.includes('home'))} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('video')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                form.appointmentModes?.includes('video') ? 'border-emerald-500 bg-emerald-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.appointmentModes?.includes('video') ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Video className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Video Call</span>
                <span className="text-[11px] text-muted-foreground">Virtual video consult</span>
              </div>
              <input type="checkbox" checked={form.appointmentModes?.includes('video')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('audio')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                form.appointmentModes?.includes('audio') ? 'border-teal-500 bg-teal-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.appointmentModes?.includes('audio') ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Audio Call</span>
                <span className="text-[11px] text-muted-foreground">Direct voice consult</span>
              </div>
              <input type="checkbox" checked={form.appointmentModes?.includes('audio')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('chat')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                form.appointmentModes?.includes('chat') ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.appointmentModes?.includes('chat') ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Online Chat</span>
                <span className="text-[11px] text-muted-foreground">Digital messaging</span>
              </div>
              <input type="checkbox" checked={form.appointmentModes?.includes('chat')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency & Refund Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Emergency Support &amp; Refund Policy
          </CardTitle>
          <CardDescription>Configure emergency 24/7 care, ambulance fleets, and cancellation refund guarantee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Emergency Support Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60">
            <div>
              <Label className="font-semibold text-sm text-foreground flex items-center gap-1.5 cursor-pointer">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Are you provide emergency support (24/7 Emergency Care)?
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays the 24x7 Emergency Care badge on your hospital profile and enables urgent triage routing.
              </p>
            </div>
            <Switch
              checked={form.emergency24x7}
              onCheckedChange={v => {
                update('emergency24x7', v);
                update('emergencySupport', v);
              }}
            />
          </div>

          {/* Ambulance Service Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60">
            <div>
              <Label className="font-semibold text-sm text-foreground flex items-center gap-1.5 cursor-pointer">
                <Ambulance className="w-4 h-4 text-blue-600" /> Are you provide ambulance service?
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lists your hospital with dedicated 24x7 ambulance dispatch support.
              </p>
            </div>
            <Switch checked={form.ambulanceService} onCheckedChange={v => update('ambulanceService', v)} />
          </div>

          {/* Refund Support Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60">
            <div>
              <Label className="font-semibold text-sm text-foreground flex items-center gap-1.5 cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Are you support refund when the appointment is missed and cancelled by patient?
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enables 100% Refund Guarantee badge on doctor bookings and streamlines patient refunds.
              </p>
            </div>
            <Switch checked={form.refundOnMissedOrCancelled} onCheckedChange={v => update('refundOnMissedOrCancelled', v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Basic Information</CardTitle><CardDescription>Hospital name, type, and contact details</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Hospital Name</Label><Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Enter hospital name" /></div>
            <div className="space-y-2"><Label>Hospital Type</Label><Input value={form.hospitalType} onChange={e => update('hospitalType', e.target.value)} placeholder="Private / Government" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Established Year</Label><Input type="number" value={form.establishedYear} onChange={e => update('establishedYear', e.target.value)} placeholder="e.g. 1995" /></div>
            <div className="space-y-2"><Label><BedDouble className="w-3 h-3 inline mr-1" /> Bed Capacity</Label><Input type="number" value={form.bedAvailability} onChange={e => update('bedAvailability', e.target.value)} placeholder="e.g. 250" /></div>
            <div className="space-y-2"><Label>License Number</Label><Input value={form.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} placeholder="License number" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label><Phone className="w-3 h-3 inline mr-1" /> Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 8900" /></div>
            <div className="space-y-2"><Label><Mail className="w-3 h-3 inline mr-1" /> Email</Label><Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="hospital@email.com" /></div>
          </div>
          <div className="space-y-2"><Label><MapPin className="w-3 h-3 inline mr-1" /> Address</Label><Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Full address" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Enter city" /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => update('state', e.target.value)} placeholder="Enter state" /></div>
            <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={e => update('pincode', e.target.value)} placeholder="Pincode" /></div>
          </div>
          <div className="space-y-2"><Label><Globe className="w-3 h-3 inline mr-1" /> Website</Label><Input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief description about your hospital" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> Images &amp; Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Logo URL</Label><Input value={form.logo} onChange={e => update('logo', e.target.value)} placeholder="https://..." /></div>
          <div className="space-y-2"><Label>Cover Image URL</Label><Input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Working Hours</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(form.workingHours || {}).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs capitalize">{k}</Label>
              <Input value={v || ''} onChange={e => update('workingHours', { ...form.workingHours, [k]: e.target.value })} placeholder="9AM-6PM" className="h-8 text-xs" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Accreditations &amp; Insurance</CardTitle></CardHeader>
        <CardContent className="space-y-6">
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" /> Specialties</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between"><Label>Specialties</Label><Button variant="outline" size="sm" onClick={addSpecialty}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          <div className="flex flex-wrap gap-2">
            {form.specialties?.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Star className="w-3 h-3" /> {s}
                <button onClick={() => update('specialties', form.specialties.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
              </span>
            ))}
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Appointment Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Auto Confirm Appointment</h3>
              <p className="text-sm text-muted-foreground">
                When enabled, appointments are auto-confirmed after payment. When disabled, they stay pending until manually confirmed.
              </p>
            </div>
            <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
          </div>
          <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={async () => {
            setSettingsSaving(true);
            try {
              await api.updateFacilitySettings({ autoConfirmAppointment: autoConfirm });
              toast.success('Appointment settings updated');
            } catch (e) { toast.error(e.message || 'Failed to update'); }
            setSettingsSaving(false);
          }} disabled={settingsSaving}>
            {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {settingsSaving ? 'Saving...' : 'Save Auto-Confirm Setting'}
          </Button>
        </CardContent>
      </Card>

      <DoctorAutoConfirmList />

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
