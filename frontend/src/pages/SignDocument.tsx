import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import SignaturePad from '@/components/forms/SignaturePad';

/**
 * File 14 §14.5 — document signing: L1 drawn capture (patient/relative/
 * witness, multi-party order enforced server-side) with stepper.
 */
const STEPS = ['Patient / Relative', 'Witness', 'Doctor (step-up)'];

export default function SignDocument() {
  const { kind = 'consent', id = '' } = useParams();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [intent, setIntent] = useState('');
  const [done, setDone] = useState<string[]>([]);

  const signL1 = async (image: string) => {
    void image;
    try {
      const role = step === 0 ? 'patient' : 'witness';
      await (api as any).signL1({
        docKind: kind, docId: id, signerRole: role,
        signerName: name, relation: step === 0 ? relation : '', language: 'en',
      });
      toast.success(`${role} signed`);
      setDone((d) => [...d, role]);
      setStep((s) => Math.min(s + 1, 2));
      setName(''); setRelation('');
    } catch (err: any) { toast.error(err?.message || 'Sign failed'); }
  };

  const signL2 = async () => {
    try {
      await (api as any).signL2({ docKind: kind, docId: id, intent, language: 'en' });
      toast.success('Doctor e-signed (step-up verified)');
      setDone((d) => [...d, 'doctor']);
    } catch (err: any) { toast.error(err?.message || 'Step-up required'); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading font-bold">Sign document</h1>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((done.length) / 3) * 100}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">Step {step + 1} of 3: {STEPS[step]}</p>

      {step < 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            {step === 0 && <Input placeholder="Relation (self/spouse/son/...)" value={relation} onChange={(e) => setRelation(e.target.value)} />}
            <SignaturePad onDone={signL1} />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Doctor e-sign (step-up)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder='Typed intent, e.g. "I certify consent was informed"' value={intent} onChange={(e) => setIntent(e.target.value)} />
            <Button onClick={signL2} disabled={!intent}>E-sign with step-up</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
