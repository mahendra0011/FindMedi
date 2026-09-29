/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * MapTiler API key used by the basemap style (see `components/ui/map.tsx`) and
   * by the geocoding calls in `store/slices/mapSlice.js`.
   *
   * Optional on purpose: when it is absent the map falls back to the free
   * OpenStreetMap raster style and geocoding stays disabled, so the app still
   * boots. Typed here (instead of casting `import.meta` to `any`) so the key is
   * `string | undefined` at every call site.
   */
  readonly VITE_MAPTILER_API_KEY?: string;
}
