/**
 * Root layout — wraps every route.
 *
 * Responsibilities:
 *   - Font optimization (Plus Jakarta Sans + Inter via next/font)
 *   - Global CSS import (Tailwind globals.css with theme variables)
 *   - Wraps children in <Providers> (Redux, TanStack Query, auth/settings init)
 *
 * Per Next.js App Router conventions, route-group layouts (public, auth, dashboard)
 * live in their own subdirectories and inherit from this root layout.
 */
import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Providers from '@/app/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: {
    default: 'FindMedi — Find doctors, hospitals & diagnostic centers near you',
    template: `%s | FindMedi`,
  },
  description:
    'FindMedi is India\'s trusted healthcare platform to book appointments, order medicines, book diagnostic tests, and connect with doctors online or offline.',
  keywords:
    'doctor appointment, online consultation, medicine delivery, diagnostic tests, hospital, clinic, lab, pharmacy, health records',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
