import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('offline'))),
    post: vi.fn(() => Promise.reject(new Error('offline'))),
  },
}));

import AdmissionCoordinatorDashboard from './AdmissionCoordinatorDashboard';
import AuditorDashboard from './AuditorDashboard';
import BedManagerDashboard from './BedManagerDashboard';
import CorporateBillingDashboard from './CorporateBillingDashboard';
import FacilityManagerDashboard from './FacilityManagerDashboard';
import HodDashboard from './HodDashboard';
import MedicalSuperintendentDashboard from './MedicalSuperintendentDashboard';
import OpdCoordinatorDashboard from './OpdCoordinatorDashboard';
import PatientRelationsDashboard from './PatientRelationsDashboard';
import ResidentDashboard from './ResidentDashboard';

/** The 10 wave-2 dashboards wired to useLiveKpis (file 31 · T8). */
const LIVE_DASHBOARDS = [
  { name: 'AdmissionCoordinator', Comp: AdmissionCoordinatorDashboard, title: 'Admission Coordinator Dashboard', kpi: 'Pending Pre-Auth' },
  { name: 'Auditor', Comp: AuditorDashboard, title: 'Auditor Dashboard', kpi: 'Audit Events (24h)' },
  { name: 'BedManager', Comp: BedManagerDashboard, title: 'Bed Manager Dashboard', kpi: 'Total Beds' },
  { name: 'CorporateBilling', Comp: CorporateBillingDashboard, title: 'Corporate Billing Dashboard', kpi: 'Credit Outstanding' },
  { name: 'FacilityManager', Comp: FacilityManagerDashboard, title: 'Facility Manager Dashboard', kpi: 'Open Tickets' },
  { name: 'Hod', Comp: HodDashboard, title: 'Department Head (HOD) Dashboard', kpi: 'Active Faculty' },
  { name: 'MedicalSuperintendent', Comp: MedicalSuperintendentDashboard, title: 'Medical Superintendent Dashboard', kpi: 'Bed Occupancy' },
  { name: 'OpdCoordinator', Comp: OpdCoordinatorDashboard, title: 'OPD Coordinator Dashboard', kpi: 'In Queue Now' },
  { name: 'PatientRelations', Comp: PatientRelationsDashboard, title: 'Patient Relations Dashboard', kpi: 'NPS Score' },
  { name: 'Resident', Comp: ResidentDashboard, title: 'Resident / Duty Doctor Dashboard', kpi: 'Duty This Week' },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each(LIVE_DASHBOARDS)('$nameDashboard (wave-2 live KPIs)', ({ Comp, title, kpi }) => {
  it('renders the role shell with title, 4 KPIs, tasks and alerts', async () => {
    render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    // Flush the live-KPI fetch settle (api.get rejects -> static fallback path).
    await act(async () => {});

    expect(screen.getByTestId('role-sidebar')).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getAllByTestId('role-kpi')).toHaveLength(4);
    expect(screen.getByText(kpi)).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
  });

  it('keeps rendering static KPI values when the live endpoint fails', async () => {
    render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    await act(async () => {});

    // The fetcher path rejects (offline) -> useLiveKpis keeps the static config,
    // so every KPI card still carries a non-empty value.
    document.querySelectorAll('[data-testid="role-kpi"]').forEach((card) => {
      const value = card.querySelectorAll('p')[1]?.textContent ?? '';
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('RoleDashboardShell interactions (shared by all 10)', () => {
  it('renders sidebar navigation derived from permissions and switches tabs', async () => {
    render(
      <MemoryRouter>
        <HodDashboard />
      </MemoryRouter>,
    );
    await act(async () => {});

    const sidebar = screen.getByTestId('role-sidebar');
    expect(sidebar).toBeInTheDocument();

    // Today is the default tab; clicking a module nav entry switches the view.
    const todayButton = screen.getByRole('button', { name: /today/i });
    expect(todayButton).toBeInTheDocument();
    fireEvent.click(todayButton);
    expect(screen.getByTestId('role-today')).toBeInTheDocument();

    // Domain modules render with deep links (no dead CTAs).
    const domainLinks = document.querySelectorAll('[data-testid="role-domain-modules"] a');
    expect(domainLinks.length).toBeGreaterThan(0);
    domainLinks.forEach((a) => {
      expect(a.getAttribute('href')).toBeTruthy();
    });
  });

  it('toggles a task checkbox without crashing', async () => {
    render(
      <MemoryRouter>
        <HodDashboard />
      </MemoryRouter>,
    );
    await act(async () => {});

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeInTheDocument();
  });
});
