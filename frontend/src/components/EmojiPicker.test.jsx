import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EmojiPicker from './chat/EmojiPicker';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EmojiPicker health-query privacy', () => {
  it('keeps typed health text local and makes no third-party request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
    render(<EmojiPicker />);

    fireEvent.change(screen.getByPlaceholderText(/search emoji/i), {
      target: { value: 'private oncology symptom query' },
    });
    fireEvent.click(screen.getByRole('button', { name: /stickers/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/stickers/i)).toBeTruthy();
  });

  it('renders unique, non-empty emoji keys and reuses a selected emoji safely', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<EmojiPicker />);
    const firstEmoji = screen.getAllByRole('button').find((button) => button.title)?.title;
    expect(firstEmoji).toBeTruthy();

    fireEvent.click(screen.getByTitle(firstEmoji));
    fireEvent.click(screen.getByTitle(firstEmoji));

    expect(screen.getAllByRole('button', { name: firstEmoji }).length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('same key'));
  });
});
