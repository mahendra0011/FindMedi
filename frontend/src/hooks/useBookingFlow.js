/**
 * useBookingFlow.js
 *
 * Universal booking & checkout flow hook.
 * Covers: Medicine ordering, Test booking, Appointment booking.
 *
 * Flow:
 *   Item(s) selected → Cart / Selection
 *     ↓
 *   Decision: Prescription required?
 *     ├─ No  → Address / Slot + Payment → Order / Booking Placed
 *     └─ Yes → Upload Prescription (or select saved)
 *               → Provider / Pharmacist verifies
 *                 ├─ Accepted → continues to Address / Slot + Payment → Order Placed
 *                 └─ Rejected → Auto-retry with next Preferred Provider (if opted in)
 *                       ├─ Accepted at next provider → Order Placed
 *                       └─ All preferred providers exhausted → Manual action required
 *     ↓
 *   Order Tracking:
 *     [Medicine]    Placed → Rx Verified → Confirmed by Store → Packed → Out for Delivery → Delivered
 *     [Test]        Placed → Rx Verified → Confirmed by Lab → Sample Collected → Report Processing → Report Ready
 *     [Appointment] Booked → Confirmed by Clinic → Reminder Sent → In Progress → Completed
 */

import { useCallback, useReducer, useRef } from 'react';
import { toast } from 'sonner';

// ─── Flow Types ────────────────────────────────────────────────────────────────
export const FLOW_TYPE = {
  MEDICINE:    'medicine',
  TEST:        'test',
  APPOINTMENT: 'appointment',
};

// ─── Booking Steps per Flow Type ───────────────────────────────────────────────
// The 'prescription' step is filtered out if hasRxItems is false.
export const FLOW_STEPS = {
  [FLOW_TYPE.MEDICINE]: [
    { key: 'address',      label: 'Address',      icon: 'MapPin' },
    { key: 'delivery',     label: 'Delivery',     icon: 'Truck' },
    { key: 'prescription', label: 'Prescription', icon: 'FileText' },
    { key: 'summary',      label: 'Summary',      icon: 'Shield' },
    { key: 'payment',      label: 'Payment',      icon: 'CreditCard' },
  ],
  [FLOW_TYPE.TEST]: [
    { key: 'tests',        label: 'Tests',        icon: 'FlaskConical' },
    { key: 'collection',   label: 'Collection',   icon: 'MapPin' },
    { key: 'slot',         label: 'Slot',         icon: 'Calendar' },
    { key: 'prescription', label: 'Prescription', icon: 'FileText' },
    { key: 'summary',      label: 'Summary',      icon: 'Shield' },
    { key: 'payment',      label: 'Payment',      icon: 'CreditCard' },
  ],
  [FLOW_TYPE.APPOINTMENT]: [
    { key: 'doctor',   label: 'Doctor',   icon: 'User' },
    { key: 'slot',     label: 'Slot',     icon: 'Calendar' },
    { key: 'symptoms', label: 'Symptoms', icon: 'Activity' },
    { key: 'summary',  label: 'Summary',  icon: 'Shield' },
    { key: 'payment',  label: 'Payment',  icon: 'CreditCard' },
  ],
};

// ─── Order Tracking Stages per Flow Type ───────────────────────────────────────
export const TRACKING_STAGES = {
  [FLOW_TYPE.MEDICINE]: (hasRx) => [
    { key: 'placed',           label: 'Order Placed',          icon: 'Package' },
    ...(hasRx ? [{ key: 'rx_verified', label: 'Prescription Verified', icon: 'CheckCircle2' }] : []),
    { key: 'confirmed',        label: 'Confirmed by Store',    icon: 'Store' },
    { key: 'packed',           label: 'Packed & Ready',        icon: 'Package' },
    { key: 'out_for_delivery', label: 'Out for Delivery',      icon: 'Truck' },
    { key: 'delivered',        label: 'Delivered',             icon: 'Home' },
  ],
  [FLOW_TYPE.TEST]: (hasRx) => [
    { key: 'placed',            label: 'Booking Placed',        icon: 'Package' },
    ...(hasRx ? [{ key: 'rx_verified', label: 'Prescription Verified', icon: 'CheckCircle2' }] : []),
    { key: 'confirmed',         label: 'Confirmed by Lab',      icon: 'Store' },
    { key: 'sample_collected',  label: 'Sample Collected',      icon: 'FlaskConical' },
    { key: 'report_processing', label: 'Report Processing',     icon: 'Activity' },
    { key: 'report_ready',      label: 'Report Ready',          icon: 'FileText' },
  ],
  [FLOW_TYPE.APPOINTMENT]: (_hasRx) => [
    { key: 'booked',      label: 'Appointment Booked',  icon: 'Calendar' },
    { key: 'confirmed',   label: 'Confirmed by Clinic', icon: 'CheckCircle2' },
    { key: 'reminder',    label: 'Reminder Sent',       icon: 'Bell' },
    { key: 'in_progress', label: 'In Progress',         icon: 'Activity' },
    { key: 'completed',   label: 'Completed',           icon: 'CheckCircle2' },
  ],
};

// ─── Rx Verification Status ────────────────────────────────────────────────────
export const RX_STATUS = {
  IDLE:     'idle',
  UPLOADED: 'uploaded',
  PENDING:  'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// ─── Rx Rejection Reasons (mirrored in useAutoRetry for consistency) ───────────
export const RX_REJECTION_REASONS = [
  { id: 'blurry',        label: 'Unclear/blurry prescription image' },
  { id: 'expired',       label: 'Prescription has expired' },
  { id: 'name_mismatch', label: 'Medicine name does not match handwriting' },
  { id: 'stamp_missing', label: 'Doctor signature/stamp missing' },
  { id: 'qty_exceeded',  label: 'Requested quantity exceeds prescribed amount' },
  { id: 'other',         label: 'Other reason' },
];

// ─── Reducer ───────────────────────────────────────────────────────────────────
const initialState = {
  step:             0,
  rxStatus:         RX_STATUS.IDLE,
  rxFile:           null,        // { name, preview }
  rxRejection:      null,        // { id, label }
  rxHistory:        [],          // [{ name, date }] — saved prescriptions
  address:          null,
  deliveryMode:     'delivery',
  deliverySlot:     null,
  slot:             null,
  collectionMode:   'lab',
  paymentMethod:    'cod',
  couponCode:       '',
  appliedCoupon:    null,
  isPlacingOrder:   false,
  orderPlaced:      false,
  orderIds:         [],
  providerSwitched: false,
  activeProviderId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':         return { ...state, step: action.payload };
    case 'NEXT_STEP':        return { ...state, step: state.step + 1 };
    case 'PREV_STEP':        return { ...state, step: Math.max(0, state.step - 1) };
    case 'SET_RX_FILE':      return { ...state, rxFile: action.payload, rxStatus: RX_STATUS.UPLOADED };
    case 'SUBMIT_RX':        return { ...state, rxStatus: RX_STATUS.PENDING, rxRejection: null };
    case 'VERIFY_RX':        return { ...state, rxStatus: RX_STATUS.VERIFIED, rxRejection: null };
    case 'REJECT_RX':        return { ...state, rxStatus: RX_STATUS.REJECTED, rxRejection: action.payload };
    case 'RESET_RX':         return { ...state, rxStatus: RX_STATUS.IDLE, rxFile: null, rxRejection: null };
    case 'ADD_SAVED_RX':
      return { ...state, rxHistory: [...state.rxHistory, { name: action.payload, date: new Date().toISOString() }] };
    case 'SELECT_SAVED_RX':
      return { ...state, rxFile: { name: action.payload, preview: null }, rxStatus: RX_STATUS.UPLOADED };
    case 'SET_ADDRESS':        return { ...state, address: action.payload };
    case 'SET_DELIVERY_MODE':  return { ...state, deliveryMode: action.payload };
    case 'SET_DELIVERY_SLOT':  return { ...state, deliverySlot: action.payload };
    case 'SET_SLOT':           return { ...state, slot: action.payload };
    case 'SET_COLLECTION_MODE':return { ...state, collectionMode: action.payload };
    case 'SET_PAYMENT':        return { ...state, paymentMethod: action.payload };
    case 'SET_COUPON':         return { ...state, couponCode: action.payload };
    case 'APPLY_COUPON':       return { ...state, appliedCoupon: action.payload };
    case 'REMOVE_COUPON':      return { ...state, appliedCoupon: null, couponCode: '' };
    case 'SET_PLACING':        return { ...state, isPlacingOrder: action.payload };
    case 'ORDER_PLACED':       return { ...state, orderPlaced: true, isPlacingOrder: false, orderIds: action.payload };
    case 'SET_PROVIDER':
      return { ...state, providerSwitched: true, activeProviderId: action.payload };
    default:
      return state;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
/**
 * @param {string} flowType  - FLOW_TYPE.MEDICINE | TEST | APPOINTMENT
 * @param {object} options
 *   @param {boolean} options.hasRxItems           - whether the selection contains Rx-required items
 *   @param {function} options.onOrderPlaced       - callback(orderIds)
 *   @param {number}  options.simulateVerifyMs     - ms before simulated verification resolves (default 4000)
 *   @param {number}  options.verifyProbability    - 0-1 chance of auto-verify in demo (default 0.4)
 */
export function useBookingFlow(flowType = FLOW_TYPE.MEDICINE, options = {}) {
  const {
    hasRxItems = false,
    onOrderPlaced = null,
    simulateVerifyMs = 4000,
    verifyProbability = 0.4,
  } = options;

  const [state, dispatch] = useReducer(reducer, initialState);
  const verifyTimerRef = useRef(null);

  // ── Active steps (filters out prescription step if no Rx items) ──
  const activeSteps = (FLOW_STEPS[flowType] || FLOW_STEPS[FLOW_TYPE.MEDICINE])
    .filter(s => s.key !== 'prescription' || hasRxItems);

  const isLastStep = state.step >= activeSteps.length - 1;

  // ── Navigation ──
  const goNext   = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const goBack   = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const goToStep = useCallback((idx) => dispatch({ type: 'SET_STEP', payload: idx }), []);

  // ── Rx file management ──
  const uploadRxFile = useCallback((file) => {
    dispatch({ type: 'SET_RX_FILE', payload: { name: file.name, preview: null } });
    toast.success(`Prescription ready: ${file.name}`);
  }, []);

  const selectSavedRx = useCallback((name) => {
    dispatch({ type: 'SELECT_SAVED_RX', payload: name });
    toast.info(`Selected: ${name}`);
  }, []);

  /**
   * Submit prescription for provider review.
   * Simulates async verification. On rejection, caller should invoke
   * useAutoRetry.startRetry() when auto-retry is enabled.
   *
   * @param {function} onVerified  - called when pharmacist accepts
   * @param {function} onRejected  - called with rejection reason { id, label }
   */
  const submitRx = useCallback((onVerified, onRejected) => {
    if (state.rxStatus === RX_STATUS.IDLE) {
      toast.error('Please upload a prescription first');
      return;
    }

    dispatch({ type: 'SUBMIT_RX' });
    if (state.rxFile?.name) {
      dispatch({ type: 'ADD_SAVED_RX', payload: state.rxFile.name });
    }
    toast.info('Prescription submitted — awaiting pharmacist review...');

    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);

    verifyTimerRef.current = setTimeout(() => {
      if (Math.random() < verifyProbability) {
        dispatch({ type: 'VERIFY_RX' });
        toast.success('✅ Prescription verified by pharmacist!');
        onVerified?.();
      } else {
        const reason = RX_REJECTION_REASONS[
          Math.floor(Math.random() * (RX_REJECTION_REASONS.length - 1))
        ];
        dispatch({ type: 'REJECT_RX', payload: reason });
        toast.error(`❌ Rejected: ${reason.label}`);
        onRejected?.(reason);
      }
    }, simulateVerifyMs);
  }, [state.rxStatus, state.rxFile, verifyProbability, simulateVerifyMs]);

  const resetRx = useCallback(() => {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    dispatch({ type: 'RESET_RX' });
  }, []);

  // ── Order placement ──
  /**
   * Build params and navigate to confirmation or payment gateway.
   * @param {function} navigate     - react-router navigate fn
   * @param {object}   extraParams  - additional URLSearchParams key-values
   */
  const placeOrder = useCallback((navigate, extraParams = {}) => {
    dispatch({ type: 'SET_PLACING', payload: true });

    const count = extraParams.storeCount || 1;
    const orderIds = Array.from({ length: count }, (_, i) =>
      `ORD${crypto.randomUUID()}-${i + 1}`
    );

    dispatch({ type: 'ORDER_PLACED', payload: orderIds });
    onOrderPlaced?.(orderIds);

    const params = new URLSearchParams({
      orderIds: orderIds.join(','),
      type: flowType,
      rx: hasRxItems ? 'true' : 'false',
      ...Object.fromEntries(
        Object.entries(extraParams).filter(([k]) => k !== 'storeCount')
      ),
    });

    if (state.paymentMethod === 'cod') {
      navigate?.(`/order-confirmation?${params}`);
    } else {
      params.set('method', state.paymentMethod);
      navigate?.(`/payment-gateway?${params}`);
    }
  }, [flowType, hasRxItems, state.paymentMethod, onOrderPlaced]);

  // ── Provider switch notification (from AutoRetry) ──
  const notifyProviderSwitch = useCallback((provider) => {
    dispatch({ type: 'SET_PROVIDER', payload: provider.id });
    toast.info(`Prescription forwarded to ${provider.name}`);
  }, []);

  // ── Tracking stages for this flow ──
  const getTrackingStages = useCallback(() => {
    const stageFn = TRACKING_STAGES[flowType] || TRACKING_STAGES[FLOW_TYPE.MEDICINE];
    return stageFn(hasRxItems);
  }, [flowType, hasRxItems]);

  return {
    // state snapshot
    ...state,
    hasRxItems,
    flowType,
    activeSteps,
    isLastStep,

    // navigation
    goNext,
    goBack,
    goToStep,

    // Rx
    uploadRxFile,
    selectSavedRx,
    submitRx,
    resetRx,

    // order
    placeOrder,
    notifyProviderSwitch,
    getTrackingStages,

    // field setters (dispatch wrappers)
    setAddress:        (v) => dispatch({ type: 'SET_ADDRESS',        payload: v }),
    setDeliveryMode:   (v) => dispatch({ type: 'SET_DELIVERY_MODE',  payload: v }),
    setDeliverySlot:   (v) => dispatch({ type: 'SET_DELIVERY_SLOT',  payload: v }),
    setSlot:           (v) => dispatch({ type: 'SET_SLOT',           payload: v }),
    setCollectionMode: (v) => dispatch({ type: 'SET_COLLECTION_MODE',payload: v }),
    setPayment:        (v) => dispatch({ type: 'SET_PAYMENT',        payload: v }),
    setCoupon:         (v) => dispatch({ type: 'SET_COUPON',         payload: v }),
    applyCoupon:       (v) => dispatch({ type: 'APPLY_COUPON',       payload: v }),
    removeCoupon:      ()  => dispatch({ type: 'REMOVE_COUPON' }),
  };
}
