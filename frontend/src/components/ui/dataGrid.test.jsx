/**
 * DataGrid behaviour tests (P2-38).
 *
 * WHY: System.tsx's DataGrid was rebuilt on TanStack Table v8 + TanStack
 * Virtual. The a11y spec only proves the markup is reachable — it does not
 * prove the MODELS work. These tests pin the actual behaviour a list page
 * depends on: search spans every column, sort is null-last in both
 * directions, the pager respects pageSize, and the virtualiser keeps the DOM
 * small no matter how many rows arrive.
 */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DataGrid } from './System';

afterEach(() => cleanup());

const COLS = [
  { key: 'uhid', label: 'UHID' },
  { key: 'name', label: 'Patient' },
  { key: 'balance', label: 'Balance' },
];

const ROWS = [
  { uhid: 'UH-3', name: 'Ram Kumar', balance: 4250 },
  { uhid: 'UH-1', name: 'Sita Devi', balance: null },
  { uhid: 'UH-2', name: 'Asha Patel', balance: 18900 },
  { uhid: 'UH-4', name: 'Mohan Singh', balance: 1200 },
];

const bodyCells = (colIndex) => screen.getAllByRole('row')
  .slice(1) // drop the header row
  .map(r => within(r).getAllByRole('cell')[colIndex]?.textContent);

describe('DataGrid · TanStack filtering', () => {
  it('search matches ANY column, not just the first', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" />);
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'Asha' } });
    expect(bodyCells(1)).toEqual(['Asha Patel']);
  });

  it('a query that matches nothing shows the empty state', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" empty="No patients" />);
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'zzz' } });
    expect(screen.getByText('No patients')).toBeInTheDocument();
  });

  it('clearing the search restores every row', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" />);
    const input = screen.getByLabelText('Filter table rows');
    fireEvent.change(input, { target: { value: 'Mohan' } });
    expect(bodyCells(1)).toEqual(['Mohan Singh']);
    fireEvent.change(input, { target: { value: '' } });
    expect(bodyCells(1)).toHaveLength(4);
  });
});

describe('DataGrid · TanStack sorting', () => {
  it('one click sorts ascending', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" />);
    fireEvent.click(screen.getByRole('button', { name: /patient/i }));
    expect(bodyCells(1)).toEqual(['Asha Patel', 'Mohan Singh', 'Ram Kumar', 'Sita Devi']);
    expect(screen.getByRole('columnheader', { name: /patient/i })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('a second click sorts descending', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" />);
    const header = screen.getByRole('button', { name: /patient/i });
    fireEvent.click(header);
    fireEvent.click(header);
    expect(bodyCells(1)).toEqual(['Sita Devi', 'Ram Kumar', 'Mohan Singh', 'Asha Patel']);
    expect(screen.getByRole('columnheader', { name: /patient/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('nulls sort LAST in both directions', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" />);
    const header = screen.getByRole('button', { name: /balance/i });
    fireEvent.click(header);
    let cells = bodyCells(2);
    expect(cells[cells.length - 1]).toBe('');
    fireEvent.click(header);
    cells = bodyCells(2);
    expect(cells[cells.length - 1]).toBe('');
  });

  it('sortable={false} disables the column control', () => {
    const cols = [{ key: 'uhid', label: 'UHID', sortable: false }, { key: 'name', label: 'Patient' }];
    render(<DataGrid columns={cols} rows={ROWS} rowKey="uhid" />);
    expect(screen.getByRole('button', { name: /uhid/i })).toBeDisabled();
    expect(screen.getByRole('columnheader', { name: /uhid/i })).not.toHaveAttribute('aria-sort');
  });
});

describe('DataGrid · TanStack pagination', () => {
  it('shows pageSize rows and pages through the rest', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" pageSize={2} />);
    expect(bodyCells(1)).toHaveLength(2);
    expect(screen.getByText(/4 rows · page 1\/2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(bodyCells(1)).toHaveLength(2);
    expect(screen.getByText(/4 rows · page 2\/2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('going back to page 1 re-enables next', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" pageSize={2} />);
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText(/page 1\/2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('filtering snaps back to the first page', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" pageSize={2} />);
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText(/page 2\/2/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'Sita' } });
    expect(screen.getByText(/page 1\/1/)).toBeInTheDocument();
  });

  it('the row count follows the FILTERED set, not the raw one', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" pageSize={2} />);
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'a' } });
    // Asha Patel, Ram Kumar, Sita Devi, Mohan Singh — all four contain an 'a'
    expect(screen.getByText(/4 rows/)).toBeInTheDocument();
  });
});

describe('DataGrid · TanStack Virtual', () => {
  const many = Array.from({ length: 5000 }, (_, i) => ({
    uhid: `UH-${i}`, name: `Patient ${i}`, balance: i,
  }));

  it('keeps the DOM small for a huge row set', () => {
    render(<DataGrid columns={COLS} rows={many} rowKey="uhid" pageSize={100} />);
    // The scroller replaces the pager entirely.
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.getByText(/5000 rows · virtualised/)).toBeInTheDocument();
    // Only the visible window (+overscan) is materialised, never 5000 <tr>s.
    const rendered = screen.getAllByRole('row').length;
    expect(rendered).toBeGreaterThan(1);
    expect(rendered).toBeLessThan(200);
  });

  it('declares the TRUE row count to assistive tech', () => {
    render(<DataGrid columns={COLS} rows={many} rowKey="uhid" />);
    const table = screen.getByRole('table');
    // header row + 5000 data rows
    expect(table).toHaveAttribute('aria-rowcount', '5001');
    // and rows carry absolute indices, not window-relative ones
    const firstDataRow = screen.getAllByRole('row')[1];
    expect(firstDataRow).toHaveAttribute('aria-rowindex', '2');
  });

  it('search narrows the virtualised set too', () => {
    render(<DataGrid columns={COLS} rows={many} rowKey="uhid" />);
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'Patient 4999' } });
    // Filtering 5000 rows down to one drops BELOW the virtualise threshold, so
    // the grid correctly falls back to the plain paged table (cheaper DOM, and
    // the pager is meaningful again for a single row).
    expect(screen.getByText(/1 rows · page 1\/1/)).toBeInTheDocument();
    expect(screen.getByText('Patient 4999')).toBeInTheDocument();
    expect(screen.queryByText(/virtualised/)).not.toBeInTheDocument();
  });

  it('sorting APPLIES inside the virtualised window', () => {
    // Regression: the virtual path used getFilteredRowModel, which filters but
    // never sorts — so header clicks did nothing past the threshold.
    const unsorted = [
      { uhid: 'UH-2', name: 'Beta', balance: 2 },
      { uhid: 'UH-1', name: 'Alpha', balance: 1 },
    ].concat(many);
    render(<DataGrid columns={COLS} rows={unsorted} rowKey="uhid" />);
    fireEvent.click(screen.getByRole('button', { name: /patient/i }));
    // 'Alpha' must be the first VISIBLE row of the virtual window
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    const names = screen.getAllByRole('row').slice(1)
      .map(r => within(r).getAllByRole('cell')[1]?.textContent);
    expect(names[0]).toBe('Alpha');
  });

  it('stays virtualised while the filtered set is still large', () => {
    render(<DataGrid columns={COLS} rows={many} rowKey="uhid" />);
    // 1234 matches, still above the threshold -> stays virtualised
    fireEvent.change(screen.getByLabelText('Filter table rows'), { target: { value: 'Patient 1' } });
    expect(screen.getByText(/rows · virtualised/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
  });

  it('honours an explicit virtualizeThreshold', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" virtualizeThreshold={2} />);
    // 4 rows > threshold 2, so virtualised
    expect(screen.getByText(/virtualised/)).toBeInTheDocument();
  });
});

describe('DataGrid · server-owned controls', () => {
  it('showSearch={false} hides the client filter (page owns search)', () => {
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" showSearch={false} />);
    expect(screen.queryByLabelText('Filter table rows')).not.toBeInTheDocument();
    // all rows still render — nothing is filtering them
    expect(bodyCells(1)).toHaveLength(4);
  });

  it('manualPagination renders the WHOLE slice with no pager', () => {
    // The caller hands us "page 3" = 50 rows. Paging them again would silently
    // drop 30 of them behind a pager the caller already renders.
    const slice = ROWS.concat(ROWS).concat(ROWS);
    render(<DataGrid columns={COLS} rows={slice} rowKey="uhid" pageSize={5} manualPagination />);
    expect(bodyCells(1)).toHaveLength(12);
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.getByText('12 rows')).toBeInTheDocument();
  });

  it('manualPagination still sorts the slice it was given', () => {
    const slice = ROWS.concat(ROWS);
    render(<DataGrid columns={COLS} rows={slice} rowKey="uhid" manualPagination showSearch={false} />);
    fireEvent.click(screen.getByRole('button', { name: /patient/i }));
    const cells = bodyCells(1);
    expect(cells[0]).toBe('Asha Patel');
    expect(cells).toHaveLength(8);
  });

  it('manualPagination virtualises a large slice', () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ uhid: `UH-${i}`, name: `P${i}`, balance: i }));
    render(<DataGrid columns={COLS} rows={many} rowKey="uhid" manualPagination virtualizeThreshold={100} />);
    expect(screen.getByText(/400 rows · virtualised/)).toBeInTheDocument();
  });
});

describe('DataGrid · rowClassName', () => {
  it('tints only the rows the caller flags', () => {
    const rows = [
      { uhid: 'UH-1', name: 'Clean', balance: 1, flagged: false },
      { uhid: 'UH-2', name: 'Bad', balance: 2, flagged: true },
    ];
    render(
      <DataGrid
        columns={COLS}
        rows={rows}
        rowKey="uhid"
        rowClassName={(r) => (r.flagged ? 'bg-amber-50' : '')}
      />,
    );
    const [clean, bad] = screen.getAllByRole('row').slice(1);
    expect(clean.className).not.toContain('bg-amber-50');
    expect(bad.className).toContain('bg-amber-50');
  });

  it('omits the class attribute when no row is flagged', () => {
    const rows = [{ uhid: 'UH-1', name: 'Clean', balance: 1, flagged: false }];
    render(<DataGrid columns={COLS} rows={rows} rowKey="uhid" rowClassName={(r) => (r.flagged ? 'bg-amber-50' : '')} />);
    const row = screen.getAllByRole('row')[1];
    expect(row).not.toHaveAttribute('class');
  });
});

describe('DataGrid · interaction', () => {
  it('onRowClick receives the clicked row object', () => {
    const onRowClick = vi.fn();
    render(<DataGrid columns={COLS} rows={ROWS} rowKey="uhid" onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Ram Kumar'));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ uhid: 'UH-3', name: 'Ram Kumar' }));
  });

  it('column render() receives (value, row)', () => {
    const cols = [{ key: 'name', label: 'Patient' }, {
      key: 'balance',
      label: 'Balance',
      render: (v) => (v == null ? '—' : `₹${v}`),
    }];
    render(<DataGrid columns={cols} rows={ROWS} rowKey="uhid" />);
    expect(screen.getAllByText('₹4250')).toHaveLength(1);
    // the null balance renders as the em-dash fallback, not "null" or "0"
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders no rows and no empty-state row when rows is empty', () => {
    render(<DataGrid columns={COLS} rows={[]} rowKey="uhid" empty="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('tolerates a missing rows prop (loading state)', () => {
    render(<DataGrid columns={COLS} rowKey="uhid" empty="Loading…" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
