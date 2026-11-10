import dns from 'dns';

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

const isLocalResolver = (server) =>
  server === '127.0.0.1'
  || server === '::1'
  || server.startsWith('127.');

export const configureMongoDns = () => {
  const configuredServers = (process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map(server => server.trim())
    .filter(Boolean);

  const currentServers = dns.getServers();
  const shouldUseFallback = configuredServers.length > 0
    || currentServers.length === 0
    || currentServers.every(isLocalResolver);

  if (!shouldUseFallback) return currentServers;

  const servers = configuredServers.length > 0 ? configuredServers : FALLBACK_DNS_SERVERS;
  dns.setServers(servers);
  return servers;
};

/**
 * Atlas SRV lookups intermittently fail with querySrv ECONNREFUSED on some
 * Windows DNS stacks. Seed/migration scripts connect once at startup, where a
 * single flaky lookup aborts the whole run — so retry transient DNS/connect
 * failures with backoff. Non-transient errors (bad credentials, etc.) throw
 * immediately.
 */
const RETRY_DELAYS_MS = [1000, 5000, 15000, 30000, 30000];

export const connectMongooseWithRetry = async (mongoose, uri, attempts = RETRY_DELAYS_MS.length + 1) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mongoose.connect(uri);
    } catch (err) {
      const msg = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.code || ''}`;
      const transient = /querySrv|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ESERVFAIL/i.test(msg);
      if (!transient || attempt === attempts) throw err;
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 30000;
      console.warn(`Mongo connect attempt ${attempt}/${attempts} failed (${err.code || err.message}) — retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
