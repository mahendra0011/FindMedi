import { useState, useEffect } from 'react';
import {   DollarSign, Save, Plus, X, Stethoscope, Home, CheckCircle, IndianRupee, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function ClinicFees() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [consultationFee, setConsultationFee] = useState('');
  const [homeVisitFee, setHomeVisitFee] = useState('');
  const [emergencyFee, setEmergencyFee] = useState('');
  const [customServices, setCustomServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', fee: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = (await api.getDoctors())?.data || [];
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
           setConsultationFee(myDoc.consultation_fees || myDoc.fees || '');
          setHomeVisitFee(myDoc.home_visit_fee || '');

          setEmergencyFee(myDoc.emergency_fee || '');
          setCustomServices(myDoc.custom_services || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      await api.updateDoctor(doctor._id, {
         consultation_fees: consultationFee,
        home_visit_fee: homeVisitFee,

        emergency_fee: emergencyFee,
        custom_services: customServices,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const addService = () => {
    if (newService.name && newService.fee) {
      setCustomServices(prev => [...prev, { ...newService, _id: `cs_${crypto.randomUUID()}` }]);
      setNewService({ name: '', fee: '' });
    }
  };

  const removeService = (id) => {
    setCustomServices(prev => prev.filter(s => s._id !== id));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
     <div className="space-y-6 max-w-5xl mx-auto">
       {/* Header */}
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
       <div>
         <h1 className="font-heading text-2xl font-bold text-foreground">Fee & Pricing Management</h1>
         <p className="text-muted-foreground">Set your consultation and service fees</p>
         {doctor?.name && (
           <p className="mt-1 text-sm font-medium text-foreground/80">{doctor.name}</p>
         )}
       </div>
         <Button className="gap-2" onClick={handleSave} disabled={saving}>
           <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Fees'}
           {saved && <CheckCircle className="w-4 h-4 text-success" />}
         </Button>
        </div>

        {/* Summary (moved to top, under header) */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
          <h3 className="font-heading font-semibold text-foreground mb-3">Current Pricing Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-card rounded-xl p-4 text-center border border-border/40">
              <p className="text-xl font-bold text-primary">₹{consultationFee || '-'}</p>
              <p className="text-xs text-muted-foreground">Consultation</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/40">
              <p className="text-xl font-bold text-primary">₹{homeVisitFee || '-'}</p>
              <p className="text-xs text-muted-foreground">Home Visit</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/40">
              <p className="text-xl font-bold text-primary">₹{emergencyFee || '-'}</p>
              <p className="text-xs text-muted-foreground">Emergency</p>
            </div>
            <div className="bg-card rounded-xl p-4 text-center border border-border/40">
              <p className="text-xl font-bold text-primary">{customServices.length}</p>
              <p className="text-xs text-muted-foreground">Custom Services</p>
            </div>
          </div>
        </div>

        {/* Standard Fees */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
         <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
           <IndianRupee className="w-5 h-5 text-primary" /> Standard Consultation Fees
         </h2>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <FeeField label="Clinic Consultation" icon={Stethoscope} value={consultationFee} onChange={setConsultationFee} placeholder="500" />
           <FeeField label="Home Visit" icon={Home} value={homeVisitFee} onChange={setHomeVisitFee} placeholder="1000" />
           <FeeField label="Emergency Visit" icon={Stethoscope} value={emergencyFee} onChange={setEmergencyFee} placeholder="800" />
         </div>
       </div>

       {/* Custom Services */}
       <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
         <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
           <Settings className="w-5 h-5 text-primary" /> Custom Services
         </h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <label className="text-sm font-medium text-foreground mb-1.5 block">Service name</label>
             <Input value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} placeholder="e.g. Blood Test" />
           </div>
           <div>
             <label className="text-sm font-medium text-foreground mb-1.5 block">Fee</label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rs</span>
               <Input type="number" value={newService.fee} onChange={e => setNewService({ ...newService, fee: e.target.value })} className="pl-10" placeholder="0" min={0} />
             </div>
           </div>
         </div>
         <div className="flex items-center justify-between pt-3">
           <Button size="sm" className="gap-2" onClick={addService} disabled={!newService.name || !newService.fee}>
             <Plus className="w-4 h-4" /> Add Service
           </Button>
           <p className="text-xs text-muted-foreground">{customServices.length} service{customServices.length !== 1 ? 's' : ''} added</p>
         </div>
         {customServices.length > 0 ? (
           <div className="space-y-2 pt-2">
             {customServices.map(s => (
               <div key={s._id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/30">
                 <div className="flex-1">
                   <p className="font-medium text-foreground">{s.name}</p>
                   <p className="text-sm text-muted-foreground">Service fee</p>
                 </div>
                 <div className="flex items-center gap-4">
                   <p className="text-lg font-semibold text-primary">₹{s.fee}</p>
                   <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeService(s._id)}>
                     <X className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="text-center py-8 border-2 border-dashed border-border/40 rounded-xl">
             <Settings className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
             <p className="text-sm text-muted-foreground">No custom services added yet</p>
           </div>
         )}
        </div>
      </div>
    );
  }

function FeeField({ label, icon: Icon, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" /> {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rs</span>
        <Input type="number" value={value} onChange={e => onChange(e.target.value)} className="pl-10" placeholder={placeholder} min={0} />
      </div>
    </div>
  );
}
