import { useApiQuery } from './useApiQuery';
import { api } from '../lib/api';
import { CANONICAL_SPECIALTIES } from '../data/specialties';

// ─── Browse-by-specialties data layer ───────────────────────────────────────
// Source of truth = backend /categories/specialties (43 tiles × 13 groups).
// 5-minute cache; every consumer degrades gracefully to the local canonical
// copy (names only) when the API is unreachable — the UI never blanks.

export const SPECIALTIES_STALE_TIME = 5 * 60 * 1000;

export interface SpecialtyMeta {
  group?: string;
  nameHi?: string;
  icon?: string;
  conditions?: string[];
  procedures?: string[];
  symptoms?: string[];
  sensitive?: boolean;
  adClaimsRestricted?: boolean;
}

/** One specialty node (top-level tile or sub-specialty). */
export interface SpecialtyNode {
  code: string;
  name: string;
  aliases?: readonly string[];
  alsoUnder?: readonly string[];
  sensitive?: boolean;
  claimsRestricted?: boolean;
  adClaimsRestricted?: boolean;
  meta?: SpecialtyMeta;
  children?: SpecialtyNode[];
}

export interface SpecialtyGroup {
  id: string;
  name: string;
  color: string;
  tiles: SpecialtyNode[];
}

interface SpecialtyTreeResponse {
  total?: number;
  groups?: SpecialtyGroup[];
  groupsFound?: number;
}

interface QueryState<T> {
  data?: T;
  isLoading: boolean;
  isSuccess: boolean;
  error?: Error | null;
}

export interface SpecialtyTilesResult extends QueryState<SpecialtyTreeResponse> {
  groups: SpecialtyGroup[];
  tiles: SpecialtyNode[];
  fromApi: boolean;
  ready: boolean;
}

export interface SpecialtyDetailResponse extends SpecialtyNode {
  nameHi?: string;
  subs?: SpecialtyNode[];
  conditions?: string[];
  procedures?: string[];
  symptoms?: string[];
}

/** Page contract: the node plus its rendered children (own + cross-listed subs). */
export interface SpecialtyDetailData {
  specialty: SpecialtyNode;
  children: SpecialtyNode[];
}

export interface SpecialtyCountsData {
  code?: string;
  requestedCode?: string;
  doctors?: number;
  hospitals?: number;
}

/** Legacy-friendly synthetic tile shape for the CANONICAL fallback. */
const FALLBACK_TILE = (
  code: string,
  name: string,
  group?: string,
  icon?: string,
  nameHi?: string,
): SpecialtyNode => ({
  code,
  name,
  aliases: [],
  alsoUnder: [],
  sensitive: false,
  claimsRestricted: false,
  meta: { group: group || 'primary-emergency', nameHi, icon },
  children: [],
});

export function useSpecialtyTree(): QueryState<SpecialtyTreeResponse> {
  return useApiQuery(
    ['categories', 'specialty-tree'],
    () => api.getSpecialtyTree(),
    { staleTime: SPECIALTIES_STALE_TIME },
  ) as QueryState<SpecialtyTreeResponse>;
}

/**
 * Top-level browse tiles (43) in group order. Falls back to the local
 * canonical copy (mock names) when the tree API fails.
 */
export function useSpecialtyTiles(): SpecialtyTilesResult {
  const tree = useSpecialtyTree();
  const groups: SpecialtyGroup[] = tree.data?.groups || [];
  const fromApi = groups.length > 0;

  const groupList: SpecialtyGroup[] = fromApi
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
 *
 * The backend serves the node flat with `subs`; this adapter maps it onto the
 * page contract { specialty, children } so consumers never see both shapes.
 */
export function useSpecialtyDetail(code: string): QueryState<SpecialtyDetailData> {
  const query = useApiQuery(
    ['categories', 'specialty', code || ''],
    () => api.getSpecialtyDetail(code),
    { enabled: Boolean(code), staleTime: SPECIALTIES_STALE_TIME },
  ) as QueryState<SpecialtyDetailResponse>;

  const raw = query.data;
  const children = raw?.subs ?? raw?.children ?? [];
  const data: SpecialtyDetailData | undefined = raw
    ? { specialty: { ...raw, children }, children }
    : undefined;

  return { data, isLoading: query.isLoading, isSuccess: query.isSuccess, error: query.error };
}

/**
 * Distinct provider/facility counts for a tile across its merged sub-codes.
 * params: { city, facilityId, approved } — matches the backend contract,
 * whose response fields are `doctors` and `hospitals`.
 */
export function useBrowseSpecialtyCounts(
  code: string,
  params: Record<string, string> = {},
  options: Record<string, unknown> = {},
): QueryState<SpecialtyCountsData> {
  return useApiQuery(
    ['categories', 'specialty-counts', code || '', params],
    () => api.browseSpecialtyCounts(code, params),
    { enabled: Boolean(code), staleTime: 60_000, ...options },
  ) as QueryState<SpecialtyCountsData>;
}

export const resolveInTileList = (tiles: SpecialtyNode[], value: string): SpecialtyNode | null =>
  tiles.find((t) => t.code === value || t.name === value) || null;
