import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import notificationsReducer from './slices/notificationsSlice';
import cartReducer from './slices/cartSlice';
import mapReducer from './slices/mapSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  settings: settingsReducer,
  ui: uiReducer,
  notifications: notificationsReducer,
  cart: cartReducer,
  map: mapReducer,
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
