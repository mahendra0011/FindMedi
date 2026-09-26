/**
 * Recreates all FindMedi Kafka topics (brokers carry no volumes in dev,
 * so a fresh ZK loses topic metadata — this script restores it in one shot).
 * Usage: KAFKA_BOOTSTRAP_SERVERS=localhost:9092 node backend/scripts/kafka/create-topics.mjs
 */
import { Kafka } from 'kafkajs';
import { KAFKA_TOPICS } from '../../src/config/kafka.js';

const PARTITIONS = {
  BOOKING_EVENTS: 12,
  DRIVER_TELEMETRY: 32,
  PROVIDER_PRESENCE: 8,
  BILLING_EVENTS: 6,
  SOS_ALERTS: 16,
  LAB_ORDER_EVENTS: 6,
  VITALS_TELEMETRY: 6,
  HOSPITAL_ADMISSIONS: 6,
  PHARMACY_INVENTORY: 6,
  RETRY_5S: 3,
  RETRY_30S: 3,
  DLQ: 3,
};

const COMPACT = new Set([KAFKA_TOPICS.PROVIDER_PRESENCE]);

const kafka = new Kafka({
  clientId: 'findmedi-topic-bootstrap',
  brokers: (process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092').split(','),
});
const admin = kafka.admin();
await admin.connect();

for (const [key, topic] of Object.entries(KAFKA_TOPICS)) {
  const configEntries = COMPACT.has(topic)
    ? [{ name: 'cleanup.policy', value: 'compact' }]
    : [];
  const created = await admin.createTopics({
    topics: [{ topic, numPartitions: PARTITIONS[key] || 6, replicationFactor: 1, configEntries }],
  });
  console.log(`${created ? 'Created' : 'Exists'}: ${topic}`);
}

await admin.disconnect();
console.log('Topic bootstrap complete.');
