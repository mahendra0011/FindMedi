import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { emergencyOverlayActive } from '@/lib/emergencyState';
import SOSButton from './SOSButton';
import SOSConfirmModal from './SOSConfirmModal';
import SOSSearchingScreen from './SOSSearchingScreen';
import SOSAssignedScreen from './SOSAssignedScreen';
import ProviderIncomingCall from './ProviderIncomingCall';
import ProviderHospitalSelect from './ProviderHospitalSelect';
import SOSModeSelect, { type SOSMode } from './SOSModeSelect';
import SOSVehicleTypeSelect from './SOSVehicleTypeSelect';
import SOSRadiusOptions from './SOSRadiusOptions';
import SOSAcceptedList from './SOSAcceptedList';
import { sosVehicleState } from '@/lib/emergencyState';
import { installEmergencyAudioUnlock } from '@/utils/emergencyRing';

export default function EmergencyFlowController() {
  const { user } = useAuth();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [noResponders, setNoResponders] = useState(false);
  const [searchPhase, setSearchPhase] = useState<'ambulance' | 'vehicle'>('ambulance');
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [assignedData, setAssignedData] = useState<any>(null);
  const [flowStep, setFlowStep] = useState<'idle' | 'mode_select' | 'vehicle_type_select' | 'radius_options'>('idle');
  const [sosMode, setSosMode] = useState<SOSMode>('auto_select_ambulance');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['ambulance']);
  const [autoBook, setAutoBook] = useState(false);
  const [autoFind, setAutoFind] = useState(false);
  const [startRadius, setStartRadius] = useState(5);
  const [startingSearch, setStartingSearch] = useState(false);
  const [acceptedList, setAcceptedList] = useState<any[]>([]);
  const [bookingProvider, setBookingProvider] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState<number | undefined>(undefined);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [windowOpen, setWindowOpen] = useState(true); // false = 30s window band, user ke paas next-step buttons

  const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
  const [pendingAccept, setPendingAccept] = useState<{ requestId: string; endsAt: number } | null>(null);
  const [hospitalSelectRequestId, setHospitalSelectRequestId] = useState<string | null>(null);

  const activeRequestRef = useRef<any>(null);
  activeRequestRef.current = activeRequest;
  const incomingRef = useRef<any>(null);
  incomingRef.current = incomingEmergency;

  emergencyOverlayActive.current = !!incomingEmergency;

  // Pehle user tap par audio unlock — taaki ring bajne me browser autoplay block na kare
  useEffect(() => installEmergencyAudioUnlock(), []);

  // Sync state after room join (missed-event protection, Doc 03 §6)
  const syncRequestState = useCallback(async (requestId: string) => {
    try {
      const res: any = await api.get(`/emergency-sos/${requestId}`);
      const em = res?.emergency;
      if (!em) return;
      if (em.status === 'assigned' || em.status === 'en_route') {
        setSearching(false);
        setAssignedData(em.responder || { requestId });
      } else if (em.status === 'no_responders_found') {
        setSearching(false);
        setNoResponders(true);
      } else if (em.status === 'cancelled_by_user' || em.status === 'completed') {
        setSearching(false);
        setActiveRequest(null);
        setAssignedData(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.id) return; // login ke baad hi listeners lagao
    const socket = getSocket();
    if (!socket) return;

    const matches = (data: any) => {
      const cur = activeRequestRef.current;
      return cur && (cur._id === data.requestId || cur.id === data.requestId || String(cur._id) === String(data.requestId));
    };

    const onIncomingEmergency = (data: any) => {
      // Dedupe two tabs: same requestId already ringing
      if (incomingRef.current?.requestId === data.requestId) return;
      setIncomingEmergency(data);
      setPendingAccept(null);
    };

    const onSearchingUpdate = (data: any) => {
      if (matches(data)) {
        if (data.phase) setSearchPhase(data.phase);
        if (data.radiusKm) setSearchRadius(data.radiusKm);
        if (data.attemptNumber) setAttemptNumber(data.attemptNumber);
      }
    };

    const onEmergencyAssigned = (data: any) => {
      if (matches(data)) {
        setSearching(false);
        setAssignedData(data);
        toast.success('Emergency responder assigned and on the way!');
      }
    };

    const onAssignedToYou = (data: any) => {
      setPendingAccept(null);
      setIncomingEmergency(null);
      setHospitalSelectRequestId(data.requestId);
      toast.success('You have secured the emergency dispatch! En route to pickup.');
    };

    const onLost = (data: any) => {
      setPendingAccept(null);
      setIncomingEmergency(null);
      toast.info(data?.message || 'Ye emergency kisi aur paas wale responder ko assign ho gayi.');
    };

    const onClosed = () => {
      setPendingAccept(null);
      setIncomingEmergency(null);
    };

    const onExpiredNoResponse = (data: any) => {
      if (incomingRef.current?.requestId === data.requestId) {
        setPendingAccept(null);
        setIncomingEmergency(null);
      }
    };

    const onNoResponders = (data: any) => {
      if (matches(data)) {
        setSearching(false);
        setNoResponders(true);
        toast.error('No emergency vehicles responded in time. Please dial 108 or 112 immediately!', { duration: 12000 });
      }
    };

    // Server ne 30s window band ki: accepted list ya "koi accept nahi" (Search Again / wider)
    const onWindowClosed = (data: any) => {
      if (!matches(data)) return;
      setWindowOpen(false);
      if (data.radiusKm) setSearchRadius(data.radiusKm);
      if (data.accepted?.length) {
        setAcceptedList(data.accepted);
        setSearching(false);
      }
    };

    const onEmergencyCancelled = (data: any) => {
      if (matches(data)) {
        setSearching(false);
        setAssignedData(null);
        setActiveRequest(null);
        setNoResponders(false);
        toast.info('Emergency request was cancelled.');
      }
      if (incomingRef.current?.requestId === data.requestId) {
        setIncomingEmergency(null);
        setPendingAccept(null);
        toast.info('The emergency request was cancelled by the requester.');
      }
    };

    const onCompleted = (data: any) => {
      if (matches(data)) {
        setAssignedData(null);
        setActiveRequest(null);
        setSearching(false);
        toast.success('Emergency completed.');
      }
    };

    const onHospitalSelected = (data: any) => {
      if (matches(data)) {
        setAssignedData((prev: any) => prev ? { ...prev, hospital: data.hospital } : prev);
      }
    };

    socket.on('incoming_emergency', onIncomingEmergency);
    socket.on('emergency_searching_update', onSearchingUpdate);
    socket.on('emergency_assigned', onEmergencyAssigned);
    socket.on('emergency_assigned_to_you', onAssignedToYou);
    socket.on('emergency_lost', onLost);
    socket.on('emergency_closed', onClosed);
    socket.on('emergency_expired_no_response', onExpiredNoResponse);
    socket.on('emergency_no_responders_found', onNoResponders);
    socket.on('emergency_window_closed', onWindowClosed);
    socket.on('emergency_cancelled', onEmergencyCancelled);
    socket.on('emergency_completed', onCompleted);
    socket.on('emergency_hospital_selected', onHospitalSelected);

    return () => {
      socket.off('incoming_emergency', onIncomingEmergency);
      socket.off('emergency_searching_update', onSearchingUpdate);
      socket.off('emergency_assigned', onEmergencyAssigned);
      socket.off('emergency_assigned_to_you', onAssignedToYou);
      socket.off('emergency_lost', onLost);
      socket.off('emergency_closed', onClosed);
      socket.off('emergency_expired_no_response', onExpiredNoResponse);
      socket.off('emergency_no_responders_found', onNoResponders);
      socket.off('emergency_window_closed', onWindowClosed);
      socket.off('emergency_cancelled', onEmergencyCancelled);
      socket.off('emergency_completed', onCompleted);
      socket.off('emergency_hospital_selected', onHospitalSelected);
    };
  }, [user?.id]);

  // Join room immediately when activeRequest set + one GET sync (Doc 01 §12 race fix)
  useEffect(() => {
    if (!activeRequest?._id) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join_emergency_room', { requestId: activeRequest._id });
    syncRequestState(String(activeRequest._id));
    return () => {
      socket.emit('leave_emergency_room', { requestId: activeRequest._id });
    };
  }, [activeRequest?._id, syncRequestState]);

  const handleSubmitSOS = async (payload: any) => {
    // Hold-to-confirm done → now choose mode (spec §0). Keep payload, open mode select.
    setPendingPayload(payload);
    setConfirmModalOpen(false);
    setSosMode('auto_select_ambulance');
    setVehicleTypes(['ambulance']);
    setAutoBook(true);
    setAutoFind(false);
    setStartRadius(5);
    setFlowStep('mode_select');
  };

  const startSearchWithMode = async () => {
    if (!pendingPayload) return;
    if (sosMode === 'manual_select' && vehicleTypes.length === 0) {
      toast.error('Kam se kam ek vehicle type chuno');
      return;
    }
    setStartingSearch(true);
    try {
      sosVehicleState.current = {
        requestMode: sosMode,
        selectedVehicleTypes: sosMode === 'manual_select' ? vehicleTypes : sosMode === 'auto_select_ambulance' ? ['ambulance'] : ['auto', 'e_rickshaw', 'car', 'van', 'ambulance'],
        autoBookEnabled: sosMode === 'auto_select_ambulance' ? true : autoBook,
        autoFindEnabled: autoFind,
        startingRadiusKm: startRadius,
      };
      const res: any = await api.post('/emergency-sos/start', {
        ...pendingPayload,
        requestMode: sosMode,
        selectedVehicleTypes: sosVehicleState.current.selectedVehicleTypes,
        autoBookEnabled: sosVehicleState.current.autoBookEnabled,
        autoFindEnabled: autoFind,
        startingRadiusKm: startRadius,
      });
      const requestId = res.requestId;
      if (requestId) {
        setActiveRequest({ _id: requestId, id: requestId, ...pendingPayload, requestMode: sosMode });
        setFlowStep('idle');
        setSearching(true);
        setNoResponders(false);
        setAssignedData(null);
        setAcceptedList([]);
        setWindowOpen(true);
        setAttemptNumber(undefined);
        setSearchPhase(sosMode === 'auto_select_ambulance' ? 'ambulance' : 'vehicle');
        setSearchRadius(startRadius);
        toast.success('Emergency SOS triggered! Searching nearby responders.');
        // Manual modes: poll accepted-candidates after window (~32s)
        if (sosMode === 'manual_select' || (sosMode === 'auto_select_vehicle' && !autoBook && !autoFind)) {
          setTimeout(async () => {
            try {
              const list: any = await api.get(`/emergency-sos/${requestId}/accepted-candidates`);
              if (list?.accepted?.length) {
                setAcceptedList(list.accepted);
                setSearching(false);
              }
            } catch {}
          }, 32000);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to trigger Emergency SOS.');
    } finally {
      setStartingSearch(false);
    }
  };

  const handleSearchAgain = async () => {
    if (!activeRequest?._id) return;
    try {
      // Server fire-and-forget hai; result 'emergency_window_closed' socket event se aata hai
      await api.post(`/emergency-sos/${activeRequest._id}/search-again`, {});
      setAcceptedList([]);
      setWindowOpen(true);
      setSearching(true);
      toast.info('Search Again — same radius me dobara dhoondh rahe hain…');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Search failed');
    }
  };

  const handleSearchWider = async (km: number) => {
    if (!activeRequest?._id) return;
    try {
      setSearchRadius(km);
      await api.post(`/emergency-sos/${activeRequest._id}/search-radius/${km}`, {});
      setAcceptedList([]);
      setWindowOpen(true);
      setSearching(true);
      toast.info(`Search in ${km}km…`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Search failed');
    }
  };

  const handleBookChosen = async (providerId: string) => {
    if (!activeRequest?._id) return;
    setBookingProvider(true);
    try {
      await api.post(`/emergency-sos/${activeRequest._id}/book/${providerId}`, {});
      setAcceptedList([]);
      toast.success('Booked! Responder aa raha hai.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking failed — race ho gayi, dobara try karein.');
    } finally {
      setBookingProvider(false);
    }
  };

  const cancellingRef = useRef(false);
  const handleCancelSOS = async () => {
    if (!activeRequest?._id || cancellingRef.current) return;
    cancellingRef.current = true;
    try {
      await api.post(`/emergency-sos/${activeRequest._id}/cancel`, {
        reason: 'User cancelled emergency request',
      });
      setSearching(false);
      setActiveRequest(null);
      setNoResponders(false);
      setAcceptedList([]);
      toast.info('Emergency request cancelled.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel emergency.');
    } finally {
      cancellingRef.current = false;
    }
  };

  const handleProviderAccept = async (requestId: string) => {
    if (!incomingEmergency) return;
    try {
      const res: any = await api.post(`/emergency-sos/${requestId}/accept`, {
        providerType: incomingEmergency.providerType,
        providerId: incomingEmergency.ambulanceId || incomingEmergency.providerId || (user as any)?.id || (user as any)?._id,
      });

      if (res.status === 'accepted_pending') {
        setPendingAccept({
          requestId,
          endsAt: res.windowEndsAt ? new Date(res.windowEndsAt).getTime() : Date.now() + 30000,
        });
        // overlay stays open in "confirmation ka wait" state — do NOT clear incomingEmergency
      } else if (res.status === 'too_late') {
        toast.warning(res.message || 'Another responder already accepted this request.');
        setIncomingEmergency(null);
      } else if (!res.success) {
        toast.error(res.message || 'Could not accept emergency request.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '';
      const status = err.response?.data?.status;
      if (status === 'too_late') {
        toast.warning(msg);
        setIncomingEmergency(null);
      } else {
        toast.error(msg || 'Failed to accept emergency.');
      }
    }
  };

  const handleProviderReject = async (requestId: string) => {
    setIncomingEmergency(null);
    setPendingAccept(null);
    try {
      await api.post(`/emergency-sos/${requestId}/reject`, {
        providerId: incomingEmergency?.ambulanceId || incomingEmergency?.providerId || (user as any)?.id || (user as any)?._id,
      }).catch(() => {});
    } catch {}
  };

  return (
    <>
      {user && !searching && !assignedData && (
        <SOSButton onClick={() => setConfirmModalOpen(true)} />
      )}

      <SOSConfirmModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        onSubmitSOS={handleSubmitSOS}
        currentUser={user}
      />

      {flowStep === 'mode_select' && (
        <SOSModeSelect
          selected={sosMode}
          onSelect={(m) => {
            setSosMode(m);
            if (m === 'auto_select_ambulance') { setVehicleTypes(['ambulance']); setAutoBook(true); }
            if (m === 'manual_select' && vehicleTypes.length === 0) setVehicleTypes(['auto']);
          }}
          onContinue={() => setFlowStep(sosMode === 'manual_select' ? 'vehicle_type_select' : 'radius_options')}
        />
      )}

      {flowStep === 'vehicle_type_select' && (
        <SOSVehicleTypeSelect
          selected={vehicleTypes}
          onToggle={(id) => setVehicleTypes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
          onContinue={() => setFlowStep('radius_options')}
          onBack={() => setFlowStep('mode_select')}
        />
      )}

      {flowStep === 'radius_options' && (
        <SOSRadiusOptions
          mode={sosMode}
          radiusKm={startRadius}
          onRadius={setStartRadius}
          autoBook={sosMode === 'auto_select_ambulance' ? true : autoBook}
          onAutoBook={setAutoBook}
          autoFind={autoFind}
          onAutoFind={setAutoFind}
          onStart={startSearchWithMode}
          onBack={() => setFlowStep(sosMode === 'manual_select' ? 'vehicle_type_select' : 'mode_select')}
          starting={startingSearch}
        />
      )}

      {searching && (
        <SOSSearchingScreen
          radiusKm={searchRadius}
          phase={searchPhase}
          onCancel={handleCancelSOS}
          requestDetails={activeRequest}
          attemptNumber={attemptNumber}
          autoFind={autoFind}
          windowActive={windowOpen}
          onSearchAgain={handleSearchAgain}
          onSearchWider={handleSearchWider}
        />
      )}

      {!!acceptedList.length && (
        <SOSAcceptedList
          candidates={acceptedList}
          onBook={handleBookChosen}
          onSearchAgain={handleSearchAgain}
          onSearchWider={handleSearchWider}
          currentRadius={searchRadius}
          booking={bookingProvider}
        />
      )}

      {(!searching && noResponders) && (
        <SOSSearchingScreen
          radiusKm={searchRadius}
          phase={searchPhase}
          onCancel={() => { setNoResponders(false); setActiveRequest(null); }}
          requestDetails={activeRequest}
          noResponders
        />
      )}

      {assignedData && (
        <SOSAssignedScreen
          emergency={{ responder: assignedData }}
          onDismiss={() => setAssignedData(null)}
        />
      )}

      {incomingEmergency && (
        <ProviderIncomingCall
          data={incomingEmergency}
          acceptedWaiting={!!pendingAccept}
          onAccept={handleProviderAccept}
          onReject={handleProviderReject}
          onTimeout={handleProviderReject}
        />
      )}

      {hospitalSelectRequestId && (
        <ProviderHospitalSelect
          requestId={hospitalSelectRequestId}
          onHospitalSelected={(hospital) => {
            setHospitalSelectRequestId(null);
            toast.success(`Destination confirmed: ${hospital.name}`);
          }}
          onDismiss={() => setHospitalSelectRequestId(null)}
        />
      )}
    </>
  );
}
