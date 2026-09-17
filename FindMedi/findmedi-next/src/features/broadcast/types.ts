/** broadcast feature — API response types. */
export interface BroadcastItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface BroadcastStats {
  total: number;
  [key: string]: unknown;
}
