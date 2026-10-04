import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ConsentGate from './ConsentGate';

afterEach(() => cleanup());

describe('consent checkbox gate (FE-M-01)', () => {
  it('disables submit until consent is ticked', () => {
    const onSubmit = vi.fn();
    render(<ConsentGate onSubmit={onSubmit} />);
    const btn = screen.getByRole('button', { name: /save confidentiality/i });
    expect(btn).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/consent required/i);

    fireEvent.click(screen.getByRole('checkbox', { name: /patient consent obtained/i }));
    expect(screen.getByRole('button', { name: /save confidentiality/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /save confidentiality/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ consent: true }));
  });

  it('unchecking consent re-blocks submit', () => {
    render(<ConsentGate />);
    const box = screen.getByRole('checkbox', { name: /patient consent obtained/i });
    fireEvent.click(box);
    expect(screen.getByRole('button', { name: /save confidentiality/i })).toBeEnabled();
    fireEvent.click(box);
    expect(screen.getByRole('button', { name: /save confidentiality/i })).toBeDisabled();
  });

  it('confidential scope: checkbox ke bina save nahi hota', () => {
    render(<ConsentGate requireScope />);
    fireEvent.click(screen.getByRole('checkbox', { name: /patient consent obtained/i }));
    // scope abhi bhi missing → blocked
    expect(screen.getByRole('button', { name: /save confidentiality/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /share with referring doctor/i }));
    expect(screen.getByRole('button', { name: /save confidentiality/i })).toBeEnabled();
  });
});
