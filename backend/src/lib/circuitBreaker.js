import logger from '../config/logger.js';

// Spec 18 circuit breaker: 10 consecutive Valhalla failures → OPEN 5s,
// degrade to Haversine (callers already implement the fallback; the breaker
// skips the doomed HTTP attempt entirely). Half-open probe on next call.
const FAILURE_THRESHOLD = 10;
const OPEN_MS = 5000;

const breakers = new Map();

export function getBreaker(name = 'valhalla') {
  if (!breakers.has(name)) {
    breakers.set(name, { failures: 0, openedAt: 0, state: 'CLOSED' });
  }
  return breakers.get(name);
}

export function isOpen(name = 'valhalla') {
  const b = getBreaker(name);
  if (b.state === 'OPEN') {
    if (Date.now() - b.openedAt >= OPEN_MS) {
      b.state = 'HALF_OPEN';
      return false;
    }
    return true;
  }
  return false;
}

export function recordSuccess(name = 'valhalla') {
  const b = getBreaker(name);
  b.failures = 0;
  if (b.state !== 'CLOSED') {
    b.state = 'CLOSED';
    logger.info(`[breaker:${name}] CLOSED (probe succeeded)`);
  }
}

export function recordFailure(name = 'valhalla') {
  const b = getBreaker(name);
  b.failures += 1;
  if (b.failures >= FAILURE_THRESHOLD && b.state === 'CLOSED') {
    b.state = 'OPEN';
    b.openedAt = Date.now();
    logger.error(`[breaker:${name}] OPEN after ${b.failures} consecutive failures; degrading for ${OPEN_MS}ms`);
  }
}

export function resetBreaker(name = 'valhalla') {
  breakers.set(name, { failures: 0, openedAt: 0, state: 'CLOSED' });
}

// Wraps an async fn: skips the call while OPEN, records outcome otherwise.
export async function withBreaker(name, fn, fallback) {
  if (isOpen(name)) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
  try {
    const res = await fn();
    recordSuccess(name);
    return res;
  } catch (err) {
    recordFailure(name);
    throw err;
  }
}
