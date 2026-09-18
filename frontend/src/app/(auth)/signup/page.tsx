/**
 * Signup page — Client Component.
 * Ported from client/src/pages/Signup.jsx.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Shield, Stethoscope, UserRound, Microscope, Pill, Truck, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import type { RegisterPayload } from '@/types/models/user';
import type { UserRole } from '@/types/enums';

const ROLES: { key: UserRole; label: string; icon: React.ElementType }[] = [
  { key: 'patient', label: 'Patient', icon: UserRound },
  { key: 'doctor', label: 'Doctor', icon: Stethoscope },
  { key: 'hospital_admin', label: 'Hospital Admin', icon: Shield },
  { key: 'clinic_doctor', label: 'Clinic Doctor', icon: Heart },
  { key: 'lab_owner', label: 'Lab Owner', icon: Microscope },
  { key: 'pharmacy_owner', label: 'Pharmacy Owner', icon: Pill },
  { key: 'delivery_boy', label: 'Delivery Partner', icon: Truck },
];

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true);
    setError('');
    try {
      const payload: RegisterPayload = { name, email, phone, password, role };
      const result = await register(payload);
      if (result.requiresVerification) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&role=${role}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-background rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Create Your Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join FindMedi as a {ROLES.find((r) => r.key === role)?.label}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>

            <Input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
