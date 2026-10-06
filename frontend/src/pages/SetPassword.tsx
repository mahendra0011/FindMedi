import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * AUTH-F-06: forced rotation for temp-password accounts.
 *
 * The backend locks a `mustResetPassword` session to four endpoints
 * (change-password / logout / logout-all / me) and answers everything else
 * with 403 `code: PASSWORD_RESET_REQUIRED`, which the axios interceptor uses
 * to land here. This page is the only way out: PUT /auth/change-password with
 * the temporary password clears the flag and revokes every other session.
 */
export default function SetPassword() {
  const navigate = useNavigate();
  const { user, loading, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Mirrors backend passwordSchema: >=12, <=128, upper, lower, digit, special.
  const rules = [
    { ok: password.length >= 12, text: 'At least 12 characters' },
    { ok: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { ok: /[a-z]/.test(password), text: 'One lowercase letter' },
    { ok: /[0-9]/.test(password), text: 'One number' },
    { ok: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
    { ok: password === confirmPassword && confirmPassword.length > 0, text: 'Passwords match' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('Enter your temporary password');
      return;
    }
    if (!rules.every((r) => r.ok)) {
      setError('Password does not meet all requirements');
      return;
    }
    setLoadingSubmit(true);
    try {
      await api.changePassword({ currentPassword, newPassword: password });
      if (user) updateUser({ ...user, mustResetPassword: false });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to update password');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loading) return <div className="min-h-screen" role="status" aria-label="Checking session" />;
  // Without a session the change-password call could never succeed (and the
  // server would 401 anyway); send them to the door that opens one.
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
            <img src="/logo.png" alt="FindMedi Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">FindMedi</h1>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Set a New Password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your account was set up with a temporary password. Choose a real one to continue — until
            then only password reset, logout and your profile are available.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Temporary Password</label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password you logged in with"
                  required
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                required
                autoComplete="new-password"
              />
            </div>

            <ul className="grid grid-cols-2 gap-1">
              {rules.map((r) => (
                <li
                  key={r.text}
                  className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-success' : 'text-muted-foreground'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${r.ok ? 'bg-success' : 'bg-border'}`} />
                  {r.text}
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loadingSubmit}>
              {loadingSubmit ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Set Password & Continue
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Trouble? Use{' '}
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary font-medium hover:underline"
            >
              forgot password
            </button>{' '}
            or{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">
              sign in with another account
            </button>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}
