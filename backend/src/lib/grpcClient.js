import logger from '../config/logger.js';
import { PROTO_PATH } from './grpcServer.js';

// gRPC client with retry budgets (Spec 18): max 2 retries on idempotent
// READS (FindCandidates), 0 retries on WRITES (LockAndAssign — the
// idempotency_key makes a blind retry unsafe).
const READ_RETRIES = 2;

async function loadClient(address) {
  const grpc = (await import('@grpc/grpc-js')).default;
  const protoLoader = (await import('@grpc/proto-loader')).default;
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkg = grpc.loadPackageDefinition(def).findmedi.matching.v1;
  return new pkg.MatchingEngineService(address, grpc.credentials.createInsecure());
}

let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    const addr = process.env.GRPC_MATCHING_ADDR || 'localhost:50051';
    clientPromise = loadClient(addr).catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function grpcFindCandidates(req) {
  let lastErr = null;
  for (let attempt = 0; attempt <= READ_RETRIES; attempt++) {
    try {
      const client = await getClient();
      return await new Promise((resolve, reject) => {
        client.FindCandidates(req, (err, res) => (err ? reject(err) : resolve(res)));
      });
    } catch (err) {
      lastErr = err;
      logger.warn(`grpcFindCandidates attempt ${attempt + 1} failed: ${err.message}`);
    }
  }
  throw lastErr;
}

export async function grpcLockAndAssign(req) {
  // 0 retries on writes.
  const client = await getClient();
  return new Promise((resolve, reject) => {
    client.LockAndAssign(req, (err, res) => (err ? reject(err) : resolve(res)));
  });
}
