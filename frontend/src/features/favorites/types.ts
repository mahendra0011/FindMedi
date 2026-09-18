/** Favorites feature — API response types. */
export type FavoriteRefType = 'doctor' | 'hospital' | 'clinic' | 'lab' | 'pharmacy' | string;

export interface FavoriteItem {
  _id: string;
  refType: FavoriteRefType;
  refName?: string;
  profile?: Record<string, unknown>;
}
