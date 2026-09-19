import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getSocket } from '../../lib/socket';

interface ChatMessage {
  bookingId: string;
  senderId: string;
  senderName: string;
  text: string;
  at: string;
}

interface Props {
  bookingId: string;
  currentUser: any;
  targetUser?: any;
  onClose?: () => void;
}

export const AssistantChatPanel: React.FC<Props> = ({
  bookingId,
  currentUser,
  targetUser,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !bookingId) return;

    const handleMessage = (msg: ChatMessage) => {
      if (msg.bookingId === bookingId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('chat_message', handleMessage);

    return () => {
      socket.off('chat_message', handleMessage);
    };
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const socket = getSocket();
    const payload: ChatMessage = {
      bookingId,
      senderId: String(currentUser?._id || 'me'),
      senderName: currentUser?.name || 'You',
      text: input.trim(),
      at: new Date().toISOString(),
    };

    if (socket) {
      socket.emit('send_chat_message', payload);
    }
    // Optimistically add to local state
    setMessages((prev) => [...prev, payload]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-80 sm:h-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
            {targetUser?.name ? targetUser.name.charAt(0) : <MessageSquare className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              {targetUser?.name || 'In-Hospital Chat'}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Live Connection Active</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
            <MessageSquare className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700 stroke-1" />
            <p>Send a message directly to your {currentUser?.role === 'assistant' ? 'patient' : 'assistant'}.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Quick coordination for paperwork, lab reports, or medicine.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = String(m.senderId) === String(currentUser?._id || 'me');
            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-bold opacity-75 mb-0.5">{m.senderName}</div>
                  )}
                  <div>{m.text}</div>
                  <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                    {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Type an in-hospital message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="text-xs h-9 bg-white dark:bg-slate-900"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim()}
          className="h-9 w-9 p-0 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
