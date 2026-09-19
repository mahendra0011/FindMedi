import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import SOSButton from './SOSButton';
import SOSConfirmModal from './SOSConfirmModal';
import SOSSearchingScreen from './SOSSearchingScreen';
import SOSAssignedScreen from './SOSAssignedScreen';
import ProviderIncomingCall from './ProviderIncomingCall';
import ProviderHospitalSelect from './ProviderHospitalSelect';

export default function EmergencyFlowController() {
  const { user } = useAuth();

  // User / Patient State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState<'ambulance' | 'vehicle'>('ambulance');
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [assignedData, setAssignedData] = useState<any>(null);

  // Provider State
  const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
  const [hospitalSelectRequestId, setHospitalSelectRequestId] = useState<string | null>(null);

  // Socket Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 1. Incoming Emergency Alert for Provider / Driver
    const onIncomingEmergency = (data: any) => {
      console.log('[EmergencyFlow] incoming_emergency received:', data);
      setIncomingEmergency(data);
    };

    // 2. Search Update (Phase & Radius Escalation)
    const onSearchingUpdate = (data: any) => {
      console.log('[EmergencyFlow] emergency_searching_update:', data);
      if (activeRequest && (activeRequest._id === data.requestId || activeRequest.id === data.requestId)) {
        if (data.phase) setSearchPhase(data.phase);
        if (data.radiusKm) setSearchRadius(data.radiusKm);
      }
    };

    // 3. Responder Assigned to Patient Request
    const onEmergencyAssigned = (data: any) => {
      console.log('[EmergencyFlow] emergency_assigned:', data);
      if (activeRequest && (activeRequest._id === data.requestId || activeRequest.id === data.requestId)) {
        setSearching(false);
        setAssignedData(data);
        toast.success('Emergency responder assigned and on the way!');
      }
    };

    // 4. Winning Provider Assigned
    const onAssignedToYou = (data: any) => {
      console.log('[EmergencyFlow] emergency_assigned_to_you:', data);
      setIncomingEmergency(null);
      setHospitalSelectRequestId(data.requestId);
      toast.success('You have secured the emergency dispatch! En route to pickup.');
    };

    // 5. No Responders Found Fallback
    const onNoResponders = (data: any) => {
      console.log('[EmergencyFlow] emergency_no_responders_found:', data);
      if (activeRequest && (activeRequest._id === data.requestId || activeRequest.id === data.requestId)) {
        setSearching(false);
        toast.error('No emergency vehicles responded in time. Please dial 108 or 112 immediately!', {
          duration: 12000,
        });
      }
    };

    // 6. Emergency Cancelled
    const onEmergencyCancelled = (data: any) => {
      console.log('[EmergencyFlow] emergency_cancelled:', data);
      if (activeRequest && (activeRequest._id === data.requestId || activeRequest.id === data.requestId)) {
        setSearching(false);
        setAssignedData(null);
        setActiveRequest(null);
        toast.info('Emergency request was cancelled.');
      }
      if (incomingEmergency && incomingEmergency.requestId === data.requestId) {
        setIncomingEmergency(null);
        toast.info('The emergency request was cancelled by the requester.');
      }
    };

    socket.on('incoming_emergency', onIncomingEmergency);
    socket.on('emergency_searching_update', onSearchingUpdate);
    socket.on('emergency_assigned', onEmergencyAssigned);
    socket.on('emergency_assigned_to_you', onAssignedToYou);
    socket.on('emergency_no_responders_found', onNoResponders);
    socket.on('emergency_cancelled', onEmergencyCancelled);

    return () => {
      socket.off('incoming_emergency', onIncomingEmergency);
      socket.off('emergency_searching_update', onSearchingUpdate);
      socket.off('emergency_assigned', onEmergencyAssigned);
      socket.off('emergency_assigned_to_you', onAssignedToYou);
      socket.off('emergency_no_responders_found', onNoResponders);
      socket.off('emergency_cancelled', onEmergencyCancelled);
    };
  }, [activeRequest, incomingEmergency]);

  // Join socket room whenever an activeRequest is created
  useEffect(() => {
    if (!activeRequest?._id) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_emergency_room', { requestId: activeRequest._id });
    return () => {
      socket.emit('leave_emergency_room', { requestId: activeRequest._id });
    };
  }, [activeRequest]);

  // Submit Emergency SOS
  const handleSubmitSOS = async (payload: any) => {
    try {
      const res = await api.post('/emergency-sos', payload);
      const created = res.emergency;
      if (created) {
        setActiveRequest(created);
        setConfirmModalOpen(false);
        setSearching(true);
        setSearchPhase('ambulance');
        setSearchRadius(5);
        toast.success('Emergency SOS triggered! Broadcasting to nearest hospital ambulances.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to trigger Emergency SOS.');
      throw err;
    }
  };

  // Cancel Emergency SOS by User
  const handleCancelSOS = async () => {
    if (!activeRequest?._id) return;
    try {
      await api.post(`/emergency-sos/${activeRequest._id}/cancel`, {
        reason: 'User cancelled emergency request',
      });
      setSearching(false);
      setActiveRequest(null);
      toast.info('Emergency request cancelled.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel emergency.');
    }
  };

  // Provider Accept
  const handleProviderAccept = async (requestId: string) => {
    if (!incomingEmergency) return;
    try {
      const res = await api.post(`/emergency-sos/${requestId}/accept`, {
        providerType: incomingEmergency.providerType,
        providerId: incomingEmergency.ambulanceId || user?._id,
      });

      if (res.status === 'assigned') {
        setIncomingEmergency(null);
        setHospitalSelectRequestId(requestId);
        toast.success('Emergency request assigned to you!');
      } else if (res.status === 'too_late') {
        toast.warning(res.message || 'Another responder already accepted this request.');
        setIncomingEmergency(null);
      } else {
        toast.error(res.message || 'Could not accept emergency request.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept emergency.');
    }
  };

  // Provider Reject / Decline
  const handleProviderReject = async (requestId: string) => {
    setIncomingEmergency(null);
    try {
      await api.post(`/emergency-sos/${requestId}/reject`, {
        providerId: incomingEmergency?.ambulanceId || user?._id,
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Floating SOS Trigger Button (Visible when not actively searching/assigned) */}
      {!searching && !assignedData && (
        <SOSButton onClick={() => setConfirmModalOpen(true)} />
      )}

      {/* Patient: 1s Hold-to-Confirm & Details Modal */}
      <SOSConfirmModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        onSubmitSOS={handleSubmitSOS}
        currentUser={user}
      />

      {/* Patient: Fullscreen Radar Searching Screen */}
      {searching && (
        <SOSSearchingScreen
          radiusKm={searchRadius}
          phase={searchPhase}
          onCancel={handleCancelSOS}
          requestDetails={activeRequest}
        />
      )}

      {/* Patient: Dispatched Responder Screen */}
      {assignedData && (
        <SOSAssignedScreen
          emergency={{ responder: assignedData }}
          onDismiss={() => setAssignedData(null)}
        />
      )}

      {/* Provider: Fullscreen Call Alert with 30s Countdown */}
      {incomingEmergency && (
        <ProviderIncomingCall
          data={incomingEmergency}
          onAccept={handleProviderAccept}
          onReject={handleProviderReject}
          onTimeout={handleProviderReject}
        />
      )}

      {/* Provider: Destination Hospital Picker Dialog */}
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
