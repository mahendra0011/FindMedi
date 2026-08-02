import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Clock, Mail, ShieldAlert, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function PendingApproval() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || 'account';
  const status = searchParams.get('status') || 'pending';
  const rejected = status === 'rejected';
  const [checking, setChecking] = useState(false);

  const roleLabel = { doctor: 'doctor', technician: 'technician', admin: 'hospital admin', clinic_doctor: 'clinic', lab_owner: 'lab owner', pharmacy_owner: 'pharmacy owner' }[role] || role;

  useEffect(() => {
    if (rejected) return;
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const user = await api.me();
        if (user?.approvalStatus === 'approved' || user?.doctorApproved) {
          window.location.href = '/dashboard';
        }
      } catch (e) { console.error('Polling check failed:', e);
      } finally {
        setChecking(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [rejected]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-8 shadow-xl text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          {rejected ? <ShieldAlert className="w-7 h-7 text-destructive" /> : <Clock className="w-7 h-7 text-primary" />}
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          {rejected ? 'Approval Not Granted' : 'Pending Admin Approval'}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {rejected
            ? `Your ${roleLabel} account was not approved. Please contact the FindMedi administrator for details.`
            : `Your email is verified. An administrator must approve your ${roleLabel} profile before dashboard access is enabled.`}
        </p>

        {email && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2">
            <Mail className="w-4 h-4 text-primary" />
            <span className="truncate">{email}</span>
          </div>
        )}

        <a href={`mailto:support@findmedi.com?subject=Approval%20Query%20-%20${roleLabel}&body=Account%20email%3A%20${encodeURIComponent(email)}%0A%0ARole%3A%20${roleLabel}%0AStatus%3A%20${status}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
          <ExternalLink className="w-4 h-4" /> Contact Administrator
        </a>

        <div className="mt-7 flex flex-col gap-3">
          <Button asChild className="gap-2">
            <Link to="/login">
              <Activity className="w-4 h-4" />
              Back to Login
            </Link>
          </Button>
          {!rejected && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Auto-checks every 30s
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
