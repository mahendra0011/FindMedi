import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { api, socket } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false },
}));
vi.mock('../lib/axios', () => ({ default: api }));
vi.mock('../lib/socket', () => ({ getSocket: () => socket }));

import { AssistantChatPanel } from './assistant/AssistantChatPanel';
import { LawyerChatPanel } from './lawyer/LawyerChatPanel';

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe.each([
  ['assistant', AssistantChatPanel],
  ['lawyer', LawyerChatPanel],
])('%s booking chat', (_kind, Panel) => {
  it('loads server-authorized conversation history and joins its ACL room', async () => {
    api.get.mockResolvedValueOnce({ data: { conversationId: 'conv-1' } })
      .mockResolvedValueOnce({ data: [{ _id: 'm1', conversationId: 'conv-1', sender: { _id: 'user-2' }, content: 'Hello', createdAt: '2026-01-01T12:00:00Z' }] });
    render(<Panel bookingId="booking-1" currentUser={{ _id: 'user-1' }} />);
    expect(await screen.findByText('Hello')).toBeTruthy();
    expect(api.get).toHaveBeenNthCalledWith(1, expect.stringContaining('/conversation'));
    expect(api.get).toHaveBeenNthCalledWith(2, '/chat/messages/conv-1');
    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function)));
    const connectHandler = socket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
    expect(connectHandler).toBeTypeOf('function');
    connectHandler();
    expect(socket.emit).toHaveBeenCalledWith('chat:join', 'conv-1');
  });

  it('shows sent messages only after the durable REST response and keeps text on failure', async () => {
    api.get.mockResolvedValueOnce({ data: { conversationId: 'conv-1' } }).mockResolvedValueOnce({ data: [] });
    api.post.mockResolvedValueOnce({ data: { _id: 'm2', conversationId: 'conv-1', sender: { _id: 'user-1' }, content: 'Private message', createdAt: '2026-01-01T12:00:00Z' } });
    render(<Panel bookingId="booking-1" currentUser={{ _id: 'user-1' }} />);
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    fireEvent.change(input, { target: { value: 'Private message' } });
    fireEvent.submit(input.closest('form'));
    expect(await screen.findByText('Private message')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/chat/messages', expect.objectContaining({ conversationId: 'conv-1', content: 'Private message', type: 'text' }));
  });

  it('does not claim send success when the API rejects the message', async () => {
    api.get.mockResolvedValueOnce({ data: { conversationId: 'conv-1' } }).mockResolvedValueOnce({ data: [] });
    api.post.mockRejectedValueOnce(new Error('forbidden'));
    render(<Panel bookingId="booking-1" currentUser={{ _id: 'user-1' }} />);
    const input = await screen.findByRole('textbox', { name: 'Message' });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    fireEvent.change(input, { target: { value: 'Private message' } });
    fireEvent.submit(input.closest('form'));
    expect((await screen.findByRole('status')).textContent).toMatch(/message was not sent/i);
    expect(screen.queryByText('Private message')).toBeNull();
  });
});
