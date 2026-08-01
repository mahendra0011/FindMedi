import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import ClinicSchedule from '@/pages/clinic/ClinicSchedule';

/**
 * Wrapper page for hospital doctors at /doctor/schedule.
 * Reuses the full ClinicSchedule editor but in requestMode:
 *   - Save button becomes "Request for Save"
 *   - Submits changes via schedule change request API (not direct write)
 *   - Loads the latest request to drive blur / cancel / highlight states:
 *       • Pending  → editor blurred + centered "Cancel Request" button
 *       • Approved → changed fields show blue highlighter with "Current Setting" + "old → new"
 *       • Rejected → changed fields show red highlighter with "old → new (not applied)"
 *   - Listens for WebSocket 'schedule-request-updated' events so the blur
 *     auto-removes instantly when the admin approves/rejects (no polling/refresh).
 */
export default function DoctorScheduleEdit() {
  const { user } = useAuth();
  const [rejectedRequest, setRejectedRequest] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [latestRequest, setLatestRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  // Bumped when a pending request transitions to a reviewed state —
  // triggers ClinicSchedule to re-fetch the doctor's live schedule.
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Ref to always call the latest loadRequests from the socket listener
  // without causing the socket connection to reconnect on every status change
  const loadRequestsRef = useRef(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getScheduleChangeRequests();
      const requests = res?.requests || res || [];
      const latest = requests[0] || null;

      // Detect transition from Pending → reviewed (approved/rejected/cancelled)
      const prevStatus = latestRequest?.status || '';
      const newStatus = (latest?.status || '').toLowerCase();
      if (prevStatus === 'pending' && newStatus !== 'pending' && newStatus !== '') {
        // Doctor's live schedule may have changed (on approve) or needs fresh fetch (on reject)
        setRefreshTrigger(k => k + 1);
      }

      setLatestRequest(latest);

      if (newStatus === 'pending') {
        setPendingRequest(latest);
        setRejectedRequest(null);
      } else if (newStatus === 'rejected' || (newStatus === 'approved' && latest?.rejectionNote)) {
        setRejectedRequest(latest);
        setPendingRequest(null);
      } else {
        setPendingRequest(null);
        setRejectedRequest(null);
      }
    } catch (e) {
      console.error('Failed to load schedule change requests', e);
    }
    setLoading(false);
  }, [latestRequest?.status]);

  // Keep ref in sync so the socket listener always calls the latest loadRequests
  loadRequestsRef.current = loadRequests;

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // WebSocket: listen for admin review events — auto-remove blur + render highlights
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    // Shared socket — room join har (re)connect par dobara hota hai
    const cleanupJoin = joinRoom('join', user.id);

    // Fired by the backend when admin approves/rejects/cancels a request.
    // Ref se latest loadRequests call hota hai bina socket reconnect kiye.
    const onScheduleUpdated = () => {
      loadRequestsRef.current();
    };
    socket.on('schedule-request-updated', onScheduleUpdated);

    return () => {
      socket.off('schedule-request-updated', onScheduleUpdated);
      cleanupJoin();
    };
    // Sirf user.id par depend karo — user object reference change par
    // socket teardown/reconnect hota tha, events miss ho jaate the.
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ClinicSchedule
      requestMode
      latestRequest={latestRequest}
      pendingRequest={pendingRequest}
      rejectedRequest={rejectedRequest}
      refreshTrigger={refreshTrigger}
      onRequestCancelled={loadRequests}
      onRequestCreated={loadRequests}
    />
  );
}
