import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MedicalExpenseStatement from './MedicalExpenseStatement';
import NotificationPreferences from './NotificationPreferences';
import AccessibilityControls from '@/components/accessibility/AccessibilityControls';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u123', name: 'Rohan Sharma', phone: '+91 9876543210' },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getPaymentHistory: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ success: true, preferences: {} }),
    put: vi.fn().mockResolvedValue({ success: true }),
  },
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('elder-mode');
  document.documentElement.classList.remove('high-contrast');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.classList.remove('elder-mode');
  document.documentElement.classList.remove('high-contrast');
});

describe('Document 09 Cross-Cutting Patient Utilities', () => {
  describe('MedicalExpenseStatement (Section 80D & Insurance statement)', () => {
    it('renders financial year selection and Section 80D tax exemption banner', async () => {
      render(
        <MemoryRouter>
          <MedicalExpenseStatement />
        </MemoryRouter>
      );

      // Section 80D Header & tax guidance
      expect(screen.getByText(/annual medical expense statement/i)).toBeInTheDocument();
      expect(screen.getByText(/section 80d income tax deduction/i)).toBeInTheDocument();

      // FY select
      const fySelect = screen.getByLabelText(/financial year/i);
      expect(fySelect).toBeInTheDocument();
      expect(fySelect.value).toBe('2025-2026');
    });

    it('allows changing Financial Year', () => {
      render(
        <MemoryRouter>
          <MedicalExpenseStatement />
        </MemoryRouter>
      );

      const fySelect = screen.getByLabelText(/financial year/i);
      fireEvent.change(fySelect, { target: { value: '2024-2025' } });
      expect(fySelect.value).toBe('2024-2025');
    });
  });

  describe('NotificationPreferences (Multi-channel & Sensitive Discreet Mode)', () => {
    it('renders channels including WhatsApp, SMS DLT, and Discreet Mode toggle', () => {
      render(
        <MemoryRouter>
          <NotificationPreferences />
        </MemoryRouter>
      );

      expect(screen.getByText(/notification & privacy preferences/i)).toBeInTheDocument();
      expect(screen.getByText(/whatsapp business updates/i)).toBeInTheDocument();
      expect(screen.getByText(/sms alerts \(dlt verified\)/i)).toBeInTheDocument();

      // Discreet Mode for IVF / mental health privacy
      expect(screen.getByText(/discreet mode for sensitive treatments/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable discreet neutral copy/i)).toBeInTheDocument();
    });

    it('toggles Discreet Mode checkbox', () => {
      render(
        <MemoryRouter>
          <NotificationPreferences />
        </MemoryRouter>
      );

      const discreetToggle = screen.getByLabelText(/enable discreet neutral copy/i);
      expect(discreetToggle).toBeChecked();

      fireEvent.click(discreetToggle);
      expect(discreetToggle).not.toBeChecked();
    });
  });

  describe('AccessibilityControls (Elder Mode & High Contrast)', () => {
    it('renders accessibility floating button and opens popover', () => {
      render(<AccessibilityControls />);

      const a11yBtn = screen.getByRole('button', { name: /accessibility & elder mode settings/i });
      expect(a11yBtn).toBeInTheDocument();
      fireEvent.click(a11yBtn);

      // Popover opened
      expect(screen.getByText(/accessibility & inclusion/i)).toBeInTheDocument();
      expect(screen.getByText(/elder mode \(senior care\)/i)).toBeInTheDocument();
      expect(screen.getByText(/high contrast/i)).toBeInTheDocument();
    });

    it('toggles Elder Mode on', () => {
      render(<AccessibilityControls />);

      const a11yBtn = screen.getByRole('button', { name: /accessibility & elder mode settings/i });
      fireEvent.click(a11yBtn);

      // In open panel, the first checkbox is Elder Mode
      const checkboxes = screen.getAllByRole('checkbox');
      const elderCheckbox = checkboxes[0];
      fireEvent.click(elderCheckbox);

      expect(document.documentElement.classList.contains('elder-mode')).toBe(true);
    });
  });
});
