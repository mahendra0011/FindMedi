import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/mind/lib/api";

const initialState = {
  adminRevenue: null,
  counsellorEarnings: null,
  transactions: [],
  monthlyTrends: [],
  status: "idle",
  error: null,
};

export const fetchAdminRevenue = createAsyncThunk(
  "revenue/fetchAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/admin/dashboard");
      return {
        revenue: data.revenue || {},
        analytics: data.analytics || {},
        stats: data.stats || {},
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load revenue data");
    }
  }
);

export const fetchCounsellorEarnings = createAsyncThunk(
  "revenue/fetchCounsellor",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/counsellor/dashboard");
      return {
        earnings: data.earnings || {},
        stats: data.stats || {},
        transactions: data.earnings?.transactions || [],
        monthly: data.earnings?.monthly || [],
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load earnings data");
    }
  }
);

const revenueSlice = createSlice({
  name: "revenue",
  initialState,
  reducers: {
    clearRevenue() {
      return initialState;
    },
    setAdminRevenueFromDashboard(state, action) {
      const { revenue, analytics } = action.payload;
      state.adminRevenue = revenue || {};
      state.monthlyTrends = analytics?.revenueTrends || [];
      state.status = "succeeded";
    },
    setCounsellorEarningsFromDashboard(state, action) {
      const { earnings, stats } = action.payload;
      state.counsellorEarnings = earnings || {};
      state.transactions = earnings?.transactions || [];
      state.monthlyTrends = earnings?.monthly || [];
      state.status = "succeeded";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminRevenue.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminRevenue.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.adminRevenue = action.payload.revenue;
        state.monthlyTrends = action.payload.analytics.revenueTrends || [];
        state.transactions = [];
      })
      .addCase(fetchAdminRevenue.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchCounsellorEarnings.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCounsellorEarnings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.counsellorEarnings = action.payload.earnings;
        state.transactions = action.payload.transactions || [];
        state.monthlyTrends = action.payload.monthly || [];
      })
      .addCase(fetchCounsellorEarnings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearRevenue, setAdminRevenueFromDashboard, setCounsellorEarningsFromDashboard } = revenueSlice.actions;

export const selectAdminRevenue = (state) => state.revenue.adminRevenue;
export const selectCounsellorEarnings = (state) => state.revenue.counsellorEarnings;
export const selectRevenueTransactions = (state) => state.revenue.transactions;
export const selectRevenueMonthlyTrends = (state) => state.revenue.monthlyTrends;
export const selectRevenueStatus = (state) => state.revenue.status;
export const selectRevenueError = (state) => state.revenue.error;

export default revenueSlice.reducer;
