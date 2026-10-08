import { useApiQuery } from './useApiQuery';
import { api } from '../lib/api';

// Shared identity so a component's effect deps do not churn on every render
// while the query is still loading.
const EMPTY = [];

/**
 * Read the public category catalogue (rolesmd/10.md - one source of truth for
 * filter chips and select options; hardcoded arrays are the fallback only).
 *
 * @param {string} [type] category type, e.g. 'specialty'
 * @param {string[]} [fallback] used when the API is empty or unreachable
 */
export function useCategories(type, fallback = []) {
  const query = useApiQuery(
    ['categories', 'public', type || 'all'],
    () => api.getPublicCategories(type ? { type } : {}),
    { staleTime: 5 * 60 * 1000 },
  );

  const categories = query.data?.categories || EMPTY;
  return {
    ...query,
    categories,
    names: categories.length ? categories.map((c) => c.name) : fallback,
  };
}
