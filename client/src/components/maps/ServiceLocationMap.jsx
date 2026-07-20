import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, Loader2, LocateFixed, MapPin, Navigation, Phone, Route, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  useMap,
} from '@/components/ui/map';
import { cn } from '@/lib/utils';
import {
  fetchRoute,
  geocodePlace,
  hoverMapPlace,
  selectMapPlace,
  setCurrentLocation,
  setLocateError,
  upsertMapPlace,
} from '@/store/slices/mapSlice';

const BASE_ASSET_PATH = import.meta.env.BASE_URL || '/';

const TYPE_CONFIG = {
  hospital: {
    label: 'Hospital',
    icon: `${BASE_ASSET_PATH}images/map-icons/hospital.svg`,
    routeColor: '#0f766e',
    ring: 'ring-teal-500/30',
    markerBg: 'bg-teal-500',
  },
  clinic: {
    label: 'Clinic',
    icon: `${BASE_ASSET_PATH}images/map-icons/clinic.svg`,
    routeColor: '#2563eb',
    ring: 'ring-blue-500/30',
    markerBg: 'bg-blue-500',
  },
  lab: {
    label: 'Diagnostic Lab',
    icon: `${BASE_ASSET_PATH}images/map-icons/lab.svg`,
    routeColor: '#7c3aed',
    ring: 'ring-violet-500/30',
    markerBg: 'bg-violet-500',
  },
  pharmacy: {
    label: 'Pharmacy',
    icon: `${BASE_ASSET_PATH}images/map-icons/pharmacy.svg`,
    routeColor: '#16a34a',
    ring: 'ring-emerald-500/30',
    markerBg: 'bg-emerald-500',
  },
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

function getPrimaryPhoto(entity) {
  if (entity?.photo) return entity.photo;
  if (entity?.cover) return entity.cover;
  if (entity?.image) return entity.image;
  if (entity?.logo) return entity.logo;
  if (Array.isArray(entity?.photos) && entity.photos.length) return entity.photos[0];
  return '';
}

function getWorkingHours(entity) {
  if (!entity?.workingHours) return entity?.timing || entity?.closingTime || '';
  if (typeof entity.workingHours === 'string') return entity.workingHours;
  const values = Object.values(entity.workingHours).filter(Boolean);
  return values[0] || '';
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
    photo: getPrimaryPhoto(entity),
    workingHours: getWorkingHours(entity),
    coordinates: [coordinates[0] + offset, coordinates[1] + offset * 0.6],
    coordinateSource: explicitCoordinates ? 'model' : 'fallback',
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
      duration: 950,
      easing: (time) => 1 - Math.pow(1 - time, 3),
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
  if (place.type === 'pharmacy') return `/buy-medicine/${id}`;
  return '#';
}

function PlaceInfoCard({ place, config, route, routeLoading, onRoute, onViewDetails, compact = false }) {
  const name = displayValue(place.name) || config.label;
  const rating = displayValue(place.rating);
  const workingHours = displayValue(place.workingHours);
  const address = displayValue(place.address) || 'Address unavailable';
  const phone = displayValue(place.phone);

  return (
    <div className={cn('w-72 overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-2xl', compact && 'w-64')}>
      {place.photo && (
        <div className={cn('overflow-hidden bg-muted', compact ? 'h-24' : 'h-28')}>
          <img src={place.photo} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="space-y-3 p-3">
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', config.markerBg)}>
            <img src={config.icon} alt="" className="h-6 w-6 object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
          {rating ? (
            <Badge variant="secondary" className="gap-1 rounded-md px-2 py-1 text-[10px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {workingHours ? (
            <span className="inline-flex items-center gap-1 truncate">
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
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{address}</p>
        {place.coordinateSource === 'fallback' ? (
          <p className="rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
            Approximate city location
          </p>
        ) : null}
        {route?.distance ? (
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span>{formatDistance(route.distance)}</span>
            <span>{formatDuration(route.duration)}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs" onClick={onRoute} disabled={routeLoading}>
            {routeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Route className="h-3.5 w-3.5" />}
            Route
          </Button>
          <Button size="sm" className="h-9 rounded-lg text-xs" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
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
  const currentLocation = useSelector((state) => state.map.currentLocation);
  const selectedStoredPlace = useSelector((state) => state.map.placesById[selectedPlaceId]);
  const route = useSelector((state) => state.map.routesByPlaceId[selectedPlaceId || id]);
  const geocodeStatus = useSelector((state) => state.map.geocodingStatusByPlaceId[id]);
  const routeStatus = useSelector((state) => state.map.routeStatusByPlaceId[selectedPlaceId || id]);
  const locateError = useSelector((state) => state.map.locateError);

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
  const selectedConfig = TYPE_CONFIG[selectedPlace?.type] || config;
  const selectedCoordinates = coordinatePair(selectedPlace?.coordinates) || coordinatePair(fallbackCoordinates) || DEFAULT_COORDINATES;
  const mapCenter = coordinatePair(activePlace?.coordinates) || selectedCoordinates;

  useEffect(() => {
    dispatch(upsertMapPlace(place));
    dispatch(selectMapPlace(id));
  }, [dispatch, id, placeSignature]);

  useEffect(() => {
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

  const requestLocationAndRoute = (targetPlace = selectedPlace) => {
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

  const handleLocate = (location) => {
    dispatch(setCurrentLocation(location));
    dispatchRoute(location);
  };

  return (
    <Card className={cn('overflow-hidden rounded-2xl border-border/50 shadow-sm', className)}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.markerBg)}>
                <img src={config.icon} alt="" className="h-5 w-5 object-contain" />
              </span>
              <h3 className="font-heading text-lg font-bold text-foreground">Location & Route</h3>
            </div>
            <p className="line-clamp-1 text-sm text-muted-foreground">{displayValue(selectedPlace?.address) || activePlace.address}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activePlace.phone ? (
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs" asChild>
                <a href={`tel:${activePlace.phone}`}>
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              </Button>
            ) : null}
            <Button size="sm" className="h-9 rounded-lg text-xs" onClick={requestLocationAndRoute} disabled={routeStatus?.loading}>
              {routeStatus?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              Route
            </Button>
          </div>
        </div>

        <div className="relative h-[460px] overflow-hidden bg-muted sm:h-[560px] lg:h-[620px]">
          <Map center={mapCenter} zoom={mapZoom} className="absolute inset-0">
            {route?.coordinates?.length ? (
              <>
                <MapRoute
                  id={`route-${id}`}
                  coordinates={route.coordinates}
                  color={selectedConfig.routeColor}
                  width={5}
                  opacity={0.85}
                />
                <RouteViewport coordinates={route.coordinates} />
              </>
            ) : null}

            {mapPlaces.map((item) => {
              const markerCoordinates = coordinatePair(item.coordinates);
              const markerConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.hospital;
              const isSelected = selectedPlace?.id === item.id;
              if (!markerCoordinates) return null;
              return (
                <MapMarker
                  key={item.id}
                  longitude={markerCoordinates[0]}
                  latitude={markerCoordinates[1]}
                  anchor="bottom"
                  onClick={() => dispatch(selectMapPlace(item.id))}
                  onMouseEnter={() => dispatch(hoverMapPlace(item.id))}
                  onMouseLeave={() => dispatch(hoverMapPlace(null))}
                >
                  <MarkerContent>
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-card shadow-xl ring-4 transition-transform duration-200 group-hover:-translate-y-1',
                        markerConfig.ring,
                        isSelected && 'scale-110 shadow-2xl'
                      )}
                    >
                      <img src={markerConfig.icon} alt={markerConfig.label} className="h-8 w-8 object-contain" />
                    </div>
                    {!isSelected ? (
                      <MarkerTooltip>
                        <PlaceInfoCard
                          place={item}
                          config={markerConfig}
                          compact
                          onRoute={() => {
                            dispatch(selectMapPlace(item.id));
                            requestLocationAndRoute(item);
                          }}
                          onViewDetails={() => navigate(getDetailsPath(item))}
                        />
                      </MarkerTooltip>
                    ) : (
                      <MarkerPopup className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300">
                        <PlaceInfoCard
                          place={item}
                          config={markerConfig}
                          route={route}
                          routeLoading={routeStatus?.loading}
                          onRoute={requestLocationAndRoute}
                          onViewDetails={() => navigate(getDetailsPath(item))}
                        />
                      </MarkerPopup>
                    )}
                  </MarkerContent>
                </MapMarker>
              );
            })}

            {currentLocation ? <CurrentLocationMarker location={currentLocation} /> : null}

            {selectedPlace && selectedCoordinates ? <SelectedPlaceViewport coordinates={selectedCoordinates} /> : null}

            <MapControls
              position="top-right"
              showZoom
              showLocate
              showFullscreen
              onLocate={handleLocate}
            />
          </Map>

          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col gap-2 sm:left-auto sm:w-[340px]">
            {route?.distance ? (
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Route className="h-3.5 w-3.5 text-primary" />
                  {formatDistance(route.distance)}
                </span>
                <span className="text-muted-foreground">{formatDuration(route.duration)}</span>
              </div>
            ) : null}
            {(geocodeStatus?.loading || geocodeStatus?.error || routeStatus?.error || locateError) && (
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                {geocodeStatus?.loading ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="text-muted-foreground">
                  {geocodeStatus?.loading
                    ? 'Finding map location...'
                    : routeStatus?.error || locateError || geocodeStatus?.error}
                </span>
              </div>
            )}
          </div>

          <div className="absolute left-3 top-3 z-20 rounded-full border border-border/70 bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <LocateFixed className="h-3.5 w-3.5 text-primary" />
              {mapPlaces.length} locations
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
