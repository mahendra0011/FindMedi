import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'mediCore_cart';

function loadCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, storeId } = action;
      const key = `${storeId}_${item.id}`;
      if (state[key]) return { ...state, [key]: { ...state[key], qty: state[key].qty + 1 } };
      return { ...state, [key]: { storeId, item, qty: 1 } };
    }
    case 'UPDATE_QTY': {
      const { key, qty } = action;
      if (qty <= 0) { const s = { ...state }; delete s[key]; return s; }
      return { ...state, [key]: { ...state[key], qty } };
    }
    case 'REMOVE_ITEM': {
      const s = { ...state }; delete s[action.key]; return s;
    }
    case 'CLEAR': return {};
    default: return state;
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, null, loadCart);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }, [cart]);

  const addItem = (item, storeId) => dispatch({ type: 'ADD_ITEM', item, storeId });
  const updateQty = (key, qty) => dispatch({ type: 'UPDATE_QTY', key, qty });
  const removeItem = (key) => dispatch({ type: 'REMOVE_ITEM', key });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  const entries = Object.entries(cart).filter(([, v]) => v && v.qty > 0).map(([key, val]) => ({ key, ...val }));
  const totalItems = entries.reduce((s, v) => s + v.qty, 0);

  const storesMap = {};
  entries.forEach(val => {
    if (!storesMap[val.storeId]) storesMap[val.storeId] = { storeId: val.storeId, items: [], subtotal: 0 };
    storesMap[val.storeId].items.push(val);
    storesMap[val.storeId].subtotal += (val.item.price || 0) * val.qty;
  });

  return (
    <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clearCart, entries, totalItems, stores: Object.values(storesMap) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
