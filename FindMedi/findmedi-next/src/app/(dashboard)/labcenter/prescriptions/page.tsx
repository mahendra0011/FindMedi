/**
 * Prescription Verification Queue — thin route wrapper (Todo 5 pattern).
 * UI lives in src/components/labcenter/PrescriptionsHub.tsx.
 */
'use client';

import { PrescriptionsHub } from '@/components/labcenter';

export default function PrescriptionsPage() {
  return <PrescriptionsHub />;
}
