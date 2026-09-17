/** audit-logs feature — API response types. */
export interface AuditLogsItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuditLogsStats {
  total: number;
  [key: string]: unknown;
}
