import React from 'react';
import { ArrowLeft, Car, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AmbulanceVehicleTabProps {
  amb: any;
  setTab: (tab: string) => void;
}

export const AmbulanceVehicleTab: React.FC<AmbulanceVehicleTabProps> = ({ amb, setTab }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTab('overview')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Button>
        <h3 className="font-bold text-base text-foreground">
          Ambulance Specs & Medical Inventory
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/ambulance-setup')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5 ml-auto"
        >
          Full Vehicle Setup
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Car className="w-4 h-4 text-destructive" /> Vehicle Specifications
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Registration Number</p>
              <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                {amb?.registrationNumber}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ambulance Classification</p>
              <p className="font-bold text-foreground text-sm mt-0.5">
                {amb?.ambulanceType || 'BLS'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Model & Make</p>
              <p className="font-bold text-foreground text-sm mt-0.5">
                {amb?.vehicleModel || 'Force Traveller Ambulance'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Base Hospital</p>
              <p className="font-bold text-foreground text-sm mt-0.5">
                {amb?.hospitalId?.name || 'Central Hospital'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-destructive" /> On-Board Life Support Equipment
          </h3>
          <div className="flex flex-wrap gap-2">
            {(
              amb?.equipmentLevel ||
              'Oxygen Cylinder, Collapsible Stretcher, First Aid Kit, Suction Machine, IV Fluids'
            )
              .split(',')
              .map((e: string) => e.trim())
              .filter(Boolean)
              .map((eq: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20"
                >
                  ✓ {eq}
                </span>
              ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
            Equipment compliance is inspected and approved by the linked hospital administration.
          </p>
        </div>
      </div>
    </div>
  );
};
