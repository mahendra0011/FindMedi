import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';

const STORAGE_KEY = 'mediCore_preferred_pharmacies';
const DEFAULT_PHARMACIES = [
  { id: 's1', name: 'MedPlus Pharmacy', priority: 1 },
  { id: 's2', name: 'HealthFirst Medicals', priority: 2 },
  { id: 's4', name: 'Apollo Pharmacy', priority: 3 },
];

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

const initialState = {
  pharmacies: [],
  autoRetryEnabled: false,
  initialized: false,
};

function prefsReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true };
    case 'SET_PHARMACIES': {
      const updated = action.payload.map((p, i) => ({ ...p, priority: i + 1 }));
      return { ...state, pharmacies: updated };
    }
    case 'ADD_PHARMACY':
      if (state.pharmacies.some(p => p.id === action.payload.id)) return state;
      return { ...state, pharmacies: [...state.pharmacies, { ...action.payload, priority: state.pharmacies.length + 1 }] };
    case 'REMOVE_PHARMACY':
      return { ...state, pharmacies: state.pharmacies.filter(p => p.id !== action.payload).map((p, i) => ({ ...p, priority: i + 1 })) };
    case 'REORDER': {
      const { fromIndex, toIndex } = action;
      const list = [...state.pharmacies];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...state, pharmacies: list.map((p, i) => ({ ...p, priority: i + 1 })) };
    }
    case 'SET_AUTO_RETRY':
      return { ...state, autoRetryEnabled: action.payload };
    default:
      return state;
  }
}

const PreferredPharmacyContext = createContext(null);

export function PreferredPharmacyProvider({ children }) {
  const [state, dispatch] = useReducer(prefsReducer, initialState);

  useEffect(() => {
    const stored = loadPrefs();
    if (stored) {
      dispatch({ type: 'INIT', payload: stored });
    } else {
      dispatch({
        type: 'INIT',
        payload: {
          pharmacies: DEFAULT_PHARMACIES.map((p, i) => ({ ...p, priority: i + 1 })),
          autoRetryEnabled: false,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (state.initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pharmacies: state.pharmacies, autoRetryEnabled: state.autoRetryEnabled }));
    }
  }, [state.pharmacies, state.autoRetryEnabled, state.initialized]);

  const addPharmacy = useCallback((pharmacy) => dispatch({ type: 'ADD_PHARMACY', payload: pharmacy }), []);
  const removePharmacy = useCallback((id) => dispatch({ type: 'REMOVE_PHARMACY', payload: id }), []);
  const reorderPharmacies = useCallback((fromIndex, toIndex) => dispatch({ type: 'REORDER', payload: { fromIndex, toIndex } }), []);
  const setAutoRetry = useCallback((enabled) => dispatch({ type: 'SET_AUTO_RETRY', payload: enabled }), []);
  const setPharmacies = useCallback((list) => dispatch({ type: 'SET_PHARMACIES', payload: list }), []);

  return (
    <PreferredPharmacyContext.Provider value={{
      pharmacies: state.pharmacies,
      autoRetryEnabled: state.autoRetryEnabled,
      initialized: state.initialized,
      addPharmacy,
      removePharmacy,
      reorderPharmacies,
      setAutoRetry,
      setPharmacies,
    }}>
      {children}
    </PreferredPharmacyContext.Provider>
  );
}

export function usePreferredPharmacies() {
  const ctx = useContext(PreferredPharmacyContext);
  if (!ctx) throw new Error('usePreferredPharmacies must be inside PreferredPharmacyProvider');
  return ctx;
}
