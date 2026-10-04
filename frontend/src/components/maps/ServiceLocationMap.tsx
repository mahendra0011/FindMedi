import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import * as maplibregl from 'maplibre-gl';
import { AlertCircle, Clock, Loader2, LocateFixed, MapPin, Navigation, Phone, Route, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from '@/components/ui/map';
import { cn } from '@/lib/utils';
import NavigationController from '@/components/maps/NavigationController';
import {
  fetchRoute,
  geocodePlace,
  selectMapPlace,
  setCurrentLocation,
  setLocateError,
  upsertMapPlace,
} from '@/store/slices/mapSlice';

const BASE_ASSET_PATH = import.meta.env.BASE_URL || '/';

const TYPE_CONFIG = {
  hospital: {
    label: 'Hospital',
    icon: `${BASE_ASSET_PATH}images/map-icons/hospital.svg?v=clean-2`,
    routeColor: '#0f766e',
    ring: 'ring-teal-500/30',
    markerBg: 'bg-teal-500',
  },
  clinic: {
    label: 'Clinic',
    icon: `${BASE_ASSET_PATH}images/map-icons/clinic.svg?v=clean-2`,
    routeColor: '#2563eb',
    ring: 'ring-blue-500/30',
    markerBg: 'bg-blue-500',
  },
  lab: {
    label: 'Diagnostic Lab',
    icon: `${BASE_ASSET_PATH}images/map-icons/lab.svg?v=clean-2`,
    routeColor: '#7c3aed',
    ring: 'ring-violet-500/30',
    markerBg: 'bg-violet-500',
  },
  pharmacy: {
    label: 'Pharmacy',
    icon: `${BASE_ASSET_PATH}images/map-icons/pharmacy.svg?v=clean-2`,
    routeColor: '#16a34a',
    ring: 'ring-emerald-500/30',
    markerBg: 'bg-emerald-500',
  },
  imaging: {
    label: 'Imaging Center',
    icon: `${BASE_ASSET_PATH}images/map-icons/clinic.svg?v=clean-2`,
    routeColor: '#2563eb',
    ring: 'ring-blue-500/30',
    markerBg: 'bg-blue-500',
  },
};

const TYPE_FALLBACK_PHOTO = {
  hospital: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=640&q=80',
  clinic: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=640&q=80',
  lab: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=640&q=80',
  pharmacy: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=640&q=80',
  imaging: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=640&q=80',
};

const CITY_COORDINATES: Record<string, Coordinate> = {
  jabalpur: [79.9864, 23.1815],
  bhopal: [77.4126, 23.2599],
  indore: [75.8577, 22.7196],
  delhi: [77.209, 28.6139],
  mumbai: [72.8777, 19.076],
  pune: [73.8567, 18.5204],
  bengaluru: [77.5946, 12.9716],
  bangalore: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.385],
  chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726],
  ahmedabad: [72.5714, 23.0225],
  jaipur: [75.7873, 26.9124],
  lucknow: [80.9462, 26.8467],
};
const DEFAULT_COORDINATES = CITY_COORDINATES.jabalpur;

// ─── Local types ─────────────────────────────────────────────────────────────
// The API + store layers are plain JS, so this component declares the shapes it
// actually relies on (tightening them repo-wide is the separate typecheck
// burn-down).
type Coordinate = [number, number];
type ServiceType = keyof typeof TYPE_CONFIG;
type PlaceConfig = (typeof TYPE_CONFIG)[ServiceType];

/**
 * Vertical payloads (hospital/clinic/lab/pharmacy/imaging) are heterogeneous and
 * only ever read through displayValue()/isTruthy()/coordinatePair(), which narrow
 * at runtime — hence one loose alias instead of ~40 unchecked property reads.
 */
type EntityPayload = { [key: string]: any };

/** Entities can be absent while a parent screen is still fetching. */
type MaybeEntity = EntityPayload | null | undefined;

/** Normalised marker/POI shape built by buildMapPlace(). */
interface MapPlace {
  id: string;
  type: ServiceType;
  name: string;
  address: string;
  phone: string;
  rating: string | number;
  reviewsCount: number;
  photo: string;
  workingHours: string;
  coordinates: Coordinate;
  coordinateSource: string;
  raw: EntityPayload;
}

/** Route record — mirrors store/slices/mapSlice.js fetchRoute.fulfilled. */
interface RouteSummary {
  coordinates: Coordinate[];
  distance: number;
  duration: number;
  source?: string;
  warning?: string;
}

/** Async status record written by the geocode/route thunks. */
interface StatusRecord {
  loading?: boolean;
  error?: string;
  warning?: string;
}

interface CurrentLocation {
  longitude: number;
  latitude: number;
  accuracy?: number;
}

/** The parts of `state.map` this component reads. */
interface MapSliceState {
  placesById: Record<string, MapPlace | undefined>;
  selectedPlaceId: string | null;
  hoveredPlaceId: string | null;
  currentLocation: CurrentLocation | null;
  routesByPlaceId: Record<string, RouteSummary | undefined>;
  geocodingStatusByPlaceId: Record<string, StatusRecord | undefined>;
  routeStatusByPlaceId: Record<string, StatusRecord | undefined>;
  locateError: string;
}

/** Root-state shape for the untyped JS store (only `map` is read here). */
interface RootState {
  map: MapSliceState;
  [key: string]: unknown;
}

/** Props accepted from the detail screens (hospital/clinic/lab/pharmacy). */
export interface ServiceLocationMapProps {
  entityType: ServiceType | string;
  entity: MaybeEntity;
  className?: string;
}

/** Plain map actions (upsert/select/locate) — dispatch accepts any action shape. */
type MapBoundDispatch = (action: unknown) => unknown;

/** A redux-thunk action created by the plain-JS map slice. */
type MapThunkAction = (dispatch: MapBoundDispatch) => unknown;

/**
 * Dispatch for the map screen: plain map actions plus the two async thunks.
 * The `Dispatch<UnknownAction>` arm exists solely to satisfy react-redux's
 * `useDispatch<T extends Dispatch>()` constraint.
 */
type MapDispatch = Dispatch<UnknownAction> & ((thunk: MapThunkAction) => unknown);

/** Payload accepted by the map slice's geocode thunk (store/slices/mapSlice.js). */
interface GeocodePlacePayload {
  placeId: string;
  address: string;
  fallbackCoordinates: Coordinate;
}

/** Payload accepted by the map slice's route thunk (store/slices/mapSlice.js). */
interface FetchRoutePayload {
  placeId: string;
  from: Coordinate;
  to: Coordinate;
}

/**
 * src/store/index.js is plain JS, so `noImplicitAny` makes the thunk creators
 * exported from mapSlice.js come back with `undefined` parameters. These aliases
 * restate the two payloads this component builds — once, at the JS boundary —
 * instead of an `any` cast at every dispatch site.
 */
const createGeocodePlace =
  geocodePlace as unknown as (payload: GeocodePlacePayload) => MapThunkAction;
const createFetchRoute =
  fetchRoute as unknown as (payload: FetchRoutePayload) => MapThunkAction;

interface MarkerElements {
  button: HTMLButtonElement;
  element: HTMLDivElement;
}

interface MarkerRecord {
  handleClick: (event: MouseEvent) => void;
  handleEnter: () => void;
  handleLeave: () => void;
  marker: maplibregl.Marker;
  markerElements: MarkerElements;
  place: MapPlace;
  showPopup: (options?: { centerInMap?: boolean }) => void;
}

/** Safe config lookup — unknown/absent verticals fall back to hospital. */
function configFor(type: unknown): PlaceConfig {
  return TYPE_CONFIG[type as ServiceType] || TYPE_CONFIG.hospital;
}

function formatDistance(meters: number | null | undefined): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      displayValue(record.label) ||
      displayValue(record.value) ||
      displayValue(record.text) ||
      displayValue(record.name) ||
      displayValue(record.openingHours) ||
      displayValue(record.hours) ||
      ''
    );
  }
  return '';
}

function coordinatePair(value: unknown): Coordinate | null {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  const record = (typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const lng = Number(record.longitude ?? record.lng);
  const lat = Number(record.latitude ?? record.lat);
  // CurrentLocation shape { longitude, latitude } redux se aata hai — wahi use hota hai.
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function safeRouteCoordinates(coordinates: unknown[] = []): Coordinate[] {
  return coordinates
    .map((point) => coordinatePair(point))
    .filter((pair): pair is Coordinate => pair !== null);
}

function extractCoordinates(entity: MaybeEntity): Coordinate | null {
  return (
    coordinatePair(entity?.coordinates) ||
    coordinatePair(entity?.coordinates?.coordinates) ||
    coordinatePair(entity?.location?.coordinates) ||
    coordinatePair(entity?.location) ||
    coordinatePair(entity?.geo?.coordinates) ||
    coordinatePair(entity?.geo) ||
    coordinatePair(entity)
  );
}

function buildAddress(entity: MaybeEntity): string {
  return [entity?.address, entity?.city, entity?.state, entity?.pincode]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(', ');
}

function getFallbackCoordinates(entity: MaybeEntity, address: string): Coordinate {
  const text = `${entity?.city || ''} ${entity?.state || ''} ${address || ''}`.toLowerCase();
  const city = Object.keys(CITY_COORDINATES).find((name) => text.includes(name));
  return city ? CITY_COORDINATES[city] : DEFAULT_COORDINATES;
}

function getEntityId(entity: MaybeEntity, entityType: ServiceType): string {
  return String(entity?.id || entity?._id || `${entityType}-${entity?.name || 'detail'}`);
}

function getPrimaryPhoto(entity: MaybeEntity, entityType: ServiceType = 'hospital'): string {
  if (entity?.photo) return entity.photo;
  if (entity?.cover) return entity.cover;
  if (entity?.image) return entity.image;
  if (entity?.logo) return entity.logo;
  if (Array.isArray(entity?.photos) && entity.photos.length) return entity.photos[0];
  if (Array.isArray(entity?.images) && entity.images.length) return entity.images[0];
  return TYPE_FALLBACK_PHOTO[entityType] || TYPE_FALLBACK_PHOTO.hospital;
}

function getWorkingHours(entity: MaybeEntity): string {
  if (!entity?.workingHours) return entity?.timing || entity?.closingTime || '';
  if (typeof entity.workingHours === 'string') return entity.workingHours;
  const values = Object.values(entity.workingHours).filter(Boolean);
  return displayValue(values[0]) || '';
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes' || value === 'Yes' || value === 1;
}

function listValues(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => isTruthy(enabled))
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()));
  }
  return [displayValue(value)].filter(Boolean);
}

function getOpenStatus(hours: unknown, alwaysOpen = false): { open: boolean | null; label: string } {
  if (alwaysOpen || /24\s*\/?\s*7|24\s*hour/i.test(displayValue(hours))) {
    return { open: true, label: 'Open Now' };
  }

  const text = displayValue(hours);
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return { open: null, label: text || 'Hours unavailable' };

  const toMinutes = (hour: string, minute: string, meridiem: string) => {
    let h = Number(hour) % 12;
    if (/pm/i.test(meridiem)) h += 12;
    return h * 60 + Number(minute || 0);
  };
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(match[1], match[2], match[3]);
  const end = toMinutes(match[4], match[5], match[6]);
  const open = start <= end ? current >= start && current <= end : current >= start || current <= end;
  return { open, label: open ? 'Open Now' : 'Closed Now' };
}

function buildMapPlace(
  entity: MaybeEntity,
  entityType: ServiceType,
  index = 0,
  primaryId = '',
): MapPlace {
  const config = configFor(entityType);
  const id = getEntityId(entity, entityType);
  const address = buildAddress(entity);
  const explicitCoordinates = extractCoordinates(entity);
  const fallbackCoordinates = getFallbackCoordinates(entity, address);
  const coordinates = explicitCoordinates || fallbackCoordinates || DEFAULT_COORDINATES;
  const isPrimary = id === primaryId;
  const offset = isPrimary || explicitCoordinates ? 0 : index * 0.006;
  // Small deterministic offsets keep same-city fallback pins from stacking.
  const placedCoordinates: Coordinate = [
    coordinates[0] + offset,
    coordinates[1] + offset * 0.6,
  ];

  return {
    id,
    type: entityType,
    name: entity?.name || config.label,
    address,
    phone: entity?.phone || '',
    rating: entity?.rating || '',
    reviewsCount: entity?.reviewsCount || entity?.reviews || 0,
    photo: getPrimaryPhoto(entity, entityType),
    workingHours: getWorkingHours(entity),
    coordinates: placedCoordinates,
    coordinateSource: explicitCoordinates ? 'model' : 'fallback',
    raw: entity || {},
  };
}

function RouteViewport({ coordinates }: { coordinates: unknown[] }) {
  const { map, isLoaded } = useMap();
  const routeCoordinates = useMemo(() => safeRouteCoordinates(coordinates), [coordinates]);

  useEffect(() => {
    if (!map || !isLoaded || routeCoordinates.length < 2) return;
    const lngs = routeCoordinates.map((point) => point[0]);
    const lats = routeCoordinates.map((point) => point[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 84, maxZoom: 14, duration: 800 }
    );
  }, [map, isLoaded, routeCoordinates]);

  return null;
}

function SelectedPlaceViewport({ coordinates }: { coordinates: unknown }) {
  const { map, isLoaded } = useMap();
  const selectedCoordinates = useMemo(() => coordinatePair(coordinates), [coordinates]);

  useEffect(() => {
    if (!map || !isLoaded || !selectedCoordinates) return;
    map.easeTo({
      center: selectedCoordinates,
      zoom: Math.max(map.getZoom(), 13),
      offset: [0, 132],
      duration: 520,
      essential: true,
    });
  }, [map, isLoaded, selectedCoordinates]);

  return null;
}

function getDetailsPath(place: MapPlace): string {
  const id = place?.id;
  if (!id) return '#';
  if (place.type === 'hospital') return `/hospitals/${id}`;
  if (place.type === 'clinic') return `/clinic/${id}`;
  if (place.type === 'lab') return `/lab/${id}`;
  if (place.type === 'imaging') return `/imaging/${id}`;
  if (place.type === 'pharmacy') return `/buy-medicine/${id}`;
  return '#';
}

const INFO_TONES = {
  muted: 'border-border/70 bg-muted/60 text-muted-foreground',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
} as const;

type InfoTone = keyof typeof INFO_TONES;

function InfoBadge({ children, tone = 'muted' }: { children?: ReactNode; tone?: InfoTone }) {
  return (
    <span className={cn('inline-flex min-h-5 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none', INFO_TONES[tone])}>
      {children}
    </span>
  );
}

function TypeDetails({ place, route }: { place: MapPlace; route: RouteSummary | null }) {
  const raw = place.raw || {};
  const amenities = raw.amenities || {};
  const specialties = listValues(raw.specialties).slice(0, 2);
  const accreditations = listValues(raw.accreditations);
  const routeText = route?.distance ? `${formatDistance(route.distance)} • ${formatDuration(route.duration)}` : displayValue(raw.distance || raw.eta);

  if (place.type === 'hospital') {
    return (
      <>
        <div className="flex flex-wrap gap-1.5">
          {routeText ? <InfoBadge tone="blue">{routeText}</InfoBadge> : null}
          {isTruthy(raw.emergency24x7) ? <InfoBadge tone="red">24/7 Emergency</InfoBadge> : null}
          {isTruthy(raw.ambulanceService) ? <InfoBadge tone="blue">Ambulance</InfoBadge> : null}
          {raw.bedAvailability ? <InfoBadge tone="green">{raw.bedAvailability} Beds</InfoBadge> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {raw.status === 'approved' || raw.verified ? <InfoBadge tone="green">Verified</InfoBadge> : null}
          {raw.hospitalType ? <InfoBadge>{displayValue(raw.hospitalType)}</InfoBadge> : null}
          {raw.nabhNumber || accreditations.some((item) => /nabh/i.test(item)) ? <InfoBadge tone="green">NABH Accredited</InfoBadge> : null}
          {specialties.map((item) => <InfoBadge key={item}>{item}</InfoBadge>)}
        </div>
      </>
    );
  }

  if (place.type === 'clinic') {
    const doctors = raw.totalDoctors || raw.doctorCount || raw.doctorsCount || raw.doctors?.length;
    const amenityList = listValues(amenities).filter((item) => /wheelchair|pharmacy|parking|wifi/i.test(item)).slice(0, 3);
    return (
      <>
        <div className="flex flex-wrap gap-1.5">
          {routeText ? <InfoBadge tone="blue">{routeText}</InfoBadge> : null}
          {doctors ? <InfoBadge tone="blue">{doctors} Doctors available</InfoBadge> : null}
          {raw.status === 'approved' || raw.verified ? <InfoBadge tone="green">Verified</InfoBadge> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {accreditations[0] ? <InfoBadge tone="green">{accreditations[0]}</InfoBadge> : null}
          {specialties.map((item) => <InfoBadge key={item}>{item}</InfoBadge>)}
        </div>
        {amenityList.length ? <div className="flex flex-wrap gap-1.5">{amenityList.map((item) => <InfoBadge key={item}>{item}</InfoBadge>)}</div> : null}
      </>
    );
  }

  if (place.type === 'lab') {
    const specialist = displayValue(raw.pathologistName || raw.technicianName || raw.specialistName);
    const qualification = displayValue(raw.pathologistQualification || raw.technicianQualification || raw.qualification);
    const testCount = raw.testsAvailable || raw.testsCount || raw.tests?.length || raw.details?.testsAvailable;
    const turnaround = displayValue(raw.reportTurnaroundTime || raw.reportTime || raw.details?.reportTime || raw.details?.turnaroundTime);
    return (
      <>
        <div className="flex flex-wrap gap-1.5">
          {routeText ? <InfoBadge tone="blue">{routeText}</InfoBadge> : null}
          {raw.status === 'approved' || raw.verified ? <InfoBadge tone="green">Verified</InfoBadge> : null}
          {raw.nablNumber || accreditations.some((item) => /nabl/i.test(item)) ? <InfoBadge tone="green">NABL Accredited</InfoBadge> : null}
          {raw.aerbNumber || accreditations.some((item) => /aerb/i.test(item)) ? <InfoBadge tone="green">AERB Certified</InfoBadge> : null}
          {isTruthy(amenities.homeCollection || raw.homeSampleCollection || raw.homeCollection) ? <InfoBadge tone="blue">Home Collection</InfoBadge> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {specialist ? <InfoBadge>{qualification ? `${specialist}, ${qualification}` : specialist}</InfoBadge> : null}
          {turnaround ? <InfoBadge>{turnaround} reports</InfoBadge> : null}
          {testCount ? <InfoBadge>{testCount} Tests</InfoBadge> : null}
        </div>
      </>
    );
  }

  if (place.type === 'imaging') {
    const radiologist = displayValue(raw.radiologistName || raw.radiologist);
    const equipment = displayValue(raw.equipment?.mri || raw.equipment?.ct);
    return (
      <>
        <div className="flex flex-wrap gap-1.5">
          {routeText ? <InfoBadge tone="blue">{routeText}</InfoBadge> : null}
          {raw.status === 'approved' || raw.verified ? <InfoBadge tone="green">Verified</InfoBadge> : null}
          {raw.aerbNumber ? <InfoBadge tone="green">AERB Certified</InfoBadge> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {radiologist ? <InfoBadge>{radiologist}</InfoBadge> : null}
          {equipment ? <InfoBadge>{equipment}</InfoBadge> : null}
        </div>
      </>
    );
  }

  const isTwentyFourHour = isTruthy(raw.open24x7 || raw.twentyFourSeven || raw.is24Hours) || /24\s*\/?\s*7/i.test(displayValue(raw.tags));
  return (
    <div className="flex flex-wrap gap-1.5">
      {isTruthy(amenities.homeDelivery || raw.deliveryAvailable) ? <InfoBadge tone="green">Home Delivery</InfoBadge> : null}
      {isTruthy(amenities.prescriptionUpload || raw.prescriptionUpload) ? <InfoBadge tone="blue">Prescription Upload</InfoBadge> : null}
      {isTwentyFourHour ? <InfoBadge tone="amber">24 Hour</InfoBadge> : null}
      {raw.licenseNumber || raw.licenseNo ? <InfoBadge>Lic: {displayValue(raw.licenseNumber || raw.licenseNo)}</InfoBadge> : null}
    </div>
  );
}

function PlaceInfoCard({
  place,
  config,
  route,
  onViewDetails,
  compact = false,
}: {
  place: MapPlace;
  config: PlaceConfig;
  route: RouteSummary | null;
  onViewDetails: () => void;
  compact?: boolean;
}) {
  const name = displayValue(place.name) || config.label;
  const rating = displayValue(place.rating);
  const workingHours = displayValue(place.workingHours);
  const address = displayValue(place.address) || 'Address unavailable';
  const phone = displayValue(place.phone);
  const openStatus = getOpenStatus(workingHours, place.type === 'hospital' && isTruthy(place.raw?.emergency24x7));

  return (
    <div className={cn('w-[min(342px,calc(100vw-96px))] overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl sm:w-[286px]', compact && 'sm:w-[264px]')}>
      {place.photo && (
        <div className={cn('overflow-hidden bg-muted', compact ? 'h-24' : 'h-28')}>
          <img src={place.photo} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="space-y-2.5 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <img src={config.icon} alt="" className="h-8 w-8 object-contain drop-shadow-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold leading-tight text-foreground">{name}</p>
            <p className="text-xs leading-tight text-muted-foreground">{config.label}</p>
          </div>
          {rating ? (
            <Badge variant="secondary" className="gap-1 rounded-md px-2 py-1 text-[10px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          <span className={cn('inline-flex items-center gap-1 font-bold', openStatus.open === false ? 'text-red-600' : 'text-emerald-600')}>
            <span className={cn('h-2 w-2 rounded-full', openStatus.open === false ? 'bg-red-500' : 'bg-emerald-500')} />
            {openStatus.label}
          </span>
          {workingHours ? (
            <span className="inline-flex max-w-[145px] items-center gap-1 truncate">
              <Clock className="h-3 w-3" />
              {workingHours}
            </span>
          ) : null}
          {phone ? (
            <span className="inline-flex items-center gap-1 truncate">
              <Phone className="h-3 w-3" />
              {phone}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-muted-foreground">{address}</p>
        <TypeDetails place={place} route={route} />
        {place.coordinateSource === 'fallback' ? (
          <p className="rounded-md bg-muted/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            Approximate city location
          </p>
        ) : null}
        <Button size="sm" className="h-9 w-full rounded-lg text-xs font-bold" onClick={onViewDetails}>
          View Details
        </Button>
      </div>
    </div>
  );
}

function getServicePopupMapOffset(map: maplibregl.Map | null): Coordinate {
  const width = map?.getContainer()?.clientWidth || 0;
  return [0, width <= 520 ? 228 : 210];
}

function createServiceMarkerElement(place: MapPlace, config: PlaceConfig): MarkerElements {
  const element = document.createElement('div');
  const button = document.createElement('button');
  element.className = 'mapcn-marker';
  element.style.cssText = [
    'align-items:center',
    'display:flex',
    'height:48px',
    'justify-content:center',
    'pointer-events:auto',
    'width:48px',
  ].join(';');

  button.type = 'button';
  button.title = displayValue(place.name) || config.label;
  button.setAttribute('aria-label', `Select ${displayValue(place.name) || config.label}`);
  button.innerHTML = `<img src="${config.icon}" alt="" style="display:block;height:34px;width:34px;object-fit:contain;filter:drop-shadow(0 12px 14px rgba(15,23,42,.28));" />`;
  button.style.cssText = [
    'align-items:center',
    'background:transparent',
    'border:0',
    'cursor:pointer',
    'display:flex',
    'height:36px',
    'justify-content:center',
    'padding:0',
    'transition:transform .18s ease, filter .18s ease',
    'width:36px',
  ].join(';');
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px) scale(1.06)';
    button.style.filter = 'drop-shadow(0 22px 18px rgba(15,23,42,.32))';
  });
  button.addEventListener('mouseleave', () => {
    setServiceMarkerStyle(button, button.dataset.selected === 'true');
  });
  element.append(button);
  setServiceMarkerStyle(button, false);
  return { button, element };
}

function setServiceMarkerStyle(button: HTMLButtonElement, selected: boolean): void {
  button.dataset.selected = selected ? 'true' : 'false';
  button.style.transform = selected ? 'scale(1.2)' : '';
  button.style.filter = selected ? 'drop-shadow(0 18px 22px rgba(15,23,42,.35))' : '';
}

function ServiceDomMarkers({
  places,
  selectedPlace,
  hoveredPlaceId,
  route,
  onSelect,
  onViewDetails,
}: {
  places: MapPlace[];
  selectedPlace?: MapPlace | null;
  hoveredPlaceId?: string | null;
  route: RouteSummary | null;
  onSelect: (placeId: string) => void;
  onViewDetails: (place: MapPlace) => void;
}) {
  const { map, isLoaded } = useMap();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const popupOwnerKeyRef = useRef('');
  const routeRef = useRef<RouteSummary | null>(route);
  const markersRef = useRef<globalThis.Map<string, MarkerRecord>>(new globalThis.Map());
  const selectedKeyRef = useRef('');
  const externalHoverRef = useRef('');
  const renderKey = useMemo(
    () => places.map((place) => `${place.id}:${coordinatePair(place.coordinates)?.join(',') || ''}`).join('|'),
    [places]
  );

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!map || !isLoaded) return undefined;

    // Captured once: TypeScript drops the null-narrowing above inside the
    // nested marker callbacks below, and these run long after the guard.
    const mapInstance = map;
    const markerRecords = markersRef.current;
    markerRecords.clear();

    function closePopup() {
      popupRef.current?.remove();
      popupRef.current = null;
      popupOwnerKeyRef.current = '';
      const root = popupRootRef.current;
      popupRootRef.current = null;
      if (root) setTimeout(() => root.unmount(), 0);
    }

    const markers = places.map((place) => {
      const coordinates = coordinatePair(place.coordinates);
      if (!coordinates) return null;
      const lngLat: Coordinate = coordinates;
      const config = configFor(place.type);
      const markerElements = createServiceMarkerElement(place, config);
      const marker = new maplibregl.Marker({
        anchor: 'center',
        element: markerElements.element,
      })
        .setLngLat(lngLat)
        .addTo(mapInstance);

      function showPopup({ centerInMap = false }: { centerInMap?: boolean } = {}) {
        closePopup();
        const content = document.createElement('div');
        popupRootRef.current = createRoot(content);
        popupRootRef.current.render(
          <PlaceInfoCard
            place={place}
            config={config}
            route={selectedKeyRef.current === place.id ? routeRef.current : null}
            onViewDetails={() => onViewDetails(place)}
          />
        );
        popupOwnerKeyRef.current = place.id;
        popupRef.current = new maplibregl.Popup({
          anchor: 'bottom',
          closeButton: false,
          closeOnClick: false,
          focusAfterOpen: false,
          maxWidth: 'min(342px, calc(100vw - 96px))',
          offset: 22,
          className: 'findmedi-map-popup',
        })
          .setLngLat(lngLat)
          .setDOMContent(content)
          .addTo(mapInstance);

        if (centerInMap) focusOnMap();
      }

      function hidePopup() {
        if (selectedKeyRef.current === place.id) return;

        closePopup();

        const selectedRecord = markerRecords.get(selectedKeyRef.current);
        selectedRecord?.showPopup();
      }

      function focusOnMap() {
        mapInstance.flyTo({
          center: lngLat,
          zoom: Math.max(mapInstance.getZoom(), 14),
          offset: getServicePopupMapOffset(mapInstance),
          duration: 520,
        });
      }

      function handleClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        selectedKeyRef.current = place.id;
        onSelect(place.id);
        showPopup({ centerInMap: true });
      }

      function handleEnter() {
        showPopup();
      }

      function handleLeave() {
        setServiceMarkerStyle(markerElements.button, selectedKeyRef.current === place.id);
        hidePopup();
      }

      markerElements.button.addEventListener('click', handleClick);
      markerElements.button.addEventListener('mouseenter', handleEnter);
      markerElements.button.addEventListener('mouseleave', handleLeave);

      const record: MarkerRecord = { handleClick, handleEnter, handleLeave, marker, markerElements, place, showPopup };
      markerRecords.set(place.id, record);
      return record;
    }).filter((record): record is MarkerRecord => Boolean(record));

    return () => {
      closePopup();
      markerRecords.clear();
      markers.forEach(({ handleClick, handleEnter, handleLeave, marker, markerElements }) => {
        markerElements.button.removeEventListener('click', handleClick);
        markerElements.button.removeEventListener('mouseenter', handleEnter);
        markerElements.button.removeEventListener('mouseleave', handleLeave);
        marker.remove();
      });
    };
  }, [isLoaded, map, onSelect, onViewDetails, places, renderKey]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const selectedKey = selectedPlace?.id || '';
    selectedKeyRef.current = selectedKey;
    let selectedRecord: MarkerRecord | null = null;
    markersRef.current.forEach((record, key) => {
      const selected = key === selectedKey;
      if (selected) selectedRecord = record;
      setServiceMarkerStyle(record.markerElements.button, selected);
    });
    setTimeout(() => selectedRecord?.showPopup({ centerInMap: true }), 0);
  }, [isLoaded, map, renderKey, selectedPlace]);

  useEffect(() => {
    const hoverKey = String(hoveredPlaceId || '');
    if (!hoverKey) {
      if (externalHoverRef.current) {
        popupRef.current?.remove();
        popupRef.current = null;
        popupOwnerKeyRef.current = '';
        popupRootRef.current?.unmount();
        popupRootRef.current = null;
        externalHoverRef.current = '';
        markersRef.current.get(selectedKeyRef.current)?.showPopup({ centerInMap: true });
      }
      return;
    }
    const record = markersRef.current.get(hoverKey);
    if (!record) return;
    externalHoverRef.current = hoverKey;
    record.showPopup({ centerInMap: true });
  }, [hoveredPlaceId]);

  return null;
}

function MapBoundsController({ places, fitToPlaces }: { places: MapPlace[]; fitToPlaces: boolean }) {
  const { map, isLoaded } = useMap();
  const boundsKey = useMemo(
    () =>
      places
        .map((place) => coordinatePair(place.coordinates)?.join(",") || "")
        .filter(Boolean)
        .join("|"),
    [places],
  );

  useEffect(() => {
    if (!map || !isLoaded || !fitToPlaces || !boundsKey) return;

    const coordinates = places
      .map((place) => coordinatePair(place.coordinates))
      .filter((pair): pair is Coordinate => pair !== null);
    if (coordinates.length > 1) {
      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
    }
  }, [boundsKey, fitToPlaces, isLoaded, map, places]);

  return null;
}

function CurrentLocationMarker({ location }: { location: CurrentLocation | null }) {
  const coordinates = coordinatePair(location);
  if (!location || !coordinates) return null;

  return (
    // `anchor` is omitted: MapMarker only forwards known props and MapLibre's
    // default anchor is already 'center'.
    <MapMarker longitude={coordinates[0]} latitude={coordinates[1]}>
      <MarkerContent>
        <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-lg ring-4 ring-blue-500/20">
          <span className="h-2 w-2 rounded-full bg-white" />
        </div>
        <MarkerTooltip>
          <div className="w-48 rounded-xl border border-border/70 bg-card p-3 text-xs shadow-xl">
            <p className="font-semibold text-foreground">Current location</p>
            {location.accuracy ? (
              <p className="mt-1 text-muted-foreground">Accuracy {Math.round(location.accuracy)} m</p>
            ) : null}
          </div>
        </MarkerTooltip>
      </MarkerContent>
    </MapMarker>
  );
}

export default function ServiceLocationMap({ entityType, entity, className }: ServiceLocationMapProps) {
  const dispatch = useDispatch<MapDispatch>();
  const navigate = useNavigate();
  // Callers pass string literals ("hospital" | "clinic" | ...); unknown values
  // fall back to hospital so downstream helpers always get a valid vertical.
  const vertical: ServiceType = (TYPE_CONFIG[entityType as ServiceType] ? entityType : 'hospital') as ServiceType;
  const [mapZoom] = useState<number>(12.5);
  const [nearbyPlaces, setNearbyPlaces] = useState<MapPlace[]>([]);
  // Guided turn-by-turn session (Phase 7). Off by default; Start button below.
  const [navigating, setNavigating] = useState(false);

  const address = useMemo(
    () => buildAddress(entity),
    [entity?.address, entity?.city, entity?.state, entity?.pincode]
  );
  const id = useMemo(() => getEntityId(entity, vertical), [entity, vertical]);
  const fallbackCoordinates = useMemo(
    () => getFallbackCoordinates(entity, address),
    [entity?.city, entity?.state, address]
  );
  const explicitCoordinates = useMemo(
    () => extractCoordinates(entity),
    [
      entity?.coordinates,
      entity?.location,
      entity?.geo,
      entity?.longitude,
      entity?.latitude,
      entity?.lng,
      entity?.lat,
    ]
  );

  const place = useMemo(
    () => buildMapPlace(entity, vertical, 0, id),
    [
      entity,
      entity?.name,
      vertical,
      id,
    ]
  );
  const placeSignature = useMemo(() => JSON.stringify(place), [place]);

  const storedPlace = useSelector((state: RootState) => state.map.placesById[id]);
  const selectedPlaceId = useSelector((state: RootState) => state.map.selectedPlaceId);
  const hoveredPlaceId = useSelector((state: RootState) => state.map.hoveredPlaceId);
  const currentLocation = useSelector((state: RootState) => state.map.currentLocation);
  const selectedStoredPlace = useSelector((state: RootState) =>
    selectedPlaceId ? state.map.placesById[selectedPlaceId] : undefined,
  );
  const route = useSelector((state: RootState) => state.map.routesByPlaceId[selectedPlaceId || id]);
  const geocodeStatus = useSelector((state: RootState) => state.map.geocodingStatusByPlaceId[id]);
  const routeStatus = useSelector((state: RootState) => state.map.routeStatusByPlaceId[selectedPlaceId || id]);
  const locateError = useSelector((state: RootState) => state.map.locateError);
  const routeSummary = useMemo(() => {
    if (!route?.distance) return '';
    return `${formatDistance(route.distance)} • ${formatDuration(route.duration)}`;
  }, [route]);
  const routeError = routeStatus?.error || '';
  // A missing/failed route provider falls back to a straight line between the
  // two points. That looks like a rendering bug, so surface the reason rather
  // than silently drawing a line that doesn't follow any road.
  const routeNotice = route?.warning || '';
  const hasRoute = (route?.coordinates?.length ?? 0) > 1;
  const routeCoordinates = route?.coordinates ?? [];

  const activePlace = storedPlace || place;
  const mapPlaces = useMemo(() => {
    const byId = new globalThis.Map<string, MapPlace>();
    const items: MapPlace[] = [place, ...nearbyPlaces];
    items.forEach((item) => {
      if (item?.id) byId.set(item.id, item);
    });
    if (activePlace?.id) byId.set(activePlace.id, activePlace);
    return Array.from(byId.values()).filter((item) => coordinatePair(item.coordinates));
  }, [activePlace, nearbyPlaces, place]);
  const selectedPlace = mapPlaces.find((item) => item.id === selectedPlaceId) || selectedStoredPlace || activePlace;
  const selectedConfig = configFor(selectedPlace?.type);
  const selectedCoordinates = coordinatePair(selectedPlace?.coordinates) || coordinatePair(fallbackCoordinates) || DEFAULT_COORDINATES;
  useEffect(() => {
    dispatch(upsertMapPlace(place));
    dispatch(selectMapPlace(id));
  }, [dispatch, id, placeSignature]);

  const placesLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (placesLoadedRef.current.has(id)) return;
    placesLoadedRef.current.add(id);
    let cancelled = false;
    async function loadPlaces() {
      try {
        const [hospitals, clinics, labs, pharmacies] = await Promise.all([
          api.getHospitals({ status: 'approved' }).catch(() => api.getHospitals({}).catch(() => [])),
          api.getFacilities({ type: 'clinic' }).catch(() => []),
          api.getFacilities({ type: 'lab' }).catch(() => []),
          api.getFacilities({ type: 'pharmacy' }).catch(() => []),
        ]);
        if (cancelled) return;
        const list: MapPlace[] = [
          ...(Array.isArray(hospitals) ? hospitals : []).map((item: MaybeEntity, index: number) => buildMapPlace(item, 'hospital', index, id)),
          ...(Array.isArray(clinics) ? clinics : []).map((item: MaybeEntity, index: number) => buildMapPlace(item, 'clinic', index + 3, id)),
          ...(Array.isArray(labs) ? labs : []).map((item: MaybeEntity, index: number) => buildMapPlace(item, 'lab', index + 6, id)),
          ...(Array.isArray(pharmacies) ? pharmacies : []).map((item: MaybeEntity, index: number) => buildMapPlace(item, 'pharmacy', index + 9, id)),
        ];
        setNearbyPlaces(list);
        list.forEach((item) => dispatch(upsertMapPlace(item)));
      } catch {
        setNearbyPlaces([]);
      }
    }
    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!explicitCoordinates) {
      dispatch(
        createGeocodePlace({
          placeId: id,
          address,
          fallbackCoordinates,
        })
      );
    }
  }, [address, dispatch, explicitCoordinates, fallbackCoordinates, id]);

  const dispatchRoute = (origin: CurrentLocation | Coordinate | null | undefined, targetPlace: MapPlace = selectedPlace) => {
    const current = origin || currentLocation;
    const originCoordinates = coordinatePair(current);
    const destinationCoordinates = coordinatePair(targetPlace?.coordinates) || selectedCoordinates;
    if (!originCoordinates || !destinationCoordinates) return;
    dispatch(
      createFetchRoute({
        placeId: targetPlace?.id || id,
        from: originCoordinates,
        to: destinationCoordinates,
      })
    );
  };

  const requestLocationAndRoute = (targetPlace: MapPlace = selectedPlace) => {
    if (currentLocation) {
      dispatchRoute(currentLocation, targetPlace);
      return;
    }
    if (!navigator.geolocation) {
      dispatch(setLocateError('Location is not available in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: CurrentLocation = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          accuracy: position.coords.accuracy,
        };
        dispatch(setCurrentLocation(location));
        dispatchRoute(location, targetPlace);
      },
      () => dispatch(setLocateError('Location permission was blocked'))
    );
  };

  const handleLocate = (location: CurrentLocation) => {
    dispatch(setCurrentLocation(location));
    dispatchRoute(location);
  };

  const handleMapSelect = useCallback(
    (placeId: string) => dispatch(selectMapPlace(placeId)),
    [dispatch]
  );

  const handleViewDetails = useCallback(
    (item: MapPlace) => navigate(getDetailsPath(item)),
    [navigate]
  );

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-slate-100', className)}>
      <div className="relative h-[500px] sm:h-[580px] lg:h-[640px]">
        <Map center={selectedCoordinates} zoom={mapZoom}>
          {hasRoute ? (
            <>
              <MapRoute
                id={`route-${id}`}
                coordinates={routeCoordinates}
                color={selectedConfig.routeColor}
                width={5}
                opacity={0.85}
              />
              <RouteViewport coordinates={routeCoordinates} />
            </>
          ) : null}

          {/* Phase 7 — guided turn-by-turn session. Keyed on destination so
              picking a different place restarts navigation cleanly. */}
          {navigating && hasRoute ? (
            <NavigationController
              key={`nav-${id}-${selectedCoordinates.join(',')}`}
              origin={
                coordinatePair(currentLocation) ||
                routeCoordinates[0] ||
                selectedCoordinates
              }
              destination={selectedCoordinates}
              destinationLabel={displayValue(selectedPlace?.name) || activePlace.name}
              fallbackRoute={routeCoordinates}
              onExit={() => setNavigating(false)}
            />
          ) : null}

          <MapBoundsController places={mapPlaces} fitToPlaces={mapPlaces.length > 1} />

          <ServiceDomMarkers
            places={mapPlaces}
            selectedPlace={selectedPlace}
            hoveredPlaceId={hoveredPlaceId}
            route={route ?? null}
            onSelect={handleMapSelect}
            onViewDetails={handleViewDetails}
          />

          {currentLocation ? <CurrentLocationMarker location={currentLocation} /> : null}

          <MapControls
            position="top-right"
            showZoom
            showLocate
            showFullscreen
            onLocate={handleLocate}
          >
            <button
              type="button"
              title="Route"
              aria-label="Route"
              disabled={routeStatus?.loading}
              onClick={() => requestLocationAndRoute(selectedPlace)}
              className="flex h-9 w-9 items-center justify-center border-t border-border/70 bg-card text-foreground shadow-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              {routeStatus?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </button>
          </MapControls>

          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col gap-2 sm:left-auto sm:w-[260px]">
            {route?.distance ? (
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Route className="h-3.5 w-3.5 text-primary" />
                  {formatDistance(route.distance)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatDuration(route.duration)}</span>
                  {/* Start guided navigation — hidden while a session runs
                      (the overlay owns the screen, incl. its Exit control). */}
                  {!navigating && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => {
                        // Needs a live position first; same helper the Route
                        // button uses, so a denied prompt surfaces its error.
                        if (!currentLocation) requestLocationAndRoute(selectedPlace);
                        setNavigating(true);
                      }}
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Start
                    </Button>
                  )}
                </span>
              </div>
            ) : null}
            {(geocodeStatus?.loading || geocodeStatus?.error || routeStatus?.error || routeError || routeNotice || locateError) && (
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                {geocodeStatus?.loading ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="text-muted-foreground">
                  {geocodeStatus?.loading
                    ? 'Finding map location...'
                    : routeNotice
                      ? `Approximate route — ${routeNotice}`
                      : routeError || locateError || geocodeStatus?.error}
                </span>
              </div>
            )}
          </div>

          <div className="absolute left-4 top-4 z-20 rounded-full border border-border/70 bg-card/95 px-3.5 py-2 text-xs font-bold text-foreground shadow-lg backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <LocateFixed className="h-3.5 w-3.5 text-primary" />
              {mapPlaces.length} locations
            </span>
          </div>
        </Map>
      </div>
      <div className="border-t border-slate-200 bg-card px-4 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="truncate">{displayValue(selectedPlace?.address) || activePlace.address}</span>
          </p>
          {(routeSummary || routeError || locateError) && (
            <p className={`text-xs font-black ${routeError || locateError ? 'text-red-600' : 'text-primary'}`}>
              {routeError || locateError || routeSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
