import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Hospital, MapPin, Phone, ShieldCheck, Check, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface NearbyHospital {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  distanceKm?: number;
  emergencySupport?: boolean;
}

interface ProviderHospitalSelectProps {
  requestId: string;
  onHospitalSelected: (hospital: NearbyHospital) => void;
  onDismiss: () => void;
}

export default function ProviderHospitalSelect({
  requestId,
  onHospitalSelected,
  onDismiss,
}: ProviderHospitalSelectProps) {
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchNearbyHospitals() {
      try {
        setLoading(true);
        const res = await api.get(`/emergency-sos/${requestId}/nearby-hospitals`);
        const list: NearbyHospital[] = res?.hospitals || res?.data || [];
        if (isMounted) {
          setHospitals(list);
          if (list.length > 0) {
            setSelectedId(list[0]._id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load nearby hospitals:', err);
        toast.error('Could not load nearby hospitals.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (requestId) {
      fetchNearbyHospitals();
    }

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const handleConfirm = async () => {
    if (!selectedId) {
      toast.warning('Please select a destination hospital.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/emergency-sos/${requestId}/select-hospital`, {
        hospitalId: selectedId,
      });

      const selectedHospital = hospitals.find(h => h._id === selectedId);
      toast.success(`Destination set: ${selectedHospital?.name || 'Hospital'}`);
      if (selectedHospital) {
        onHospitalSelected(selectedHospital);
      } else {
        onDismiss();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to designate destination hospital.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Hospital className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Select Destination Hospital
              </h3>
              <p className="text-xs text-slate-400">
                Choose the nearest emergency facility for patient handover
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hospital List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Locating nearby hospitals...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No registered hospitals found within 35 km of pickup location.
            </div>
          ) : (
            hospitals.map((hosp) => {
              const isSelected = selectedId === hosp._id;
              return (
                <div
                  key={hosp._id}
                  onClick={() => setSelectedId(hosp._id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white truncate">
                        {hosp.name}
                      </p>
                      {hosp.emergencySupport && (
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-1.5 py-0">
                          24/7 ER
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      {hosp.address || hosp.city || 'Address available on arrival'}
                    </p>

                    {hosp.phone && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {hosp.phone}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    <span className="font-bold text-xs text-emerald-400 font-mono">
                      {hosp.distanceKm != null ? `${hosp.distanceKm} km` : '~2.0 km'}
                    </span>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                          : 'border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-white"
          >
            Decide En Route
          </Button>

          <Button
            type="button"
            disabled={submitting || !selectedId}
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 rounded-xl shadow-lg shadow-emerald-950/50"
          >
            {submitting ? 'Confirming...' : 'Set Destination Hospital'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
