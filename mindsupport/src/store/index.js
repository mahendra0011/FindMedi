import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import notificationsReducer from "./notificationsSlice";
import counsellorsReducer from "./counsellorsSlice";
import revenueReducer from "./revenueSlice";
import uiReducer from "./uiSlice";
import packagesReducer from "./packagesSlice";
export const store = configureStore({
    reducer: {
        auth: authReducer,
        notifications: notificationsReducer,
        counsellors: counsellorsReducer,
        revenue: revenueReducer,
        ui: uiReducer,
        packages: packagesReducer,
    },
});

