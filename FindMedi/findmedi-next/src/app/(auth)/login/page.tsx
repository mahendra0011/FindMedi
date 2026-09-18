/**
 * Login page — Client Component.
 *
 * Users select a role, then enter credentials. On success, tokens are stored
 * via the Axios client and auth state is set in Redux.
 *
 * Ported from client/src/pages/Login.jsx (React Router → Next.js Navigation,
 * framer-motion → motion, AuthContext → useAuth hook).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Shield, Stethoscope, UserRound, Microscope, Pill, Truck, Heart, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

import type { LoginCredentials } from '@/types/models/user';
import type { UserRole } from '@/types/enums';

interface RoleOption {
  key: UserRole;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const ROLES: RoleOption[] = [
  { key: 'superadmin', label: 'SuperAdmin', desc: 'Manage full platform', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  { key: 'hospital_admin', label: 'Hospital Admin', desc: 'Manage hospital', icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'doctor', label: 'Hosp Doctor', desc: 'Patient & schedule', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10' },
  { key: 'clinic_doctor', label: 'Clinic', desc: 'Clinic management', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  { key: 'lab_owner', label: 'Diagnostic', desc: 'Lab test mgmt', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  { key: 'pharmacy_owner', label: 'Pharmacy', desc: 'Medicine store', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  { key: 'delivery_boy', label: 'Delivery', desc: 'Medicine delivery', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { key: 'patient', label: 'Patient', desc: 'Appointments & records', icon: UserRound, color: 'text-success', bg: 'bg-success/10' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<UserRole>('hospital_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectRole = (r: UserRole) => {
    setRole(r);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const credentials: LoginCredentials = { email, password, role };
      const user = await login(credentials);
      router.push('/dashboard');
      void user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <div className="bg-background rounded-xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Role selection panel */}
            <div className="p-6 bg-muted/30 overflow-y-auto max-h-[600px]">
              <h2 className="text-lg font-semibold mb-4">Select Your Role</h2>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <motion.button
                    key={r.key}
                    type="button"
                    onClick={() => selectRole(r.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      role === r.key
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`p-2 rounded-lg ${r.bg}`}>
                      <r.icon className={`h-5 w-5 ${r.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Login form */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  {ROLES.find((r) => r.key === role)?.icon && (() => {
                    const Icon = ROLES.find((r) => r.key === role)!.icon;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <h1 className="text-2xl font-bold">{ROLES.find((r) => r.key === role)?.label}</h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-4 flex justify-between text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
                <Link href="/signup" className="text-primary hover:underline">
                  Don&apos;t have an account?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
