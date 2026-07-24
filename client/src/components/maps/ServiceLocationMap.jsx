import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { Clock, Loader2, MapPin, Phone, Route, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from '@/components/ui/map';
import { cn } from '@/lib/utils';
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

const CITY_COORDINATES = {
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

function formatDistance(meters) {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function displayValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return (
      displayValue(value.label) ||
      displayValue(value.value) ||
      displayValue(value.text) ||
      displayValue(value.name) ||
      displayValue(value.openingHours) ||
      displayValue(value.hours) ||
      ''
    );
  }
  return '';
}

function coordinatePair(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  const lng = Number(value.longitude ?? value.lng);
  const lat = Number(value.latitude ?? value.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function safeRouteCoordinates(coordinates = []) {
  return coordinates.map((point) => coordinatePair(point)).filter(Boolean);
}

function extractCoordinates(entity) {
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

function buildAddress(entity) {
  return [entity?.address, entity?.city, entity?.state, entity?.pincode]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(', ');
}

function getFallbackCoordinates(entity, address) {
  const text = `${entity?.city || ''} ${entity?.state || ''} ${address || ''}`.toLowerCase();
  const city = Object.keys(CITY_COORDINATES).find((name) => text.includes(name));
  return city ? CITY_COORDINATES[city] : DEFAULT_COORDINATES;
}

function getEntityId(entity, entityType) {
  return String(entity?.id || entity?._id || `${entityType}-${entity?.name || 'detail'}`);
}

function getPrimaryPhoto(entity, entityType = 'hospital') {
  if (entity?.photo) return entity.photo;
  if (entity?.cover) return entity.cover;
  if (entity?.image) return entity.image;
  if (entity?.logo) return entity.logo;
  if (Array.isArray(entity?.photos) && entity.photos.length) return entity.photos[0];
  if (Array.isArray(entity?.images) && entity.images.length) return entity.images[0];
  return TYPE_FALLBACK_PHOTO[entityType] || TYPE_FALLBACK_PHOTO.hospital;
}

function getWorkingHours(entity) {
  if (!entity?.workingHours) return entity?.timing || entity?.closingTime || '';
  if (typeof entity.workingHours === 'string') return entity.workingHours;
  const values = Object.values(entity.workingHours).filter(Boolean);
  return values[0] || '';
}

function isTruthy(value) {
  return value === true || value === 'true' || value === 'yes' || value === 'Yes' || value === 1;
}

function listValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean);
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => isTruthy(enabled))
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()));
  }
  return [displayValue(value)].filter(Boolean);
}

function getOpenStatus(hours, alwaysOpen = false) {
  if (alwaysOpen || /24\s*\/?\s*7|24\s*hour/i.test(displayValue(hours))) {
    return { open: true, label: 'Open Now' };
  }

  const text = displayValue(hours);
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return { open: null, label: text || 'Hours unavailable' };

  const toMinutes = (hour, minute, meridiem) => {
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

function buildMapPlace(entity, entityType, index = 0, primaryId = '') {
  const config = TYPE_CONFIG[entityType] || TYPE_CONFIG.hospital;
  const id = getEntityId(entity, entityType);
  const address = buildAddress(entity);
  const explicitCoordinates = extractCoordinates(entity);
  const fallbackCoordinates = getFallbackCoordinates(entity, address);
  const coordinates = explicitCoordinates || fallbackCoordinates || DEFAULT_COORDINATES;
  const isPrimary = id === primaryId;
  const offset = isPrimary || explicitCoordinates ? 0 : index * 0.006;

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
    coordinates: [coordinates[0] + offset, coordinates[1] + offset * 0.6],
    coordinateSource: explicitCoordinates ? 'model' : 'fallback',
    raw: entity || {},
  };
}

function RouteViewport({ coordinates }) {
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

function SelectedPlaceViewport({ coordinates }) {
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

function getDetailsPath(place) {
  const id = place?.id;
  if (!id) return '#';
  if (place.type === 'hospital') return `/hospitals/${id}`;
  if (place.type === 'clinic') return `/clinic/${id}`;
  if (place.type === 'lab') return `/lab/${id}`;
  if (place.type === 'imaging') return `/imaging/${id}`;
  if (place.type === 'pharmacy') return `/buy-medicine/${id}`;
  return '#';
}

function InfoBadge({ children, tone = 'muted' }) {
  const tones = {
    muted: 'border-border/70 bg-muted/60 text-muted-foreground',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <span className={cn('inline-flex min-h-5 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none', tones[tone])}>
      {children}
    </span>
  );
}

function TypeDetails({ place, route }) {
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

function PlaceInfoCard({ place, config, route, onViewDetails, compact = false }) {
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

function getServicePopupMapOffset(map) {
  const width = map?.getContainer()?.clientWidth || 0;
  return [0, width <= 520 ? 228 : 210];
}

function createServiceMarkerElement(place, config) {
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

function setServiceMarkerStyle(button, selected) {
  button.dataset.selected = selected ? 'true' : 'false';
  button.style.transform = selected ? 'scale(1.2)' : '';
  button.style.filter = selected ? 'drop-shadow(0 18px 22px rgba(15,23,42,.35))' : '';
}

function ServiceDomMarkers({ places, selectedPlace, hoveredPlaceId, route, onSelect, onViewDetails }) {
  const { map, isLoaded } = useMap();
  const popupRef = useRef(null);
  const popupRootRef = useRef(null);
  const popupOwnerKeyRef = useRef('');
  const routeRef = useRef(route);
  const markersRef = useRef(new globalThis.Map());
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
      const config = TYPE_CONFIG[place.type] || TYPE_CONFIG.hospital;
      const markerElements = createServiceMarkerElement(place, config);
      const marker = new maplibregl.Marker({
        anchor: 'center',
        element: markerElements.element,
      })
        .setLngLat(coordinates)
        .addTo(map);

      function showPopup({ centerInMap = false } = {}) {
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
          className: 'medicore-map-popup',
        })
          .setLngLat(coordinates)
          .setDOMContent(content)
          .addTo(map);

        if (centerInMap) focusOnMap();
      }

      function hidePopup() {
        if (selectedKeyRef.current === place.id) return;

        closePopup();

        const selectedRecord = markerRecords.get(selectedKeyRef.current);
        selectedRecord?.showPopup();
      }

      function focusOnMap() {
        map.flyTo({
          center: coordinates,
          zoom: Math.max(map.getZoom(), 14),
          offset: getServicePopupMapOffset(map),
          duration: 520,
        });
      }

      function handleClick(event) {
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

      const record = { handleClick, handleEnter, handleLeave, marker, markerElements, place, showPopup };
      markerRecords.set(place.id, record);
      return record;
    }).filter(Boolean);

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
    let selectedRecord = null;
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

function MapBoundsController({ places, fitToPlaces }) {
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

    const coordinates = places.map((place) => coordinatePair(place.coordinates)).filter(Boolean);
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

function RouteLine({ coordinates }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return undefined;

    const sourceId = "route-line-source";
    const haloLayerId = "route-line-halo-layer";
    const layerId = "route-line-layer";
    const routeData = {
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: {},
    };

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(routeData);
    } else {
      map.addSource(sourceId, { type: "geojson", lineMetrics: true, data: routeData });
      map.addLayer({
        id: haloLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.92 },
      });
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-gradient": [
            "interpolate", ["linear"], ["line-progress"],
            0, "#2563eb",
            0.55, "#7c3aed",
            1, "#f97316",
          ],
          "line-width": 5.5,
          "line-opacity": 0.95,
        },
      });
    }

    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    map.fitBounds(bounds, {
      padding: { top: 92, bottom: 168, left: 72, right: 72 },
      maxZoom: 15,
      duration: 650,
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(haloLayerId)) map.removeLayer(haloLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* map layer already removed */ }
    };
  }, [coordinates, isLoaded, map]);

  return null;
}

function CurrentLocationMarker({ location }) {
  const coordinates = coordinatePair(location);
  if (!coordinates) return null;

  return (
    <MapMarker longitude={coordinates[0]} latitude={coordinates[1]} anchor="center">
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

export default function ServiceLocationMap({ entityType, entity, className }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const config = TYPE_CONFIG[entityType] || TYPE_CONFIG.hospital;
  const [mapZoom] = useState(12.5);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);

  const address = useMemo(
    () => buildAddress(entity),
    [entity?.address, entity?.city, entity?.state, entity?.pincode]
  );
  const id = useMemo(() => getEntityId(entity, entityType), [entity, entityType]);
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
    () => buildMapPlace(entity, entityType, 0, id),
    [
      entity,
      entity?.name,
      entityType,
      id,
    ]
  );
  const placeSignature = useMemo(() => JSON.stringify(place), [place]);

  const storedPlace = useSelector((state) => state.map.placesById[id]);
  const selectedPlaceId = useSelector((state) => state.map.selectedPlaceId);
  const hoveredPlaceId = useSelector((state) => state.map.hoveredPlaceId);
  const currentLocation = useSelector((state) => state.map.currentLocation);
  const selectedStoredPlace = useSelector((state) => state.map.placesById[selectedPlaceId]);
  const route = useSelector((state) => state.map.routesByPlaceId[selectedPlaceId || id]);
  const _geocodeStatus = useSelector((state) => state.map.geocodingStatusByPlaceId[id]);
  const routeStatus = useSelector((state) => state.map.routeStatusByPlaceId[selectedPlaceId || id]);
  const locateError = useSelector((state) => state.map.locateError);
  const routeSummary = useMemo(() => {
    if (!route?.distance) return '';
    return `${formatDistance(route.distance)} • ${formatDuration(route.duration)}`;
  }, [route]);
  const routeError = routeStatus?.error || '';
  const hasRoute = route?.coordinates?.length > 1;

  const activePlace = storedPlace || place;
  const mapPlaces = useMemo(() => {
    const byId = new globalThis.Map();
    [place, ...nearbyPlaces].forEach((item) => {
      if (item?.id) byId.set(item.id, item);
    });
    if (activePlace?.id) byId.set(activePlace.id, activePlace);
    return Array.from(byId.values()).filter((item) => coordinatePair(item.coordinates));
  }, [activePlace, nearbyPlaces, place]);
  const selectedPlace = mapPlaces.find((item) => item.id === selectedPlaceId) || selectedStoredPlace || activePlace;
  const _selectedConfig = TYPE_CONFIG[selectedPlace?.type] || config;
  const selectedCoordinates = coordinatePair(selectedPlace?.coordinates) || coordinatePair(fallbackCoordinates) || DEFAULT_COORDINATES;
  useEffect(() => {
    dispatch(upsertMapPlace(place));
    dispatch(selectMapPlace(id));
  }, [dispatch, id, placeSignature]);

  const placesLoadedRef = useRef(new Set());
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
        const list = [
          ...(Array.isArray(hospitals) ? hospitals : []).map((item, index) => buildMapPlace(item, 'hospital', index, id)),
          ...(Array.isArray(clinics) ? clinics : []).map((item, index) => buildMapPlace(item, 'clinic', index + 3, id)),
          ...(Array.isArray(labs) ? labs : []).map((item, index) => buildMapPlace(item, 'lab', index + 6, id)),
          ...(Array.isArray(pharmacies) ? pharmacies : []).map((item, index) => buildMapPlace(item, 'pharmacy', index + 9, id)),
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
        geocodePlace({
          placeId: id,
          address,
          fallbackCoordinates,
        })
      );
    }
  }, [address, dispatch, explicitCoordinates, fallbackCoordinates, id]);

  const dispatchRoute = (origin, targetPlace = selectedPlace) => {
    const current = origin || currentLocation;
    const originCoordinates = coordinatePair(current);
    const destinationCoordinates = coordinatePair(targetPlace?.coordinates) || selectedCoordinates;
    if (!originCoordinates || !destinationCoordinates) return;
    dispatch(
      fetchRoute({
        placeId: targetPlace?.id || id,
        from: originCoordinates,
        to: destinationCoordinates,
      })
    );
  };

  const _requestLocationAndRoute = (targetPlace = selectedPlace) => {
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
        const location = {
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

  const _handleLocate = (location) => {
    dispatch(setCurrentLocation(location));
    dispatchRoute(location);
  };

  const handleMapSelect = useCallback(
    (placeId) => dispatch(selectMapPlace(placeId)),
    [dispatch]
  );

  const handleViewDetails = useCallback(
    (item) => navigate(getDetailsPath(item)),
    [navigate]
  );

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-slate-100', className)}>
      <div className="relative h-[500px] sm:h-[580px] lg:h-[640px]">
        <Map center={selectedCoordinates} zoom={mapZoom}>
          <MapBoundsController places={mapPlaces} fitToPlaces={mapPlaces.length > 1} />
          <ServiceDomMarkers
            places={mapPlaces}
            selectedPlace={selectedPlace}
            hoveredPlaceId={hoveredPlaceId}
            route={route}
            onSelect={handleMapSelect}
            onViewDetails={handleViewDetails}
          />
          {currentLocation ? <CurrentLocationMarker location={currentLocation} /> : null}
          {hasRoute ? <RouteLine coordinates={route.coordinates} /> : null}
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
