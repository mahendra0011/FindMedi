import * as React from "react";
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, LocateFixed, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MapContext = React.createContext(null);

const DEFAULT_CENTER = [77.209, 28.6139];

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLngLat(value, fallback = DEFAULT_CENTER) {
  if (!value) return fallback;
  const pair = Array.isArray(value)
    ? value
    : [value.longitude ?? value.lng, value.latitude ?? value.lat];
  const lng = Number(pair[0]);
  const lat = Number(pair[1]);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : fallback;
}

function normalizeRouteCoordinates(coordinates = []) {
  return coordinates
    .map((point) => normalizeLngLat(point, null))
    .filter(Boolean);
}

export function useMap() {
  const context = React.useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used inside a Map component");
  }
  return context;
}

const osmRasterStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-raster-layer", type: "raster", source: "osm-raster" }],
};

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const maptilerBasicStyle = MAPTILER_KEY ? {
  light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
} : null;

function getActiveStyle(styles) {
  const activeStyles = styles || maptilerBasicStyle || osmRasterStyle;
  if (typeof activeStyles === "string") return activeStyles;
  if (activeStyles.version) return activeStyles;
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  return activeStyles[theme] || activeStyles.light || activeStyles.dark || osmRasterStyle;
}

export function Map({
  children,
  className,
  center = [77.209, 28.6139],
  zoom = 13,
  styles,
  onViewportChange,
  onReady,
  ...options
}) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const [mapInstance, setMapInstance] = React.useState(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const activeStyle = React.useMemo(() => getActiveStyle(styles), [styles]);

  React.useEffect(() => {
    if (!containerRef.current) return undefined;
    if (mapRef.current) return undefined;
    setIsLoaded(false);
    setLoadError("");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: activeStyle,
      center: normalizeLngLat(center),
      zoom: finiteNumber(zoom, 13),
      attributionControl: false,
      ...options,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    setMapInstance(map);

    function handleLoad() { setIsLoaded(true); onReady?.(map); }

    let didFallback = false;
    function handleError() {
      if (!isLoaded && !didFallback && typeof activeStyle === "string") {
        didFallback = true;
        map.setStyle(osmRasterStyle);
      }
      if (!isLoaded) setLoadError("Map is having trouble loading.");
    }

    map.once("load", handleLoad);
    map.on("error", handleError);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      map.off("error", handleError);
      try { map.remove(); } catch { /* map already removed */ }
      mapRef.current = null;
      setMapInstance(null);
      setIsLoaded(false);
    };
  }, [activeStyle]);

  React.useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setStyle(activeStyle);
  }, [activeStyle]);

  React.useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.easeTo({
      center: normalizeLngLat(center),
      zoom: finiteNumber(zoom, mapRef.current.getZoom()),
      duration: 700,
      essential: true,
    });
  }, [center?.[0], center?.[1], isLoaded, zoom]);

  React.useEffect(() => {
    if (!mapRef.current || !onViewportChange) return undefined;
    const handleMove = () => {
      const c = mapRef.current.getCenter();
      onViewportChange({ center: [c.lng, c.lat], zoom: mapRef.current.getZoom(), bearing: mapRef.current.getBearing(), pitch: mapRef.current.getPitch() });
    };
    mapRef.current.on("move", handleMove);
    return () => mapRef.current?.off("move", handleMove);
  }, [onViewportChange]);

  const value = React.useMemo(() => ({ map: mapInstance, isLoaded, containerRef }), [isLoaded, mapInstance]);

  return (
    <MapContext.Provider value={value}>
      <div className={`relative h-full w-full overflow-hidden ${className || ""}`}>
        <div ref={containerRef} className="h-full w-full" />
        {loadError && !isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-4 text-center text-sm font-bold text-muted-foreground backdrop-blur-sm">{loadError}</div>
        )}
        {isLoaded && children}
      </div>
    </MapContext.Provider>
  );
}

const controlPosition = {
  "top-left": "left-3 top-3",
  "top-right": "right-3 top-3",
  "bottom-left": "bottom-8 left-3",
  "bottom-right": "bottom-8 right-3",
};

function ControlButton({ title, children, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border-b border-border/70 bg-card text-foreground shadow-sm transition-colors last:border-b-0 hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
  children,
}) {
  const { map, isLoaded, containerRef } = useMap();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      setTimeout(() => map?.resize(), 80);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, [containerRef, map]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
        accuracy: position.coords.accuracy,
      };
      map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(map.getZoom(), 13) });
      onLocate?.(coords);
    });
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await containerRef.current.requestFullscreen?.();
    }
  };

  return (
    <div
      className={cn(
        "absolute z-30 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur",
        controlPosition[position],
        className
      )}
    >
      {showZoom && (
        <>
          <ControlButton title="Zoom in" disabled={!isLoaded} onClick={() => map?.zoomIn()}>
            <Plus className="h-4 w-4" />
          </ControlButton>
          <ControlButton title="Zoom out" disabled={!isLoaded} onClick={() => map?.zoomOut()}>
            <Minus className="h-4 w-4" />
          </ControlButton>
        </>
      )}
      {showCompass && (
        <ControlButton title="Reset bearing" disabled={!isLoaded} onClick={() => map?.resetNorthPitch()}>
          <Compass className="h-4 w-4" />
        </ControlButton>
      )}
      {showLocate && (
        <ControlButton title="Current location" disabled={!isLoaded} onClick={locate}>
          <LocateFixed className="h-4 w-4" />
        </ControlButton>
      )}
      {showFullscreen && (
        <ControlButton title="Full map" disabled={!isLoaded} onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ControlButton>
      )}
      {children}
    </div>
  );
}

export function MapMarker({
  longitude,
  latitude,
  children,
  draggable = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  ...markerOptions
}) {
  const { map, isLoaded } = useMap();
  const elementRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const markerPosition = normalizeLngLat([longitude, latitude], null);

  if (!elementRef.current && typeof document !== "undefined") {
    elementRef.current = document.createElement("div");
    elementRef.current.className = "mapcn-marker group cursor-pointer";
  }

  React.useEffect(() => {
    if (!map || !isLoaded || !elementRef.current || !markerPosition) return undefined;

    const marker = new maplibregl.Marker({
      element: elementRef.current,
      draggable,
      ...markerOptions,
    })
      .setLngLat(markerPosition)
      .addTo(map);

    markerRef.current = marker;

    const emitDragStart = () => onDragStart?.(marker.getLngLat());
    const emitDrag = () => onDrag?.(marker.getLngLat());
    const emitDragEnd = () => onDragEnd?.(marker.getLngLat());
    marker.on("dragstart", emitDragStart);
    marker.on("drag", emitDrag);
    marker.on("dragend", emitDragEnd);

    return () => {
      marker.off("dragstart", emitDragStart);
      marker.off("drag", emitDrag);
      marker.off("dragend", emitDragEnd);
      marker.remove();
      markerRef.current = null;
    };
  }, [map, isLoaded, draggable, markerPosition?.[0], markerPosition?.[1], onDragStart, onDrag, onDragEnd, markerOptions]);

  React.useEffect(() => {
    if (markerPosition) markerRef.current?.setLngLat(markerPosition);
  }, [markerPosition?.[0], markerPosition?.[1]]);

  React.useEffect(() => {
    if (!elementRef.current) return undefined;
    const element = elementRef.current;
    const handleClick = (event) => {
      event.stopPropagation();
      onClick?.(event);
    };
    const handleEnter = (event) => onMouseEnter?.(event);
    const handleLeave = (event) => onMouseLeave?.(event);
    element.addEventListener("click", handleClick);
    element.addEventListener("mouseenter", handleEnter);
    element.addEventListener("mouseleave", handleLeave);
    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleEnter);
      element.removeEventListener("mouseleave", handleLeave);
    };
  }, [onClick, onMouseEnter, onMouseLeave]);

  React.useEffect(() => {
    if (!elementRef.current) return undefined;
    if (!rootRef.current) rootRef.current = createRoot(elementRef.current);
    rootRef.current.render(children);
    return undefined;
  }, [children]);

  React.useEffect(
    () => () => {
      setTimeout(() => rootRef.current?.unmount(), 0);
    },
    []
  );

  return null;
}

export function MarkerContent({ children, className }) {
  return <div className={cn("relative", className)}>{children}</div>;
}

export function MarkerTooltip({ children, className }) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-full left-1/2 z-40 mb-3 hidden -translate-x-1/2 group-hover:block",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MarkerLabel({ children, position = "top", className }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-[11px] font-semibold text-foreground shadow",
        position === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MarkerPopup({ children, className }) {
  return (
    <div className={cn("mapcn-marker-popup absolute bottom-full left-1/2 z-40 mb-3 -translate-x-1/2", className)}>
      {children}
    </div>
  );
}

export function MapPopup({
  longitude,
  latitude,
  children,
  className,
  closeButton = false,
  closeOnClick = false,
  focusAfterOpen = false,
  onClose,
  ...popupOptions
}) {
  const { map, isLoaded } = useMap();
  const popupRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const popupPosition = normalizeLngLat([longitude, latitude], null);

  React.useEffect(() => {
    if (!map || !isLoaded || !popupPosition) return undefined;

    const content = document.createElement("div");
    contentRef.current = content;
    rootRef.current = createRoot(content);

    const popup = new maplibregl.Popup({
      closeButton,
      closeOnClick,
      focusAfterOpen,
      offset: 28,
      className: cn("medicore-map-popup", className),
      ...popupOptions,
    })
      .setLngLat(popupPosition)
      .setDOMContent(content)
      .addTo(map);

    popupRef.current = popup;
    popup.on("close", onClose || (() => {}));

    return () => {
      popup.off("close", onClose || (() => {}));
      popup.remove();
      setTimeout(() => rootRef.current?.unmount(), 0);
      popupRef.current = null;
      contentRef.current = null;
    };
  }, [map, isLoaded, popupPosition?.[0], popupPosition?.[1], closeButton, closeOnClick, focusAfterOpen, className, popupOptions, onClose]);

  React.useEffect(() => {
    if (popupPosition) popupRef.current?.setLngLat(popupPosition);
  }, [popupPosition?.[0], popupPosition?.[1]]);

  React.useEffect(() => {
    rootRef.current?.render(children);
  }, [children]);

  return null;
}

export function MapRoute({
  id,
  coordinates,
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  interactive = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  const { map, isLoaded } = useMap();
  const routeId = React.useMemo(
    () => id || `map-route-${Math.random().toString(36).slice(2)}`,
    [id]
  );
  const sourceId = `${routeId}-source`;
  const safeCoordinates = React.useMemo(
    () => normalizeRouteCoordinates(coordinates),
    [coordinates]
  );

  React.useEffect(() => {
    if (!map || !isLoaded || safeCoordinates.length < 2) return undefined;

    const data = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: safeCoordinates },
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: routeId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": color,
          "line-width": width,
          "line-opacity": opacity,
          ...(dashArray ? { "line-dasharray": dashArray } : {}),
        },
      });
    } else {
      map.getSource(sourceId).setData(data);
      map.setPaintProperty(routeId, "line-color", color);
      map.setPaintProperty(routeId, "line-width", width);
      map.setPaintProperty(routeId, "line-opacity", opacity);
      if (dashArray) map.setPaintProperty(routeId, "line-dasharray", dashArray);
    }

    const click = () => onClick?.();
    const enter = () => {
      map.getCanvas().style.cursor = "pointer";
      onMouseEnter?.();
    };
    const leave = () => {
      map.getCanvas().style.cursor = "";
      onMouseLeave?.();
    };

    if (interactive) {
      map.on("click", routeId, click);
      map.on("mouseenter", routeId, enter);
      map.on("mouseleave", routeId, leave);
    }

    return () => {
      try {
        if (!map.getStyle()) return;
        if (interactive && map.getLayer(routeId)) {
          map.off("click", routeId, click);
          map.off("mouseenter", routeId, enter);
          map.off("mouseleave", routeId, leave);
        }
        if (map.getLayer(routeId)) map.removeLayer(routeId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* map already removed */ }
    };
  }, [map, isLoaded, safeCoordinates, color, width, opacity, dashArray, interactive, onClick, onMouseEnter, onMouseLeave, routeId, sourceId]);

  return null;
}
