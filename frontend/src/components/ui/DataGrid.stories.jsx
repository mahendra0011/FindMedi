/**
 * DataGrid story (P2-38) — the table every list page in the product reuses.
 * Interactive because filtering/sorting/paging are stateful inside the
 * component itself.
 */
import React from 'react';
import { DataGrid } from './System';

export default {
  title: 'System/DataGrid',
  component: DataGrid,
  tags: ['autodocs'],
  argTypes: {
    onRowClick: { action: 'row clicked' },
  },
};

const ROWS = [
  { uhid: 'UH-1001', name: 'Ram Kumar', bed: 'A-1', status: 'Admitted', balance: 4250 },
  { uhid: 'UH-1002', name: 'Sita Devi', bed: 'A-2', status: 'Discharged', balance: 0 },
  { uhid: 'UH-1003', name: 'Asha Patel', bed: 'ICU-3', status: 'Critical', balance: 18900 },
  { uhid: 'UH-1004', name: 'Mohan Singh', bed: 'B-7', status: 'Admitted', balance: 1200 },
  { uhid: 'UH-1005', name: 'Zoya Khan', bed: 'OPD-4', status: 'Waiting', balance: 300 },
];

const COLUMNS = [
  { key: 'uhid', label: 'UHID' },
  { key: 'name', label: 'Patient' },
  { key: 'bed', label: 'Bed' },
  {
    key: 'status',
    label: 'Status',
    render: (v) => (
      <span
        className={
          v === 'Critical' ? 'font-semibold text-red-700'
          : v === 'Admitted' ? 'text-amber-700'
          : 'text-muted-foreground'
        }
      >
        {v}
      </span>
    ),
  },
  { key: 'balance', label: 'Balance ₹', render: (v) => (v == null ? '—' : v.toLocaleString('en-IN')) },
];

export const Default = {
  args: { columns: COLUMNS, rows: ROWS, rowKey: 'uhid' },
};

export const ClickableRows = {
  name: 'Clickable rows',
  args: { columns: COLUMNS, rows: ROWS, rowKey: 'uhid', onRowClick: () => {} },
};

export const Paged = {
  args: { columns: COLUMNS, rows: ROWS, rowKey: 'uhid', pageSize: 2 },
};

export const Empty = {
  args: { columns: COLUMNS, rows: [], empty: 'No admissions today' },
};

/**
 * 5000 rows crosses the virtualise threshold (default 100), so the pager is
 * replaced by a scroller: only the visible window plus overscan is in the DOM.
 * Sort by any column and scroll — the header stays put, the rows recycle.
 */
export const Virtualised = {
  name: 'Virtualised (5000 rows)',
  args: {
    columns: COLUMNS,
    rows: Array.from({ length: 5000 }, (_, i) => ({
      uhid: `UH-${2000 + i}`,
      name: `Patient ${i}`,
      bed: `${['A', 'B', 'ICU'][i % 3]}-${(i % 40) + 1}`,
      status: ['Admitted', 'Discharged', 'Critical', 'Waiting'][i % 4],
      balance: (i * 37) % 25000,
    })),
    rowKey: 'uhid',
  },
};

/**
 * 5000 rows with a null balance sprinkled through them — sorting by Balance
 * must keep the nulls LAST in both ascending and descending order.
 */
export const VirtualisedWithNulls = {
  name: 'Virtualised with null sort values',
  args: {
    columns: COLUMNS,
    rows: Array.from({ length: 5000 }, (_, i) => ({
      uhid: `UH-${2000 + i}`,
      name: `Patient ${i}`,
      bed: `A-${(i % 40) + 1}`,
      status: 'Admitted',
      balance: i % 7 === 0 ? null : (i * 37) % 25000,
    })),
    rowKey: 'uhid',
  },
};

export const LoadingShaped = {
  name: 'Long text truncation',
  args: {
    columns: [
      { key: 'name', label: 'Patient' },
      { key: 'note', label: 'Clinical note' },
    ],
    rows: [
      { name: 'Ram Kumar', note: 'Patient presented with chest pain radiating to left arm, ECG shows ST elevation in leads II, III and aVF — cath lab activated at 02:14' },
    ],
    rowKey: 'name',
  },
};
