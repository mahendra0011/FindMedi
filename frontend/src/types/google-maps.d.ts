/**
 * Minimal Google Maps type declarations.
 *
 * The Google Maps JS API is loaded at runtime via a <script> tag, so there are
 * no npm types to install. These stubs cover only the surface area used by the
 * DeliveryTrackingMap component. In production, install @types/google.maps for
 * full type coverage.
 */

interface GoogleMap {
  getZoom(): number;
  flyTo(opts: Record<string, unknown>): void;
  setStyle(style: unknown): void;
  setPaintProperty(key: string, value: unknown): void;
  on(event: string, listener: (...args: unknown[]) => void): GoogleMap;
  off(event: string, listener: (...args: unknown[]) => void): GoogleMap;
  once(event: string, listener: (...args: unknown[]) => void): GoogleMap;
  addControl(control: unknown, pos?: string): GoogleMap;
  addSource(id: string, source: unknown): GoogleMap;
  addLayer(layer: unknown): GoogleMap;
  getSource(id: string): unknown;
  getCenter(): { lng: number; lat: number };
  getBearing(): number;
  getPitch(): number;
  getCanvas(): HTMLCanvasElement;
  resize(): void;
  remove(): void;
}

interface GoogleMarker {
  setPosition(pos: { lat: number; lng: number }): GoogleMarker;
  setMap(map: GoogleMap | null): GoogleMarker;
}

type GoogleSize = {
  width: number;
  height: number;
};

/** Shape of the Google Maps JS API attached at runtime by the Maps script. */
type GoogleMapsAPI = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
    Marker: new (opts: Record<string, unknown>) => GoogleMarker;
    Size: new (w: number, h: number) => GoogleSize;
    Point: new (x: number, y: number) => GoogleSize;
    LatLngLiteral: { lat: number; lng: number };
  };
};

declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      type Map = GoogleMap;
      type Marker = GoogleMarker;
      type Size = GoogleSize;
    }
  }
  interface Window {
    google?: GoogleMapsAPI;
  }
  const google: GoogleMapsAPI;
}

export {};
