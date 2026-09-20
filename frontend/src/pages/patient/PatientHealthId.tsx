import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { selectCurrentUser } from '@/store/selectors';
import { updateUser } from '@/store/slices/userSlice';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';
import { toast } from 'sonner';
import { QrCode } from 'qrcode.react';
import { useRef } from 'react';

export default function PatientHealthId() {
  const { action } = useParams<{ action: 'view' | 'edit' } >('action') || { action: 'view' };
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useDispatch(selectCurrentUser);
  const [amb, setAmb] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [shareLevel, setShareLevel] = useState<'full' | 'minimal'>('full');
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<{ open: boolean; value: boolean }>({ open: false, value: false });
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user data and health ID card
    const load = async () => {
      try {
        const me: any = await api.get('/ambulance/me');
        setAmb(me.ambulance);
        const u: any = await api.get('/patient/me');
        // Health ID card data from user model
        if (u.user?.healthIdCard) {
          setIsEnabled(u.user.healthIdCard.isEnabled);
          setShareLevel(u.user.healthIdCard.shareLevel || 'full');
          if (u.user.healthIdCard.qrToken) setQrToken(u.user.healthIdCard.qrToken);
        }
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Load failed');
      }
    };
    load();
  }, []);

  const handleEnableToggle = async (online: boolean) => {
    setConfirmOpen({ open: false, value: online });
    try {
      if (online) {
        // Simple enable - no GPS needed for Health ID
        const res: any = await api.put('/patient/health-id/settings', {
          isEnabled: true,
          shareLevel: shareLevel,
        });
        setIsEnabled(res.user?.healthIdCard?.isEnabled ?? true);
        setShareLevel(res.user?.healthIdCard?.shareLevel ?? shareLevel);
        toast.success('Health ID enabled - QR card now active');
      } else {
        const res: any = await api.put('/patient/health-id/settings', {
          isEnabled: false,
        });
        setIsEnabled(res.user?.healthIdCard?.isEnabled ?? false);
        toast.info('Health ID disabled - QR card not visible');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
      setConfirmOpen({ open: true, value: !online });
    }
  };

  const handleRegenerate = async () => {
    setConfirmOpen({ open: true, value: true });
    // Store in state to confirm after dialog
    const conf = window.confirm('Old QR kaam nahi karega. Purana token invalidate ho jayega. Continue karna hai?');
    if (!conf) {
      setConfirmOpen({ open: false, value: true });
      return;
    }
    try {
      const res: any = await api.post('/patient/health-id/generate', { regenerate: true });
      setQrToken(res.qrToken || '');
      toast.success('QR regenerated - old QR ab valid nahi rahega');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Regenerate failed');
    }
    setConfirmOpen({ open: false, value: false });
  };

  const handleShareLevelChange = (e: any) => {
    setShareLevel(e.target.value as 'full' | 'minimal');
  };

  if (!user || !user.healthIdCard) {
    return (
      <Container className="p-8 text-center">
        <h3>Health ID</h3>
        <p className="text-muted-foreground">Health ID setup karna shuru karein.</p>
        <Button onClick={() => navigate('/patient/profile')}>Profile edit karein</Button>
      </Container>
    );
  }

  // Generate initial QR if not exists
  useEffect(() => {
    if (!qrToken) {
      ;(async () => {
        try {
          const res: any = await api.post('/patient/health-id/generate');
          setQrToken(res.qrToken || '');
        } catch {}
      })();
    }
  }, [qrToken]);

  return (
    <Container className="py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="h3 mb-2">Mera Health ID</h2>
        <p className="text-muted-foreground small">Emergency mein kaam aayega — QR scan karke critical info dekhiye.</p>
      </div>

      {/* QR Card section */}
      <Card className="mb-4 shadow-sm">
        <CardBody className="p-4">
          <div className="text-center">
            {/* QR Code */}
            <div className="d-inline-block mb-3">
              {qrToken && (
                <QrCode
                  ref={qrRef}
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/health-id/${qrToken}`}
                  size={200}
                  bgColor="white"
                  fgColor="black"
                />
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const range = document.createRange();
                if (qrRef.current) {
                  range.selectNodeContents(qrRef.current);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('copy');
                  toast.success('QR token copied');
                }
              }}
            >
              Copy token
            </Button>

            <small className="text-muted-foreground d-block mt-2">
              QR ko koi bhi scan kare — login zaroori nahi.
            </small>

            {/* Status badges */}
            <div className="mt-3 pt-3 border-t">
              <span className={`rounded px-2 py-1 text-xs font-medium ${isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {isEnabled ? 'Active' : 'Disabled'}
              </span>
              <span className="ml-2 rounded px-2 py-1 text-xs font-medium ${shareLevel === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                {shareLevel === 'full' ? 'Full' : 'Minimal'}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Patient info & controls */}
      <Card>
        <CardBody>
          {/* Share Level selector */}
          <div className="mb-3">
            <label className="form-label small text-muted-foreground">Share Level</label>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="shareLevel"
                checked={shareLevel === 'full'}
                onChange={handleShareLevelChange}
                value="full"
              />
              <label className="form-check-label">Full — allergies + conditions + contact</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="shareLevel"
                checked={shareLevel === 'minimal'}
                onChange={handleShareLevelChange}
                value="minimal"
              />
              <label className="form-check-label">Minimal — sirf blood group + contact</label>
            </div>
          </div>

          {/* Enable/Disable toggle */}
          <EmergencyToggleConfirm
            open={confirmOpen.open}
            turningOn={confirmOpen.value}
            onConfirm={() => handleEnableToggle(confirmOpen.value)}
            onCancel={() => setConfirmOpen({ open: false, value: false })}
          >
            <div className="d-flex align-items-center justify-content-between small text-muted-foreground">
              <span>{isEnabled ? 'Health ID deactivate karein' : 'Health ID enable karein'}</span>
              <i className="bi bi-info-circle cursor-help" title="Confirm before changing"></i>
            </div>
          </EmergencyToggleConfirm>

          {/* Regenerate QR */}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-100"
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Regenerate QR Code'}
          </Button>

          {generating && <small className="text-muted-foreground small d-block mt-1">Processing…</small>}
        </CardBody>
      </Card>

      {/* Quick scan info */}
      <Card className="mt-4">
        <CardBody className="small text-muted-foreground">
          <h5 className="h6 mb-3">Kaise use karein:</h5>
          <ol className="list-decimal list-inside mb-0">
            <li>
              Emergency mein koi bhi (doctor, ambulance, bystander) apne phone se
              Health ID QR code scan karein.
            </li>
            <li>
              QR scan hone par patient ki critical info dikhegi — koi login/password nahi.
            </li>
            <li>
              Agar card disabled hai to 'Card not found or disabled' message aayega.
            </li>
            <li>
              Agar QR kho jaye to 'Regenerate QR' se naya token generate karein.
            </li>
          </ol>
        </CardBody>
      </Card>
    </Container>
  );
}