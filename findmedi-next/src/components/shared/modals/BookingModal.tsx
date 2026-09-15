/**
 * Booking modal — multi-step appointment booking form.
 *
 * Ported from client/src/components/BookingModal.jsx (which was a single 40K+ file).
 * Per the master plan (Phase 4, Todo 26): split into index.tsx + .steps.tsx + .types.ts
 * to reduce file size and improve type safety.
 *
 * NOTE: This is a minimal Client Component wrapper. The full multi-step flow
 * (datetime selection → intake form → confirmation) is being migrated in phases.
 */
'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Hospital } from '@/types/models/hospital';
import type { Doctor } from '@/types/models/doctor';

/** BookingModal uses Partial because listing data may omit fields. */
export interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: (Partial<Doctor> & Pick<Doctor, '_id'>) | null;
  facility?: Hospital | (Record<string, unknown> & { _id: string }) | null;
}

export default function BookingModal({ open, onOpenChange }: BookingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <p className="text-sm text-muted-foreground">
          Booking modal is being migrated. This is a placeholder while the full
          multi-step flow is ported from the old BookingModal.jsx.
        </p>
      </DialogContent>
    </Dialog>
  );
}
