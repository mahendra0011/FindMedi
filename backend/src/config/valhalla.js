import logger from './logger.js';

export const VALHALLA_API_URL = process.env.VALHALLA_API_URL || 'http://localhost:8002';
export const VALHALLA_TIMEOUT_MS = Number(process.env.VALHALLA_TIMEOUT_MS || 2500);

export const COSTING_PROFILES = {
  RIDER_AUTO: 'auto',
  RIDER_BIKE: 'bicycle',
  RIDER_MOTORCYCLE: 'motorcycle',
  AMBULANCE_EMERGENCY: 'emergency',
  PEDESTRIAN: 'pedestrian',
};

export function isValhallaConfigured() {
  return Boolean(VALHALLA_API_URL);
}
