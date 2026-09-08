import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastConfig {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
}

export interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activeModal: string | null;
  globalLoading: boolean;
  toast: ToastConfig | null;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  sidebarWidth: 260,
  activeModal: null,
  globalLoading: false,
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    showToast: (state, action: PayloadAction<ToastConfig>) => {
      state.toast = action.payload;
    },
    hideToast: (state) => {
      state.toast = null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setSidebarWidth,
  openModal,
  closeModal,
  setGlobalLoading,
  showToast,
  hideToast,
} = uiSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectSidebarCollapsed = (state: { ui: UIState }): boolean => state.ui.sidebarCollapsed;
export const selectSidebarWidth = (state: { ui: UIState }): number => state.ui.sidebarWidth;
export const selectActiveModal = (state: { ui: UIState }): string | null => state.ui.activeModal;
export const selectGlobalLoading = (state: { ui: UIState }): boolean => state.ui.globalLoading;
export const selectToast = (state: { ui: UIState }): ToastConfig | null => state.ui.toast;

export default uiSlice.reducer;
