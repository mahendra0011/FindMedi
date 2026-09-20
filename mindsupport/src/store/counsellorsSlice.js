import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

const initialState = {
  items: [],
  selectedCounsellor: null,
  filters: {
    search: "",
    category: "All",
    concernTags: [],
    gender: "",
    language: "",
    consultMode: "",
    availability: "",
    priceMin: "",
    priceMax: "",
    experience: "",
    qualification: "",
    specialization: "",
    rating: "",
    verifiedOnly: false,
    ageGroup: "",
    packageType: "",
    firstSessionFree: false,
    location: "",
    sortBy: "popular",
  },
  status: "idle",
  error: null,
};

export const fetchCounsellors = createAsyncThunk(
  "counsellors/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/counsellors");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load counsellors");
    }
  }
);

export const fetchCounsellorById = createAsyncThunk(
  "counsellors/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/counsellors/${encodeURIComponent(id)}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load counsellor");
    }
  }
);

const counsellorsSlice = createSlice({
  name: "counsellors",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    clearCounsellors() {
      return initialState;
    },
    setSelectedCounsellor(state, action) {
      state.selectedCounsellor = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCounsellors.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCounsellors.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCounsellors.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchCounsellorById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCounsellorById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selectedCounsellor = action.payload;
      })
      .addCase(fetchCounsellorById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, clearCounsellors, setSelectedCounsellor } = counsellorsSlice.actions;

export const selectCounsellors = (state) => state.counsellors.items;
export const selectSelectedCounsellor = (state) => state.counsellors.selectedCounsellor;
export const selectCounsellorsStatus = (state) => state.counsellors.status;
export const selectCounsellorsError = (state) => state.counsellors.error;
export const selectCounsellorsFilters = (state) => state.counsellors.filters;

export default counsellorsSlice.reducer;
