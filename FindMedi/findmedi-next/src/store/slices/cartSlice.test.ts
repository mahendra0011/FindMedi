/**
 * Tests for the cart Redux slice.
 * Tests reducer logic without needing a full Redux store.
 */
/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import cartReducer, { addItem, updateQty, removeItem, clearCart, selectCartEntries, selectCartStores, selectCartTotalItems, type CartItem, type CartState } from './cartSlice';

const mockCartItem: CartItem = {
  id: 'med-1',
  name: 'Paracetamol 500mg',
  price: 50,
  image: 'https://example.com/img.jpg',
};

const mockCartItem2: CartItem = {
  id: 'med-2',
  name: 'Omeprazole 20mg',
  price: 120,
};

describe('cartSlice reducers', () => {
  const initialState: CartState = {};

  it('should return the initial state when passed an unknown action', () => {
    expect(cartReducer(undefined, { type: 'unknown' })).toEqual({});
  });

  describe('addItem', () => {
    it('adds a new item to the cart', () => {
      const state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      expect(Object.keys(state)).toHaveLength(1);
      const key = 'store-1_med-1';
      expect(state[key]).toBeDefined();
      expect(state[key]?.qty).toBe(1);
      expect(state[key]?.item).toEqual(mockCartItem);
    });

    it('increments qty when adding existing item', () => {
      const state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      const updated = cartReducer(state, addItem({ item: mockCartItem, storeId: 'store-1' }));
      const key = 'store-1_med-1';
      expect(updated[key]?.qty).toBe(2);
    });

    it('groups items by store', () => {
      let state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      state = cartReducer(state, addItem({ item: mockCartItem2, storeId: 'store-2' }));
      expect(Object.keys(state)).toHaveLength(2);
    });
  });

  describe('updateQty', () => {
    it('updates the quantity of an existing item', () => {
      let state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      state = cartReducer(state, updateQty({ key: 'store-1_med-1', qty: 5 }));
      expect(state['store-1_med-1']?.qty).toBe(5);
    });

    it('removes item when qty is 0 or less', () => {
      let state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      state = cartReducer(state, updateQty({ key: 'store-1_med-1', qty: 0 }));
      expect(state['store-1_med-1']).toBeUndefined();
    });
  });

  describe('removeItem', () => {
    it('removes an item by key', () => {
      let state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      state = cartReducer(state, removeItem('store-1_med-1'));
      expect(state['store-1_med-1']).toBeUndefined();
    });

    it('does nothing for a non-existent key', () => {
      const state = cartReducer(initialState, removeItem('non-existent'));
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      let state = cartReducer(initialState, addItem({ item: mockCartItem, storeId: 'store-1' }));
      state = cartReducer(state, addItem({ item: mockCartItem2, storeId: 'store-2' }));
      state = cartReducer(state, clearCart());
      expect(Object.keys(state)).toHaveLength(0);
    });
  });
});

describe('cartSlice selectors', () => {
  const buildState = (state: CartState): { cart: CartState } => ({ cart: state });

  it('selectCartEntries returns entries with computed key', () => {
    let state = cartReducer({} as CartState, addItem({ item: mockCartItem, storeId: 'store-1' }));
    state = cartReducer(state, addItem({ item: mockCartItem2, storeId: 'store-2' }));
    const entries = selectCartEntries(buildState(state));
    expect(entries).toHaveLength(2);
    expect(entries[0]?.key).toBe('store-1_med-1');
    expect(entries[1]?.key).toBe('store-2_med-2');
  });

  it('selectCartTotalItems returns total quantity', () => {
    let state = cartReducer({} as CartState, addItem({ item: mockCartItem, storeId: 'store-1' }));
    state = cartReducer(state, addItem({ item: mockCartItem, storeId: 'store-1' }));
    const total = selectCartTotalItems(buildState(state));
    expect(total).toBe(2);
  });

  it('selectCartStores groups items by store and computes subtotal', () => {
    let state = cartReducer({} as CartState, addItem({ item: mockCartItem, storeId: 'store-1' }));
    state = cartReducer(state, addItem({ item: mockCartItem2, storeId: 'store-2' }));
    state = cartReducer(state, addItem({ item: mockCartItem, storeId: 'store-1' }));

    const stores = selectCartStores(buildState(state));
    expect(stores).toHaveLength(2);

    const store1 = stores.find((s) => s.storeId === 'store-1');
    expect(store1?.items).toHaveLength(1);
    expect(store1?.items[0]?.qty).toBe(2);
    expect(store1?.subtotal).toBe(100); // 50 * 2

    const store2 = stores.find((s) => s.storeId === 'store-2');
    expect(store2?.items).toHaveLength(1);
    expect(store2?.subtotal).toBe(120);
  });
});
