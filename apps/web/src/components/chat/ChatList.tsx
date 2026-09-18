'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Pin,
  BellOff,
  Archive,
  Trash2,
  MailOpen,
  CheckCheck,
  UserPlus,
  X,
  MessageCircle,
  User as UserIcon,
  ShieldAlert,
  Lock,
  Plus,
  Stethoscope,
} from 'lucide-react';
import { messagePreview } from '@/lib/chatPrefs';

export interface ChatParticipant {
  _id: string;
  name?: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
  [key: string]: unknown;
}

export interface ChatConversation {
  _id: string;
  me?: string;
  participants?: ChatParticipant[];
  other?: ChatParticipant;
  unread?: number;
  archived?: boolean;
  locked?: boolean;
  pinned?: boolean;
  muted?: boolean;
  lastMessage?: {
    content?: string;
    createdAt?: string | Date;
    sender?: string;
    type?: string;
    [key: string]: unknown;
  };
  lastMessageAt?: string | Date;
  [key: string]: unknown;
}

export interface ChatContact {
  user: {
    _id: string;
    name: string;
    email?: string;
    uhid?: string;
    role?: string;
    avatar?: string;
    [key: string]: unknown;
  };
  specialization?: string;
  appointmentCount?: number;
  upcomingCount?: number;
  uhid?: string;
  [key: string]: unknown;
}

export interface ChatRequest {
  _id: string;
  other?: ChatParticipant;
  lastMessage?: {
    content?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archived' },
  { key: 'locked', label: 'Locked' },
];

const timeLabel = (dateLike?: string | Date) => {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

function Avatar({ user, size = 12 }: { user?: ChatParticipant; size?: number }) {
  const cls = size === 12 ? 'w-12 h-12' : 'w-10 h-10';
  return (
    <div
      className={`${cls} rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden flex-shrink-0`}
    >
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <UserIcon className="w-5 h-5 opacity-60" />
      )}
    </div>
  );
}

export interface ChatListProps {
  conversations?: ChatConversation[];
  contacts?: ChatContact[];
  requests?: ChatRequest[];
  filter?: string;
  setFilter?: (filter: string) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  typingUsers?: Record<string, boolean>;
  recordingUsers?: Record<string, boolean>;
  drafts?: Record<string, string>;
  selectedId?: string;
  onOpen?: (c: ChatConversation) => void;
  onTogglePin?: (c: ChatConversation) => void;
  onToggleMute?: (c: ChatConversation) => void;
  onToggleArchive?: (c: ChatConversation) => void;
  onDeleteChat?: (c: ChatConversation) => void;
  onMarkUnread?: (c: ChatConversation) => void;
  onNewChat?: (contact: ChatContact) => void;
  onAcceptRequest?: (req: ChatRequest) => void;
  onDeclineRequest?: (req: ChatRequest, action: 'decline' | 'block') => void;
  onOpenSettings?: () => void;
  hidePreviewsInLocked?: boolean;
}

/**
 * Chat list sidebar — search, filters, pinned/unread/online indicators,
 * typing preview, draft indicator, mute/pin/archive/delete row actions.
 */
export default function ChatList({
  conversations = [],
  contacts = [],
  requests = [],
  filter = 'all',
  setFilter,
  searchQuery = '',
  setSearchQuery,
  typingUsers = {},
  recordingUsers = {},
  drafts = {},
  selectedId,
  onOpen,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onDeleteChat,
  onMarkUnread,
  onNewChat,
  onAcceptRequest,
  onDeclineRequest,
  onOpenSettings,
  hidePreviewsInLocked,
}: ChatListProps) {
  const [showContacts, setShowContacts] = useState(false);
  const [contactQuery, setContactQuery] = useState('');

  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        if (filter === 'unread' && !c.unread) return false;
        if (filter === 'archived' && !c.archived) return false;
        if (filter === 'locked' && !c.locked) return false;
        if (filter === 'all' && c.archived) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const other = (c.participants || []).find((p) => String(p._id) !== String(c.me));
          const name = (c.other?.name || other?.name || '').toLowerCase();
          const last = (c.lastMessage?.content || '').toLowerCase();
          if (!name.includes(q) && !last.includes(q)) return false;
        }
        return true;
      }),
    [conversations, filter, searchQuery]
  );

  const peerOf = (c: ChatConversation): ChatParticipant =>
    c.other ||
    (c.participants || []).find((p) => String(p._id) !== String(c.me)) || {
      _id: '',
      name: 'User',
    };

  const visibleContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    const list = contacts || [];
    if (!q) return list.slice(0, 40);
    return list.filter(
      (c) =>
        (c.user?.name || '').toLowerCase().includes(q) ||
        (c.user?.email || '').toLowerCase().includes(q) ||
        (c.user?.uhid || '').toLowerCase().includes(q) ||
        (c.specialization || '').toLowerCase().includes(q)
    );
  }, [contacts, contactQuery]);

  return (
    <div className="w-full md:w-[360px] flex-shrink-0 border-r border-border flex flex-col bg-card h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContacts((v) => !v)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground"
              title="New chat (doctors / patients)"
            >
              <UserPlus className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground"
              title="Chat settings"
            >
              <Lock className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            placeholder="Search chats or messages"
            className="w-full bg-muted/60 border border-border rounded-full py-2 pl-9 pr-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery?.('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 mt-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter?.(f.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message requests (unknown senders) */}
      {requests.length > 0 && filter === 'all' && !searchQuery && (
        <div className="border-b border-border bg-amber-500/5">
          <div className="px-3 py-2 flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5" /> Message requests ({requests.length})
          </div>
          {requests.map((r) => (
            <div key={r._id} className="px-3 pb-3">
              <div className="flex items-center gap-3 mb-2">
                <Avatar user={r.other} size={10} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {r.other?.name || 'Unknown user'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.lastMessage?.content || 'Wants to start a chat'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onAcceptRequest?.(r)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDeclineRequest?.(r, 'decline')}
                  className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => onDeclineRequest?.(r, 'block')}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium"
                >
                  Block
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New chat: contacts (appointment-linked doctors / patients) */}
      {showContacts && (
        <div className="border-b border-border bg-muted/30 max-h-[45%] overflow-y-auto scrollbar-thin">
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {contacts.length} doctor/patient contacts
            </p>
            <button onClick={() => setShowContacts(false)} className="text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-3 pb-2">
            <input
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full bg-background border border-border rounded-full px-3 py-1.5 text-[12px]"
            />
          </div>
          {visibleContacts.length === 0 && (
            <p className="px-3 pb-3 text-[12px] text-muted-foreground">
              Koi contact nahi mila. Chat sirf un doctors/patients ke saath hoti hai jinke saath
              appointment hai.
            </p>
          )}
          {visibleContacts.map((c) => (
            <button
              key={c.user._id}
              onClick={() => {
                onNewChat?.(c);
                setShowContacts(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left"
            >
              <Avatar user={c.user as ChatParticipant} size={10} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate">{c.user.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {c.specialization ||
                    (c.user.role === 'patient'
                      ? `Patient${c.uhid ? ` · ${c.uhid}` : ''}`
                      : c.user.role)}
                  {c.appointmentCount
                    ? ` · ${c.appointmentCount} appointment${c.appointmentCount > 1 ? 's' : ''}`
                    : ''}
                </span>
              </span>
              {(c.upcomingCount ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {c.upcomingCount} upcoming
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin chat-scroll">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-14 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[13px] font-medium text-foreground">
              {filter === 'unread'
                ? 'No unread chats'
                : filter === 'archived'
                ? 'No archived chats'
                : filter === 'locked'
                ? 'No locked chats'
                : 'No conversations yet'}
            </p>
            {filter === 'all' && (
              <>
                <p className="text-[12px] mt-1">
                  Chat sirf un doctors/patients ke saath hoti hai jinke saath appointment hai.
                </p>
                <button
                  onClick={() => setShowContacts(true)}
                  className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Start a chat
                </button>
              </>
            )}
          </div>
        )}

        {filtered.map((c) => {
          const peer = peerOf(c);
          const typing = typingUsers[c._id];
          const recording = recordingUsers[c._id];
          const draft = drafts[c._id];
          const isActive = String(selectedId) === String(c._id);
          return (
            <div
              key={c._id}
              onClick={() => onOpen?.(c)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/40 ${
                isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <div className="relative">
                <Avatar user={peer} />
                {peer?.isOnline && (
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13.5px] font-semibold truncate flex-1">
                    {peer?.name || 'Chat'}
                  </p>
                  {c.pinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  {c.muted && <BellOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  {c.locked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {timeLabel(c.lastMessageAt || c.lastMessage?.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  {recording ? (
                    <span className="text-[12px] text-red-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{' '}
                      recording…
                    </span>
                  ) : typing ? (
                    <span className="text-[12px] text-primary flex items-center gap-1">
                      typing
                      <span className="flex gap-0.5">
                        <span className="chat-typing-dot w-1 h-1 rounded-full bg-primary inline-block" />
                        <span className="chat-typing-dot w-1 h-1 rounded-full bg-primary inline-block" />
                        <span className="chat-typing-dot w-1 h-1 rounded-full bg-primary inline-block" />
                      </span>
                    </span>
                  ) : draft ? (
                    <span className="text-[12px] text-muted-foreground truncate flex-1">
                      <span className="text-red-500 font-medium">Draft: </span>
                      {draft}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground truncate flex-1">
                      {c.locked && hidePreviewsInLocked
                        ? '🔒 Locked chat — tap to unlock'
                        : (c.lastMessage?.sender && String(c.lastMessage.sender) === String(c.me)
                            ? 'You: '
                            : '') + messagePreview(c.lastMessage)}
                    </span>
                  )}

                  {(c.unread ?? 0) > 0 && (
                    <span
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        c.muted
                          ? 'bg-muted-foreground/40 text-background'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute right-2 top-1 hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-full shadow px-1 py-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(c);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  title={c.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className={`w-3.5 h-3.5 ${c.pinned ? 'fill-current text-primary' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute?.(c);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  title={c.muted ? 'Unmute' : 'Mute'}
                >
                  <BellOff className={`w-3.5 h-3.5 ${c.muted ? 'text-primary' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleArchive?.(c);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  title={c.archived ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkUnread?.(c);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  title="Mark as unread"
                >
                  <MailOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat?.(c);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted text-red-500"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCheck className="w-3 h-3" />{' '}
          {conversations.reduce((s, c) => s + (c.unread || 0), 0)} unread
        </span>
        <span className="flex items-center gap-1">
          <Stethoscope className="w-3 h-3" /> Doctor ↔ Patient only
        </span>
      </div>
    </div>
  );
}
