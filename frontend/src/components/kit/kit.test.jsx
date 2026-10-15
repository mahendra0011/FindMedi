/**
 * 11.md §7 shared kit smoke tests: every kit atom renders and handles its
 * primary interaction. Behavioural details stay in the owning flows.
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlotPicker from './SlotPicker';
import PhoneInput, { isValidIndianMobile } from './PhoneInput';
import { VerificationBadge, DiscreetBanner, ConsentToggle } from './TrustAtoms';
import { TicketQR, CalendarGrid } from './TicketCalendar';

describe('kit: SlotPicker', () => {
  const slots = [
    { id: 's1', label: '10:00', sub: '2 left' },
    { id: 's2', label: '10:15', disabled: true, disabledReason: 'Booked' },
    { id: 's3', label: 'Evening walk-in' },
  ];
  it('groups timed slots and selects on click', () => {
    const onSelect = vi.fn();
    render(<SlotPicker slots={slots} selectedId="s1" onSelect={onSelect} />);
    expect(screen.getByText('Morning')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /10:00/ }));
    expect(onSelect).toHaveBeenCalledWith('s1');
  });
  it('disables booked slots', () => {
    render(<SlotPicker slots={slots} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /10:15/ })).toBeDisabled();
  });
});

describe('kit: PhoneInput', () => {
  it('validates Indian mobiles', () => {
    expect(isValidIndianMobile('9811111111')).toBe(true);
    expect(isValidIndianMobile('12345')).toBe(false);
    expect(isValidIndianMobile('5811111111')).toBe(false);
  });
  it('normalises to 10 digits and reports validity', () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/10-digit/), { target: { value: '+91-98111 11111' } });
    expect(onChange).toHaveBeenCalledWith('9811111111', true);
  });
});

describe('kit: trust atoms', () => {
  it('renders verification levels distinctly', () => {
    const { rerender } = render(<VerificationBadge level="verified" />);
    expect(screen.getByTestId('verification-badge')).toHaveTextContent('Verified');
    rerender(<VerificationBadge level="expired" />);
    expect(screen.getByTestId('verification-badge')).toHaveTextContent('Verification expired');
  });
  it('renders discreet banner and consent toggle', () => {
    const onChange = vi.fn();
    render(<DiscreetBanner />);
    expect(screen.getByTestId('discreet-banner')).toBeInTheDocument();
    render(<ConsentToggle purpose="Care" data="Records" retention="1 yr" granted={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Care' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('kit: TicketQR + CalendarGrid', () => {
  it('renders a scannable ticket', () => {
    render(<TicketQR value="TCK-123" />);
    expect(screen.getByTestId('ticket-qr')).toBeInTheDocument();
    expect(screen.getByText('TCK-123')).toBeInTheDocument();
  });
  it('renders a selectable calendar', () => {
    const onSelect = vi.fn();
    render(<CalendarGrid onSelect={onSelect} />);
    expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
  });
});
