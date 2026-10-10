/**
 * File 22 P2-38: axe-core accessibility CI for the shared UI system.
 *
 * WHY: the checklist asked for "Storybook + axe CI". This repo has no
 * Storybook, but it DOES have Vitest + jsdom already wired into CI, so the
 * axe gate runs against the actual component set every build instead of
 * living in a tool nobody opens. Each component in System.tsx — the one every
 * list/detail/alert surface reuses — is rendered and scanned.
 *
 * jsdom caveat: axe's colour-contrast rule needs a real layout engine and
 * reports "incomplete" rather than pass/fail here, so that one rule is
 * disabled explicitly rather than silently ignored.
 */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import {
  AlertBanner, DataGrid, FilterBar, EntityPicker, BarcodeScanner, PdfViewer,
} from './System';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  // jsdom cannot host a real browsing context, so axe's cross-frame postMessage
  // handshake throws ("Respondable target must be a frame"). Turning frame
  // crawling off keeps the scan on THIS document — the iframe's own content is
  // a same-origin PDF we do not author.
  iframes: false,
  rules: {
    // jsdom has no layout/paint, so contrast is reported "incomplete" and
    // would make the gate meaningless. Real contrast is covered by the
    // token palette in index.css.
    'color-contrast': { enabled: false },
  },
};

const scan = async (container) => {
  const results = await axe.run(container, AXE_OPTIONS);
  return {
    violations: results.violations.map((v) => ({
      id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help,
    })),
    incomplete: results.incomplete.length,
  };
};

describe('P2-38 axe: shared UI system', () => {
  it('AlertBanner has no WCAG A/AA violations', async () => {
    const { container } = render(
      <AlertBanner
        alerts={[
          { _id: 'a1', severity: 'critical', message: 'Critical lab: Potassium 6.9', status: 'open' },
          { _id: 'a2', severity: 'warning', message: 'Bed 12 cleaning overdue', status: 'open' },
        ]}
        onAck={() => {}}
        onSnooze={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('DataGrid has no violations (search input + table + pager)', async () => {
    const { container } = render(
      <DataGrid
        columns={[
          { key: 'name', label: 'Patient' },
          { key: 'bed', label: 'Bed' },
          { key: 'status', label: 'Status' },
        ]}
        rows={[
          { name: 'Ram Kumar', bed: 'A-1', status: 'Admitted' },
          { name: 'Sita Devi', bed: 'A-2', status: 'Discharged' },
        ]}
        rowKey="name"
        onRowClick={() => {}}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter table rows')).toBeInTheDocument();
    // icon-only pager buttons need names or a screen reader announces "button"
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('DataGrid empty state is still accessible', async () => {
    const { container } = render(
      <DataGrid columns={[{ key: 'a', label: 'A' }]} rows={[]} empty="No claims yet" />,
    );
    expect(screen.getByText('No claims yet')).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('FilterBar labels every control', async () => {
    const { container } = render(
      <FilterBar
        filters={[
          { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved'] },
          { key: 'from', label: 'From date', type: 'date' },
          { key: 'q', label: 'Search', type: 'text' },
        ]}
        value={{ status: 'Pending' }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // every control resolves by its NAME, not just by existing
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('EntityPicker has an accessible name for its search field', async () => {
    const { container } = render(
      <EntityPicker
        label="Select patient"
        search={async () => [{ id: 'p1', name: 'Ram Kumar' }]}
        onSelect={() => {}}
        renderOption={(o) => o.name}
        debounceMs={0}
      />,
    );
    // the visible <label> must be ASSOCIATED with the input, not just adjacent
    expect(screen.getByLabelText('Select patient')).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('BarcodeScanner labels its manual-entry field', async () => {
    const { container } = render(<BarcodeScanner onScan={() => {}} />);
    expect(screen.getByLabelText(/scan code/i)).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('PdfViewer iframe is titled', async () => {
    const { container } = render(<PdfViewer src="about:blank" />);
    expect(screen.getByTitle('PDF preview')).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });

  it('PdfViewer empty state announces the absence of a document', async () => {
    const { container } = render(<PdfViewer src="" />);
    expect(screen.getByText(/no document selected/i)).toBeInTheDocument();
    const { violations } = await scan(container);
    expect(violations).toEqual([]);
  });
});
