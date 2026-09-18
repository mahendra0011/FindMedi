import React, { useEffect, useMemo, useState } from 'react';
import { Search, Smile, Sticker, Film, Clock, X } from 'lucide-react';
import { STICKER_PACKS, searchEmoji } from '@/lib/chatPrefs';

const RECENT_KEY = 'findmedi_chat_recent_emoji';
const LEGACY_RECENT_KEY = 'medicore_chat_recent_emoji';
const GIPHY_KEY = 'dc6zaTOxFJmzC'; // Giphy public beta key (no signup)

function readRecent() {
  try { return JSON.parse((localStorage.getItem(RECENT_KEY) || localStorage.getItem(LEGACY_RECENT_KEY)) || '[]'); } catch { return []; }
}
function pushRecent(emoji) {
  const next = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, 24);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/**
 * Emoji / Sticker / GIF picker (WhatsApp-style tabs).
 *  - Emoji: grouped + searchable (unicode-aware)
 *  - Sticker: curated health/chat stickers (text based)
 *  - GIF: Giphy public beta key se search (fail hone par graceful message)
 */
export default function EmojiPicker({ onPickEmoji, onPickSticker, onPickGif, onClose, className = '' }) {
  const [tab, setTab] = useState('emoji');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecent());
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState('');

  const groups = useMemo(() => searchEmoji(query), [query]);

  useEffect(() => {
    if (tab !== 'gif') return;
    let cancelled = false;
    setGifLoading(true);
    setGifError('');
    const q = query.trim() || 'health care';
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const items = (data?.data || []).map((g) => ({
          id: g.id,
          url: g.images?.fixed_height?.url || g.images?.original?.url,
          preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
        }));
        setGifs(items);
        if (!items.length) setGifError('No GIFs found — try another keyword.');
      })
      .catch(() => { if (!cancelled) setGifError('GIF service unreachable. Emoji/stickers use karein.'); })
      .finally(() => { if (!cancelled) setGifLoading(false); });
    return () => { cancelled = true; };
  }, [tab, query]);

  const pickEmoji = (emoji) => {
    setRecent(pushRecent(emoji));
    onPickEmoji?.(emoji);
  };

  const tabs = [
    { key: 'emoji', icon: Smile, label: 'Emoji' },
    { key: 'sticker', icon: Sticker, label: 'Stickers' },
    { key: 'gif', icon: Film, label: 'GIF' },
  ];

  return (
    <div className={`w-[330px] max-w-[92vw] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden chat-pop-enter ${className}`}>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'gif' ? 'Search GIFs…' : 'Search emoji…'}
            className="w-full bg-muted/60 border border-border rounded-full pl-8 pr-8 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="h-[240px] overflow-y-auto scrollbar-thin px-2 py-2">
        {tab === 'emoji' && (
          <>
            {!query && recent.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Frequently used
                </p>
                <div className="flex flex-wrap gap-0.5">
                  {recent.map((e) => (
                    <button key={e} onClick={() => pickEmoji(e)} className="w-8 h-8 rounded-lg text-[18px] hover:bg-muted">{e}</button>
                  ))}
                </div>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key} className="mb-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1">{g.label}</p>
                <div className="flex flex-wrap gap-0.5">
                  {g.emojis.map((e) => (
                    <button key={e} onClick={() => pickEmoji(e)} className="w-8 h-8 rounded-lg text-[18px] hover:bg-muted" title={e}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!groups.length && <p className="text-center text-[12px] text-muted-foreground py-8">No emoji found</p>}
          </>
        )}

        {tab === 'sticker' && (
          <div className="space-y-3">
            {STICKER_PACKS.map((pack) => (
              <div key={pack.label}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-1">{pack.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {pack.stickers.map((s) => (
                    <button
                      key={s}
                      onClick={() => onPickSticker?.(s)}
                      className="px-2.5 py-2 rounded-lg bg-muted/60 hover:bg-muted text-[12px] text-left leading-tight"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'gif' && (
          <>
            {gifLoading && <p className="text-center text-[12px] text-muted-foreground py-8">Loading GIFs…</p>}
            {gifError && !gifLoading && <p className="text-center text-[12px] text-muted-foreground py-8">{gifError}</p>}
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((g) => (
                <button key={g.id} onClick={() => onPickGif?.(g.url)} className="rounded-lg overflow-hidden border border-border hover:border-primary/50">
                  <img src={g.preview || g.url} alt="gif" className="w-full h-[86px] object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            {!gifLoading && !gifError && gifs.length === 0 && (
              <p className="text-center text-[12px] text-muted-foreground py-8">Search a keyword to find GIFs</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center border-t border-border">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${tab === key ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        {onClose && (
          <button onClick={onClose} className="px-3 py-2 text-muted-foreground hover:text-foreground" title="Close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}