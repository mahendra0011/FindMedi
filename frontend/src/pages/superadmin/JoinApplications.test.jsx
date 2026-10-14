import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinApplications from './JoinApplications';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const EMPTY = { applications: [], total: 0, page: 1, limit: 25 };

describe('JoinApplications lanes (10.md 4.4 queue console)', () => {
  it('loads the pending lane and switches to the backend queues the tabs expose', async () => {
    api.get.mockResolvedValue(EMPTY);

    render(<JoinApplications />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('queue=pending'));
    });

    fireEvent.click(screen.getByRole('button', { name: /escalated/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('queue=escalated'));
    });

    fireEvent.click(screen.getByRole('button', { name: /drafts/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('queue=drafts'));
    });

    expect(await screen.findByText('Queue clear')).toBeInTheDocument();
    expect(screen.getByText('Nothing waiting in drafts.')).toBeInTheDocument();
  });

  it('keeps the original lanes reachable', async () => {
    api.get.mockResolvedValue(EMPTY);

    render(<JoinApplications />);

    for (const lane of ['Pending', 'Flagged', 'High-risk', 'Needs info', 'Decided', 'All']) {
      expect(await screen.findByRole('button', { name: lane })).toBeInTheDocument();
    }
    expect(await screen.findByRole('button', { name: 'Escalated' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Drafts' })).toBeInTheDocument();
  });
});
