import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, MapPin, FileText, CheckCircle, Loader2, ArrowLeft, Clock, Shield, Ambulance, BedDouble, Image, Plus, X, CreditCard, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';

const SPECIALTIES = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT', 'Psychiatry', 'Gynecology', 'Urology', 'Ophthalmology'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cashless', 'Cheque'];

export default function HospitalRegister() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '',
    licenseNumber: '', description: '', specialties: [],
    establishedYear: '', hospitalType: 'Private', bedAvailability: '',
    emergency24x7: false, ambulanceService: false,
    accreditations: [], workingHours: { weekdays: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 2:00 PM', sunday: 'Closed' },
    insuranceAccepted: [], paymentModes: ['Cash', 'UPI', 'Card'],
    logo: '', image: '',
    adminName: '', adminEmail: '', adminPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const toggleSpecialty = (spec) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter(s => s !== spec)
        : [...prev.specialties, spec],
    }));
  };

  const togglePaymentMode = (mode) => {
    setForm(prev => ({
      ...prev,
      paymentModes: prev.paymentModes.includes(mode)
        ? prev.paymentModes.filter(m => m !== mode)
        : [...prev.paymentModes, mode],
    }));
  };

  const addAccreditation = () => {
    const v = prompt('Enter accreditation (e.g. NABH, NABL, ISO):');
    if (v) setForm(prev => ({ ...prev, accreditations: [...prev.accreditations, v.trim().toUpperCase()] }));
  };

  const addInsurance = () => {
    const v = prompt('Enter insurance provider name:');
    if (v) setForm(prev => ({ ...prev, insuranceAccepted: [...prev.insuranceAccepted, v.trim()] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
        bedAvailability: form.bedAvailability ? Number(form.bedAvailability) : undefined,
        accreditations: form.accreditations,
        workingHours: form.workingHours,
        insuranceAccepted: form.insuranceAccepted.map(i => typeof i === 'string' ? { provider: i } : i),
        paymentModes: form.paymentModes,
      };
      const data = await api.registerHospital(payload);
      setSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Registration Submitted!</h2>
            <p className="text-muted-foreground mb-6">{success.message}</p>
            <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
              <p className="text-sm font-medium text-foreground">Temporary Password</p>
              <p className="text-lg font-mono font-bold text-primary">{success.tempPassword}</p>
              <p className="text-xs text-muted-foreground">Use this password to log in after your hospital is approved.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link to="/login">Go to Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Register Your Hospital</h1>
              <p className="text-sm text-muted-foreground">Join MediCore platform and start managing healthcare efficiently</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Hospital Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Hospital Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Enter hospital name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Mail className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="hospital@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Phone className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Phone <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="+1 234 567 8900"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Address <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={form.address}
                    onChange={update('address')}
                    placeholder="Enter full address"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    City <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.city}
                    onChange={update('city')}
                    placeholder="Enter city"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">State</label>
                  <Input
                    value={form.state}
                    onChange={update('state')}
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <FileText className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    License Number <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.licenseNumber}
                    onChange={update('licenseNumber')}
                    placeholder="Medical license number"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={update('description')}
                    placeholder="Brief description about the hospital"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Specialties
              </h2>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(spec => (
                  <Badge
                    key={spec}
                    variant={form.specialties.includes(spec) ? 'default' : 'outline'}
                    className="cursor-pointer select-none transition-all hover:scale-105"
                    onClick={() => toggleSpecialty(spec)}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Hospital Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Established Year</label>
                  <Input type="number" value={form.establishedYear} onChange={update('establishedYear')} placeholder="e.g. 1995" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Hospital Type</label>
                  <select value={form.hospitalType} onChange={update('hospitalType')} className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <option>Private</option>
                    <option>Government</option>
                    <option>Trust</option>
                    <option>Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-muted-foreground" /> Bed Availability</label>
                  <Input type="number" value={form.bedAvailability} onChange={update('bedAvailability')} placeholder="Total beds" />
                </div>
                <div className="flex items-center gap-6 pt-6">
                  <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.emergency24x7} onCheckedChange={v => setForm(p => ({ ...p, emergency24x7: v }))} /> 24/7 Emergency</label>
                  <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.ambulanceService} onCheckedChange={v => setForm(p => ({ ...p, ambulanceService: v }))} /> Ambulance</label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Working Hours
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Weekdays</label>
                  <Input value={form.workingHours.weekdays} onChange={e => setForm(p => ({ ...p, workingHours: { ...p.workingHours, weekdays: e.target.value } }))} placeholder="9:00 AM - 6:00 PM" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Saturday</label>
                  <Input value={form.workingHours.saturday} onChange={e => setForm(p => ({ ...p, workingHours: { ...p.workingHours, saturday: e.target.value } }))} placeholder="9:00 AM - 2:00 PM" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Sunday</label>
                  <Input value={form.workingHours.sunday} onChange={e => setForm(p => ({ ...p, workingHours: { ...p.workingHours, sunday: e.target.value } }))} placeholder="Closed" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Images & Logo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Logo URL</label>
                  <Input value={form.logo} onChange={update('logo')} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Cover Image URL</label>
                  <Input value={form.image} onChange={update('image')} placeholder="https://..." />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Accreditations
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.accreditations.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> {a}
                    <button onClick={() => setForm(p => ({ ...p, accreditations: p.accreditations.filter((_, j) => j !== i) }))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addAccreditation}><Plus className="w-3 h-3 mr-1" /> Add Accreditation</Button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Insurance Accepted
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.insuranceAccepted.map((ins, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <Shield className="w-3 h-3" /> {typeof ins === 'string' ? ins : ins.provider}
                    <button onClick={() => setForm(p => ({ ...p, insuranceAccepted: p.insuranceAccepted.filter((_, j) => j !== i) }))}><X className="w-3 h-3 ml-1 hover:text-destructive" /></button>
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addInsurance}><Plus className="w-3 h-3 mr-1" /> Add Insurance</Button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment Modes
              </h2>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_MODES.map(mode => (
                  <Badge key={mode} variant={form.paymentModes.includes(mode) ? 'default' : 'outline'} className="cursor-pointer select-none" onClick={() => togglePaymentMode(mode)}>
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Admin Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <User className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Admin Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.adminName}
                    onChange={update('adminName')}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Mail className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Admin Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={update('adminEmail')}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Phone className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-muted-foreground" />
                    Admin Phone
                  </label>
                  <Input
                    type="tel"
                    value={form.adminPhone}
                    onChange={update('adminPhone')}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              {loading ? 'Submitting Registration...' : 'Register Hospital'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
