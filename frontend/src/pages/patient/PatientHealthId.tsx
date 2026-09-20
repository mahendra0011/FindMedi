import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PatientHealthId() {
  const { user } = useAuth();
  const [qrToken, setQrToken] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [shareLevel, setShareLevel] = useState<'full' | 'minimal'>('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me: any = await api.get('/auth/me').catch(() => null);
        const card = me?.user?.healthIdCard || me?.healthIdCard;
        if (card) {
          setIsEnabled(card.isEnabled ?? true);
          setShareLevel(card.shareLevel || 'full');
          if (card.qrToken) setQrToken(card.qrToken);
        }
        if (!card?.qrToken) {
          const res: any = await api.post('/health-id/generate', {}).catch(() => null);
          if (res?.qrToken) setQrToken(res.qrToken);
        }
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSettings = async (enabled: boolean, level: string) => {
    setSaving(true);
    try {
      await api.put('/health-id/settings', { isEnabled: enabled, shareLevel: level });
      setIsEnabled(enabled);
      toast.success(enabled ? 'Health ID enabled - QR card ab active hai' : 'Health ID disabled');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Old QR kaam nahi karega. Purana token invalidate ho jayega. Continue?')) return;
    try {
      const res: any = await api.post('/health-id/generate', { regenerate: true });
      if (res?.qrToken) {
        setQrToken(res.qrToken);
        toast.success('QR regenerated - old QR ab valid nahi rahega');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Regenerate failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/health-id/${qrToken}`;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-16">
      <div className="text-center">
        <h2 className="text-xl font-black">Mera Health ID</h2>
        <p className="text-muted-foreground text-sm">Emergency mein kaam aayega — QR scan karke critical info dekhiye. {user?.name ? `(${user.name})` : ''}</p>
      </div>

      <Card>
        <CardContent className="p-5 text-center space-y-3">
          {qrToken ? (
            <div className="inline-block rounded-2xl border p-3 bg-white">
              <QRCodeSVG value={qrUrl} size={200} bgColor="#ffffff" fgColor="#000000" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">QR generate ho raha hai…</p>
          )}
          <div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(qrUrl);
                  toast.success('QR link copied');
                } catch {}
              }}
            >
              Copy QR link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">QR ko koi bhi scan kare — login zaroori nahi.</p>
          <div className="flex gap-2 justify-center pt-1">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {isEnabled ? 'Active' : 'Disabled'}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${shareLevel === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
              {shareLevel === 'full' ? 'Full' : 'Minimal'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">Share Level</p>
            <div className="flex gap-2">
              <Button size="sm" variant={shareLevel === 'full' ? 'default' : 'outline'} className="rounded-xl flex-1" onClick={() => { setShareLevel('full'); saveSettings(isEnabled, 'full'); }}>
                Full — allergies + conditions + contact
              </Button>
              <Button size="sm" variant={shareLevel === 'minimal' ? 'default' : 'outline'} className="rounded-xl flex-1" onClick={() => { setShareLevel('minimal'); saveSettings(isEnabled, 'minimal'); }}>
                Minimal — blood group + contact
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border p-3">
            <p className="text-sm font-semibold">{isEnabled ? 'Health ID deactivate karein' : 'Health ID enable karein'}</p>
            <Switch
              checked={isEnabled}
              disabled={saving}
              onCheckedChange={(v) => {
                if (!v && !window.confirm('Health ID disable ho jayega, QR kaam nahi karega. Continue?')) return;
                saveSettings(v, shareLevel);
              }}
            />
          </div>
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={handleRegenerate}>
            Regenerate QR Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-bold text-foreground">Kaise use karein:</p>
          <ol className="list-decimal pl-4 space-y-1 text-xs">
            <li>Emergency mein koi bhi (doctor, ambulance, bystander) apne phone se QR scan karein.</li>
            <li>QR scan hone par patient ki critical info dikhegi — koi login/password nahi.</li>
            <li>Agar card disabled hai to 'Card not found or disabled' message aayega.</li>
            <li>Agar QR kho jaye to 'Regenerate QR' se naya token generate karein.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
