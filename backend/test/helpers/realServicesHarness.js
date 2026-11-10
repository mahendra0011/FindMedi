import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';

const timeoutMs = Number(process.env.REAL_SERVICES_TIMEOUT_MS || 8000);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for REAL_SERVICES_REQUIRED= true`);
  return value;
}

export function realServicesConfigured() {
  return Boolean(
    process.env.MONGO_REPLICA_TEST_URI
    && process.env.REDIS_URL
    && process.env.CLAMAV_HOST
    && process.env.OPENSEARCH_NODE,
  );
}

export async function pingClamAv({ host = process.env.CLAMAV_HOST, port = Number(process.env.CLAMAV_PORT || 3310) } = {}) {
  if (!host) throw new Error('CLAMAV_HOST is required');
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let response = '';
    const timer = setTimeout(() => socket.destroy(new Error(`ClamAV PING timed out after ${timeoutMs}ms`)), timeoutMs);
    const finish = (error, value) => {
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.once('connect', () => socket.write('zPING\0'));
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('PONG')) finish(null, response.replaceAll('\0', '').trim());
      else if (response.includes('ERROR')) finish(new Error(`ClamAV PING failed: ${response.replaceAll('\0', '').trim()}`));
    });
    socket.once('error', (error) => finish(error));
  });
}

export async function scanClamAvBuffer(buffer, { host = process.env.CLAMAV_HOST, port = Number(process.env.CLAMAV_PORT || 3310) } = {}) {
  if (!host) throw new Error('CLAMAV_HOST is required');
  const payload = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  const end = Buffer.alloc(4);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let response = '';
    const timer = setTimeout(() => socket.destroy(new Error(`ClamAV scan timed out after ${timeoutMs}ms`)), timeoutMs);
    const finish = (error, value) => {
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value.replaceAll('\0', '').trim());
    };
    socket.once('connect', () => {
      socket.write('zINSTREAM\0');
      socket.write(Buffer.concat([size, payload, end]));
    });
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes(' OK\0') || response.includes(' FOUND\0') || response.includes(' ERROR\0')) {
        finish(null, response);
      }
    });
    socket.once('error', (error) => finish(error));
  });
}

export async function withRedisProbe(run) {
  const client = createClient({ url: required('REDIS_URL'), socket: { connectTimeout: timeoutMs } });
  client.on('error', () => {});
  await client.connect();
  const key = `findmedi:harness:${randomUUID()}`;
  try {
    const pong = await client.ping();
    await client.set(key, 'ok', { EX: 30 });
    const value = await client.get(key);
    await run({ pong, value });
  } finally {
    await client.del(key).catch(() => {});
    await client.quit().catch(() => {});
  }
}

export async function withOpenSearchProbe(run) {
  const node = required('OPENSEARCH_NODE').replace(/\/$/, '');
  const user = process.env.OPENSEARCH_USERNAME;
  const password = process.env.OPENSEARCH_PASSWORD;
  const headers = { 'content-type': 'application/json' };
  if (user && password) headers.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  const request = async (route, init = {}) => {
    const response = await fetch(`${node}${route}`, {
      ...init,
      headers: { ...headers, ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`OpenSearch ${response.status} for ${route}`);
    return response.status === 204 ? null : response.json();
  };

  const index = `findmedi_harness_${randomUUID().replaceAll('-', '')}`;
  const documentId = randomUUID();
  try {
    const health = await request('/');
    await request(`/${index}`, { method: 'PUT', body: JSON.stringify({ mappings: { properties: { probe: { type: 'keyword' } } } }) });
    await request(`/${index}/_doc/${documentId}`, { method: 'PUT', body: JSON.stringify({ probe: 'findmedi-harness-ok' }) });
    await request(`/${index}/_refresh`, { method: 'POST' });
    const result = await request(`/${index}/_doc/${documentId}`);
    await run({ health, result });
  } finally {
    // The index name is generated per run, so cleanup cannot target application data.
    await fetch(`${node}/${index}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => {});
  }
}

export function requireRealServiceEnvironment() {
  if (process.env.REAL_SERVICES_REQUIRED !== 'true') return;
  for (const name of ['MONGO_REPLICA_TEST_URI', 'REDIS_URL', 'CLAMAV_HOST', 'OPENSEARCH_NODE']) required(name);
}
