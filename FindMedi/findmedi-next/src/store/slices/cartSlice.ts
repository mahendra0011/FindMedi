import { createSlice, createSelector } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  [key: string]: unknown;
}

export interface CartEntry {
  storeId: string;
  item: CartItem;
  qty: number;
  key?: string;
}

export interface CartState {
  [key: string]: CartEntry;
}

const STORAGE_KEY = 'mediCore_cart';

function loadCart(): CartState {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCart(cart: CartState): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* Silently fail if localStorage is full */
  }
}

const initialState: CartState = loadCart();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { item, storeId } = action.payload as { item: CartItem; storeId: string };
      const key = `${storeId}_${item.id}`;
      if (state[key]) {
        state[key].qty += 1;
      } else {
        state[key] = { storeId, item, qty: 1 };
      }
      saveCart(state);
    },
    updateQty: (state, action) => {
      const { key, qty } = action.payload as { key: string; qty: number };
      if (qty <= 0) {
        delete state[key];
      } else if (state[key]) {
        state[key].qty = qty;
      }
      saveCart(state);
    },
    removeItem: (state, action) => {
      delete state[action.payload as string];
      saveCart(state);
    },
    clearCart: (state) => {
      Object.keys(state).forEach((key) => delete state[key]);
      saveCart(state);
    },
  },
});

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectCart = (state: { cart: CartState }): CartState => state.cart;

const computeEntries = (cart: CartState) =>
  Object.entries(cart)
    .filter(([, v]) => v && v.qty > 0)
    .map(([key, val]) => ({ key, ...val }));

export const selectCartEntries = createSelector([selectCart], computeEntries);

export const selectCartTotalItems = createSelector([selectCart], (cart) =>
  Object.values(cart).reduce((sum, v) => sum + (v?.qty || 0), 0),
);

export interface CartStore {
  storeId: string;
  items: CartEntry[];
  subtotal: number;
}

const computeStores = (entries: ReturnType<typeof computeEntries>): CartStore[] => {
  const storesMap: Record<string, CartStore> = {};
  entries.forEach((val) => {
    if (!storesMap[val.storeId]) {
      storesMap[val.storeId] = { storeId: val.storeId, items: [], subtotal: 0 };
    }
    const store = storesMap[val.storeId]!;
    store.items.push(val);
    store.subtotal += (val.item.price || 0) * val.qty;
  });
  return Object.values(storesMap) as CartStore[];
};

export const selectCartStores = createSelector([selectCartEntries], computeStores);

export const { addItem, updateQty, removeItem, clearCart } = cartSlice.actions;

export default cartSlice.reducer;
