import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import api from '../../lib/axios';
import { getSocket } from '../../lib/socket';

interface ChatMessage { _id?: string; conversationId: string; sender?: { _id?: string; name?: string }; content: string; createdAt: string; }
interface Props { bookingId: string; currentUser: any; targetUser?: any; onClose?: () => void; }

export const AssistantChatPanel: React.FC<Props> = ({ bookingId, currentUser, targetUser, onClose }) => {
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/chat/bookings/assistant/${bookingId}/conversation`).then(async ({ data }) => {
      if (!active) return;
      setConversationId(data.conversationId);
      const history = await api.get(`/chat/messages/${data.conversationId}`);
      if (active) setMessages(history.data);
    }).catch(() => { if (active) setNotice('Could not load this booking chat. Check your booking access or try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    const join = () => socket.emit('chat:join', conversationId);
    const receive = (message: ChatMessage) => {
      if (String(message.conversationId) !== conversationId) return;
      setMessages((prev) => prev.some((m) => m._id && m._id === message._id) ? prev : [...prev, message]);
    };
    socket.on('connect', join);
    socket.on('chat:receive_message', receive);
    if (socket.connected) join();
    return () => { socket.off('connect', join); socket.off('chat:receive_message', receive); socket.emit('chat:leave', conversationId); };
  }, [conversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !conversationId) return;
    setNotice('');
    try {
      const { data } = await api.post('/chat/messages', { conversationId, content, type: 'text', clientGeneratedId: crypto.randomUUID() });
      setMessages((prev) => prev.some((m) => m._id && m._id === data._id) ? prev : [...prev, data]);
      setInput('');
    } catch { setNotice('Message was not sent. Please retry.'); }
  }, [conversationId, input]);

  return <div className="flex flex-col h-80 sm:h-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b flex items-center justify-between">
      <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">{targetUser?.name?.charAt(0) || <MessageSquare className="w-4 h-4" />}</div><div><div className="font-bold text-xs">{targetUser?.name || 'Assistant booking chat'}</div><div className="text-[10px] text-slate-500">{loading ? 'Loading secure chat…' : 'Booking participants only'}</div></div></div>
      {onClose && <button onClick={onClose} aria-label="Close chat" className="p-1"><X className="w-4 h-4" /></button>}
    </div>
    <div className="flex-1 p-4 overflow-y-auto space-y-2.5">{loading ? <p role="status">Loading messages…</p> : messages.length ? messages.map((m, i) => {
      const isMe = String(m.sender?._id) === String(currentUser?._id);
      return <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs ${isMe ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}><div>{m.content}</div><div className="text-[9px] mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></div>;
    }) : <div className="h-full flex items-center justify-center text-center text-xs text-slate-400"><p>Send a message to coordinate this booking.</p></div>}<div ref={messagesEndRef} /></div>
    {notice && <p role="status" className="px-3 pt-2 text-xs text-amber-700 bg-amber-50">{notice}</p>}
    <form onSubmit={handleSend} className="p-3 border-t flex items-center gap-2"><Input aria-label="Message" type="text" placeholder="Type a message…" value={input} onChange={(e) => setInput(e.target.value)} className="text-xs h-9" /><Button aria-label="Send message" type="submit" size="sm" disabled={!input.trim() || !conversationId || loading} className="h-9 w-9 p-0"><Send className="w-4 h-4" /></Button></form>
  </div>;
};
