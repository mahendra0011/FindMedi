import { createSlice } from '@reduxjs/toolkit';

// File 05 §3 — single instant-dispatch slice, `type` field differentiates
// ride | lawyer | assistant | emergency_doctor | sos. The useInstantDispatch
// hook owns socket subscriptions; this slice owns shareable UI state
// (banner, dashboard badges, cross-page request tracking).
const initialState = {
  type: null,
  requestId: null,
  status: 'idle',
  currentRadiusKm: 5,
  maxRadiusKm: 20,
  assignedProvider: null,
  windowEndsAt: null,
};

const instantDispatchSlice = createSlice({
  name: 'instantDispatch',
  initialState,
  reducers: {
    searchStarted: (state, action) => {
      const { type, requestId, maxRadiusKm } = action.payload;
      state.type = type;
      state.requestId = requestId;
      state.status = 'searching';
      state.currentRadiusKm = 5;
      if (maxRadiusKm != null) state.maxRadiusKm = maxRadiusKm;
      state.assignedProvider = null;
      state.windowEndsAt = null;
    },
    searchRadiusUpdated: (state, action) => {
      state.currentRadiusKm = action.payload.radiusKm;
    },
    dispatchAssigned: (state, action) => {
      state.status = 'assigned';
      state.assignedProvider = action.payload.provider || null;
      state.windowEndsAt = action.payload.windowEndsAt || null;
    },
    dispatchInProgress: (state) => {
      state.status = 'in_progress';
    },
    dispatchCompleted: (state) => {
      state.status = 'completed';
    },
    noRespondersFound: (state) => {
      state.status = 'no_responders_found';
    },
    dispatchCancelled: (state) => {
      state.status = 'cancelled';
      state.requestId = null;
      state.assignedProvider = null;
      state.windowEndsAt = null;
    },
    instantDispatchReset: () => initialState,
  },
});

export const {
  searchStarted,
  searchRadiusUpdated,
  dispatchAssigned,
  dispatchInProgress,
  dispatchCompleted,
  noRespondersFound,
  dispatchCancelled,
  instantDispatchReset,
} = instantDispatchSlice.actions;

export const selectInstantDispatch = (state) => state.instantDispatch;
export const selectInstantStatus = (state) => state.instantDispatch.status;

export default instantDispatchSlice.reducer;
