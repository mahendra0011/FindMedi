import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'mediCore_cart';

function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Silently fail if localStorage is full
  }
}

const initialState = loadCart();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { item, storeId } = action.payload;
      const key = `${storeId}_${item.id}`;
      if (state[key]) {
        state[key].qty += 1;
      } else {
        state[key] = { storeId, item, qty: 1 };
      }
      saveCart(state);
    },
    updateQty: (state, action) => {
      const { key, qty } = action.payload;
      if (qty <= 0) {
        delete state[key];
      } else if (state[key]) {
        state[key].qty = qty;
      }
      saveCart(state);
    },
    removeItem: (state, action) => {
      delete state[action.payload];
      saveCart(state);
    },
    clearCart: (state) => {
      Object.keys(state).forEach(key => delete state[key]);
      saveCart(state);
    },
  },
});

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectCart = (state) => state.cart;

export const selectCartEntries = (state) => {
  const cart = state.cart;
  return Object.entries(cart)
    .filter(([, v]) => v && v.qty > 0)
    .map(([key, val]) => ({ key, ...val }));
};

export const selectCartTotalItems = (state) => {
  const cart = state.cart;
  return Object.values(cart).reduce((sum, v) => sum + (v?.qty || 0), 0);
};

export const selectCartStores = (state) => {
  const entries = selectCartEntries(state);
  const storesMap = {};
  entries.forEach(val => {
    if (!storesMap[val.storeId]) {
      storesMap[val.storeId] = { storeId: val.storeId, items: [], subtotal: 0 };
    }
    storesMap[val.storeId].items.push(val);
    storesMap[val.storeId].subtotal += (val.item.price || 0) * val.qty;
  });
  return Object.values(storesMap);
};

export const { addItem, updateQty, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;