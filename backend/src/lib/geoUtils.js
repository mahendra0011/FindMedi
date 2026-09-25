/**
 * File 02/06 — canonical geospatial helpers for instant dispatch.
 * Single source of truth for distance math; re-exported from rideService.js
 * (which owns the original implementation) so lib ↔ services stay Housed
 * without circular imports (this module depends on services, never reverse).
 */
export { calculateDistanceKm, estimateETA } from '../services/rideService.js';
