import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface BciDisclaimerModalProps {
  onAccept?: () => void;
}

/**
 * BciDisclaimerModal Component (LAW-MISSING-02)
 * Statutory Bar Council of India (BCI) Rule 36 compliance modal.
 * Users must acknowledge that they are seeking legal consultation of their own accord
 * and that listings do not constitute advertisement or solicitation of legal services.
 */
export const BciDisclaimerModal: React.FC<BciDisclaimerModalProps> = ({ onAccept }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('findmedi_bci_disclaimer_accepted');
      if (!accepted) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleAgree = () => {
    try {
      localStorage.setItem('findmedi_bci_disclaimer_accepted', 'true');
    } catch {
      // ignore storage error
    }
    setOpen(false);
    if (onAccept) onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md sm:max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 mb-2">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Bar Council of India Statutory Disclaimer
          </DialogTitle>
          <DialogDescription className="text-justify text-xs text-muted-foreground space-y-2 pt-2 leading-relaxed">
            <p>
              As per the rules of the <strong>Bar Council of India (BCI Rule 36)</strong>, advocates and legal practitioners
              are not permitted to solicit work or advertise in any manner.
            </p>
            <p>
              By clicking <strong>&quot;I Acknowledge &amp; Proceed&quot;</strong>, you confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are seeking legal information and consultation solely of your own volition.</li>
              <li>There has been no advertisement, personal communication, solicitation, or inducement of any sort from any advocate listed on FindMedi.</li>
              <li>The information provided on this platform is for informational purposes and does not create an advocate-client relationship.</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 sm:justify-center">
          <Button onClick={handleAgree} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>I Acknowledge &amp; Proceed</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BciDisclaimerModal;
