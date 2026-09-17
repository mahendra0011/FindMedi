/** Inventory feature — API response types. */
export interface InventoryItem {
  _id: string;
  itemName: string;
  category?: string;
  unit?: string;
  currentStock: number;
  minStockLevel: number;
  unitPrice?: string;
  supplier?: string;
  location?: string;
  expiryDate?: string;
  lastIssued?: string;
}

export interface InventoryStats {
  total: number;
  lowStock: number;
  expiring: number;
  deadStock: number;
}
