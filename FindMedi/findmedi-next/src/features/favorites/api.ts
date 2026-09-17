/**
 * Favorites feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { FavoriteItem } from './types';

export const getFavorites = (): Promise<{ favorites: FavoriteItem[] }> =>
  Promise.resolve({ favorites: [] });

export const removeFavorite = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
