import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface Pharmacy {
  id?: string;
  _id?: string;
  name?: string;
  priority?: number;
  facilityId?: string;
}

export interface PreferredPharmacyValue {
  pharmacies: Pharmacy[];
  autoRetryEnabled: boolean;
  initialized: boolean;
  error: string | null;
  addPharmacy: (pharmacy: Pharmacy) => Promise<void>;
  removePharmacy: (id: string | undefined) => Promise<void>;
  reorderPharmacies: (fromIndex: number, toIndex: number) => Promise<void>;
  setAutoRetry: (enabled: boolean) => void;
  setPharmacies: (list: Pharmacy[]) => void;
}

const STORAGE_KEY = 'findmedi_preferred_pharmacies';
const LEGACY_STORAGE_KEY = 'mediCore_preferred_pharmacies';
const DEFAULT_PHARMACIES = [
  { id: 's1', name: 'MedPlus Pharmacy', priority: 1 },
  { id: 's2', name: 'HealthFirst Medicals', priority: 2 },
  { id: 's4', name: 'Apollo Pharmacy', priority: 3 },
];

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface PrefsState {
  pharmacies: Pharmacy[];
  autoRetryEnabled: boolean;
  initialized: boolean;
}

interface PrefsAction {
  type: string;
  payload?: any;
}

const initialState: PrefsState = {
  pharmacies: [],
  autoRetryEnabled: false,
  initialized: false,
};

function prefsReducer(state: PrefsState, action: PrefsAction): PrefsState {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true };
    case 'SET_PHARMACIES': {
      const updated: Pharmacy[] = action.payload.map((p: any, i: number) => ({ ...p, priority: i + 1 }));
      return { ...state, pharmacies: updated };
    }
    case 'ADD_PHARMACY':
      if (state.pharmacies.some(p => p._id === action.payload._id || p.id === action.payload.id)) return state;
      return { ...state, pharmacies: [...state.pharmacies, { ...action.payload, priority: state.pharmacies.length + 1 }] };
    case 'REMOVE_PHARMACY':
      return { ...state, pharmacies: state.pharmacies.filter(p => p._id !== action.payload && p.id !== action.payload).map((p, i) => ({ ...p, priority: i + 1 })) };
    case 'REORDER': {
      const { fromIndex, toIndex } = action.payload;
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

const PreferredPharmacyContext = createContext<PreferredPharmacyValue | null>(null);

export function PreferredPharmacyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(prefsReducer, initialState);

  const [error, setError] = useState<string | null>(null);

  const loadFromBackend = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getPreferredPharmacies();
      if (res?.pharmacies?.length) {
        const mapped = res.pharmacies.map((p: any) => ({ id: p._id, _id: p._id, name: p.name, priority: p.priority, facilityId: p.pharmacyId }));
        dispatch({ type: 'INIT', payload: { pharmacies: mapped, autoRetryEnabled: false } });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pharmacies: mapped, autoRetryEnabled: false }));
        return true;
      }
    } catch {
      setError('Failed to load preferred pharmacies');
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await loadFromBackend();
      if (!loaded) {
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
      }
    })();
  }, [loadFromBackend]);

  useEffect(() => {
    if (state.initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pharmacies: state.pharmacies, autoRetryEnabled: state.autoRetryEnabled }));
    }
  }, [state.pharmacies, state.autoRetryEnabled, state.initialized]);

  const addPharmacy = useCallback(async (pharmacy: Pharmacy) => {
    try {
      const res = await api.addPreferredPharmacy({ pharmacyId: pharmacy.facilityId || pharmacy.id, name: pharmacy.name });
      if (res?._id) {
        dispatch({ type: 'ADD_PHARMACY', payload: { ...pharmacy, _id: res._id } });
      }
    } catch { dispatch({ type: 'ADD_PHARMACY', payload: pharmacy }); }
  }, []);

  const removePharmacy = useCallback(async (id: string | undefined) => {
    const idToRemove = id;
    try {
      await api.deletePreferredPharmacy(idToRemove);
    } catch { /* fallback */ }
    dispatch({ type: 'REMOVE_PHARMACY', payload: idToRemove });
  }, []);

  const reorderPharmacies = useCallback(async (fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER', payload: { fromIndex, toIndex } });
    try {
      const ids = state.pharmacies.map(p => p._id || p.id);
      const list = [...ids];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      await api.reorderPreferredPharmacies({ orderedIds: list });
    } catch { /* best effort */ }
  }, [state.pharmacies]);

  const setAutoRetry = useCallback((enabled: boolean) => dispatch({ type: 'SET_AUTO_RETRY', payload: enabled }), []);

  const setPharmacies = useCallback((list: Pharmacy[]) => dispatch({ type: 'SET_PHARMACIES', payload: list }), []);

  return (
    <PreferredPharmacyContext.Provider value={{
      pharmacies: state.pharmacies,
      autoRetryEnabled: state.autoRetryEnabled,
      initialized: state.initialized,
      error,
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
