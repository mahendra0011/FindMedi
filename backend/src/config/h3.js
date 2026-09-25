/**
 * Uber H3 Spatial Index Resolutions by FindMedi Vertical
 * Res 6: ~36 km² area (~3.2 km edge) -> Emergency SOS & Regional Ambulance
 * Res 7: ~5.1 km² area (~1.2 km edge) -> Lawyers, Doctors, Medical Assistants
 * Res 8: ~0.7 km² area (~460 m edge) -> Urban Cab / Auto / Bike Riders
 * Res 9: ~0.1 km² area (~170 m edge) -> Precise pickup/dropoff snapping
 */
export const H3_RESOLUTION_SOS = 6;
export const H3_RESOLUTION_CONSULT = 7;
export const H3_RESOLUTION_RIDER = 8;
export const H3_RESOLUTION_CITY = 8;
export const H3_RESOLUTION_FINE = 9;

export const H3_MAX_RING_K = Number(process.env.H3_MAX_RING_K || 8);
export const H3_MIN_CANDIDATES = Number(process.env.H3_MIN_CANDIDATES || 6);
export const H3_PROVIDER_TTL_SECONDS = Number(process.env.H3_PROVIDER_TTL_SECONDS || 120); // 2 minutes

export function getResolutionForVertical(vertical) {
  switch (vertical) {
    case 'emergency_sos':
    case 'ambulance':
      return H3_RESOLUTION_SOS;
    case 'lawyer':
    case 'assistant':
    case 'emergency_doctor':
    case 'doctor':
      return H3_RESOLUTION_CONSULT;
    case 'rider':
    case 'ride':
    case 'delivery':
    default:
      return H3_RESOLUTION_RIDER;
  }
}
