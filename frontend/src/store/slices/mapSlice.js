import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api';
import { decodePolyline6 } from '@/lib/navigation';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const USE_MAPTILER_GEOCODING = import.meta.env.VITE_USE_MAPTILER_GEOCODING === 'true';

function toCoordinatePair(coords) {
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  const lng = Number(coords.longitude ?? coords.lng);
  const lat = Number(coords.latitude ?? coords.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function haversineMeters(from, to) {
  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const geocodePlace = createAsyncThunk(
  'map/geocodePlace',
  async ({ placeId, address, fallbackCoordinates }, { rejectWithValue }) => {
    const fallback = toCoordinatePair(fallbackCoordinates);

    if (!address || !MAPTILER_KEY || !USE_MAPTILER_GEOCODING) {
      return {
        placeId,
        coordinates: fallback,
        source: 'fallback',
        warning: !address
          ? 'Address missing'
          : !MAPTILER_KEY
            ? 'MapTiler API key missing'
            : 'MapTiler geocoding disabled',
      };
    }

    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_KEY}&limit=1`
      );
      if (!response.ok) throw new Error('Unable to geocode address');
      const data = await response.json();
      const center = data?.features?.[0]?.center;
      const coordinates = toCoordinatePair(center);
      return {
        placeId,
        coordinates: coordinates || fallback,
        source: coordinates ? 'maptiler' : 'fallback',
        warning: coordinates ? '' : 'No geocode result',
      };
    } catch (error) {
      if (fallback) {
        return {
          placeId,
          coordinates: fallback,
          source: 'fallback',
          warning: error.message || 'Unable to geocode address',
        };
      }
      return rejectWithValue({ placeId, message: error.message || 'Unable to geocode address' });
    }
  }
);

export const fetchRoute = createAsyncThunk(
  'map/fetchRoute',
  async ({ placeId, from, to }, { rejectWithValue }) => {
    const destination = toCoordinatePair(to);
    const origin = toCoordinatePair(from);

    if (!origin || !destination) {
      return rejectWithValue({ placeId, message: 'Route needs origin and destination' });
    }

    const originObject = { longitude: origin[0], latitude: origin[1] };
    const destinationObject = { longitude: destination[0], latitude: destination[1] };

    // Last-resort only: fires when the routing service itself is unreachable
    // (Valhalla container down). NOT a routine path — the backend is
    // self-hosted, so there is no third-party quota to exhaust here.
    const fallbackRoute = (warning = '') => {
      const distance = haversineMeters(originObject, destinationObject);
      return {
        placeId,
        coordinates: [origin, destination],
        distance,
        duration: (distance / 1000 / 28) * 3600,
        source: 'fallback',
        warning,
      };
    };

    try {
      // Same endpoint NavigationController already uses, so the route preview
      // and the guided-navigation route always come from one source of truth.
      // Uses apiClient (not bare fetch) so the configured base URL, the CSRF
      // header and the 401-refresh interceptor all apply — a relative
      // '/api/...' fetch would hit the frontend origin in production.
      const { data } = await apiClient.post('/routing/navigation', {
        origin,
        destination,
        costing: 'auto',
      });

      // Valhalla returns a precision-6 encoded polyline, not GeoJSON coords.
      const coordinates = decodePolyline6(data?.shape || '');
      if (coordinates.length < 2) {
        // The backend swallows a Valhalla outage and returns HTTP 200 with an
        // empty shape, so an empty decode is the "engine is down" signal.
        const degraded = data?.source === 'haversine_fallback';
        throw new Error(
          degraded
            ? 'Routing service unavailable — showing direct line'
            : 'Routing service returned no route',
        );
      }

      return {
        placeId,
        coordinates,
        distance: (Number(data?.distanceKm) || 0) * 1000, // metres — formatDistance() expects metres
        duration: Number(data?.durationSeconds) || 0,
        source: 'valhalla',
      };
    } catch (error) {
      return fallbackRoute(error.message || 'Unable to fetch route');
    }
  }
);

const mapSlice = createSlice({
  name: 'map',
  initialState: {
    placesById: {},
    selectedPlaceId: null,
    hoveredPlaceId: null,
    currentLocation: null,
    routesByPlaceId: {},
    geocodingStatusByPlaceId: {},
    routeStatusByPlaceId: {},
    locateError: '',
  },
  reducers: {
    upsertMapPlace(state, action) {
      const place = action.payload;
      if (!place?.id) return;
      state.placesById[place.id] = {
        ...state.placesById[place.id],
        ...place,
      };
    },
    selectMapPlace(state, action) {
      state.selectedPlaceId = action.payload || null;
    },
    hoverMapPlace(state, action) {
      state.hoveredPlaceId = action.payload || null;
    },
    setCurrentLocation(state, action) {
      state.currentLocation = action.payload || null;
      state.locateError = '';
    },
    setLocateError(state, action) {
      state.locateError = action.payload || '';
    },
    clearMapRoute(state, action) {
      const placeId = action.payload;
      if (placeId) delete state.routesByPlaceId[placeId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(geocodePlace.pending, (state, action) => {
        state.geocodingStatusByPlaceId[action.meta.arg.placeId] = {
          loading: true,
          error: '',
          warning: '',
        };
      })
      .addCase(geocodePlace.fulfilled, (state, action) => {
        const { placeId, coordinates, source, warning } = action.payload;
        if (coordinates) {
          state.placesById[placeId] = {
            ...state.placesById[placeId],
            id: placeId,
            coordinates,
            coordinateSource: source,
          };
        }
        state.geocodingStatusByPlaceId[placeId] = {
          loading: false,
          error: '',
          warning: warning || '',
        };
      })
      .addCase(geocodePlace.rejected, (state, action) => {
        const placeId = action.payload?.placeId || action.meta.arg.placeId;
        state.geocodingStatusByPlaceId[placeId] = {
          loading: false,
          error: action.payload?.message || 'Unable to geocode address',
          warning: '',
        };
      })
      .addCase(fetchRoute.pending, (state, action) => {
        state.routeStatusByPlaceId[action.meta.arg.placeId] = {
          loading: true,
          error: '',
        };
      })
      .addCase(fetchRoute.fulfilled, (state, action) => {
        const { placeId, coordinates, distance, duration, source, warning } = action.payload;
        state.routesByPlaceId[placeId] = { coordinates, distance, duration, source, warning };
        state.routeStatusByPlaceId[placeId] = { loading: false, error: '' };
      })
      .addCase(fetchRoute.rejected, (state, action) => {
        const placeId = action.payload?.placeId || action.meta.arg.placeId;
        state.routeStatusByPlaceId[placeId] = {
          loading: false,
          error: action.payload?.message || 'Unable to fetch route',
        };
      });
  },
});

export const {
  upsertMapPlace,
  selectMapPlace,
  hoverMapPlace,
  setCurrentLocation,
  setLocateError,
  clearMapRoute,
} = mapSlice.actions;

export default mapSlice.reducer;
