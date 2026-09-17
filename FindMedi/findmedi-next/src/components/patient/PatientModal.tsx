'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface PatientModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

/** Generic centered modal shell used by patient dashboard dialogs. */
export function PatientModal({ title, children, onClose }: PatientModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold">{title}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
