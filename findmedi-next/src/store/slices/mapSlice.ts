/**
 * Map slice — geocoding, routing, and place state.
 *
 * Ported from client/src/store/slices/mapSlice.js.
 *
 * Uses MapTiler for geocoding and OpenRouteService for routing, with
 * haversine-distance fallbacks when API keys are missing.
 *
 * Environment variables (set NEXT_PUBLIC_ prefix for client-side access):
 *   NEXT_PUBLIC_MAPTILER_API_KEY
 *   NEXT_PUBLIC_USE_MAPTILER_GEOCODING
 *   NEXT_PUBLIC_OPENROUTESERVICE_API_KEY  /  NEXT_PUBLIC_OPENROUTE_API_KEY
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
const USE_MAPTILER_GEOCODING = process.env.NEXT_PUBLIC_USE_MAPTILER_GEOCODING === 'true';
const OPENROUTE_KEY =
  process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY ||
  process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;

type CoordinatePair = [number, number];

interface GeocodingResult {
  placeId: string;
  coordinates: CoordinatePair | null;
  source: 'maptiler' | 'fallback';
  warning: string;
}

interface GeocodingErrorPayload {
  placeId: string;
  message: string;
}

interface RouteResult {
  placeId: string;
  coordinates: CoordinatePair[];
  distance: number;
  duration: number;
  source: 'openrouteservice' | 'fallback';
  warning?: string;
}

interface RouteErrorPayload {
  placeId: string;
  message: string;
}

export interface MapPlace {
  id: string;
  type?: string;
  name?: string;
  address?: string;
  phone?: string;
  rating?: string;
  reviewsCount?: number;
  photo?: string;
  workingHours?: string;
  coordinates?: CoordinatePair;
  coordinateSource?: string;
  raw?: Record<string, unknown>;
}

export interface MapState {
  placesById: Record<string, MapPlace>;
  selectedPlaceId: string | null;
  hoveredPlaceId: string | null;
  currentLocation: { longitude: number; latitude: number; accuracy?: number } | null;
  routesByPlaceId: Record<string, { coordinates: CoordinatePair[]; distance: number; duration: number; source: string; warning?: string }>;
  geocodingStatusByPlaceId: Record<string, { loading: boolean; error: string; warning: string }>;
  routeStatusByPlaceId: Record<string, { loading: boolean; error: string }>;
  locateError: string;
}

const initialState: MapState = {
  placesById: {},
  selectedPlaceId: null,
  hoveredPlaceId: null,
  currentLocation: null,
  routesByPlaceId: {},
  geocodingStatusByPlaceId: {},
  routeStatusByPlaceId: {},
  locateError: '',
};

function toCoordinatePair(coords: unknown): CoordinatePair | null {
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  const obj = coords as { longitude?: number; lng?: number; latitude?: number; lat?: number };
  const lng = Number(obj.longitude ?? obj.lng);
  const lat = Number(obj.latitude ?? obj.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function haversineMeters(from: CoordinatePair, to: CoordinatePair): number {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to[1] - from[1]);
  const dLng = toRad(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from[1])) *
      Math.cos(toRad(to[1])) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const geocodePlace = createAsyncThunk<
  GeocodingResult,
  { placeId: string; address?: string | null; fallbackCoordinates?: unknown },
  { rejectValue: GeocodingErrorPayload }
>('map/geocodePlace', async ({ placeId, address, fallbackCoordinates }, { rejectWithValue }) => {
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
      `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_KEY}&limit=1`,
    );
    if (!response.ok) throw new Error('Unable to geocode address');
    const data: { features?: Array<{ center: unknown }> } = await response.json();
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
        warning: error instanceof Error ? error.message : 'Unable to geocode address',
      };
    }
    return rejectWithValue({ placeId, message: error instanceof Error ? error.message : 'Unable to geocode address' });
  }
});

export const fetchRoute = createAsyncThunk<
  RouteResult,
  { placeId: string; from: unknown; to: unknown },
  { rejectValue: RouteErrorPayload }
>('map/fetchRoute', async ({ placeId, from, to }, { rejectWithValue }) => {
  const destination = toCoordinatePair(to);
  const origin = toCoordinatePair(from);

  if (!origin || !destination) {
    return rejectWithValue({ placeId, message: 'Route needs origin and destination' });
  }

  const fallbackRoute = (warning = ''): RouteResult => {
    const distance = haversineMeters(origin, destination);
    return {
      placeId,
      coordinates: [origin, destination],
      distance,
      duration: (distance / 1000 / 28) * 3600,
      source: 'fallback',
      warning,
    };
  };

  if (!OPENROUTE_KEY) return fallbackRoute('OpenRouteService API key missing');

  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        Authorization: OPENROUTE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: [origin, destination] }),
    });
    if (!response.ok) throw new Error('Unable to fetch route');
    const data: { features?: Array<{ geometry?: { coordinates?: CoordinatePair[] }; properties?: { summary?: { distance?: number; duration?: number } } }> } = await response.json();
    const feature = data?.features?.[0];
    const coords = (feature?.geometry?.coordinates || []) as CoordinatePair[];
    return {
      placeId,
      coordinates: coords,
      distance: feature?.properties?.summary?.distance || 0,
      duration: feature?.properties?.summary?.duration || 0,
      source: 'openrouteservice',
    };
  } catch (error) {
    return fallbackRoute(error instanceof Error ? error.message : 'Unable to fetch route');
  }
});

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    upsertMapPlace(state, action) {
      const place = action.payload as Partial<MapPlace> & { id: string };
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
      const placeId = action.payload as string;
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
        const payload = action.payload as RouteErrorPayload | undefined;
        const placeId = payload?.placeId || action.meta.arg.placeId;
        state.routeStatusByPlaceId[placeId] = {
          loading: false,
          error: payload?.message || 'Unable to fetch route',
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
