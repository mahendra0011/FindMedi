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
  { key: 'balance', label: 'Balance ₹', render: (v) => v.toLocaleString('en-IN') },
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
