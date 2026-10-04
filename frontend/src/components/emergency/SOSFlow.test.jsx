import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SOSModeSelect from '../emergency/SOSModeSelect';
import SOSVehicleTypeSelect from '../emergency/SOSVehicleTypeSelect';
import SOSButton from '../emergency/SOSButton';

afterEach(() => cleanup());

function renderWithRouter(ui) {
  return render(<MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>);
}

describe('SOS flow (FE-M-01)', () => {
  it('SOS button has an accessible name and fires on click', () => {
    const onClick = vi.fn();
    renderWithRouter(<SOSButton onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /emergency sos/i });
    expect(btn).toBeVisible();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('mode select: choosing a mode and continuing advances the flow', () => {
    const onSelect = vi.fn();
    const onContinue = vi.fn();
    render(<SOSModeSelect selected="auto_select_ambulance" onSelect={onSelect} onContinue={onContinue} />);
    // framer-motion sets initial opacity:0 in jsdom → toBeVisible() fails;
    // presence (not paint) is what this contract locks.
    expect(screen.getByRole('heading', { name: /kaise search karein/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^select vehicle khud/i }));
    expect(onSelect).toHaveBeenCalledWith('manual_select');
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('vehicle-type select blocks continue with zero selection (manual_select guard)', () => {
    const onContinue = vi.fn();
    render(
      <SOSVehicleTypeSelect selected={[]} onToggle={() => {}} onContinue={onContinue} onBack={() => {}} />,
    );
    expect(screen.getByText(/kam se kam ek vehicle type chuno/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('vehicle-type select enables continue once a type is chosen', () => {
    const onToggle = vi.fn();
    const onContinue = vi.fn();
    render(
      <SOSVehicleTypeSelect selected={['ambulance']} onToggle={onToggle} onContinue={onContinue} onBack={() => {}} />,
    );
    const btn = screen.getByRole('button', { name: /continue/i });
    expect(btn).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /ambulance/i }));
    expect(onToggle).toHaveBeenCalledWith('ambulance');
  });

  it('SOS final submit is blocked without GPS (Rule 1)', async () => {
    // GPS guard lives in SOSConfirmModal.handleFinalSOS + validateSOSPayload.
    // Yahan contract level par lock: bina coords ke payload invalid hai.
    const { validateSOSPayload } = await import('@/lib/bookingValidation');
    expect(validateSOSPayload({ reporterMode: 'self' }).ok).toBe(false);
  });
});
