/**
 * 6.md §2.1 + 11.md §12: language switcher persists EN/Hindi and drives
 * react-i18next (first adopted surface: public navbar + search placeholder).
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@/i18n';
import i18n from '@/i18n';
import LanguageSwitcher from './LanguageSwitcher';

beforeEach(() => {
  window.localStorage.clear();
});

describe('LanguageSwitcher', () => {
  it('renders EN active by default', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to Hindi persists and changes the language', async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'हिं' }));
    expect(window.localStorage.getItem('findmedi_lang')).toBe('hi');
    expect(screen.getByRole('button', { name: 'हिं' })).toHaveAttribute('aria-pressed', 'true');
    // restore default for other suites
    await i18n.changeLanguage('en');
    window.localStorage.removeItem('findmedi_lang');
  });
});
