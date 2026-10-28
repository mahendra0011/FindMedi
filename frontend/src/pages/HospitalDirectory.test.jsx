import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HospitalDirectory from './HospitalDirectory';
import { api } from '@/lib/api';
import { useSpecialtyTiles } from '@/hooks/useSpecialtyBrowse';

// Regression guard: the grid's "More/Show Less" toggle once referenced an
// ALL_SPECIALTIES symbol that did not exist in this file, crashing the page on
// render (TS2552 caught it only after the fact). This renders the page with a
// 21-tile tree and asserts the toggle actually expands/collapses.
vi.mock('@/lib/api', () => ({
  api: { getHospitals: vi.fn() },
}));

vi.mock('@/hooks/useSpecialtyBrowse', () => ({
  useSpecialtyTiles: vi.fn(),
}));

const tile = (i) => ({
  code: `SPEC.T${i}`,
  name: `Test Specialty ${i}`,
  sensitive: i === 3,
  claimsRestricted: false,
  meta: { nameHi: `परीक्षण ${i}` },
  children: [{ code: `SPEC.T${i}.S`, name: `Sub ${i}` }],
});

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getHospitals).mockResolvedValue([]);
  vi.mocked(useSpecialtyTiles).mockReturnValue({
    groups: [{ id: 'g', name: 'Group', color: 'blue', tiles: [] }],
    tiles: Array.from({ length: 21 }, (_, i) => tile(i + 1)),
    fromApi: true,
    ready: true,
    isLoading: false,
    isSuccess: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HospitalDirectory specialty grid', () => {
  it('renders without crashing and caps the grid at 14 tiles', () => {
    render(
      <MemoryRouter>
        <HospitalDirectory />
      </MemoryRouter>
    );

    expect(screen.getByText('Browse by Specialties')).toBeInTheDocument();
    expect(screen.getByText('Test Specialty 14')).toBeInTheDocument();
    expect(screen.queryByText('Test Specialty 15')).not.toBeInTheDocument();
  });

  it('expands to all 21 tiles via More and collapses via Show Less', () => {
    render(
      <MemoryRouter>
        <HospitalDirectory />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^more$/i }));
    expect(screen.getByText('Test Specialty 21')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^show less$/i }));
    // AnimatePresence keeps exiting tiles mounted through the exit animation,
    // so assert the toggle state (and the button label) rather than DOM removal.
    expect(screen.getByRole('button', { name: /^more$/i })).toBeInTheDocument();
  });
});
