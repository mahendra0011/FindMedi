'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  Phone,
  Mail,
  Stethoscope,
  Calendar,
  Image as ImageIcon,
  FileText,
  Link2,
  Star,
  BellOff,
  Bell,
  Lock,
  Unlock,
  Trash2,
  Ban,
  ShieldAlert,
  Download,
  Clock,
  Palette,
  Eraser,
  FileDown,
  Play,
  User as UserIcon,
  ChevronRight,
  Pin,
  Archive,
} from 'lucide-react';
import { WALLPAPERS, formatBytes, formatDuration } from '@/lib/chatPrefs';
import { Row, SectionCard, Segmented } from './ChatSettingsPanel';
import type { ChatParticipant, ChatConversation } from './ChatList';
import type { ChatMessage } from './MessageBubble';

const TABS = [
  { key: 'info', label: 'Info', icon: UserIcon },
  { key: 'media', label: 'Media', icon: ImageIcon },
  { key: 'links', label: 'Links', icon: Link2 },
  { key: 'files', label: 'Files', icon: FileText },
  { key: 'starred', label: 'Starred', icon: Star },
];

const DISAPPEAR_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '2160', label: '90 days' },
];

export interface ChatInfoMediaItem {
  url: string;
  mimetype?: string;
  thumbnail?: string;
  duration?: number;
  size?: number;
  [key: string]: unknown;
}

export interface ChatInfoLinkItem {
  url: string;
  createdAt: string | Date;
}

export interface ChatInfoFileItem {
  url: string;
  name?: string;
  size?: number;
  createdAt: string | Date;
}

export interface ChatInfoPanelProps {
  open?: boolean;
  onClose?: () => void;
  peer?: ChatParticipant & {
    phone?: string;
    email?: string;
    specialization?: string;
    uhid?: string;
    lastActive?: string | Date;
  };
  conversation?: ChatConversation & {
    disappearing?: { enabled?: boolean; durationHours?: number };
    myWallpaper?: string;
    blocked?: boolean;
  };
  media?: ChatInfoMediaItem[];
  links?: ChatInfoLinkItem[];
  files?: ChatInfoFileItem[];
  starred?: ChatMessage[];
  onToggle?: (field: string, val: unknown) => void;
  onOpenMedia?: (items: ChatInfoMediaItem[], index: number) => void;
  onJump?: (id?: string) => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  onExport?: () => void;
  onWallpaper?: (wallpaper: string) => void;
  onSearch?: (q: string) => Promise<ChatMessage[] | undefined> | ChatMessage[] | undefined;
  onUnstar?: (msg: ChatMessage) => void;
}

/**
 * Right-side "Contact info / Media, links & files" panel.
 */
export default function ChatInfoPanel({
  open,
  onClose,
  peer,
  conversation,
  media = [],
  links = [],
  files = [],
  starred = [],
  onToggle,
  onOpenMedia,
  onJump,
  onClearChat,
  onDeleteChat,
  onBlock,
  onReport,
  onExport,
  onWallpaper,
  onSearch,
  onUnstar,
}: ChatInfoPanelProps) {
  const [tab, setTab] = useState('info');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [showWallpapers, setShowWallpapers] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let active = true;
    const t = setTimeout(async () => {
      setSearching(true);
      const found = await onSearch?.(trimmed);
      if (active) {
        setResults(found || []);
        setSearching(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, onSearch]);

  const groupedMedia = useMemo(() => {
    const images = media.filter((m) => m.mimetype?.startsWith('image/'));
    const videos = media.filter((m) => m.mimetype?.startsWith('video/'));
    return { images, videos };
  }, [media]);

  const disappeared = conversation?.disappearing?.enabled
    ? String(conversation.disappearing.durationHours || 24)
    : 'off';

  if (!open) return null;

  const isDoctor = (peer?.role || '').includes('doctor');

  return (
    <div className="fixed inset-0 z-[80] flex justify-end chat-pop-enter">
      <div className="absolute inset-0 bg-black/40 md:hidden" onClick={onClose} />
      <div className="relative w-full sm:w-[380px] bg-background border-l border-border h-full flex flex-col shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold flex-1">Chat info</h2>
        </div>

        {/* Peer card */}
        <div className="px-4 py-4 text-center border-b border-border">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold overflow-hidden mb-3">
            {peer?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peer.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-9 h-9 opacity-60" />
            )}
          </div>
          <p className="text-base font-semibold">{peer?.name || 'Contact'}</p>
          <p className="text-[12px] text-muted-foreground capitalize">
            {isDoctor ? 'Doctor' : 'Patient'}
            {peer?.specialization ? ` · ${peer.specialization}` : ''}
          </p>
          <p className="text-[11px] mt-1">
            {peer?.isOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
            ) : (
              <span className="text-muted-foreground">
                {peer?.lastActive
                  ? `Last seen ${new Date(peer.lastActive).toLocaleString()}`
                  : 'Offline'}
              </span>
            )}
          </p>
          <div className="mt-3 space-y-1.5 text-left">
            {peer?.phone && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> {peer.phone}
              </div>
            )}
            {peer?.email && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground break-all">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {peer.email}
              </div>
            )}
            {isDoctor && peer?.specialization && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Stethoscope className="w-3.5 h-3.5" /> {peer.specialization}
              </div>
            )}
            {peer?.uhid && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> UHID: {peer.uhid}
              </div>
            )}
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (!val.trim() || val.trim().length < 2) {
                  setResults([]);
                }
              }}
              placeholder="Search in conversation…"
              className="w-full bg-muted/60 border border-border rounded-full pl-8 pr-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="mt-2 max-h-[220px] overflow-y-auto scrollbar-thin">
              {searching && (
                <p className="text-[11px] text-muted-foreground py-2 text-center">Searching…</p>
              )}
              {!searching && results.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-2 text-center">
                  No messages found
                </p>
              )}
              {results.map((m) => (
                <button
                  key={m._id}
                  onClick={() => {
                    onJump?.(m._id);
                    onClose?.();
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-muted"
                >
                  <p className="text-[12px] line-clamp-2">{m.content || `📎 ${m.type}`}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {tab === 'info' && (
            <>
              <SectionCard title="Chat settings">
                <Row
                  icon={conversation?.muted ? BellOff : Bell}
                  title="Mute notifications"
                  description={conversation?.muted ? 'Muted' : 'Notifications on'}
                >
                  <button
                    onClick={() => onToggle?.('mute', !conversation?.muted)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                      conversation?.muted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {conversation?.muted ? 'Unmute' : 'Mute'}
                  </button>
                </Row>
                <Row
                  icon={Pin}
                  title="Pin chat"
                  description="Chat list me sabse upar rahega."
                >
                  <button
                    onClick={() => onToggle?.('pin', !conversation?.pinned)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                      conversation?.pinned
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {conversation?.pinned ? 'Unpin' : 'Pin'}
                  </button>
                </Row>
                <Row
                  icon={Archive}
                  title="Archive chat"
                  description="Chat list se hide, archived section me."
                >
                  <button
                    onClick={() => onToggle?.('archive', !conversation?.archived)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                      conversation?.archived
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {conversation?.archived ? 'Unarchive' : 'Archive'}
                  </button>
                </Row>
                <Row
                  icon={conversation?.locked ? Lock : Unlock}
                  title="Chat lock"
                  description="PIN ke bina chat na khule."
                >
                  <button
                    onClick={() => onToggle?.('lock', !conversation?.locked)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                      conversation?.locked
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {conversation?.locked ? 'Unlock' : 'Lock'}
                  </button>
                </Row>
                <Row
                  icon={Clock}
                  title="Disappearing messages"
                  description={
                    disappeared === 'off'
                      ? 'Off — messages rehte hain'
                      : `Naye messages ~${disappeared} hours me delete`
                  }
                >
                  <Segmented
                    value={disappeared}
                    options={DISAPPEAR_OPTIONS}
                    onChange={(v) => {
                      const hours = v === 'off' ? 0 : Number(v);
                      onToggle?.('disappearing', {
                        enabled: hours > 0,
                        durationHours: hours || 24,
                      });
                    }}
                  />
                </Row>
                <Row
                  icon={Palette}
                  title="Wallpaper"
                  description="Is chat ke liye alag background."
                >
                  <button
                    onClick={() => setShowWallpapers((v) => !v)}
                    className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium"
                  >
                    Change
                  </button>
                </Row>
                {showWallpapers && (
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {WALLPAPERS.map((w) => (
                      <button
                        key={w.value}
                        onClick={() => {
                          onWallpaper?.(w.value);
                          setShowWallpapers(false);
                        }}
                        style={{ background: w.css }}
                        title={w.label}
                        className={`w-9 h-9 rounded-lg border ${
                          conversation?.myWallpaper === w.value
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-border'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Quick view">
                <Row
                  icon={ImageIcon}
                  title="Media"
                  description={`${groupedMedia.images.length} photos · ${groupedMedia.videos.length} videos`}
                >
                  <button onClick={() => setTab('media')} className="text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Row>
                <Row icon={Link2} title="Links" description={`${links.length} shared links`}>
                  <button onClick={() => setTab('links')} className="text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Row>
                <Row icon={FileText} title="Documents" description={`${files.length} files`}>
                  <button onClick={() => setTab('files')} className="text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Row>
                <Row
                  icon={Star}
                  title="Starred messages"
                  description={`${starred.length} saved`}
                >
                  <button onClick={() => setTab('starred')} className="text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Row>
              </SectionCard>
            </>
          )}

          {tab === 'media' && (
            <>
              {groupedMedia.images.length === 0 && groupedMedia.videos.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  Abhi koi media share nahi hui.
                </p>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {groupedMedia.images.map((m, i) => (
                  <button
                    key={m.url}
                    onClick={() => onOpenMedia?.(groupedMedia.images, i)}
                    className="aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnail || m.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
                {groupedMedia.videos.map((m) => (
                  <button
                    key={m.url}
                    onClick={() => onOpenMedia?.([m], 0)}
                    className="aspect-square rounded-lg overflow-hidden border border-border relative bg-black/40"
                  >
                    <video src={m.url} muted className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </span>
                  </button>
                ))}
              </div>
              {groupedMedia.videos.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Total video duration:{' '}
                  {formatDuration(
                    groupedMedia.videos.reduce((s, v) => s + (v.duration || 0), 0)
                  )}
                </p>
              )}
            </>
          )}

          {tab === 'links' && (
            <>
              {links.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  Koi link share nahi hua.
                </p>
              )}
              {links.map((l) => (
                <a
                  key={`${l.url}-${l.createdAt}`}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted"
                >
                  <Link2 className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12px] break-all">{l.url}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </span>
                </a>
              ))}
            </>
          )}

          {tab === 'files' && (
            <>
              {files.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  Koi document share nahi hua.
                </p>
              )}
              {files.map((f) => (
                <div key={f.url} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                  <FileText className="w-7 h-7 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate">{f.name || 'Document'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatBytes(f.size || 0)} · {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={f.url}
                    download={f.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-background"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </>
          )}

          {tab === 'starred' && (
            <>
              {starred.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  Koi message star nahi kiya.
                </p>
              )}
              {starred.map((m) => {
                const senderId =
                  typeof m.sender === 'object' && m.sender ? m.sender._id : m.sender;
                return (
                  <div key={m._id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted">
                    <button
                      onClick={() => {
                        onJump?.(m._id);
                        onClose?.();
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-[12px] line-clamp-2">{m.content || `📎 ${m.type}`}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {String(senderId) === String(peer?._id) ? peer?.name || 'Contact' : 'You'} ·{' '}
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </button>
                    <button
                      onClick={() => onUnstar?.(m)}
                      className="p-1.5 rounded-lg hover:bg-background text-amber-500"
                      title="Remove from starred"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                );
              })}
            </>
          )}

          <SectionCard title="Actions">
            <Row
              icon={Eraser}
              title="Clear chat"
              description="Mere liye saare messages hata dein (doosre ke paas rahenge)."
            >
              <button
                onClick={onClearChat}
                className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium"
              >
                Clear
              </button>
            </Row>
            <Row
              icon={FileDown}
              title="Export chat"
              description="Chat ka text file download karein."
            >
              <button
                onClick={onExport}
                className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium"
              >
                Export
              </button>
            </Row>
            <Row
              icon={Ban}
              title={conversation?.blocked ? 'Unblock user' : 'Block user'}
              description="Block karne par messages aur calls band ho jaate hain."
              danger={!conversation?.blocked}
            >
              <button
                onClick={onBlock}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium"
              >
                {conversation?.blocked ? 'Unblock' : 'Block'}
              </button>
            </Row>
            <Row
              icon={ShieldAlert}
              title="Report user"
              description="Moderation team ko bhejein."
              danger
            >
              <button
                onClick={onReport}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium"
              >
                Report
              </button>
            </Row>
            <Row
              icon={Trash2}
              title="Delete chat"
              description="Chat list se hata dein (history bhi hategi)."
              danger
            >
              <button
                onClick={onDeleteChat}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium"
              >
                Delete
              </button>
            </Row>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
