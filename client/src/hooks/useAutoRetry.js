import { useCallback, useRef, useState } from 'react';
import { usePreferredPharmacies } from '@/context/PreferredPharmacyContext';
import { toast } from 'sonner';

export const REJECTION_REASONS = [
  { id: 'blurry', label: 'Unclear/blurry prescription image' },
  { id: 'expired', label: 'Prescription has expired' },
  { id: 'name_mismatch', label: 'Medicine name does not match handwriting' },
  { id: 'stamp_missing', label: 'Doctor signature/stamp missing' },
  { id: 'qty_exceeded', label: 'Requested quantity exceeds prescribed amount' },
  { id: 'other', label: 'Other reason' },
];

const DEFAULT_SLA_MS = 2 * 60 * 60 * 1000;

export const AUTO_RETRY_STATUS = {
  IDLE: 'idle',
  TRYING: 'trying',
  ACCEPTED: 'accepted',
  ALL_EXHAUSTED: 'all_exhausted',
  STOPPED: 'stopped',
};

export function useAutoRetry() {
  const { pharmacies, autoRetryEnabled } = usePreferredPharmacies();
  const [state, setState] = useState({
    status: AUTO_RETRY_STATUS.IDLE,
    currentPriorityIndex: -1,
    currentStore: null,
    triedStores: [],
    lastRejection: null,
    isPaused: false,
  });
  const timeoutRef = useRef(null);
  const isRunningRef = useRef(false);
  const forwardRef = useRef(null);

  const setForwardFn = useCallback((fn) => { forwardRef.current = fn; }, []);

  const startRetry = useCallback((rejectionReason, orderContext) => {
    if (!autoRetryEnabled || pharmacies.length === 0) {
      setState(prev => ({ ...prev, status: AUTO_RETRY_STATUS.IDLE, lastRejection: rejectionReason }));
      return false;
    }

    isRunningRef.current = true;
    const firstIndex = 0;
    const firstStore = pharmacies[firstIndex];

    toast.info(`Auto-retry started — trying ${firstStore.name} (Priority ${firstStore.priority})`);

    setState({
      status: AUTO_RETRY_STATUS.TRYING,
      currentPriorityIndex: firstIndex,
      currentStore: firstStore,
      triedStores: [{ store: firstStore, result: 'pending', reason: null }],
      lastRejection: rejectionReason,
      isPaused: false,
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleTimeout(firstIndex, firstStore, orderContext);
    }, DEFAULT_SLA_MS);

    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacies, autoRetryEnabled]);

  const handleAccept = useCallback((storeIndex, store, orderContext) => {
    if (!isRunningRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    toast.success(`Prescription accepted by ${store.name}!`);

    setState(prev => ({
      ...prev,
      status: AUTO_RETRY_STATUS.ACCEPTED,
      currentPriorityIndex: storeIndex,
      currentStore: store,
      triedStores: prev.triedStores.map((ts, i) =>
        i === prev.triedStores.length - 1 ? { ...ts, result: 'accepted' } : ts
      ),
      isPaused: false,
    }));
    isRunningRef.current = false;
  }, []);

  const advanceToNext = useCallback(async (storeIndex, store, rejectionReason, orderContext) => {
    if (forwardRef.current && orderContext?.orderId) {
      try {
        await forwardRef.current(orderContext.orderId, store.id || store.facilityId);
      } catch {
        toast.error('Failed to forward order to next pharmacy');
      }
    }
  }, []);

  const handleReject = useCallback(async (storeIndex, store, rejectionReason, orderContext) => {
    if (!isRunningRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const nextIndex = storeIndex + 1;

    if (nextIndex >= pharmacies.length) {
      toast.error('All preferred pharmacies declined the prescription');

      setState(prev => ({
        ...prev,
        status: AUTO_RETRY_STATUS.ALL_EXHAUSTED,
        triedStores: prev.triedStores.map((ts, i) =>
          i === prev.triedStores.length - 1 ? { ...ts, result: 'rejected', reason: rejectionReason } : ts
        ),
        isPaused: false,
      }));
      isRunningRef.current = false;
      return;
    }

    await advanceToNext(storeIndex, store, rejectionReason, orderContext);

    const nextStore = pharmacies[nextIndex];
    toast.info(`${store.name} declined — trying ${nextStore.name} (Priority ${nextStore.priority})`);

    setState(prev => ({
      ...prev,
      currentPriorityIndex: nextIndex,
      currentStore: nextStore,
      triedStores: [
        ...prev.triedStores.map((ts, i) =>
          i === prev.triedStores.length - 1 ? { ...ts, result: 'rejected', reason: rejectionReason } : ts
        ),
        { store: nextStore, result: 'pending', reason: null },
      ],
      lastRejection: rejectionReason,
      isPaused: false,
    }));

    timeoutRef.current = setTimeout(() => {
      handleTimeout(nextIndex, nextStore, orderContext);
    }, DEFAULT_SLA_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacies, advanceToNext]);

  const handleTimeout = useCallback((storeIndex, store, orderContext) => {
    if (!isRunningRef.current) return;
    handleReject(storeIndex, store, { id: 'timeout', label: `No response within SLA time (2 hours)` }, orderContext);
  }, [handleReject]);

  const stopRetry = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    toast.warning('Auto-retry stopped by user');
    setState(prev => ({ ...prev, status: AUTO_RETRY_STATUS.STOPPED, isPaused: true }));
  }, []);

  const resetRetry = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    toast.info('Auto-retry reset — ready to try again');
    setState({
      status: AUTO_RETRY_STATUS.IDLE,
      currentPriorityIndex: -1,
      currentStore: null,
      triedStores: [],
      lastRejection: null,
      isPaused: false,
    });
  }, []);

  return {
    ...state,
    isRunning: state.status === AUTO_RETRY_STATUS.TRYING && !state.isPaused,
    startRetry,
    handleAccept,
    handleReject,
    stopRetry,
    resetRetry,
    setForwardFn,
  };
}
