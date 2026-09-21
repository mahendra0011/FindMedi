import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: false,
  mobileMenuOpen: false,
  activeModal: null,
  modalData: null,
  globalLoading: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setMobileMenuOpen(state, action) {
      state.mobileMenuOpen = action.payload;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    openModal(state, action) {
      state.activeModal = action.payload.name;
      state.modalData = action.payload.data || null;
    },
    closeModal(state) {
      state.activeModal = null;
      state.modalData = null;
    },
    setGlobalLoading(state, action) {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setMobileMenuOpen,
  toggleMobileMenu,
  openModal,
  closeModal,
  setGlobalLoading,
} = uiSlice.actions;

export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectMobileMenuOpen = (state) => state.ui.mobileMenuOpen;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectModalData = (state) => state.ui.modalData;
export const selectGlobalLoading = (state) => state.ui.globalLoading;

export default uiSlice.reducer;
