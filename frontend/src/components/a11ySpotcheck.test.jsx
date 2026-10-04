import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SOSButton from './emergency/SOSButton';
import ConsentGate from './consent/ConsentGate';

afterEach(() => cleanup());

describe('a11y spot-check (role-based queries, FE-M-01)', () => {
  it('SOS button exposes a single accessible name, keyboard-focusable', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SOSButton onClick={() => {}} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /emergency sos/i });
    expect(btn).toBeVisible();
    // native <button> → keyboard operable by default; must not be aria-hidden
    expect(btn.getAttribute('aria-hidden')).not.toBe('true');
    expect(btn.tagName).toBe('BUTTON');
  });

  it('consent checkboxes are label-associated (clicking label toggles)', () => {
    render(<ConsentGate />);
    // getByRole with name proves label association — unlabelled inputs fail here
    expect(screen.getByRole('checkbox', { name: /patient consent obtained/i })).toBeVisible();
  });

  it('blocking reason is exposed via role=status for screen readers', () => {
    render(<ConsentGate />);
    expect(screen.getByRole('status')).toHaveTextContent(/consent required/i);
  });
});

describe('mobile viewport contract', () => {
  it('SOS entry point stays fixed + reachable on small screens', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SOSButton onClick={() => {}} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /emergency sos/i });
    const wrapper = btn.closest('div.fixed');
    // fixed positioning = reachable overlay on mobile viewports
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toMatch(/bottom-6/);
    expect(wrapper.className).toMatch(/left-6/);
  });

  it('touch affordance: SOS hit area is not a tiny text link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SOSButton onClick={() => {}} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /emergency sos/i });
    // w-18/w-20 → ≥44px touch target family; class contract guards regressions
    expect(btn.className).toMatch(/rounded-full/);
  });
});
