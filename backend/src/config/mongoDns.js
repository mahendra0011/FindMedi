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
