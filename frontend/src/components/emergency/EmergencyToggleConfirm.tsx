import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function EmergencyToggleConfirm({ open, turningOn, onConfirm, onCancel }: {
  open: boolean; turningOn: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {turningOn ? 'Emergency Support ON karna hai?' : 'Emergency Support OFF karna hai?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {turningOn
              ? 'Ab aapko paas ki emergency requests full-screen call ki tarah aayengi. Sirf tabhi ON karein jab aap turant response de sakein.'
              : 'Aapko emergency requests aana band ho jayengi.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Nahi, wapas</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Haan, {turningOn ? 'ON karo' : 'OFF karo'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
