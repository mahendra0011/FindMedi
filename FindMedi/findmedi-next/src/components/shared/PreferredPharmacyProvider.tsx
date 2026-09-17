/**
 * PreferredPharmacyProvider — typed replacement for PreferredPharmacyContext.jsx.
 *
 * Manages the user's ordered list of preferred pharmacies with:
 *   - Backend sync (preferredPharmacies API)
 *   - localStorage fallback persistence
 *   - Priority reordering (drag-and-drop)
 *
 * This is a standalone Context (not in Redux) because it's only consumed
 * by the pharmacy checkout flow and has its own initialization lifecycle.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { api, type PreferredPharmacy } from '@/lib/api';

const STORAGE_KEY = 'mediCore_preferred_pharmacies';

const DEFAULT_PHARMACIES: PreferredPharmacy[] = [
  { id: 's1', name: 'MedPlus Pharmacy', priority: 1 },
  { id: 's2', name: 'HealthFirst Medicals', priority: 2 },
  { id: 's4', name: 'Apollo Pharmacy', priority: 3 },
];

interface State {
  pharmacies: PreferredPharmacy[];
  autoRetryEnabled: boolean;
  initialized: boolean;
}

type Action =
  | { type: 'INIT'; payload: Partial<State> }
  | { type: 'SET_PHARMACIES'; payload: PreferredPharmacy[] }
  | { type: 'ADD_PHARMACY'; payload: PreferredPharmacy }
  | { type: 'REMOVE_PHARMACY'; payload: string }
  | { type: 'REORDER'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_AUTO_RETRY'; payload: boolean };

function prefsReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true };
    case 'SET_PHARMACIES': {
      const updated = action.payload.map((p, i) => ({ ...p, priority: i + 1 }));
      return { ...state, pharmacies: updated };
    }
    case 'ADD_PHARMACY':
      if (state.pharmacies.some((p) => p._id === action.payload._id || p.id === action.payload.id)) return state;
      return {
        ...state,
        pharmacies: [...state.pharmacies, { ...action.payload, priority: state.pharmacies.length + 1 }],
      };
    case 'REMOVE_PHARMACY':
      return {
        ...state,
        pharmacies: state.pharmacies
          .filter((p) => p._id !== action.payload && p.id !== action.payload)
          .map((p, i) => ({ ...p, priority: i + 1 })),
      };
    case 'REORDER': {
      const { fromIndex, toIndex } = action.payload;
      const list = [...state.pharmacies];
      const moved = list.splice(fromIndex, 1)[0];
      if (!moved) return state;
      list.splice(toIndex, 0, moved);
      return {
        ...state,
        pharmacies: list.map((p, i) => ({ ...p, priority: i + 1 })),
      };
    }
    case 'SET_AUTO_RETRY':
      return { ...state, autoRetryEnabled: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  pharmacies: [],
  autoRetryEnabled: false,
  initialized: false,
};

interface PreferredPharmacyContextValue {
  pharmacies: PreferredPharmacy[];
  autoRetryEnabled: boolean;
  initialized: boolean;
  error: string | null;
  addPharmacy: (pharmacy: PreferredPharmacy) => Promise<void>;
  removePharmacy: (id: string) => Promise<void>;
  reorderPharmacies: (fromIndex: number, toIndex: number) => Promise<void>;
  setAutoRetry: (enabled: boolean) => void;
  setPharmacies: (list: PreferredPharmacy[]) => void;
}

const PreferredPharmacyContext = createContext<PreferredPharmacyContextValue | null>(null);

export function PreferredPharmacyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(prefsReducer, initialState);
  const [error, setError] = useState<string | null>(null);

  const loadFromBackend = useCallback(async () => {
    try {
      setError(null);
      const res = await api.preferredPharmacies.get();
      if (res?.pharmacies?.length) {
        const mapped = res.pharmacies.map((p) => ({
          id: p._id,
          _id: p._id,
          name: p.name,
          priority: p.priority,
          facilityId: p.pharmacyId,
        }));
        dispatch({ type: 'INIT', payload: { pharmacies: mapped, autoRetryEnabled: false } });
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
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (stored) {
            dispatch({ type: 'INIT', payload: stored });
            return;
          }
        } catch {
          /* fall through */
        }
        dispatch({
          type: 'INIT',
          payload: {
            pharmacies: DEFAULT_PHARMACIES.map((p, i) => ({ ...p, priority: i + 1 })),
            autoRetryEnabled: false,
          },
        });
      }
    })();
  }, [loadFromBackend]);

  useEffect(() => {
    if (state.initialized) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pharmacies: state.pharmacies, autoRetryEnabled: state.autoRetryEnabled }),
      );
    }
  }, [state.pharmacies, state.autoRetryEnabled, state.initialized]);

  const addPharmacy = useCallback(
    async (pharmacy: PreferredPharmacy): Promise<void> => {
      try {
      const res = await api.preferredPharmacies.add({
        pharmacyId: pharmacy.facilityId ?? pharmacy.id ?? '',
        name: pharmacy.name,
      });
      if (res && res._id) {
        dispatch({ type: 'ADD_PHARMACY', payload: { ...pharmacy, _id: res._id } });
      } else {
        dispatch({ type: 'ADD_PHARMACY', payload: pharmacy });
      }
      } catch {
        dispatch({ type: 'ADD_PHARMACY', payload: pharmacy });
      }
    },
    [],
  );

  const removePharmacy = useCallback(async (id: string): Promise<void> => {
    try {
      await api.preferredPharmacies.delete(id);
    } catch {
      /* fallback — still remove locally */
    }
    dispatch({ type: 'REMOVE_PHARMACY', payload: id });
  }, []);

  const reorderPharmacies = useCallback(
    async (fromIndex: number, toIndex: number): Promise<void> => {
      dispatch({ type: 'REORDER', payload: { fromIndex, toIndex } });
      try {
        const ids = state.pharmacies
          .map((p) => p._id ?? p.id)
          .filter((id): id is string => Boolean(id));
        const list = [...ids];
        const moved = list.splice(fromIndex, 1)[0];
        if (!moved) return;
        list.splice(toIndex, 0, moved);
        await api.preferredPharmacies.reorder({ orderedIds: list });
      } catch {
        /* best effort */
      }
    },
    [state.pharmacies],
  );

  const setAutoRetry = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_RETRY', payload: enabled });
  }, []);

  const setPharmacies = useCallback((list: PreferredPharmacy[]) => {
    dispatch({ type: 'SET_PHARMACIES', payload: list });
  }, []);

  return (
    <PreferredPharmacyContext.Provider
      value={{
        pharmacies: state.pharmacies,
        autoRetryEnabled: state.autoRetryEnabled,
        initialized: state.initialized,
        error,
        addPharmacy,
        removePharmacy,
        reorderPharmacies,
        setAutoRetry,
        setPharmacies,
      }}
    >
      {children}
    </PreferredPharmacyContext.Provider>
  );
}

export function usePreferredPharmacies(): PreferredPharmacyContextValue {
  const ctx = useContext(PreferredPharmacyContext);
  if (!ctx) {
    throw new Error('usePreferredPharmacies must be inside PreferredPharmacyProvider');
  }
  return ctx;
}
