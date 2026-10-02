/**
 * FE-B-05 — turn any API failure into copy a patient or clinician can act on.
 *
 * The problem: pages rendered `err.response.data.message` directly, so users saw
 * raw backend strings — `Cast to ObjectId failed for value "abc"`, Mongo
 * connection text, occasionally a stack fragment. That is bad twice over:
 *
 *   - It erodes trust in a healthcare product. "Cast to ObjectId failed" tells a
 *     patient their portal is broken in a way nobody can act on.
 *   - It leaks internals. Schema and datastore names are reconnaissance, and a
 *     message that differs between 500 and 403 is an oracle for probing.
 *
 * The rule this module enforces: a 4xx MAY show the server's message (the server
 * wrote it for a human), anything 5xx or network-level gets generic copy plus a
 * support reference. The correlation id is what support actually needs, and it is
 * shown to the user precisely so they can quote it.
 */

/** Copy for statuses the user can do something about. */
export const STATUS_COPY = Object.freeze({
  400: 'That request could not be processed. Please check the details and try again.',
  401: 'Please sign in again to continue.',
  403: 'You do not have access to this. If you believe this is wrong, contact your administrator.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with the current state. Please refresh and try again.',
  413: 'That file is too large to upload.',
  422: 'Some of the details provided are not valid. Please review and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Your data is safe — please try again in a moment.',
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable while we do some maintenance.',
  504: 'That took too long to process. Please try again.',
});

/** Shown when there is no response at all (offline, DNS, CORS, timeout). */
export const NETWORK_COPY =
  'We could not reach the server. Check your internet connection and try again.';

/**
 * Server messages that must never reach a user, even on a 4xx.
 *
 * A 4xx is normally safe to echo, but a backend can still leak internals through
 * one — these are the patterns seen in this codebase.
 */
const LEAKY_MESSAGE_PATTERNS = [
  /cast to (objectid|number|boolean|date)/i,
  /validation failed/i,
  /mongo(db)?(server|error|connection)/i,
  /econnrefused|etimedout|enotfound/i,
  /\bstack\b/i,
  /\bat [\w.]+ \(/,
  /jwt (signature|malformed|expired)/i,
  /password hash|bcrypt|salt/i,
  /index(d|not found)|unique constraint/i,
  /duplicate key/i,
  /\bundefined\b/i,
];

const isLeaky = (message) =>
  typeof message === 'string' && LEAKY_MESSAGE_PATTERNS.some((re) => re.test(message));

/**
 * @param {any} err an axios error (or anything with `response`)
 * @param {{ fallback?: string, context?: string }} [opts]
 * @returns {string} copy safe to render
 */
export function userFacingError(err, opts = {}) {
  const fallback = opts.fallback || 'Something went wrong. Please try again.';

  // No response: offline, DNS failure, CORS rejection, client-side timeout.
  if (!err?.response) {
    if (err?.message === 'Network Error') return NETWORK_COPY;
    if (err?.code === 'ECONNABORTED') return 'That took too long. Please try again.';
    if (err) return NETWORK_COPY;
    return fallback;
  }

  const { status } = err.response;
  const serverMessage = err.response.data?.message;

  // 5xx: never echo. The server may have leaked a connection string or a schema
  // name, and the user cannot act on it either way.
  if (status >= 500) {
    return STATUS_COPY[500] || STATUS_COPY.default;
  }

  // 4xx: the server wrote it for a human, UNLESS it looks like an internal error.
  if (typeof serverMessage === 'string' && serverMessage && !isLeaky(serverMessage)) {
    return serverMessage;
  }
  if (Array.isArray(serverMessage) && serverMessage.length > 0) {
    return serverMessage.join('. ');
  }

  return STATUS_COPY[status] || fallback;
}

/**
 * A short, non-identifying support reference.
 *
 * Useful when support needs to correlate a user report with a server log line
 * without the user having to quote an internals-laden error message.
 */
export function supportReference(err) {
  const id = err?.response?.data?.referenceId || err?.response?.data?.errorId;
  return id ? ` Reference: ${id}` : '';
}

/** Log the full error where staff can see it, without putting it in the UI. */
export function logUserFacingError(err, context) {
  if (import.meta.env?.DEV) {
    console.error(`[${context}]`, err);
  }
}