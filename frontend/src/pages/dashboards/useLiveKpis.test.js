import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mergeKpis, useLiveKpis } from './useLiveKpis';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const staticKpis = [
  { label: 'Active Faculty', value: '—', hint: 'Loading roster…' },
  { label: 'Total Beds', value: '120' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('mergeKpis (T8 · wave-2 live dashboards)', () => {
  it('returns the static config unchanged when live is undefined', () => {
    expect(mergeKpis(staticKpis, undefined)).toEqual(staticKpis);
  });

  it('returns the static config unchanged when live is null', () => {
    expect(mergeKpis(staticKpis, null)).toEqual(staticKpis);
  });

  it('overrides the value on snake_case label match and keeps label/hint', () => {
    const out = mergeKpis(staticKpis, { activeFaculty: 42 });
    expect(out[0].value).toBe('42');
    expect(out[0].label).toBe('Active Faculty');
    expect(out[0].hint).toBe('Loading roster…');
    expect(out[1].value).toBe('120'); // untouched key stays static
  });

  it('matches the exact label as a fallback key', () => {
    const out = mergeKpis(staticKpis, { 'Total Beds': '130' });
    expect(out[1].value).toBe('130');
  });

  it('matches the space-separated key form', () => {
    const out = mergeKpis(staticKpis, { 'active faculty': 7 });
    expect(out[0].value).toBe('7');
  });

  it('keeps the static value when the live value is null or undefined', () => {
    const out = mergeKpis(staticKpis, { activeFaculty: null, totalBeds: undefined, unrelated: 9 });
    expect(out[0].value).toBe('—');
    expect(out[1].value).toBe('120');
  });

  it('applies zero and empty-string live values (they are real data)', () => {
    const out = mergeKpis(staticKpis, { activeFaculty: 0, totalBeds: '' });
    expect(out[0].value).toBe('0');
    expect(out[1].value).toBe('');
  });

  it('does not mutate the input config array', () => {
    const input = [{ label: 'Active Faculty', value: '—' }];
    mergeKpis(input, { activeFaculty: 3 });
    expect(input[0].value).toBe('—');
  });
});

describe('useLiveKpis hook (T8)', () => {
  it('applies fetched live values over the static config', async () => {
    const { result } = renderHook(() => useLiveKpis(async () => ({ activeFaculty: 12 }), staticKpis));
    expect(result.current[0].value).toBe('—'); // static until the fetch settles
    await waitFor(() => expect(result.current[0].value).toBe('12'));
    expect(result.current[1].value).toBe('120');
  });

  it('keeps the static fallback when the fetcher rejects (network/auth error)', async () => {
    const { result } = renderHook(() => useLiveKpis(async () => { throw new Error('403'); }, staticKpis));
    await waitFor(() => expect(result.current[0].value).toBe('—'));
    expect(result.current[1].value).toBe('120');
  });

  it('keeps the static fallback when the fetcher resolves undefined', async () => {
    const { result } = renderHook(() => useLiveKpis(async () => undefined, staticKpis));
    await waitFor(() => expect(result.current[0].value).toBe('—'));
    expect(result.current[1].value).toBe('120');
  });

  it('keeps the static fallback when api.get rejects (real fetcher path)', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    const fetcher = async () => {
      const res = await api.get('/staff/stats');
      return { activeFaculty: res?.data?.total ?? 0 };
    };
    const { result } = renderHook(() => useLiveKpis(fetcher, staticKpis));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/staff/stats'));
    expect(result.current[0].value).toBe('—');
  });

  it('does not set state after unmount (cancelled flag)', async () => {
    let resolveFetch;
    const fetcher = () => new Promise((resolve) => { resolveFetch = resolve; });
    const { unmount } = renderHook(() => useLiveKpis(fetcher, staticKpis));
    unmount();
    // Resolving after unmount must be a no-op, not a React warning/error.
    expect(() => resolveFetch({ activeFaculty: 1 })).not.toThrow();
    await new Promise((r) => { setTimeout(r, 0); });
  });
});
