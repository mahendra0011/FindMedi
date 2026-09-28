import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import notificationsReducer from './slices/notificationsSlice';
import cartReducer from './slices/cartSlice';
import mapReducer from './slices/mapSlice';
import instantDispatchReducer from './slices/instantDispatchSlice';

// NOTE: slices/uiSlice (sidebar/modal/toast) was removed — it had zero
// consumers (all UI state lives in local useState or shadcn's useSidebar).
// NOTE: settingsSlice was migrated to Zustand (store/useSettingsStore.js) —
// pure-UI preferences no longer belong in Redux (tech-stack audit, Phase 6).

const rootReducer = combineReducers({
  auth: authReducer,
  notifications: notificationsReducer,
  cart: cartReducer,
  map: mapReducer,
  instantDispatch: instantDispatchReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

// ─── Vite HMR boundary ─────────────────────────────────────────────────────
// Bina iske har slice/store edit Vite ko full page reload karwata tha →
// initializeAuth dobara chalta tha → access token expire ho to logout.
// HMR accept karne se Redux state memory me preserve rehta hai, sirf reducer
// hot-swap hota hai. User logged-in hi rehta hai code change par.
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && newModule.rootReducer) {
      store.replaceReducer(newModule.rootReducer);
    }
  });
}

export { rootReducer };
export default store;
