import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Scale } from 'lucide-react';
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

export const LawyerChatPanel: React.FC<Props> = ({
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
    setMessages((prev) => [...prev, payload]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-80 sm:h-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {targetUser?.name ? targetUser.name.charAt(0).toUpperCase() : <Scale className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              {targetUser?.name ? `Adv. ${targetUser.name}` : 'Client Legal Consultation Chat'}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Live Encrypted Session
            </div>
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
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-indigo-600" />
            <p>Direct chat window open.</p>
            <p className="text-[10px] mt-0.5">Send a message to start conversation.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = String(m.senderId) === String(currentUser?._id);
            return (
              <div
                key={idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {new Date(m.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSend}
        className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2"
      >
        <Input
          type="text"
          placeholder="Type consultation message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="rounded-xl text-xs h-9"
        />
        <Button
          type="submit"
          disabled={!input.trim()}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-3 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
