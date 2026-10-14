import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NationalHelplinesModal from './NationalHelplinesModal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NationalHelplinesModal (Document 09)', () => {
  it('renders official national helplines when open', () => {
    const handleClose = vi.fn();
    render(<NationalHelplinesModal open={true} onClose={handleClose} />);

    // Header title
    expect(screen.getByText(/official national emergency helplines/i)).toBeInTheDocument();

    // Key helplines present in listing
    expect(screen.getAllByText(/112/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/108/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/102/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1098/).length).toBeGreaterThan(0);

    // Descriptions
    expect(screen.getByText(/all-in-one national emergency/i)).toBeInTheDocument();
    expect(screen.getByText(/tele-manas mental health/i)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    const handleClose = vi.fn();
    render(<NationalHelplinesModal open={false} onClose={handleClose} />);

    expect(screen.queryByText(/official national emergency helplines/i)).not.toBeInTheDocument();
  });

  it('triggers onClose callback when clicking the close button', () => {
    const handleClose = vi.fn();
    render(<NationalHelplinesModal open={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
