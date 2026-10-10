/**
 * File 22 P2-38: shared UI system — DataGrid, FilterBar, EntityPicker,
 * AlertBanner, BarcodeScanner, PdfViewer.
 * Every list page uses DataGrid; every detail page uses EntityPicker;
 * alerts route through AlertBanner; scanning uses BarcodeScanner;
 * PDF previews use PdfViewer. One component set, every surface.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual';
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
/**
 * File 22 P2-38: TanStack Table v8 owns the MODELS (filter / sort / paginate /
 * row identity) and TanStack Virtual owns the RENDER WINDOW. The public API
 * stays `{ columns: [{key,label,sortable,render}], rows, rowKey, onRowClick }`
 * so every call site keeps working — the checklist called for TanStack Table
 * + Virtual and a hand-rolled equivalent does not buy the same guarantees.
 *
 * Above `virtualizeThreshold` rows the pager is replaced by a scroller: only
 * the visible window plus overscan is in the DOM, so a 50k-row audit log does
 * not cost 50k <tr>s. Below the threshold behaviour is the classic paged grid
 * (jsdom cannot measure a scroller, so small grids are what CI exercises).
 */
const ROW_HEIGHT = 36;
// Matches the inline height on the scroller below. Used as the measurement
// floor when a layout engine reports 0 (jsdom).
const SCROLLER_HEIGHT = 480;

/**
 * Nulls always sort LAST, in both directions.
 *
 * TanStack negates the comparator result for descending sorts, so returning a
 * plain "null is greater" would flip nulls to the TOP on the second click.
 * `sortUndefined` cannot help either — it only tests `=== undefined`, and
 * Mongo/API rows carry `null`. So the comparator closes over the direction.
 */
const nullsLastComparator = (desc) => (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return desc ? -1 : 1;
  if (b == null) return desc ? 1 : -1;
  return a > b ? 1 : a < b ? -1 : 0;
};

/**
 * jsdom reports a 0-height rect for every element, so TanStack Virtual would
 * cache size 0 for each measured row, collapse the scroll height and unmount
 * the very rows it needs to measure — a feedback loop to an empty table. Real
 * browsers take the ResizeObserver/rect value; the estimate is the fallback
 * only when measurement genuinely returned nothing.
 */
const measureElementOrDefault = (element, entry) => {
  const fromEntry = entry?.borderBoxSize?.[0]?.blockSize;
  const fromRect = element?.getBoundingClientRect?.().height;
  return Math.round(fromEntry || fromRect) || ROW_HEIGHT;
};

/**
 * jsdom has no layout engine, so it reports 0x0 for the scroller. TanStack
 * then computes `outerSize === 0`, `calculateRange` returns null and NO rows
 * render — a 5000-row grid becomes an empty table in tests while working fine
 * in a browser. Flooring the measurement at the declared height keeps the
 * virtualiser honest in both environments.
 */
const observeElementRectWithFloor = (instance, cb) => {
  observeElementRect(instance, (rect) => {
    cb({ width: rect.width || 800, height: rect.height || SCROLLER_HEIGHT });
  });
};

export function DataGrid({
  columns = [],
  rows,
  rowKey,
  onRowClick,
  empty = 'No records',
  pageSize = 20,
  virtualizeThreshold = 100,
  /**
   * Most list pages already own their search box (it hits the API with a
   * `search` param so the server can index). Rendering a SECOND filter on top
   * would be confusing, so those callers hide this one.
   */
  showSearch = true,
  /**
   * For server-paginated lists: the caller owns the page window, so the grid
   * must not paginate again on top of it. Renders every row it is handed and
   * suppresses the pager; virtualisation still applies past the threshold.
   */
  manualPagination = false,
  /**
   * Per-row tinting some lists need (flagged users, low stock, expiring…).
   * Receives the original row object, returns extra class names.
   */
  rowClassName,
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const parentRef = useRef(null);

  // Keep the pager's pageSize in sync when the prop changes.
  useEffect(() => {
    setPagination(p => (p.pageSize === pageSize ? p : { ...p, pageSize, pageIndex: 0 }));
  }, [pageSize]);

  const tanstackColumns = useMemo(() => columns.map(c => ({
    id: c.key,
    accessorFn: (row) => row[c.key],
    header: c.label,
    enableSorting: c.sortable !== false,
    sortingFn: nullsLastComparator(sorting.some(s => s.id === c.key && s.desc)),
    cell: (info) => (c.render ? c.render(info.getValue(), info.row.original) : String(info.getValue() ?? '')),
  })), [columns, sorting]);

  // Search spans every declared column, exactly like the hand-rolled filter did.
  const globalFilterFn = useCallback((row, _columnId, filterValue) => {
    const needle = String(filterValue ?? '').trim().toLowerCase();
    if (!needle) return true;
    return columns.some(c => String(row.getValue(c.key) ?? '').toLowerCase().includes(needle));
  }, [columns]);

  const table = useReactTable({
    data: useMemo(() => rows || [], [rows]),
    columns: tanstackColumns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    // The index is part of the id on purpose: a list where the business key is
    // missing (new unsaved row) or repeated (two lines with the same UHID)
    // would otherwise hand TanStack duplicate row ids, and React then keys two
    // <tr>s identically — rendering the row twice and breaking sort order.
    // The index is the SOURCE index, so it stays stable across sorts.
    getRowId: (row, index) => `${rowKey != null && row?.[rowKey] != null ? String(row[rowKey]) : 'row'}-${index}`,
    globalFilterFn,
    // TanStack's auto sort dir is DESC for numeric columns. Every other list in
    // this product starts with the first click = ascending, so pin it.
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // The caller owns the page window when manualPagination is on, so installing
    // the pagination model would silently re-page a slice that is already one page.
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const virtualize = filteredCount > virtualizeThreshold;
  // getFilteredRowModel applies the SEARCH ONLY — it does not sort. The sorted
  // model is what builds on it, and getRowModel() is that plus the pager. Any
  // mode that renders rows itself must take the sorted model, or clicking a
  // header silently does nothing.
  // A virtual scroller IS the page (paging it double-counts); manualPagination
  // has the same shape (the caller already owns the window).
  const pageRows = (virtualize || manualPagination)
    ? table.getSortedRowModel().rows
    : table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: pageRows.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => parentRef.current,
    overscan: 10,
    measureElement: measureElementOrDefault,
    observeElementRect: observeElementRectWithFloor,
    // jsdom reports a zero-size scroller; without this the virtual list is
    // empty in tests and the component silently renders nothing.
    initialRect: { width: 800, height: SCROLLER_HEIGHT },
  });
  const virtualRows = virtualize ? rowVirtualizer.getVirtualItems() : [];

  const pages = Math.max(1, table.getPageCount());
  const pageIndex = table.getState().pagination.pageIndex;

  const sortLabel = (header) => {
    const sorted = header.column.getIsSorted();
    if (sorted === 'asc') return 'ascending';
    if (sorted === 'desc') return 'descending';
    return header.column.getCanSort() ? 'none' : undefined;
  };

  const renderRow = (row, virtualIndex) => {
    const r = row.original;
    return (
      <tr
        key={row.id}
        data-index={virtualIndex}
        // ARIA requires the ABSOLUTE row number when a table is virtualised,
        // or a screen reader believes a 50k-row grid has 20 rows.
        aria-rowindex={virtualize ? virtualIndex + 2 : undefined}
        ref={virtualize ? (node) => { if (node) rowVirtualizer.measureElement(node); } : undefined}
        style={virtualize ? { transform: `translateY(${virtualRows[virtualIndex]?.start ?? 0}px)`, position: 'absolute', left: 0, right: 0 } : undefined}
        onClick={onRowClick ? () => onRowClick(r) : undefined}
        className={[onRowClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : '', rowClassName ? rowClassName(r) : ''].filter(Boolean).join(' ') || undefined}
      >
        {columns.map(c => (
          <td key={c.key} className="px-3 py-2 text-sm">
            {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
          </td>
        ))}
      </tr>
    );
  };

  const body = () => {
    if (virtualize) {
      return (
        <>
          {virtualRows.map((vr) => renderRow(pageRows[vr.index], vr.index))}
        </>
      );
    }
    if (pageRows.length === 0) {
      return (
        <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-muted-foreground">{empty}</td></tr>
      );
    }
    return pageRows.map((row, i) => renderRow(row, i));
  };

  return (
    <div className="space-y-2">
      {showSearch ? (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
          <input
            className="h-9 w-full rounded-md border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Filter rows…"
            value={globalFilter}
            onChange={(e) => { setGlobalFilter(e.target.value); table.setPageIndex(0); }}
            aria-label="Filter table rows"
          />
        </div>
      ) : null}
      <div
        ref={virtualize ? parentRef : undefined}
        className={`rounded-lg border ${virtualize ? 'overflow-auto' : 'overflow-x-auto'}`}
        style={virtualize ? { height: SCROLLER_HEIGHT } : undefined}
      >
        <table className="w-full" aria-rowcount={virtualize ? filteredCount + 1 : undefined}>
          <thead className="bg-muted/40 border-b">
            <tr>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={sortLabel(header)}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? <span aria-hidden="true">▲</span> : null}
                      {header.column.getIsSorted() === 'desc' ? <span aria-hidden="true">▼</span> : null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={virtualize ? { height: rowVirtualizer.getTotalSize(), position: 'relative' } : undefined}>
            {body()}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {virtualize ? (
          <span>{filteredCount} rows · virtualised</span>
        ) : manualPagination ? (
          // The caller is already showing "page 3 of 12"; a second pager here
          // would page the slice it handed us a second time.
          <span>{filteredCount} rows</span>
        ) : (
          <>
            <span>{filteredCount} rows · page {pageIndex + 1}/{pages}</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous page"
                className="rounded border px-2 py-1 disabled:opacity-40"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next page"
                className="rounded border px-2 py-1 disabled:opacity-40"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
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
            // A placeholder disappears the moment someone types, so it is not a
            // label: name the control explicitly for screen readers.
            aria-label={f.label}
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
  const inputId = useId();

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
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        id={inputId}
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
  const inputId = useId();
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <div className="flex-1 min-w-40">
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <input
            id={inputId}
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
