import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@/i18n';
import i18n from '@/i18n';
import LanguageSwitcher from './LanguageSwitcher';

beforeEach(async () => {
  window.localStorage.clear();
  await i18n.changeLanguage('en');
});

describe('LanguageSwitcher', () => {
  it('shows a compact language button and opens the language picker', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Select language: English/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /\u0939\u093f\u0928\u094d\u0926\u0940 Hindi/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /English English/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switching to Hindi persists the choice and closes the picker', async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /Select language/ }));
    fireEvent.click(screen.getByRole('option', { name: /\u0939\u093f\u0928\u094d\u0926\u0940 Hindi/ }));
    expect(window.localStorage.getItem('findmedi_lang')).toBe('hi');
    await waitFor(() => expect(i18n.language).toBe('hi'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902: Hindi/ })).toBeInTheDocument();
  });
});
