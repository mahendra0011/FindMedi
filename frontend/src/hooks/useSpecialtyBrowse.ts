import { useApiQuery } from './useApiQuery';
import { api } from '../lib/api';
import { CANONICAL_SPECIALTIES } from '../data/specialties';

// ─── Browse-by-specialties data layer ───────────────────────────────────────
// Source of truth = backend /categories/specialties (43 tiles × 13 groups).
// 5-minute cache; every consumer degrades gracefully to the local canonical
// copy (names only) when the API is unreachable — the UI never blanks.

export const SPECIALTIES_STALE_TIME = 5 * 60 * 1000;

/** Legacy-friendly synthetic tile shape for the CANONICAL fallback. */
const FALLBACK_TILE = (code, name, group, icon, nameHi) => ({
  code,
  name,
  aliases: [],
  alsoUnder: [],
  sensitive: false,
  claimsRestricted: false,
  meta: { group: group || 'primary-emergency', nameHi, icon },
  children: [],
});

export function useSpecialtyTree() {
  return useApiQuery(
    ['categories', 'specialty-tree'],
    () => api.getSpecialtyTree(),
    { staleTime: SPECIALTIES_STALE_TIME },
  );
}

/**
 * Top-level browse tiles (43) in group order. Falls back to the local
 * canonical copy (mock names) when the tree API fails.
 */
export function useSpecialtyTiles() {
  const tree = useSpecialtyTree();
  const groups = tree.data?.groups || [];
  const fromApi = groups.length > 0;

  const groupList = fromApi
    ? groups.map((g) => ({ id: g.id, name: g.name, color: g.color, tiles: g.tiles || [] }))
    : [
        {
          id: 'primary-emergency',
          name: 'Primary & Emergency care',
          color: 'blue',
          tiles: CANONICAL_SPECIALTIES.map((spec) => FALLBACK_TILE(spec.code, spec.name)),
        },
      ];

  const allTiles = groupList.flatMap((g) => g.tiles);
  return { ...tree, groups: groupList, tiles: allTiles, fromApi, ready: tree.isSuccess || fromApi };
}

/**
 * Drill-down detail (children incl. cross-lists + conditions/procedures
 * chips + sensitive flags). Returns null data on failure — page handles.
 */
export function useSpecialtyDetail(code) {
  return useApiQuery(
    ['categories', 'specialty', code || ''],
    () => api.getSpecialtyDetail(code),
    { enabled: Boolean(code), staleTime: SPECIALTIES_STALE_TIME },
  );
}

/**
 * Distinct provider/facility counts for a tile across its merged sub-codes.
 * params: { city, facilityId, approved } — matches the backend contract.
 */
export function useBrowseSpecialtyCounts(code, params = {}, options = {}) {
  return useApiQuery(
    ['categories', 'specialty-counts', code || '', params],
    () => api.browseSpecialtyCounts(code, params),
    { enabled: Boolean(code), staleTime: 60_000, ...options },
  );
}

export const resolveInTileList = (tiles, value) =>
  tiles.find((t) => t.code === value || t.name === value) || null;
