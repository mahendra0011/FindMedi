/**
 * My Profile — thin route wrapper (Todo 5 pattern).
 * UI lives in src/components/doctor/DoctorProfileHub.tsx.
 */
'use client';

import { DoctorProfileHub } from '@/components/doctor';

export default function ProfilePage() {
  return <DoctorProfileHub />;
}
