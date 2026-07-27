import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STEPS = ['Personal', 'Vehicle', 'KYC', 'Preferences', 'Review'];

export default function DeliveryPartnerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', dob: '', gender: '', photo: null,
    address: '', city: '', pincode: '',
    vehicleType: 'bike', vehicleNumber: '', drivingLicenseDoc: null, vehicleRcDoc: null,
    aadharDoc: null, panDoc: null,
    bankDetails: { accountNo: '', ifsc: '', holderName: '', upiId: '' },
    workZone: [], availability: 'flexible',
    emergencyContact: { name: '', phone: '' },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setNested = (parent, k, v) => setForm((f) => ({ ...f, [parent]: { ...f[parent], [k]: v } }));

  const submit = async () => {
    try {
      const { photo, drivingLicenseDoc, vehicleRcDoc, aadharDoc, panDoc, ...textFields } = form;
      await api.post('/delivery-partners/register', textFields);
      const hasFiles = photo || drivingLicenseDoc || vehicleRcDoc || aadharDoc || panDoc;
      if (hasFiles) {
        toast.success('Submitted! Upload your documents to complete verification.');
        navigate('/delivery/documents');
      } else {
        toast.success('Submitted for verification');
        navigate('/delivery/documents');
      }
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <Input placeholder="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input placeholder="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
          <Input placeholder="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <Input placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input placeholder="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
          <input type="file" accept="image/*" onChange={(e) => set('photo', e.target.files[0])} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <select value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)}
            className="w-full h-10 border rounded-lg px-3">
            <option value="bike">Bike</option>
            <option value="scooter">Scooter</option>
            <option value="bicycle">Bicycle</option>
            <option value="foot">On-foot</option>
          </select>
          {form.vehicleType !== 'bicycle' && form.vehicleType !== 'foot' && (
            <>
              <Input placeholder="Vehicle Number" value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} />
              <label className="text-xs text-muted-foreground">Driving License</label>
              <input type="file" onChange={(e) => set('drivingLicenseDoc', e.target.files[0])} />
              <label className="text-xs text-muted-foreground">Vehicle RC</label>
              <input type="file" onChange={(e) => set('vehicleRcDoc', e.target.files[0])} />
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="text-xs text-muted-foreground">Aadhar Card</label>
          <input type="file" onChange={(e) => set('aadharDoc', e.target.files[0])} />
          <label className="text-xs text-muted-foreground">PAN Card</label>
          <input type="file" onChange={(e) => set('panDoc', e.target.files[0])} />
          <Input placeholder="Bank Account Number" value={form.bankDetails.accountNo}
            onChange={(e) => setNested('bankDetails', 'accountNo', e.target.value)} />
          <Input placeholder="IFSC Code" value={form.bankDetails.ifsc}
            onChange={(e) => setNested('bankDetails', 'ifsc', e.target.value)} />
          <Input placeholder="Account Holder Name" value={form.bankDetails.holderName}
            onChange={(e) => setNested('bankDetails', 'holderName', e.target.value)} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <Input placeholder="Work Zone / Pincode (comma separated)"
            onChange={(e) => set('workZone', e.target.value.split(',').map((s) => s.trim()))} />
          <select value={form.availability} onChange={(e) => set('availability', e.target.value)}
            className="w-full h-10 border rounded-lg px-3">
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="flexible">Flexible</option>
          </select>
          <Input placeholder="Emergency Contact Name"
            onChange={(e) => setNested('emergencyContact', 'name', e.target.value)} />
          <Input placeholder="Emergency Contact Phone"
            onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2 text-sm">
          <p><strong>Name:</strong> {form.name}</p>
          <p><strong>Vehicle:</strong> {form.vehicleType} {form.vehicleNumber}</p>
          <p><strong>Work Zone:</strong> {form.workZone.join(', ')}</p>
          <p className="text-muted-foreground">Submitting sends your documents for verification. You'll be notified once approved.</p>
        </div>
      )}

      <div className="flex justify-between mt-6">
        {step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
        {step < STEPS.length - 1
          ? <Button className="ml-auto" onClick={() => setStep((s) => s + 1)}>Next</Button>
          : <Button className="ml-auto" onClick={submit}>Submit for Verification</Button>}
      </div>
    </div>
  );
}
