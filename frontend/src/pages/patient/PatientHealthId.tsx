import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';

export default function PatientHealthId() {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [shareLevel, setShareLevel] = useState<'full' | 'minimal'>('full');
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState<{ open: boolean; value: boolean }>({ open: false, value: false });
  const qrRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const me: any = await api.get('/patient/me');
      if (me.user?.healthIdCard) {
        setIsEnabled(me.user.healthIdCard.isEnabled);
        setShareLevel(me.user.healthIdCard.shareLevel || 'full');
        if (me.user.healthIdCard.qrToken) setQrToken(me.user.healthIdCard.qrToken);
      }
      if (!me.user?.healthIdCard?.qrToken) {
        const res: any = await api.post('/patient/health-id/generate', {});
        setQrToken(res.qrToken || '');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEnableToggle = async () => {
    const turningOn = confirmOpen.value;
    setConfirmOpen({ open: false, value: turningOn });
    try {
      const res: any = await api.put('/patient/health-id/settings', { isEnabled: turningOn, shareLevel });
      setIsEnabled(res.user?.healthIdCard?.isEnabled ?? turningOn);
      toast.success(turningOn ? 'Health ID enabled' : 'Health ID disabled');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleShareLevelSave = async (level: 'full' | 'minimal') => {
    setShareLevel(level);
    try {
      await api.put('/patient/health-id/settings', { isEnabled, shareLevel: level });
      toast.success('Share level updated');
    } catch (e: any) {
      toast.error('Update failed');
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Purana QR kaam nahi karega. Continue karna hai?')) return;
    try {
      const res: any = await api.post('/patient/health-id/generate', { regenerate: true });
      setQrToken(res.qrToken || '');
      toast.success('QR regenerated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Regenerate failed');
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-16">
      <div className="text-center">
        <h2 className="text-xl font-black">Mera Health ID</h2>
        <p className="text-sm text-muted-foreground">Emergency mein kaam aayega — QR scan karke critical info dekhiye.</p>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          {qrToken && (
            <div ref={qrRef} className="inline-block">
              <QRCodeSVG
                value={`${window.location.origin}/health-id/${qrToken}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">QR ko koi bhi scan kare — login zaroori nahi.</p>

          <div className="mt-3 flex justify-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {isEnabled ? 'Active' : 'Disabled'}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${shareLevel === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
              {shareLevel === 'full' ? 'Full' : 'Minimal'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Share Level</label>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" checked={shareLevel === 'full'} onChange={() => handleShareLevelSave('full')} />
                Full (allergies + conditions + contact)
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" checked={shareLevel === 'minimal'} onChange={() => handleShareLevelSave('minimal')} />
                Minimal (sirf blood group + contact)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>{isEnabled ? 'Health ID deactivate karein' : 'Health ID enable karein'}</span>
            <Button
              size="sm"
              variant={isEnabled ? 'outline' : 'default'}
              onClick={() => setConfirmOpen({ open: true, value: !isEnabled })}
            >
              {isEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={handleRegenerate}>
            Regenerate QR Code
          </Button>
        </CardContent>
      </Card>

      <EmergencyToggleConfirm
        open={confirmOpen.open}
        turningOn={confirmOpen.value}
        onConfirm={handleEnableToggle}
        onCancel={() => setConfirmOpen({ open: false, value: false })}
      />
    </div>
  );
}
