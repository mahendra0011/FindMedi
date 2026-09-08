import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import notificationsReducer from './slices/notificationsSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

/** Root reducer combining all slices. */
export const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  notifications: notificationsReducer,
  settings: settingsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

/**
 * Redux store — configured for Next.js.
 * `serialize` check is disabled because we store dates, File objects, and
 * non-serializable UI state (activeModal, toast).
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['notifications', 'ui'],
        ignoredActions: ['notifications/setList', 'ui/openModal', 'ui/showToast'],
      },
    }),
  // In development, Redux DevTools is automatically enabled.
});

// ─── Typed hooks ─────────────────────────────────────────────────────────────

/** Use throughout the app instead of plain `useDispatch` and `useSelector`. */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ─── HMR (Next.js dev mode doesn't need explicit HMR accept like Vite) ──────
// Next.js handles HMR for Redux automatically via the Next.js dev server.
// The old Vite project needed `import.meta.hot.accept` here to preserve
// state across hot reloads, but Next.js does this differently.

export default store;
