import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Phone, ShieldCheck, MapPin, Clock, Star, Navigation, X, CheckCircle2, Siren, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSocket } from '@/lib/socket';
import { Link } from 'react-router-dom';

interface TrackingScreenProps {
  request: any;
  onCancel: () => void;
  onClose?: () => void;
}

export default function EmergencyDoctorTrackingScreen({ request, onCancel, onClose }: TrackingScreenProps) {
  const [status, setStatus] = useState<string>(request.status || 'searching');
  const [doctor, setDoctor] = useState<any>(request.assignedDoctor || request.doctor || null);
  const [etaMinutes, setEtaMinutes] = useState<number>(request.estimatedArrivalMinutes || 10);
  const [distanceKm, setDistanceKm] = useState<number>(request.transitDistanceKm || 3.2);

  const requestId = request._id || request.id || request.requestId;

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !requestId) return;

    const room = `emergency:doctor:${requestId}`;
    socket.emit('join_room', { room });

    // Handle both event names for maximum resilience
    const handleDoctorAssigned = (data: any) => {
      setStatus('assigned');
      if (data.doctor) setDoctor(data.doctor);
      if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
      if (data.distanceKm) setDistanceKm(data.distanceKm);
    };

    const handleGpsUpdate = (data: any) => {
      if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
      if (data.distanceKm) setDistanceKm(data.distanceKm);
    };

    const handleStatusChanged = (data: any) => {
      if (data.status) setStatus(data.status);
    };

    socket.on('emergency_doctor_assigned', handleDoctorAssigned);
    socket.on('emergency_doctor:doctor_assigned', handleDoctorAssigned);
    socket.on('doctor_location_update', handleGpsUpdate);
    socket.on('emergency_doctor:gps_update', handleGpsUpdate);
    socket.on('emergency_doctor:status_changed', handleStatusChanged);
    socket.on('doctor_arrived_on_scene', () => setStatus('arrived'));
    socket.on('emergency_doctor_completed', () => setStatus('completed'));

    return () => {
      socket.emit('leave_room', { room });
      socket.off('emergency_doctor_assigned', handleDoctorAssigned);
      socket.off('emergency_doctor:doctor_assigned', handleDoctorAssigned);
      socket.off('doctor_location_update', handleGpsUpdate);
      socket.off('emergency_doctor:gps_update', handleGpsUpdate);
      socket.off('emergency_doctor:status_changed', handleStatusChanged);
      socket.off('doctor_arrived_on_scene');
      socket.off('emergency_doctor_completed');
    };
  }, [requestId]);

  const reqNum = request.bookingId || request.requestNumber || `DOC-${String(requestId).slice(-6)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-3xl border-2 border-teal-500/50 p-5 sm:p-6 shadow-2xl text-card-foreground space-y-5"
      >
        {status === 'searching' ? (
          /* RADAR SEARCHING STATE */
          <div className="text-center py-4 space-y-4">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping duration-1000" />
              <span className="absolute -inset-4 rounded-full border border-teal-500/40 animate-spin" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-xl">
                <Stethoscope className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 text-teal-400 font-mono text-xs font-semibold mb-2">
                <span>Request:</span> {reqNum}
              </div>
              <h3 className="font-heading font-black text-lg sm:text-xl text-foreground">
                Alerting Nearby Emergency Doctors...
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Broadcasting emergency beacon to verified clinic physicians within your 5–15 km perimeter.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3 text-[11px] text-muted-foreground text-left space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" /> Statutory Rapid Response:
              </p>
              <p>
                First responding clinic physician will accept the dispatch and initiate immediate transit with basic life support kit.
              </p>
            </div>

            <Button onClick={onCancel} variant="outline" className="w-full rounded-xl text-xs font-bold h-11 border-border/80 text-muted-foreground hover:bg-muted">
              Cancel Emergency Dispatch
            </Button>
          </div>
        ) : (
          /* DOCTOR EN ROUTE / ARRIVED TRACKING HUD */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status === 'arrived' ? 'bg-emerald-500' : 'bg-teal-400'} animate-pulse`} />
                <span className="text-xs font-black uppercase text-teal-400 tracking-wider">
                  {status === 'arrived' ? 'Doctor Has Arrived on Scene!' : status === 'completed' ? 'Visit Completed' : 'Emergency Doctor En Route'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{reqNum}</span>
            </div>

            {/* Doctor Profile Banner */}
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-md">
                {doctor?.name ? doctor.name[0] : 'D'}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <h4 className="font-bold text-sm text-foreground truncate">
                  Dr. {doctor?.name || 'Assigned Physician'}
                </h4>
                <p className="text-muted-foreground truncate">{doctor?.specialization || 'Clinical Practitioner'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> NMC-VERIFIED
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold text-[10px]">
                    <Star className="w-3 h-3 fill-amber-400" /> {doctor?.rating || 4.9}
                  </span>
                </div>
              </div>
            </div>

            {/* ETA & Distance Telemetry */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Estimated Arrival</span>
                <span className="text-lg font-black text-cyan-400 font-mono">
                  {status === 'arrived' ? 'ON SCENE' : `~${etaMinutes} Mins`}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Distance Away</span>
                <span className="text-lg font-black text-foreground font-mono">
                  {status === 'arrived' ? '0.0 Km' : `${distanceKm} Km`}
                </span>
              </div>
            </div>

            {/* Direct Calling & Emergency Actions */}
            <div className="space-y-2 pt-1">
              {doctor?.phone ? (
                <a
                  href={`tel:${doctor.phone}`}
                  className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Phone className="w-4 h-4" /> Call Attending Doctor ({doctor.phone})
                </a>
              ) : (
                <a
                  href="tel:108"
                  className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Siren className="w-4 h-4" /> Call 108 Emergency Ambulance Hotline
                </a>
              )}
            </div>

            {/* Legal / Statutory Compliance Note */}
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Scale className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>
                Encrypted GPS Telemetry in compliance with DPDP Act 2023. See{' '}
                <Link to="/terms" target="_blank" className="text-primary underline">Terms</Link> &{' '}
                <Link to="/privacy" target="_blank" className="text-primary underline">Privacy</Link>.
              </span>
            </div>

            {status === 'completed' && onClose && (
              <Button onClick={onClose} className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                Close Tracking Screen
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
