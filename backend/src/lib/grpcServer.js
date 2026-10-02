import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../config/logger.js';
import { findCandidatesByHex } from './h3Cache.js';
import { rankCandidatesByRoadETA } from './valhallaRouting.js';
import { acquireLock, releaseLock } from './redlock.js';
import { redisClient, isRedisReady } from '../config/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROTO_PATH = path.resolve(__dirname, '../../proto/matching_engine.proto');

const VERTICAL_TO_PROVIDER = {
  rider: 'rider',
  lawyer: 'lawyer',
  assistant: 'assistant',
  sos: 'ambulance',
  doctor: 'doctor',
};

let grpcServer = null;

async function loadProto() {
  const grpc = (await import('@grpc/grpc-js')).default;
  const protoLoader = (await import('@grpc/proto-loader')).default;
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return { grpc, pkg: grpc.loadPackageDefinition(def).findmedi.matching.v1 };
}

async function findCandidates(call, callback) {
  try {
    const { vertical, pickup_lat, pickup_lng, max_candidates = 10, max_k_ring = 2 } = call.request;
    const providerType = VERTICAL_TO_PROVIDER[String(vertical || '').toLowerCase()] || 'rider';
    const found = await findCandidatesByHex({
      lat: Number(pickup_lat),
      lng: Number(pickup_lng),
      providerType,
      maxRingK: Number(max_k_ring),
    });
    // Hydrate live coords from the location cache (no Mongo in the hot path).
    const list = [];
    if (isRedisReady() && redisClient.isOpen) {
      for (const id of (found.candidates || []).slice(0, max_candidates * 3)) {
        try {
          const raw = await redisClient.get(`provider:location:${id}:${providerType}`)
            || await redisClient.get(`provider:location:${id}`);
          if (!raw) continue;
          const loc = JSON.parse(raw);
          if (loc.lat == null || loc.lng == null) continue;
          list.push({ providerId: String(id).split(':')[0], coordinates: [loc.lng, loc.lat] });
        } catch {}
      }
    }
    const ranked = await rankCandidatesByRoadETA(
      [Number(pickup_lng), Number(pickup_lat)],
      list.slice(0, max_candidates * 2),
      'auto'
    );
    callback(null, {
      candidates: ranked.slice(0, Number(max_candidates)).map((c) => ({
        provider_id: String(c.providerId),
        lat: Number(c.coordinates?.[1] || 0),
        lng: Number(c.coordinates?.[0] || 0),
        road_duration_s: Number(c.roadEtaSeconds || 0),
        distance_km: Number(c.distanceKm || 0),
      })),
    });
  } catch (err) {
    logger.error(`gRPC FindCandidates failed: ${err.message}`);
    callback(null, { candidates: [] });
  }
}

async function lockAndAssign(call, callback) {
  const { booking_id, provider_id, idempotency_key } = call.request || {};
  if (!booking_id || !provider_id || !idempotency_key) {
    return callback(null, { assigned: false, reason: 'BAD_REQUEST' });
  }
  try {
    // Retry budget: 0 retries on writes — single attempt, idempotency key decides.
    if (isRedisReady() && redisClient.isOpen) {
      const seen = await redisClient.set(`grpc:assign:${idempotency_key}`, String(booking_id), { NX: true, EX: 3600 });
      if (seen !== 'OK') {
        const prev = await redisClient.get(`grpc:assign:${idempotency_key}`);
        return callback(null, {
          assigned: String(prev) === String(booking_id),
          reason: String(prev) === String(booking_id) ? 'ASSIGNED' : 'ALREADY_ENGAGED',
        });
      }
    }
    const secret = await acquireLock(`lock:provider:${provider_id}`, `grpc:${booking_id}`, 10000);
    if (!secret) {
      return callback(null, { assigned: false, reason: 'ALREADY_ENGAGED' });
    }
    try {
      const { writeOutboxEvent } = await import('./transactionalOutbox.js');
      await writeOutboxEvent({
        aggregateType: 'RIDE',
        aggregateId: String(booking_id),
        eventType: 'dispatch.provider.assigned',
        payload: { providerId: String(provider_id), via: 'grpc' },
        destinationTopic: 'findmedi.dispatch.booking-events.v1',
      }).catch(() => {});
    } catch {}
    await releaseLock(`lock:provider:${provider_id}`, secret).catch(() => {});
    return callback(null, { assigned: true, reason: 'ASSIGNED' });
  } catch (err) {
    logger.error(`gRPC LockAndAssign failed: ${err.message}`);
    return callback(null, { assigned: false, reason: 'BOOKING_GONE' });
  }
}

export async function startGrpcServer(port = Number(process.env.GRPC_PORT || 50051)) {
  if (grpcServer) return grpcServer;
  const { grpc, pkg } = await loadProto();
  grpcServer = new grpc.Server();
  grpcServer.addService(pkg.MatchingEngineService.service, {
    FindCandidates: findCandidates,
    LockAndAssign: lockAndAssign,
  });
  await new Promise((resolve, reject) => {
    grpcServer.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, bound) => {
      if (err) return reject(err);
      logger.info(`gRPC MatchingEngineService listening on :${bound} (insecure; mesh mTLS terminates at sidecar)`);
      resolve(bound);
    });
  });
  grpcServer.start();
  return grpcServer;
}

export async function stopGrpcServer() {
  if (!grpcServer) return;
  await new Promise((resolve) => grpcServer.tryShutdown(resolve));
  grpcServer = null;
}
