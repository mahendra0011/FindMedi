/** audit feature — API response types. */
export interface AuditItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuditStats {
  total: number;
  [key: string]: unknown;
}
