import { createContext, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import type { Unmodelled } from '@/lib/apiTypes';

const CartContext = createContext();

export function CartProvider({ children }: Unmodelled) {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const entries = useSelector(selectCartEntries);
  const totalItems = useSelector(selectCartTotalItems);
  const stores = useSelector(selectCartStores);

  const addItem = (item: Unmodelled, storeId: Unmodelled) => dispatch(addItemAction({ item, storeId }));
  const updateQty = (key: Unmodelled, qty: Unmodelled) => dispatch(updateQtyAction({ key, qty }));
  const removeItem = (key: Unmodelled) => dispatch(removeItemAction(key));
  const clearCart = () => dispatch(clearCartAction());

  return (
    <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clearCart, entries, totalItems, stores }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
