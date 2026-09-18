import React, { useEffect, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download,
  Send, Trash2, Forward, Star, Play, Maximize2,
} from 'lucide-react';
import { formatBytes } from '@/lib/chatPrefs';

/**
 * Fullscreen media viewer — image zoom/pan, video player, gallery navigation
 * (shared media me se seedha next/prev), download aur quick actions.
 */
export default function MediaViewer({ items = [], index = 0, onClose, onForward, onDelete, onStar, onSendToChat }) {
  const [current, setCurrent] = useState(index);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragFrom, setDragFrom] = useState(null);
  const [caption, setCaption] = useState('');

  const item = items[current];

  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, [current]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % items.length);
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + items.length) % items.length);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  if (!item) return null;

  const next = () => setCurrent((c) => (c + 1) % items.length);
  const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);
  const isImage = item.mimetype?.startsWith('image/');
  const isVideo = item.mimetype?.startsWith('video/');

  /** Wheel zoom (desktop) */
  const onWheel = (e) => {
    if (!isImage) return;
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col chat-pop-enter">
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-white/10 text-white">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.name || (isImage ? 'Photo' : isVideo ? 'Video' : 'File')}</p>
          <p className="text-[11px] text-white/60">
            {formatBytes(item.size || 0)}
            {items.length > 1 && <span className="ml-2">{current + 1} / {items.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onStar && (
            <button onClick={() => onStar(item)} className="p-2 rounded-full hover:bg-white/10" title="Star">
              <Star className="w-5 h-5" />
            </button>
          )}
          {onForward && (
            <button onClick={() => onForward(item)} className="p-2 rounded-full hover:bg-white/10" title="Forward">
              <Forward className="w-5 h-5" />
            </button>
          )}
          <a
            href={item.url}
            download={item.name || 'download'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          {onDelete && (
            <button onClick={() => onDelete(item)} className="p-2 rounded-full hover:bg-white/10 text-red-400" title="Delete">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        onWheel={onWheel}
        onMouseDown={(e) => { if (isImage && zoom > 1) setDragFrom({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }}
        onMouseMove={(e) => { if (dragFrom) setOffset({ x: e.clientX - dragFrom.x, y: e.clientY - dragFrom.y }); }}
        onMouseUp={() => setDragFrom(null)}
        onMouseLeave={() => setDragFrom(null)}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
      >
        {isImage && (
          <img
            src={item.url}
            alt={item.name || 'media'}
            draggable={false}
            className="max-h-full max-w-full object-contain transition-transform duration-100"
            style={{ transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
          />
        )}
        {isVideo && <video src={item.url} controls autoPlay className="max-h-full max-w-full" />}
        {!isImage && !isVideo && (
          <div className="text-center text-white/80 space-y-3">
            <Maximize2 className="w-12 h-12 mx-auto opacity-60" />
            <p className="text-sm">{item.name}</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
            >
              <Download className="w-4 h-4" /> Open / Download
            </a>
          </div>
        )}

        {items.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {isImage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1.5 text-white">
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="p-1.5 rounded-full hover:bg-white/10"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-[11px] w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="p-1.5 rounded-full hover:bg-white/10"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded-full hover:bg-white/10" title="Reset"><RotateCcw className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {onSendToChat && (
        <div className="px-3 sm:px-5 py-3 border-t border-white/10 flex items-center gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={() => onSendToChat(item, caption)}
            className="px-4 py-2 rounded-full bg-[var(--chat-accent,#059669)] text-white text-sm font-medium flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      )}

      {items.length > 1 && (
        <div className="px-3 sm:px-5 py-2.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {items.map((it, i) => (
            <button
              key={`${it.url}-${i}`}
              onClick={() => setCurrent(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === current ? 'border-[var(--chat-accent,#059669)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              {it.mimetype?.startsWith('image/') ? (
                <img src={it.thumbnail || it.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-white/10 flex items-center justify-center text-white">
                  <Play className="w-5 h-5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
