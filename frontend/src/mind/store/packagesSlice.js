import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/mind/lib/api";

const initialState = {
  supportPackages: [],
  myPackages: [],
  selectedPackage: null,
  status: "idle",
  error: null,
};

export const fetchSupportPackages = createAsyncThunk(
  "packages/fetchSupport",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/admin/packages");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load packages");
    }
  }
);

export const createSupportPackage = createAsyncThunk(
  "packages/createSupport",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/admin/packages", payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create package");
    }
  }
);

export const updateSupportPackage = createAsyncThunk(
  "packages/updateSupport",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/admin/packages/${encodeURIComponent(id)}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update package");
    }
  }
);

export const deleteSupportPackage = createAsyncThunk(
  "packages/deleteSupport",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/packages/${encodeURIComponent(id)}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete package");
    }
  }
);

export const fetchMyPackages = createAsyncThunk(
  "packages/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/packages/my");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load your packages");
    }
  }
);

export const purchasePackage = createAsyncThunk(
  "packages/purchase",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/packages/purchase", payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to purchase package");
    }
  }
);

export const updatePackageStatus = createAsyncThunk(
  "packages/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/packages/${encodeURIComponent(id)}/status`, { status });
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update package status");
    }
  }
);

export const requestPackageRefund = createAsyncThunk(
  "packages/refund",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/api/packages/${encodeURIComponent(id)}/refund`);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to request refund");
    }
  }
);

const packagesSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {
    clearPackages() {
      return initialState;
    },
    setSelectedPackage(state, action) {
      state.selectedPackage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupportPackages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSupportPackages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.supportPackages = action.payload;
      })
      .addCase(fetchSupportPackages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createSupportPackage.fulfilled, (state, action) => {
        state.supportPackages.push(action.payload);
      })
      .addCase(createSupportPackage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateSupportPackage.fulfilled, (state, action) => {
        const i = state.supportPackages.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.supportPackages[i] = action.payload;
      })
      .addCase(updateSupportPackage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteSupportPackage.fulfilled, (state, action) => {
        state.supportPackages = state.supportPackages.filter((p) => p.id !== action.payload);
      })
      .addCase(deleteSupportPackage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchMyPackages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMyPackages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.myPackages = action.payload;
      })
      .addCase(fetchMyPackages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(purchasePackage.fulfilled, (state, action) => {
        state.myPackages.unshift(action.payload);
      })
      .addCase(purchasePackage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updatePackageStatus.fulfilled, (state, action) => {
        const i = state.myPackages.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.myPackages[i] = action.payload;
      })
      .addCase(requestPackageRefund.fulfilled, (state, action) => {
        const i = state.myPackages.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.myPackages[i] = { ...state.myPackages[i], status: "refunded" };
      });
  },
});

export const { clearPackages, setSelectedPackage } = packagesSlice.actions;

export const selectSupportPackages = (state) => state.packages.supportPackages;
export const selectMyPackages = (state) => state.packages.myPackages;
export const selectSelectedPackage = (state) => state.packages.selectedPackage;
export const selectPackagesStatus = (state) => state.packages.status;
export const selectPackagesError = (state) => state.packages.error;

export default packagesSlice.reducer;
