/**
 * File 22 P2-38: shared UI system — DataGrid, FilterBar, EntityPicker,
 * AlertBanner, BarcodeScanner, PdfViewer.
 * Every list page uses DataGrid; every detail page uses EntityPicker;
 * alerts route through AlertBanner; scanning uses BarcodeScanner;
 * PDF previews use PdfViewer. One component set, every surface.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Search, AlertTriangle, Camera, Loader2 } from 'lucide-react';

/* ─── AlertBanner ────────────────────────────────────────────────────────── */
export function AlertBanner({ alerts = [], onAck, onSnooze }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-1.5" role="alert">
      {alerts.filter(a => a.status === 'open').slice(0, 5).map(a => (
        <div key={a._id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
          a.severity === 'critical' ? 'border-red-300 bg-red-50 text-red-900'
          : a.severity === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-sky-300 bg-sky-50 text-sky-900'
        }`}>
          {a.severity === 'critical' ? <AlertTriangle size={15} /> : null}
          <span className="flex-1 truncate">{a.message}</span>
          <button onClick={() => onAck?.(a._id)} className="rounded bg-white/70 px-2 py-0.5 text-xs font-semibold hover:bg-white">Ack</button>
          {onSnooze ? <button onClick={() => onSnooze?.(a._id)} className="rounded bg-white/70 px-2 py-0.5 text-xs hover:bg-white">Snooze 1h</button> : null}
        </div>
      ))}
    </div>
  );
}

/* ─── DataGrid ───────────────────────────────────────────────────────────── */
export function DataGrid({ columns, rows, rowKey, onRowClick, empty = 'No records', pageSize = 20 }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(null);

  const filtered = useMemo(() => {
    let list = rows || [];
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(r => columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(needle)));
    }
    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        const av = a[key], bv = b[key];
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
      });
    }
    return list;
  }, [rows, q, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const header = (col) => (
    <th
      key={col.key}
      onClick={() => col.sortable !== false && setSort({ key: col.key, dir: sort?.key === col.key && sort.dir === 1 ? -1 : 1 })}
      className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      {col.label}{sort?.key === col.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="space-y-2">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
        <input
          className="h-9 w-full rounded-md border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Filter rows…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0); }}
          aria-label="Filter table rows"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/40 border-b"><tr>{columns.map(header)}</tr></thead>
          <tbody className="divide-y">
            {slice.map(r => (
              <tr
                key={rowKey ? r[rowKey] : JSON.stringify(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}
              >
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-2 text-sm">
                    {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-muted-foreground">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} rows · page {safePage + 1}/{pages}</span>
        <div className="flex gap-1">
          <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={13} /></button>
          <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}><ChevronRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─── FilterBar ──────────────────────────────────────────────────────────── */
export function FilterBar({ filters = [], value = {}, onChange }) {
  const set = (key, val) => onChange({ ...value, [key]: val });
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(f => {
        if (f.type === 'select') {
          return (
            <select
              key={f.key}
              className="h-9 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={value[f.key] || ''}
              onChange={e => set(f.key, e.target.value || undefined)}
              aria-label={f.label}
            >
              <option value="">{f.label}: all</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        }
        return (
          <input
            key={f.key}
            type={f.type || 'text'}
            className="h-9 w-40 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={f.label}
            value={value[f.key] || ''}
            onChange={e => set(f.key, e.target.value)}
          />
        );
      })}
      {Object.keys(value).length > 0 && (
        <button
          className="h-9 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => onChange({})}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ─── EntityPicker ───────────────────────────────────────────────────────── */
export function EntityPicker({ label, search, onSelect, renderOption, placeholder = 'Type to search…', debounceMs = 250 }) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!q.trim()) { setOptions([]); return; }
    const t = setTimeout(async () => {
      try { setOptions(await search(q)); } catch { setOptions([]); }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        className="h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-card shadow-lg">
          {options.map((o, i) => (
            <button
              key={o.id || i}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => { onSelect(o); setQ(o.name || o.label || ''); setOpen(false); }}
            >
              {renderOption ? renderOption(o) : <span>{o.name || o.label || String(o)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── BarcodeScanner ─────────────────────────────────────────────────────── */
export function BarcodeScanner({ onScan, label = 'Scan code' }) {
  const [manual, setManual] = useState('');
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <div className="flex-1 min-w-40">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <input
            className="h-10 flex-1 rounded-md border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="scan or type code…"
            value={manual}
            onChange={e => setManual(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manual.trim()) { onScan(manual.trim()); setManual(''); } }}
          />
          <Camera className="text-muted-foreground" size={18} />
        </div>
      </div>
    </div>
  );
}

/* ─── PdfViewer (embed) ──────────────────────────────────────────────────── */
export function PdfViewer({ src, height = 520 }) {
  if (!src) return <p className="py-8 text-center text-sm text-muted-foreground">No document selected.</p>;
  return (
    <iframe
      title="PDF preview"
      src={src}
      className="w-full rounded-lg border"
      style={{ height }}
    />
  );
}
