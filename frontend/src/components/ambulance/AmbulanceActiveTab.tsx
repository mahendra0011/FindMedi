import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Siren,
  Phone,
  MapPin,
  Hospital,
  Navigation,
  Zap,
  CheckCircle2,
  Ambulance,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AmbulanceActiveTabProps {
  job: any;
  step: number;
  advancing: boolean;
  advanceProgress: () => Promise<void>;
  completeJob: () => Promise<void>;
  mapsUrl: (lat: number, lng: number) => string;
  amb: any;
  setTab: (tab: string) => void;
}

export const AmbulanceActiveTab: React.FC<AmbulanceActiveTabProps> = ({
  job,
  step,
  advancing,
  advanceProgress,
  completeJob,
  mapsUrl,
  amb,
  setTab,
}) => {
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
        <h3 className="font-bold text-base text-foreground">Active Emergency Mission Console</h3>
      </div>

      {job ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="rounded-3xl border-2 border-destructive bg-card p-6 shadow-xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive text-white flex items-center justify-center font-bold shadow-md">
                <Siren className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse text-[10px] font-bold">
                    ACTIVE EMERGENCY MISSION
                  </Badge>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    #{job._id?.slice(-8)?.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-heading font-extrabold text-foreground mt-0.5">
                  {job.category || 'Critical Emergency'} · {job.patientDetails?.name || 'Emergency Patient'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {job.patientDetails?.phone && (
                <a href={`tel:${job.patientDetails.phone}`}>
                  <Button
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Patient ({job.patientDetails.phone})
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Progress Milestones Stepper */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              {['1. Assigned', '2. Reached Pickup', '3. Heading to Hospital', '4. Reached Hospital'].map(
                (s, i) => (
                  <span key={s} className={step >= i ? 'text-destructive font-extrabold' : ''}>
                    {s}
                  </span>
                )
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-destructive rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / 4) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-destructive uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Patient Pickup Location
                </span>
                {job.location?.coordinates && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={mapsUrl(job.location.coordinates[1], job.location.coordinates[0])}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-lg gap-1 border-destructive/30 text-destructive"
                    >
                      <Navigation className="w-3 h-3" /> Open Maps
                    </Button>
                  </a>
                )}
              </div>
              <p className="font-semibold text-foreground text-sm">
                {job.location?.address || 'Pickup coordinates loaded'}
              </p>
              <p className="text-muted-foreground">
                Patient: {job.patientDetails?.name}{' '}
                {job.patientDetails?.age ? `(${job.patientDetails.age} yrs)` : ''} · Blood Group:{' '}
                {job.patientDetails?.bloodGroup || 'Not specified'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Hospital className="w-4 h-4" /> Destination Hospital
                </span>
                {job.selectedHospitalId?.location?.coordinates && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={mapsUrl(
                      job.selectedHospitalId.location.coordinates[1],
                      job.selectedHospitalId.location.coordinates[0]
                    )}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-lg gap-1 border-sky-500/30 text-sky-600"
                    >
                      <Navigation className="w-3 h-3" /> Open Maps
                    </Button>
                  </a>
                )}
              </div>
              <p className="font-semibold text-foreground text-sm">
                {job.selectedHospitalId?.name ||
                  amb?.hospitalId?.name ||
                  'Nearest Designated Emergency Trauma Center'}
              </p>
              <p className="text-muted-foreground">
                Address:{' '}
                {job.selectedHospitalId?.address || amb?.hospitalId?.address || 'Hospital ER Bay'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
            <Button
              size="default"
              disabled={advancing || step >= 3}
              onClick={advanceProgress}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs gap-2"
            >
              <Zap className="w-4 h-4" />
              {advancing
                ? 'Updating Milestone…'
                : step === 0
                ? 'Mark: Reached Patient Pickup'
                : step === 1
                ? 'Mark: Heading to Hospital ER'
                : 'Mark: Reached Hospital ER'}
            </Button>

            <Button
              size="default"
              onClick={completeJob}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Complete Mission & Transfer Patient
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3 bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Ambulance className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base text-foreground">No Active Emergency Mission</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your ambulance is currently on standby. Make sure your status is toggled to{' '}
            <strong>Online</strong> so the emergency dispatch system can route nearby hospital trauma calls
            to you.
          </p>
        </div>
      )}
    </div>
  );
};
