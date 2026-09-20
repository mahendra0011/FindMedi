import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api, clearSession, getStoredToken, getStoredUser, getStoredRefreshToken, storeSession, } from "@/lib/api";
import { sanitizeInput } from "@/lib/sanitize";

function sanitizePayload(payload) {
    const sanitized = { ...payload };
    if (sanitized.email) sanitized.email = sanitizeInput(sanitized.email);
    if (sanitized.name) sanitized.name = sanitizeInput(sanitized.name);
    if (sanitized.username) sanitized.username = sanitizeInput(sanitized.username);
    if (sanitized.phone) sanitized.phone = sanitizeInput(sanitized.phone);
    return sanitized;
}

const initialState = {
    user: getStoredUser(),
    token: getStoredToken(),
    refreshToken: getStoredRefreshToken(),
    status: "idle",
    error: null,
};
export const loginUser = createAsyncThunk("auth/login", async (payload) => {
    const { data } = await api.post("/api/auth/login", sanitizePayload(payload));
    return data;
});
export const registerUser = createAsyncThunk("auth/register", async (payload) => {
    const { data } = await api.post("/api/auth/register", sanitizePayload(payload));
    return data;
});
export const loadCurrentUser = createAsyncThunk("auth/me", async () => {
    const { data } = await api.get("/api/auth/me");
    return data.user;
});
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout(state) {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.status = "idle";
            state.error = null;
            clearSession();
        },
        setCredentials(state, action) {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken || state.refreshToken;
            state.error = null;
            storeSession(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
            .addCase(loginUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            storeSession(action.payload);
        })
            .addCase(loginUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message || "Login failed";
        })
            .addCase(registerUser.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
            .addCase(registerUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            storeSession(action.payload);
        })
            .addCase(registerUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message || "Signup failed";
        })
            .addCase(loadCurrentUser.pending, (state) => {
            state.status = "loading";
        })
            .addCase(loadCurrentUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload;
            localStorage.setItem("mindsupport_user", JSON.stringify(action.payload));
        })
            .addCase(loadCurrentUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error?.message || "Session load failed";
            if (String(action.error?.message || "").includes("401")) {
              state.user = null;
              state.token = null;
              state.refreshToken = null;
              clearSession();
            }
        })
    },
});
export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;
