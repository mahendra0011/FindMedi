import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

/**
 * 2.md 9 — staff invitation redemption (`/#/provider-staff-setup?code=...`).
 *
 * The CODE is the entire credential: single-use, 48h, opaque. Email and role
 * live on the invite row server-side, so this page never asks which listing or
 * which role — it only collects the password for the account being created
 * (or joins the invite to an existing account when the mailbox is already
 * registered).
 */

interface SetupResult {
  message?: string;
  accountExists?: boolean;
  role?: string;
  requiresTwoFactor?: boolean;
}

export default function ProviderStaffSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<SetupResult | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code) {
      setError('Invalid or missing invitation link. Ask the provider owner to send a new one.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = (await api.post('/auth/provider-staff-setup', {
        code,
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
      })) as unknown as SetupResult;
      setDone(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This invitation link is invalid, already used, or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Join the Listing Team</h1>
          <p className="text-muted-foreground mt-1">Set your password to access this provider's console</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                {done.accountExists ? 'You are on the team' : 'Account created'}
              </h2>
              <p className="text-muted-foreground text-sm mb-2">{done.message}</p>
              {done.role && (
                <p className="text-xs text-muted-foreground mb-1">
                  Role: <span className="font-medium text-foreground">{done.role}</span>
                </p>
              )}
              {done.requiresTwoFactor && (
                <p className="text-xs text-amber-600 inline-flex items-center gap-1 justify-center mb-4">
                  <AlertCircle className="w-3.5 h-3.5" /> This role requires two-factor authentication at login.
                </p>
              )}
              <Button className="w-full gap-2 mt-2" size="lg" onClick={() => navigate('/login')}>
                Go to Login <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Your name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name shown to your team (optional)"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Create Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              {!code && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  This page needs the invitation link you were emailed. Ask the provider owner for a new invitation.
                </p>
              )}
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                {loading ? 'Setting up...' : 'Set Password & Join'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
