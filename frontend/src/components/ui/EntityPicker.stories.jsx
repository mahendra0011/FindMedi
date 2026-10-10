/**
 * EntityPicker story (P2-38) — async search with a debounce, plus the
 * empty-result path that every patient/bed/staff lookup hits.
 */
import React, { useState } from 'react';
import { EntityPicker } from './System';

export default {
  title: 'System/EntityPicker',
  component: EntityPicker,
  tags: ['autodocs'],
};

const PATIENTS = [
  { id: 'p1', name: 'Ram Kumar', meta: 'UH-1001 · 42 M' },
  { id: 'p2', name: 'Sita Devi', meta: 'UH-1002 · 31 F' },
  { id: 'p3', name: 'Asha Patel', meta: 'UH-1003 · 67 F' },
];

const searchPatients = async (q) => PATIENTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

export const Default = {
  render: () => <EntityPickerDemo />,
};

function EntityPickerDemo() {
  const [chosen, setChosen] = useState(null);
  return (
    <div style={{ width: 360 }}>
      <EntityPicker
        label="Select patient"
        placeholder="Type a name or UHID…"
        search={searchPatients}
        onSelect={setChosen}
        renderOption={(p) => (
          <span>
            <strong>{p.name}</strong> <span style={{ opacity: 0.7, fontSize: 12 }}>{p.meta}</span>
          </span>
        )}
      />
      <p style={{ marginTop: 8, fontSize: 13 }}>{chosen ? `Chosen: ${chosen.name}` : 'Nothing chosen yet.'}</p>
    </div>
  );
}

export const NoResults = {
  name: 'Search with no results',
  render: () => (
    <div style={{ width: 360 }}>
      <EntityPicker label="Select bed" search={async () => []} onSelect={() => {}} renderOption={(o) => o.name} />
      <p style={{ marginTop: 8, fontSize: 13 }}>Type anything — the list stays empty.</p>
    </div>
  ),
};
