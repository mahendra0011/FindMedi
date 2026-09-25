import logger from './logger.js';

export const KAFKA_BOOTSTRAP_SERVERS = (process.env.KAFKA_BOOTSTRAP_SERVERS || '').split(',').filter(Boolean);
export const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'findmedi-core-api';
export const SCHEMA_REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081';

export const KAFKA_TOPICS = {
  BOOKING_EVENTS: 'findmedi.dispatch.booking-events.v1',
  DRIVER_TELEMETRY: 'findmedi.telemetry.driver-locations.v1',
  PROVIDER_PRESENCE: 'findmedi.provider.presence.v1',
  BILLING_EVENTS: 'findmedi.billing.payment-events.v1',
  SOS_ALERTS: 'findmedi.emergency.sos-alerts.v1',
  LAB_ORDER_EVENTS: 'findmedi.diagnostics.lab-order-events.v1',
  VITALS_TELEMETRY: 'findmedi.clinical.vitals-telemetry.v1',
  HOSPITAL_ADMISSIONS: 'findmedi.hospital.admission-events.v1',
  PHARMACY_INVENTORY: 'findmedi.pharmacy.inventory-delta.v1',
};

export function isKafkaConfigured() {
  return KAFKA_BOOTSTRAP_SERVERS.length > 0;
}
