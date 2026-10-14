import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UnifiedSearch from './UnifiedSearch';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ success: true, results: [], taxonomy: null });
  vi.mocked(api.post).mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UnifiedSearch component (Document 09)', () => {
  it('renders input with placeholder and quick symptom chips', () => {
    render(
      <MemoryRouter>
        <UnifiedSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
    expect(input).toBeInTheDocument();

    // Verify quick symptom chips are rendered
    expect(screen.getByText(/seene me dard/i)).toBeInTheDocument();
    expect(screen.getByText(/tooth pain/i)).toBeInTheDocument();
    expect(screen.getByText(/fever in baby/i)).toBeInTheDocument();
  });

  it('triggers emergency red-flag banner when entering cardiac/chest pain query', () => {
    render(
      <MemoryRouter>
        <UnifiedSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'seene me dard' } });

    // Should display red-flag emergency alert
    expect(screen.getByText(/chest pain \/ heart attack signs detected/i)).toBeInTheDocument();
    expect(screen.getByText(/call 108 ambulance/i)).toBeInTheDocument();
  });

  it('triggers mental health helpline banner when querying distress/depression', () => {
    render(
      <MemoryRouter>
        <UnifiedSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'tanav aur depression' } });

    // Should display Tele-MANAS mental health crisis banner
    expect(screen.getByText(/mental health crisis support/i)).toBeInTheDocument();
    expect(screen.getByText(/call tele-manas \(14416\)/i)).toBeInTheDocument();
  });

  it('clicking a quick symptom chip updates search input', () => {
    render(
      <MemoryRouter>
        <UnifiedSearch />
      </MemoryRouter>
    );

    const chip = screen.getByText(/tooth pain/i);
    fireEvent.click(chip);

    const input = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
    expect(input.value).toBe('tooth pain');
  });

  it('shows unmet demand request button on zero-result queries and opens modal', () => {
    render(
      <MemoryRouter>
        <UnifiedSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/search doctors, clinics, tests, medicines/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Rare Neurosurgeon in RemoteVillage' } });

    // Zero-results state displays request button
    const requestBtn = screen.getByRole('button', { name: /request this service/i });
    expect(requestBtn).toBeInTheDocument();
    fireEvent.click(requestBtn);

    // Modal opens
    expect(screen.getByText(/request service in your city/i)).toBeInTheDocument();
  });
});
