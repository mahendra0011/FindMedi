/** export feature — API response types. */
export interface ExportItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface ExportStats {
  total: number;
  [key: string]: unknown;
}
