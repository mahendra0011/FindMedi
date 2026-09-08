/**
 * Verify OTP page — Client Component.
 * Ported from client/src/pages/OTPVerification.jsx.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/enums';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOTP, login } = useAuth();
  const email = searchParams.get('email') ?? '';
  const role = (searchParams.get('role') ?? 'patient') as UserRole;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) {
      router.replace('/login');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const user = await verifyOTP({ email, otp });
      void user;
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Verify Your OTP</h2>
      <p className="text-sm text-muted-foreground mb-6">
        We've sent a 6-digit code to {email}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full px-4 py-2 text-center text-xl tracking-widest border rounded-md"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </Button>
      </form>
    </div>
  );
}
