import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import {
  listenToInstantSearch,
  InstantAssignedPayload,
  InstantNoRespondersPayload,
  InstantSearchUpdatePayload,
} from '@/lib/instantDispatchSocket';
import { toast } from 'sonner';

// File 04 §4 — shared state machine:
// idle -> searching -> (radius_expanding)* -> assigned -> in_progress -> completed
//                                          -> no_responders -> retry | scheduled_fallback | cancelled
// searching -> cancelled (any time); assigned -> searching on provider cancel (re-dispatch).
export type InstantDispatchPhase =
  | 'idle'
  | 'searching'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'no_responders'
  | 'cancelled';

export interface UseInstantDispatchOptions {
  type: 'lawyer' | 'assistant' | 'emergency_doctor' | 'ride' | 'ambulance';
  initialRequestId?: string | null;
  onAssignedCallback?: (payload: InstantAssignedPayload) => void;
  onCancelCallback?: () => void;
}

export function useInstantDispatch({
  type,
  initialRequestId = null,
  onAssignedCallback,
  onCancelCallback,
}: UseInstantDispatchOptions) {
  const [requestId, setRequestId] = useState<string | null>(initialRequestId);
  const [phase, setPhase] = useState<InstantDispatchPhase>(initialRequestId ? 'searching' : 'idle');
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [assignedDetails, setAssignedDetails] = useState<any>(null);
  const [requestDetails, setRequestDetails] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update internal ID if prop changes
  useEffect(() => {
    if (initialRequestId && initialRequestId !== requestId) {
      setRequestId(initialRequestId);
      setPhase('searching');
    }
  }, [initialRequestId]);

  // Real-time listener for search status & winner resolution
  useEffect(() => {
    if (!requestId || phase !== 'searching') return;

    const cleanup = listenToInstantSearch(type, requestId, {
      onSearchUpdate: (data: InstantSearchUpdatePayload) => {
        if (!mountedRef.current) return;
        setRadiusKm(data.radiusKm);
      },
      onAssigned: (data: InstantAssignedPayload) => {
        if (!mountedRef.current) return;
        setPhase('assigned');
        setAssignedDetails(data);
        toast.success('🎉 Responder found! Assignment confirmed.');
        onAssignedCallback?.(data);
      },
      onNoResponders: (_data: InstantNoRespondersPayload) => {
        if (!mountedRef.current) return;
        setPhase('no_responders');
        toast.info('No responders available right now within the dispatch radius.');
      },
    });

    return () => {
      cleanup();
    };
  }, [type, requestId, phase, onAssignedCallback]);

  // Cancel search
  const cancelDispatch = useCallback(
    async (reason = 'Cancelled by user') => {
      if (!requestId) return;
      setCancelling(true);
      try {
        if (type === 'ride' || type === 'ambulance') {
          await api.cancelRide(requestId, reason);
        } else if (type === 'emergency_doctor') {
          await api.post(`/emergency-doctor/${requestId}/cancel`, { reason, cancelledBy: 'patient' });
        } else if (type === 'lawyer') {
          await api.put(`/lawyer-bookings/${requestId}/cancel`, { cancellationReason: reason });
        } else if (type === 'assistant') {
          await api.cancelAssistantBooking(requestId, reason);
        }
        if (mountedRef.current) {
          setPhase('idle');
          setRequestId(null);
          toast.info('Instant search cancelled');
          onCancelCallback?.();
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to cancel request');
      } finally {
        if (mountedRef.current) setCancelling(false);
      }
    },
    [type, requestId, onCancelCallback]
  );

  const startSearch = useCallback((newRequestId: string, details?: any) => {
    setRequestId(newRequestId);
    setRequestDetails(details || null);
    setRadiusKm(5);
    setPhase('searching');
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setRequestId(null);
    setAssignedDetails(null);
    setRequestDetails(null);
    setRadiusKm(5);
  }, []);

  // File 04 §4 — post-assign lifecycle transitions (driven by booking
  // status updates / provider re-dispatch, not by the search socket).
  const markInProgress = useCallback(() => {
    if (mountedRef.current) setPhase('in_progress');
  }, []);

  const markCompleted = useCallback(() => {
    if (mountedRef.current) setPhase('completed');
  }, []);

  const markCancelled = useCallback(() => {
    if (mountedRef.current) {
      setPhase('cancelled');
      setRequestId(null);
    }
  }, []);

  const retrySearch = useCallback(
    (newRequestId: string, details?: any) => {
      startSearch(newRequestId, details);
    },
    [startSearch]
  );

  return {
    phase,
    requestId,
    radiusKm,
    assignedDetails,
    requestDetails,
    cancelling,
    startSearch,
    cancelDispatch,
    reset,
    setPhase,
    setRequestDetails,
    markInProgress,
    markCompleted,
    markCancelled,
    retrySearch,
  };
}
