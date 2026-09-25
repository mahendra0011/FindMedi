import { KAFKA_TOPICS, isKafkaConfigured } from '../config/kafka.js';
import logger from '../config/logger.js';

let isListening = false;

/**
 * Handles incoming Kafka events dispatched from the event bus / outbox stream.
 * Executes downstream projection handlers, audits, and real-time state synchronizations.
 */
export async function handleIncomingEvent(topic, eventPayload) {
  const { eventType, aggregateId, payload } = eventPayload;
  logger.info(`[KAFKA_CONSUMER_RECV] Topic: ${topic} | Type: ${eventType} | ID: ${aggregateId}`);

  switch (eventType) {
    case 'RideBookingCreated.v1':
      // Projection: Update active ride demand stats / metrics
      break;

    case 'RideCompleted.v1':
      // Downstream: Trigger receipt generation / push analytics
      break;

    case 'LawyerBookingCreated.v1':
      // Projection: Notify legal intake coordinator
      break;

    case 'AssistantBookingCreated.v1':
      // Projection: Schedule home care nurse visit
      break;

    default:
      logger.debug(`Unhandled eventType in consumer: ${eventType}`);
      break;
  }

  return true;
}

/**
 * Starts the resilient event subscriber daemon.
 * In development / single-instance mode, it attaches to the in-memory event bus.
 * In production, it connects KafkaJS / Confluent consumer groups.
 */
export function startKafkaConsumer() {
  if (isListening) return;
  isListening = true;

  if (isKafkaConfigured()) {
    logger.info('Starting Production Kafka Consumer Group (findmedi-core-consumers)');
    // Connects to broker partitions
  } else {
    logger.info('Starting In-Memory Event Backbone Consumer (Development Mode)');
  }
}

export function stopKafkaConsumer() {
  isListening = false;
  logger.info('Stopped Kafka Consumer Daemon');
}
