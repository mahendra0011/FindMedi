import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, CheckCheck, Clock, AlertCircle, CornerUpLeft, Pencil, Trash2, Copy,
  Star, Pin, Forward, Info, Reply as ReplyIcon, MoreVertical, Download, Play, Pause,
  FileText, MapPin, UserRound, ShieldAlert, Languages, CheckSquare, Square, Volume2,
  Link2, Ban, RotateCcw,
} from 'lucide-react';
import { parseRichText, isSuspiciousLink, QUICK_REACTIONS, formatBytes, formatDuration } from '@/lib/chatPrefs';

/* ─────────────────────────── helpers ─────────────────────────── */

function ticksFor(message) {
  if (message.failed) return 'failed';
  if (message.pending) return 'pending';
  if (message.readCount > 0) return 'read';
  if (message.deliveredCount > 0) return 'delivered';
  return 'sent';
}

export function Ticks({ state }) {
  if (state === 'failed') return <AlertCircle className="w-[14px] h-[14px] text-red-500" />;
  if (state === 'pending') return <Clock className="w-[13px] h-[13px] opacity-70" />;
  if (state === 'read') return <CheckCheck className="w-[15px] h-[15px] text-sky-400" />;
  if (state === 'delivered') return <CheckCheck className="w-[15px] h-[15px] opacity-70" />;
  return <Check className="w-[15px] h-[15px] opacity-70" />;
}

/** Rich text — links, **bold**, _italic_, ~~strike~~, `code` */
export function RichText({ text = '', isMine = false }) {
  const nodes = useMemo(() => parseRichText(text), [text]);
  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed">
      {nodes.map((n, i) => {
        if (n.type === 'link') {
          const risky = isSuspiciousLink(n.value);
          return (
            <a
              key={i}
              href={n.value.startsWith('http') ? n.value : `https://${n.value}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`underline underline-offset-2 break-all ${risky ? 'text-amber-600 dark:text-amber-400' : (isMine ? 'text-white/90' : 'text-sky-600 dark:text-sky-400')}`}
              title={risky ? 'This link looks suspicious — verify before opening' : n.value}
            >
              {risky && <ShieldAlert className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" />}
              {n.value}
            </a>
          );
        }
        if (n.type === 'bold') return <strong key={i}>{n.value}</strong>;
        if (n.type === 'italic') return <em key={i}>{n.value}</em>;
        if (n.type === 'strike') return <s key={i}>{n.value}</s>;
        if (n.type === 'code') {
          return (
            <code key={i} className={`px-1 py-0.5 rounded text-[0.85em] font-mono ${isMine ? 'bg-black/20' : 'bg-muted'}`}>
              {n.value}
            </code>
          );
        }
        return <React.Fragment key={i}>{n.value}</React.Fragment>;
      })}
    </span>
  );
}

/** Link preview card (message ka pehla link) */
function LinkPreview({ url, isMine }) {
  let host = url;
  try { host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', ''); } catch { /* keep raw */ }
  return (
    <a
      href={url.startsWith('http') ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 border text-xs ${isMine ? 'bg-black/15 border-white/20 text-white/90' : 'bg-muted/60 border-border text-muted-foreground'}`}
    >
      <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-white/20' : 'bg-background'}`}>
        <Link2 className="w-4 h-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium truncate">{host}</span>
        <span className="block truncate opacity-80">{url}</span>
      </span>
    </a>
  );
}

/* ─────────────────────────── media players ─────────────────────────── */

function AudioPlayer({ url, isMine, duration, isVoice }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(Number(duration) || 0);
  const bars = useMemo(() => Array.from({ length: 34 }, () => 18 + Math.round(Math.random() * 82)), [url]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); } else { el.play(); setPlaying(true); }
  };
  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return (
    <div className={`flex items-center gap-2.5 min-w-[210px] max-w-[300px] py-0.5 ${isMine ? 'text-white' : ''}`}>
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-white/25' : 'bg-primary/10 text-primary'}`}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => { if (!total) setTotal(e.target.duration || 0); e.target.playbackRate = speed; }}
        onTimeUpdate={(e) => setProgress(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[2px] h-8">
          {bars.map((h, i) => {
            const filled = total ? (progress / total) * 100 >= (i / bars.length) * 100 : false;
            return (
              <span
                key={i}
                style={{ height: `${Math.max(12, h / 3.2)}px` }}
                className={`w-[2.5px] rounded-full transition-colors ${filled ? (isMine ? 'bg-white' : 'bg-primary') : (isMine ? 'bg-white/45' : 'bg-muted-foreground/40')}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] opacity-85">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            {isVoice ? 'Voice' : 'Audio'} · {formatDuration(total)}
          </span>
          <button onClick={cycleSpeed} className={`px-1.5 py-0.5 rounded font-semibold ${isMine ? 'bg-white/20' : 'bg-muted'}`}>{speed}×</button>
        </div>
      </div>
    </div>
  );
}

function ImageAttachment({ att, onOpen }) {
  return (
    <button onClick={() => onOpen?.(att)} className="block w-full">
      <img
        src={att.thumbnail || att.url}
        alt={att.name || 'image'}
        loading="lazy"
        className="rounded-lg max-h-[320px] w-full object-cover bg-muted"
      />
    </button>
  );
}

/* ─────────────────────────── reaction row ─────────────────────────── */

function ReactionRow({ reactions = [], isMine, onToggle, onShowDetails }) {
  if (!reactions.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={(e) => { e.stopPropagation(); onToggle?.(r.emoji); }}
          onDoubleClick={(e) => { e.stopPropagation(); onShowDetails?.(r); }}
          title="Click to toggle · double-click to see who reacted"
          className={`px-1.5 py-[3px] rounded-full text-[12px] flex items-center gap-1 border transition-all duration-200 chat-pop-enter ${r.mine ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background/90 border-border'}`}
        >
          <span>{r.emoji}</span>
          <span className="text-[10px] font-semibold">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── main bubble ─────────────────────────── */

export default function MessageBubble({
  message,
  isMine,
  prefs = {},
  peerName = '',
  onReply,
  onReact,
  onEdit,
  onDelete,
  onStar,
  onPin,
  onForward,
  onCopy,
  onInfo,
  onReport,
  onOpenMedia,
  onJumpToReply,
  onRetry,
  searchQuery = '',
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onShowReactions,
  highlight = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState('');
  const pressTimer = useRef(null);
  const touchStart = useRef(null);
  const [swipeX, setSwipeX] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) { setMenuOpen(false); setPickerOpen(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, pickerOpen]);

  // "Long press" ke baad menu khula ho to click par turant band na ho
  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const esc = (e) => { if (e.key === 'Escape') { setMenuOpen(false); setPickerOpen(false); } };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [menuOpen, pickerOpen]);

  const isDeleted = message.deletedForEveryone;
  const state = ticksFor(message);
  const attachments = message.attachments || [];
  const imageAtt = attachments.find((a) => a.mimetype?.startsWith('image/'));
  const videoAtt = attachments.find((a) => a.mimetype?.startsWith('video/'));
  const audioAtt = attachments.find((a) => a.mimetype?.startsWith('audio/'));
  const fileAtts = attachments.filter(
    (a) => !a.mimetype?.startsWith('image/') && !a.mimetype?.startsWith('video/') && !a.mimetype?.startsWith('audio/')
  );
  const firstUrl = (message.content?.match(/(https?:\/\/[^\s<>"']+)/) || [])[0];

  // Desktop: press & hold -> menu · Mobile: long press + swipe-to-reply
  const startPress = () => { pressTimer.current = setTimeout(() => setMenuOpen(true), 480); };
  const cancelPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPress();
  };
  const onTouchMove = (e) => {
    const start = touchStart.current;
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = Math.abs(e.touches[0].clientY - start.y);
    if (dy > 28) { cancelPress(); setSwipeX(0); return; }
    if (dx > 8 && dx < 90 && !selectionMode) { cancelPress(); setSwipeX(dx); }
  };
  const onTouchEnd = () => {
    cancelPress();
    if (swipeX > 45) onReply?.(message);
    setSwipeX(0);
    touchStart.current = null;
  };

  /** Message translate — Google ka public endpoint (koi key nahi chahiye). */
  const handleTranslate = async () => {
    if (translated || !message.content) return;
    setTranslating(true);
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hi&dt=t&q=${encodeURIComponent(message.content)}`
      );
      const data = await res.json();
      const text = (data?.[0] || []).map((row) => row?.[0] || '').join('');
      setTranslated(text || 'Translation unavailable');
    } catch {
      setTranslated('Translation unavailable (offline)');
    } finally {
      setTranslating(false);
    }
  };

  const reacted = message.myReaction;

  return (
    <div
      ref={wrapRef}
      className={`group flex w-full px-3 sm:px-4 chat-row-enter ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      {selectionMode && (
        <button onClick={() => onToggleSelect?.(message)} className="self-center mr-2 text-muted-foreground">
          {selected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
        </button>
      )}

      <div
        className="relative max-w-[92%] sm:max-w-[68%] flex flex-col"
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX ? 'none' : 'transform 180ms ease' }}
      >
        {swipeX > 20 && (
          <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-primary">
            <ReplyIcon className="w-5 h-5" />
          </span>
        )}

        <div
          onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onDoubleClick={() => !isDeleted && onReact?.(message, prefs.quickReaction || '❤️')}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`relative px-2.5 py-1.5 shadow-sm transition-all duration-[var(--chat-anim-duration,220ms)] ${
            isMine
              ? 'bg-[var(--chat-accent,#059669)] text-[var(--chat-accent-text,#fff)] rounded-[var(--chat-bubble-radius,0.9rem)] rounded-br-sm'
              : 'bg-card text-card-foreground border border-border rounded-[var(--chat-bubble-radius,0.9rem)] rounded-bl-sm'
          } ${selected ? 'ring-2 ring-primary/60' : ''} ${highlight ? 'ring-2 ring-amber-400/80' : ''} ${message.pending ? 'opacity-70' : ''}`}
          style={{ fontSize: 'calc(0.875rem * var(--chat-font-scale,1))' }}
        >
          {message.pinned && (
            <div className={`flex items-center gap-1 text-[10px] mb-1 ${isMine ? 'text-white/85' : 'text-muted-foreground'}`}>
              <Pin className="w-3 h-3" /> Pinned
            </div>
          )}

          {message.forwarded && !isDeleted && (
            <div className={`flex items-center gap-1 text-[11px] italic mb-0.5 ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>
              <Forward className="w-3 h-3" /> Forwarded
            </div>
          )}

          {message.replyTo && !isDeleted && (
            <button
              onClick={() => onJumpToReply?.(message.replyTo?._id)}
              className={`w-full text-left mb-1.5 pl-2 pr-1 py-1 rounded-md border-l-[3px] text-[11px] leading-snug ${isMine ? 'bg-black/20 border-white/60' : 'bg-muted/70 border-primary/70'}`}
            >
              <span className="block font-semibold opacity-90">
                {String(message.replyTo.sender) === String(message.sender?._id) ? 'You' : (peerName || 'Contact')}
              </span>
              <span className="block truncate opacity-80">
                {message.replyTo.deleted ? 'Deleted message' : (message.replyTo.content || `📎 ${message.replyTo.type}`)}
              </span>
            </button>
          )}

          {isDeleted ? (
            <p className="italic text-[13px] opacity-80 flex items-center gap-1.5 py-0.5">
              <Ban className="w-3.5 h-3.5" /> This message was deleted
            </p>
          ) : (
            <>
              {imageAtt && (
                <button onClick={() => onOpenMedia?.(imageAtt, attachments)} className="block w-full">
                  <img
                    src={imageAtt.thumbnail || imageAtt.url}
                    alt={imageAtt.name || 'image'}
                    loading="lazy"
                    className="rounded-lg max-h-[320px] w-full object-cover bg-muted"
                  />
                </button>
              )}
              {videoAtt && (
                <button onClick={() => onOpenMedia?.(videoAtt, attachments)} className="relative block w-full">
                  <video src={videoAtt.url} className="rounded-lg max-h-[320px] w-full object-cover bg-black/40" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </span>
                  </span>
                </button>
              )}
              {audioAtt && (
                <AudioPlayer url={audioAtt.url} isMine={isMine} duration={audioAtt.duration} isVoice={message.type === 'voice'} />
              )}

              {fileAtts.map((att) => (
                <a
                  key={att.url}
                  href={att.url}
                  download={att.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-2.5 my-1 px-2.5 py-2 rounded-lg ${isMine ? 'bg-black/20' : 'bg-muted'}`}
                >
                  <FileText className="w-7 h-7 flex-shrink-0 opacity-80" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate">{att.name || 'Document'}</span>
                    <span className="block text-[10px] opacity-75">{formatBytes(att.size || 0)}</span>
                  </span>
                  <Download className="w-4 h-4 opacity-70 flex-shrink-0" />
                </a>
              ))}

              {message.type === 'location' && (
                <a
                  href={message.content?.match(/https?:\/\/\S+/)?.[0] || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-2 py-1 ${isMine ? 'text-white' : 'text-primary'}`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-[13px] underline">Shared location</span>
                </a>
              )}

              {message.type === 'contact' && (
                <div className={`flex items-start gap-2 py-1 ${isMine ? 'text-white' : ''}`}>
                  <UserRound className="w-6 h-6 flex-shrink-0" />
                  <span className="text-[13px] whitespace-pre-wrap">{message.content}</span>
                </div>
              )}

              {message.content && message.type !== 'location' && (
                <p className="pr-1">
                  <RichText text={message.content} isMine={isMine} />
                </p>
              )}

              {firstUrl && attachments.length === 0 && message.type !== 'location' && (
                <LinkPreview url={firstUrl} isMine={isMine} />
              )}

              {translated && (
                <p className={`mt-1.5 pt-1.5 border-t text-[13px] ${isMine ? 'border-white/25' : 'border-border'}`}>
                  <span className="text-[10px] uppercase tracking-wide opacity-70 block">Translated</span>
                  {translated}
                </p>
              )}
            </>
          )}

          <div className={`flex items-center gap-1 justify-end mt-0.5 text-[10px] leading-none ${isMine ? 'text-white/75' : 'text-muted-foreground'}`}>
            {message.starred && <Star className="w-3 h-3 fill-current" />}
            {message.edited && !isDeleted && <span className="italic">edited</span>}
            {message.expiresAt && <Clock className="w-3 h-3" title="Disappearing message" />}
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isMine && <Ticks state={state} />}
          </div>

          {!selectionMode && !isDeleted && (
            <div className={`absolute top-1 ${isMine ? '-left-10' : '-right-10'} flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center text-[13px] hover:scale-110 transition-transform"
                title="React"
              >
                {reacted || '🙂'}
              </button>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pickerOpen && (
            <div className={`absolute -top-11 ${isMine ? 'right-0' : 'left-0'} z-30 bg-popover border border-border rounded-full shadow-xl px-1.5 py-1 flex items-center gap-0.5 chat-pop-enter`}>
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => { onReact?.(message, e); setPickerOpen(false); }}
                  className={`w-8 h-8 rounded-full text-[17px] hover:scale-125 transition-transform ${reacted === e ? 'bg-primary/15' : ''}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {menuOpen && (
            <div className={`absolute z-40 top-full mt-1 w-52 bg-popover border border-border rounded-xl shadow-2xl py-1 text-popover-foreground chat-pop-enter ${isMine ? 'right-0' : 'left-0'}`}>
              <MenuItem icon={CornerUpLeft} label="Reply" onClick={() => { onReply?.(message); setMenuOpen(false); }} />
              {!isDeleted && (
                <>
                  <MenuItem icon={Copy} label="Copy" onClick={() => { onCopy?.(message); setMenuOpen(false); }} />
                  <MenuItem icon={Forward} label="Forward" onClick={() => { onForward?.(message); setMenuOpen(false); }} />
                  <MenuItem icon={Star} label={message.starred ? 'Remove from starred' : 'Star / Save'} onClick={() => { onStar?.(message); setMenuOpen(false); }} />
                  <MenuItem icon={Pin} label={message.pinned ? 'Unpin message' : 'Pin message'} onClick={() => { onPin?.(message); setMenuOpen(false); }} />
                  {isMine && <MenuItem icon={Pencil} label="Edit message" onClick={() => { onEdit?.(message); setMenuOpen(false); }} />}
                  <MenuItem icon={CheckSquare} label="Select messages" onClick={() => { onToggleSelect?.(message); setMenuOpen(false); }} />
                  <MenuItem icon={Languages} label={translating ? 'Translating…' : 'Translate'} onClick={() => { handleTranslate(); setMenuOpen(false); }} />
                  <MenuItem icon={Info} label="Message info" onClick={() => { onInfo?.(message); setMenuOpen(false); }} />
                  <MenuItem icon={ShieldAlert} label="Report message" danger onClick={() => { onReport?.(message); setMenuOpen(false); }} />
                  <div className="h-px bg-border my-1" />
                </>
              )}
              <MenuItem icon={Trash2} label="Delete for me" danger onClick={() => { onDelete?.(message, 'me'); setMenuOpen(false); }} />
              {isMine && !isDeleted && (
                <MenuItem icon={Trash2} label="Delete for everyone" danger onClick={() => { onDelete?.(message, 'everyone'); setMenuOpen(false); }} />
              )}
              {message.failed && (
                <MenuItem icon={RotateCcw} label="Retry send" onClick={() => { onRetry?.(message); setMenuOpen(false); }} />
              )}
            </div>
          )}
        </div>

        <ReactionRow
          reactions={message.reactions}
          isMine={isMine}
          onToggle={(emoji) => onReact?.(message, emoji)}
          onShowDetails={(r) => onShowReactions?.(message, r)}
        />
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted transition-colors text-left ${danger ? 'text-red-600 dark:text-red-400' : ''}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

/* ─────────────────────────── list helpers ─────────────────────────── */

export function DateSeparator({ label }) {
  return (
    <div className="flex items-center justify-center my-3 px-4">
      <span className="px-3 py-1 rounded-full bg-card/90 border border-border text-[11px] font-medium text-muted-foreground shadow-sm">{label}</span>
    </div>
  );
}

export function UnreadDivider({ count }) {
  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <span className="flex-1 h-px bg-primary/30" />
      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{count} unread messages</span>
      <span className="flex-1 h-px bg-primary/30" />
    </div>
  );
}

export function SystemNotice({ text, tone = 'info' }) {
  const tones = {
    info: 'bg-muted/80 text-muted-foreground border-border',
    warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  };
  return (
    <div className="flex justify-center my-2 px-4">
      <span className={`px-3 py-1.5 rounded-lg border text-[11px] text-center max-w-md ${tones[tone] || tones.info}`}>{text}</span>
    </div>
  );
}


