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

export default function EmergencyFlowController() {
  const { user } = useAuth();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [noResponders, setNoResponders] = useState(false);
  const [searchPhase, setSearchPhase] = useState<'ambulance' | 'vehicle'>('ambulance');
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [assignedData, setAssignedData] = useState<any>(null);

  const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
  const [pendingAccept, setPendingAccept] = useState<{ requestId: string; endsAt: number } | null>(null);
  const [hospitalSelectRequestId, setHospitalSelectRequestId] = useState<string | null>(null);

  const activeRequestRef = useRef<any>(null);
  activeRequestRef.current = activeRequest;
  const incomingRef = useRef<any>(null);
  incomingRef.current = incomingEmergency;

  emergencyOverlayActive.current = !!incomingEmergency;

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

    const onNoResponders = (data: any) => {
      if (matches(data)) {
        setSearching(false);
        setNoResponders(true);
        toast.error('No emergency vehicles responded in time. Please dial 108 or 112 immediately!', { duration: 12000 });
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
    socket.on('emergency_no_responders_found', onNoResponders);
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
      socket.off('emergency_no_responders_found', onNoResponders);
      socket.off('emergency_cancelled', onEmergencyCancelled);
      socket.off('emergency_completed', onCompleted);
      socket.off('emergency_hospital_selected', onHospitalSelected);
    };
  }, []);

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
    try {
      const res = await api.post('/emergency-sos', payload);
      const created = res.emergency;
      if (created) {
        setActiveRequest(created);
        setConfirmModalOpen(false);
        setSearching(true);
        setNoResponders(false);
        setAssignedData(null);
        setSearchPhase('ambulance');
        setSearchRadius(5);
        toast.success('Emergency SOS triggered! Broadcasting to nearest hospital ambulances.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to trigger Emergency SOS.');
      throw err;
    }
  };

  const handleCancelSOS = async () => {
    if (!activeRequest?._id) return;
    try {
      await api.post(`/emergency-sos/${activeRequest._id}/cancel`, {
        reason: 'User cancelled emergency request',
      });
      setSearching(false);
      setActiveRequest(null);
      setNoResponders(false);
      toast.info('Emergency request cancelled.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel emergency.');
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
      {!searching && !assignedData && (
        <SOSButton onClick={() => setConfirmModalOpen(true)} />
      )}

      <SOSConfirmModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        onSubmitSOS={handleSubmitSOS}
        currentUser={user}
      />

      {searching && (
        <SOSSearchingScreen
          radiusKm={searchRadius}
          phase={searchPhase}
          onCancel={handleCancelSOS}
          requestDetails={activeRequest}
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
