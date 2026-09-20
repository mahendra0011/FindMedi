import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, AlertOctagon, X, Navigation } from 'lucide-react';
import SOSReporterModeSelect from './SOSReporterModeSelect';
import SOSSelfSummary from './SOSSelfSummary';
import SOSOtherForm from './SOSOtherForm';
import SOSCategoryPicker from './SOSCategoryPicker';
import HoldToConfirmButton from './HoldToConfirmButton';
import { toast } from 'sonner';

interface SOSConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSOS: (payload: any) => Promise<void>;
  currentUser: any;
}

export default function SOSConfirmModal({
  open,
  onOpenChange,
  onSubmitSOS,
  currentUser,
}: SOSConfirmModalProps) {
  const [step, setStep] = useState<'confirm_start' | 'details'>('confirm_start');
  const [reporterMode, setReporterMode] = useState<'self' | 'other'>('self');
  const [category, setCategory] = useState<string>('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [address, setAddress] = useState<string>('Detecting your GPS location...');
  const [locating, setLocating] = useState<boolean>(true);
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);

  const [otherFormData, setOtherFormData] = useState({
    victimName: '',
    victimAge: '',
    victimGender: '',
    victimCondition: '',
    shareOwnDetails: false,
  });

  // Detect GPS location on modal open
  useEffect(() => {
    if (!open) {
      setStep('confirm_start');
      return;
    }

    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          setCurrentCoords({ lat, lng, accuracy });
          setAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Current Location)`);
          setLocating(false);
        },
        (err) => {
          console.warn('GPS error:', err);
          // Default Jabalpur center fallback
          setCurrentCoords({ lat: 23.1815, lng: 79.9864 });
          setAddress('Jabalpur City Center (Fallback Location)');
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setCurrentCoords({ lat: 23.1815, lng: 79.9864 });
      setAddress('Jabalpur City Center');
      setLocating(false);
    }
  }, [open]);

  const handleFinalSOS = async () => {
    if (!currentCoords) {
      toast.error('Detecting location. Please wait a second.');
      return;
    }

    setLoadingSubmit(true);
    try {
      const payload: any = {
        reporterMode,
        category,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        accuracy: currentCoords.accuracy,
        address,
      };

      if (reporterMode === 'self') {
        payload.patientDetails = {
          name: currentUser?.name || '',
          phone: currentUser?.phone || '',
          gender: (currentUser?.gender || '').toLowerCase(),
          bloodGroup: currentUser?.bloodGroup || currentUser?.medicalProfile?.bloodGroup || '',
          knownAllergies: currentUser?.medicalProfile?.allergies || '',
          knownConditions: currentUser?.medicalProfile?.conditions || '',
        };
      } else {
        payload.patientDetails = {
          name: otherFormData.victimName,
          age: otherFormData.victimAge ? Number(otherFormData.victimAge) : null,
          gender: otherFormData.victimGender || '',
          knownConditions: otherFormData.victimCondition,
        };
        payload.reporterOwnDetailsShared = otherFormData.shareOwnDetails;
        if (otherFormData.shareOwnDetails) {
          payload.reporterDetails = {
            name: currentUser?.name || '',
            phone: currentUser?.phone || '',
          };
        }
      }

      await onSubmitSOS(payload);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch SOS request');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] rounded-3xl p-0 overflow-hidden border-2 border-red-500/30 shadow-2xl bg-card">
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white m-0">
                EMERGENCY SOS DISPATCH
              </DialogTitle>
              <DialogDescription className="text-xs text-red-100 mt-0.5">
                Immediate ambulance & hospital response network
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Confirmation & Hold to Start */}
          {step === 'confirm_start' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 mx-auto flex items-center justify-center border border-red-500/20 shadow-inner">
                <AlertOctagon className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-foreground">
                  Send Emergency SOS Request?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Hold the button below for <strong>1 second</strong> to confirm. This alerts nearby verified ambulances and hospitals with top priority.
                </p>
              </div>

              {/* GPS Live Pill */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit mx-auto font-medium">
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span className="truncate max-w-[260px]">{address}</span>
              </div>

              <div className="pt-3 space-y-2">
                <HoldToConfirmButton
                  onConfirm={() => setStep('details')}
                  label="Hold to Confirm Emergency"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Self / Other + Category Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block">
                  Who is the Emergency For?
                </label>
                <SOSReporterModeSelect
                  selected={reporterMode}
                  onSelect={(mode) => setReporterMode(mode)}
                />
              </div>

              {/* Details Sub-Section */}
              {reporterMode === 'self' ? (
                <SOSSelfSummary user={currentUser} />
              ) : (
                <SOSOtherForm
                  formData={otherFormData}
                  onChange={(field, value) =>
                    setOtherFormData((prev) => ({ ...prev, [field]: value }))
                  }
                  currentUser={currentUser}
                />
              )}

              {/* Optional Category */}
              <SOSCategoryPicker selected={category} onSelect={setCategory} />

              {/* Final SOS Submit */}
              <div className="pt-3 border-t border-border/60 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('confirm_start')}
                  className="rounded-xl text-xs h-11"
                  disabled={loadingSubmit}
                >
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalSOS}
                  disabled={loadingSubmit || !currentCoords}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 gap-2"
                >
                  {loadingSubmit ? 'Dispatching...' : '🚨 Send SOS Request Now'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
