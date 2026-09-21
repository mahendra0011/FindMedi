import { configureStore } from "@reduxjs/toolkit";
import notificationsReducer from "./notificationsSlice";
import counsellorsReducer from "./counsellorsSlice";
import revenueReducer from "./revenueSlice";
import uiReducer from "./uiSlice";
import packagesReducer from "./packagesSlice";
export const store = configureStore({
    reducer: {
        notifications: notificationsReducer,
        counsellors: counsellorsReducer,
        revenue: revenueReducer,
        ui: uiReducer,
        packages: packagesReducer,
    },
});

