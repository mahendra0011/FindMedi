/**
 * Auth layout — wraps all auth pages (login, signup, OTP, forgot-password).
 * Provides a centered card layout with a subtle background.
 *
 * The login page renders its own full-page design; simpler pages
 * (forgot-password, verify-otp) use this layout's centered card.
 */
'use client';

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {children}
    </div>
  );
}
