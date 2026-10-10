/**
 * FilterBar story (P2-38) — controlled so "Clear filters" and the select
 * reset behaviour are visible in the canvas.
 */
import React, { useState } from 'react';
import { FilterBar } from './System';

export default {
  title: 'System/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
};

const FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
  { key: 'department', label: 'Department', type: 'select', options: ['Cardiology', 'Radiology'] },
  { key: 'from', label: 'From date', type: 'date' },
  { key: 'q', label: 'Search', type: 'text' },
];

/* The demo lives in a real component so `useState` is legal under
 * rules-of-hooks (Storybook's `render` factory is not a component). */
function FilterBarDemo({ filters = FILTERS }) {
  const [value, setValue] = useState({});
  return <FilterBar filters={filters} value={value} onChange={setValue} />;
}

export const Default = {
  render: () => <FilterBarDemo />,
};

export const NoSelection = {
  name: 'No filters chosen (no Clear button)',
  render: () => <FilterBarDemo filters={[{ key: 'q', label: 'Search', type: 'text' }]} />,
};

export const Preselected = {
  args: {
    filters: FILTERS,
    value: { status: 'Pending' },
    onChange: () => {},
  },
};
