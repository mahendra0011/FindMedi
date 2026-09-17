/** Inventory feature barrel. */
export type { InventoryItem, InventoryStats } from './types';
export { inventoryApi } from './api';
export {
  useInventoryItems,
  useInventoryStats,
  useCreateItem,
  useAddStock,
  useIssueItem,
  useCreatePR,
  useCreatePO,
  useReceiveGRN,
} from './hooks';
