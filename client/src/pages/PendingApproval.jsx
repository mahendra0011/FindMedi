import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Clock, Mail, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApproval() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const status = searchParams.get('status') || 'pending';
  const rejected = status === 'rejected';

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
            ? 'Your doctor account was not approved. Please contact the MediCore administrator for details.'
            : 'Your email is verified. An administrator must approve your doctor profile before dashboard access is enabled.'}
        </p>

        {email && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2">
            <Mail className="w-4 h-4 text-primary" />
            <span className="truncate">{email}</span>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <Button asChild className="gap-2">
            <Link to="/login">
              <Activity className="w-4 h-4" />
              Back to Login
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            You will receive an email notification when the review is complete.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
