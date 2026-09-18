/**
 * useCart — replaces CartContext.jsx.
 *
 * Cart state + localStorage persistence lives in Redux (cartSlice),
 * so this hook just wires up typed selectors and dispatchers.
 */
'use client';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  addItem as addItemAction,
  updateQty as updateQtyAction,
  removeItem as removeItemAction,
  clearCart as clearCartAction,
  selectCart,
  selectCartEntries,
  selectCartTotalItems,
  selectCartStores,
} from '@/store/slices/cartSlice';
import type { CartEntry, CartItem, CartStore } from '@/store/slices/cartSlice';

export interface UseCartReturn {
  cart: Record<string, CartEntry>;
  entries: CartEntry[];
  totalItems: number;
  stores: CartStore[];
  addItem: (item: CartItem, storeId: string) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

export function useCart(): UseCartReturn {
  const dispatch = useAppDispatch();
  const cart = useAppSelector(selectCart);
  const entries = useAppSelector(selectCartEntries);
  const totalItems = useAppSelector(selectCartTotalItems);
  const stores = useAppSelector(selectCartStores);

  return {
    cart,
    entries: entries as CartEntry[],
    totalItems,
    stores: stores as CartStore[],
    addItem: (item: CartItem, storeId: string) => dispatch(addItemAction({ item, storeId })),
    updateQty: (key: string, qty: number) => dispatch(updateQtyAction({ key, qty })),
    removeItem: (key: string) => dispatch(removeItemAction(key)),
    clearCart: () => dispatch(clearCartAction()),
  };
}
