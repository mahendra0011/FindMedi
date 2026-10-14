import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleDashboardShell from './RoleDashboardShell';

const mockClinicalConfig = {
  roleKey: 'dentist',
  title: '🦷 Dentist Clinic Console',
  subtitle: 'Patient chairs, appointments & dental records',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: "Today's patients", value: '14' },
    { label: 'Chair occupancy', value: '85%' },
    { label: 'Weekly Revenue', value: '₹52,000' },
    { label: 'Satisfaction', value: '4.9 ★' },
  ],
  tasks: [
    { id: 't1', text: 'Review dental impression for RCT', done: false },
    { id: 't2', text: 'Sterilize instruments', done: true },
  ],
  alerts: [
    { id: 'a1', text: 'Autoclave cycle #2 completed', level: 'info' },
    { id: 'a2', text: 'AERB X-Ray license renewal due in 20 days', level: 'warn' },
  ],
  domainModules: [
    {
      key: 'dental-chart',
      emoji: '🦷',
      label: 'FDI Odontogram Chart',
      description: 'Interactive tooth notation chart for charting restorations and extractions.',
      ctaLabel: 'Open Charting Tool',
      ctaHref: '/dashboard/dentist?tab=bookings',
    },
  ],
};

const mockT3WellnessConfig = {
  roleKey: 'gym',
  title: '🏋️ Gym & Fitness Center',
  subtitle: 'Member check-ins, PT slots and membership plans',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Members', value: '380' },
    { label: 'Floor Occupancy', value: '62%' },
    { label: 'Monthly Subscriptions', value: '₹2,40,000' },
    { label: 'Rating', value: '4.7 ★' },
  ],
  tasks: [
    { id: 'g1', text: 'Inspect cable crossover machine', done: false },
  ],
  alerts: [
    { id: 'g-a1', text: '18 memberships expire this week', level: 'warn' },
  ],
  domainModules: [
    {
      key: 'trainer-roster',
      emoji: '🧑‍🏋️',
      label: 'Trainer PT Roster',
      description: 'Personal training slot assignments and client workout check-ins.',
      ctaLabel: 'View Roster',
      ctaHref: '/dashboard/gym?tab=staff',
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RoleDashboardShell Advanced Interactive Features', () => {
  it('renders clinical badge for T1 roles and switches tabs to Profile & Calendar', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/dentist']}>
        <RoleDashboardShell config={mockClinicalConfig} />
      </MemoryRouter>
    );
    await act(async () => {});

    // Top bar checks
    expect(screen.getByText('Tier 1 Clinical')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Dentist Clinic Console/i })).toBeInTheDocument();

    // Check default today tab elements
    expect(screen.getByTestId('role-today')).toBeInTheDocument();
    expect(screen.getByTestId('role-tasks')).toBeInTheDocument();

    // Switch to Profile Tab
    const profileBtn = screen.getByRole('button', { name: /profile & verification/i });
    fireEvent.click(profileBtn);

    expect(screen.getByText(/Profile & Verification Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile Strength/i)).toBeInTheDocument();
    expect(screen.getByText(/Fully Verified Provider/i)).toBeInTheDocument();

    // Switch to Calendar Tab
    const calendarBtn = screen.getByRole('button', { name: /calendar/i });
    fireEvent.click(calendarBtn);

    expect(screen.getByText(/Availability & Schedule Matrix/i)).toBeInTheDocument();
    expect(screen.getByText('Slot Duration', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/Weekly Template/i)).toBeInTheDocument();

    // Back to Today
    const backBtn = screen.getByRole('button', { name: /back to today overview/i });
    fireEvent.click(backBtn);
    expect(screen.getByTestId('role-today')).toBeInTheDocument();
  });

  it('renders PHI Shield indicator for T3 wellness roles and displays non-clinical privacy banner in Bookings', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/gym?tab=bookings']}>
        <RoleDashboardShell config={mockT3WellnessConfig} />
      </MemoryRouter>
    );
    await act(async () => {});

    // PHI Shield badge in top bar
    expect(screen.getByText(/PHI Shield Active/i)).toBeInTheDocument();

    // Bookings tab is rendered directly from URL query param
    expect(screen.getByText(/Bookings & Orders Roster/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Shield Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero access to medical records/i)).toBeInTheDocument();
  });

  it('allows adding and toggling tasks interactively', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/dentist']}>
        <RoleDashboardShell config={mockClinicalConfig} />
      </MemoryRouter>
    );
    await act(async () => {});

    const taskInput = screen.getByPlaceholderText(/Add a new task/i);
    const addBtn = screen.getByRole('button', { name: /add/i });

    fireEvent.change(taskInput, { target: { value: 'Order dental implants inventory' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('Order dental implants inventory')).toBeInTheDocument();

    // Toggle existing task
    const taskItem = screen.getByText('Review dental impression for RCT');
    expect(taskItem).not.toHaveClass('line-through');

    fireEvent.click(taskItem);
    expect(taskItem).toHaveClass('line-through');
  });

  it('opens and closes the specialty domain tool preview modal', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/dentist']}>
        <RoleDashboardShell config={mockClinicalConfig} />
      </MemoryRouter>
    );
    await act(async () => {});

    // Click Preview Tool on the FDI Odontogram card
    const previewBtn = screen.getByRole('button', { name: /preview tool/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText('Specialty Clinical Tool')).toBeInTheDocument();
    expect(screen.getByText(/Tool Preview & Actions:/i)).toBeInTheDocument();

    // Close preview modal
    const closeBtn = screen.getByRole('button', { name: /close preview/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Tool Preview & Actions:/i)).not.toBeInTheDocument();
  });

  it('renders sidebar from config.sidebarSections as Section-53 source of truth', async () => {
    const mockHmsConfig = {
      ...mockClinicalConfig,
      sidebarSections: ['Dashboard', 'My Queue', 'Appointments', 'Patients', 'EMR', 'Prescription', 'Orders'],
      workQueues: ['Waiting OPD Patients', 'Assigned Inpatients'],
      quickActions: ['Start Consultation', 'Write Prescription'],
    };

    render(
      <MemoryRouter initialEntries={['/dashboard/dentist']}>
        <RoleDashboardShell config={mockHmsConfig} />
      </MemoryRouter>
    );
    await act(async () => {});

    // Check sidebar rendered from config.sidebarSections
    const sidebar = screen.getByTestId('role-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /my queue/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /emr/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /prescription/i })).toBeInTheDocument();

    // Clicking EMR switches to EMR workspace
    fireEvent.click(within(sidebar).getByRole('button', { name: /emr/i }));
    expect(screen.getByText(/EMR Workspace/i)).toBeInTheDocument();

    // Clicking Back to Today
    fireEvent.click(screen.getByRole('button', { name: /back to today overview/i }));
    expect(screen.getByTestId('role-today')).toBeInTheDocument();
  });
});
