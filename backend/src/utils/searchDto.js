/**
 * 10.md 4.1 public search DTO: an ALLOWLIST, not the index document.
 *
 * The engine may hand back whatever the index stored — the OpenSearch path
 * spreads `...h._source` verbatim — and this route answers anonymous callers.
 * A field nobody thought about (a phone number, an ownerUserId, the geoPoint
 * of someone's home) must not walk out on an endpoint nobody is logged into,
 * so the card is built by copying KNOWN keys only; anything else is dropped
 * by construction rather than caught by review.
 *
 * Leaf module (no express, no models): the contract tests import it without
 * loading the route graph, and services may reuse it without an import cycle.
 */
const CARD_KEYS = ['providerId', 'vertical', 'fullName', 'specialization', 'city', 'slug'];

export const toSearchCard = (hit) => {
  const card = {};
  if (hit?.score !== undefined) card.score = hit.score;
  for (const key of CARD_KEYS) {
    if (hit?.[key] !== undefined) card[key] = hit[key];
  }
  return card;
};
