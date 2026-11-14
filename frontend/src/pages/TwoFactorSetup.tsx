import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Unmodelled } from '@/lib/apiTypes';

export default function TwoFactorSetup() {
  const { user, loading, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<Unmodelled>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const startSetup = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.setup2FA();
      setSetup(res);
    } catch (err: Unmodelled) {
      setError(err?.message || 'Could not start 2FA setup');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get2FAStatus();
        if (!mounted) return;
        setEnabled(Boolean(res?.enabled));
        if (!res?.enabled) {
          const next = await api.setup2FA();
          if (mounted) setSetup(next);
        }
      } catch (err: Unmodelled) {
        if (mounted) setError(err?.message || 'Could not check 2FA status');
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.verify2FA({ token: code });
      setBackupCodes(Array.isArray(res?.backupCodes) ? res.backupCodes : []);
      updateUser({ ...user, twoFactorEnabled: true, requiresTwoFactorEnrollment: false });
      toast.success('Two-factor authentication enabled');
    } catch (err: Unmodelled) {
      setError(err?.message || 'Invalid code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      toast.success('Secret copied');
    } catch {
      toast.error('Could not copy secret');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>Set up two-factor authentication</CardTitle>
          {user.requiresTwoFactorEnrollment && (
            <p className="text-sm text-muted-foreground mt-2">
              Your role requires 2FA before you can use the dashboard.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {backupCodes.length > 0 ? (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="font-medium text-sm mb-2">Save these backup codes now</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Each code can be used once if you lose access to your authenticator. They will not be shown again.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((c) => <span key={c} className="bg-background rounded px-2 py-1 border">{c}</span>)}
                </div>
              </div>
              <Button className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                I&apos;ve saved my backup codes
              </Button>
            </>
          ) : enabled ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Two-factor authentication is already enabled on this account.
              </p>
              <Button className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                Continue to dashboard
              </Button>
            </>
          ) : setup ? (
            <>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl border">
                  <QRCodeSVG value={setup.otpAuthUrl} size={168} level="M" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with Google Authenticator, Authy, or any TOTP app.
              </p>
              <div className="space-y-2">
                <Label htmlFor="totp-secret">Or enter this secret manually</Label>
                <div className="flex gap-2">
                  <Input id="totp-secret" readOnly value={setup.secret || ''} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copySecret} aria-label="Copy secret">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <form onSubmit={verify} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="totp-code">6-digit code</Label>
                  <Input
                    id="totp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center tracking-[0.4em] text-lg"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Verifying…' : 'Verify and enable 2FA'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive">{error || '2FA setup could not be started.'}</p>
              <Button className="w-full" onClick={startSetup} disabled={busy}>
                {busy ? 'Starting…' : 'Retry setup'}
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
