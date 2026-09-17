/** moderation feature — API response types. */
export interface ModerationItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface ModerationStats {
  total: number;
  [key: string]: unknown;
}
